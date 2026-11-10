// Guards the unattended triage runners: allowlisted permissions, the triage.off kill switch, the launchd schedules, and a job script that builds on a branch without ever pushing or deploying.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, readdirSync } from 'node:fs';
import { tmpdir, devNull } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = join(ROOT, 'scripts');
const MORNING = join(SCRIPTS, 'triage-morning.sh');
const APPROVE = join(SCRIPTS, 'triage-approve.sh');
const JOB = join(SCRIPTS, 'triage-job.sh');
const COMMON = join(SCRIPTS, 'lib', 'triage-common.sh');
const ALL = [MORNING, APPROVE, JOB];

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid'
};

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const read = (f) => readFileSync(f, 'utf8');
const codeLines = (f) => read(f).split('\n').filter((l) => !/^\s*#/.test(l));

const FAKE_CLAUDE = `#!/usr/bin/env node
const fs = require('fs');
const { execFileSync } = require('child_process');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_MARKER, JSON.stringify({ args, cwd: process.cwd(), jobDir: process.env.CLAUDE_JOB_DIR || null, notion: process.env.NOTION_TOKEN || null, buildJob: process.env.TRIAGE_BUILD_JOB || null }) + '\\n');
const prompt = args[1] || '';
const slug = process.env.FAKE_SLUG;
if (process.env.FAKE_OFF_ON && prompt.startsWith('/' + process.env.FAKE_OFF_ON)) fs.writeFileSync(process.env.FAKE_OFF_FILE, '');
if (prompt.startsWith('/plan') && slug) {
  fs.mkdirSync('.claude/specs', { recursive: true });
  fs.writeFileSync('.claude/specs/' + slug + '.md', '---\\nslug: ' + slug + '\\nclient: ' + (process.env.FAKE_CLIENT || 'acme') + '\\n---\\n# Spec\\n');
}
if (prompt.startsWith('/build') && slug && !process.env.FAKE_NOCOMMIT) {
  fs.writeFileSync('built.txt', 'built\\n');
  execFileSync('git', ['add', 'built.txt']);
  execFileSync('git', ['commit', '-q', '-m', 'build ' + slug]);
}
process.stdout.write('FAKE CLAUDE OUTPUT\\n');
`;

function fakeClaude() {
  const bin = tmp('triage-bin-');
  const path = join(bin, 'claude');
  writeFileSync(path, FAKE_CLAUDE);
  chmodSync(path, 0o755);
  const marker = join(bin, 'calls.jsonl');
  return { bin, path, marker, calls: () => (existsSync(marker) ? read(marker).trim().split('\n').map((l) => JSON.parse(l)) : []) };
}

function runnerEnv(fake, extra = {}) {
  return { ...GIT_ENV, PATH: `${fake.bin}:${process.env.PATH}`, CLAUDE_BIN: fake.path, FAKE_MARKER: fake.marker, NOTION_TOKEN: 'test-token', ...extra };
}

function triageRepo({ off = false, allowlist = true } = {}) {
  const repo = tmp('triage-repo-');
  const internal = join(repo, '.claude', 'triage');
  mkdirSync(internal, { recursive: true });
  if (off) writeFileSync(join(internal, 'triage.off'), '');
  if (allowlist) writeFileSync(join(internal, 'allowed-tools.txt'), '# triage tools\nRead\n\nBash(node tools/triage/cli.js *)\nmcp__slack__slack_send_message\n');
  return { repo, internal };
}

const ALLOWED_JOB = '# job tools\nRead\nEdit\nBash(git commit*)\nBash(npm *)\n';
const DISALLOWED_JOB = 'Bash(git push*)\nmcp__Webflow__*\nmcp__slack__*\n';

function jobRepo({ off = false, allowed = ALLOWED_JOB, disallowed = DISALLOWED_JOB, scripts = { 'test:acme': "node -e \"console.log('# tests 3');console.log('# pass 3')\"" } } = {}) {
  const base = tmp('triage-job-');
  const remote = join(base, 'remote.git');
  const repo = join(base, 'repo');
  mkdirSync(join(repo, 'scripts', 'lib'), { recursive: true });
  git(base, 'init', '-q', '--bare', '-b', 'main', remote);
  git(repo, 'init', '-q', '-b', 'main');
  copyFileSync(JOB, join(repo, 'scripts', 'triage-job.sh'));
  chmodSync(join(repo, 'scripts', 'triage-job.sh'), 0o755);
  if (existsSync(COMMON)) copyFileSync(COMMON, join(repo, 'scripts', 'lib', 'triage-common.sh'));
  writeFileSync(join(repo, 'scripts', 'link-internal.sh'), '#!/bin/bash\n[ "${FAKE_OFF_ON:-}" = setup ] && : > "$FAKE_OFF_FILE"\nexit 0\n');
  chmodSync(join(repo, 'scripts', 'link-internal.sh'), 0o755);
  writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'fixture', private: true, scripts }, null, 2));
  writeFileSync(join(repo, '.gitignore'), '.claude/\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');
  git(repo, 'remote', 'add', 'origin', remote);
  git(repo, 'push', '-q', 'origin', 'main');
  const internal = join(repo, '.claude', 'triage');
  mkdirSync(internal, { recursive: true });
  if (off) writeFileSync(join(internal, 'triage.off'), '');
  if (allowed !== null) writeFileSync(join(internal, 'job-allowed-tools.txt'), allowed);
  if (disallowed !== null) writeFileSync(join(internal, 'job-disallowed-tools.txt'), disallowed);
  const jobDir = join(internal, 'jobs', 'page123');
  mkdirSync(jobDir, { recursive: true });
  return { repo, remote, jobDir, script: join(repo, 'scripts', 'triage-job.sh') };
}

