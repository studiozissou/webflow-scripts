// Guards the unattended triage runners: allowlisted permissions, the triage.off kill switch, the launchd schedules, and a job script that builds on a branch without ever pushing or deploying.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, readdirSync, realpathSync, utimesSync } from 'node:fs';
import { tmpdir, devNull } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = join(ROOT, 'scripts');
const MORNING = join(SCRIPTS, 'triage-morning.sh');
const APPROVE = join(SCRIPTS, 'triage-approve.sh');
const JOB = join(SCRIPTS, 'triage-job.sh');
const CONSOLIDATE = join(SCRIPTS, 'triage-consolidate.sh');
const COMMON = join(SCRIPTS, 'lib', 'triage-common.sh');
const CHAT = join(SCRIPTS, 'triage-chat.sh');
const ALL = [MORNING, APPROVE, JOB, CONSOLIDATE];

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
  return { ...GIT_ENV, PATH: `${fake.bin}:${process.env.PATH}`, CLAUDE_BIN: fake.path, FAKE_MARKER: fake.marker, NOTION_TOKEN: 'test-token', SLACK_BOT_TOKEN: 'test-bot-token', SLACK_APP_TOKEN: 'test-app-token', ...extra };
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
  for (const fn of ['load_allowlist', 'triage_claude_bin', 'triage_notion_token', 'triage_slack_token']) assert.match(code, new RegExp(`^${fn}\\(\\)`, 'm'));
  for (const f of [MORNING, APPROVE, CONSOLIDATE, CHAT]) {
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

const plist = (f) => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', join(SCRIPTS, f)], { encoding: 'utf8' }));
const slotsOf = (p) => p.StartCalendarInterval.map((s) => `${s.Weekday}-${s.Hour}:${s.Minute}`).sort();
const MON_FRI = [1, 2, 3, 4, 5];

test('approve plist runs triage-approve.sh Mon-Fri at 13:00 and 17:00 with the morning env block (D16)', () => {
  const approve = plist('triage-approve.plist');
  const morning = plist('triage-morning.plist');
  assert.equal(approve.Label, 'io.teamzissou.triage-approve');
  assert.match(approve.ProgramArguments.at(-1), /scripts\/triage-approve\.sh$/);
  assert.deepEqual(Object.keys(approve.EnvironmentVariables).sort(), Object.keys(morning.EnvironmentVariables).sort());
  assert.deepEqual(slotsOf(approve), MON_FRI.flatMap((d) => [`${d}-13:0`, `${d}-17:0`]).sort());
  assert.match(approve.StandardOutPath, /triage-approve\.log$/);
  assert.equal(approve.RunAtLoad, false);
  assert.match(read(join(SCRIPTS, 'triage-approve.plist')), /Monday to Friday/);
});

test('morning plist runs triage-morning.sh Mon-Fri at 08:00 (D16) and its header says so', () => {
  const morning = plist('triage-morning.plist');
  assert.equal(morning.Label, 'io.teamzissou.triage-morning');
  assert.match(morning.ProgramArguments.at(-1), /scripts\/triage-morning\.sh$/);
  assert.deepEqual(slotsOf(morning), MON_FRI.map((d) => `${d}-8:0`));
  assert.equal(morning.RunAtLoad, false);
  assert.match(read(join(SCRIPTS, 'triage-morning.plist')), /at 08:00 local time, Monday to\s+Friday/);
  for (const f of ['triage-morning.plist', 'triage-approve.plist', 'triage-morning.sh']) {
    assert.doesNotMatch(read(join(SCRIPTS, f)), /08:30|Thursday/, f);
  }
});

const FAKE_SNAPSHOT_CLI = (code) => `require('fs').appendFileSync(process.env.FAKE_MARKER, JSON.stringify({ snapshot: process.argv.slice(2), cwd: process.cwd() }) + '\\n');\nprocess.exit(${code});\n`;

function withSnapshotCli(repo, code) {
  mkdirSync(join(repo, 'tools', 'triage'), { recursive: true });
  writeFileSync(join(repo, 'tools', 'triage', 'cli.js'), FAKE_SNAPSHOT_CLI(code));
}

test('morning runner runs snapshot collect in the repo before claude', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  withSnapshotCli(repo, 0);
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [first, second] = fake.calls();
  assert.deepEqual(first.snapshot, ['snapshot', 'collect']);
  assert.equal(realpathSync(first.cwd), realpathSync(repo));
  assert.equal(second.args[0], '-p');
});

