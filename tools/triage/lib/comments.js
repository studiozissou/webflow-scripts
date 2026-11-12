// Write gate for automatic Notion comments (P4 doer and auto context): allowComment() passes only a task id listed in snapshot.tasks with a source id that a Node collector produced (sessions[].id and aliases, worktrees[].id, prs[].id, specs[].id), at most one comment per task per Amsterdam day across the shared comments.jsonl ledger (learnings rows included) and never the same task and source twice; recordComment() appends the ledger line after Notion accepts the comment.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './jobs.js';
import { amsterdamDate, toMs } from './workdays.js';
import { bareId } from '../../notion/client.js';

const DEBUG = false;

export const DEFAULT_COMMENTS_DIR = join(REPO_ROOT, '.claude/triage');
export const LEDGER_FILE = 'comments.jsonl';
const COLLECTOR_LISTS = ['sessions', 'worktrees', 'prs', 'specs'];

export function readLedger(dir) {
  let text;
  try {
    text = readFileSync(join(dir, LEDGER_FILE), 'utf8');
  } catch {
    return [];
  }
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row.taskId === 'string') rows.push(row);
    } catch {
      DEBUG && console.log('bad ledger line');
    }
  }
  return rows;
}

export function sourceIds(snapshot) {
  const ids = new Set();
  for (const list of COLLECTOR_LISTS) {
    for (const item of Array.isArray(snapshot?.[list]) ? snapshot[list] : []) {
      if (typeof item?.id === 'string' && item.id) ids.add(item.id);
      for (const alias of Array.isArray(item?.aliases) ? item.aliases : []) if (typeof alias === 'string' && alias) ids.add(alias);
    }
  }
  return ids;
}

const dayOf = (at) => (Number.isFinite(toMs(at)) ? amsterdamDate(at) : null);

export function allowComment({ taskId, sourceId } = {}, snapshot, ledgerDir, now = new Date()) {
  if (!Array.isArray(snapshot?.tasks)) return { ok: false, reason: 'no-snapshot' };
  if (typeof taskId !== 'string' || !snapshot.tasks.some((t) => typeof t?.id === 'string' && bareId(t.id) === bareId(taskId))) return { ok: false, reason: 'task-not-in-snapshot' };
  if (typeof sourceId !== 'string' || !sourceIds(snapshot).has(sourceId)) return { ok: false, reason: 'source-not-in-snapshot' };
  const today = amsterdamDate(now);
  const rows = readLedger(ledgerDir).filter((r) => bareId(r.taskId) === bareId(taskId));
  if (rows.some((r) => dayOf(r.at) === today)) return { ok: false, reason: 'already-commented-today' };
  if (rows.some((r) => r.sourceId === sourceId)) return { ok: false, reason: 'already-commented-for-source' };
  return { ok: true };
}

export function recordComment({ taskId, sourceId }, ledgerDir, now = new Date()) {
  mkdirSync(ledgerDir, { recursive: true });
  const at = new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z');
  appendFileSync(join(ledgerDir, LEDGER_FILE), `${JSON.stringify({ taskId, source: 'doer', sourceId, at })}\n`);
}