function writeMeta(jobDir, meta) {
  writeFileSync(join(jobDir, 'meta.json'), JSON.stringify({ pageId: 'page123', slug: 'faq-schema', threadTs: '1731230000.123456', task: 'Add FAQ schema to test page', brief: 'Use the FAQ block on /test', startedAt: '2026-11-10T13:00:00Z', pid: 1, ...meta }));
}

function runJob(fixture, fake, args = ['faq-schema', 'page123', '1731230000.123456', fixture.jobDir], extra = {}) {
  return spawnSync('bash', [fixture.script, ...args], { encoding: 'utf8', env: runnerEnv(fake, { WEBFLOW_INTERNAL: join(fixture.repo, 'no-internal'), FAKE_SLUG: 'faq-schema', ...extra }) });
}

const result = (jobDir) => JSON.parse(read(join(jobDir, 'result.json')));
const worktrees = (repo) => git(repo, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).length;

for (const f of ALL) {
  test(`${f.split('/').pop()} parses with bash -n`, () => {
    const r = spawnSync('bash', ['-n', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });

  test(`${f.split('/').pop()} never skips permissions`, () => {
    assert.doesNotMatch(read(f), /dangerously-skip-permissions/);
  });

  test(`${f.split('/').pop()} sources triage-common.sh and checks the triage.off kill switch`, () => {
    const lines = codeLines(f);
    assert.ok(lines.some((l) => /^\s*(source|\.)\s+"\$SCRIPT_DIR\/lib\/triage-common\.sh"/.test(l)));
    assert.ok(lines.some((l) => /\btriage_off\b/.test(l) && !/^\s*triage_off\s*\(\)/.test(l)));
  });
}

test('triage-common.sh parses with bash -n and its triage_off helper checks the triage.off file', () => {
  const r = spawnSync('bash', ['-n', COMMON], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const code = codeLines(COMMON).join('\n');
  assert.match(code, /triage_off\(\)\s*\{[^}]*\[\s+-e\s+"\$INTERNAL_TRIAGE\/triage\.off"\s+\]/);
  assert.doesNotMatch(read(COMMON), /dangerously-skip-permissions/);
});

test('triage-common.sh load_allowlist fills the array and exits 1 on a missing or empty file', () => {
  const dir = tmp('triage-common-');
  const list = join(dir, 'list.txt');
  writeFileSync(list, '# c\nRead\n\n  Bash(node tools/triage/cli.js *)  \n');
  const sh = (file) => spawnSync('bash', ['-c', `source "${COMMON}"; load_allowlist ALLOWED "${file}"; printf '%s\\n' "\${ALLOWED[@]}"`], { encoding: 'utf8' });
  const ok = sh(list);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout, 'Read\nBash(node tools/triage/cli.js *)\n');
  writeFileSync(join(dir, 'empty.txt'), '# only comments\n\n');
  for (const f of [join(dir, 'empty.txt'), join(dir, 'missing.txt')]) {
    const r = sh(f);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing or lists no tools/);
    assert.equal(r.stdout, '');
  }
});

test('triage-common.sh owns the claude lookup and the Notion token export; runners do not repeat them', () => {
  const code = codeLines(COMMON).join('\n');
  for (const fn of ['load_allowlist', 'triage_claude_bin', 'triage_notion_token']) assert.match(code, new RegExp(`^${fn}\\(\\)`, 'm'));
  for (const f of [MORNING, APPROVE]) {
    const body = codeLines(f).join('\n');
    assert.doesNotMatch(body, /security find-generic-password/);
    assert.doesNotMatch(body, /type -P claude/);
    assert.doesNotMatch(body, /read_list/);
  }
  assert.doesNotMatch(codeLines(JOB).join('\n'), /type -P claude|read_list/);
});

test('triage_notion_token exports the Keychain token only when NOTION_TOKEN is unset', () => {
  const bin = tmp('triage-sec-');
  writeFileSync(join(bin, 'security'), '#!/bin/sh\necho kc-token\n');
  chmodSync(join(bin, 'security'), 0o755);
  const sh = (env) => spawnSync('bash', ['-c', `source "${COMMON}"; triage_notion_token; printf '%s' "\${NOTION_TOKEN:-}"`], { encoding: 'utf8', env: { PATH: `${bin}:/usr/bin:/bin`, ...env } });
  assert.equal(sh({}).stdout, 'kc-token');
  assert.equal(sh({ NOTION_TOKEN: 'env-token' }).stdout, 'env-token');
});

test('the morning and approve headers state what an unattended run may send and start', () => {
  const header = (f) => read(f).split('\n').filter((l) => l.startsWith('#')).map((l) => l.replace(/^#\s?/, '')).join(' ').replace(/\s+/g, ' ');
  assert.match(header(MORNING), /An unattended run posts one digest to the digest Slack channel, posts replies in that digest thread \(acknowledgements and job results\), and creates Gmail drafts; it sends no email and replies to no one else\./);
  assert.match(header(MORNING), /It also starts at most 3 background builds for tasks the owner approved with `go`, once builds are enabled\./);
  assert.match(header(APPROVE), /An unattended run posts replies in the digest thread only \(acknowledgements and job results\); it posts no new digest, sends no email and replies to no one else\./);
  assert.match(header(APPROVE), /It starts at most 3 background builds for tasks the owner approved with `go`, once builds are enabled/);
});

test('morning and approve runners read allowed-tools.txt and pass it as --allowedTools', () => {
  for (const f of [MORNING, APPROVE]) {
    const code = codeLines(f).join('\n');
    assert.match(code, /\$INTERNAL_TRIAGE\/allowed-tools\.txt/);
    assert.match(code, /--allowedTools "\$\{ALLOWED\[@\]\}"/);
  }
});

test('job script reads both job allowlists and passes --allowedTools and --disallowedTools', () => {
  const code = codeLines(JOB).join('\n');
  assert.match(code, /\$INTERNAL_TRIAGE\/job-allowed-tools\.txt/);
  assert.match(code, /\$INTERNAL_TRIAGE\/job-disallowed-tools\.txt/);
  assert.match(code, /--allowedTools "\$\{ALLOWED\[@\]\}"/);
  assert.match(code, /--disallowedTools "\$\{DISALLOWED\[@\]\}"/);
});

test('job script never runs git push, /deploy or a Webflow publish', () => {
  const lines = codeLines(JOB);
  assert.ok(!lines.some((l) => /^\s*git\s+push/.test(l)));
  for (const l of lines.filter((x) => /git push/.test(x))) assert.match(l, /Bash\(git push/, l);
  assert.ok(!lines.some((l) => /\/deploy|publish/i.test(l)));
});

test('approve plist runs triage-approve.sh Mon-Thu at 13:00 and 17:00 with the morning env block', () => {
  const plist = (f) => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', join(SCRIPTS, f)], { encoding: 'utf8' }));
  const approve = plist('triage-approve.plist');
  const morning = plist('triage-morning.plist');
  assert.equal(approve.Label, 'io.teamzissou.triage-approve');
  assert.match(approve.ProgramArguments.at(-1), /scripts\/triage-approve\.sh$/);
  assert.deepEqual(Object.keys(approve.EnvironmentVariables).sort(), Object.keys(morning.EnvironmentVariables).sort());
  const slots = approve.StartCalendarInterval.map((s) => `${s.Weekday}-${s.Hour}:${s.Minute}`).sort();
  assert.deepEqual(slots, ['1-13:0', '1-17:0', '2-13:0', '2-17:0', '3-13:0', '3-17:0', '4-13:0', '4-17:0']);
  assert.match(approve.StandardOutPath, /triage-approve\.log$/);
  assert.equal(approve.RunAtLoad, false);
});

test('morning plist changes only in its header comment', () => {
  const strip = (s) => s.replace(/<!--[\s\S]*?-->/, '');
  const before = execFileSync('git', ['show', 'HEAD:scripts/triage-morning.plist'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(strip(read(join(SCRIPTS, 'triage-morning.plist'))), strip(before));
});

for (const [name, script] of [['morning', MORNING], ['approve', APPROVE]]) {
  test(`${name} runner exits 0 without running claude when triage.off exists`, () => {
    const fake = fakeClaude();
    const { repo, internal } = triageRepo({ off: true });
    const r = spawnSync('bash', [script], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /triage\.off/);
    assert.deepEqual(fake.calls(), []);
    assert.equal(existsSync(join(internal, 'reports')), false);
  });

  test(`${name} runner fails closed when allowed-tools.txt is missing`, () => {
    const fake = fakeClaude();
    const { repo, internal } = triageRepo({ allowlist: false });
    const r = spawnSync('bash', [script], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /allowed-tools\.txt/);
    assert.deepEqual(fake.calls(), []);
  });
}

test('morning runner passes each allowlist line as its own argv entry and writes stdout to the report', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, TRIAGE_ARGS: '--dry-run' }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [call] = fake.calls();
  assert.deepEqual(call.args, ['-p', '/triage --dry-run', '--allowedTools', 'Read', 'Bash(node tools/triage/cli.js *)', 'mcp__slack__slack_send_message']);
  assert.equal(call.notion, 'test-token');
  const reports = readdirSync(join(internal, 'reports'));
  assert.equal(reports.length, 1);
  assert.match(reports[0], /^\d{4}-\d{2}-\d{2}\.md$/);
  assert.equal(read(join(internal, 'reports', reports[0])), 'FAKE CLAUDE OUTPUT\n');
});

test('approve runner runs /triage approve and writes a timestamped approve report', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  const r = spawnSync('bash', [APPROVE], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, TRIAGE_ARGS: '--dry-run' }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [call] = fake.calls();
  assert.deepEqual(call.args.slice(0, 3), ['-p', '/triage approve --dry-run', '--allowedTools']);
  const reports = readdirSync(join(internal, 'reports'));
  assert.equal(reports.length, 1);
  assert.match(reports[0], /^\d{4}-\d{2}-\d{2}-approve-\d{4}\.md$/);
});

test('job script refuses when triage.off exists: no worktree, failed result, claude not run', () => {
  const fake = fakeClaude();
  const fx = jobRepo({ off: true });
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fake.calls(), []);
  assert.equal(existsSync(join(fx.repo, '.claude', 'worktrees')), false);
  assert.equal(worktrees(fx.repo), 1);
  const res = result(fx.jobDir);
  assert.equal(res.status, 'failed');
  assert.match(res.summary, /triage\.off/);
});

test('job script fails closed when job-disallowed-tools.txt is missing', () => {
  const fake = fakeClaude();
  const fx = jobRepo({ disallowed: null });
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fake.calls(), []);
  assert.equal(worktrees(fx.repo), 1);
  assert.match(result(fx.jobDir).summary, /job-disallowed-tools\.txt/);
  assert.match(read(join(fx.jobDir, 'job.log')), /job-disallowed-tools\.txt/);
});

test('job script fails closed when the disallowed list does not block git push', () => {
  const fake = fakeClaude();
  const fx = jobRepo({ disallowed: 'mcp__slack__*\n' });
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fake.calls(), []);
  assert.match(result(fx.jobDir).summary, /git push/);
});