const FAKE_NOTION_CLI = `const args = process.argv.slice(2);
require('fs').appendFileSync(process.env.FAKE_MARKER, JSON.stringify({ notion: args, token: process.env.NOTION_TOKEN || null }) + '\\n');
if (process.env.FAKE_NOTION_FAIL === args[0]) { process.stdout.write('[{"partial":'); process.exit(2); }
process.stdout.write(JSON.stringify(args[0] === 'goals' ? [{ id: 'g1', name: 'Fake goal' }] : [{ id: 't1', name: 'Fake task' }]));
`;

function withNotionCli(repo) {
  mkdirSync(join(repo, 'tools', 'notion'), { recursive: true });
  writeFileSync(join(repo, 'tools', 'notion', 'cli.js'), FAKE_NOTION_CLI);
}

test('morning runner writes Notion tasks and goals into the world dir and passes them to snapshot collect', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  withSnapshotCli(repo, 0);
  withNotionCli(repo);
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const calls = fake.calls();
  assert.deepEqual(calls.slice(0, 2).map((c) => c.notion), [['tasks', '--open'], ['goals']]);
  assert.ok(calls.slice(0, 2).every((c) => c.token === 'test-token'), 'token exported before the Notion reads');
  const world = join(internal, 'world');
  const files = readdirSync(world).sort();
  assert.equal(files.length, 2);
  const [goals, tasks] = files;
  assert.match(goals, /^goals-\d{4}-\d{2}-\d{2}\.json$/);
  assert.match(tasks, /^tasks-\d{4}-\d{2}-\d{2}\.json$/);
  assert.deepEqual(JSON.parse(read(join(world, goals))), [{ id: 'g1', name: 'Fake goal' }]);
  assert.deepEqual(calls[2].snapshot, ['snapshot', 'collect', '--tasks', join(world, tasks), '--goals', join(world, goals)]);
  assert.equal(calls[3].args[0], '-p');
});

test('a failed Notion read is a warning: no partial file, that flag is left out, and claude still runs', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  withSnapshotCli(repo, 0);
  withNotionCli(repo);
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, FAKE_NOTION_FAIL: 'goals' }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stderr, /WARNING: notion goals failed/);
  const world = join(internal, 'world');
  assert.deepEqual(readdirSync(world).filter((f) => !f.startsWith('tasks-')), []);
  const collect = fake.calls().find((c) => c.snapshot);
  assert.deepEqual(collect.snapshot.slice(0, 3), ['snapshot', 'collect', '--tasks']);
  assert.equal(collect.snapshot.includes('--goals'), false);
  assert.equal(fake.calls().filter((c) => c.args).length, 1);
});

test('morning runner treats a failed snapshot collect as a warning and still runs claude', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo();
  withSnapshotCli(repo, 1);
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stderr, /WARNING: snapshot collect failed/);
  assert.equal(fake.calls().filter((c) => c.args).length, 1);
});

