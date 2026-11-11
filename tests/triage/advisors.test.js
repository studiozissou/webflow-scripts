// Guards the P7 Node advisors (logistics, relationship, auditor), V numbering with at most 3 lines per advisor that pass ste-lint, the scores ledger and verdict() keep/drop/no-data thresholds. Fixtures are fake.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logistics, relationship, auditor, numberLines, verdict, appendScores, readScores, isFirstWorkingDayOfMonth, MAX_LINES } from '../../tools/triage/lib/advisors.js';
import { lint } from '../../tools/triage/lib/ste-lint.js';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'triage-advisors-'));
  dirs.push(d);
  return d;
};

const NOW = '2026-11-11T07:00:00Z';
const snapshot = {
  tasks: [
    { id: 'a', name: 'Send Carsa invoice', status: 'To do', due: '2026-11-12' },
    { id: 'b', name: 'Fix RHP dial', status: 'In progress', due: '2026-11-13' },
    { id: 'c', name: 'Old done', status: 'Done', due: '2026-11-12' },
    { id: 'd', name: 'Next week', status: 'To do', due: '2026-11-18' },
  ],
  sessions: [{ id: 'triage-job:x', kind: 'job', source: 'triage-jobs', state: 'working' }, { id: 'j2', kind: 'job', state: 'working' }],
  contacts: [
    { name: 'Anna (Carsa)', lastContact: '2026-10-20' },
    { name: 'Bob', lastContact: '2026-11-05' },
    { name: 'Cleo', lastContact: '2026-10-01' },
  ],
};

test('logistics lists open deadlines this week, free job slots and quota', () => {
  const lines = logistics(snapshot, { now: NOW, usage5h: '66 1794413400', cap: 3 });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^2 tasks are due this week\. First: Send Carsa invoice on 2026-11-12\.$/);
  assert.equal(lines[1], '2 of 3 job slots are free.');
  assert.equal(lines[2], 'Quota use is 66% of the 5-hour limit.');
  assert.deepEqual(logistics({ tasks: [] }, { now: NOW, usage5h: 'garbage' }), ['No tasks are due this week.', '3 of 3 job slots are free.']);
});

test('relationship names people with no contact for 14 days or more, oldest first, max 3', () => {
  assert.deepEqual(relationship(snapshot, { now: NOW }), ['No contact with Cleo for 41 days.', 'No contact with Anna (Carsa) for 22 days.']);
  assert.deepEqual(relationship({}, { now: NOW }), []);
  const many = { contacts: ['A', 'B', 'C', 'D'].map((name) => ({ name, lastContact: '2026-09-01' })) };
  assert.equal(relationship(many, { now: NOW }).length, MAX_LINES);
});

test('auditor speaks only on the first working day of the month', () => {
  const logs = { denied: ['Bash(rm *)', 'WebFetch'], failedJobs: ['p1'], overridden: [] };
  assert.equal(isFirstWorkingDayOfMonth('2026-12-01T07:00:00Z'), true);
  assert.equal(isFirstWorkingDayOfMonth('2026-11-02T07:00:00Z'), true);
  assert.equal(isFirstWorkingDayOfMonth(NOW), false);
  assert.deepEqual(auditor(logs, { now: NOW }), []);
  assert.deepEqual(auditor(logs, { now: '2026-12-01T07:00:00Z' }), ['2 tool calls were denied last month.', '1 job failed last month.', 'No approvals were overridden.']);
});

test('numberLines gives V labels, max 3 per advisor, and every line passes lint', () => {
  const v = numberLines({ logistics: ['a.', 'b.', 'c.', 'd.'], relationship: ['No contact with Cleo for 41 days.'], auditor: [] });
  assert.deepEqual(v.map((l) => l.n), ['V1', 'V2', 'V3', 'V4']);
  assert.equal(v[3].advisor, 'relationship');
  assert.equal(v[3].line, 'V4. No contact with Cleo for 41 days.');
  const real = numberLines({ logistics: logistics(snapshot, { now: NOW, usage5h: '66 1' }), relationship: relationship(snapshot, { now: NOW }) });
  const { ok, warnings } = lint(real.map((l) => l.line).join('\n'));
  assert.ok(ok, JSON.stringify(warnings));
});

const rows = (advisor, ups, downs) => [
  ...Array.from({ length: ups }, (_, i) => ({ advisor, line: `${advisor}-up-${i}`, reaction: '+1', date: '2026-11-02' })),
  ...Array.from({ length: downs }, (_, i) => ({ advisor, line: `${advisor}-down-${i}`, reaction: '-1', date: '2026-11-03' })),
];

test('verdict keeps 3 of 5, drops 2 of 5 and has no data at 3 rated lines after 10 working days', () => {
  const scores = [...rows('logistics', 3, 2), ...rows('relationship', 2, 3), ...rows('auditor', 2, 1)];
  const v = verdict(scores, { now: '2026-11-16T07:00:00Z', startDate: '2026-11-02' });
  assert.deepEqual(Object.fromEntries(v.verdicts.map((x) => [x.advisor, x.verdict])), { auditor: 'no data', logistics: 'keep', relationship: 'drop' });
  assert.equal(v.ready, true);
});

test('verdict waits until 10 working days have passed', () => {
  const v = verdict(rows('logistics', 3, 2), { now: '2026-11-11T07:00:00Z', startDate: '2026-11-02' });
  assert.equal(v.ready, false);
  assert.deepEqual(v.verdicts, []);
});

test('appendScores dedupes by advisor, line and date; readScores skips bad lines', () => {
  const dir = tmp();
  appendScores(dir, rows('logistics', 2, 0));
  appendScores(dir, [...rows('logistics', 2, 0), { advisor: 'logistics', line: 'x', reaction: 'bogus', date: '2026-11-02' }]);
  assert.equal(readScores(dir).length, 2);
  mkdirSync(join(dir, 'advisors'), { recursive: true });
  writeFileSync(join(dir, 'advisors', 'scores.jsonl'), 'nope\n', { flag: 'a' });
  assert.equal(readScores(dir).length, 2);
});
