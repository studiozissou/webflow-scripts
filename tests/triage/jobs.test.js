// Guards the triage job registry: atomic claim, cap of 3 with stale PIDs, kill switch, detached spawn, collect and release, in temp dirs with fake job scripts.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    brief: 'Add FAQ JSON-LD to the Rolfing homepage.',
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
  assert.deepEqual(Object.keys(meta).sort(), ['brief', 'pageId', 'pid', 'slug', 'startedAt', 'task', 'threadTs']);
  assert.equal(meta.pid, r.pid);
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