test('morning runner skips snapshot collect under triage.off', () => {
  const fake = fakeClaude();
  const { repo, internal } = triageRepo({ off: true });
  withSnapshotCli(repo, 0);
  const r = spawnSync('bash', [MORNING], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fake.calls(), []);
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
  // --add-dir names the real (symlink-resolved) triage folder, so state.json, tmp/ and
  // reports/ are writable; the Edit rules in the allowlist still scope what can change.
  assert.deepEqual(call.args, ['-p', '/triage --dry-run', '--add-dir', realpathSync(internal), '--allowedTools', 'Read', 'Bash(node tools/triage/cli.js *)', 'mcp__slack__slack_send_message']);
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
  assert.deepEqual(call.args.slice(0, 5), ['-p', '/triage approve --dry-run', '--add-dir', realpathSync(internal), '--allowedTools']);
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

// ---------- P2 learnings: job pointer and the 18:00 consolidate runner ----------

const inboxOf = (dir) => {
  const f = join(dir, 'learnings', 'inbox.jsonl');
  return existsSync(f) ? read(f).trim().split('\n').map((l) => JSON.parse(l)) : [];
};

test('job script appends one learnings pointer with the task page, slug, worktree and status', () => {
  const fake = fakeClaude();
  const fx = jobRepo();
  writeMeta(fx.jobDir);
  const r = runJob(fx, fake);
  assert.equal(r.status, 0, read(join(fx.jobDir, 'job.log')));
  const rows = inboxOf(join(fx.repo, '.claude', 'triage'));
  assert.equal(rows.length, 1);
  const { endedAt, ...rest } = rows[0];
  assert.match(endedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(realpathSync(rest.cwd), realpathSync(join(fx.repo, '.claude', 'worktrees', 'job-faq-schema')));
  assert.deepEqual({ ...rest, cwd: undefined }, { kind: 'job', taskPageId: 'page123', slug: 'faq-schema', cwd: undefined, jobDir: fx.jobDir, status: 'passed' });
});

test('job script writes no learnings pointer under triage.off and a failed job still records one', () => {
  const fake = fakeClaude();
  const off = jobRepo({ off: true });
  writeMeta(off.jobDir);
  runJob(off, fake);
  assert.deepEqual(inboxOf(join(off.repo, '.claude', 'triage')), []);
  const failed = jobRepo();
  writeMeta(failed.jobDir);
  runJob(failed, fake, undefined, { FAKE_NOCOMMIT: '1' });
  const rows = inboxOf(join(failed.repo, '.claude', 'triage'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'failed');
  assert.equal(result(failed.jobDir).status, 'failed');
});

function consolidateRepo({ off = false, allowlist = true, extract = { sessions: 1, candidates: 2, tasks: 1, path: '/x' }, code = 0 } = {}) {
  const { repo, internal } = triageRepo({ off, allowlist: false });
  if (allowlist) writeFileSync(join(internal, 'consolidate-allowed-tools.txt'), '# consolidate tools\nRead\nBash(node tools/triage/cli.js learnings *)\n');
  mkdirSync(join(repo, 'tools', 'triage'), { recursive: true });
  writeFileSync(join(repo, 'tools', 'triage', 'cli.js'), `require('fs').appendFileSync(process.env.FAKE_MARKER, JSON.stringify({ cli: process.argv.slice(2), cwd: process.cwd() }) + '\\n');\nprocess.stdout.write(${JSON.stringify(JSON.stringify(extract, null, 2))} + '\\n');\nprocess.exit(${code});\n`);
  return { repo, internal };
}

const consolidate = (fx, fake, extra = {}) => spawnSync('bash', [CONSOLIDATE], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: fx.repo, INTERNAL_TRIAGE: fx.internal, ...extra }) });

test('consolidate runner exits 0 without work when triage.off exists', () => {
  const fake = fakeClaude();
  const fx = consolidateRepo({ off: true });
  const r = consolidate(fx, fake);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /triage\.off/);
  assert.deepEqual(fake.calls(), []);
});

test('consolidate runner fails closed without consolidate-allowed-tools.txt', () => {
  const fake = fakeClaude();
  const fx = consolidateRepo({ allowlist: false });
  const r = consolidate(fx, fake);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /consolidate-allowed-tools\.txt/);
  assert.deepEqual(fake.calls(), []);
});

test('consolidate runner runs learnings extract, then /triage consolidate with --add-dir and its allowlist', () => {
  const fake = fakeClaude();
  const fx = consolidateRepo();
  const r = consolidate(fx, fake, { TRIAGE_ARGS: '--dry-run' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [extract, call] = fake.calls();
  assert.deepEqual(extract.cli, ['learnings', 'extract']);
  assert.equal(realpathSync(extract.cwd), realpathSync(fx.repo));
  assert.deepEqual(call.args, ['-p', '/triage consolidate --dry-run', '--add-dir', realpathSync(fx.internal), '--allowedTools', 'Read', 'Bash(node tools/triage/cli.js learnings *)']);
  assert.equal(call.notion, 'test-token');
  const reports = readdirSync(join(fx.internal, 'reports'));
  assert.deepEqual(reports.map((f) => /^\d{4}-\d{2}-\d{2}-consolidate\.md$/.test(f)), [true]);
});

test('consolidate runner skips claude when extract reports noModel', () => {
  const fake = fakeClaude();
  const fx = consolidateRepo({ extract: { sessions: 0, candidates: 0, tasks: 0, path: '/x', noModel: true } });
  const r = consolidate(fx, fake);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no learnings today; digest written/);
  assert.deepEqual(fake.calls().filter((c) => c.args), []);
});

test('consolidate runner exits non-zero without claude when learnings extract fails', () => {
  const fake = fakeClaude();
  const fx = consolidateRepo({ code: 2 });
  const r = consolidate(fx, fake);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /learnings extract failed/);
  assert.deepEqual(fake.calls().filter((c) => c.args), []);
});

