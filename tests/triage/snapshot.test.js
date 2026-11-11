// Guards the daily world snapshot and the rollup: atomic write through a temp file, the lock and its stale-lock recovery, stale snapshot detection (> 3 h), add-remote merging and the unavailable fallback, a failing collector that still writes, and a rollup with unique S numbers, Stale only on Mondays, the cloud fallback line, at most 40 lines and an STE ratio of at least 0.80.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  snapshotPath,
  writeSnapshot,
  readSnapshot,
  withLock,
  isStale,
  buildSnapshot,
  addRemote,
  collectSnapshot,
  STALE_MS,
} from '../../tools/triage/lib/snapshot.js';
import { rollup } from '../../tools/triage/lib/rollup.js';
import { lint, MIN_RATIO } from '../../tools/triage/lib/ste-lint.js';
import { remoteItems } from '../../tools/triage/lib/sessions.js';

const MONDAY = '2026-11-16T07:00:00.000Z';
const TUESDAY = '2026-11-17T07:00:00.000Z';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-snapshot-'));
  dirs.push(d);
  return d;
}

const ok = (items = []) => () => ({ status: 'ok', items });
const NO_SOURCES = { jobs: ok(), transcripts: ok(), desktop: ok(), worktrees: ok(), prs: ok(), specs: ok() };

test('snapshotPath names the file by Amsterdam date', () => {
  assert.equal(snapshotPath('/w', '2026-11-15T23:30:00Z'), '/w/2026-11-16.json');
});

test('writeSnapshot writes through a temp file and rename, leaving no temp file', () => {
  const dir = join(tmp(), 'world');
  const path = writeSnapshot(dir, { generatedAt: MONDAY, sessions: [] });
  assert.equal(path, join(dir, '2026-11-16.json'));
  assert.deepEqual(readdirSync(dir), ['2026-11-16.json']);
  assert.deepEqual(readSnapshot(dir, MONDAY), { generatedAt: MONDAY, sessions: [] });
  assert.equal(readSnapshot(dir, TUESDAY), null);
  writeFileSync(join(dir, '2026-11-17.json'), '{ broken');
  assert.equal(readSnapshot(dir, TUESDAY), null);
});

test('withLock refuses a held lock, releases after the call and after a throw, and recovers a stale lock', () => {
  const dir = tmp();
  const inner = withLock(dir, () => withLock(dir, () => 'nested'));
  assert.equal(inner.ok, true);
  assert.deepEqual(inner.value, { ok: false, reason: 'locked' });
  assert.deepEqual(withLock(dir, () => 7), { ok: true, value: 7 });
  assert.throws(() => withLock(dir, () => { throw new Error('boom'); }), /boom/);
  assert.equal(withLock(dir, () => 1).ok, true, 'released after a throw');
  mkdirSync(join(dir, 'lock'));
  writeFileSync(join(dir, 'lock', 'meta.json'), JSON.stringify({ startedAt: '2026-01-01T00:00:00Z' }));
  assert.equal(withLock(dir, () => 'recovered').value, 'recovered');
  mkdirSync(join(dir, 'lock'));
  writeFileSync(join(dir, 'lock', 'meta.json'), JSON.stringify({ startedAt: new Date().toISOString() }));
  assert.deepEqual(withLock(dir, () => 'no'), { ok: false, reason: 'locked' });
});

test('isStale is true after 3 hours or without generatedAt', () => {
  const now = Date.parse(MONDAY);
  assert.equal(STALE_MS, 3 * 3_600_000);
  assert.equal(isStale({ generatedAt: new Date(now - STALE_MS + 1000).toISOString() }, MONDAY), false);
  assert.equal(isStale({ generatedAt: new Date(now - STALE_MS - 1000).toISOString() }, MONDAY), true);
  assert.equal(isStale({}, MONDAY), true);
  assert.equal(isStale(null, MONDAY), true);
});

