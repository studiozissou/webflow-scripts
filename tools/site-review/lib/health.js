// Computes the documented site-review health score from final-state fails, classifying each fetched page by its highest score weight.

import { SCORE_WEIGHTS } from '../config.js';

export const HEALTH_FORMULA =
  'score = round(100 × (1 − (E + 0.5 × W) / P)), clipped to 0..100, where P is the number of pages fetched with fetchState ok, E the pages whose highest non-transient fail has scoreWeight 1 (error pages) and W the pages whose highest has scoreWeight 0.5 (warning pages); fails with weight 0 leave a page healthy, and the score is null when P is 0.';

export function weightOf(finding) {
  if (typeof finding.scoreWeight === 'number') return finding.scoreWeight;
  return SCORE_WEIGHTS[finding.severity] ?? 0;
}

export function healthScore({ pages, errorPages, warningPages }) {
  if (!pages) return null;
  const raw = Math.round(100 * (1 - (errorPages + 0.5 * warningPages) / pages));
  return Math.min(100, Math.max(0, raw));
}

export function computeHealth({ facts, findings }) {
  const pageKeys = new Set((facts ?? []).filter((fact) => fact.fetchState === 'ok').map((fact) => fact.urlKey));
  const highest = new Map();
  for (const finding of findings ?? []) {
    if (finding.state !== 'fail' || finding.transient || !pageKeys.has(finding.urlKey)) continue;
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
  return { score: healthScore({ pages, errorPages, warningPages }), pages, errorPages, warningPages, formula: HEALTH_FORMULA };
}