test('consolidate plist runs triage-consolidate.sh Mon-Fri at 18:00 with the morning env block', () => {
  const lintOut = spawnSync('plutil', ['-lint', join(SCRIPTS, 'triage-consolidate.plist')], { encoding: 'utf8' });
  assert.equal(lintOut.status, 0, lintOut.stdout);
  const p = plist('triage-consolidate.plist');
  assert.equal(p.Label, 'io.teamzissou.triage-consolidate');
  assert.match(p.ProgramArguments.at(-1), /scripts\/triage-consolidate\.sh$/);
  assert.deepEqual(Object.keys(p.EnvironmentVariables).sort(), Object.keys(plist('triage-morning.plist').EnvironmentVariables).sort());
  assert.deepEqual(slotsOf(p), MON_FRI.map((d) => `${d}-18:0`));
  assert.match(p.StandardOutPath, /triage-consolidate\.log$/);
  assert.equal(p.RunAtLoad, false);
  assert.match(read(join(SCRIPTS, 'triage-consolidate.plist')), /at 18:00 local time, Monday to\s+Friday/);
});

// ---------- Triage chat: the launcher, its plist, the Slack token export and the approve lock ----------

test('triage-chat.sh parses with bash -n, never skips permissions and sources triage-common.sh', () => {
  const r = spawnSync('bash', ['-n', CHAT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(read(CHAT), /dangerously-skip-permissions/);
  assert.ok(codeLines(CHAT).some((l) => /^\s*(source|\.)\s+"\$SCRIPT_DIR\/lib\/triage-common\.sh"/.test(l)));
});

function fakeSecurity(script) {
  const bin = tmp('triage-sec-');
  writeFileSync(join(bin, 'security'), `#!/bin/sh\n${script}\n`);
  chmodSync(join(bin, 'security'), 0o755);
  return bin;
}

const KC_BOTH = 'case "$*" in *slack-bot*) echo kc-bot-token;; *slack-app*) echo kc-app-token;; *) exit 44;; esac';
const KC_BOT_ONLY = 'case "$*" in *slack-bot*) echo kc-bot-token;; *) exit 44;; esac';

test('triage_slack_token exports the bot token, and the app token when asked, keeping values already set', () => {
  const sh = (bin, args, env = {}) => spawnSync('bash', ['-c', `source "${COMMON}"; triage_slack_token ${args}; echo "rc=$?"; printf '%s|%s' "\${SLACK_BOT_TOKEN:-}" "\${SLACK_APP_TOKEN:-}"`], { encoding: 'utf8', env: { PATH: `${bin}:/usr/bin:/bin`, ...env } });
  const both = fakeSecurity(KC_BOTH);
  assert.equal(sh(both, '').stdout, 'rc=0\nkc-bot-token|');
  assert.equal(sh(both, 'app').stdout, 'rc=0\nkc-bot-token|kc-app-token');
  assert.equal(sh(both, 'app', { SLACK_BOT_TOKEN: 'env-bot', SLACK_APP_TOKEN: 'env-app' }).stdout, 'rc=0\nenv-bot|env-app');
  const r = sh(fakeSecurity(KC_BOT_ONLY), 'app');
  assert.equal(r.stdout, 'rc=1\nkc-bot-token|');
  assert.match(r.stderr, /WARNING: Keychain item mcp\/slack-app not found/);
  assert.doesNotMatch(r.stderr, /kc-bot-token/);
});

for (const [name, script] of [['morning', MORNING], ['approve', APPROVE]]) {
  test(`${name} runner exports the Slack bot token, and a missing one is only a warning`, () => {
    const fake = fakeClaude();
    const { repo, internal } = triageRepo();
    const env = runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, HOME: tmp('triage-home-'), PATH: `${fakeSecurity('exit 44')}:${fake.bin}:${dirname(process.execPath)}:/usr/bin:/bin` });
    delete env.SLACK_BOT_TOKEN;
    delete env.SLACK_APP_TOKEN;
    const r = spawnSync('bash', [script], { encoding: 'utf8', env });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stderr, /WARNING: Keychain item mcp\/slack-bot not found/);
    assert.equal(fake.calls().filter((c) => c.args).length, 1);
    assert.match(codeLines(script).join('\n'), /^\s*triage_slack_token\b/m);
  });
}

