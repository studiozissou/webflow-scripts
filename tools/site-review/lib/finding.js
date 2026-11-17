// Turns check rows into findings with stable IDs from taxonomy ID, URL key and target key, and rejects any finding whose evidence or reason is incomplete.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { SEVERITIES, UNKNOWN_REASONS, SCORE_WEIGHTS } from '../config.js';

export const SNIPPET_MAX = 200;
export const EVIDENCE_KEYS = Object.freeze(['value', 'source', 'status', 'finalUrl', 'selector', 'snippet', 'fetchedAt']);
export const SOURCES = Object.freeze(['raw', 'rendered', 'both']);
export const FINDING_STATES = Object.freeze(['fail', 'unknown']);

const TAXONOMY_URL = new URL('../taxonomy.json', import.meta.url);

export function clip(text) {
  if (text == null) return '';
  let out = String(text);
  if (out.length <= SNIPPET_MAX) return out;
  out = out.slice(0, SNIPPET_MAX);
  const last = out.charCodeAt(out.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? out.slice(0, -1) : out;
}

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findingId(taxonomyId, urlKey, targetKey) {
  return `${taxonomyId}-${sha256(`${taxonomyId}|${urlKey}|${targetKey ?? ''}`).slice(0, 12)}`;
}

export function taxonomyEntry(raw) {
  return {
    ...raw,
    scoreWeight: typeof raw.scoreWeight === 'number' ? raw.scoreWeight : (SCORE_WEIGHTS[raw.severity] ?? 0),
    statusDerived: raw.statusDerived === true,
    siteLevel: raw.siteLevel === true,
    facts: Array.isArray(raw.facts) ? raw.facts : [],
  };
}

export function indexTaxonomy(entries) {
  const list = Array.isArray(entries) ? entries : (entries?.entries ?? []);
  return new Map(list.map((raw) => [raw.id, taxonomyEntry(raw)]));
}

export async function loadTaxonomy() {
  const parsed = JSON.parse(await readFile(TAXONOMY_URL, 'utf8'));
  return (Array.isArray(parsed) ? parsed : parsed.entries).map(taxonomyEntry);
}

export function createFinding(row, entry) {
  if (!entry || entry.id !== row?.taxonomyId) {
    throw new Error(`No taxonomy entry for "${row?.taxonomyId}"`);
  }
  const full = taxonomyEntry(entry);
  const finding = {
    id: findingId(row.taxonomyId, row.urlKey, row.targetKey),
    taxonomyId: row.taxonomyId,
    label: full.label,
    category: full.category,
    severity: full.severity,
    scoreWeight: full.scoreWeight,
    unit: full.unit,
    state: row.state,
    url: row.url,
    urlKey: row.urlKey,
    evidence: row.evidence ? { ...row.evidence } : row.evidence,
    renderChecked: false,
    transient: false,
    tags: full.siteLevel || row.siteLevel ? ['site-level'] : [],
    excludedFromParity: false,
  };
  if (row.reason !== undefined) finding.reason = row.reason;
  if (row.target !== undefined) finding.target = row.target;
  if (row.targetKey !== undefined) finding.targetKey = row.targetKey;
  return finding;
}

function evidenceErrors(evidence) {
  if (!evidence || typeof evidence !== 'object') return ['Missing evidence'];
  const errors = EVIDENCE_KEYS.filter((key) => !(key in evidence)).map((key) => `Missing evidence.${key}`);
  if ('source' in evidence && !SOURCES.includes(evidence.source)) {
    errors.push(`Invalid evidence.source "${evidence.source}"`);
  }
  if ('snippet' in evidence) {
    if (typeof evidence.snippet !== 'string') errors.push('evidence.snippet must be a string');
    else if (evidence.snippet.length > SNIPPET_MAX) errors.push(`evidence.snippet is longer than ${SNIPPET_MAX} characters`);
  }
  if (evidence.related !== undefined && !Array.isArray(evidence.related)) errors.push('evidence.related must be an array');
  return errors;
}

export function validateFinding(finding) {
  const errors = [];
  if (!finding || typeof finding !== 'object') return { valid: false, errors: ['Finding is not an object'] };
  for (const field of ['id', 'taxonomyId', 'url', 'urlKey']) {
    if (typeof finding[field] !== 'string' || finding[field] === '') errors.push(`Missing required field: ${field}`);
  }
  if (finding.severity !== undefined && !SEVERITIES.includes(finding.severity)) {
    errors.push(`Invalid severity "${finding.severity}"`);
  }
  if (!FINDING_STATES.includes(finding.state)) {
    errors.push(`Invalid state "${finding.state}"`);
  } else if (finding.state === 'fail') {
    errors.push(...evidenceErrors(finding.evidence));
  } else if (!UNKNOWN_REASONS.includes(finding.reason)) {
    errors.push(`Unknown finding needs a reason from: ${UNKNOWN_REASONS.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

export function findingsFromRows(rows, taxonomyById) {
  const lookup = taxonomyById instanceof Map ? taxonomyById : indexTaxonomy(taxonomyById ?? []);
  const findings = [];
  const rejected = [];
  const seen = new Set();
  let duplicates = 0;
  for (const row of rows ?? []) {
    const entry = lookup.get(row?.taxonomyId);
    if (!entry) {
      rejected.push({ row, errors: [`Unknown taxonomyId "${row?.taxonomyId}"`] });
      continue;
    }
    const finding = createFinding(row, entry);
    const { valid, errors } = validateFinding(finding);
    if (!valid) {
      rejected.push({ row, errors });
      continue;
    }
    if (seen.has(finding.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(finding.id);
    findings.push(finding);
  }
  return { findings, rejected, duplicates };
}
