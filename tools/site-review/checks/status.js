// Reports fact records and internal link targets whose final HTTP status is 4xx or 5xx.

import { clip } from '../lib/finding.js';
import { UNUSABLE_STATES } from './_shared.js';

export const meta = { name: 'status', taxonomyIds: ['http-4xx', 'http-5xx'], tier: 1, crossPage: false, audit: true };

const READABLE = ['ok', 'non_html'];

function classOf(status) {
  if (status >= 400 && status <= 499) return 'http-4xx';
  if (status >= 500 && status <= 599) return 'http-5xx';
  return null;
}

function row(subject, taxonomyId, fetchedAt) {
  return {
    taxonomyId, url: subject.url, urlKey: subject.urlKey, state: 'fail',
    evidence: {
      value: subject.status, source: 'raw', status: subject.status, finalUrl: subject.finalUrl ?? subject.url,
      selector: 'http:status', snippet: clip(`HTTP ${subject.status} ${subject.finalUrl ?? subject.url}`), fetchedAt: fetchedAt ?? null,
    },
  };
}

export async function check({ facts = [], linkTargets } = {}) {
  const rows = [];
  const seen = new Set();
  for (const fact of facts) {
    if (!READABLE.includes(fact.fetchState)) continue;
    const id = classOf(fact.status);
    if (!id) continue;
    seen.add(fact.urlKey);
    rows.push(row(fact, id, fact.fetchedAt));
  }
  for (const target of linkTargets?.values?.() ?? []) {
    if (!target.internal || target.isFact || seen.has(target.urlKey)) continue;
    if (UNUSABLE_STATES.includes(target.fetchState)) continue;
    const id = classOf(target.status);
    if (!id) continue;
    seen.add(target.urlKey);
    rows.push(row(target, id, target.checkedAt));
  }
  return rows;
}
