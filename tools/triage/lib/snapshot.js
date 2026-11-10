// Daily world snapshot for triage: world/<Amsterdam date>.json built from the sessions.js collectors, written atomically by writeAtomic() (temp file + rename, also used by learnings-cli.js) under a lock claimed with jobs.js claim/release (a lock older than 2 minutes counts as abandoned), read back by date, flagged stale after 3 hours, and updated by addRemote() with the cloud and Remote Control sessions the model lists in-run. A re-collect on the same day keeps the remote sessions and tasks it already had.
import { readFileSync, renameSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO_ROOT, claim, release } from './jobs.js';
import { amsterdamDate } from './workdays.js';
import { collectAll, defaultRoots, merge, remoteItems } from './sessions.js';

export const DEFAULT_WORLD_DIR = join(REPO_ROOT, '.claude/triage/world');
export const STALE_MS = 3 * 3_600_000;
export const LOCK_STALE_MS = 2 * 60_000;
const LOCK = 'lock';
export const REMOTE_KINDS = new Set(['cloud', 'remote']);

export function snapshotPath(dir, now = new Date()) {
  return join(dir, `${amsterdamDate(now)}.json`);
}

export function readSnapshot(dir, now = new Date()) {
  try {
    return JSON.parse(readFileSync(snapshotPath(dir, now), 'utf8'));
  } catch {
    return null;
  }
}

// Atomic: readers see the old file or the new one, never half of one. The temp file sits
// next to the target so the rename stays on one filesystem.
export function writeAtomic(path, text) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const temp = join(dir, `.${process.pid}.${Date.now()}.tmp`);
  try {
    writeFileSync(temp, text);
    renameSync(temp, path);
  } catch (err) {
    rmSync(temp, { force: true });
    throw err;
  }
  return path;
}

export function writeSnapshot(dir, snapshot) {
  return writeAtomic(snapshotPath(dir, snapshot.generatedAt ?? new Date()), `${JSON.stringify(snapshot, null, 2)}\n`);
}

// Age of a held lock from its meta.json, or from the lock dir itself while meta.json is not written yet.
function lockAge(dir) {
  try {
    const { startedAt } = JSON.parse(readFileSync(join(dir, LOCK, 'meta.json'), 'utf8'));
    const at = Date.parse(startedAt);
    if (Number.isFinite(at)) return Date.now() - at;
  } catch {
    // Fall through to the directory time.
  }
  try {
    return Date.now() - statSync(join(dir, LOCK)).mtimeMs;
  } catch {
    return Infinity;
  }
}

export function withLock(dir, fn, { staleMs = LOCK_STALE_MS } = {}) {
  const take = () => claim(dir, LOCK, { startedAt: new Date().toISOString(), owner: process.pid });
  let held = take();
  if (!held.ok && !(lockAge(dir) < staleMs)) {
    release(dir, LOCK);
    held = take();
  }
  if (!held.ok) return { ok: false, reason: 'locked' };
  try {
    return { ok: true, value: fn() };
  } finally {
    release(dir, LOCK);
  }
}

export function isStale(snapshot, now = new Date(), maxAgeMs = STALE_MS) {
  const at = Date.parse(snapshot?.generatedAt);
  if (!Number.isFinite(at)) return true;
  return new Date(now).getTime() - at > maxAgeMs;
}

export function buildSnapshot({ now = new Date(), roots = defaultRoots(), exec, exists, collectors, tasks = [], goals = [] } = {}) {
  const generatedAt = new Date(now).toISOString();
  const world = collectAll(roots, { now: generatedAt, ...(exec ? { exec } : {}), ...(exists ? { exists } : {}), ...(collectors ? { collectors } : {}) });
  return {
    generatedAt,
    date: amsterdamDate(generatedAt),
    sources: { ...world.sources, remote: 'unavailable' },
    errors: world.errors,
    sessions: world.sessions,
    worktrees: world.worktrees,
    prs: world.prs,
    specs: world.specs,
    tasks: Array.isArray(tasks) ? tasks : [],
    goals: Array.isArray(goals) ? goals : [],
    plans: [],
  };
}

// list: the model's reshaped session list, or null when listing failed in this run.
export function addRemote(snapshot, list) {
  if (list == null) return { ...snapshot, sources: { ...snapshot.sources, remote: 'unavailable' } };
  const local = (snapshot.sessions ?? []).filter((s) => !REMOTE_KINDS.has(s.kind));
  return {
    ...snapshot,
    sources: { ...snapshot.sources, remote: 'ok' },
    sessions: merge([...local, ...remoteItems(list)], { tasks: snapshot.tasks ?? [] }),
  };
}

export function collectSnapshot({ dir = DEFAULT_WORLD_DIR, now = new Date(), tasks, ...options } = {}) {
  const locked = withLock(dir, () => {
    const previous = readSnapshot(dir, now);
    const next = buildSnapshot({ now, tasks: tasks ?? previous?.tasks ?? [], goals: previous?.goals ?? [], ...options });
    const remote = (previous?.sessions ?? []).filter((s) => REMOTE_KINDS.has(s.kind));
    if (previous?.sources?.remote === 'ok') {
      next.sessions = [...next.sessions, ...remote];
      next.sources.remote = 'ok';
    }
    return { ok: true, path: writeSnapshot(dir, next), snapshot: next };
  });
  return locked.ok ? locked.value : locked;
}