function chatRepo({ allowlist = true } = {}) {
  const { repo, internal } = triageRepo();
  if (allowlist) writeFileSync(join(internal, 'chat-allowed-tools.txt'), '# chat tools\nRead\n');
  for (const d of ['specs', 'plans']) mkdirSync(join(repo, '.claude', d), { recursive: true });
  mkdirSync(join(repo, 'tools', 'triage'), { recursive: true });
  writeFileSync(join(repo, 'tools', 'triage', 'chat-daemon.js'), `const e = process.env;\nrequire('fs').appendFileSync(e.FAKE_MARKER, JSON.stringify({ daemon: true, cwd: process.cwd(), claude: e.CLAUDE_BIN, triage: e.TRIAGE_REAL_DIR, specs: e.SPECS_REAL_DIR, plans: e.PLANS_REAL_DIR, bot: e.SLACK_BOT_TOKEN, app: e.SLACK_APP_TOKEN }) + '\\n');\n`);
  return { repo, internal };
}

function runChat(fx, fake, security) {
  const env = runnerEnv(fake, { TRIAGE_REPO: fx.repo, INTERNAL_TRIAGE: fx.internal, HOME: tmp('triage-home-'), PATH: `${fakeSecurity(security)}:${fake.bin}:${dirname(process.execPath)}:/usr/bin:/bin` });
  delete env.SLACK_BOT_TOKEN;
  delete env.SLACK_APP_TOKEN;
  return spawnSync('bash', [CHAT], { encoding: 'utf8', env });
}

for (const [label, security] of [['the app token', KC_BOT_ONLY], ['both tokens', 'exit 44']]) {
  test(`chat launcher exits 1 with a FATAL line when ${label} is missing, and starts nothing`, () => {
    const fake = fakeClaude();
    const fx = chatRepo();
    const r = runChat(fx, fake, security);
    assert.equal(r.status, 1, r.stderr + r.stdout);
    assert.match(r.stderr, /FATAL: .*mcp\/slack-bot.*mcp\/slack-app/);
    assert.deepEqual(fake.calls(), []);
    assert.doesNotMatch(r.stdout + r.stderr, /kc-bot-token/);
  });
}

test('chat launcher fails closed without chat-allowed-tools.txt', () => {
  const fake = fakeClaude();
  const fx = chatRepo({ allowlist: false });
  const r = runChat(fx, fake, KC_BOTH);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /chat-allowed-tools\.txt/);
  assert.deepEqual(fake.calls(), []);
});

test('chat launcher runs the daemon from the repo with CLAUDE_BIN, both tokens and the three real dirs', () => {
  const fake = fakeClaude();
  const fx = chatRepo();
  const r = runChat(fx, fake, KC_BOTH);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [call] = fake.calls();
  assert.equal(call.daemon, true);
  assert.equal(realpathSync(call.cwd), realpathSync(fx.repo));
  assert.equal(call.claude, fake.path);
  assert.equal(call.triage, realpathSync(fx.internal));
  assert.equal(call.specs, realpathSync(join(fx.repo, '.claude', 'specs')));
  assert.equal(call.plans, realpathSync(join(fx.repo, '.claude', 'plans')));
  assert.equal(call.bot, 'kc-bot-token');
  assert.equal(call.app, 'kc-app-token');
  assert.match(codeLines(CHAT).join('\n'), /^\s*exec node tools\/triage\/chat-daemon\.js/m);
  assert.doesNotMatch(r.stdout + r.stderr, /kc-(bot|app)-token/);
});

