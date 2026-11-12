// Guards approval parsing: go/skip/ok changes on B items, link/keep/drop on goal-fit Q items (decided once, drop approved only by a later ok changes), author, thread and ts checks, idempotency and unknown indices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReplies, compareTs } from '../../tools/triage/lib/approvals.js';

const USER = 'U0OWNER';
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

test('processedTs comes back de-duplicated, keeping first-seen order', () => {
  const state = { ...DIGEST, processedTs: ['1762844500.000001', '1762844500.000001', '1762844450.000001'] };
  const r = parseReplies(state, [reply('1762844600.000001', 'go 1'), reply('1762844600.000001', 'go 1')], { userId: USER });
  assert.deepEqual(r.processedTs, ['1762844500.000001', '1762844450.000001', '1762844600.000001']);
});

// ---------- goal-fit Q items (D18) ----------

const Q_DIGEST = {
  ...DIGEST,
  items: [
    ...DIGEST.items,
    { n: 'S1', kind: 'session', id: 'sess-1' },
    { n: 'Q1', kind: 'goal-fit', taskId: 't-q1', goalId: 'g-1' },
    { n: 'Q2', kind: 'goal-fit', taskId: 't-q2', goalId: 'g-2' },
    { label: 'Q3', kind: 'goal-fit', taskId: 't-q3', goalId: null },
  ],
};
const parse = (replies, state = Q_DIGEST) => parseReplies(state, replies, { userId: USER });
const NO_FIT = { link: [], keep: [], drop: [] };
const DROP_TS = '1762844500.000001';
const pendingQ1 = { Q1: { verb: 'drop', taskId: 't-q1', ts: DROP_TS, status: 'pending' } };
const pending = (r) => Object.keys(r.goalFitState).filter((l) => r.goalFitState[l].status === 'pending');

test('link, keep and drop act on goal-fit items, case-insensitive, and keep build parsing as it was', () => {
  const r = parse([reply('1762844500.000001', 'Link q1'), reply('1762844500.000002', 'KEEP Q2, Q3'), reply('1762844500.000003', 'go 1')]);
  assert.deepEqual(r.goalFit, {
    link: [{ label: 'Q1', taskId: 't-q1', goalId: 'g-1' }],
    keep: [{ label: 'Q2', taskId: 't-q2' }, { label: 'Q3', taskId: 't-q3' }],
    drop: [],
  });
  assert.deepEqual(r.approved, [{ n: 'B1', pageId: 'p-b1' }]);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(r.unknown, []);
  assert.deepEqual(r.goalFitState, {
    Q1: { verb: 'link', taskId: 't-q1', ts: '1762844500.000001', status: 'done' },
    Q2: { verb: 'keep', taskId: 't-q2', ts: '1762844500.000002', status: 'done' },
    Q3: { verb: 'keep', taskId: 't-q3', ts: '1762844500.000002', status: 'done' },
  });
});

test('a digest with no Q items returns empty goal-fit results', () => {
  const r = parse([reply('1762844500.000001', 'go all')], DIGEST);
  assert.deepEqual(r.goalFit, NO_FIT);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(r.goalFitState, {});
});

test('link, keep and drop not followed by a Q label are chatter: ignored and not recorded', () => {
  for (const text of ['keep going', 'drop me a note', 'link to the doc?', 'keep', 'keep all', 'Link: Q1']) {
    const r = parse([reply('1762844500.000001', text)]);
    assert.deepEqual(r.goalFit, NO_FIT, text);
    assert.deepEqual(r.unknown, [], text);
    assert.deepEqual(r.processedTs, [], text);
    assert.deepEqual(r.goalFitState, {}, text);
  }
});

test('a goal-fit reply with any bad token after a Q label is rejected whole', () => {
  const cases = [
    ['link Q1 Q9', 'no such item'],
    ['link Q1 B1', 'not a goal-fit item'],
    ['keep Q1 S1', 'not a goal-fit item'],
    ['drop Q1 1', 'not a goal-fit item'],
    ['link Q3', 'no goal proposed'],
    ['keep Q1 all', 'all is not allowed here'],
    ['drop Q9', 'no such item'],
    ['link Q1 foo', 'no such item'],
  ];
  for (const [text, reason] of cases) {
    const r = parse([reply('1762844500.000001', text)]);
    assert.deepEqual(r.goalFit, NO_FIT, text);
    assert.deepEqual(r.goalFitState, {}, text);
    assert.ok(r.unknown.some((u) => u.reason === reason), `${text}: ${JSON.stringify(r.unknown)}`);
    assert.deepEqual(r.processedTs, ['1762844500.000001'], text);
  }
});

