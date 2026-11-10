// Guards the D4 bucket rules and Priority-only proposals against the shared fixture and hand-built weekend and holiday cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bucketTasks, DEFAULT_RULES } from '../../tools/triage/lib/buckets.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/tasks.json', import.meta.url), 'utf8'));
const NOW = '2026-11-11T07:00:00Z';

const ids = (items) => items.map((i) => i.id);
const reasonOf = (items, id) => items.find((i) => i.id === id)?.reason;

function task(over) {
  return {
    id: 'x', name: 'Task', status: 'To Do', priority: null, due: null, doer: 'User',
    tags: [], blockedReason: null, hours: null, clients: [], url: null, ...over,
  };
}

test('D4 matrix on the shared fixture', () => {
  const r = bucketTasks(fixture.tasks, fixture.threads, NOW);
  assert.deepEqual(ids(r.now), ['th-newbiz', 't-blocked', 'th-question', 't-overdue', 'th-old']);
  assert.deepEqual(ids(r.today), ['t-quick-due-today', 't-due-today', 't-due-tomorrow', 't-p0']);
  assert.deepEqual(ids(r.week), ['t-weekend', 't-p3-week', 't-p1-nodue']);
});

test('due today and due tomorrow land in TODAY', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  assert.equal(reasonOf(r.today, 't-due-today'), 'due-today');
  assert.equal(reasonOf(r.today, 't-due-tomorrow'), 'due-tomorrow');
});

test('P0 with the Quick tag is excluded from TODAY and omitted', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  const all = [...r.now, ...r.today, ...r.week];
  assert.equal(all.some((i) => i.id === 't-p0-quick'), false);
  assert.equal(reasonOf(r.today, 't-p0'), 'p0');
});

test('Quick tag does not hide a task that is due today', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  assert.equal(reasonOf(r.today, 't-quick-due-today'), 'due-today');
});

test('P1 with no due date lands in THIS WEEK', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  assert.equal(reasonOf(r.week, 't-p1-nodue'), 'p1');
});

test('overdue and blocked-on-Will tasks land in NOW', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  assert.equal(reasonOf(r.now, 't-overdue'), 'overdue');
  assert.equal(reasonOf(r.now, 't-blocked'), 'blocked-on-will');
});

test('a blocked reason naming Will on an External task is not blocked on Will', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  const all = [...r.now, ...r.today, ...r.week];
  assert.equal(all.some((i) => i.id === 't-blocked-external'), false);
});

test('P2 due in 10 days and Done tasks are omitted', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  const all = ids([...r.now, ...r.today, ...r.week]);
  assert.equal(all.includes('t-p2-10days'), false);
  assert.equal(all.includes('t-done'), false);
  assert.equal(r.proposals.some((p) => p.pageId === 't-done'), false);
});

test('new business threads come first in NOW', () => {
  const r = bucketTasks(fixture.tasks, fixture.threads, NOW);
  assert.equal(r.now[0].id, 'th-newbiz');
  assert.equal(r.now[0].reason, 'new-business');
  assert.equal(r.now[0].kind, 'thread');
});

test('a reply older than 2 working days is NOW; the weekend does not count', () => {
  const r = bucketTasks([], fixture.threads, NOW);
  const old = r.now.find((i) => i.id === 'th-old');
  assert.equal(old.reason, 'reply-age');
  assert.equal(old.ageWorkingDays, 3);
  assert.equal(r.now.some((i) => i.id === 'th-weekend'), false);
});

test('Christmas holidays do not count towards reply age', () => {
  const threads = [
    { threadId: 'xmas', from: 'A <a@x.example>', subject: 'S', lastMessageAt: '2026-12-23T10:00:00Z', newBusiness: false, directQuestion: false },
  ];
  assert.equal(bucketTasks([], threads, '2026-12-28T08:00:00Z').now.length, 0);
  assert.equal(bucketTasks([], threads, '2026-12-29T08:00:00Z').now.length, 1);
});

test('direct question threads are blocked on Will', () => {
  const r = bucketTasks([], fixture.threads, NOW);
  assert.equal(reasonOf(r.now, 'th-question'), 'blocked-on-will');
});

test('proposals are Priority-only with before and after', () => {
  const r = bucketTasks(fixture.tasks, fixture.threads, NOW);
  assert.deepEqual(
    r.proposals.map((p) => [p.pageId, p.from, p.to, p.reason]),
    [
      ['t-overdue', 'P2', 'P0', 'overdue'],
      ['t-due-today', 'P2', 'P0', 'due-soon'],
      ['t-due-tomorrow', 'P1', 'P0', 'due-soon'],
      ['t-weekend', 'P2', 'P0', 'due-soon'],
      ['t-blocked', 'P1', 'P0', 'blocked-on-will'],
      ['t-p3-week', 'P3', 'P1', 'due-week'],
    ],
  );
  for (const p of r.proposals) {
    assert.deepEqual(Object.keys(p).sort(), ['due', 'from', 'name', 'pageId', 'reason', 'to']);
  }
});

test('Quick-tagged tasks never get proposals', () => {
  const r = bucketTasks(fixture.tasks, [], NOW);
  assert.equal(r.proposals.some((p) => p.pageId.includes('quick')), false);
});

test('due within 2 working days over a weekend proposes P0, 3 working days does not', () => {
  const tasks = [
    task({ id: 'mon', priority: 'P2', due: '2026-11-16' }),
    task({ id: 'tue', priority: 'P2', due: '2026-11-17' }),
  ];
  const r = bucketTasks(tasks, [], '2026-11-12T08:00:00Z');
  assert.deepEqual(r.proposals.map((p) => [p.pageId, p.to]), [['mon', 'P0'], ['tue', 'P1']]);
});

test('due over Christmas counts working days for the P0 proposal', () => {
  const tasks = [task({ id: 'x', priority: 'P3', due: '2026-12-28' })];
  assert.equal(bucketTasks(tasks, [], '2026-12-23T08:00:00Z').proposals[0].to, 'P0');
  assert.equal(bucketTasks(tasks, [], '2026-12-22T08:00:00Z').proposals[0].to, 'P1');
});

test('rules override the D4 defaults', () => {
  assert.equal(DEFAULT_RULES.replyAgeWorkingDays, 2);
  const threads = [{ threadId: 'w', from: 'A', subject: 'S', lastMessageAt: '2026-11-09T08:00:00Z' }];
  assert.equal(bucketTasks([], threads, NOW, { replyAgeWorkingDays: 1 }).now.length, 1);
  const tasks = [task({ id: 'p2', priority: 'P2', due: '2026-11-21' })];
  assert.equal(bucketTasks(tasks, [], NOW, { weekDueDays: 10 }).week.length, 1);
});

test('the morning run in Amsterdam uses the local date, not UTC', () => {
  const tasks = [task({ id: 'd', priority: 'P3', due: '2026-11-12' })];
  assert.equal(bucketTasks(tasks, [], '2026-11-11T23:30:00Z').today[0].reason, 'due-today');
});
