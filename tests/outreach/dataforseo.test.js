// Covers the DataForSEO client: Basic auth, the budget meter that sums each response cost, BudgetExceeded and PaymentRequired errors, and Keychain credential loading, with a fake fetch and no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ENDPOINTS, ESTIMATES, createBudget, createClient, loadCredentials, firstItems,
  BudgetExceeded, PaymentRequired, DataForSeoError,
} from '../../tools/outreach/dataforseo.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

function fakeFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const fn = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    const resolved = typeof next === 'function' ? next(url, init) : next;
    if (resolved instanceof Error) throw resolved;
    const { status = 200, body, headers = {} } = resolved;
    return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

const ok = (cost, extra = {}) => ({ body: { status_code: 20000, status_message: 'Ok.', cost, tasks: [{ status_code: 20000, cost, result: [{ items: [] }] }], ...extra } });
const noSleep = async () => {};
const client = (fetch, budget = 3, sleep = noSleep) => createClient({ login: 'fictief-login', password: 'fictief-wachtwoord', fetch, budget, sleep });

test('price estimates: maps live $0.002, business info live and reviews priority per 10 reviews', () => {
  assert.equal(ESTIMATES[ENDPOINTS.mapsLive], 0.002);
  assert.equal(ESTIMATES[ENDPOINTS.businessInfoLive], 0.0054);
  assert.equal(ESTIMATES[ENDPOINTS.reviewsTaskPost], 0.0015);
  assert.equal(ESTIMATES[ENDPOINTS.reviewsTasksReady], 0);
});

test('post sends Basic auth, JSON tasks and the v3 URL, and returns the parsed body', async () => {
  const fetch = fakeFetch([{ body: fixture('maps-serp') }]);
  const res = await client(fetch).post(ENDPOINTS.mapsLive, [{ keyword: 'pasta den haag' }]);
  const [call] = fetch.calls;
  assert.equal(call.url, 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers.Authorization, `Basic ${Buffer.from('fictief-login:fictief-wachtwoord').toString('base64')}`);
  assert.equal(call.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(call.body, [{ keyword: 'pasta den haag' }]);
  assert.equal(firstItems(res).length, 6);
});

test('get sends a GET with auth and no body', async () => {
  const fetch = fakeFetch([ok(0)]);
  await client(fetch).get(`${ENDPOINTS.reviewsTaskGet}/abc`);
  assert.equal(fetch.calls[0].url, 'https://api.dataforseo.com/v3/business_data/google/reviews/task_get/abc');
  assert.equal(fetch.calls[0].init.method, 'GET');
  assert.equal(fetch.calls[0].body, undefined);
  assert.match(fetch.calls[0].init.headers.Authorization, /^Basic /);
});

test('the meter sums each response cost field', async () => {
  const fetch = fakeFetch([{ body: fixture('business-info') }, { body: fixture('maps-serp') }]);
  const c = client(fetch);
  await c.post(ENDPOINTS.businessInfoLive, [{ keyword: 'cid:1' }]);
  await c.post(ENDPOINTS.mapsLive, [{ keyword: 'x' }]);
  assert.ok(Math.abs(c.budget.spent - 0.0074) < 1e-9);
});

test('a response without a cost field is charged its estimate', async () => {
  const fetch = fakeFetch([{ body: fixture('maps-serp-multilocation') }]);
  const c = client(fetch);
  await c.post(ENDPOINTS.mapsLive, [{ keyword: 'x' }, { keyword: 'y' }]);
  assert.ok(Math.abs(c.budget.spent - 0.004) < 1e-9);
});

test('BudgetExceeded once spent + estimate > budget, and no request is made', async () => {
  const fetch = fakeFetch([ok(0.002)]);
  const c = client(fetch, 0.005);
  await c.post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]);
  await c.post(ENDPOINTS.mapsLive, [{ keyword: 'b' }]);
  assert.equal(fetch.calls.length, 2);
  await assert.rejects(c.post(ENDPOINTS.mapsLive, [{ keyword: 'c' }]), BudgetExceeded);
  assert.equal(fetch.calls.length, 2);
  await assert.rejects(c.post(ENDPOINTS.reviewsTaskPost, Array.from({ length: 4 }, () => ({ cid: '1' }))), (err) => err instanceof BudgetExceeded && err.name === 'BudgetExceeded');
});

test('free calls still run when the budget is exactly spent', async () => {
  const fetch = fakeFetch([ok(0.002), ok(0)]);
  const c = client(fetch, 0.002);
  await c.post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]);
  await c.get(ENDPOINTS.reviewsTasksReady);
  assert.equal(fetch.calls.length, 2);
});

test('createBudget is shared: other spend (Anthropic) counts against the same limit', async () => {
  const budget = createBudget(0.01);
  budget.charge(0.009);
  const c = createClient({ login: 'l', password: 'p', fetch: fakeFetch([ok(0.002)]), budget });
  await assert.rejects(c.post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), BudgetExceeded);
  assert.equal(budget.remaining, 0.01 - 0.009);
  assert.throws(() => budget.check(0.002), BudgetExceeded);
  assert.doesNotThrow(() => budget.check(0.001));
});

test('HTTP 402 is PaymentRequired', async () => {
  const fetch = fakeFetch([{ status: 402, body: { status_code: 40200, status_message: 'Payment Required.' } }]);
  await assert.rejects(client(fetch).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), PaymentRequired);
});

