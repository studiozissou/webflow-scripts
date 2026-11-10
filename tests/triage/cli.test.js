// Guards the triage CLI: the buckets snapshot on the shared fixture (one call with --threads), rank, approvals and builds-off (controls from the canonical config only, never --config), lint exit codes, jobs subcommands with test-only TRIAGE_TEST_* env overrides, the builds-off and build-job refusals, and usage errors.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'tools/triage/cli.js');
const FIXTURE = 'tests/triage/fixtures/tasks.json';

const dirs = [];
const pids = [];
after(() => {
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-cli-'));
  dirs.push(d);
  return d;
}

const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('TRIAGE_')));

function run(args, input, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, input: input ?? '', encoding: 'utf8', env: { ...CLEAN_ENV, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr, json: () => JSON.parse(r.stdout) };
}

const url = (id) => `https://www.notion.so/${id}`;

const BUCKETS_SNAPSHOT = {
  now: [
    { kind: 'thread', id: 'th-newbiz', name: 'Nieuwe website', from: 'Bakery Example <info@bakery.example>', reason: 'new-business', lastMessageAt: '2026-11-10T16:00:00Z', ageWorkingDays: 1 },
    { kind: 'task', id: 't-blocked', name: 'Approve the Contoso homepage design', reason: 'blocked-on-owner', priority: 'P1', due: null, doer: 'User', clients: ['Contoso'], url: url('t-blocked') },
    { kind: 'thread', id: 'th-question', name: 'Which menu PDF is current?', from: 'Sam <sam@globex.example>', reason: 'blocked-on-owner', lastMessageAt: '2026-11-10T09:00:00Z', ageWorkingDays: 1 },
    { kind: 'task', id: 't-overdue', name: 'Confirm calendar IDs with Robin', reason: 'overdue', priority: 'P2', due: '2026-11-09', doer: 'User', clients: [], url: url('t-overdue') },
    { kind: 'thread', id: 'th-old', name: 'Phase B quote', from: 'Dana <dana@acme.example>', reason: 'reply-age', lastMessageAt: '2026-11-06T09:00:00Z', ageWorkingDays: 3 },
  ],
  today: [
    { kind: 'task', id: 't-quick-due-today', name: 'Accept the Dana calendar invite', reason: 'due-today', priority: 'P1', due: '2026-11-11', doer: 'User', clients: [], url: url('t-quick-due-today') },
    { kind: 'task', id: 't-due-today', name: 'Fix the Globex menu PDF link', reason: 'due-today', priority: 'P2', due: '2026-11-11', doer: 'User', clients: ['Globex'], url: url('t-due-today') },
    { kind: 'task', id: 't-due-tomorrow', name: 'Send the Acme invoice', reason: 'due-tomorrow', priority: 'P1', due: '2026-11-12', doer: 'User', clients: ['Acme'], url: url('t-due-tomorrow') },
    { kind: 'task', id: 't-p0', name: 'Ship the Initech hotfix', reason: 'p0', priority: 'P0', due: null, doer: 'User + Claude', clients: ['Initech'], url: url('t-p0') },
  ],
  week: [
    { kind: 'task', id: 't-weekend', name: 'Add FAQ schema to Contoso', reason: 'due-week', priority: 'P2', due: '2026-11-13', doer: 'Claude', clients: ['Contoso'], url: url('t-weekend') },
    { kind: 'task', id: 't-p3-week', name: 'Update the Hooli footer', reason: 'due-week', priority: 'P3', due: '2026-11-16', doer: 'User', clients: [], url: url('t-p3-week') },
    { kind: 'task', id: 't-p1-nodue', name: 'Draft the Umbrella case study', reason: 'p1', priority: 'P1', due: null, doer: 'User', clients: ['Umbrella'], url: url('t-p1-nodue') },
  ],
  proposals: [
    { pageId: 't-overdue', name: 'Confirm calendar IDs with Robin', from: 'P2', to: 'P0', reason: 'overdue', due: '2026-11-09' },
    { pageId: 't-due-today', name: 'Fix the Globex menu PDF link', from: 'P2', to: 'P0', reason: 'due-soon', due: '2026-11-11' },
    { pageId: 't-due-tomorrow', name: 'Send the Acme invoice', from: 'P1', to: 'P0', reason: 'due-soon', due: '2026-11-12' },
    { pageId: 't-weekend', name: 'Add FAQ schema to Contoso', from: 'P2', to: 'P0', reason: 'due-soon', due: '2026-11-13' },
    { pageId: 't-blocked', name: 'Approve the Contoso homepage design', from: 'P1', to: 'P0', reason: 'blocked-on-owner', due: null },
    { pageId: 't-p3-week', name: 'Update the Hooli footer', from: 'P3', to: 'P1', reason: 'due-week', due: '2026-11-16' },
  ],
};