test('go and skip on a Q item are invalid, and go S1 stays invalid', () => {
  for (const text of ['go Q1', 'skip Q2', 'go S1', 'go 1 Q1']) {
    const r = parse([reply('1762844500.000001', text)]);
    assert.deepEqual(r.approved, [], text);
    assert.deepEqual(r.skipped, [], text);
    assert.deepEqual(r.goalFit, NO_FIT, text);
    assert.ok(r.unknown.some((u) => u.reason === 'not a build item'), text);
  }
});

test('goal-fit replies from another user, another thread or before the digest are ignored', () => {
  const r = parse([
    reply('1762844500.000001', 'link Q1', { user: 'U0OTHER' }),
    reply('1762844500.000002', 'keep Q2', { thread_ts: '1762000000.000001' }),
    reply('1762844399.000001', 'drop Q1'),
  ]);
  assert.deepEqual(r.goalFit, NO_FIT);
  assert.deepEqual(r.processedTs, []);
});

test('each Q item is decided once: a later reply naming a decided item is rejected whole, also across runs', () => {
  const r = parse([reply('1762844500.000001', 'keep Q1'), reply('1762844600.000001', 'link Q1 Q2')]);
  assert.deepEqual(r.goalFit, { link: [], keep: [{ label: 'Q1', taskId: 't-q1' }], drop: [] });
  assert.deepEqual(r.unknown.map((u) => [u.token, u.reason]), [['Q1', 'already decided']]);
  const saved = { Q1: { verb: 'keep', taskId: 't-q1', ts: '1762844500.000001', status: 'done' } };
  const again = parse([reply('1762844700.000001', 'link Q1'), reply('1762844700.000002', 'link Q2 q2')], { ...Q_DIGEST, goalFitState: saved });
  assert.deepEqual(again.goalFit.link, [{ label: 'Q2', taskId: 't-q2', goalId: 'g-2' }]);
  assert.deepEqual(Object.keys(again.goalFitState), ['Q1', 'Q2']);
  assert.deepEqual(again.goalFitState.Q1, saved.Q1);
  const replay = parse([reply('1762844500.000001', 'link Q1')], { ...Q_DIGEST, processedTs: ['1762844500.000001'] });
  assert.deepEqual(replay.goalFit, NO_FIT);
});

test('drop only proposes: without a later ok changes it writes nothing and stays pending', () => {
  const r = parse([reply(DROP_TS, 'drop Q1')]);
  assert.deepEqual(r.goalFit.drop, [{ label: 'Q1', taskId: 't-q1' }]);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.goalFitState, pendingQ1);
});

test('ok changes before the drop does not approve it', () => {
  const r = parse([reply('1762844400.500000', 'ok changes'), reply(DROP_TS, 'drop Q1')]);
  assert.equal(r.applyProposals, true);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(pending(r), ['Q1']);
});

test('drop then a later ok changes approves it, once', () => {
  const r = parse([reply('1762844600.000001', 'ok changes'), reply(DROP_TS, 'drop Q1 Q2')]);
  assert.deepEqual(r.approvedDrops, [{ label: 'Q1', taskId: 't-q1' }, { label: 'Q2', taskId: 't-q2' }]);
  assert.deepEqual(pending(r), []);
  assert.equal(r.goalFitState.Q1.status, 'approved');
  assert.deepEqual(r.goalFit.drop.map((d) => d.label), ['Q1', 'Q2']);
  const next = parse([reply('1762844900.000001', 'ok changes')], { ...Q_DIGEST, goalFitState: r.goalFitState });
  assert.deepEqual(next.approvedDrops, [], 'an approved drop is not approved again');
});

test('a pending drop from an earlier run is approved by a later ok changes, never by a replayed or earlier one', () => {
  const state = { ...Q_DIGEST, goalFitState: pendingQ1, processedTs: [DROP_TS] };
  const later = parse([reply('1762844900.000001', 'ok changes')], state);
  assert.deepEqual(later.approvedDrops, [{ label: 'Q1', taskId: 't-q1' }]);
  assert.deepEqual(later.goalFitState.Q1.status, 'approved');
  assert.deepEqual(later.goalFit, NO_FIT, 'goalFit lists only decisions from this call');
  const earlier = parse([reply('1762844450.000001', 'ok changes')], state);
  assert.deepEqual(earlier.approvedDrops, []);
  assert.deepEqual(earlier.goalFitState, pendingQ1);
  assert.deepEqual(parse([], state).goalFitState, pendingQ1);
});

test('saved state for items not in this digest, or with another task, is discarded, never approved', () => {
  const state = { ...Q_DIGEST, goalFitState: { Q7: { ...pendingQ1.Q1, taskId: 't-forged' }, Q1: { ...pendingQ1.Q1, taskId: 't-forged' } } };
  const r = parse([reply('1762844900.000001', 'ok changes')], state);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(r.goalFitState, {});
});

