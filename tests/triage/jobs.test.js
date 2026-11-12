// Guards the triage job registry: atomic claim, cap of 3 with stale PIDs, kill switch, detached spawn, collect and release, in temp dirs with fake job scripts.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claim, liveCount, start, collect, list, release } from '../../tools/triage/lib/jobs.js';

const dirs = [];
const pids = [];
after(() => {
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-jobs-'));
  dirs.push(d);
  return d;
}

function script(dir, name, body, mode = 0o755) {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, mode);
  return path;
}

const WRITES_RESULT = [
  'printf "%s\\n" "$1" "$2" "$3" "$4" "$CLAUDE_JOB_DIR" > "$4/args.txt"',
  'printf \'{"status":"passed","branch":"job/%s","tests":{"passed":2,"total":2},"summary":"ok","specPath":".claude/specs/%s.md"}\' "$1" "$1" > "$4/result.tmp"',
  'mv "$4/result.tmp" "$4/result.json"',
].join('\n');

const deadPid = () => spawnSync('true').pid;
const JOBS_JS = fileURLToPath(new URL('../../tools/triage/lib/jobs.js', import.meta.url));
const startTime = (pid) =>
  execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } }).trim().replace(/\s+/g, ' ');

async function waitFor(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

function fakeJob(jobsDir, pageId, meta, files = {}) {
  const dir = join(jobsDir, pageId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ pageId, ...meta }));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

function opts(root, over = {}) {
  return {
    jobsDir: join(root, 'jobs'),
    pageId: 'page-1',
    slug: 'faq-schema',
    threadTs: '1762844400.000100',
    task: 'Add FAQ schema',
    brief: 'Add FAQ JSON-LD to the Contoso homepage.',
    label: 'B1',
    script: script(root, 'job.sh', WRITES_RESULT),
    killSwitch: join(root, 'triage.off'),
    ...over,
  };
}

test('claim is atomic and writes meta.json with a null pid', () => {
  const jobs = join(tmp(), 'jobs');
  const first = claim(jobs, 'abc-123', { slug: 's', task: 't' });
  assert.equal(first.ok, true);
  assert.equal(first.jobDir, join(jobs, 'abc-123'));
  const meta = JSON.parse(readFileSync(join(jobs, 'abc-123', 'meta.json'), 'utf8'));
  assert.equal(meta.pageId, 'abc-123');
  assert.equal(meta.pid, null);
  assert.equal(meta.slug, 's');
  const second = claim(jobs, 'abc-123', { slug: 's' });
  assert.deepEqual(second, { ok: false, reason: 'claimed' });
});

test('claim rejects page IDs that could escape the jobs dir', () => {
  const jobs = join(tmp(), 'jobs');
  assert.throws(() => claim(jobs, '../evil', {}), /invalid pageId/);
  assert.throws(() => claim(jobs, 'a/b', {}), /invalid pageId/);
});

test('liveCount counts alive PIDs only, not stale, missing or finished ones', () => {
  const jobs = join(tmp(), 'jobs');
  fakeJob(jobs, 'alive', { pid: process.pid });
  fakeJob(jobs, 'stale', { pid: deadPid() });
  fakeJob(jobs, 'nopid', { pid: null });
  fakeJob(jobs, 'finished', { pid: process.pid }, { 'result.json': '{"status":"passed"}' });
  assert.equal(liveCount(jobs), 1);
  assert.equal(liveCount(join(tmp(), 'missing')), 0);
});

test('start refuses when the kill switch exists', () => {
  const root = tmp();
  const o = opts(root);
  writeFileSync(o.killSwitch, '');
  const r = start(o);
  assert.deepEqual(r, { started: false, reason: 'kill-switch' });
  assert.equal(existsSync(join(o.jobsDir, 'page-1')), false);
});

test('start refuses a fourth job when 3 are live', () => {
  const root = tmp();
  const o = opts(root);
  for (const id of ['a', 'b', 'c']) fakeJob(o.jobsDir, id, { pid: process.pid });
  assert.deepEqual(start(o), { started: false, reason: 'cap' });
  assert.equal(existsSync(join(o.jobsDir, 'page-1')), false);
});