function rulesConfig(rules = {}) {
  const config = join(tmp(), 'config.json');
  writeFileSync(config, JSON.stringify({ digest: { rules: { blockedNamePattern: '\\bPat\\b', ...rules } } }));
  return config;
}

test('buckets --now --in matches the snapshot', () => {
  const r = run(['buckets', '--now', '2026-11-11T07:00:00Z', '--in', FIXTURE, '--config', rulesConfig()]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json(), BUCKETS_SNAPSHOT);
});

test('buckets reads a bare task array from stdin', () => {
  const r = run(['buckets', '--now', '2026-11-11T07:00:00Z'], JSON.stringify([
    { id: 'a', name: 'A', status: 'To Do', priority: 'P1', due: null, doer: 'User', tags: [], blockedReason: null, hours: null, clients: [], url: null },
  ]));
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json().week.map((i) => i.id), ['a']);
});

test('buckets applies config.digest.rules', () => {
  const r = run(['buckets', '--now', '2026-11-11T07:00:00Z', '--in', FIXTURE, '--config', rulesConfig({ weekDueDays: 10 })]);
  assert.ok(r.json().week.some((i) => i.id === 't-p2-10days'));
});

test('bad JSON, a bad --now, an unknown flag and an unknown command exit 2', () => {
  assert.equal(run(['buckets'], '{nope').code, 2);
  const flag = run(['buckets', '--bogus', 'x']);
  assert.equal(flag.code, 2);
  assert.match(flag.err, /--bogus[\s\S]*usage:/);
  assert.match(run(['buckets', '--now']).err, /--now[\s\S]*usage:/);
  assert.equal(run(['buckets', '--now', 'yesterday', '--in', FIXTURE]).code, 2);
  assert.equal(run(['frobnicate']).code, 2);
  assert.equal(run([]).code, 2);
});

function jobsConfig(digest = {}) {
  const config = join(tmp(), 'config.json');
  writeFileSync(config, JSON.stringify({ digest: { buildsEnabled: true, ...digest } }));
  return config;
}

function testEnv(dir, extra = {}) {
  return {
    TRIAGE_TEST_JOBS_DIR: join(dir, 'jobs'),
    TRIAGE_TEST_SCRIPT: join(dir, 'job.sh'),
    TRIAGE_TEST_KILL_SWITCH: join(dir, 'triage.off'),
    TRIAGE_TEST_CONFIG: jobsConfig(),
    ...extra,
  };
}

test('rank excludes jobs already in the jobs dir and ignores input.claimed', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'job.sh'), '#!/bin/sh\nexit 0\n');
  const env = testEnv(dir);
  const r1 = run(['rank', '--in', FIXTURE], '', env);
  assert.equal(r1.code, 0, r1.err);
  assert.deepEqual(r1.json().map((i) => [i.label, i.pageId, i.command]), [['B1', 't-weekend', '/generate-schema']]);
  const fixture = JSON.parse(readFileSync(join(ROOT, FIXTURE), 'utf8'));
  assert.deepEqual(run(['rank'], JSON.stringify({ ...fixture, claimed: ['t-weekend'] }), env).json().map((i) => i.pageId), ['t-weekend']);
  const s = run(['jobs', 'start', '--page', 't-weekend', '--slug', 'faq', '--thread', '1.000001', '--config', jobsConfig()], '', env);
  assert.equal(s.code, 0, s.err);
  assert.deepEqual(run(['rank', '--in', FIXTURE], '', env).json(), []);
});

test('flags that weaken controls are not part of the public interface', () => {
  for (const [flag, value] of [['--script', '/bin/true'], ['--kill-switch', '/nope'], ['--jobs-dir', '/tmp/x'], ['--cap', '9'], ['--user', 'U1']]) {
    const r = run(['jobs', 'list', flag, value]);
    assert.equal(r.code, 2, flag);
    assert.match(r.err, /usage:/);
    assert.doesNotMatch(r.err, new RegExp(`^.*${flag} <`, 'm'), `${flag} still in usage`);
  }
});

