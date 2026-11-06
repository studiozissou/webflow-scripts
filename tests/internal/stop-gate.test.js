// Tests for .claude/scripts/stop-gate.mjs, the Stop hook that blocks on new lint errors and red mapped suites.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync, symlinkSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchSuites, isZeroTests, tailLines, sanitiseSessionId } from '../../.claude/scripts/stop-gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const GATE = join(ROOT, '.claude/scripts/stop-gate.mjs');

let base, repo, suitesPath;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();
const put = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
const commitAll = (msg) => { git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', msg); };
const markPushed = () => git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
const logText = () => (existsSync(join(repo, '.claude/logs/stop-gate.log')) ? readFileSync(join(repo, '.claude/logs/stop-gate.log'), 'utf8') : '');
const countPath = (id) => join(repo, '.claude/logs', `stop-gate-${id}.count`);
const setSuites = (suites) => writeFileSync(suitesPath, JSON.stringify({ suites, excluded: {} }));

const cleanEnv = (extra = {}) => {
  const env = { ...process.env, STOP_GATE_SUITES: suitesPath, GIT_CEILING_DIRECTORIES: base, ...extra };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_') && key !== 'GIT_CEILING_DIRECTORIES') delete env[key];
  delete env.NODE_TEST_CONTEXT;
  delete env.CLAUDE_PROJECT_DIR;
  delete env.STOP_GATE_BASE;
  delete env.STOP_GATE_MAX;
  delete env.STOP_GATE_BUDGET_MS;
  return { ...env, ...extra };
};

const gate = ({ cwd = repo, session = 's1', env = {} } = {}) => spawnSync(process.execPath, [GATE], {
  input: JSON.stringify({ session_id: session, cwd, stop_hook_active: false }),
  cwd,
  env: cleanEnv(env),
  encoding: 'utf8',
});

const PKG = {
  name: 'gate-fixture',
  private: true,
  type: 'module',
  scripts: {
    'test:ok': "node --test 'suite-ok/*.test.js'",
    'test:fail': 'node fail.cjs',
    'test:zero': "node --test 'suite-none/*.test.js'",
    'test:slow': 'node slow.cjs',
  },
};

beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'stop-gate-')));
  repo = join(base, 'repo');
  suitesPath = join(base, 'suites.json');
  setSuites({});
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@t');
  git(repo, 'config', 'user.name', 't');
  put(join(repo, 'package.json'), JSON.stringify(PKG, null, 2));
  put(join(repo, '.gitignore'), 'node_modules\n.claude/logs/\n');
  put(join(repo, 'eslint.config.js'), "export default [{ files: ['**/*.js'], rules: { 'no-undef': 'error' }, languageOptions: { globals: {} } }];\n");
  put(join(repo, 'suite-ok/ok.test.js'), "import { test } from 'node:test';\ntest('ok', () => {});\n");
  put(join(repo, 'fail.cjs'), "for (let i = 1; i <= 100; i++) process.stdout.write(`line ${i}\\n`);\nprocess.exit(1);\n");
  put(join(repo, 'slow.cjs'), "require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'inherit' });\nsetTimeout(() => {}, 60000);\n");
  put(join(repo, 'src/app.js'), 'export const a = 1;\n');
  put(join(repo, 'README.md'), '# fixture\n');
  symlinkSync(join(ROOT, 'node_modules'), join(repo, 'node_modules'));
  commitAll('init');
  markPushed();
});

afterEach(() => rmSync(base, { recursive: true, force: true }));

test('passes with no changes in under a second', () => {
  const start = Date.now();
  const r = gate();
  const elapsed = Date.now() - start;
  assert.equal(r.status, 0, r.stderr);
  assert.ok(elapsed < 1000, `took ${elapsed} ms`);
  assert.equal(logText(), '');
});

test('skips suites for markdown-only changes', () => {
  setSuites({ 'src/': 'test:fail', 'docs/': 'test:fail' });
  put(join(repo, 'README.md'), '# fixture\n\nchanged\n');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
});

test('blocks on a committed but unpushed lint error', () => {
  git(repo, 'switch', '-q', '-c', 'feature');
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\n');
  commitAll('break');
  assert.equal(git(repo, 'status', '--porcelain'), '');
  const r = gate();
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /src\/app\.js/);
  assert.match(r.stderr, /no-undef/);
});

test('blocks on a committed lint error when the base comes from STOP_GATE_BASE', () => {
  git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');
  const first = git(repo, 'rev-parse', 'HEAD').trim();
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\n');
  commitAll('break');
  assert.equal(gate().status, 0, 'without origin/main the base is HEAD');
  const r = gate({ env: { STOP_GATE_BASE: first } });
  assert.equal(r.status, 2, r.stdout);
});

test('skips and logs outside a git repo', () => {
  const plain = join(base, 'plain');
  mkdirSync(plain);
  const r = gate({ cwd: plain });
  assert.equal(r.status, 0, r.stderr);
  assert.match(readFileSync(join(plain, '.claude/logs/stop-gate.log'), 'utf8'), /^\d{4}-\d\d-\d\dT\S+ skip not a git repo/m);
});

test('skips and logs when no eslint is found', () => {
  rmSync(join(repo, 'node_modules'));
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\n');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
  assert.match(logText(), /skip no eslint found/);
});

test('skips and logs a suite that runs zero tests', () => {
  setSuites({ 'src/': 'test:zero' });
  put(join(repo, 'src/app.js'), 'export const a = 2;\n');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
  assert.match(logText(), /skip test:zero ran zero tests/);
});