test('a stale PID frees a slot under the cap', async () => {
  const root = tmp();
  const o = opts(root);
  fakeJob(o.jobsDir, 'a', { pid: process.pid });
  fakeJob(o.jobsDir, 'b', { pid: process.pid });
  fakeJob(o.jobsDir, 'c', { pid: deadPid() });
  const r = start(o);
  assert.equal(r.started, true);
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
});

test('start refuses a page that is already claimed', () => {
  const root = tmp();
  const o = opts(root);
  fakeJob(o.jobsDir, 'page-1', { pid: null });
  assert.deepEqual(start(o), { started: false, reason: 'claimed' });
});

test('start validates slug and thread ts', () => {
  const root = tmp();
  assert.throws(() => start(opts(root, { slug: '../x' })), /invalid slug/);
  assert.throws(() => start(opts(root, { threadTs: 'x; rm' })), /invalid threadTs/);
});

test('start releases the claim when the script is missing', () => {
  const root = tmp();
  const o = opts(root, { script: join(root, 'nope.sh') });
  assert.deepEqual(start(o), { started: false, reason: 'script-missing' });
  assert.equal(existsSync(join(o.jobsDir, 'page-1')), false);
});

test('start spawns the script with slug, pageId, threadTs, jobDir and records meta', async () => {
  const root = tmp();
  const o = opts(root);
  const r = start(o);
  assert.equal(r.started, true);
  assert.equal(r.pageId, 'page-1');
  assert.equal(typeof r.pid, 'number');
  const meta = JSON.parse(readFileSync(join(r.jobDir, 'meta.json'), 'utf8'));
  assert.deepEqual(Object.keys(meta).sort(), ['brief', 'kind', 'label', 'pageId', 'pid', 'pidStart', 'slug', 'startedAt', 'task', 'threadTs']);
  assert.equal(meta.kind, 'build');
  assert.equal(meta.pid, r.pid);
  assert.equal(meta.label, 'B1');
  assert.equal(meta.task, 'Add FAQ schema');
  assert.ok(!Number.isNaN(Date.parse(meta.startedAt)));
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
  const args = readFileSync(join(r.jobDir, 'args.txt'), 'utf8').trim().split('\n');
  assert.deepEqual(args, ['faq-schema', 'page-1', '1762844400.000100', r.jobDir, r.jobDir]);
});

test('a script without the exec bit still runs', async () => {
  const root = tmp();
  const o = opts(root, { script: script(root, 'plain.sh', WRITES_RESULT, 0o644) });
  const r = start(o);
  assert.equal(r.started, true);
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
});

test('the job runs detached in its own process group', async () => {
  const root = tmp();
  const o = opts(root, { script: script(root, 'sleep.sh', 'exec sleep 30') });
  const r = start(o);
  pids.push(r.pid);
  assert.equal(r.started, true);
  const pgid = Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(r.pid)], { encoding: 'utf8' }).trim());
  assert.equal(pgid, r.pid);
  assert.equal(liveCount(o.jobsDir), 1);
  process.kill(r.pid, 'SIGKILL');
  assert.ok(await waitFor(() => liveCount(o.jobsDir) === 0));
});

test('collect returns finished unreported jobs once and marks them reported', async () => {
  const root = tmp();
  const o = opts(root);
  const r = start(o);
  fakeJob(o.jobsDir, 'running', { pid: process.pid });
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
  const done = collect(o.jobsDir);
  assert.equal(done.length, 1);
  assert.equal(done[0].pageId, 'page-1');
  assert.equal(done[0].meta.slug, 'faq-schema');
  assert.deepEqual(done[0].result, {
    status: 'passed', branch: 'job/faq-schema', tests: { passed: 2, total: 2 }, summary: 'ok',
    specPath: '.claude/specs/faq-schema.md',
  });
  assert.ok(existsSync(join(r.jobDir, 'reported')));
  assert.deepEqual(collect(o.jobsDir), []);
});