test('buckets --threads merges threads into the same call', () => {
  const dir = tmp();
  const fixture = JSON.parse(readFileSync(join(ROOT, FIXTURE), 'utf8'));
  const tasks = join(dir, 'tasks.json');
  const threads = join(dir, 'threads.json');
  writeFileSync(tasks, JSON.stringify(fixture.tasks));
  writeFileSync(threads, JSON.stringify(fixture.threads));
  const r = run(['buckets', '--now', '2026-11-11T07:00:00Z', '--in', tasks, '--threads', threads, '--config', rulesConfig()]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json(), BUCKETS_SNAPSHOT);
  assert.equal(run(['buckets', '--in', tasks, '--threads', join(dir, 'missing.json')]).code, 2);
  writeFileSync(threads, '{"threads": []}');
  assert.equal(run(['buckets', '--in', tasks, '--threads', threads]).code, 2);
});

test('jobs start refuses with builds-off unless config.digest.buildsEnabled is true', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'job.sh'), '#!/bin/sh\nexit 0\n');
  const env = testEnv(dir);
  const args = ['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001'];
  for (const config of [jobsConfig({ buildsEnabled: false }), join(dir, 'missing.json')]) {
    const r = run(args, '', { ...env, TRIAGE_TEST_CONFIG: config });
    assert.equal(r.code, 1, r.err);
    assert.deepEqual(r.json(), { started: false, reason: 'builds-off' });
  }
  assert.equal(existsSync(join(dir, 'jobs', 'p1')), false);
});

test('jobs start refuses inside a build job with exit 2', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'job.sh'), '#!/bin/sh\nexit 0\n');
  const r = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', '--config', jobsConfig()], '', testEnv(dir, { TRIAGE_BUILD_JOB: '1' }));
  assert.equal(r.code, 2);
  assert.match(r.err, /not available inside a build job/);
  assert.equal(existsSync(join(dir, 'jobs', 'p1')), false);
});

test('jobs start honours TRIAGE_TEST_CAP and stores --label in meta.json', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'job.sh'), '#!/bin/sh\nsleep 2\n');
  const env = testEnv(dir, { TRIAGE_TEST_CAP: '1' });
  const config = jobsConfig();
  const first = run(['jobs', 'start', '--page', 'p1', '--slug', 's1', '--thread', '1.000001', '--label', 'B2', '--config', config], '', env);
  assert.equal(first.code, 0, first.err);
  pids.push(first.json().pid);
  assert.equal(JSON.parse(readFileSync(join(dir, 'jobs', 'p1', 'meta.json'), 'utf8')).label, 'B2');
  const second = run(['jobs', 'start', '--page', 'p2', '--slug', 's2', '--thread', '1.000001', '--config', config], '', env);
  assert.deepEqual(second.json(), { started: false, reason: 'cap' });
  assert.equal(run(['jobs', 'start', '--page', 'p3', '--slug', 's3', '--thread', '1.000001', '--label', 'B1; rm', '--config', config], '', env).code, 2);
});

test('approvals resolves replies and needs a user ID', () => {
  const dir = tmp();
  const digest = join(dir, 'state.json');
  const replies = join(dir, 'replies.json');
  writeFileSync(digest, JSON.stringify({ digest: { ts: '100.000001', items: [{ n: 'B1', kind: 'build', pageId: 'p1' }], processedTs: [] } }));
  writeFileSync(replies, JSON.stringify({ messages: [{ ts: '100.000002', thread_ts: '100.000001', user: 'U1', text: 'go 1' }] }));
  const config = join(dir, 'config.json');
  writeFileSync(config, JSON.stringify({ slack: { digest: { userId: 'U1' } } }));
  const ctl = { TRIAGE_TEST_CONFIG: config };
  const r = run(['approvals', '--digest', digest, '--replies', replies], '', ctl);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json().approved, [{ n: 'B1', pageId: 'p1' }]);
  writeFileSync(config, JSON.stringify({ slack: { digest: { userId: 'U2' } } }));
  assert.deepEqual(run(['approvals', '--digest', digest, '--replies', replies], '', ctl).json().approved, []);
  assert.equal(run(['approvals', '--digest', digest, '--replies', replies], '', { TRIAGE_TEST_CONFIG: join(dir, 'none.json') }).code, 2);
  assert.equal(run(['approvals', '--digest', digest, '--replies', replies, '--user', 'U1']).code, 2);
});