test('job script rejects an unsafe slug before touching git', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir, { slug: 'x;rm -rf ~' });
  const r = runJob(fx, fake, ['x;rm -rf ~', 'page123', '1731230000.123456', fx.jobDir]);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fake.calls(), []);
  assert.equal(worktrees(fx.repo), 1);
  assert.equal(result(fx.jobDir).status, 'failed');
});

test('job script rejects meta.json that does not match its arguments', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir, { pageId: 'other-page' });
  const r = runJob(fx, fake);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fake.calls(), []);
  assert.match(result(fx.jobDir).summary, /meta\.json/);
});

test('job script plans, builds and tests on job/<slug> without pushing', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  const log = read(join(fx.jobDir, 'job.log'));
  assert.equal(r.status, 0, log);
  const calls = fake.calls();
  assert.equal(calls.length, 2);
  const [plan, build] = calls;
  assert.equal(plan.args[0], '-p');
  assert.match(plan.args[1], /^\/plan --auto Add FAQ schema to test page — Use the FAQ block on \/test/);
  assert.match(plan.args[1], /faq-schema/);
  assert.deepEqual(build.args.slice(0, 2), ['-p', '/build --auto faq-schema (unattended build job: no browser MCP or local server is available, so follow the "No browser MCP" fallback and skip the verify loop)']);
  for (const c of calls) {
    assert.deepEqual(c.args.slice(2), ['--allowedTools', 'Read', 'Edit', 'Bash(git commit*)', 'Bash(npm *)', '--disallowedTools', 'Bash(git push*)', 'mcp__Webflow__*', 'mcp__slack__*']);
    assert.equal(c.jobDir, fx.jobDir);
    assert.equal(c.buildJob, '1');
    assert.match(c.cwd, /\.claude\/worktrees\/job-faq-schema$/);
  }
  assert.deepEqual(result(fx.jobDir), {
    status: 'passed',
    branch: 'job/faq-schema',
    tests: { passed: 3, total: 3 },
    summary: result(fx.jobDir).summary,
    specPath: '.claude/specs/faq-schema.md',
    browserChecks: 'not run'
  });
  assert.match(result(fx.jobDir).summary, /test:acme/);
  assert.equal(git(fx.remote, 'branch', '--list', 'job/*').trim(), '');
  assert.match(log, /FAKE CLAUDE OUTPUT/);
});