test('ok changes with trailing text approves no drop', () => {
  const r = parse([reply(DROP_TS, 'drop Q1'), reply('1762844600.000001', 'ok changes except Q1')]);
  assert.deepEqual(r.approvedDrops, []);
  assert.deepEqual(pending(r), ['Q1']);
});

test('only a saved drop can be approved: a pending entry with another verb never is', () => {
  const state = { ...Q_DIGEST, goalFitState: { Q1: { ...pendingQ1.Q1, verb: 'keep' } } };
  assert.deepEqual(parse([reply('1762844900.000001', 'ok changes')], state).approvedDrops, []);
});

const PA_DIGEST = {
  ...DIGEST,
  items: [
    ...DIGEST.items,
    { n: 'P1', kind: 'plan', pageId: 'g-1', slug: 'goal-ship' },
    { n: 'P2', kind: 'plan', pageId: 'g-2', slug: 'goal-grow' },
    { n: 'A1', kind: 'automation', pageId: 'auto-invoice-chase', slug: 'auto-invoice-chase' },
    { n: 'G1', kind: 'goal-link', taskId: 't-1', goalId: 'g-1' },
    { n: 'S1', kind: 'session' },
    { n: 'V1', kind: 'advisor' },
  ],
};
const parsePa = (replies, digest = PA_DIGEST, userId = USER) => parseReplies(digest, replies, { userId });

test('go P1 approves a plan for a build and skip P2 skips one; plans never land in approved builds', () => {
  const r = parsePa([reply('1762844500.000001', 'go P1'), reply('1762844500.000002', 'skip P2')]);
  assert.deepEqual(r.approvedPlans, [{ n: 'P1', pageId: 'g-1', slug: 'goal-ship' }]);
  assert.deepEqual(r.skippedPlans, [{ n: 'P2', pageId: 'g-2', slug: 'goal-grow' }]);
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.unknown, []);
});

test('go all approves every B item but no plan or automation', () => {
  const r = parsePa([reply('1762844500.000001', 'go all')]);
  assert.deepEqual(r.approved.map((a) => a.n), ['B1', 'B2', 'B3']);
  assert.deepEqual(r.approvedPlans, []);
  assert.deepEqual(r.approvedAutomations, []);
});

test('go A1 approves an automation proposal for a plan job', () => {
  const r = parsePa([reply('1762844500.000001', 'go A1 B2')]);
  assert.deepEqual(r.approvedAutomations, [{ n: 'A1', pageId: 'auto-invoice-chase', slug: 'auto-invoice-chase' }]);
  assert.deepEqual(r.approved, [{ n: 'B2', pageId: 'p-b2' }]);
});

test('go P1 from another user is ignored', () => {
  const r = parsePa([reply('1762844500.000001', 'go P1', { user: 'U0OTHER' })]);
  assert.deepEqual(r.approvedPlans, []);
  assert.deepEqual(r.processedTs, []);
});

test('go S1, go V1 and go G1 are not build items and reject the whole reply', () => {
  for (const text of ['go S1', 'go V1', 'go G1', 'go P1 S1']) {
    const r = parsePa([reply('1762844500.000001', text)]);
    assert.deepEqual(r.approvedPlans, [], text);
    assert.ok(r.unknown.some((u) => u.reason === 'not a build item'), text);
  }
});

test('G goal-link proposals apply only with ok changes', () => {
  assert.deepEqual(parsePa([]).goalLinks, []);
  const r = parsePa([reply('1762844500.000001', 'ok changes')]);
  assert.equal(r.applyProposals, true);
  assert.deepEqual(r.goalLinks, [{ label: 'G1', taskId: 't-1', goalId: 'g-1' }]);
});

test('ok advisors applies the verdict only when the digest carries one, and takes no arguments', () => {
  const none = parsePa([reply('1762844500.000001', 'ok advisors')]);
  assert.equal(none.applyAdvisors, false);
  assert.ok(none.unknown.some((u) => u.reason === 'no advisor verdict in this digest'));
  const verdicts = [{ advisor: 'logistics', verdict: 'keep' }];
  const digest = { ...PA_DIGEST, items: [...PA_DIGEST.items, { n: 'ADV', kind: 'advisor-verdict', verdicts }] };
  const ok = parsePa([reply('1762844500.000001', 'OK advisors')], digest);
  assert.equal(ok.applyAdvisors, true);
  assert.deepEqual(ok.advisorVerdict, verdicts);
  assert.equal(ok.applyProposals, false);
  const extra = parsePa([reply('1762844500.000001', 'ok advisors now')], digest);
  assert.equal(extra.applyAdvisors, false);
  assert.ok(extra.unknown.some((u) => u.reason === 'ok advisors takes no arguments'));
});

