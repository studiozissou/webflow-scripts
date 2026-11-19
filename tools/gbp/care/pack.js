// Writes and updates the weekly care pack, a json source of truth plus a numbered markdown copy, each replaced atomically.
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

export const PACK_VERSION = 1;
export const APPROVABLE = 'drafted';
export const UNKNOWN = 'unknown — check by hand';
export const LANDED = new Set(['live', 'pending']);
export const DAY_MS = 86_400_000;

export const timeOf = (value) => Date.parse(value ?? '') || 0;

const PACK_FILE = /^gbp-(\d{4}-\d{2}-\d{2})(?:-([1-9]\d*))?\.json$/;
const OVERWRITABLE = new Set([APPROVABLE, 'not approvable']);
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const TYPE_LABELS = { reply: 'Reply', post: 'Post', hours: 'Hours' };
const INSIGHT_LABELS = [
  ['calls', 'Calls'],
  ['websiteClicks', 'Website clicks'],
  ['directionRequests', 'Direction requests'],
  ['impressions', 'Impressions'],
];

const pad = (value) => String(value).padStart(2, '0');

export function localDate(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function careDir(root, slug) {
  return join(root, 'projects', slug, '.claude', 'care');
}

export function fixtureCareDir(root, slug) {
  return join(root, '.claude', 'care', 'fixture-packs', 'projects', slug, '.claude', 'care');
}

export function globalOffPath(root) {
  return join(root, '.claude', 'care', 'gbp.off');
}

export function packPaths(dir, date, number = 1) {
  const name = number > 1 ? `gbp-${date}-${number}` : `gbp-${date}`;
  return { json: join(dir, `${name}.json`), md: join(dir, `${name}.md`) };
}

function writeAtomic(path, text) {
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temp, text, { mode: 0o600 });
    renameSync(temp, path);
  } catch (err) {
    rmSync(temp, { force: true });
    throw err;
  }
}

export function writePack(dir, pack, paths = packPaths(dir, pack.date)) {
  mkdirSync(dir, { recursive: true });
  writeAtomic(paths.json, `${JSON.stringify(pack, null, 2)}\n`);
  writeAtomic(paths.md, renderMarkdown(pack));
  return paths;
}

export function readPack(jsonPath) {
  return JSON.parse(readFileSync(jsonPath, 'utf8'));
}

export function updateItem(jsonPath, n, patch) {
  const pack = readPack(jsonPath);
  const index = pack.items.findIndex((item) => item.n === n);
  if (index === -1) throw new Error(`Pack ${basename(jsonPath)} has no item ${n}`);
  pack.items[index] = { ...pack.items[index], ...patch };
  writeAtomic(jsonPath, `${JSON.stringify(pack, null, 2)}\n`);
  writeAtomic(jsonPath.replace(/\.json$/, '.md'), renderMarkdown(pack));
  return pack;
}

function packEntries(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .map((name) => name.match(PACK_FILE))
    .filter(Boolean)
    .map((match) => ({ name: match[0], date: match[1], number: Number(match[2] ?? 1) }))
    .sort((a, b) => (a.date === b.date ? a.number - b.number : a.date < b.date ? -1 : 1));
}

function packFiles(dir, before) {
  return packEntries(dir)
    .filter((entry) => !before || entry.date < before)
    .map((entry) => entry.name);
}

export function recentPackPaths(dir, from) {
  return packEntries(dir)
    .filter((entry) => entry.date >= from)
    .map((entry) => join(dir, entry.name));
}

function overwritable(jsonPath) {
  try {
    const { items } = readPack(jsonPath);
    return Array.isArray(items) && items.every((item) => OVERWRITABLE.has(item?.state));
  } catch {
    return false;
  }
}

export function freePackPaths(dir, date) {
  const newest = packEntries(dir).filter((entry) => entry.date === date).at(-1);
  if (!newest) return packPaths(dir, date);
  if (overwritable(join(dir, newest.name))) return packPaths(dir, date, newest.number);
  return packPaths(dir, date, newest.number + 1);
}

