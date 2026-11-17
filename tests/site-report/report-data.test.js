// Tests for statuses, progress bars, phase rows, the next-month task pick, toggle titles and "No data".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  progressBar,
  goalStatus,
  pickNextTasks,
  escapeToggleTitle,
  targetText,
  escapeToggleTitles,
  renderTaskToggle,
  figureText,
  loadMetrics,
  buildReportData,
  addMonths,
  monthName,
} from '../../tools/site-report/report-data.js';
import { readGoalsFile } from '../../tools/site-report/schema.js';
import { FIXTURES } from './helpers.js';

const phase = (start) => ({ id: 0, name: 'Measure', start });
const numeric = {
  id: 1,
  phase: 0,
  metric: 'm',
  baseline: 100,
  target: 200,
  due: '2027-09',
  direction: 'up',
};
const ctx = (month, figures, history = {}, start = '2026-09') => ({
  phase: phase(start),
  month,
  figures,
  history,
});

test('months: add, name', () => {
  assert.equal(addMonths('2026-11', 2), '2027-01');
  assert.equal(addMonths('2026-01', -2), '2025-11');
  assert.equal(monthName('2026-12'), 'December');
});

test('status: on track when the figure meets the expected line', () => {
  const s = goalStatus(numeric, ctx('2026-11', { m: { value: 120 } }, { m: { '2026-10': 110, '2026-11': 120 } }));
  assert.equal(s.label, '● On track');
  assert.equal(s.color, 'green');
});

test('status: behind when the figure is under the expected line', () => {
  const s = goalStatus(numeric, ctx('2026-11', { m: { value: 110 } }, { m: { '2026-10': 105, '2026-11': 110 } }));
  assert.equal(s.label, '● Behind');
  assert.equal(s.color, 'orange');
});

test('status: expected line is baseline plus the share of the way to due', () => {
  const at = (value) =>
    goalStatus(numeric, ctx('2026-11', { m: { value } }, { m: { '2026-10': 100, '2026-11': value } })).label;
  assert.equal(at(116), '● Behind');
  assert.equal(at(117), '● On track');
});

test('status: in the first month of its phase, a goal still at its baseline is a starting point', () => {
  const s = goalStatus(numeric, ctx('2026-11', { m: { value: 100 } }, { m: { '2026-10': 100, '2026-11': 100 } }, '2026-11'));
  assert.equal(s.label, '○ Starting point set');
  const moved = goalStatus(numeric, ctx('2026-11', { m: { value: 120 } }, {}, '2026-11'));
  assert.equal(moved.label, '● On track');
});

test('status: a figure that must fall is on track when it is at or under the line', () => {
  const down = { ...numeric, baseline: 25, target: 10, direction: 'down' };
  const at = (value) =>
    goalStatus(down, ctx('2026-11', { m: { value } }, { m: { '2026-10': 25, '2026-11': value } })).label;
  assert.equal(at(22), '● On track');
  assert.equal(at(24), '● Behind');
});

test('status: starts later when the phase has not started', () => {
  const s = goalStatus(numeric, ctx('2026-11', { m: { value: 120 } }, {}, '2026-12'));
  assert.equal(s.label, '○ Starts December');
  assert.equal(s.color, 'gray');
});

test('status: starting point set on the first figure when there is no baseline', () => {
  const g = { ...numeric, baseline: null };
  const s = goalStatus(g, ctx('2026-11', { m: { value: 12 } }, { m: { '2026-11': 12 } }));
  assert.equal(s.label, '○ Starting point set');
  assert.equal(s.color, 'gray');
});

test('status: no data when the figure is null', () => {
  const s = goalStatus(numeric, ctx('2026-11', { m: null }));
  assert.equal(s.label, '○ No data');
  assert.equal(s.color, 'gray');
  assert.equal(goalStatus(numeric, ctx('2026-11', {})).label, '○ No data');
});

