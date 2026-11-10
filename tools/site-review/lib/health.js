// Computes the documented site-review health score: single-page fails classify their page, and each shared issue counts once with a penalty that grows with the log of its reach.

import { SCORE_WEIGHTS } from '../config.js';
import { collapseFindings } from './collapse.js';

export const HEALTH_FORMULA =
  'score = round(100 × (1 − (E + 0.5 × W + S) / P)), clipped to 0..100, where P is the number of pages fetched with fetchState ok; E and W count the pages whose highest single-page fail has scoreWeight 1 (error pages) or 0.5 (warning pages); S adds, for each shared issue (one target or snippet on two or more pages, or a check on more than 90% of pages), its scoreWeight × (1 + log2 n), n being the pages it reaches, so a shared issue counts once and each doubling of reach costs one more page; transient, unknown and weight-0 fails count nowhere, and the score is null when P is 0.';

export function weightOf(finding) {
  if (typeof finding.scoreWeight === 'number') return finding.scoreWeight;
  return SCORE_WEIGHTS[finding.severity] ?? 0;
}

export function sharedPenalty(weight, pages) {
  return pages > 0 && weight > 0 ? weight * (1 + Math.log2(pages)) : 0;
}

export function healthScore({ pages, errorPages, warningPages, sharedDamage = 0 }) {
  if (!pages) return null;
  const raw = Math.round(100 * (1 - (errorPages + 0.5 * warningPages + sharedDamage) / pages));
  return Math.min(100, Math.max(0, raw));
}

const round3 = (value) => Math.round(value * 1000) / 1000;

export function computeHealth({ facts, findings }) {
  const pageKeys = new Set((facts ?? []).filter((fact) => fact.fetchState === 'ok').map((fact) => fact.urlKey));
  const { groups, sitewide, singles } = collapseFindings({ findings, facts });

  const sharedIssues = [];
  for (const pattern of sitewide) {
    const weight = Math.max(0, ...(findings ?? [])
      .filter((f) => f.taxonomyId === pattern.taxonomyId && f.state === 'fail' && !f.transient && pageKeys.has(f.urlKey))
      .map(weightOf));
    sharedIssues.push({ kind: 'sitewide', taxonomyId: pattern.taxonomyId, fingerprint: null, pages: pattern.pages, weight });
  }
  for (const group of groups) {
    const pages = group.urlKeys.filter((key) => pageKeys.has(key)).length;
    sharedIssues.push({ kind: group.kind, taxonomyId: group.taxonomyId, fingerprint: group.fingerprint, pages, weight: weightOf(group.sample) });
  }
  for (const issue of sharedIssues) issue.penalty = round3(sharedPenalty(issue.weight, issue.pages));
  const sharedDamage = round3(sharedIssues.reduce((sum, issue) => sum + issue.penalty, 0));

  const highest = new Map();
  for (const finding of singles) {
    if (!pageKeys.has(finding.urlKey)) continue;
    const weight = weightOf(finding);
    if (weight > (highest.get(finding.urlKey) ?? 0)) highest.set(finding.urlKey, weight);
  }
  let errorPages = 0;
  let warningPages = 0;
  for (const weight of highest.values()) {
    if (weight >= 1) errorPages += 1;
    else if (weight > 0) warningPages += 1;
  }

  const pages = pageKeys.size;
  return {
    score: healthScore({ pages, errorPages, warningPages, sharedDamage }),
    pages,
    errorPages,
    warningPages,
    sharedDamage,
    sharedIssues: sharedIssues.filter((issue) => issue.penalty > 0).sort((a, b) => b.penalty - a.penalty || a.taxonomyId.localeCompare(b.taxonomyId)),
    formula: HEALTH_FORMULA,
  };
}
