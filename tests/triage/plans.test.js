// Guards the P5 planner rules (plans.js due, goalFit, planItems) and the P7 filter that never offers a plan whose spec says Goal fit: none. Fixtures are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { due, goalFit, planItems, goalSlug, MAX_PLANS_PER_DAY } from '../../tools/triage/lib/plans.js';

const NOW = '2026-11-11T07:00:00Z';
const G1 = '11111111111111111111111111111111';
const G2 = '22222222222222222222222222222222';
const G3 = '33333333333333333333333333333333';
const goals = [
  { id: G1, name: 'Carsa retainer health', status: 'Active', targetDate: '2026-12-01' },
  { id: G2, name: 'Ship the studio site', status: 'Active', targetDate: '2026-11-20' },
  { id: G3, name: 'Learn Rust', status: 'Paused' },
  { id: '44444444444444444444444444444444', name: 'Grow newsletter', status: 'Active' },
];
const tasks = [{ id: 't1', name: 'Fix Carsa nav', status: 'In progress', goalIds: [G1] }];

test('goalSlug is a job-safe slug', () => {
  assert.equal(goalSlug({ name: 'Ship the Studio site!' }), 'goal-ship-the-studio-site');
  assert.ok(goalSlug({ name: 'x'.repeat(200) }).length <= 64);
});

test('due picks active goals with no open task and no spec in progress, nearest target first, max 2 a day', () => {
  const picked = due(goals, tasks, [], { now: NOW, jobs: [] });
  assert.deepEqual(picked.map((p) => p.pageId), [G2, '44444444444444444444444444444444']);
  assert.equal(picked[0].slug, 'goal-ship-the-studio-site');
  assert.match(picked[0].task, /Ship the studio site/);
  assert.equal(MAX_PLANS_PER_DAY, 2);
});

test('due skips a goal whose spec is in progress or that already has a plan job', () => {
  const specs = [{ slug: 'goal-ship-the-studio-site', bucket: 'in_flight' }];
  const jobs = [{ pageId: '44444444444444444444444444444444', meta: { kind: 'plan', startedAt: '2026-11-05T07:00:00Z' }, finished: true }];
  assert.deepEqual(due(goals, tasks, specs, { now: NOW, jobs }), []);
  const closed = [{ slug: 'goal-ship-the-studio-site', bucket: 'closed' }];
  assert.deepEqual(due(goals, tasks, closed, { now: NOW, jobs }).map((p) => p.pageId), [G2]);
});

test('due counts plan jobs already started today against the daily max', () => {
  const jobs = [{ pageId: 'other', meta: { kind: 'plan', startedAt: '2026-11-11T06:30:00Z' }, finished: true }];
  assert.equal(due(goals, tasks, [], { now: NOW, jobs }).length, 1);
  const two = [...jobs, { pageId: 'other2', meta: { kind: 'plan', startedAt: '2026-11-11T06:40:00Z' }, finished: true }];
  assert.equal(due(goals, tasks, [], { now: NOW, jobs: two }).length, 0);
});

test('due respects the shared cap of 3 across plan and build jobs', () => {
  const live = (id, kind) => ({ pageId: id, meta: { kind, startedAt: '2026-11-10T07:00:00Z' }, alive: true, finished: false });
  assert.equal(due(goals, tasks, [], { now: NOW, jobs: [live('a', 'build'), live('b', 'build')] }).length, 1);
  assert.equal(due(goals, tasks, [], { now: NOW, jobs: [live('a', 'build'), live('b', 'plan'), live('c', 'build')] }).length, 0);
});

test('goalFit reads the Goal fit line and returns null for none or a missing line', () => {
  assert.equal(goalFit('## Review\nRiskiest assumption: x\nGoal fit: Carsa retainer health\n'), 'Carsa retainer health');
  assert.equal(goalFit('- **Goal fit:** Ship the studio site'), 'Ship the studio site');
  assert.equal(goalFit('Goal fit: none'), null);
  assert.equal(goalFit('Goal fit: None (no goals yet)'), null);
  assert.equal(goalFit('no line here'), undefined);
});

test('planItems offers finished planned jobs as P items and drops Goal fit: none', () => {
  const job = (pageId, slug) => ({ pageId, finished: true, meta: { kind: 'plan', slug, task: `Plan ${slug}` }, result: { status: 'planned' } });
  const specs = {
    'goal-a': 'Goal fit: Carsa retainer health',
    'goal-b': 'Goal fit: none',
    'goal-c': '# no review',
  };
  const jobs = [
    job('pa', 'goal-a'),
    job('pb', 'goal-b'),
    job('pc', 'goal-c'),
    { pageId: 'pd', finished: true, meta: { kind: 'build', slug: 'x' }, result: { status: 'passed' } },
    { pageId: 'pe', finished: false, meta: { kind: 'plan', slug: 'goal-e' } },
    { pageId: 'pf', finished: true, meta: { kind: 'plan', slug: 'goal-f' }, result: { status: 'failed' } },
  ];
  const items = planItems(jobs, (slug) => specs[slug] ?? null);
  assert.deepEqual(items.map((i) => [i.n, i.pageId, i.slug, i.kind]), [
    ['P1', 'pa', 'goal-a', 'plan'],
    ['P2', 'pc', 'goal-c', 'plan'],
  ]);
  assert.equal(items[0].goalFit, 'Carsa retainer health');
});

test('planItems skips a planned job whose spec cannot be read', () => {
  const jobs = [{ pageId: 'pa', finished: true, meta: { kind: 'plan', slug: 'goal-a' }, result: { status: 'planned' } }];
  assert.deepEqual(planItems(jobs, () => null), []);
});
