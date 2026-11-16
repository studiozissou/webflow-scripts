// Prospect state: candidate dedupe, the 30-day rescan plan, status protection and the state file.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { normaliseDomain } from './text.js';

export const RESCAN_DAYS = 30;

const DAY_MS = 86_400_000;

export function dedupeCandidates(candidates) {
  const byDomain = new Map();
  for (const c of candidates) {
    const domain = normaliseDomain(c.domain ?? c.url);
    if (!domain) continue;
    const existing = byDomain.get(domain);
    if (!existing || (existing.source !== 'seed' && c.source === 'seed')) byDomain.set(domain, { ...c, domain });
  }
  return [...byDomain.values()];
}

export function isProtected(status) {
  return Boolean(status) && status !== 'New';
}

export function planScan(state, candidates, { now = new Date(), forceRescan = false } = {}) {
  return dedupeCandidates(candidates).map((candidate) => {
    const { domain } = candidate;
    const entry = state.prospects?.[domain];
    const row = (action, reason) => ({ domain, action, reason, candidate });
    if (!entry) return row('scan', 'new');
    if (entry.status === 'Do not contact') return row('skip', 'do-not-contact');
    if (isProtected(entry.status)) return row('touch', 'protected');
    if (forceRescan) return row('scan', 'forced');
    const age = entry.lastScanned ? (now.getTime() - new Date(entry.lastScanned).getTime()) / DAY_MS : Infinity;
    return age >= RESCAN_DAYS ? row('scan', 'stale') : row('touch', 'recent');
  });
}

function withEntry(state, domain, entry) {
  return { ...state, prospects: { ...state.prospects, [domain]: entry } };
}

export function recordScan(state, result, { now = new Date(), run } = {}) {
  const domain = normaliseDomain(result.domain);
  const existing = state.prospects?.[domain];
  if (existing && isProtected(existing.status)) return withEntry(state, domain, { ...existing, run });
  return withEntry(state, domain, {
    domain,
    source: result.source ?? existing?.source ?? null,
    cid: result.cid ?? existing?.cid ?? null,
    verdict: result.verdict ?? null,
    status: 'New',
    lastScanned: now.toISOString(),
    run,
  });
}

export function touchRun(state, domainOrUrl, run) {
  const domain = normaliseDomain(domainOrUrl);
  const existing = state.prospects?.[domain];
  return existing ? withEntry(state, domain, { ...existing, run }) : state;
}

export function readState(file) {
  if (!existsSync(file)) return { prospects: {} };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return { ...data, prospects: data.prospects ?? {} };
}

export function writeState(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, file);
}