test('buildSnapshot has the spec shape and a throwing collector marks only its source as error', () => {
  const s = buildSnapshot({
    now: MONDAY,
    roots: {},
    collectors: { ...NO_SOURCES, desktop: () => { throw new Error('bad file'); }, prs: () => ({ status: 'unavailable', items: [] }) },
    tasks: [{ id: 't1', name: 'Task' }],
  });
  assert.equal(s.generatedAt, MONDAY);
  assert.equal(s.date, '2026-11-16');
  assert.deepEqual(s.sources, { jobs: 'ok', transcripts: 'ok', desktop: 'error', worktrees: 'ok', prs: 'unavailable', specs: 'ok', remote: 'unavailable' });
  for (const key of ['sessions', 'worktrees', 'prs', 'specs', 'tasks', 'goals', 'plans']) assert.ok(Array.isArray(s[key]), key);
  assert.deepEqual(s.tasks, [{ id: 't1', name: 'Task' }]);
  assert.match(s.errors.desktop, /bad file/);
});

test('addRemote replaces earlier remote sessions, sets sources.remote and --unavailable records the fallback', () => {
  const base = buildSnapshot({ now: MONDAY, roots: {}, collectors: NO_SOURCES });
  const once = addRemote(base, [{ id: 'cse_a', name: 'A', status: 'Waiting on a human' }, { id: 'cse_b', name: 'B', status: 'Running', kind: 'cloud' }]);
  assert.equal(once.sources.remote, 'ok');
  assert.deepEqual(once.sessions.map((x) => [x.id, x.kind, x.needsUser]), [['remote:cse_a', 'remote', true], ['remote:cse_b', 'cloud', false]]);
  const twice = addRemote(once, [{ id: 'cse_a', name: 'A', status: 'Idle' }]);
  assert.deepEqual(twice.sessions.map((x) => [x.id, x.needsUser]), [['remote:cse_a', false]]);
  const off = addRemote(twice, null);
  assert.equal(off.sources.remote, 'unavailable');
  assert.deepEqual(off.sessions.map((x) => x.id), ['remote:cse_a'], 'unavailable keeps what was there');
});

test('collectSnapshot writes today\'s file, keeps same-day remote sessions and tasks, and reports a held lock', () => {
  const dir = join(tmp(), 'world');
  const first = collectSnapshot({ dir, now: MONDAY, roots: {}, collectors: NO_SOURCES, tasks: [{ id: 't1', name: 'Task' }] });
  assert.equal(first.ok, true);
  writeSnapshot(dir, addRemote(readSnapshot(dir, MONDAY), [{ id: 'cse_a', name: 'A', status: 'Waiting on a human' }]));
  const second = collectSnapshot({ dir, now: '2026-11-16T08:00:00Z', roots: {}, collectors: NO_SOURCES });
  const s = readSnapshot(dir, MONDAY);
  assert.equal(second.path, join(dir, '2026-11-16.json'));
  assert.equal(s.sources.remote, 'ok');
  assert.deepEqual(s.sessions.map((x) => x.id), ['remote:cse_a']);
  assert.deepEqual(s.tasks.map((t) => t.id), ['t1']);
  const held = withLock(dir, () => collectSnapshot({ dir, now: MONDAY, roots: {}, collectors: NO_SOURCES }));
  assert.deepEqual(held.value, { ok: false, reason: 'locked' });
});

test('collectSnapshot stores given goals and keeps the same-day goals when none are given', () => {
  const dir = join(tmp(), 'world');
  const goals = [{ id: 'g1', name: 'Acme retainer health', status: 'Active' }];
  collectSnapshot({ dir, now: MONDAY, roots: {}, collectors: NO_SOURCES, tasks: [{ id: 't1' }], goals });
  assert.deepEqual(readSnapshot(dir, MONDAY).goals, goals);
  collectSnapshot({ dir, now: '2026-11-16T08:00:00Z', roots: {}, collectors: NO_SOURCES });
  assert.deepEqual(readSnapshot(dir, MONDAY).goals, goals);
  collectSnapshot({ dir, now: '2026-11-16T09:00:00Z', roots: {}, collectors: NO_SOURCES, goals: [] });
  assert.deepEqual(readSnapshot(dir, MONDAY).goals, []);
  assert.deepEqual(readSnapshot(dir, MONDAY).tasks.map((t) => t.id), ['t1']);
});

