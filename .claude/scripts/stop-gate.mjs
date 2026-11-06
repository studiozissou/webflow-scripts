// Stop hook that blocks Claude from ending a turn while a lint error it introduced or a mapped unit suite is red.
import { spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ATTEMPTS = 3;
const SUITE_TIMEOUT_MS = 240_000;
const BUDGET_MS = 280_000;
const MIN_SUITE_MS = 1_000;
const TAIL_LINES = 40;
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_NODE_MAJOR = 22;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const DEBUG = false;

export function parseInput(text) {
  try {
    const data = JSON.parse(text || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function sanitiseSessionId(id) {
  const clean = String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  return clean || 'unknown';
}

export function nodeMajor(version = process.versions.node) {
  return Number.parseInt(String(version).split('.')[0], 10) || 0;
}

export function tailLines(text, n = TAIL_LINES) {
  const lines = String(text ?? '').replace(/\s+$/, '').split('\n');
  return lines.slice(-n).join('\n');
}

export function isZeroTests(output) {
  return /^(?:# |ℹ )tests 0\s*$/m.test(String(output ?? ''));
}

export function isLintable(path) {
  return /\.(?:js|mjs)$/.test(path);
}

export function errorMessages(results) {
  const list = Array.isArray(results) ? results : [];
  return list.flatMap((r) => (r.messages ?? []).filter((m) => m.severity === 2));
}

export function normaliseSuiteEntry(entry) {
  const items = Array.isArray(entry) ? entry : [entry];
  return items
    .map((item) => (typeof item === 'string' ? { script: item, needsInternal: false } : item))
    .filter((item) => item && typeof item.script === 'string')
    .map((item) => ({ script: item.script, needsInternal: item.needsInternal === true }));
}

export function matchSuites(files, map) {
  const suites = map?.suites ?? {};
  const found = new Map();
  for (const file of files) {
    for (const [prefix, entry] of Object.entries(suites)) {
      if (!file.startsWith(prefix)) continue;
      for (const suite of normaliseSuiteEntry(entry)) {
        const prev = found.get(suite.script);
        found.set(suite.script, { script: suite.script, needsInternal: suite.needsInternal || prev?.needsInternal === true });
      }
    }
  }
  return [...found.values()];
}

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
}

function git(cwd, ...args) {
  return sh('git', args, { cwd });
}

function splitZ(text) {
  return text.split('\0').filter(Boolean);
}

function resolveBase(root, env) {
  if (env.STOP_GATE_BASE) return env.STOP_GATE_BASE;
  const mb = git(root, 'merge-base', 'HEAD', 'origin/main');
  if (mb.status === 0 && mb.stdout.trim()) return mb.stdout.trim();
  const head = git(root, 'rev-parse', '--verify', '-q', 'HEAD');
  if (head.status === 0 && head.stdout.trim()) return 'HEAD';
  return EMPTY_TREE;
}

function changedFiles(root, base) {
  const diff = git(root, 'diff', '--name-only', '-z', base);
  if (diff.status !== 0) throw new Error(`git diff failed: ${diff.stderr.trim()}`);
  const untracked = git(root, 'ls-files', '--others', '--exclude-standard', '-z');
  return [...new Set([...splitZ(diff.stdout), ...splitZ(untracked.stdout)])];
}

function findEslint(root) {
  const local = join(root, 'node_modules/.bin/eslint');
  if (existsSync(local)) return local;
  const list = git(root, 'worktree', 'list', '--porcelain');
  const first = list.stdout.split('\n')[0] ?? '';
  if (first.startsWith('worktree ')) {
    const main = join(first.slice('worktree '.length), 'node_modules/.bin/eslint');
    if (existsSync(main)) return main;
  }
  return null;
}

function runEslint(eslint, root, args, input) {
  const r = sh(process.execPath, [eslint, '--format', 'json', ...args], { cwd: root, input });
  if (r.error || (r.status !== 0 && r.status !== 1)) {
    throw new Error(`eslint exited ${r.status}: ${tailLines(r.stderr || r.stdout, 3)}`);
  }
  return JSON.parse(r.stdout || '[]');
}

function lintRegressions(eslint, root, base, files) {
  const lintable = files.filter((f) => isLintable(f) && existsSync(join(root, f)) && statSync(join(root, f)).isFile());
  if (!lintable.length) return [];
  const working = runEslint(eslint, root, ['--', ...lintable]);
  const failures = [];
  for (const file of lintable) {
    const abs = resolve(root, file);
    const result = working.find((r) => r.filePath === abs || r.filePath === realpathSync(abs));
    const errors = errorMessages(result ? [result] : []);
    if (!errors.length) continue;
    const old = git(root, 'show', `${base}:${file}`);
    const baseCount = old.status === 0 ? errorMessages(runEslint(eslint, root, ['--stdin', '--stdin-filename', file], old.stdout)).length : 0;
    if (errors.length > baseCount) failures.push({ file, baseCount, errors });
  }
  return failures;
}

function readSuitesMap(root, env) {
  const path = env.STOP_GATE_SUITES || join(root, '.claude/scripts/stop-gate-suites.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function internalLinked(root) {
  try {
    return statSync(join(root, '.claude/specs')).isDirectory();
  } catch {
    return false;
  }
}

function killGroup(pid) {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {}
}

function runSuite(root, script, env, timeoutMs) {
  const dir = mkdtempSync(join(tmpdir(), 'stop-gate-out-'));
  const outPath = join(dir, 'out.txt');
  const fd = openSync(outPath, 'w');
  let r;
  try {
    r = spawnSync('npm', ['run', '-s', script], { cwd: root, env, timeout: timeoutMs, killSignal: 'SIGKILL', detached: true, stdio: ['ignore', fd, fd] });
  } finally {
    closeSync(fd);
  }
  if (r.pid) killGroup(r.pid);
  let output = '';
  try {
    output = readFileSync(outPath, 'utf8');
  } catch {}
  rmSync(dir, { recursive: true, force: true });
  if (r.error?.code === 'ETIMEDOUT') return { outcome: 'skip', reason: `${script} timed out after ${Math.round(timeoutMs / 1000)} s` };
  if (r.error) return { outcome: 'skip', reason: `${script} could not start: ${r.error.message}` };
  if (isZeroTests(output)) return { outcome: 'skip', reason: `${script} ran zero tests` };
  if (r.status !== 0) return { outcome: 'fail', output };
  return { outcome: 'pass' };
}

export function formatBlock(lintFailures, suiteFailures) {
  const parts = [];
  for (const { file, baseCount, errors } of lintFailures) {
    const lines = errors.map((m) => `  ${file}:${m.line ?? 0} ${m.ruleId ?? 'parse-error'}: ${m.message}`);
    parts.push(`Lint: ${file} has ${errors.length} error(s), ${baseCount} at base\n${tailLines(lines.join('\n'))}`);
  }
  for (const { script, output } of suiteFailures) {
    parts.push(`Suite failed: npm run ${script} (last ${TAIL_LINES} lines)\n${tailLines(output)}`);
  }
  return `Stop gate: fix these before stopping.\n\n${parts.join('\n\n')}\n`;
}

function makeLogger(logDir) {
  return (kind, reason) => {
    try {
      mkdirSync(logDir, { recursive: true });
      appendFileSync(join(logDir, 'stop-gate.log'), `${new Date().toISOString()} ${kind} ${reason}\n`);
    } catch {}
  };
}

function pruneCounts(logDir, now = Date.now()) {
  try {
    for (const name of readdirSync(logDir)) {
      if (!/^stop-gate-.*\.count$/.test(name)) continue;
      const path = join(logDir, name);
      if (now - statSync(path).mtimeMs > PRUNE_AGE_MS) unlinkSync(path);
    }
  } catch {}
}

function removeFile(path) {
  try {
    unlinkSync(path);
  } catch {}
}

export function runGate({ input = {}, env = process.env, cwd = process.cwd() } = {}) {
  const startDir = input.cwd || env.CLAUDE_PROJECT_DIR || cwd;
  const session = sanitiseSessionId(input.session_id);
  const max = Number.parseInt(env.STOP_GATE_MAX, 10) || MAX_ATTEMPTS;
  const deadline = Date.now() + (Number.parseInt(env.STOP_GATE_BUDGET_MS, 10) || BUDGET_MS);
  let logDir = join(startDir, '.claude/logs');
  let log = makeLogger(logDir);
  let countFile = join(logDir, `stop-gate-${session}.count`);
  const pass = (reason) => {
    if (reason) log('skip', reason);
    removeFile(countFile);
    return { code: 0, stdout: '', stderr: '' };
  };

  try {
    const top = git(startDir, 'rev-parse', '--show-toplevel');
    if (top.error || top.status !== 0) return pass(`not a git repo: ${startDir}`);
    const root = top.stdout.trim();
    logDir = join(root, '.claude/logs');
    log = makeLogger(logDir);
    countFile = join(logDir, `stop-gate-${session}.count`);
    pruneCounts(logDir);

    if (nodeMajor() < MIN_NODE_MAJOR) return pass(`node ${process.versions.node} is below ${MIN_NODE_MAJOR}`);

    const base = resolveBase(root, env);
    const files = changedFiles(root, base);
    DEBUG && console.log('stop-gate', { base, files });
    if (!files.length) return pass();

    const eslint = findEslint(root);
    if (!eslint) return pass('no eslint found in node_modules or the main checkout');

    let lintFailures = [];
    try {
      lintFailures = lintRegressions(eslint, root, base, files);
    } catch (err) {
      log('skip', `lint skipped: ${err.message}`);
    }

    const suiteFailures = [];
    const map = readSuitesMap(root, env);
    const suites = matchSuites(files, map);
    const linked = internalLinked(root);
    for (const suite of suites) {
      if (suite.needsInternal && !linked) {
        log('skip', `${suite.script} needs webflow-internal, which is not linked`);
        continue;
      }
      const left = deadline - Date.now();
      if (left < MIN_SUITE_MS) {
        log('skip', `${suite.script} not run: stop-gate time budget used up`);
        continue;
      }
      const result = runSuite(root, suite.script, env, Math.min(SUITE_TIMEOUT_MS, left));
      if (result.outcome === 'skip') log('skip', result.reason);
      if (result.outcome === 'fail') suiteFailures.push({ script: suite.script, output: result.output });
    }

    if (!lintFailures.length && !suiteFailures.length) return pass();

    const summary = [...lintFailures.map((f) => `lint ${f.file}`), ...suiteFailures.map((f) => f.script)].join(', ');
    let count = 0;
    try {
      count = Number.parseInt(readFileSync(countFile, 'utf8'), 10) || 0;
    } catch {}
    count += 1;

    if (count >= max) {
      removeFile(countFile);
      const message = `Stop gate gave up after ${max} blocked attempts; still red: ${summary}. See .claude/logs/stop-gate.log.`;
      log('give-up', `session ${session}: ${summary}`);
      return { code: 0, stdout: `${JSON.stringify({ systemMessage: message })}\n`, stderr: '' };
    }

    mkdirSync(logDir, { recursive: true });
    writeFileSync(countFile, String(count));
    log('block', `session ${session} attempt ${count}/${max}: ${summary}`);
    return { code: 2, stdout: '', stderr: formatBlock(lintFailures, suiteFailures) };
  } catch (err) {
    return pass(`unexpected error: ${err?.message ?? err}`);
  }
}

function isMain() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  let text = '';
  try {
    text = readFileSync(0, 'utf8');
  } catch {}
  const result = runGate({ input: parseInput(text) });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code;
}
