// Applies the pack items Will picks: re-checks consent, freshness, text and live state, then previews and applies each one through the change gate.
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { redact } from '../auth.js';
import { createChanges, sameFieldValue } from '../changes.js';
import { getLocation, getReview, listPosts } from '../client.js';
import { draftTextProblems } from './claim-lint.js';
import { APPROVABLE, DAY_MS, LANDED, UNKNOWN, latestPack, timeOf, readPack, updateItem } from './pack.js';

export const SEND_GAP_MS = 7000;
export const MAX_PACK_AGE_MS = 7 * DAY_MS;
export const LOCK_GRACE_MS = 10_000;

const SCOPE = { reply: 'replies', post: 'posts', hours: 'hours' };
const HOURS_FIELDS = ['regularHours', 'specialHours'];
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code !== 'ESRCH';
  }
}

function lockAge(lock, now) {
  try {
    return now() - statSync(lock).mtimeMs;
  } catch {
    return Infinity;
  }
}

export function takeLock(lockRoot, slug, { pid = process.pid, isAlive = pidAlive, now = Date.now } = {}) {
  mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
  const lock = join(lockRoot, `${slug}.approve.lock`);
  try {
    mkdirSync(lock);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    let holder;
    try {
      holder = Number.parseInt(readFileSync(join(lock, 'pid'), 'utf8'), 10);
    } catch {
      holder = NaN;
    }
    if (Number.isInteger(holder) && holder > 0) {
      if (isAlive(holder)) return null;
    } else if (lockAge(lock, now) < LOCK_GRACE_MS) {
      return null;
    }
    rmSync(lock, { recursive: true, force: true });
    try {
      mkdirSync(lock);
    } catch {
      return null;
    }
  }
  writeFileSync(join(lock, 'pid'), String(pid));
  return () => rmSync(lock, { recursive: true, force: true });
}

function textProblems(item, config) {
  if (item.type === 'hours') return [];
  const text = item.type === 'reply' ? item.intent?.comment : item.intent?.summary;
  return draftTextProblems(item.type, text, config);
}

async function liveDifference(ctx, pack, item) {
  if (item.type === 'reply') {
    const review = await getReview(ctx, pack.location.v4Name, item.intent.reviewId);
    return review.reviewReply ? 'the review already has a reply on Google' : null;
  }
  if (item.type === 'hours') {
    const current = await getLocation(ctx, pack.location.name);
    const same = HOURS_FIELDS.every((field) => sameFieldValue(field, current[field], item.before?.[field]));
    return same ? null : 'the hours on Google changed since the pack';
  }
  const posts = await listPosts(ctx, pack.location.v4Name);
  const latest = item.before?.latestPostCreateTime ?? null;
  const newer = posts.some(
    (post) =>
      timeOf(post.createTime) > timeOf(pack.createdAt) ||
      latest === null ||
      timeOf(post.createTime) > timeOf(latest),
  );
  return newer ? 'Google shows a newer post than the pack' : null;
}

async function preview(changes, pack, item) {
  const location = pack.location.name;
  if (item.type === 'reply') {
    return changes.previewReviewReply({ location, reviewId: item.intent.reviewId, comment: item.intent.comment });
  }
  if (item.type === 'post') {
    const { summary, languageCode, button } = item.intent;
    return changes.previewPost({ location, summary, languageCode, ...(button ? { button } : {}) });
  }
  return changes.previewLocationEdit({ location, edits: item.intent.edits });
}

function packRefusal({ config, dir, globalOff, now }) {
  if (!config.consent) return { reason: 'client consent missing' };
  if ([globalOff, join(dir, 'gbp.off')].some((path) => path && existsSync(path))) {
    return { reason: 'a kill switch is on (gbp.off)' };
  }
  const jsonPath = latestPack(dir);
  if (!jsonPath) return { reason: 'no pack found; run gbp:care first' };
  let pack;
  try {
    pack = readPack(jsonPath);
  } catch (err) {
    return { reason: `pack unreadable: ${err.message}` };
  }
  if (pack.paused) return { reason: 'the latest pack is paused' };
  const age = now() - timeOf(pack.createdAt);
  if (!pack.createdAt || age > MAX_PACK_AGE_MS) return { reason: 'the latest pack is older than 7 days; run gbp:care again' };
  return { jsonPath, pack };
}

