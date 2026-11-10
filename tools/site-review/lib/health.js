// Computes the documented site-review health score: single-page fails classify their page, each shared issue spreads a reach-weighted penalty over its pages, and no page costs more than its worst fail.

import { SCORE_WEIGHTS } from '../config.js';
import { collapseFindings } from './collapse.js';

export const HEALTH_FORMULA =
  'score = round(100 × (1 − (E + 0.5 × W + S) / P)), clipped to 0..100, where P is the number of pages fetched with fetchState ok; E and W count the pages whose highest single-page fail has scoreWeight 1 (error pages) or 0.5 (warning pages); each shared issue (one target or snippet on two or more pages, or a target-less check on more than 90% of pages) has penalty scoreWeight × (1 + log2 n), n being the pages it reaches, spread evenly over those n pages; S is the sum of those shares after capping each page so that its single-page weight plus its shares never exceeds the highest weight among all its fails, so a shared issue counts once, each doubling of reach costs one more page, and many shared issues on one page cost no more than that page failing on its own; transient, unknown and weight-0 fails count nowhere, and the score is null when P is 0.';

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

const isLive = (finding) => finding.state === 'fail' && !finding.transient;

export function computeHealth({ facts, findings }) {
  const pageKeys = new Set((facts ?? []).filter((fact) => fact.fetchState === 'ok').map((fact) => fact.urlKey));
  const { groups, sitewide, singles } = collapseFindings({ findings, facts });

  const sharedIssues = [];
  for (const pattern of sitewide) {
    const members = (findings ?? []).filter((f) => f.taxonomyId === pattern.taxonomyId && !f.targetKey && isLive(f) && pageKeys.has(f.urlKey));
    const weight = Math.max(0, ...members.map(weightOf));
    const urlKeys = [...new Set(members.map((f) => f.urlKey))];
    sharedIssues.push({ kind: 'sitewide', taxonomyId: pattern.taxonomyId, fingerprint: null, pages: urlKeys.length, weight, urlKeys });
  }
  for (const group of groups) {
    const urlKeys = group.urlKeys.filter((key) => pageKeys.has(key));
    sharedIssues.push({ kind: group.kind, taxonomyId: group.taxonomyId, fingerprint: group.fingerprint, pages: urlKeys.length, weight: weightOf(group.sample), urlKeys });
  }

  const single = new Map();
  for (const finding of singles) {
    if (!pageKeys.has(finding.urlKey)) continue;
    const weight = weightOf(finding);
    if (weight > (single.get(finding.urlKey) ?? 0)) single.set(finding.urlKey, weight);
  }

  const share = new Map();
  const worst = new Map(single);
  let penaltyTotal = 0;
  for (const issue of sharedIssues) {
    const penalty = sharedPenalty(issue.weight, issue.pages);
    issue.penalty = round3(penalty);
    penaltyTotal += penalty;
    if (penalty === 0) continue;
    for (const key of issue.urlKeys) {
      share.set(key, (share.get(key) ?? 0) + penalty / issue.pages);
      if (issue.weight > (worst.get(key) ?? 0)) worst.set(key, issue.weight);
    }
  }

  let sharedDamage = 0;
  let cappedPages = 0;
  for (const [key, added] of share) {
    const base = single.get(key) ?? 0;
    const allowed = Math.max(0, (worst.get(key) ?? 0) - base);
    if (added > allowed) cappedPages += 1;
    sharedDamage += Math.min(added, allowed);
  }
  sharedDamage = round3(sharedDamage);

  let errorPages = 0;
  let warningPages = 0;
  for (const weight of single.values()) {
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
    sharedPenaltyTotal: round3(penaltyTotal),
    cappedPages,
    sharedIssues: sharedIssues
      .filter((issue) => issue.penalty > 0)
      .map(({ urlKeys, ...issue }) => issue)
      .sort((a, b) => b.penalty - a.penalty || a.taxonomyId.localeCompare(b.taxonomyId)),
    formula: HEALTH_FORMULA,
  };
}
