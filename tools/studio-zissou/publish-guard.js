// Pure ADR-003 publish guard for the Studio Zissou growth review: decides whether queued AUTO changes may go live and returns stable reason codes.
export const MAX_AUTO = 5;
export const MIN_DAYS_BETWEEN = 28;

const DAY_MS = 86_400_000;

function pageOf(entry) {
  return typeof entry === 'string' ? entry : entry?.page;
}

function daysBetween(from, to) {
  return Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

function normalise(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!/^[[{]/.test(trimmed)) return trimmed;
  try {
    return JSON.stringify(canonical(JSON.parse(trimmed)));
  } catch {
    return trimmed;
  }
}

function readBackFails(r) {
  if (r?.actual === undefined || r.actual === null || r.actual === '') return true;
  return normalise(r.expected) !== normalise(r.actual);
}

export function canAutoPublish({ site, log, readBacks, lint, queue, today } = {}) {
  const reasons = [];
  const complete = Array.isArray(log?.changes) && Array.isArray(readBacks) && readBacks.length > 0
    && Array.isArray(queue) && queue.length > 0 && !Number.isNaN(Date.parse(today));
  const changes = Array.isArray(log?.changes) ? log.changes : [];
  const items = Array.isArray(queue) ? queue : [];
  const queuedIds = new Set(items.map((q) => q.id).filter(Boolean));
  const queuedPages = new Set(items.map((q) => q.page));
  const experiments = new Set((log?.activeExperiments ?? []).map(pageOf));
  const updated = Date.parse(site?.lastUpdated);
  const published = Date.parse(site?.lastPublished);

  if (Number.isNaN(updated) || Number.isNaN(published) || updated > published) reasons.push('foreign-unpublished');
  if (changes.some((c) => c.tier === 'review' && c.status === 'pending')) reasons.push('review-pending');
  if ((readBacks ?? []).some(readBackFails)) reasons.push('readback-mismatch');
  if (lint?.localeGuard !== 0) reasons.push('locale-guard-failed');
  if (lint?.linkLintContent !== 0 || lint?.linkLintSite !== 0) reasons.push('link-lint-failed');
  if (items.filter((q) => q.tier === 'auto').length > MAX_AUTO) reasons.push('too-many-auto');

  const recent = changes.some((c) => {
    if (!queuedPages.has(c.page) || queuedIds.has(c.id)) return false;
    const age = daysBetween(c.date, today);
    return Number.isNaN(age) || age < MIN_DAYS_BETWEEN;
  });
  if (recent) reasons.push('page-changed-recently');
  if ([...queuedPages].some((p) => experiments.has(p))) reasons.push('active-experiment');
  if (!complete) reasons.push('missing-input');

  return { ok: reasons.length === 0, reasons };
}