test('top-level or task status 40200 / 40210 is PaymentRequired', async () => {
  for (const code of [40200, 40210]) {
    const top = fakeFetch([{ body: { status_code: code, status_message: 'Payment Required.', cost: 0, tasks: [] } }]);
    await assert.rejects(client(top).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), PaymentRequired, `top ${code}`);
    const task = fakeFetch([{ body: { status_code: 20000, cost: 0, tasks: [{ status_code: code, status_message: 'Insufficient funds.' }] } }]);
    await assert.rejects(client(task).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), PaymentRequired, `task ${code}`);
  }
});

test('other HTTP and top-level errors are DataForSeoError and never contain the credentials', async () => {
  const http = fakeFetch([{ status: 500, body: {} }]);
  await assert.rejects(client(http).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), (err) => {
    assert.ok(err instanceof DataForSeoError);
    assert.equal(err.status, 500);
    assert.doesNotMatch(String(err.message), /fictief-(login|wachtwoord)/);
    return true;
  });
  const top = fakeFetch([{ body: { status_code: 40100, status_message: 'You are not authorized.' } }]);
  await assert.rejects(client(top).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), (err) => err instanceof DataForSeoError && err.code === 40100);
});

test('createClient needs login and password', () => {
  assert.throws(() => createClient({ login: '', password: 'p', fetch: fakeFetch([ok(0)]) }), /credentials/i);
});

test('loadCredentials reads both Keychain items with security find-generic-password', async () => {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args]);
    return { stdout: args.includes('dataforseo-login') ? 'fictief-login\n' : 'fictief-wachtwoord\n' };
  };
  const creds = await loadCredentials({ run });
  assert.deepEqual(creds, { login: 'fictief-login', password: 'fictief-wachtwoord' });
  assert.deepEqual(calls, [
    ['security', 'find-generic-password', '-s', 'mcp', '-a', 'dataforseo-login', '-w'],
    ['security', 'find-generic-password', '-s', 'mcp', '-a', 'dataforseo-password', '-w'],
  ]);
});

test('loadCredentials names the missing item and leaks no output', async () => {
  const run = async (cmd, args) => {
    if (args.includes('dataforseo-login')) throw Object.assign(new Error('security: item not found'), { stdout: 'geheim' });
    return { stdout: 'p\n' };
  };
  await assert.rejects(loadCredentials({ run }), (err) => /mcp\/dataforseo-login/.test(err.message) && !/geheim/.test(err.message));
});

test('firstItems reads tasks[0].result[0].items, [] when absent', () => {
  assert.equal(firstItems(fixture('maps-serp')).length, 6);
  assert.deepEqual(firstItems({ tasks: [{ result: null }] }), []);
  assert.deepEqual(firstItems({}), []);
});

test('every request carries a 60 s abort signal', async () => {
  const fetch = fakeFetch([ok(0)]);
  await client(fetch).get(ENDPOINTS.reviewsTasksReady);
  assert.ok(fetch.calls[0].init.signal instanceof AbortSignal);
});

test('429 and 5xx are retried up to 2 times with backoff, honouring Retry-After', async () => {
  const sleeps = [];
  const sleep = async (ms) => { sleeps.push(ms); };
  const fetch = fakeFetch([{ status: 429, headers: { 'retry-after': '7' }, body: {} }, { status: 503, body: {} }, ok(0.002)]);
  const res = await client(fetch, 3, sleep).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]);
  assert.equal(res.status_code, 20000);
  assert.equal(fetch.calls.length, 3);
  assert.equal(sleeps[0], 7000);
  assert.equal(sleeps.length, 2);
});

test('a GET network error is retried', async () => {
  const fetch = fakeFetch([new TypeError('fetch failed'), ok(0)]);
  const res = await client(fetch).get(ENDPOINTS.reviewsTasksReady);
  assert.equal(res.status_code, 20000);
  assert.equal(fetch.calls.length, 2);
});

test('a POST network error is not retried (it may already be billed) and its estimate is charged', async () => {
  const fetch = fakeFetch([new TypeError('fetch failed'), ok(0.002)]);
  const c = client(fetch);
  await assert.rejects(c.post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), DataForSeoError);
  assert.equal(fetch.calls.length, 1);
  assert.ok(c.budget.spent > 0);
});

test('a persistent 5xx gives up after 2 retries as DataForSeoError', async () => {
  const fetch = fakeFetch([{ status: 503, body: {} }]);
  await assert.rejects(client(fetch).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), (err) => err instanceof DataForSeoError && err.status === 503);
  assert.equal(fetch.calls.length, 3);
});

test('a GET network error after retries is a DataForSeoError', async () => {
  const fetch = fakeFetch([new TypeError('fetch failed')]);
  await assert.rejects(client(fetch).get(ENDPOINTS.reviewsTasksReady), DataForSeoError);
  assert.equal(fetch.calls.length, 3);
});

test('a transient 402 / 40200 is retried before PaymentRequired', async () => {
  const fetch = fakeFetch([{ status: 402, body: { status_code: 40200 } }, { body: { status_code: 40200, status_message: 'Payment Required.', tasks: [] } }, ok(0.002)]);
  const res = await client(fetch).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]);
  assert.equal(res.status_code, 20000);
  assert.equal(fetch.calls.length, 3);
  const always = fakeFetch([{ status: 402, body: { status_code: 40200 } }]);
  await assert.rejects(client(always).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), PaymentRequired);
  assert.equal(always.calls.length, 3);
});

test('a 4xx that is not 402 or 429 is not retried', async () => {
  const fetch = fakeFetch([{ status: 401, body: {} }]);
  await assert.rejects(client(fetch).post(ENDPOINTS.mapsLive, [{ keyword: 'a' }]), DataForSeoError);
  assert.equal(fetch.calls.length, 1);
});