test('job script reports failed with counts when the area tests fail', () => {
  const fake = fakeClaude();
  const fx = jobRepo({ scripts: { 'test:acme': "node -e \"console.log('# tests 2');console.log('# pass 1');process.exit(1)\"" } });
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.equal(r.status, 1);
  const res = result(fx.jobDir);
  assert.equal(res.status, 'failed');
  assert.deepEqual(res.tests, { passed: 1, total: 2 });
  assert.equal(res.branch, 'job/faq-schema');
});

test('job script falls back to npm run lint when the client has no test script', () => {
  const fake = fakeClaude();
  const fx = jobRepo({ scripts: { lint: "node -e \"process.exit(0)\"" } });
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.equal(r.status, 0, read(join(fx.jobDir, 'job.log')));
  assert.match(result(fx.jobDir).summary, /npm run lint/);
});

test('job script fails when /plan writes no spec', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake, undefined, { FAKE_SLUG: '' });
  assert.notEqual(r.status, 0);
  assert.equal(fake.calls().length, 1);
  assert.match(result(fx.jobDir).summary, /spec/);
});

test('job script fails when the build leaves no commits on the branch', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake, undefined, { FAKE_NOCOMMIT: '1' });
  assert.notEqual(r.status, 0);
  assert.equal(result(fx.jobDir).status, 'failed');
  assert.match(result(fx.jobDir).summary, /commit/);
});

for (const [stage, calls] of [['setup', 0], ['plan', 1], ['build', 2]]) {
  test(`job script stops when triage.off appears during ${stage}`, () => {
    const fake = fakeClaude();
    const fx = jobRepo();
    writeMeta(fx.jobDir);
    const off = join(fx.repo, '.claude', 'triage', 'triage.off');
    const r = runJob(fx, fake, undefined, { FAKE_OFF_ON: stage, FAKE_OFF_FILE: off });
    assert.notEqual(r.status, 0);
    assert.equal(fake.calls().length, calls);
    const res = result(fx.jobDir);
    assert.equal(res.status, 'failed');
    assert.match(res.summary, /triage\.off appeared/);
    assert.equal(existsSync(join(fx.jobDir, 'test-output.txt')), false);
  });
}