test('status: higher than last year compares with the same month last year', () => {
  const yoy = { ...numeric, baseline: null, target: 'Higher than last year' };
  const up = goalStatus(yoy, ctx('2026-11', { m: { value: 48 } }, { m: { '2025-11': 36, '2026-11': 48 } }));
  assert.equal(up.label, '● On track');
  const down = goalStatus(yoy, ctx('2026-11', { m: { value: 30 } }, { m: { '2025-11': 36, '2026-11': 30 } }));
  assert.equal(down.label, '● Behind');
});

test('status: a goal that sums several metrics reads each one', () => {
  const sum = { ...numeric, baseline: null, target: 'Higher than last year', metric: ['a', 'b'] };
  const figures = { a: { value: 20 }, b: { value: 10 } };
  const history = { a: { '2025-11': 10, '2026-11': 20 }, b: { '2025-11': 10, '2026-11': 10 } };
  assert.equal(goalStatus(sum, ctx('2026-11', figures, history)).label, '● On track');
  const partial = { a: { value: 20 }, b: null };
  assert.equal(goalStatus(sum, ctx('2026-11', partial, history)).label, '○ No data');
});

test('status: a text target with no rule gives a neutral label, never a guess', () => {
  const text = { ...numeric, target: 'Every review within 48 hours', baseline: { answered: 1 } };
  const s = goalStatus(text, ctx('2026-11', { m: { value: 5 } }, { m: { '2026-10': 4, '2026-11': 5 } }));
  assert.equal(s.color, 'gray');
  assert.doesNotMatch(s.label, /On track|Behind/);
});

test('progress bar: 3 of 7 is four of ten', () => {
  assert.equal(progressBar(3, 7), '████░░░░░░');
});

test('progress bar: empty, full and zero total', () => {
  assert.equal(progressBar(0, 12), '░░░░░░░░░░');
  assert.equal(progressBar(7, 7), '██████████');
  assert.equal(progressBar(0, 0), '░░░░░░░░░░');
  assert.equal([...progressBar(5, 9)].length, 10);
});

const task = (id, phaseId, impact, blocks = [], done = false) => ({
  id,
  phase: phaseId,
  goals: [1],
  blocks,
  impact,
  done,
  name: `Task ${id}`,
});
const phases = [
  { id: 0, name: 'A', start: '2026-11' },
  { id: 1, name: 'B', start: '2026-12' },
  { id: 2, name: 'C', start: '2026-12' },
  { id: 3, name: 'D', start: '2027-06' },
];

test('next month: tasks that unblock the most tasks come first', () => {
  const tasks = [
    task('a', 1, 'low', ['x']),
    task('b', 2, 'low', ['x', 'y', 'z']),
    task('c', 0, 'high'),
    task('x', 1, 'high'),
    task('y', 1, 'high'),
    task('z', 1, 'high'),
  ];
  const ids = pickNextTasks(tasks, { phases, month: '2026-12', limit: 2 }).map((t) => t.id);
  assert.deepEqual(ids, ['a', 'b']);
});

test('next month: blockers first, then impact, ties to the earlier phase, then phase order, max 5', () => {
  const tasks = [
    task('blocker', 2, 'low', ['m1', 'm2']),
    task('m1', 2, 'medium'),
    task('m2', 1, 'medium'),
    task('h2', 2, 'high'),
    task('h1', 1, 'high'),
    task('l0', 0, 'low'),
    task('h0', 0, 'high'),
    task('done', 0, 'high', ['h0'], true),
    task('late', 3, 'high'),
  ];
  const picked = pickNextTasks(tasks, { phases, month: '2026-12' });
  assert.equal(picked.length, 5);
  assert.deepEqual(picked.map((t) => t.id), ['h0', 'm2', 'h1', 'blocker', 'h2']);
});

test('next month: the pick is shown in phase order and skips phases that start later', () => {
  const tasks = [task('p2', 2, 'high'), task('p0', 0, 'high'), task('p1', 1, 'high'), task('p3', 3, 'high')];
  const picked = pickNextTasks(tasks, { phases, month: '2026-12' });
  assert.deepEqual(picked.map((t) => t.id), ['p0', 'p1', 'p2']);
});

