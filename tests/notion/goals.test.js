// Covers the Goals DB mapper and query, the task mapper's Goal relation and created time, linkGoal (appends one relation id, touches no other property, pages a long relation) and the goals and link-goal CLI commands, on fake fixtures without the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mapGoalPage, mapTaskPage, queryGoals, linkGoal } from '../../tools/notion/client.js';
import { parseArgs, resolveGoalsDatabaseId } from '../../tools/notion/cli.js';

const goal = JSON.parse(readFileSync(new URL('./fixtures/goal-page.json', import.meta.url), 'utf8'));
const page = JSON.parse(readFileSync(new URL('./fixtures/page.json', import.meta.url), 'utf8'));

const TASK = '00000000-0000-0000-0000-000000000001';
const GOAL_A = '00000000-0000-0000-0000-0000000000a1';
const GOAL_B = '00000000-0000-0000-0000-0000000000b2';

test('mapGoalPage maps a full Goals page', () => {
  assert.deepEqual(mapGoalPage(goal), {
    id: GOAL_A,
    url: 'https://www.notion.so/Acme-retainer-health-000000000000000000000000000000a1',
    name: 'Acme retainer health',
    status: 'Active',
    horizon: 'Quarter',
    clientIds: ['00000000-0000-0000-0000-000000000003'],
    taskIds: [TASK, '00000000-0000-0000-0000-000000000004'],
    measure: 'No P0 bugs open for 2 weeks',
    targetDate: '2026-12-31',
    why: 'Keeps the retainer renewing',
    lastReviewed: '2026-10-29',
    progress: 0.5,
  });
});

test('mapGoalPage survives missing and empty properties and finds a renamed title by type', () => {
  assert.deepEqual(mapGoalPage({ id: 'g' }), {
    id: 'g', url: null, name: '', status: null, horizon: null, clientIds: [], taskIds: [],
    measure: null, targetDate: null, why: null, lastReviewed: null, progress: null,
  });
  const renamed = mapGoalPage({
    id: 'g2',
    properties: {
      Objective: { type: 'title', title: [{ plain_text: 'Renamed' }] },
      Status: { type: 'select', select: { name: 'Paused' } },
      Progress: { type: 'rollup', rollup: { type: 'array', array: [] } },
      'Target date': { type: 'date', date: null },
    },
  });
  assert.equal(renamed.name, 'Renamed');
  assert.equal(renamed.status, 'Paused');
  assert.equal(renamed.progress, null);
  assert.equal(renamed.targetDate, null);
});

test('mapTaskPage returns goalIds from the Goal relation and the created time', () => {
  const linked = { ...page, properties: { ...page.properties, Goal: { type: 'relation', relation: [{ id: GOAL_A }] } } };
  assert.deepEqual(mapTaskPage(linked).goalIds, [GOAL_A]);
  assert.equal(mapTaskPage(linked).createdTime, '2026-11-03T08:30:00.000Z');
  assert.deepEqual(mapTaskPage(page).goalIds, []);
  assert.equal(mapTaskPage({ id: 'x' }).createdTime, null);
  assert.equal(mapTaskPage({ id: 'x' }).lastEdited, null);
});

function fakeClient({ pages = [], task, relationPages = [] } = {}) {
  const calls = { query: [], update: [], retrieve: [], property: [] };
  return {
    calls,
    databases: {
      async query(args) {
        calls.query.push(args);
        return pages[calls.query.length - 1];
      },
    },
    pages: {
      async retrieve(args) { calls.retrieve.push(args); return task; },
      async update(args) { calls.update.push(args); return { id: args.page_id }; },
      properties: {
        async retrieve(args) {
          calls.property.push(args);
          return relationPages[calls.property.length - 1];
        },
      },
    },
  };
}

test('queryGoals paginates, skips archived pages and filters only the given statuses', async () => {
  const client = fakeClient({
    pages: [
      { results: [goal, { ...goal, id: 'gone', in_trash: true }], has_more: true, next_cursor: 'c2' },
      { results: [{ ...goal, id: 'g2' }], has_more: false },
    ],
  });
  const goals = await queryGoals(client, 'goals-db', { excludeStatuses: ['Dropped'] });
  assert.deepEqual(goals.map((g) => g.id), [GOAL_A, 'g2']);
  assert.equal(client.calls.query[0].database_id, 'goals-db');
  assert.equal(client.calls.query[1].start_cursor, 'c2');
  assert.deepEqual(client.calls.query[0].filter, { and: [{ property: 'Status', status: { does_not_equal: 'Dropped' } }] });
  const all = fakeClient({ pages: [{ results: [goal], has_more: false }] });
  await queryGoals(all, 'goals-db');
  assert.equal(all.calls.query[0].filter, undefined, 'no filter when nothing is excluded');
});