test('collect reports an unreadable result.json as failed', () => {
  const jobs = join(tmp(), 'jobs');
  fakeJob(jobs, 'broken', { pid: null, slug: 'b' }, { 'result.json': '{not json' });
  const done = collect(jobs);
  assert.equal(done[0].result.status, 'failed');
  assert.match(done[0].result.summary, /unreadable/);
});

test('list shows every job with its state and release removes the claim', () => {
  const jobs = join(tmp(), 'jobs');
  fakeJob(jobs, 'alive', { pid: process.pid });
  fakeJob(jobs, 'done', { pid: deadPid() }, { 'result.json': '{"status":"failed"}', reported: '' });
  const all = list(jobs);
  assert.deepEqual(
    all.map((j) => [j.pageId, j.alive, j.finished, j.reported]),
    [['alive', true, false, false], ['done', false, true, true]],
  );
  assert.equal(all[1].result.status, 'failed');
  release(jobs, 'done');
  assert.deepEqual(list(jobs).map((j) => j.pageId), ['alive']);
  assert.deepEqual(list(join(jobs, 'none')), []);
});

test('claims without a pid and without a result count towards the cap', () => {
  const root = tmp();
  const o = opts(root);
  for (const id of ['a', 'b', 'c']) fakeJob(o.jobsDir, id, { pid: null });
  assert.deepEqual(start(o), { started: false, reason: 'cap' });
  assert.equal(existsSync(join(o.jobsDir, 'page-1')), false);
});

test('concurrent starts never exceed the cap', async () => {
  const root = tmp();
  const jobsDir = join(root, 'jobs');
  fakeJob(jobsDir, 'a', { pid: process.pid });
  fakeJob(jobsDir, 'b', { pid: process.pid });
  const sleeper = script(root, 'sleep.sh', 'exec sleep 30');
  const code = `
    import(process.argv[1]).then(({ start }) => {
      const r = start({ jobsDir: process.argv[2], pageId: process.argv[3], slug: 's', threadTs: '1.000001',
        script: process.argv[4], killSwitch: process.argv[5] });
      process.stdout.write(JSON.stringify(r));
    });`;
  const runs = ['p1', 'p2', 'p3', 'p4', 'p5'].map(
    (id) =>
      new Promise((done) => {
        const child = spawn(process.execPath, ['-e', code, JOBS_JS, jobsDir, id, sleeper, join(root, 'off')]);
        let out = '';
        child.stdout.on('data', (d) => (out += d));
        child.on('close', () => done(JSON.parse(out)));
      }),
  );
  const results = await Promise.all(runs);
  for (const r of results) if (r.started) pids.push(r.pid);
  assert.ok(results.filter((r) => r.started).length <= 1, JSON.stringify(results));
  assert.ok(results.filter((r) => !r.started).every((r) => r.reason === 'cap'), JSON.stringify(results));
  assert.ok(liveCount(jobsDir) <= 3);
});

test('a dead pid without result.json is finished-failed and collected with a synthesised result', () => {
  const jobs = join(tmp(), 'jobs');
  fakeJob(jobs, 'died', { pid: deadPid(), slug: 'd' });
  const [state] = list(jobs);
  assert.equal(state.alive, false);
  assert.equal(state.finished, true);
  const done = collect(jobs);
  assert.equal(done.length, 1);
  assert.deepEqual(done[0].result, {
    status: 'failed', branch: null, tests: { passed: 0, total: 0 }, summary: 'job died without result', specPath: null,
  });
  assert.deepEqual(collect(jobs), []);
});

test('a reused pid with a different start time is dead', () => {
  const jobs = join(tmp(), 'jobs');
  fakeJob(jobs, 'reused', { pid: process.pid, pidStart: 'Mon Jan 1 00:00:00 2001' });
  fakeJob(jobs, 'same', { pid: process.pid, pidStart: startTime(process.pid) });
  assert.deepEqual(list(jobs).map((j) => [j.pageId, j.alive, j.finished]), [['reused', false, true], ['same', true, false]]);
  assert.equal(liveCount(jobs), 1);
  assert.deepEqual(collect(jobs).map((j) => [j.pageId, j.result.summary]), [['reused', 'job died without result']]);
});

