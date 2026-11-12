// Guards the P4 doer write gate (allowComment, recordComment), the Slack draft target filter (draftTargets) and the Notion CLI comment gate that runs before any token lookup. Fixtures are fake.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allowComment, recordComment, sourceIds, readLedger } from '../../tools/triage/lib/comments.js';
import { draftTargets } from '../../tools/triage/lib/drafts.js';
import { main as notionMain } from '../../tools/notion/cli.js';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'triage-comments-'));
  dirs.push(d);
  return d;
};

const NOW = '2026-11-11T09:00:00Z';
const TASK = '0123456789abcdef0123456789abcdef';
const OTHER_TASK = 'fedcba9876543210fedcba9876543210';

const snapshot = {
  generatedAt: NOW,
  tasks: [{ id: TASK, name: 'Fix nav' }, { id: OTHER_TASK, name: 'Write post' }],
  sessions: [{ id: 'job-1', aliases: ['abc123'], kind: 'job' }, { id: 'remote:xyz', kind: 'remote' }],
  worktrees: [{ id: 'wt:webflow-scripts:feat-nav' }],
  prs: [{ id: 'pr:webflow-scripts#12' }],
  specs: [{ id: 'spec:nav' }],
};

test('sourceIds collects ids and aliases from every collector list', () => {
  const ids = sourceIds(snapshot);
  for (const id of ['job-1', 'abc123', 'remote:xyz', 'wt:webflow-scripts:feat-nav', 'pr:webflow-scripts#12', 'spec:nav']) assert.ok(ids.has(id), id);
  assert.equal(ids.has(TASK), false);
});

test('allowComment accepts a snapshot task with a collector source and an empty ledger', () => {
  assert.deepEqual(allowComment({ taskId: TASK, sourceId: 'pr:webflow-scripts#12' }, snapshot, tmp(), NOW), { ok: true });
});

test('allowComment matches a dashed task id against a dashless one', () => {
  const dashed = `${TASK.slice(0, 8)}-${TASK.slice(8, 12)}-${TASK.slice(12, 16)}-${TASK.slice(16, 20)}-${TASK.slice(20)}`;
  assert.deepEqual(allowComment({ taskId: dashed, sourceId: 'job-1' }, snapshot, tmp(), NOW), { ok: true });
});

test('allowComment refuses a task id that is not in the snapshot', () => {
  assert.deepEqual(allowComment({ taskId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', sourceId: 'job-1' }, snapshot, tmp(), NOW), { ok: false, reason: 'task-not-in-snapshot' });
});

test('allowComment refuses a source id that no collector produced', () => {
  assert.deepEqual(allowComment({ taskId: TASK, sourceId: 'https://evil.example' }, snapshot, tmp(), NOW), { ok: false, reason: 'source-not-in-snapshot' });
});

test('allowComment refuses with no snapshot or a malformed one', () => {
  assert.equal(allowComment({ taskId: TASK, sourceId: 'job-1' }, null, tmp(), NOW).ok, false);
  assert.equal(allowComment({ taskId: TASK, sourceId: 'job-1' }, { tasks: 'x' }, tmp(), NOW).ok, false);
});

test('allowComment refuses a second comment on the same task the same Amsterdam day', () => {
  const dir = tmp();
  recordComment({ taskId: TASK, sourceId: 'job-1' }, dir, NOW);
  assert.deepEqual(allowComment({ taskId: TASK, sourceId: 'pr:webflow-scripts#12' }, snapshot, dir, '2026-11-11T20:00:00Z'), { ok: false, reason: 'already-commented-today' });
  assert.deepEqual(allowComment({ taskId: OTHER_TASK, sourceId: 'pr:webflow-scripts#12' }, snapshot, dir, NOW), { ok: true });
});

test('allowComment counts a learnings comment from the shared ledger as today\'s comment', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'comments.jsonl'), `${JSON.stringify({ taskId: TASK, source: 'learnings', sourceId: 'learnings-2026-11-11', at: NOW })}\n`);
  assert.equal(allowComment({ taskId: TASK, sourceId: 'job-1' }, snapshot, dir, NOW).reason, 'already-commented-today');
});

test('allowComment refuses a repeat task and source on a later day', () => {
  const dir = tmp();
  recordComment({ taskId: TASK, sourceId: 'job-1' }, dir, '2026-11-09T09:00:00Z');
  assert.deepEqual(allowComment({ taskId: TASK, sourceId: 'job-1' }, snapshot, dir, NOW), { ok: false, reason: 'already-commented-for-source' });
  assert.deepEqual(allowComment({ taskId: TASK, sourceId: 'abc123' }, snapshot, dir, NOW), { ok: true });
});

test('readLedger skips bad lines', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'comments.jsonl'), `not json\n${JSON.stringify({ taskId: TASK, sourceId: 'job-1', at: NOW })}\n\n`);
  assert.equal(readLedger(dir).length, 1);
});

