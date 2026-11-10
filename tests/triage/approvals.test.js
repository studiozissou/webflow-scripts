// Guards approval parsing: go/skip/ok changes, author, thread and ts checks, idempotency and unknown indices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReplies, compareTs } from '../../tools/triage/lib/approvals.js';

const USER = 'U0WILL';
const DIGEST = {
  ts: '1762844400.000100',
  channelId: 'C0TEST',
  date: '2026-11-11',
  items: [
    { n: '1', kind: 'thread', threadId: 'th-1' },
    { n: '2', kind: 'task', pageId: 'p-task' },
    { n: 'B1', kind: 'build', pageId: 'p-b1' },
    { n: 'B2', kind: 'build', pageId: 'p-b2' },
    { n: 'B3', kind: 'build', pageId: 'p-b3' },
    { n: 'C1', kind: 'proposal', pageId: 'p-c1' },
  ],
  processedTs: [],
};

function reply(ts, text, over = {}) {
  return { ts, thread_ts: DIGEST.ts, user: USER, text, ...over };
}

test('go with bare numbers and B labels approves build items', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'go 1 B3')], { userId: USER });
  assert.deepEqual(r.approved, [{ n: 'B1', pageId: 'p-b1' }, { n: 'B3', pageId: 'p-b3' }]);
  assert.deepEqual(r.skipped, []);
  assert.equal(r.applyProposals, false);
  assert.deepEqual(r.unknown, []);
  assert.deepEqual(r.processedTs, ['1762844500.000001']);
});

test('go all approves every build item; commas and case are tolerated', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'Go ALL')], { userId: USER });
  assert.deepEqual(r.approved.map((a) => a.n), ['B1', 'B2', 'B3']);
  const r2 = parseReplies(DIGEST, [reply('1762844500.000001', 'GO 1,2')], { userId: USER });
  assert.deepEqual(r2.approved.map((a) => a.n), ['B1', 'B2']);
});

test('skip marks items skipped and a later reply wins', () => {
  const r = parseReplies(
    DIGEST,
    [reply('1762844600.000001', 'skip 2'), reply('1762844500.000001', 'go all')],
    { userId: USER },
  );
  assert.deepEqual(r.approved.map((a) => a.n), ['B1', 'B3']);
  assert.deepEqual(r.skipped, [{ n: 'B2', pageId: 'p-b2' }]);
  assert.deepEqual(r.processedTs, ['1762844500.000001', '1762844600.000001']);
});

test('ok changes sets applyProposals', () => {
  for (const text of ['ok changes', 'OK Changes.', 'ok changes!', 'ok  changes ']) {
    const r = parseReplies(DIGEST, [reply('1762844500.000001', text)], { userId: USER });
    assert.equal(r.applyProposals, true, text);
    assert.deepEqual(r.approved, []);
    assert.deepEqual(r.unknown, []);
  }
});

test('ok changes with anything after it is rejected and recorded', () => {
  for (const text of ['ok changes thanks', 'ok changes but not C2']) {
    const r = parseReplies(DIGEST, [reply('1762844500.000001', text)], { userId: USER });
    assert.equal(r.applyProposals, false, text);
    assert.equal(r.unknown.length, 1, text);
    assert.equal(r.unknown[0].ts, '1762844500.000001');
    assert.deepEqual(r.processedTs, ['1762844500.000001']);
  }
});

test('a reply with any unknown token is rejected whole: no decisions, recorded as processed', () => {
  for (const text of ['go all except 2', 'go 1 3 but not 2', 'go 1 9', 'skip all 2', 'go 1 all']) {
    const r = parseReplies(DIGEST, [reply('1762844500.000001', text)], { userId: USER });
    assert.deepEqual(r.approved, [], text);
    assert.deepEqual(r.skipped, [], text);
    assert.ok(r.unknown.length > 0, text);
    assert.ok(r.unknown.every((u) => u.ts === '1762844500.000001'), text);
    assert.deepEqual(r.processedTs, ['1762844500.000001'], text);
  }
});

test('a rejected reply does not undo an earlier valid one', () => {
  const r = parseReplies(
    DIGEST,
    [reply('1762844500.000001', 'go 1'), reply('1762844600.000001', 'skip 1 but not 2')],
    { userId: USER },
  );
  assert.deepEqual(r.approved, [{ n: 'B1', pageId: 'p-b1' }]);
  assert.deepEqual(r.skipped, []);
});

test('skip all is valid as the entire argument', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'skip all')], { userId: USER });
  assert.deepEqual(r.skipped.map((s) => s.n), ['B1', 'B2', 'B3']);
});

test('replies from another user are ignored', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'go all', { user: 'U0OTHER' })], { userId: USER });
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.processedTs, []);
});

test('replies outside the digest thread or not after the digest ts are ignored', () => {
  const replies = [
    reply('1762844500.000001', 'go all', { thread_ts: '1762000000.000001' }),
    reply('1762844500.000002', 'go all', { thread_ts: undefined }),
    reply(DIGEST.ts, 'go all'),
    reply('1762844399.999999', 'go all'),
  ];
  const r = parseReplies(DIGEST, replies, { userId: USER });
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.processedTs, []);
});

test('non-command chatter is ignored and not recorded', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'going to look later'), reply('1762844500.000002', 'ok')], { userId: USER });
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.processedTs, []);
});

test('a reply ts already processed is never acted on twice', () => {
  const state = { ...DIGEST, processedTs: ['1762844500.000001'] };
  const r = parseReplies(state, [reply('1762844500.000001', 'go all'), reply('1762844600.000001', 'go 2')], { userId: USER });
  assert.deepEqual(r.approved, [{ n: 'B2', pageId: 'p-b2' }]);
  assert.deepEqual(r.processedTs, ['1762844500.000001', '1762844600.000001']);
});

test('unknown and non-build indices are reported, never guessed', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'go 9 C1 B7 x')], { userId: USER });
  assert.deepEqual(r.approved, []);
  assert.deepEqual(
    r.unknown.map((u) => [u.token, u.reason]),
    [['9', 'no such item'], ['C1', 'not a build item'], ['B7', 'no such item'], ['X', 'no such item']],
  );
  assert.equal(r.unknown[0].ts, '1762844500.000001');
});

test('go with no indices is reported', () => {
  const r = parseReplies(DIGEST, [reply('1762844500.000001', 'go')], { userId: USER });
  assert.deepEqual(r.unknown.map((u) => u.reason), ['no items given']);
});

test('fails closed without a userId', () => {
  assert.throws(() => parseReplies(DIGEST, [reply('1762844500.000001', 'go all')], {}), /userId/);
});

test('a bare number resolves to an exact build label first', () => {
  const state = { ...DIGEST, items: [{ n: 1, kind: 'build', pageId: 'p-one' }, { n: 'B1', kind: 'build', pageId: 'p-b1' }] };
  const r = parseReplies(state, [reply('1762844500.000001', 'go 1')], { userId: USER });
  assert.deepEqual(r.approved, [{ n: '1', pageId: 'p-one' }]);
});

test('compareTs orders Slack timestamps exactly', () => {
  assert.ok(compareTs('1762844400.000100', '1762844400.000099') > 0);
  assert.ok(compareTs('1762844400.1', '1762844400.000100') > 0);
  assert.equal(compareTs('1762844400.000100', '1762844400.000100'), 0);
  assert.ok(compareTs('999.9', '1000.0') < 0);
});
