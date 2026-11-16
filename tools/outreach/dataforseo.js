// DataForSEO v3 client with Basic auth, a shared budget meter fed by each response's cost, distinct budget and payment errors, and Keychain credential loading.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const DEBUG = process.env.DEBUG_OUTREACH === '1';
const BASE_URL = 'https://api.dataforseo.com/v3';
const EPSILON = 1e-9;
const PAYMENT_CODES = new Set([40200, 40210]);
const TIMEOUT_MS = 60_000;
const RETRIES = 2;

export const ENDPOINTS = Object.freeze({
  mapsLive: 'serp/google/maps/live/advanced',
  businessInfoLive: 'business_data/google/my_business_info/live',
  reviewsTaskPost: 'business_data/google/reviews/task_post',
  reviewsTasksReady: 'business_data/google/reviews/tasks_ready',
  reviewsTaskGet: 'business_data/google/reviews/task_get',
});

export const ESTIMATES = Object.freeze({
  [ENDPOINTS.mapsLive]: 0.002,
  [ENDPOINTS.businessInfoLive]: 0.0054,
  [ENDPOINTS.reviewsTaskPost]: 0.0015,
  [ENDPOINTS.reviewsTasksReady]: 0,
  [ENDPOINTS.reviewsTaskGet]: 0,
});

export class DataForSeoError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message);
    this.name = 'DataForSeoError';
    this.status = status;
    this.code = code;
  }
}

export class PaymentRequired extends DataForSeoError {
  constructor(message, details) {
    super(message, details);
    this.name = 'PaymentRequired';
  }
}

export class BudgetExceeded extends Error {
  constructor({ spent, estimate, limit }) {
    super(`Budget reached: spent $${spent.toFixed(4)} + next call $${estimate.toFixed(4)} > $${limit.toFixed(2)}`);
    this.name = 'BudgetExceeded';
    this.spent = spent;
    this.estimate = estimate;
    this.limit = limit;
  }
}

export function createBudget(limit = Infinity) {
  let spent = 0;
  return {
    get limit() { return limit; },
    get spent() { return spent; },
    get remaining() { return limit - spent; },
    check(estimate) {
      if (spent + estimate > limit + EPSILON) throw new BudgetExceeded({ spent, estimate, limit });
    },
    charge(amount) {
      spent += Number(amount) || 0;
    },
  };
}

export const firstItems = (response) => response?.tasks?.[0]?.result?.[0]?.items ?? [];

const estimateFor = (endpoint, count) => (ESTIMATES[endpoint] ?? ESTIMATES[endpoint.split('/').slice(0, 4).join('/')] ?? 0) * count;

function assertOk(body, status) {
  if (status === 402) throw new PaymentRequired('DataForSEO: payment required (HTTP 402)', { status, code: body?.status_code ?? null });
  if (status < 200 || status >= 300) throw new DataForSeoError(`DataForSEO: HTTP ${status}`, { status });
  const code = body?.status_code;
  if (PAYMENT_CODES.has(code)) throw new PaymentRequired(`DataForSEO: payment required (${code})`, { status, code });
  if (code !== 20000) throw new DataForSeoError(`DataForSEO: ${code} ${body?.status_message ?? ''}`.trim(), { status, code });
  const unpaid = (body.tasks ?? []).find((t) => PAYMENT_CODES.has(t?.status_code));
  if (unpaid) throw new PaymentRequired(`DataForSEO: payment required (task ${unpaid.status_code})`, { status, code: unpaid.status_code });
}

const isTransient = (status, body) => status === 429 || status >= 500 || status === 402 || body?.status_code === 40200;

const backoffMs = (res, attempt) => {
  const retryAfter = Number(res?.headers?.get?.('retry-after'));
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
};

const defaultSleep = (ms) => new Promise((done) => setTimeout(done, ms));

export function createClient({ login, password, fetch = globalThis.fetch, budget = Infinity, baseUrl = BASE_URL, sleep = defaultSleep } = {}) {
  if (!login || !password) throw new Error('DataForSEO credentials missing');
  const meter = typeof budget === 'number' ? createBudget(budget) : budget;
  const authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

  async function request(method, endpoint, tasks) {
    const estimate = estimateFor(endpoint, tasks ? tasks.length : 1);
    for (let attempt = 0; ; attempt += 1) {
      meter.check(estimate);
      const init = { method, headers: { Authorization: authorization, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) };
      if (tasks) init.body = JSON.stringify(tasks);
      let res;
      let body;
      try {
        res = await fetch(`${baseUrl}/${endpoint}`, init);
        body = await res.json().catch(() => null);
      } catch (err) {
        DEBUG && console.log(`[dataforseo] ${method} ${endpoint} network error: ${err.message}`);
        if (method === 'GET' && attempt < RETRIES) {
          await sleep(backoffMs(null, attempt));
          continue;
        }
        if (method !== 'GET') meter.charge(estimate);
        throw new DataForSeoError(`DataForSEO: network error (${err.message})`);
      }
      if (body && typeof body.cost === 'number') meter.charge(body.cost);
      else if (res.ok && body?.status_code === 20000) meter.charge(estimate);
      DEBUG && console.log(`[dataforseo] ${method} ${endpoint} status=${res.status}/${body?.status_code ?? 'n/a'} cost=${body?.cost ?? 'n/a'} spent=${meter.spent.toFixed(4)}`);
      if (attempt < RETRIES && isTransient(res.status, body)) {
        await sleep(backoffMs(res, attempt));
        continue;
      }
      assertOk(body, res.status);
      return body;
    }
  }

  return {
    budget: meter,
    post: (endpoint, tasks) => request('POST', endpoint, tasks),
    get: (endpoint) => request('GET', endpoint, null),
  };
}

const defaultRun = promisify(execFile);

export async function loadCredentials({ run = defaultRun } = {}) {
  const read = async (account) => {
    try {
      const { stdout } = await run('security', ['find-generic-password', '-s', 'mcp', '-a', account, '-w']);
      const value = String(stdout).trim();
      if (!value) throw new Error('empty');
      return value;
    } catch {
      throw new Error(`Keychain item mcp/${account} not found or empty`);
    }
  };
  return { login: await read('dataforseo-login'), password: await read('dataforseo-password') };
}