const NUM_DIGEST = {
  ts: '1762844400.000100',
  items: [
    { n: '1', kind: 'thread', threadId: 'th-1' },
    { n: '2', kind: 'task', pageId: 'p-task' },
    { n: '3', kind: 'build', pageId: 'p-b1' },
    { n: '4', kind: 'build', pageId: 'p-b2' },
    { n: '5', kind: 'proposal', pageId: 'p-c1' },
    { n: '6', kind: 'goal-fit', taskId: 't-6', goalId: 'g-6' },
    { n: '7', kind: 'goal-fit', taskId: 't-7', goalId: 'g-7' },
    { n: '8', kind: 'session' },
    { n: '9', kind: 'plan', pageId: 'g-9', slug: 'goal-nine' },
    { n: '10', kind: 'automation', pageId: 'auto-x', slug: 'auto-x' },
  ],
  processedTs: [],
};
const parseNum = (replies) => parseReplies(NUM_DIGEST, replies, { userId: USER });

test('running numbers: go and skip pick build, plan and automation items by their number', () => {
  const r = parseNum([reply('1762844500.000001', 'go 3 9 10'), reply('1762844500.000002', 'skip 4')]);
  assert.deepEqual(r.approved, [{ n: '3', pageId: 'p-b1' }]);
  assert.deepEqual(r.skipped, [{ n: '4', pageId: 'p-b2' }]);
  assert.deepEqual(r.approvedPlans.map((p) => p.n), ['9']);
  assert.deepEqual(r.approvedAutomations.map((p) => p.n), ['10']);
  assert.deepEqual(r.unknown, []);
});

test('running numbers: go on a task, session or goal-fit number is not a build item', () => {
  for (const text of ['go 1', 'go 8', 'go 6']) {
    const r = parseNum([reply('1762844500.000001', text)]);
    assert.deepEqual(r.approved, [], text);
    assert.ok(r.unknown.some((u) => u.reason === 'not a build item'), text);
  }
});

test('running numbers: link, keep and drop take a goal-fit number; other numbers stay chatter', () => {
  const r = parseNum([reply('1762844500.000001', 'link 6'), reply('1762844500.000002', 'drop 7')]);
  assert.deepEqual(r.goalFit.link, [{ label: '6', taskId: 't-6', goalId: 'g-6' }]);
  assert.deepEqual(r.goalFit.drop, [{ label: '7', taskId: 't-7' }]);
  const chat = parseNum([reply('1762844500.000003', 'drop 2 of those, I will do it')]);
  assert.deepEqual(chat.processedTs, []);
});

test('a numbered list reply applies one command per line', () => {
  const r = parseNum([reply('1762844500.000001', '3. go\n4) skip\n6. link\n7: keep\n9 go')]);
  assert.deepEqual(r.approved.map((a) => a.n), ['3']);
  assert.deepEqual(r.skipped.map((a) => a.n), ['4']);
  assert.deepEqual(r.goalFit.link.map((x) => x.label), ['6']);
  assert.deepEqual(r.goalFit.keep.map((x) => x.label), ['7']);
  assert.deepEqual(r.approvedPlans.map((p) => p.n), ['9']);
  assert.deepEqual(r.unknown, []);
});

test('a multi-line reply mixes list lines with go lines and ok changes', () => {
  const r = parseNum([reply('1762844500.000001', 'go 3 4\n6. link\nok changes')]);
  assert.deepEqual(r.approved.map((a) => a.n), ['3', '4']);
  assert.deepEqual(r.goalFit.link.map((x) => x.label), ['6']);
  assert.equal(r.applyProposals, true);
});

test('one bad line rejects the whole list reply and nothing is applied', () => {
  const bad = parseNum([reply('1762844500.000001', '3. go\n8. go')]);
  assert.deepEqual(bad.approved, []);
  assert.ok(bad.unknown.some((u) => u.token === '8' && u.reason === 'not a build item'));
  const mixed = parseNum([reply('1762844500.000002', '3. go\nthanks, and maybe 4 later')]);
  assert.deepEqual(mixed.approved, []);
  assert.ok(mixed.unknown.some((u) => u.reason === 'line not understood'));
  assert.deepEqual(mixed.processedTs.includes('1762844500.000002'), true);
});

test('a list reply from another user is ignored', () => {
  const r = parseReplies(NUM_DIGEST, [reply('1762844500.000001', '3. go', { user: 'U0OTHER' })], { userId: USER });
  assert.deepEqual(r.approved, []);
  assert.deepEqual(r.processedTs, []);
});
