// Guards P3 goals: goal health (no open task, overdue target, days since review, tasks with no goal), the D18 goal-fit picker unlinked() (open and unlinked only, near-due, blocked and waiting skipped, 30-day keep suppression, priority then age, max 3, none without an active goal), the Monday GOALS block and its STE ratio, goals-state.js, and the `cli.js goals health|questions|keep` gates. Fixtures are fake.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { health, unlinked, goalsBlock, MAX_BLOCK_LINES } from '../../tools/triage/lib/goals.js';
import { loadState, saveState, keep, KEEP_DAYS } from '../../tools/triage/lib/goals-state.js';
import { lint, MIN_RATIO } from '../../tools/triage/lib/ste-lint.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'tools/triage/cli.js');
// Tuesday; 2 working days on is Thursday 2026-11-12.
const NOW = '2026-11-10T08:00:00.000Z';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-goals-'));
  dirs.push(d);
  return d;
}

const task = (id, over = {}) => ({ id, name: `Task ${id}`, status: 'To Do', priority: 'P2', due: null, goalIds: [], createdTime: '2026-10-15T09:00:00.000Z', ...over });

const GOALS = [
  { id: 'g-active', name: 'Acme retainer health', status: 'Active', taskIds: ['t-goal-side'], targetDate: '2026-12-31', lastReviewed: '2026-10-29' },
  { id: 'g-empty', name: 'Launch the Globex shop', status: 'Active', taskIds: [], targetDate: '2026-11-01', lastReviewed: null },
  { id: 'g-today', name: 'Write 2 case studies', status: 'Active', taskIds: [], targetDate: '2026-11-10', lastReviewed: '2026-11-10' },
  { id: 'g-paused', name: 'Paused goal', status: 'Paused', taskIds: [], targetDate: '2026-01-01', lastReviewed: null },
];

const TASKS = [
  task('t-linked', { priority: 'P1', goalIds: ['g-active'] }),
  task('t-linked-done', { status: 'Done', goalIds: ['g-active'] }),
  task('t-goal-side'),
  task('t-today-goal', { goalIds: ['g-today'], status: 'Cancelled' }),
  task('t-p0-old', { priority: 'P0', createdTime: '2026-10-01T09:00:00.000Z' }),
  task('t-p0-new', { priority: 'P0', createdTime: '2026-11-01T09:00:00.000Z' }),
  task('t-p2-old', { createdTime: '2026-09-01T09:00:00.000Z' }),
  task('t-noprio', { priority: null, createdTime: '2026-08-01T09:00:00.000Z' }),
  task('t-due-thu', { priority: 'P0', due: '2026-11-12' }),
  task('t-overdue', { priority: 'P0', due: '2026-11-01' }),
  task('t-due-fri', { priority: 'P1', due: '2026-11-13', createdTime: '2026-11-05T09:00:00.000Z' }),
  task('t-blocked', { priority: 'P0', status: 'Blocked' }),
  task('t-waiting', { priority: 'P0', status: 'Waiting' }),
  task('t-cancelled', { priority: 'P0', status: 'Cancelled' }),
  task('t-kept', { priority: 'P0', createdTime: '2026-09-01T09:00:00.000Z' }),
  task('t-kept-expired', { priority: 'P1', createdTime: '2026-09-01T09:00:00.000Z' }),
];

const STATE = {
  kept: [
    { taskId: 't-kept', until: '2026-12-01T00:00:00.000Z', at: '2026-11-01T00:00:00.000Z' },
    { taskId: 't-kept-expired', until: '2026-11-09T00:00:00.000Z', at: '2026-10-10T00:00:00.000Z' },
  ],
};