test('next month: task ids match whether written as numbers or strings', () => {
  const tasks = [task(3, 1, 'low'), task('blocker', 1, 'low', ['3']), task('other', 1, 'high')];
  const picked = pickNextTasks(tasks, { phases, month: '2026-12', limit: 1 }).map((t) => t.id);
  assert.deepEqual(picked, ['blocker']);
});

test('next month: a blocker counts only the tasks it still blocks', () => {
  const tasks = [task('open', 1, 'low', ['gone']), task('gone', 1, 'low', [], true), task('big', 2, 'low', ['p'])];
  tasks.push(task('p', 2, 'low'));
  const picked = pickNextTasks(tasks, { phases, month: '2026-12', limit: 1 }).map((t) => t.id);
  assert.deepEqual(picked, ['big']);
});

test('title escape: a numbered toggle title gets its dot escaped', () => {
  assert.equal(escapeToggleTitle('1. Fix the sitemap'), '1\\. Fix the sitemap');
  assert.equal(escapeToggleTitle('12. Fix'), '12\\. Fix');
  assert.equal(escapeToggleTitle('Fix the sitemap'), 'Fix the sitemap');
  assert.equal(escapeToggleTitle('1\\. Already done'), '1\\. Already done');
});

test('title escape: only inside toggle titles, never lists or toggle bodies', () => {
  const md = [
    '1. Outside list item',
    '',
    '<toggle heading="h3">',
    '1. Fix the sitemap',
    '',
    '1. A body list item',
    '2. Another',
    '</toggle>',
    '',
    '<toggle heading="h3">',
    'No number here',
    '</toggle>',
  ].join('\n');
  const out = escapeToggleTitles(md).split('\n');
  assert.equal(out[0], '1. Outside list item');
  assert.equal(out[3], '1\\. Fix the sitemap');
  assert.equal(out[5], '1. A body list item');
  assert.equal(out[6], '2. Another');
  assert.equal(out[10], 'No number here');
});

test('task toggle: every field is there, the title is escaped and no time estimate appears', () => {
  const t = {
    id: 'F2',
    phase: 0,
    goals: [1],
    blocks: ['S2'],
    impact: 'high',
    done: false,
    name: 'Connect Search Console',
    detail: {
      work: ['Add the agency as a user.', 'Save the figures.'],
      needs: 'the invite',
      doneWhen: 'the report reads the data',
      unknown: 'the site may have two properties',
    },
  };
  const s2 = { id: 'S2', phase: 1, goals: [1], blocks: [], impact: 'low', done: false, name: 'Next one' };
  const z = { id: 'Z', phase: 0, goals: [1], blocks: [], impact: 'low', done: false, name: 'First one' };
  const picked = [z, t, s2];
  const out = renderTaskToggle(t, { n: 2, clientName: 'the client', picked, tasks: picked });
  assert.match(out, /^<toggle heading="h3">\n2\\\. Connect Search Console/);
  for (const label of ['<b>Work</b>', '<b>Needs from the client:</b>', '<b>Depends on:</b>', '<b>Done when:</b>', '<b>Unknown:</b>']) {
    assert.ok(out.includes(label), label);
  }
  assert.match(out, /1\. Add the agency as a user\./);
  assert.match(out, /<b>Depends on:<\/b> nothing\. Task 3 waits on this one\./);
  assert.doesNotMatch(out, /\b\d+\s*(hours?|hrs?|days?)\b|man-?days?/i);
  assert.match(out, /<\/toggle>$/);
  const later = renderTaskToggle(s2, { n: 3, clientName: 'the client', picked, tasks: picked });
  assert.match(later, /<b>Depends on:<\/b> task 2 \(Connect Search Console\)\./);
  assert.ok(later.includes('[to write]'), 'a task with no detail shows the placeholder the word gate rejects');
});