// A busy morning: more than 5 items in some classes, untrusted titles with dashes and emoji.
function busySnapshot(extra = {}) {
  const sessions = [
    { id: 'job-blocked', kind: 'job', title: 'Acme invoice check', detail: 'keep the old footer — or drop it?', state: 'blocked', needsUser: true, lastActivity: '2026-11-03T10:00:00Z' },
    ...remoteItems([{ id: 'cse_w', name: 'Hooli landing copy 🚀', status: 'Waiting on a human' }]),
    ...Array.from({ length: 7 }, (_, i) => ({ id: `cli-${i}`, kind: 'cli', title: `Session number ${i + 1} on the Globex menu`, state: 'idle', lastActivity: new Date(Date.parse(MONDAY) - (i + 1) * 600_000).toISOString() })),
    { id: 'job-working', kind: 'job', title: 'Initech audit', state: 'working', lastActivity: '2026-11-16T06:00:00Z' },
  ];
  return {
    generatedAt: MONDAY,
    sources: { jobs: 'ok', transcripts: 'ok', desktop: 'ok', worktrees: 'ok', prs: 'ok', specs: 'ok', remote: 'unavailable' },
    sessions,
    worktrees: [
      { id: 'wt:r:worktree-fresh-build', repo: 'r', branch: 'worktree-fresh-build', ahead: 1, lastCommitAt: '2026-11-13T09:00:00Z' },
      { id: 'wt:r:worktree-old-build', repo: 'r', branch: 'worktree-old-build', ahead: 4, lastCommitAt: '2026-10-20T09:00:00Z' },
    ],
    prs: [{ id: 'pr:r#24', repo: 'r', number: 24, title: 'Hooli hours', branch: 'worktree-hooli-hours-build', updatedAt: '2026-11-13T12:00:00Z', reviewRequested: false }],
    specs: Array.from({ length: 8 }, (_, i) => ({ id: `spec:s${i}`, slug: `s${i}`, title: `Spec title ${i + 1}`, bucket: 'buildable', status: 'Ready to Build', mtime: `2026-11-0${i + 1}T00:00:00Z` })),
    tasks: [],
    goals: [],
    plans: [],
    ...extra,
  };
}

test('rollup counts, headline and thread: unique S numbers across classes, top 5 per class, every waiting item listed', () => {
  const r = rollup(busySnapshot(), { now: MONDAY });
  assert.deepEqual(r.counts, { waiting: 2, inFlight: 8, built: 2, planned: 8, stale: 1, plansToApprove: 0 });
  assert.equal(r.headline, 'Waiting on you: 2\nIn flight: 8 · Built: 2 · Plans to approve: 0');
  const lines = r.thread.split('\n');
  assert.equal(lines[0], '*Where is everything*');
  assert.ok(lines.length <= 40, `${lines.length} lines`);
  const numbers = lines.map((l) => /^S(\d+)\. /.exec(l)?.[1]).filter(Boolean).map(Number);
  assert.deepEqual(numbers, Array.from({ length: numbers.length }, (_, i) => i + 1), 'S1..Sn in order, no repeats');
  assert.ok(lines.includes('*Waiting on you (2)*'));
  assert.ok(lines.includes('*In flight (5 of 8)*'));
  assert.ok(lines.includes('*Planned (5 of 8)*'));
  assert.ok(lines.includes('*Stale (1)*'), 'Monday lists Stale');
  assert.match(r.thread, /^S1\. Acme invoice check\. Asks: keep the old footer - or drop it\?$/m);
  assert.match(r.thread, /^S2\. Hooli landing copy\.$/m);
  assert.ok(lines.includes('Cloud sessions: not available in scheduled run'));
  const shown = r.items.map((i) => i.id);
  assert.equal(shown.length, new Set(shown).size, 'no item listed twice');
  assert.deepEqual(r.items[0], { n: 'S1', id: 'job-blocked', class: 'waiting' });
});