export function latestPack(dir, before) {
  const files = packFiles(dir, before);
  return files.length === 0 ? null : join(dir, files.at(-1));
}

export function priorInsightMonths(dir, before) {
  const months = [];
  for (const name of packFiles(dir, before)) {
    let insights;
    try {
      insights = readPack(join(dir, name)).insights;
    } catch {
      continue;
    }
    if (insights && typeof insights === 'object' && !insights.unavailable && insights.month) {
      months.push(insights.month);
    }
  }
  return months;
}

export function quote(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  return lines.map((line) => {
    const clean = line.replace(LIST_MARKER, '').trimEnd();
    return clean ? `> ${clean}` : '>';
  });
}

const signed = (value) => (value > 0 ? `+${value}` : String(value));

function renderReview(review) {
  if (!review) return [];
  const stars = review.starRating ?? 'unknown';
  if (review.starOnly) return [`Review: ${stars} stars, no text.`, ''];
  return [`Review: ${stars} stars.`, '', ...quote(review.text), ''];
}

function renderIntent(item) {
  if (item.type === 'reply') {
    return item.intent?.comment ? ['Draft reply:', '', ...quote(item.intent.comment), ''] : [];
  }
  if (item.type === 'post') {
    const lines = item.intent?.summary
      ? [`Draft post (${item.intent.languageCode ?? '?'}):`, '', ...quote(item.intent.summary), '']
      : [];
    const button = item.intent?.button;
    if (button) lines.push(`Button: ${button.actionType}${button.url ? ` ${button.url}` : ''}`, '');
    return lines;
  }
  if (item.type === 'hours') {
    return item.changes?.length
      ? ['Before -> after:', '', ...item.changes.map((line) => `- ${line}`), '']
      : [];
  }
  return [];
}

function renderItem(item) {
  const lines = [`## ${item.n}. ${TYPE_LABELS[item.type] ?? item.type}: ${item.state}`, ''];
  if (item.reason) lines.push(`Reason: ${item.reason}`, '');
  lines.push(...renderReview(item.review), ...renderIntent(item));
  if (item.problems?.length) {
    lines.push('Problems:', '', ...item.problems.map((problem) => `- ${problem}`), '');
  }
  if (item.message) lines.push(`Result: ${item.message}`, '');
  return lines;
}

function renderInsights(insights) {
  if (!insights) return [];
  if (insights.unavailable) {
    return [`## Insights ${insights.month}: unavailable (${insights.unavailable})`, ''];
  }
  const lines = [`## Insights ${insights.month}`, ''];
  for (const [key, label] of INSIGHT_LABELS) {
    const change = insights.change?.[key];
    lines.push(`- ${label}: ${insights[key] ?? 0}${change === undefined ? '' : ` (${signed(change)})`}`);
  }
  if (insights.totalReviewCount !== undefined) {
    lines.push(`- Reviews: ${insights.totalReviewCount}`);
    lines.push(`- Average rating: ${insights.averageRating ?? 'none'}`);
  }
  lines.push('');
  return lines;
}

const listSection = (title, entries) =>
  entries?.length ? [`## ${title}`, '', ...entries.map((entry) => `- ${entry}`), ''] : [];

export function renderMarkdown(pack) {
  const title = pack.location?.title ?? pack.slug;
  const lines = [
    `# GBP care pack: ${title} (${pack.slug}), ${pack.date}`,
    '',
    `Created ${pack.createdAt}. Location ${pack.location?.name ?? 'unknown'}.`,
    '',
  ];
  if (pack.paused) {
    lines.push(`Paused: ${pack.paused.reason}. No drafts this week.`, '');
  } else if (pack.items.length === 0) {
    lines.push('Nothing to approve this week.', '');
  }
  for (const item of pack.items) lines.push(...renderItem(item));
  lines.push(
    ...listSection('Owner checks', pack.ownerChecks),
    ...listSection('Notes', pack.notes),
    ...renderInsights(pack.insights),
    `Apply: \`npm run gbp:approve -- ${pack.slug} <n…|all>\``,
    '',
  );
  return lines.join('\n');
}
