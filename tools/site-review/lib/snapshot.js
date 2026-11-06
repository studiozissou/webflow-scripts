// Builds, writes, reads, finds and diffs the per-run snapshot that carries counts, health and finding IDs from month to month.

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { SCHEMA_VERSION } from '../config.js';
import { sha256 } from './finding.js';

const DATED = /^(\d{4}-\d{2}-\d{2})/;

export function stableStringify(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export const configHashOf = (crawlConfig) => sha256(stableStringify(crawlConfig ?? {}));

function dateOf(value) {
  if (typeof value === 'string' && DATED.test(value)) return value.slice(0, 10);
  const resolved = typeof value === 'function' ? value() : value;
  return (resolved == null ? new Date() : new Date(resolved)).toISOString().slice(0, 10);
}

const isCounted = (finding) => finding.state === 'fail' && !finding.transient && !finding.excludedFromParity;

const isFixedAfterLoad = (finding) =>
  finding.state === 'fail' && !finding.transient && (finding.tags ?? []).includes('fixed-after-load');

function tally(findings, predicate) {
  const counts = {};
  for (const finding of findings) if (predicate(finding)) counts[finding.taxonomyId] = (counts[finding.taxonomyId] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function templatesOf(facts) {
  const counts = {};
  for (const fact of facts ?? []) {
    const template = fact.wfPage ?? 'none';
    counts[template] = (counts[template] ?? 0) + 1;
  }
  return counts;
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildSnapshot({ url, client, facts, findings, health, sanity, stats, crawlConfig, toolVersion, now }) {
  const list = findings ?? [];
  return {
    schemaVersion: SCHEMA_VERSION,
    toolVersion: toolVersion ?? null,
    date: dateOf(now),
    url: url ?? null,
    client: client ?? null,
    configHash: configHashOf(crawlConfig),
    coverage: sanity?.coverage ?? null,
    health: health ?? null,
    templates: stats?.templates ?? templatesOf(facts),
    counts: tally(list, isCounted),
    countsFixedAfterLoad: tally(list, isFixedAfterLoad),
    findings: list
      .filter(isCounted)
      .map(({ id, taxonomyId, urlKey, targetKey }) => ({ id, taxonomyId, urlKey, targetKey: targetKey ?? null }))
      .sort(byId),
    checkedKeys: [...new Set((facts ?? []).filter((fact) => fact.fetchState === 'ok').map((fact) => fact.urlKey))].sort(),
    uncountedIds: [...new Set(list.filter((finding) => finding.state === 'unknown' || finding.transient).map((finding) => finding.id))].sort(),
  };
}

export function diffSnapshots(previous, current) {
  const before = new Map((previous?.findings ?? []).map((entry) => [entry.id, entry]));
  const after = new Map((current?.findings ?? []).map((entry) => [entry.id, entry]));
  const checked = current?.checkedKeys ? new Set(current.checkedKeys) : null;
  const uncounted = new Set(current?.uncountedIds ?? []);
  const verified = (entry) => !uncounted.has(entry.id) && (!checked || checked.has(entry.urlKey));
  const gone = [...before.values()].filter((entry) => !after.has(entry.id));
  const fixed = gone.filter(verified).sort(byId);
  const unverified = gone.filter((entry) => !verified(entry)).sort(byId);
  const stillOpen = [...after.values()].filter((entry) => before.has(entry.id)).sort(byId);
  const added = [...after.values()].filter((entry) => !before.has(entry.id)).sort(byId);
  const byType = {};
  const bump = (entry, bucket) => {
    byType[entry.taxonomyId] ??= { fixed: 0, stillOpen: 0, new: 0, unverified: 0 };
    byType[entry.taxonomyId][bucket] += 1;
  };
  fixed.forEach((entry) => bump(entry, 'fixed'));
  stillOpen.forEach((entry) => bump(entry, 'stillOpen'));
  added.forEach((entry) => bump(entry, 'new'));
  unverified.forEach((entry) => bump(entry, 'unverified'));
  return {
    fixed,
    stillOpen,
    new: added,
    unverified,
    byType: Object.fromEntries(Object.entries(byType).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export async function findPreviousSnapshot(dir, date) {
  const cutoff = dateOf(date);
  const parent = DATED.test(basename(dir)) ? dirname(dir) : dir;
  let names;
  try {
    names = await readdir(parent);
  } catch {
    return null;
  }
  const candidates = names
    .filter((name) => DATED.test(name) && name.match(DATED)[1] < cutoff)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  for (const name of candidates) {
    const path = join(parent, name, 'snapshot.json');
    try {
      if ((await stat(path)).isFile()) return path;
    } catch {}
  }
  return null;
}

export async function writeSnapshot(dir, snapshot) {
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'snapshot.json');
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return path;
}

export async function readSnapshot(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