test('chat plist keeps the daemon alive from login with a 30 s throttle and its own log', () => {
  const lintOut = spawnSync('plutil', ['-lint', join(SCRIPTS, 'triage-chat.plist')], { encoding: 'utf8' });
  assert.equal(lintOut.status, 0, lintOut.stdout);
  const p = plist('triage-chat.plist');
  assert.equal(p.Label, 'io.teamzissou.triage-chat');
  assert.match(p.ProgramArguments.at(-1), /scripts\/triage-chat\.sh$/);
  assert.equal(p.KeepAlive, true);
  assert.equal(p.RunAtLoad, true);
  assert.equal(p.ThrottleInterval, 30);
  assert.equal(p.StartCalendarInterval, undefined);
  assert.match(p.StandardOutPath, /Library\/Logs\/triage-chat\.log$/);
  assert.equal(p.StandardErrorPath, p.StandardOutPath);
  assert.equal(p.EnvironmentVariables.TRIAGE_REPO, plist('triage-morning.plist').EnvironmentVariables.TRIAGE_REPO);
  const text = read(join(SCRIPTS, 'triage-chat.plist'));
  assert.match(text, /launchctl load ~\/Library\/LaunchAgents\/io\.teamzissou\.triage-chat\.plist/);
  assert.match(text, /launchctl unload ~\/Library\/LaunchAgents\/io\.teamzissou\.triage-chat\.plist/);
  assert.doesNotMatch(text, /dangerously-skip-permissions/);
});

const SLOW_CLAUDE = '#!/bin/sh\necho "$$" >> "$FAKE_MARKER"\nsleep ${FAKE_SLEEP:-0}\necho SLOW OUTPUT\nexit ${FAKE_EXIT:-0}\n';

function slowClaude() {
  const fake = fakeClaude();
  writeFileSync(fake.path, SLOW_CLAUDE);
  return { ...fake, runs: () => (existsSync(fake.marker) ? read(fake.marker).trim().split('\n').length : 0) };
}

const lockOf = (internal) => join(internal, 'tmp', 'approve.lock');

function approveAsync(env) {
  return new Promise((done) => {
    const child = spawn('bash', [APPROVE], { env });
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (out += c));
    child.on('close', (code) => done({ code, out }));
  });
}

test('a second approve run waits for the lock, then exits 0 with locked and never runs claude', async () => {
  const fake = slowClaude();
  const { repo, internal } = triageRepo();
  const env = runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, FAKE_SLEEP: '4', TRIAGE_APPROVE_LOCK_WAIT: '1' });
  const first = approveAsync(env);
  for (let i = 0; i < 100 && !existsSync(lockOf(internal)); i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(existsSync(lockOf(internal)), true, 'first run holds the lock');
  const started = Date.now();
  const second = spawnSync('bash', [APPROVE], { encoding: 'utf8', env });
  assert.ok(Date.now() - started >= 1000, 'it waited');
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.match(second.stderr + second.stdout, /locked/);
  assert.equal(existsSync(lockOf(internal)), true, 'the loser leaves the holder lock alone');
  const r = await first;
  assert.equal(r.code, 0, r.out);
  assert.equal(fake.runs(), 1);
  assert.equal(existsSync(lockOf(internal)), false, 'released on exit');
});

test('approve removes a stale lock and runs, and releases the lock when claude fails', () => {
  const fake = slowClaude();
  const { repo, internal } = triageRepo();
  mkdirSync(lockOf(internal), { recursive: true });
  const old = new Date(Date.now() - 20 * 60000);
  utimesSync(lockOf(internal), old, old);
  const r = spawnSync('bash', [APPROVE], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal, FAKE_EXIT: '3', TRIAGE_APPROVE_LOCK_WAIT: '1' }) });
  assert.equal(r.status, 3, r.stderr + r.stdout);
  assert.match(r.stderr + r.stdout, /stale/);
  assert.equal(fake.runs(), 1);
  assert.equal(existsSync(lockOf(internal)), false);
});

test('approve takes no lock under triage.off', () => {
  const fake = slowClaude();
  const { repo, internal } = triageRepo({ off: true });
  const r = spawnSync('bash', [APPROVE], { encoding: 'utf8', env: runnerEnv(fake, { TRIAGE_REPO: repo, INTERNAL_TRIAGE: internal }) });
  assert.equal(r.status, 0);
  assert.equal(existsSync(join(internal, 'tmp')), false);
});

test('approve takes the lock after the triage.off check and before claude, and releases it on exit', () => {
  const code = codeLines(APPROVE).join('\n');
  assert.ok(code.indexOf('triage_off') < code.indexOf('approve.lock'));
  assert.match(code, /mkdir "\$LOCK"/);
  assert.match(code, /trap [^\n]*EXIT/);
  assert.ok(code.indexOf('approve.lock') < code.indexOf('"$CLAUDE_BIN"'));
});