test('skips a suite that outlives the time budget, kills its children and skips the rest', () => {
  setSuites({ 'src/': ['test:slow', 'test:ok'] });
  put(join(repo, 'src/app.js'), 'export const a = 2;\n');
  const started = Date.now();
  const r = gate({ env: { STOP_GATE_BUDGET_MS: '1500' } });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Date.now() - started < 15000, 'a lingering child must not hold the gate open');
  assert.match(logText(), /skip test:slow timed out/);
  assert.match(logText(), /skip test:ok not run: stop-gate time budget used up/);
});

test('blocks on a new lint error, naming the file and the rule', () => {
  put(join(repo, 'src/new.js'), 'export const b = missingName;\n');
  const r = gate();
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /src\/new\.js:1 no-undef/);
  assert.match(logText(), /block session s1 attempt 1\/3/);
});

test('ignores a lint error already present at the base', () => {
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\n');
  commitAll('pre-existing');
  markPushed();
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\nexport const c = 3;\n');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
});

test('does not lint deleted files', () => {
  put(join(repo, 'src/app.js'), 'export const a = undefinedThing;\n');
  commitAll('pre-existing');
  markPushed();
  rmSync(join(repo, 'src/app.js'));
  assert.equal(gate().status, 0);
});

test('blocks on a failing mapped suite with at most 40 lines of output', () => {
  setSuites({ 'src/': ['test:ok', 'test:fail'] });
  put(join(repo, 'src/app.js'), 'export const a = 2;\n');
  const r = gate();
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /Suite failed: npm run test:fail/);
  assert.doesNotMatch(r.stderr, /test:ok/);
  assert.match(r.stderr, /line 100/);
  assert.doesNotMatch(r.stderr, /line 60\n/);
  const body = r.stderr.split('(last 40 lines)\n')[1].trimEnd().split('\n');
  assert.ok(body.length <= 40, `${body.length} lines`);
});

test('runs a suite mapped from several prefixes once', () => {
  setSuites({ 'src/': 'test:fail', 'lib/': 'test:fail' });
  put(join(repo, 'src/app.js'), 'export const a = 2;\n');
  put(join(repo, 'lib/x.js'), 'export const x = 1;\n');
  const r = gate();
  assert.equal(r.status, 2);
  assert.equal(r.stderr.match(/Suite failed/g).length, 1);
});

test('skips a needsInternal suite when webflow-internal is not linked', () => {
  setSuites({ 'src/': { script: 'test:fail', needsInternal: true } });
  put(join(repo, 'src/app.js'), 'export const a = 2;\n');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
  assert.match(logText(), /skip test:fail needs webflow-internal/);
});

test('gives up after MAX_ATTEMPTS with a systemMessage and resets the count', () => {
  put(join(repo, 'src/new.js'), 'export const b = missingName;\n');
  assert.equal(gate().status, 2);
  assert.equal(readFileSync(countPath('s1'), 'utf8'), '1');
  assert.equal(gate().status, 2);
  assert.equal(readFileSync(countPath('s1'), 'utf8'), '2');
  const r = gate();
  assert.equal(r.status, 0, r.stderr);
  const { systemMessage } = JSON.parse(r.stdout);
  assert.match(systemMessage, /gave up after 3/);
  assert.ok(!existsSync(countPath('s1')));
  assert.match(logText(), /give-up session s1/);
  assert.equal(gate({ session: 's2', env: { STOP_GATE_MAX: '1' } }).status, 0, 'STOP_GATE_MAX overrides the limit');
});

test('resets the count on pass', () => {
  put(join(repo, 'src/new.js'), 'export const b = missingName;\n');
  assert.equal(gate().status, 2);
  assert.ok(existsSync(countPath('s1')));
  put(join(repo, 'src/new.js'), 'export const b = 1;\n');
  assert.equal(gate().status, 0);
  assert.ok(!existsSync(countPath('s1')));
});

test('deletes the count file on a no-change exit', () => {
  put(countPath('s1'), '2');
  assert.equal(gate().status, 0);
  assert.ok(!existsSync(countPath('s1')));
});

test('prunes count files older than seven days', () => {
  const old = countPath('old');
  const recent = countPath('recent');
  put(old, '1');
  put(recent, '1');
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  utimesSync(old, eightDaysAgo, eightDaysAgo);
  assert.equal(gate({ session: 'other' }).status, 0);
  assert.ok(!existsSync(old));
  assert.ok(existsSync(recent));
});

test('helpers: suite matching, zero-test detection, tail and session ids', () => {
  const map = { suites: { 'a/': 'x', 'a/b/': ['x', { script: 'y', needsInternal: true }] } };
  assert.deepEqual(matchSuites(['a/b/c.js', 'z.md'], map), [
    { script: 'x', needsInternal: false },
    { script: 'y', needsInternal: true },
  ]);
  assert.ok(isZeroTests('TAP version 13\n# tests 0\n# pass 0\n'));
  assert.ok(isZeroTests('ℹ tests 0\n'));
  assert.ok(!isZeroTests('# tests 10\n'));
  assert.equal(tailLines('1\n2\n3\n', 2), '2\n3');
  assert.equal(sanitiseSessionId('../evil id'), 'evilid');
  assert.equal(sanitiseSessionId(undefined), 'unknown');
});

test('the real suites map only names existing npm scripts and keeps excluded ones out', () => {
  const map = JSON.parse(readFileSync(join(ROOT, '.claude/scripts/stop-gate-suites.json'), 'utf8'));
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  const mapped = matchSuites(Object.keys(map.suites), map).map((s) => s.script);
  for (const script of mapped) assert.ok(scripts[script], `${script} is not in package.json`);
  for (const script of Object.keys(map.excluded)) assert.ok(!mapped.includes(script), `${script} is both mapped and excluded`);
});