function selectItems(pack, selection) {
  if (selection === 'all') {
    return pack.items.filter((item) => item.state === APPROVABLE || item.state === 'applying').map((item) => item.n);
  }
  return selection;
}

export async function approveItems({
  slug,
  selection,
  config,
  ctx,
  dir,
  globalOff,
  lockRoot,
  logPath,
  now = Date.now,
  sleep = defaultSleep,
  writer = () => {},
  pidAlive: isAlive = pidAlive,
  secrets = [],
}) {
  const release = takeLock(lockRoot, slug, { isAlive });
  if (!release) return { refused: 'another approve holds the lock', results: [] };
  try {
    const checked = packRefusal({ config, dir, globalOff, now });
    if (checked.reason) return { refused: checked.reason, results: [] };
    const { jsonPath } = checked;
    let { pack } = checked;
    const changes = createChanges({ ctx, now, secrets, ...(logPath ? { logPath } : {}) });
    const results = [];
    let sent = false;

    const record = (n, type, state, extra = {}) => {
      const result = { n, type, state, ...extra };
      results.push(result);
      writer(`#${n} ${type}: ${state}${extra.reason ? ` (${extra.reason})` : ''}\n`);
      return result;
    };
    const save = (n, patch) => {
      try {
        pack = updateItem(jsonPath, n, patch);
        return true;
      } catch (err) {
        writer(`#${n}: could not update the pack: ${err.message}\n`);
        return false;
      }
    };
    const refuseItem = (item, reason) => {
      save(item.n, { state: 'refused', reason });
      return record(item.n, item.type, 'refused', { reason });
    };

    for (const n of selectItems(pack, selection)) {
      const item = pack.items.find((entry) => entry.n === n);
      if (!item) {
        record(n, 'unknown', 'refused', { reason: `no item ${n} in the pack` });
        continue;
      }
      if (item.state === 'applying') {
        const reason = 'found in applying; the send may have happened, so it is never re-sent';
        save(n, { state: UNKNOWN, reason });
        record(n, item.type, UNKNOWN, { reason });
        continue;
      }
      if (item.state !== APPROVABLE) {
        record(n, item.type, 'refused', { reason: `item state is ${item.state}, not ${APPROVABLE}` });
        continue;
      }
      if (!config.consent.scope.includes(SCOPE[item.type])) {
        refuseItem(item, `${SCOPE[item.type]} are outside the consent scope`);
        continue;
      }
      const problems = textProblems(item, config);
      if (problems.length > 0) {
        refuseItem(item, `re-check failed: ${problems.join('; ')}`);
        continue;
      }
      let difference;
      try {
        difference = await liveDifference(ctx, pack, item);
      } catch (err) {
        refuseItem(item, `could not re-read Google: ${redact(err.message, secrets)}`);
        continue;
      }
      if (difference) {
        refuseItem(item, difference);
        continue;
      }

      if (sent) await sleep(SEND_GAP_MS);
      if (!save(n, { state: 'applying' })) {
        record(n, item.type, 'refused', { reason: 'could not mark the item applying, so nothing was sent' });
        continue;
      }

      let previewed;
      try {
        previewed = await preview(changes, pack, item);
      } catch (err) {
        refuseItem(item, `preview failed: ${redact(err.message, secrets)}`);
        continue;
      }
      if (previewed.valid === false) {
        refuseItem(item, `Google rejects: ${previewed.error}`);
        continue;
      }
      let result;
      try {
        result = await changes.apply({ previewId: previewed.previewId, confirmText: previewed.confirmText });
      } catch (err) {
        sent = true;
        const reason = `apply failed after it started: ${redact(err.message, secrets)}`;
        save(n, { state: UNKNOWN, reason });
        record(n, item.type, UNKNOWN, { reason });
        continue;
      }

      if (result.status === 'refused') {
        refuseItem(item, `${result.reason}: ${result.message}`);
        continue;
      }
      sent = true;
      const patch = {
        state: result.status,
        ...(result.outcome ? { outcome: result.outcome } : {}),
        ...(result.message ? { message: result.message } : {}),
      };
      save(n, patch);
      record(n, item.type, result.status, LANDED.has(result.status) ? {} : { reason: result.message });
    }
    return { refused: null, results };
  } finally {
    release();
  }
}