test('health reports active goals only, with open task counts from either relation side, overdue and days since review', () => {
  const h = health(GOALS, TASKS, { now: NOW });
  assert.deepEqual(h.goals, [
    { id: 'g-active', name: 'Acme retainer health', openTasks: 2, noOpenTask: false, overdue: false, targetDate: '2026-12-31', daysSinceReview: 12 },
    { id: 'g-empty', name: 'Launch the Globex shop', openTasks: 0, noOpenTask: true, overdue: true, targetDate: '2026-11-01', daysSinceReview: null },
    { id: 'g-today', name: 'Write 2 case studies', openTasks: 0, noOpenTask: true, overdue: false, targetDate: '2026-11-10', daysSinceReview: 0 },
  ]);
});

test('health lists the top 5 open tasks with no goal by priority, then oldest first, then name', () => {
  const h = health(GOALS, TASKS, { now: NOW });
  assert.deepEqual(h.tasksWithNoGoal.map((t) => t.id), ['t-kept', 't-p0-old', 't-blocked', 't-due-thu', 't-overdue']);
  assert.deepEqual(Object.keys(h.tasksWithNoGoal[0]).sort(), ['createdTime', 'id', 'name', 'priority']);
  assert.deepEqual(health([], [], { now: NOW }), { goals: [], tasksWithNoGoal: [] });
});

test('unlinked asks only about open unlinked tasks, skips near-due, blocked, waiting and kept ones, ranks priority then age, max 3', () => {
  const q = unlinked(TASKS, GOALS, { now: NOW, state: STATE });
  assert.deepEqual(q.map((t) => t.id), ['t-p0-old', 't-p0-new', 't-kept-expired']);
  const all = unlinked(TASKS, GOALS, { now: NOW, state: STATE, max: 10 });
  assert.deepEqual(all.map((t) => t.id), ['t-p0-old', 't-p0-new', 't-kept-expired', 't-due-fri', 't-p2-old', 't-noprio']);
  for (const id of ['t-linked', 't-goal-side', 't-due-thu', 't-overdue', 't-blocked', 't-waiting', 't-cancelled', 't-kept', 't-linked-done']) {
    assert.ok(!all.some((t) => t.id === id), id);
  }
});

test('unlinked returns nothing when there is no active goal, and treats a missing state as no keeps', () => {
  const paused = GOALS.map((g) => ({ ...g, status: 'Paused' }));
  assert.deepEqual(unlinked(TASKS, paused, { now: NOW, state: STATE }), []);
  assert.deepEqual(unlinked(TASKS, [], { now: NOW }), []);
  assert.deepEqual(unlinked(TASKS, GOALS, { now: NOW }).map((t) => t.id), ['t-kept', 't-p0-old', 't-p0-new']);
});

test('unlinked counts working days: on a Friday, the next Tuesday is still near-due', () => {
  const friday = '2026-11-13T08:00:00.000Z';
  const tasks = [task('t-tue', { priority: 'P0', due: '2026-11-17' }), task('t-wed', { priority: 'P0', due: '2026-11-18' })];
  assert.deepEqual(unlinked(tasks, GOALS, { now: friday }).map((t) => t.id), ['t-wed']);
});

test('goalsBlock writes one short line per flagged goal only, and passes STE lint', () => {
  const lines = goalsBlock(health(GOALS, TASKS, { now: NOW }));
  assert.deepEqual(lines, [
    'Launch the Globex shop: no open task. Overdue since 2026-11-01.',
    'Write 2 case studies: no open task. Review today.',
  ]);
  const { ok, ratio, warnings } = lint(lines.join('\n'));
  assert.ok(ok, JSON.stringify(warnings));
  assert.ok(ratio >= MIN_RATIO);
});