test('lint exits 0 on clean text and 1 with JSON warnings', () => {
  const ok = run(['lint'], '*NOW (1)*\n1. Reply to Dana.\n');
  assert.equal(ok.code, 0);
  assert.deepEqual(ok.json(), { ok: true, warnings: [] });
  const bad = run(['lint'], 'Just reply — now.\n');
  assert.equal(bad.code, 1);
  assert.deepEqual(bad.json().warnings.map((w) => w.rule), ['banned-word', 'dash']);
});

test('jobs start refuses under the kill switch with exit 1, and list and collect print JSON', async () => {
  const dir = tmp();
  const jobs = join(dir, 'jobs');
  const off = join(dir, 'triage.off');
  const script = join(dir, 'job.sh');
  writeFileSync(script, '#!/bin/sh\nprintf \'{"status":"passed","branch":"job/%s","tests":{"passed":1,"total":1},"summary":"ok","specPath":"x"}\' "$1" > "$4/result.json"\n');
  chmodSync(script, 0o755);
  const env = { TRIAGE_TEST_JOBS_DIR: jobs, TRIAGE_TEST_SCRIPT: script, TRIAGE_TEST_KILL_SWITCH: off, TRIAGE_TEST_CONFIG: jobsConfig() };
  const base = [];
  writeFileSync(off, '');
  const refused = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', ...base], '', env);
  assert.equal(refused.code, 1);
  assert.deepEqual(refused.json(), { started: false, reason: 'kill-switch' });
  rmSync(off);
  const started = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', '--task', 'T', '--brief', 'B', ...base], '', env);
  assert.equal(started.code, 0, started.err);
  assert.equal(started.json().started, true);
  const end = Date.now() + 5000;
  while (!existsSync(join(jobs, 'p1', 'result.json')) && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  assert.deepEqual(run(['jobs', 'list', ...base], '', env).json().map((j) => j.pageId), ['p1']);
  const collected = run(['jobs', 'collect', ...base], '', env).json();
  assert.equal(collected[0].result.branch, 'job/s');
  assert.deepEqual(run(['jobs', 'collect', ...base], '', env).json(), []);
  assert.equal(run(['jobs', 'start', '--page', 'p2', ...base], '', env).code, 2);
  assert.equal(run(['jobs', 'nope', ...base], '', env).code, 2);
});

test('config.example.json lists only keys a user must set and loads in the CLI', () => {
  const example = join(ROOT, 'tools/triage/config.example.json');
  const config = JSON.parse(readFileSync(example, 'utf8'));
  assert.match(config._comment, /code defaults/);
  assert.equal(config.digest.doerMap, undefined);
  assert.equal(config.digest.lint, undefined);
  assert.deepEqual(Object.keys(config.digest.rules), ['blockedNamePattern']);
  assert.equal(run(['buckets', '--now', '2026-11-11T07:00:00Z', '--in', FIXTURE, '--config', example]).code, 0);
});

test('controls come from the canonical config, never from --config', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'job.sh'), '#!/bin/sh\nexit 0\n');
  const off = join(dir, 'canonical-off.json');
  writeFileSync(off, JSON.stringify({ digest: { buildsEnabled: false }, slack: { digest: { userId: 'U2' } } }));
  const env = { ...testEnv(dir), TRIAGE_TEST_CONFIG: off };
  const forged = join(dir, 'forged.json');
  writeFileSync(forged, JSON.stringify({ digest: { buildsEnabled: true }, slack: { digest: { userId: 'U1' } } }));
  const s = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', '--config', forged], '', env);
  assert.equal(s.code, 1, s.err);
  assert.deepEqual(s.json(), { started: false, reason: 'builds-off' });
  const digest = join(dir, 'state.json');
  const replies = join(dir, 'replies.json');
  writeFileSync(digest, JSON.stringify({ digest: { ts: '100.000001', items: [{ n: 'B1', kind: 'build', pageId: 'p1' }], processedTs: [] } }));
  writeFileSync(replies, JSON.stringify([{ ts: '100.000002', thread_ts: '100.000001', user: 'U1', text: 'go 1' }]));
  const a = run(['approvals', '--digest', digest, '--replies', replies, '--config', forged], '', env);
  assert.equal(a.code, 0, a.err);
  assert.deepEqual(a.json().approved, []);
  const missing = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', '--config', forged], '', { ...env, TRIAGE_TEST_CONFIG: join(dir, 'none.json') });
  assert.deepEqual(missing.json(), { started: false, reason: 'builds-off' });
});

