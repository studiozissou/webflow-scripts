// Tests for the goals.json schema and the profile defaults.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateGoals, PROFILE_DEFAULTS, readGoalsFile } from '../../tools/site-report/schema.js';
import { FIXTURES } from './helpers.js';

const goal = (id, extra = {}) => ({
  id,
  name: `Goal ${id}`,
  owner: 'will',
  phase: 0,
  source: 'Google profile',
  baseline: 10,
  target: 20,
  due: '2027-09',
  direction: 'up',
  ...extra,
});

const base = (extra = {}) => ({
  agreed: false,
  realisticGoal: 'More enquiries than last year.',
  planStart: '2026-09',
  goals: [goal(1, { headline: true })],
  tasks: [],
  ...extra,
});

const many = (n) => Array.from({ length: n }, (_, i) => goal(i + 1));

test('the small fixture and the multi-location fixture validate', () => {
  for (const name of ['small', 'multi']) {
    const result = readGoalsFile(join(FIXTURES, name, 'goals.json'));
    assert.deepEqual(result.errors, [], name);
    assert.equal(result.ok, true, name);
  }
});

test('rejects a goal with no phase', () => {
  const raw = base();
  delete raw.goals[0].phase;
  const result = validateGoals(raw);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /goal 1.*phase/i);
});

test('rejects a goal whose phase does not exist, and a goal in two phases', () => {
  const unknown = validateGoals(base({ goals: [goal(1, { phase: 9 })] }));
  assert.equal(unknown.ok, false);
  const two = validateGoals(base({ goals: [goal(1, { phase: [0, 1] })] }));
  assert.equal(two.ok, false);
  assert.match(two.errors.join('\n'), /exactly one phase/i);
});

test('rejects bad direction, missing due, duplicate ids and a missing agreed flag', () => {
  assert.equal(validateGoals(base({ goals: [goal(1, { direction: 'sideways' })] })).ok, false);
  assert.equal(validateGoals(base({ goals: [goal(1, { due: 'soon' })] })).ok, false);
  assert.equal(validateGoals(base({ goals: [goal(1), goal(1)] })).ok, false);
  const raw = base();
  delete raw.agreed;
  assert.equal(validateGoals(raw).ok, false);
});

test('rejects tasks that point at goals, tasks or impact values that do not exist', () => {
  const task = { id: 'T1', phase: 0, goals: [1], blocks: [], impact: 'high', done: false };
  assert.equal(validateGoals(base({ tasks: [task] })).ok, true);
  assert.equal(validateGoals(base({ tasks: [{ ...task, goals: [99] }] })).ok, false);
  assert.equal(validateGoals(base({ tasks: [{ ...task, blocks: ['T9'] }] })).ok, false);
  assert.equal(validateGoals(base({ tasks: [{ ...task, impact: 'huge' }] })).ok, false);
  assert.equal(validateGoals(base({ tasks: [{ ...task, phase: 7 }] })).ok, false);
});

test('accepts the shapes a small profile uses: null baselines, text targets, object values', () => {
  const raw = base({
    goals: [
      goal(1, { baseline: null, target: 'Higher each quarter', headline: true }),
      goal(2, { baseline: { total: 23, average: 4.7 }, target: { total: 150, average: 4.6 } }),
      goal(3, { baseline: { answered: 23, total: 23 }, target: 'Every review within 48 hours' }),
      goal(4, { baseline: null, target: null, chart: true }),
    ],
  });
  const result = validateGoals(raw);
  assert.deepEqual(result.errors, []);
});

test('a real small-profile goals file stays valid when it is linked', (t) => {
  const path = join(FIXTURES, '..', '..', '..', 'projects', ['oo', 'st'].join(''), '.claude', 'reports', 'goals.json');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    t.skip('private goals file is not linked');
    return;
  }
  const result = validateGoals(JSON.parse(text));
  assert.deepEqual(result.errors, []);
});

test('fills small-profile defaults when the file leaves them out', () => {
  const raw = base({
    goals: [
      goal(1, { headline: true }),
      goal(2, { source: 'Google profile' }),
      goal(3, { source: 'Semrush position tracking' }),
    ],
  });
  const { data, ok } = validateGoals(raw);
  assert.equal(ok, true);
  assert.equal(data.profile, 'small');
  assert.deepEqual(
    data.phases.map((p) => p.name),
    PROFILE_DEFAULTS.small.phases.map((p) => p.name),
  );
  assert.deepEqual(data.phases.map((p) => p.start), ['2026-09', '2026-09', '2026-10', '2026-11']);
  assert.deepEqual(data.phases.map((p) => p.id), [0, 1, 2, 3]);
  const charts = Object.fromEntries(data.goals.map((g) => [g.id, g.chart]));
  assert.equal(charts[1], 'line-yoy');
  assert.equal(charts[2], 'line');
  assert.equal(charts[3], 'dots');
});

test('an explicit value always wins over a profile default', () => {
  const raw = base({
    phases: [
      { id: 0, name: 'Only phase', start: '2026-10' },
    ],
    goals: [goal(1, { headline: true }), goal(2, { chart: 'dots', source: 'Google profile' })],
  });
  const { data } = validateGoals(raw);
  assert.deepEqual(data.phases, [{ id: 0, name: 'Only phase', start: '2026-10' }]);
  assert.equal(data.goals[1].chart, 'dots');
  assert.equal(data.goals[0].chart, undefined);
});

test('the multi-location profile has no default phases or charts', () => {
  const raw = base({ profile: 'multi-location' });
  const result = validateGoals(raw);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /phases/);
  assert.deepEqual(PROFILE_DEFAULTS['multi-location'].charts, []);
});

test('the default source notes name what works today and what does not', () => {
  const notes = PROFILE_DEFAULTS.small.sources;
  assert.match(notes.forms, /MCP/);
  assert.match(notes.googleProfile, /tools\/gbp/);
  assert.match(notes.searchConsole, /no access/i);
  assert.match(notes.rankings, /MCP/);
});

test('warns over 8 goals for small and over 15 for multi-location, never rejects', () => {
  const small9 = validateGoals(base({ goals: many(9) }));
  assert.equal(small9.ok, true);
  assert.match(small9.warnings.join('\n'), /9 goals.*small.*8/);
  assert.deepEqual(validateGoals(base({ goals: many(8) })).warnings, []);

  const phases = [{ id: 0, name: 'A', start: '2026-09' }];
  const multi16 = validateGoals(base({ profile: 'multi-location', phases, goals: many(16) }));
  assert.equal(multi16.ok, true);
  assert.match(multi16.warnings.join('\n'), /16 goals.*multi-location.*15/);
  const multi15 = validateGoals(base({ profile: 'multi-location', phases, goals: many(15) }));
  assert.deepEqual(multi15.warnings, []);
});

test('Goal shapes with a null baseline, a text target and an object value validate', () => {
  const result = validateGoals(
    base({
      goals: [
        goal(1, { headline: true, baseline: null, target: 'Higher each quarter' }),
        goal(2, { baseline: { total: 40, average: 4.6 }, target: { total: 80, average: 4.8 }, statusKey: 'total' }),
      ],
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.data.goals[1].statusKey, 'total');
});

test('a status key must be a non-empty text', () => {
  for (const statusKey of [3, '', null, ['total']]) {
    const result = validateGoals(base({ goals: [goal(1, { statusKey })] }));
    assert.ok(result.errors.some((e) => /statusKey/.test(e)), String(statusKey));
  }
});
