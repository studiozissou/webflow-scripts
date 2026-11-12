// Fetches the newest Google reviews for many profiles as one async DataForSEO batch, polling until done or 10 minutes pass, and marks unfinished ones unknown.
import { BudgetExceeded, ENDPOINTS, PaymentRequired, firstItems } from './dataforseo.js';

const DEBUG = process.env.DEBUG_OUTREACH === '1';

export const POLL_MS = 20_000;
export const TIMEOUT_MS = 600_000;

export const REVIEW_DEFAULTS = Object.freeze({
  location_name: 'The Hague,South Holland,Netherlands',
  language_code: 'nl',
  depth: 10,
  sort_by: 'newest',
  priority: 2,
});

const TASK_CREATED = 20100;
const unknown = (reason) => (reason ? { status: 'unknown', items: null, reason } : { status: 'unknown', items: null });
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(call) {
  try {
    return await call();
  } catch (err) {
    if (err instanceof BudgetExceeded || err instanceof PaymentRequired) throw err;
    DEBUG && console.log(`[reviews] ${err.message}`);
    return null;
  }
}

export async function fetchReviews({ client, cids, sleep = defaultSleep, now = Date.now, options = REVIEW_DEFAULTS }) {
  const out = {};
  const list = [...new Set((cids ?? []).map(String))];
  if (!list.length) return out;

  let posted;
  try {
    posted = await client.post(ENDPOINTS.reviewsTaskPost, list.map((cid) => ({ ...options, cid, tag: cid })));
  } catch (err) {
    if (err instanceof PaymentRequired) throw err;
    const why = err instanceof BudgetExceeded ? 'budget' : 'error';
    DEBUG && console.log(`[reviews] task_post failed: ${err.message}`);
    for (const cid of list) out[cid] = unknown(why);
    return out;
  }

  const pending = new Map();
  (posted.tasks ?? []).forEach((task, i) => {
    const cid = String(task?.data?.tag ?? list[i]);
    if (task?.status_code === TASK_CREATED && task.id) pending.set(task.id, cid);
  });
  for (const cid of list) out[cid] = unknown();

  const start = now();
  for (let polls = 0; pending.size && polls < TIMEOUT_MS / POLL_MS && now() - start < TIMEOUT_MS; polls += 1) {
    await sleep(POLL_MS);
    const ready = await attempt(() => client.get(ENDPOINTS.reviewsTasksReady));
    const ids = (ready?.tasks ?? []).flatMap((t) => t?.result ?? []).map((r) => r?.id).filter((id) => pending.has(id));
    for (const id of ids) {
      const cid = pending.get(id);
      pending.delete(id);
      const got = await attempt(() => client.get(`${ENDPOINTS.reviewsTaskGet}/${id}`));
      if (got?.tasks?.[0]?.status_code === 20000) out[cid] = { status: 'ok', items: firstItems(got) };
    }
  }
  DEBUG && console.log(`[reviews] ${list.length - pending.size}/${list.length} finished, ${pending.size} unknown`);
  return out;
}