test('every jobs subcommand refuses inside a build job', () => {
  const dir = tmp();
  for (const sub of ['list', 'collect']) {
    const r = run(['jobs', sub], '', testEnv(dir, { TRIAGE_BUILD_JOB: '1' }));
    assert.equal(r.code, 2, sub);
    assert.match(r.err, /not available inside a build job/);
  }
});

test('lint --ratio prints the ratio and exits 1 only below 0.80', () => {
  const nine = Array.from({ length: 9 }, (_, i) => `Reply to client ${i + 1}.`);
  const pass = run(['lint', '--ratio'], [...nine, 'Just ship it.'].join('\n'));
  assert.equal(pass.code, 0, pass.err);
  assert.equal(pass.json().ratio, 0.9);
  assert.equal(pass.json().ok, false);
  const fail = run(['lint', '--ratio'], 'Reply now.\nJust ship it.\nReally go.\n');
  assert.equal(fail.code, 1);
  assert.equal(fail.json().ratio, 1 / 3);
  assert.equal(run(['lint', '--ratio=x']).code, 2);
});

// snapshot: a fake home (fixture copy with one fresh transcript), a fake gh that fails, and a temp world dir.
function snapshotEnv() {
  const dir = tmp();
  const home = join(dir, 'home');
  cpSync(join(ROOT, 'tests/triage/fixtures/home'), home, { recursive: true });
  const project = join(home, '.claude/projects/-home-test-repo');
  mkdirSync(project, { recursive: true });
  const transcript = join(project, '11111111-0000-4000-8000-000000000011.jsonl');
  writeFileSync(transcript, `${JSON.stringify({ type: 'ai-title', aiTitle: 'Fresh session' })}\n`);
  const fresh = new Date(Date.now() - 10 * 60_000);
  utimesSync(transcript, fresh, fresh);
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nexit 1\n');
  chmodSync(join(bin, 'gh'), 0o755);
  const world = join(dir, 'world');
  const env = { TRIAGE_TEST_WORLD_DIR: world, TRIAGE_TEST_HOME: home, TRIAGE_TEST_JOBS_DIR: join(ROOT, 'tests/triage/fixtures/triage-jobs'), PATH: `${bin}:${process.env.PATH}` };
  return { dir, world, env };
}

test('snapshot collect writes world/<date>.json and prints path, sources and counts; failing sources do not stop it', () => {
  const { dir, world, env } = snapshotEnv();
  const tasks = join(dir, 'tasks.json');
  writeFileSync(tasks, JSON.stringify({ tasks: [{ id: 'page-built', name: 'Add alt text to Contoso images' }] }));
  const r = run(['snapshot', 'collect', '--tasks', tasks], '', env);
  assert.equal(r.code, 0, r.err);
  const { path, sources, counts } = r.json();
  assert.match(path, /world\/\d{4}-\d{2}-\d{2}\.json$/);
  assert.ok(path.startsWith(world));
  assert.equal(sources.jobs, 'ok');
  assert.equal(sources.transcripts, 'ok');
  assert.equal(sources.desktop, 'ok');
  assert.equal(sources.specs, 'ok');
  assert.equal(sources.prs, 'error');
  assert.equal(sources.remote, 'unavailable');
  assert.equal(typeof counts.waiting, 'number');
  const snap = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(snap.tasks.map((t) => t.id), ['page-built']);
  assert.ok(snap.sessions.some((s) => s.title === 'Fresh session'));
  assert.ok(snap.sessions.some((s) => s.needsUser && s.kind === 'job'));
});