test('recordComment appends one line with the doer source', () => {
  const dir = tmp();
  recordComment({ taskId: TASK, sourceId: 'job-1' }, dir, NOW);
  const rows = readFileSync(join(dir, 'comments.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows, [{ taskId: TASK, source: 'doer', sourceId: 'job-1', at: NOW }]);
});

const WILL = 'UWILL';
test('draftTargets keeps threads whose last human message is not Will\'s', () => {
  const threads = [
    { id: 't1', kind: 'dm', messages: [{ user: WILL, ts: '1.0' }, { user: 'UANNA', ts: '2.0' }] },
    { id: 't2', kind: 'thread', messages: [{ user: 'UANNA', ts: '1.0' }, { user: WILL, ts: '3.0' }] },
    { id: 't3', kind: 'thread', messages: [{ user: WILL, ts: '5.0' }, { user: 'UBOB', ts: '4.0' }] },
    { id: 't4', kind: 'dm', messages: [{ user: 'UBOT', ts: '1.0', bot: true }] },
    { id: 't5', kind: 'channel', messages: [{ user: 'UANNA', ts: '1.0' }] },
    { id: 't6', kind: 'dm', messages: [] },
  ];
  assert.deepEqual(draftTargets(threads, WILL).map((t) => t.id), ['t1']);
});

test('draftTargets returns nothing without a user id', () => {
  assert.deepEqual(draftTargets([{ id: 't1', kind: 'dm', messages: [{ user: 'UANNA', ts: '1.0' }] }], ''), []);
});

function quiet(fn) {
  const write = process.stdout.write;
  const errWrite = process.stderr.write;
  let outText = '';
  process.stdout.write = (s) => ((outText += s), true);
  process.stderr.write = () => true;
  return Promise.resolve(fn()).finally(() => {
    process.stdout.write = write;
    process.stderr.write = errWrite;
  }).then((code) => ({ code, out: outText }));
}

test('notion comment requires --source', async () => {
  const { code } = await quiet(() => notionMain(['comment', '--page', TASK, '--text', 'hi'], {}));
  assert.equal(code, 1);
});

test('notion comment refuses before any token lookup when the gate says no', async () => {
  const dir = tmp();
  const worldDir = join(dir, 'world');
  const env = { TRIAGE_TEST_WORLD_DIR: worldDir, TRIAGE_TEST_COMMENTS_DIR: dir, TRIAGE_TEST_NOW: NOW, NOTION_TOKEN: '' };
  const { code, out } = await quiet(() => notionMain(['comment', '--page', TASK, '--text', 'hi', '--source', 'job-1'], env));
  assert.equal(code, 1);
  assert.deepEqual(JSON.parse(out), { commented: false, reason: 'no-snapshot' });
  assert.equal(existsSync(join(dir, 'comments.jsonl')), false);
});

test('notion comment posts through the gate and records the ledger line', async () => {
  const dir = tmp();
  const worldDir = join(dir, 'world');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(worldDir);
  writeFileSync(join(worldDir, '2026-11-11.json'), JSON.stringify(snapshot));
  const posted = [];
  const client = { comments: { async create(a) { posted.push(a); return { id: 'c9' }; } } };
  const env = { TRIAGE_TEST_WORLD_DIR: worldDir, TRIAGE_TEST_COMMENTS_DIR: dir, TRIAGE_TEST_NOW: NOW };
  const first = await quiet(() => notionMain(['comment', '--page', TASK, '--text', 'New PR', '--source', 'pr:webflow-scripts#12'], env, { client }));
  assert.equal(first.code, 0);
  assert.equal(posted.length, 1);
  assert.equal(readLedger(dir).length, 1);
  const second = await quiet(() => notionMain(['comment', '--page', TASK, '--text', 'Again', '--source', 'job-1'], env, { client }));
  assert.equal(second.code, 1);
  assert.equal(JSON.parse(second.out).reason, 'already-commented-today');
  assert.equal(posted.length, 1);
});

test('notion comment does not record a ledger line when Notion fails', async () => {
  const dir = tmp();
  const worldDir = join(dir, 'world');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(worldDir);
  writeFileSync(join(worldDir, '2026-11-11.json'), JSON.stringify(snapshot));
  const client = { comments: { async create() { throw new Error('boom'); } } };
  const env = { TRIAGE_TEST_WORLD_DIR: worldDir, TRIAGE_TEST_COMMENTS_DIR: dir, TRIAGE_TEST_NOW: NOW };
  const { code } = await quiet(() => notionMain(['comment', '--page', TASK, '--text', 'x', '--source', 'job-1'], env, { client }));
  assert.equal(code, 2);
  assert.equal(readLedger(dir).length, 0);
});