test('task toggle: waiting tasks are named, with their month only when their phase starts later', () => {
  const phases = [{ id: 0, start: '2026-11' }, { id: 1, start: '2026-11' }, { id: 2, start: '2026-12' }];
  const a = { id: 'A', phase: 0, goals: [1], blocks: ['B', 'N', 'L'], impact: 'high', done: false, name: 'First' };
  const b = { id: 'B', phase: 0, goals: [1], blocks: [], impact: 'low', done: false, name: 'Second' };
  const now = { id: 'N', phase: 1, goals: [1], blocks: [], impact: 'low', done: false, name: 'Set up the review flow' };
  const later = { id: 'L', phase: 2, goals: [1], blocks: [], impact: 'low', done: false, name: 'Write the takeaway page' };
  const out = renderTaskToggle(a, { n: 1, picked: [a, b], tasks: [a, b, now, later], phases, month: '2026-11' });
  assert.match(out, /Task 2, "Set up the review flow" and "Write the takeaway page" \(December\) wait on this one\./);
  const one = renderTaskToggle({ ...a, blocks: ['L'] }, { n: 1, picked: [a], tasks: [a, later], phases, month: '2026-11' });
  assert.match(one, /"Write the takeaway page" \(December\) waits on this one\./);
});

test('target text: a null target shows its targetNote before the generic fallback', () => {
  assert.equal(targetText({ target: null, targetNote: 'Set after month 3' }), 'Set after month 3');
  assert.equal(targetText({ target: null }), 'Set from first month');
});

test('"No data": a missing figure reads No data and never carries a dagger', () => {
  const g = { id: 1, metric: 'm', target: 10 };
  for (const sample of [false, true]) {
    assert.equal(figureText(g, { figures: { m: null }, history: {}, sample, month: '2026-11' }), 'No data');
    assert.equal(figureText(g, { figures: {}, history: {}, sample, month: '2026-11' }), 'No data');
  }
});

test('dagger: only a sample figure carries it, and a figure marked real does not', () => {
  const g = { id: 1, metric: 'm', target: 10 };
  const fig = (extra = {}) => ({ m: { value: 41, ...extra } });
  assert.equal(figureText(g, { figures: fig(), history: {}, sample: false, month: '2026-11' }), '41');
  assert.equal(figureText(g, { figures: fig(), history: {}, sample: true, month: '2026-11' }), '41 †');
  assert.equal(figureText(g, { figures: fig({ sample: false }), history: {}, sample: true, month: '2026-11' }), '41');
});

test('figure text: a goal compared with last year shows both figures', () => {
  const g = { id: 1, metric: 'm', target: 'Higher than last year' };
  const text = figureText(g, {
    figures: { m: { value: 412 } },
    history: { m: { '2025-11': 381, '2026-11': 412 } },
    sample: true,
    month: '2026-11',
  });
  assert.equal(text, '412 against 381 †');
});

test('real mode over the small fixture: no dagger anywhere and No data where the source is missing', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  assert.doesNotMatch(JSON.stringify(report), /†/);
  const row = report.goalRows.find((r) => r.id === 5);
  assert.equal(row.figure, 'No data');
  assert.equal(row.status.label, '○ No data');
});

test('small fixture statuses cover on track, behind, starts later, starting point and no data', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  const label = (id) => report.goalRows.find((r) => r.id === id).status.label;
  assert.equal(label(1), '● On track');
  assert.equal(label(2), '● Behind');
  assert.equal(label(3), '● On track');
  assert.equal(label(4), '○ Starting point set');
  assert.equal(label(5), '○ No data');
  assert.equal(label(6), '○ Starts January');
});

test('phase rows: bars, task counts, goals on track, and the headline row', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  const [p0, p1, , p3] = report.phaseRows;
  assert.equal(p0.tasks, '2 of 3');
  assert.equal(p0.bar, progressBar(2, 3));
  assert.equal(p0.goalsOnTrack, '1 of 1');
  assert.equal(p1.tasks, '1 of 4');
  assert.equal(p1.bar, '███░░░░░░░');
  assert.equal(p3.status.label, '○ Starts January');
  assert.equal(report.headline.goalId, 1);
  assert.match(report.headline.change, /\+33%/);
});

test('report data picks next month tasks from the plan, at most 5, in phase order', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  assert.equal(report.nextTasks.length, 5);
  const phasesInOrder = report.nextTasks.map((t) => t.phase);
  assert.deepEqual(phasesInOrder, [...phasesInOrder].sort((a, b) => a - b));
  assert.equal(report.nextTasks[0].id, 'F2');
});