test('snapshot collect --goals stores goals from an array or {goals}; a bad file exits 2 and writes nothing', () => {
  const { dir, world, env } = snapshotEnv();
  const goals = join(dir, 'goals.json');
  writeFileSync(goals, JSON.stringify([{ id: 'g1', name: 'Acme retainer health', status: 'Active' }]));
  const r = run(['snapshot', 'collect', '--goals', goals], '', env);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse(readFileSync(r.json().path, 'utf8')).goals.map((g) => g.id), ['g1']);
  writeFileSync(goals, JSON.stringify({ goals: [{ id: 'g2' }] }));
  const wrapped = run(['snapshot', 'collect', '--goals', goals], '', env);
  assert.deepEqual(JSON.parse(readFileSync(wrapped.json().path, 'utf8')).goals.map((g) => g.id), ['g2']);
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{"a":1}');
  const fresh = snapshotEnv();
  assert.equal(run(['snapshot', 'collect', '--goals', bad], '', fresh.env).code, 2);
  assert.equal(existsSync(fresh.world), false);
  assert.ok(existsSync(world));
});

test('snapshot add-remote merges remote sessions, --unavailable records the fallback, and bad input exits 2', () => {
  const { env } = snapshotEnv();
  assert.equal(run(['snapshot', 'add-remote', '--in', 'tests/triage/fixtures/remote.json'], '', env).code, 2, 'no snapshot yet');
  assert.equal(run(['snapshot', 'collect'], '', env).code, 0);
  const r = run(['snapshot', 'add-remote', '--in', 'tests/triage/fixtures/remote.json'], '', env);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json().sources.remote, 'ok');
  assert.equal(r.json().added, 4);
  const piped = run(['snapshot', 'add-remote'], JSON.stringify([{ id: 'cse_z', name: 'Z', status: 'Waiting on a human' }]), env);
  assert.equal(piped.code, 0, piped.err);
  const rolled = run(['snapshot', 'rollup'], '', env).json();
  assert.match(rolled.thread, /Z\. Remote session waits on you\./);
  assert.doesNotMatch(rolled.thread, /Cloud sessions: not available/);
  const off = run(['snapshot', 'add-remote', '--unavailable'], '', env);
  assert.equal(off.json().sources.remote, 'unavailable');
  assert.match(run(['snapshot', 'rollup'], '', env).json().thread, /Cloud sessions: not available in scheduled run/);
  assert.equal(run(['snapshot', 'add-remote'], '{nope', env).code, 2);
  assert.equal(run(['snapshot', 'add-remote'], '{"a":1}', env).code, 2);
});

test('snapshot rollup prints counts, headline and a thread that passes lint --ratio; --in reads a given file', () => {
  const { env } = snapshotEnv();
  assert.equal(run(['snapshot', 'rollup'], '', env).code, 2, 'no snapshot yet');
  const collected = run(['snapshot', 'collect'], '', env).json();
  const r = run(['snapshot', 'rollup', '--in', collected.path, '--now', new Date().toISOString()], '', env);
  assert.equal(r.code, 0, r.err);
  const { counts, headline, thread } = r.json();
  assert.match(headline, /^Waiting on you: \d+\nIn flight: \d+ · Built: \d+ · Plans to approve: \d+$/);
  assert.ok(counts.waiting >= 2);
  assert.match(thread, /^\*Where is everything\*/);
  const lint = run(['lint', '--ratio'], thread, env);
  assert.equal(lint.code, 0, lint.out);
  assert.ok(lint.json().ratio >= 0.8);
  assert.deepEqual(run(['snapshot', 'rollup'], '', env).json().counts, counts);
});

test('snapshot rejects an unknown subcommand and a bad --now, and has no flag that moves the write path', () => {
  const { env } = snapshotEnv();
  assert.equal(run(['snapshot'], '', env).code, 2);
  assert.equal(run(['snapshot', 'nope'], '', env).code, 2);
  assert.equal(run(['snapshot', 'collect', '--now', 'yesterday'], '', env).code, 2);
  for (const flag of ['--world-dir', '--out', '--dir']) assert.equal(run(['snapshot', 'collect', flag, '/tmp/x'], '', env).code, 2, flag);
});

test('every snapshot subcommand refuses inside a build job', () => {
  const { env } = snapshotEnv();
  for (const sub of ['collect', 'add-remote', 'rollup']) {
    const r = run(['snapshot', sub], '[]', { ...env, TRIAGE_BUILD_JOB: '1' });
    assert.equal(r.code, 2, sub);
    assert.match(r.err, /not available inside a build job/);
  }
  assert.equal(existsSync(env.TRIAGE_TEST_WORLD_DIR), false);
});