test('rollup thread passes lint with no warnings and a ratio of at least 0.80', () => {
  const r = rollup(busySnapshot(), { now: MONDAY });
  const result = lint(r.thread);
  assert.ok(result.ratio >= MIN_RATIO, `ratio ${result.ratio}`);
  assert.deepEqual(result.warnings, []);
});

test('rollup lists Stale only on Mondays and drops the cloud line once remote is ok', () => {
  const tuesday = rollup(busySnapshot({ generatedAt: TUESDAY, sources: { remote: 'ok' } }), { now: TUESDAY });
  assert.doesNotMatch(tuesday.thread, /\*Stale/);
  assert.equal(tuesday.counts.stale, 1, 'still counted');
  assert.doesNotMatch(tuesday.thread, /Cloud sessions/);
});

test('rollup never shows Slack markup or links from untrusted titles', () => {
  const r = rollup(busySnapshot({ sessions: [{ id: 'x', kind: 'job', title: '*bold* <!channel> `code` ~x~', state: 'blocked', needsUser: true }] }), { now: MONDAY });
  const line = r.thread.split('\n').find((l) => l.startsWith('S1.'));
  assert.equal(line, 'S1. bold !channel code x.');
});

test('rollup shows only the first clause of a free-text spec status', () => {
  const r = rollup(busySnapshot({ specs: [{ id: 'spec:x', slug: 'x', title: 'X', bucket: 'buildable', status: 'Planned 2026-10-13, ready to execute in a separate window' }] }), { now: MONDAY });
  assert.match(r.thread, /S\d+\. X\. Spec is planned\. No build branch yet\./);
});

test('a long ask is cut at its last full sentence within 20 words, or at 12 words with an ellipsis', () => {
  const ask = (detail) => rollup(busySnapshot({ sessions: [{ id: 'q', kind: 'job', title: 'Q', detail, state: 'blocked', needsUser: true }] }), { now: MONDAY }).thread.split('\n').find((l) => l.startsWith('S1.'));
  assert.equal(ask('Is the copy final? Then I can publish it to the live site this evening after the review call with Anna.'), 'S1. Q. Asks: Is the copy final?');
  assert.equal(ask('confirm: (1) was the 7th hour real work to add back? (2) should I send it today or wait'), 'S1. Q. Asks: confirm: (1) was the 7th hour real work to add back? (2) should I send it today or wait.');
  assert.equal(ask('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty more'), 'S1. Q. Asks: one two three four five six seven eight nine ten eleven twelve…');
});

test('rollup marks an outdated snapshot', () => {
  assert.equal(rollup(busySnapshot(), { now: MONDAY }).outdated, false);
  assert.equal(rollup(busySnapshot(), { now: '2026-11-16T11:00:00Z' }).outdated, true);
});

test('rollup puts a failed build job under Waiting with "Check it" and omits a missing result date', () => {
  const r = rollup(busySnapshot({
    sessions: [
      { id: 'triage-job:f', kind: 'job', title: 'Fix the footer', state: 'failed', result: { status: 'failed', at: '2026-11-13T14:00:00Z' }, lastActivity: '2026-11-13T14:00:00Z' },
      { id: 'triage-job:d', kind: 'job', title: 'Fix the menu', state: 'failed', result: { status: 'failed', at: null }, lastActivity: '2026-11-13T13:00:00Z' },
      { id: 'triage-job:p', kind: 'job', title: 'Add alt text', state: 'done', result: { status: 'passed', at: null }, lastActivity: '2026-11-13T13:00:00Z' },
    ],
  }), { now: MONDAY });
  assert.match(r.thread, /S\d+\. Fix the footer\. Build job failed on 2026-11-13\. Check it\./);
  assert.match(r.thread, /S\d+\. Fix the menu\. Build job failed\. Check it\./);
  assert.match(r.thread, /S\d+\. Add alt text\. Build job passed\./);
  assert.doesNotMatch(r.thread, /1970/);
  assert.equal(r.counts.waiting, 2);
});