test('goalsBlock caps at 8 lines, uses singular forms, cleans untrusted names and handles no goals', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `g${i}`, name: `Goal ${i}`, openTasks: 1, noOpenTask: false, overdue: false, targetDate: null, daysSinceReview: 20 }));
  const lines = goalsBlock({ goals: many });
  assert.equal(MAX_BLOCK_LINES, 8);
  assert.equal(lines.length, 8);
  assert.equal(lines[0], 'Goal 0: 1 open task. Review 20 days ago.');
  const dirty = goalsBlock({ goals: [{ name: 'Ship *it* — now 🚀 <@U1>', openTasks: 0, noOpenTask: true, overdue: false, daysSinceReview: null }] });
  assert.equal(dirty[0], 'Ship it - now @U1: no open task.');
  assert.ok(lint(dirty.join('\n')).ok);
  assert.deepEqual(goalsBlock({ goals: [] }), ['No active goals. Set one with /strategy.']);
  const fine = [1, 2].map((i) => ({ name: `Goal ${i}`, openTasks: 2, noOpenTask: false, overdue: false, daysSinceReview: i === 1 ? null : 13 }));
  assert.deepEqual(goalsBlock({ goals: fine }), ['All 2 goals are on track.']);
  assert.ok(lint(goalsBlock({ goals: [] }).join('\n')).ok);
});

test('goals-state: missing or corrupt loads empty, keep sets 30 days and replaces, expired entries are pruned, save is atomic', () => {
  const dir = tmp();
  assert.equal(KEEP_DAYS, 30);
  assert.deepEqual(loadState(dir, { now: NOW }), { kept: [] });
  writeFileSync(join(dir, 'goals-state.json'), '{ broken');
  assert.deepEqual(loadState(dir, { now: NOW }), { kept: [] });
  writeFileSync(join(dir, 'goals-state.json'), JSON.stringify({ kept: 'nope' }));
  assert.deepEqual(loadState(dir, { now: NOW }), { kept: [] });
  const once = keep({ kept: [] }, 't1', NOW);
  assert.deepEqual(once, { kept: [{ taskId: 't1', until: '2026-12-10T08:00:00.000Z', at: NOW }] });
  const later = '2026-11-20T08:00:00.000Z';
  const twice = keep({ kept: [...once.kept, { taskId: 'old', until: '2026-11-15T00:00:00.000Z', at: '2026-10-16T00:00:00.000Z' }] }, 't1', later);
  assert.deepEqual(twice, { kept: [{ taskId: 't1', until: '2026-12-20T08:00:00.000Z', at: later }] });
  saveState(dir, { kept: [...once.kept, { taskId: 'gone', until: '2026-11-01T00:00:00.000Z', at: '2026-10-01T00:00:00.000Z' }] });
  assert.deepEqual(readdirSync(dir), ['goals-state.json']);
  assert.deepEqual(loadState(dir, { now: NOW }), once);
});

// ---------- CLI ----------

const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('TRIAGE_') && k !== 'NOTION_TOKEN'));

function cli(args, env, input = '') {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, input, encoding: 'utf8', env: { ...CLEAN_ENV, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr, json: () => JSON.parse(r.stdout) };
}

function cliEnv({ digest } = {}) {
  const dir = tmp();
  const triage = join(dir, 'triage');
  const world = join(triage, 'world');
  mkdirSync(world, { recursive: true });
  writeFileSync(join(world, '2026-11-10.json'), JSON.stringify({ generatedAt: NOW, tasks: TASKS, goals: GOALS }));
  const stateFile = join(triage, 'state.json');
  if (digest !== null) {
    writeFileSync(stateFile, JSON.stringify({ digest: digest ?? { ts: '1762761600.000100', date: '2026-11-10', items: [{ n: 'Q1', kind: 'goal-fit', taskId: 't-p0-old', goalId: 'g-active' }, { n: 'B1', kind: 'build', pageId: 't-p0-new' }], processedTs: [] } }));
  }
  const env = { TRIAGE_TEST_WORLD_DIR: world, TRIAGE_TEST_GOALS_DIR: triage, TRIAGE_TEST_STATE_FILE: stateFile, TRIAGE_TEST_NOW: NOW, PATH: '/usr/bin:/bin' };
  return { dir, triage, world, env, goalsState: join(triage, 'goals-state.json') };
}

