// Covers the async reviews stage: one task_post batch, tasks_ready polling every 20 s on a fake clock, task_get per ready task, and unknown for tasks not done after 10 minutes or refused by the budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POLL_MS, TIMEOUT_MS, REVIEW_DEFAULTS, fetchReviews } from '../../tools/outreach/reviews.js';
import { BudgetExceeded, DataForSeoError, PaymentRequired } from '../../tools/outreach/dataforseo.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const REVIEWS = fixture('reviews');
const ITEMS = REVIEWS.tasks[0].result[0].items;

function fakeClock() {
  let t = 0;
  const sleeps = [];
  return { now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; }, sleeps, at: () => t };
}

function fakeClient({ readyAt = {}, postStatus = {}, budgetError = false, postError = null, pollErrors = 0, getError = {}, clock }) {
  let polls = 0;
  const calls = [];
  const idFor = (cid) => `task-${cid}`;
  return {
    calls,
    async post(endpoint, tasks) {
      calls.push({ method: 'POST', endpoint, tasks });
      if (budgetError) throw new BudgetExceeded({ spent: 3, estimate: 0.003, limit: 3 });
      if (postError) throw postError;
      return {
        status_code: 20000,
        cost: 0.0015 * tasks.length,
        tasks: tasks.map((t) => ({ id: idFor(t.cid), status_code: postStatus[t.cid] ?? 20100, status_message: 'Task Created.', data: { ...t } })),
      };
    },
    async get(endpoint) {
      calls.push({ method: 'GET', endpoint, at: clock.at() });
      if (endpoint === 'business_data/google/reviews/tasks_ready') {
        polls += 1;
        if (polls <= pollErrors) throw new DataForSeoError('DataForSEO: HTTP 503', { status: 503 });
        const ready = Object.entries(readyAt).filter(([, t]) => clock.at() >= t).map(([cid]) => ({ id: idFor(cid), endpoint: `/v3/business_data/google/reviews/task_get/${idFor(cid)}` }));
        return { status_code: 20000, cost: 0, tasks: [{ status_code: 20000, result: [...ready, { id: 'someone-elses-task' }] }] };
      }
      const id = endpoint.split('/').pop();
      const cid = id.replace('task-', '');
      if (getError[cid]) throw getError[cid];
      return { ...REVIEWS, tasks: [{ ...REVIEWS.tasks[0], id, result: [{ ...REVIEWS.tasks[0].result[0], cid }] }] };
    },
  };
}

const run = (cids, opts) => {
  const clock = fakeClock();
  const client = fakeClient({ ...opts, clock });
  return { clock, client, result: fetchReviews({ client, cids, sleep: clock.sleep, now: clock.now }) };
};

test('constants: poll every 20 s, give up after 10 minutes, 10 newest reviews', () => {
  assert.equal(POLL_MS, 20_000);
  assert.equal(TIMEOUT_MS, 600_000);
  assert.equal(REVIEW_DEFAULTS.depth, 10);
  assert.equal(REVIEW_DEFAULTS.sort_by, 'newest');
  assert.equal(REVIEW_DEFAULTS.language_code, 'nl');
});

test('all reviews tasks go in one task_post batch, tagged by cid', async () => {
  const { client, result } = run(['111', '222'], { readyAt: { 111: 0, 222: 0 } });
  await result;
  const posts = client.calls.filter((c) => c.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].endpoint, 'business_data/google/reviews/task_post');
  assert.deepEqual(posts[0].tasks.map((t) => [t.cid, t.tag, t.depth]), [['111', '111', 10], ['222', '222', 10]]);
});

test('polls tasks_ready every 20 s and task_gets each of ours once', async () => {
  const { client, clock, result } = run(['111', '222'], { readyAt: { 111: 20_000, 222: 60_000 } });
  const out = await result;
  assert.deepEqual(clock.sleeps, [20_000, 20_000, 20_000]);
  const gets = client.calls.filter((c) => c.method === 'GET' && c.endpoint.includes('task_get'));
  assert.deepEqual(gets.map((g) => g.endpoint), ['business_data/google/reviews/task_get/task-111', 'business_data/google/reviews/task_get/task-222']);
  assert.equal(out['111'].status, 'ok');
  assert.equal(out['111'].items.length, 10);
  assert.deepEqual(out['222'].items, ITEMS);
});

test('gives up after 10 minutes and returns unknown for unfinished tasks', async () => {
  const { client, clock, result } = run(['111', '222'], { readyAt: { 111: 40_000 } });
  const out = await result;
  assert.equal(out['111'].status, 'ok');
  assert.deepEqual(out['222'], { status: 'unknown', items: null });
  assert.equal(clock.at(), TIMEOUT_MS);
  assert.equal(client.calls.filter((c) => c.endpoint.endsWith('tasks_ready')).length, TIMEOUT_MS / POLL_MS);
});

test('a task the API refused at post time is unknown and never polled for', async () => {
  const { client, result } = run(['111', '222'], { readyAt: { 111: 20_000 }, postStatus: { 222: 40501 } });
  const out = await result;
  assert.equal(out['222'].status, 'unknown');
  assert.equal(client.calls.filter((c) => c.endpoint.includes('task_get')).length, 1);
});

test('a budget refusal marks every cid unknown with no polling', async () => {
  const { client, clock, result } = run(['111', '222'], { budgetError: true });
  const out = await result;
  assert.deepEqual(out, { 111: { status: 'unknown', items: null, reason: 'budget' }, 222: { status: 'unknown', items: null, reason: 'budget' } });
  assert.equal(clock.sleeps.length, 0);
  assert.equal(client.calls.length, 1);
});

test('no cids means no calls', async () => {
  const { client, result } = run([], {});
  assert.deepEqual(await result, {});
  assert.equal(client.calls.length, 0);
});

test('a failing poll is retried on the next tick, not thrown', async () => {
  const { result } = run(['111'], { readyAt: { 111: 0 }, pollErrors: 2 });
  const out = await result;
  assert.equal(out['111'].status, 'ok');
});

test('a failing task_get leaves only that cid unknown', async () => {
  const { result } = run(['111', '222'], { readyAt: { 111: 0, 222: 0 }, getError: { 111: new DataForSeoError('DataForSEO: HTTP 500', { status: 500 }) } });
  const out = await result;
  assert.equal(out['111'].status, 'unknown');
  assert.equal(out['222'].status, 'ok');
});

test('a non-budget error at post time marks every cid unknown instead of throwing', async () => {
  const { result } = run(['111', '222'], { postError: new DataForSeoError('DataForSEO: HTTP 500', { status: 500 }) });
  const out = await result;
  assert.equal(out['111'].status, 'unknown');
  assert.equal(out['222'].status, 'unknown');
});

test('PaymentRequired still stops the reviews stage', async () => {
  const { result } = run(['111'], { postError: new PaymentRequired('DataForSEO: payment required (HTTP 402)') });
  await assert.rejects(result, PaymentRequired);
  const poll = run(['111'], { readyAt: { 111: 0 }, getError: { 111: new PaymentRequired('DataForSEO: payment required (HTTP 402)') } });
  await assert.rejects(poll.result, PaymentRequired);
});
