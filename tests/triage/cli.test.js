// Guards the triage CLI: the buckets snapshot on the shared fixture, rank, approvals, lint exit codes, jobs subcommands and usage errors.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'tools/triage/cli.js');
const FIXTURE = 'tests/triage/fixtures/tasks.json';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-cli-'));
  dirs.push(d);
  return d;
}

function run(args, input) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, input: input ?? '', encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr, json: () => JSON.parse(r.stdout) };
}

const url = (id) => `https://www.notion.so/${id}`;

const BUCKETS_SNAPSHOT = {
  now: [
    { kind: 'thread', id: 'th-newbiz', name: 'Nieuwe website', from: 'Bakkerij De Pijp <info@bakkerijdepijp.example>', reason: 'new-business', lastMessageAt: '2026-11-10T16:00:00Z', ageWorkingDays: 1 },
    { kind: 'task', id: 't-blocked', name: 'Approve the Contoso homepage design', reason: 'blocked-on-will', priority: 'P1', due: null, doer: 'User', clients: ['Contoso'], url: url('t-blocked') },
    { kind: 'thread', id: 'th-question', name: 'Which menu PDF is current?', from: 'Sam <sam@globex.example>', reason: 'blocked-on-will', lastMessageAt: '2026-11-10T09:00:00Z', ageWorkingDays: 1 },
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
    { pageId: 't-blocked', name: 'Approve the Contoso homepage design', from: 'P1', to: 'P0', reason: 'blocked-on-will', due: null },
    { pageId: 't-p3-week', name: 'Update the Hooli footer', from: 'P3', to: 'P1', reason: 'due-week', due: '2026-11-16' },
  ],
};

function rulesConfig(rules = {}) {
  const config = join(tmp(), 'config.json');
  writeFileSync(config, JSON.stringify({ digest: { rules: { blockedNamePattern: '\\bWill\\b', ...rules } } }));
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

test('rank excludes jobs already in the jobs dir', () => {
  const jobs = join(tmp(), 'jobs');
  const r1 = run(['rank', '--in', FIXTURE, '--jobs-dir', jobs]);
  assert.equal(r1.code, 0, r1.err);
  assert.deepEqual(r1.json().map((i) => [i.label, i.pageId, i.command]), [['B1', 't-weekend', '/generate-schema']]);
  const s = run(['jobs', 'start', '--page', 't-weekend', '--slug', 'faq', '--thread', '1.000001', '--jobs-dir', jobs, '--script', '/usr/bin/true', '--kill-switch', join(jobs, 'off')]);
  assert.equal(s.code, 0, s.err);
  assert.deepEqual(run(['rank', '--in', FIXTURE, '--jobs-dir', jobs]).json(), []);
});

test('approvals resolves replies and needs a user ID', () => {
  const dir = tmp();
  const digest = join(dir, 'state.json');
  const replies = join(dir, 'replies.json');
  writeFileSync(digest, JSON.stringify({ digest: { ts: '100.000001', items: [{ n: 'B1', kind: 'build', pageId: 'p1' }], processedTs: [] } }));
  writeFileSync(replies, JSON.stringify({ messages: [{ ts: '100.000002', thread_ts: '100.000001', user: 'U1', text: 'go 1' }] }));
  const r = run(['approvals', '--digest', digest, '--replies', replies, '--user', 'U1']);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json().approved, [{ n: 'B1', pageId: 'p1' }]);
  const config = join(dir, 'config.json');
  writeFileSync(config, JSON.stringify({ slack: { digest: { userId: 'U2' } } }));
  assert.deepEqual(run(['approvals', '--digest', digest, '--replies', replies, '--config', config]).json().approved, []);
  assert.equal(run(['approvals', '--digest', digest, '--replies', replies]).code, 2);
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
  const base = ['--jobs-dir', jobs, '--script', script, '--kill-switch', off];
  writeFileSync(off, '');
  const refused = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', ...base]);
  assert.equal(refused.code, 1);
  assert.deepEqual(refused.json(), { started: false, reason: 'kill-switch' });
  rmSync(off);
  const started = run(['jobs', 'start', '--page', 'p1', '--slug', 's', '--thread', '1.000001', '--task', 'T', '--brief', 'B', ...base]);
  assert.equal(started.code, 0, started.err);
  assert.equal(started.json().started, true);
  const end = Date.now() + 5000;
  while (!existsSync(join(jobs, 'p1', 'result.json')) && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  assert.deepEqual(run(['jobs', 'list', ...base]).json().map((j) => j.pageId), ['p1']);
  const collected = run(['jobs', 'collect', ...base]).json();
  assert.equal(collected[0].result.branch, 'job/s');
  assert.deepEqual(run(['jobs', 'collect', ...base]).json(), []);
  assert.equal(run(['jobs', 'start', '--page', 'p2', ...base]).code, 2);
  assert.equal(run(['jobs', 'nope', ...base]).code, 2);
});