test('sample mode reads only the sample file, and marks sample figures', () => {
  const dir = join(FIXTURES, 'small');
  const metrics = loadMetrics(dir, { month: '2026-11', sample: true });
  assert.deepEqual(metrics.figures, {});
});

const quarter = { ...numeric, baseline: null, target: 'Higher each quarter', due: '2027-09' };

test('status: a null baseline with no figure gives No data', () => {
  const s = goalStatus({ ...numeric, baseline: null }, ctx('2026-11', { m: null }));
  assert.equal(s.label, '○ No data');
  assert.equal(s.color, 'gray');
});

test('status: a text target compares with the previous quarter', () => {
  const history = { m: { '2026-08': 10, '2026-09': 11, '2026-10': 12, '2026-11': 15 } };
  assert.equal(goalStatus(quarter, ctx('2026-11', { m: { value: 15 } }, history)).label, '● On track');
  const lower = { m: { '2026-08': 20, '2026-10': 12, '2026-11': 15 } };
  assert.equal(goalStatus(quarter, ctx('2026-11', { m: { value: 15 } }, lower)).label, '● Behind');
  const down = { ...quarter, direction: 'down' };
  assert.equal(goalStatus(down, ctx('2026-11', { m: { value: 15 } }, lower)).label, '● On track');
  assert.equal(goalStatus(quarter, ctx('2026-11', { m: { value: 20 } }, { m: { '2026-08': 20 } })).label, '● On track');
});

test('status: "each quarter, then same month last year" uses the quarter until a last-year figure exists', () => {
  const mixed = { ...quarter, target: 'Higher each quarter, then higher than the same month last year from October 2027' };
  const history = { m: { '2026-08': 20, '2026-10': 12, '2026-11': 15 } };
  assert.equal(goalStatus(mixed, ctx('2026-11', { m: { value: 15 } }, history)).label, '● Behind');
  const withLastYear = { m: { ...history.m, '2025-11': 10 } };
  assert.equal(goalStatus(mixed, ctx('2026-11', { m: { value: 15 } }, withLastYear)).label, '● On track');
});

test('status: a text target with no figure from the previous quarter is a starting point', () => {
  const none = goalStatus(quarter, ctx('2026-11', { m: { value: 15 } }, { m: { '2026-10': 12, '2026-11': 15 } }));
  assert.equal(none.label, '○ Starting point set');
  assert.equal(goalStatus(quarter, ctx('2026-11', { m: { value: 15 } }, {})).label, '○ Starting point set');
  assert.equal(goalStatus(quarter, ctx('2026-11', { m: null })).label, '○ No data');
});

const object = { ...numeric, baseline: { total: 50, average: 4.2 }, target: 80, statusKey: 'total' };

test('status: an object goal takes its status from the one named key', () => {
  const figures = (total, average) => ({ m: { value: { total, average } } });
  const history = { m: { '2026-10': { total: 60, average: 4.5 } } };
  assert.equal(goalStatus(object, ctx('2026-11', figures(60, 3.0), history)).label, '● On track');
  assert.equal(goalStatus(object, ctx('2026-11', figures(52, 4.9), history)).label, '● Behind');
});

test('status: an object goal with a text target compares the named key with the previous quarter', () => {
  const goal = { ...object, target: 'Higher each quarter' };
  const history = { m: { '2026-08': { total: 40, average: 4.9 }, '2026-11': { total: 55, average: 3.0 } } };
  assert.equal(goalStatus(goal, ctx('2026-11', { m: { value: { total: 55, average: 3.0 } } }, history)).label, '● On track');
});

test('status: an object value with no named key stays neutral, never a guess', () => {
  const { statusKey, ...bare } = object;
  const s = goalStatus(bare, ctx('2026-11', { m: { value: { total: 55, average: 3.0 } } }, { m: { '2026-10': { total: 50, average: 3 } } }));
  assert.equal(s.label, '○ Not scored yet');
});

test('status: the phase rule still wins for object goals', () => {
  assert.equal(goalStatus(object, ctx('2026-11', { m: { value: { total: 55, average: 3 } } }, {}, '2027-01')).label, '○ Starts January');
});
