// Goal-fit keep state, .claude/triage/goals-state.json as { kept: [{ taskId, until, at }] }: loadState() (missing or corrupt reads as no keeps), saveState() through writeAtomic, keep() (30 days, one entry per task) and isKept(); expired entries are pruned on load and keep.
import { join } from 'node:path';
import { readJsonFile } from './cli-io.js';
import { writeAtomic } from './snapshot.js';
import { DAY_MS, toMs } from './workdays.js';

export const KEEP_DAYS = 30;
export const STATE_FILE = 'goals-state.json';
const validEntry = (e) => e && typeof e.taskId === 'string' && Number.isFinite(toMs(e.until));

function prune(kept, now) {
  const at = toMs(now);
  return kept.filter((e) => validEntry(e) && toMs(e.until) > at);
}

export function loadState(dir, { now = new Date() } = {}) {
  const kept = readJsonFile(join(dir, STATE_FILE))?.kept;
  return { kept: Array.isArray(kept) ? prune(kept, now) : [] };
}

export function saveState(dir, state) {
  return writeAtomic(join(dir, STATE_FILE), `${JSON.stringify({ kept: state?.kept ?? [] }, null, 2)}\n`);
}

export function keep(state, taskId, now = new Date()) {
  const at = new Date(now).toISOString();
  const until = new Date(toMs(now) + KEEP_DAYS * DAY_MS).toISOString();
  const others = prune(state?.kept ?? [], now).filter((e) => e.taskId !== taskId);
  return { kept: [...others, { taskId, until, at }] };
}

export function isKept(state, taskId, now = new Date()) {
  return prune(state?.kept ?? [], now).some((e) => e.taskId === taskId);
}