test('goals health prints goals, tasksWithNoGoal and the block from today\'s snapshot or --in', () => {
  const fx = cliEnv();
  const r = cli(['goals', 'health'], fx.env);
  assert.equal(r.code, 0, r.err);
  const res = r.json();
  assert.deepEqual(Object.keys(res).sort(), ['block', 'goals', 'tasksWithNoGoal']);
  assert.equal(res.goals.length, 3);
  assert.deepEqual(res.block, goalsBlock(health(GOALS, TASKS, { now: NOW })));
  const other = join(fx.dir, 'snap.json');
  writeFileSync(other, JSON.stringify({ tasks: [], goals: [] }));
  assert.deepEqual(cli(['goals', 'health', '--in', other], fx.env).json().goals, []);
  assert.equal(cli(['goals', 'health'], { ...fx.env, TRIAGE_TEST_NOW: '2026-11-11T08:00:00Z' }).code, 2, 'no snapshot for that day');
});

test('goals questions labels up to 3 Q items and honours the real keep state', () => {
  const fx = cliEnv();
  const r = cli(['goals', 'questions'], fx.env);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json(), [
    { label: 'Q1', taskId: 't-kept', taskName: 'Task t-kept', priority: 'P0' },
    { label: 'Q2', taskId: 't-p0-old', taskName: 'Task t-p0-old', priority: 'P0' },
    { label: 'Q3', taskId: 't-p0-new', taskName: 'Task t-p0-new', priority: 'P0' },
  ]);
  writeFileSync(fx.goalsState, JSON.stringify(STATE));
  assert.deepEqual(cli(['goals', 'questions'], fx.env).json().map((q) => q.taskId), ['t-p0-old', 't-p0-new', 't-kept-expired']);
});

test('goals keep records a keep only for a goal-fit item in today\'s digest', () => {
  const fx = cliEnv();
  const r = cli(['goals', 'keep', '--task', 't-p0-old'], fx.env);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json(), { kept: true, taskId: 't-p0-old', until: '2026-12-10T08:00:00.000Z' });
  assert.deepEqual(JSON.parse(readFileSync(fx.goalsState, 'utf8')).kept.map((k) => k.taskId), ['t-p0-old']);
  for (const id of ['t-p0-new', 't-unknown']) {
    const no = cli(['goals', 'keep', '--task', id], fx.env);
    assert.equal(no.code, 1, id);
    assert.deepEqual(no.json(), { kept: false, reason: 'not-a-question' });
  }
  const yesterday = cli(['goals', 'keep', '--task', 't-p0-old'], { ...fx.env, TRIAGE_TEST_NOW: '2026-11-11T08:00:00Z' });
  assert.equal(yesterday.code, 1);
  assert.deepEqual(yesterday.json(), { kept: false, reason: 'no-digest-today' });
  assert.equal(cli(['goals', 'keep'], fx.env).code, 2);
  assert.equal(cli(['goals', 'keep', '--task', '../x'], fx.env).code, 2);
  const none = cliEnv({ digest: null });
  assert.equal(cli(['goals', 'keep', '--task', 't-p0-old'], none.env).code, 1);
  assert.equal(existsSync(none.goalsState), false);
});

test('goals refuses inside a build job, refuses --now, and has no flag that moves a write path', () => {
  const fx = cliEnv();
  for (const sub of ['health', 'questions', 'keep']) {
    const r = cli(['goals', sub, '--task', 't-p0-old'], { ...fx.env, TRIAGE_BUILD_JOB: '1' });
    assert.equal(r.code, 2, sub);
    assert.match(r.err, /not available inside a build job/);
  }
  assert.equal(existsSync(fx.goalsState), false);
  assert.equal(cli(['goals', 'health', '--now', NOW], fx.env).code, 2);
  assert.equal(cli(['goals'], fx.env).code, 2);
  assert.equal(cli(['goals', 'nope'], fx.env).code, 2);
  for (const flag of ['--state', '--dir', '--out']) assert.equal(cli(['goals', 'keep', '--task', 't-p0-old', flag, '/tmp/x'], fx.env).code, 2, flag);
  assert.equal(existsSync(fx.goalsState), false);
});
