// Guards the triage working-day maths: NL public holidays 2026-2027, weekend skipping and the Europe/Amsterdam day of an ISO instant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWorkingDay,
  addWorkingDays,
  workingDaysBetween,
  amsterdamDate,
  NL_HOLIDAYS,
} from '../../tools/triage/lib/workdays.js';

test('weekdays are working days, weekends are not', () => {
  assert.equal(isWorkingDay('2026-11-11'), true);
  assert.equal(isWorkingDay('2026-11-13'), true);
  assert.equal(isWorkingDay('2026-11-14'), false);
  assert.equal(isWorkingDay('2026-11-15'), false);
});

test('every NL public holiday in 2026 and 2027 is not a working day', () => {
  const expected = [
    '2026-01-01', '2026-04-03', '2026-04-05', '2026-04-06', '2026-04-27', '2026-05-05',
    '2026-05-14', '2026-05-24', '2026-05-25', '2026-12-25', '2026-12-26',
    '2027-01-01', '2027-03-26', '2027-03-28', '2027-03-29', '2027-04-27', '2027-05-05',
    '2027-05-06', '2027-05-16', '2027-05-17', '2027-12-25', '2027-12-26',
  ];
  assert.deepEqual([...NL_HOLIDAYS.keys()].sort(), expected.sort());
  for (const day of expected) assert.equal(isWorkingDay(day), false, day);
});

test('Koningsdag 2026 falls on Monday 27 April and is skipped', () => {
  assert.equal(new Date('2026-04-27T00:00:00Z').getUTCDay(), 1);
  assert.equal(isWorkingDay('2026-04-27'), false);
  assert.equal(addWorkingDays('2026-04-24', 1), '2026-04-28');
});

test('addWorkingDays skips weekends and holidays and handles zero and negative steps', () => {
  assert.equal(addWorkingDays('2026-11-11', 0), '2026-11-11');
  assert.equal(addWorkingDays('2026-11-13', 1), '2026-11-16');
  assert.equal(addWorkingDays('2026-12-24', 1), '2026-12-28');
  assert.equal(addWorkingDays('2026-11-16', -1), '2026-11-13');
  assert.equal(addWorkingDays('2026-12-23', 2), '2026-12-28');
});

test('workingDaysBetween counts working days after a up to and including b', () => {
  assert.equal(workingDaysBetween('2026-11-11', '2026-11-11'), 0);
  assert.equal(workingDaysBetween('2026-11-06', '2026-11-11'), 3);
  assert.equal(workingDaysBetween('2026-11-09', '2026-11-11'), 2);
  assert.equal(workingDaysBetween('2026-11-07', '2026-11-09'), 1);
  assert.equal(workingDaysBetween('2026-11-11', '2026-11-06'), -3);
});

test('2-working-day age across Christmas counts the holidays out', () => {
  assert.equal(workingDaysBetween('2026-12-23', '2026-12-28'), 2);
  assert.equal(workingDaysBetween('2026-12-22', '2026-12-28'), 3);
});

test('ISO instants resolve to the Europe/Amsterdam calendar day', () => {
  assert.equal(amsterdamDate('2026-11-05T23:30:00Z'), '2026-11-06');
  assert.equal(amsterdamDate('2026-11-11T07:00:00Z'), '2026-11-11');
  assert.equal(amsterdamDate('2026-07-01T22:30:00Z'), '2026-07-02');
  assert.equal(amsterdamDate(new Date('2026-11-05T23:30:00Z')), '2026-11-06');
  assert.equal(amsterdamDate('2026-11-05'), '2026-11-05');
  assert.equal(workingDaysBetween('2026-11-05T23:30:00Z', '2026-11-11T07:00:00Z'), 3);
});

test('invalid dates throw', () => {
  assert.throws(() => isWorkingDay('not a date'), /invalid date/);
});

test('workingDaysBetween never returns -0', () => {
  assert.ok(Object.is(workingDaysBetween('2026-11-14', '2026-11-13'), 0));
  assert.ok(Object.is(workingDaysBetween('2026-11-15', '2026-11-14'), 0));
});
