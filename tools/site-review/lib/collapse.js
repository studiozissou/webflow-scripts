// Groups fails for the report by shared target or snippet and lifts checks that fire on nearly every page into site-wide patterns, without touching the counts.

import { sha256 } from './finding.js';

const fingerprintOf = (value) => sha256(value).slice(0, 12);

const byUrlKey = (a, b) => String(a.urlKey).localeCompare(String(b.urlKey));

function groupBy(findings, keyOf) {
  const groups = new Map();
  for (const finding of findings) {
    const key = keyOf(finding);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  }
  return groups;
}

export function collapseFindings({ findings, facts, threshold = 0.9 }) {
  const fails = (findings ?? []).filter(
    (finding) => finding.state === 'fail' && !finding.transient && !finding.excludedFromParity && !finding.tags?.includes('fixed-after-load'),
  );
  const okPages = new Set((facts ?? []).filter((fact) => fact.fetchState === 'ok').map((fact) => fact.urlKey));

  const sitewide = [];
  const sitewideIds = new Set();
  if (okPages.size > 0) {
    for (const [taxonomyId, list] of groupBy(fails, (finding) => finding.taxonomyId)) {
      const pages = new Set(list.map((finding) => finding.urlKey).filter((key) => okPages.has(key))).size;
      const ratio = pages / okPages.size;
      if (pages >= 2 && ratio > threshold) {
        sitewide.push({ taxonomyId, pages, ratio: Math.round(ratio * 1000) / 1000 });
        sitewideIds.add(taxonomyId);
      }
    }
  }
  sitewide.sort((a, b) => a.taxonomyId.localeCompare(b.taxonomyId));

  const groups = [];
  const consumed = new Set();
  const addGroups = (kind, keyOf) => {
    const pool = fails.filter((finding) => !sitewideIds.has(finding.taxonomyId) && !consumed.has(finding));
    for (const [key, list] of groupBy(pool, keyOf)) {
      const urlKeys = [...new Set(list.map((finding) => finding.urlKey))].sort();
      if (urlKeys.length < 2) continue;
      list.forEach((finding) => consumed.add(finding));
      const sorted = [...list].sort(byUrlKey);
      groups.push({ fingerprint: fingerprintOf(key), taxonomyId: sorted[0].taxonomyId, kind, count: urlKeys.length, urlKeys, sample: sorted[0] });
    }
  };
  addGroups('target', (finding) => (finding.targetKey ? `${finding.taxonomyId}|target|${finding.targetKey}` : null));
  addGroups('snippet', (finding) =>
    finding.evidence?.snippet ? `${finding.taxonomyId}|snippet|${finding.evidence.snippet}` : null,
  );
  groups.sort((a, b) => b.count - a.count || a.taxonomyId.localeCompare(b.taxonomyId) || a.fingerprint.localeCompare(b.fingerprint));

  const singles = fails.filter((finding) => !sitewideIds.has(finding.taxonomyId) && !consumed.has(finding));
  return { groups, sitewide, singles };
}