const taskWithGoals = (ids, hasMore = false) => ({
  ...page,
  properties: { ...page.properties, Goal: { id: 'gl', type: 'relation', relation: ids.map((id) => ({ id })), has_more: hasMore } },
});

test('linkGoal appends the goal to the Goal relation and writes only that property', async () => {
  const client = fakeClient({ task: taskWithGoals([GOAL_B]) });
  const res = await linkGoal(client, TASK, GOAL_A);
  assert.deepEqual(res, { linked: true, goalIds: [GOAL_B, GOAL_A] });
  assert.deepEqual(client.calls.retrieve, [{ page_id: TASK }]);
  assert.deepEqual(client.calls.update, [{ page_id: TASK, properties: { Goal: { relation: [{ id: GOAL_B }, { id: GOAL_A }] } } }]);
});

test('linkGoal is a no-op when the goal is already linked (ids compared without dashes)', async () => {
  const client = fakeClient({ task: taskWithGoals([GOAL_A]) });
  const res = await linkGoal(client, TASK, GOAL_A.replace(/-/g, ''));
  assert.deepEqual(res, { linked: false, goalIds: [GOAL_A] });
  assert.deepEqual(client.calls.update, []);
});

test('linkGoal reads a long relation in full before writing, so no link is lost', async () => {
  const client = fakeClient({
    task: taskWithGoals(['g1'], true),
    relationPages: [
      { object: 'list', results: [{ relation: { id: 'g1' } }, { relation: { id: 'g2' } }], has_more: true, next_cursor: 'n2' },
      { object: 'list', results: [{ relation: { id: 'g3' } }], has_more: false },
    ],
  });
  const res = await linkGoal(client, TASK, GOAL_A);
  assert.deepEqual(res.goalIds, ['g1', 'g2', 'g3', GOAL_A]);
  assert.deepEqual(client.calls.property.map((c) => [c.property_id, c.start_cursor]), [['gl', undefined], ['gl', 'n2']]);
});

test('linkGoal refuses a task with no Goal relation and writes nothing', async () => {
  const client = fakeClient({ task: page });
  await assert.rejects(linkGoal(client, TASK, GOAL_A), /Goal relation/);
  assert.deepEqual(client.calls.update, []);
});

test('parseArgs reads goals and link-goal, and link-goal needs Notion ids', () => {
  assert.deepEqual(parseArgs(['goals']), { command: 'goals' });
  assert.deepEqual(parseArgs(['goals', '--db', 'abc']), { command: 'goals', db: 'abc' });
  assert.deepEqual(parseArgs(['link-goal', '--page', TASK, '--goal', GOAL_A.replace(/-/g, '')]), {
    command: 'link-goal', page: TASK, goal: GOAL_A.replace(/-/g, ''),
  });
  assert.throws(() => parseArgs(['link-goal', '--page', TASK]), /--goal/);
  assert.throws(() => parseArgs(['link-goal', '--page', 'not-an-id', '--goal', GOAL_A]), /Notion id/);
  assert.throws(() => parseArgs(['link-goal', '--page', TASK, '--goal', '../x']), /Notion id/);
  assert.throws(() => parseArgs(['link-goal', '--page', TASK, '--goal', GOAL_A, '--value', 'x']), /unknown|not allowed/i);
});

test('resolveGoalsDatabaseId prefers --db, else config goals.databaseId', () => {
  assert.equal(resolveGoalsDatabaseId({ db: 'flag' }, () => { throw new Error('no read'); }), 'flag');
  const read = () => JSON.stringify({ notion: { databaseId: 'tasks' }, goals: { databaseId: 'goals-db' } });
  assert.equal(resolveGoalsDatabaseId({ config: '/c.json' }, read), 'goals-db');
  assert.throws(() => resolveGoalsDatabaseId({ config: '/c.json' }, () => '{"notion":{"databaseId":"t"}}'), /goals\.databaseId/);
});

test('goals and link-goal refuse inside a build job', () => {
  const cli = fileURLToPath(new URL('../../tools/notion/cli.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NOTION_TOKEN'));
  for (const args of [['goals'], ['link-goal', '--page', TASK, '--goal', GOAL_A]]) {
    const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...env, PATH: '/usr/bin:/bin', TRIAGE_BUILD_JOB: '1' } });
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /not available inside a build job/);
  }
});