test('start records the process start time in meta', () => {
  const root = tmp();
  const r = start(opts(root, { script: script(root, 'sleep.sh', 'exec sleep 30') }));
  pids.push(r.pid);
  const meta = JSON.parse(readFileSync(join(r.jobDir, 'meta.json'), 'utf8'));
  assert.equal(meta.pidStart, startTime(r.pid));
  assert.equal(liveCount(join(root, 'jobs')), 1);
});

test('the job env carries no tokens or Slack variables', async () => {
  const root = tmp();
  const saved = { ...process.env };
  Object.assign(process.env, { NOTION_TOKEN: 'n-secret', GH_TOKEN: 'g-secret', SLACK_BOT: 'x', SLACK_USER_TOKEN: 'y', KEEP_ME: 'ok' });
  let r;
  try {
    r = start(opts(root, { script: script(root, 'env.sh', 'env > "$4/env.txt"; echo "{}" > "$4/result.json"') }));
  } finally {
    for (const k of ['NOTION_TOKEN', 'GH_TOKEN', 'SLACK_BOT', 'SLACK_USER_TOKEN', 'KEEP_ME']) {
      if (k in saved) process.env[k] = saved[k];
      else delete process.env[k];
    }
  }
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
  const env = readFileSync(join(r.jobDir, 'env.txt'), 'utf8');
  assert.doesNotMatch(env, /secret|^SLACK_|_TOKEN=/m);
  assert.match(env, /^KEEP_ME=ok$/m);
  assert.match(env, /^CLAUDE_JOB_DIR=/m);
  assert.match(env, /^TRIAGE_BUILD_JOB=1$/m);
});

test('start validates the label and defaults it to null', () => {
  const root = tmp();
  assert.throws(() => start(opts(root, { label: 'B1; rm -rf' })), /invalid label/);
  const r = start(opts(root, { label: undefined }));
  assert.equal(r.started, true);
  assert.equal(JSON.parse(readFileSync(join(r.jobDir, 'meta.json'), 'utf8')).label, null);
});

test('start stores kind plan in meta and rejects an unknown kind', async () => {
  const root = tmp();
  const r = start(opts(root, { kind: 'plan', label: 'P1' }));
  assert.equal(r.started, true);
  const meta = JSON.parse(readFileSync(join(r.jobDir, 'meta.json'), 'utf8'));
  assert.equal(meta.kind, 'plan');
  assert.throws(() => start(opts(tmp(), { kind: 'deploy' })), /kind/);
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
});

test('the cap of 3 counts plan and build jobs together', () => {
  const root = tmp();
  const o = opts(root, { kind: 'plan' });
  fakeJob(o.jobsDir, 'a', { pid: process.pid, kind: 'plan' });
  fakeJob(o.jobsDir, 'b', { pid: process.pid, kind: 'build' });
  fakeJob(o.jobsDir, 'c', { pid: process.pid });
  assert.deepEqual(start(o), { started: false, reason: 'cap' });
  assert.deepEqual(start({ ...o, kind: 'build', pageId: 'page-2' }), { started: false, reason: 'cap' });
});

test('a build hands over the page of a finished, reported plan job but not of a running one', async () => {
  const root = tmp();
  const o = opts(root);
  fakeJob(o.jobsDir, 'page-1', { kind: 'plan', pid: deadPid() }, { 'result.json': '{"status":"planned"}', reported: 'x' });
  const r = start(o);
  assert.equal(r.started, true);
  assert.ok(await waitFor(() => existsSync(join(r.jobDir, 'result.json'))));
  const o2 = opts(tmp());
  fakeJob(o2.jobsDir, 'page-1', { kind: 'plan', pid: process.pid });
  assert.deepEqual(start(o2), { started: false, reason: 'claimed' });
  const o3 = opts(tmp(), { kind: 'plan' });
  fakeJob(o3.jobsDir, 'page-1', { kind: 'plan', pid: deadPid() }, { 'result.json': '{"status":"planned"}', reported: 'x' });
  assert.deepEqual(start(o3), { started: false, reason: 'claimed' });
});
