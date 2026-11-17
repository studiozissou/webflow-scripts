// Reports pages with a missing, relative or conflicting canonical, and canonicals whose target does not answer 200 directly.

import { contentPages, pageRow, linkRow, targetResolver, firstStatus, unknownReason, onePerTarget } from './_shared.js';

export const meta = {
  name: 'canonical',
  taxonomyIds: ['canonical-missing', 'canonical-not-absolute', 'canonical-multiple', 'canonical-to-non-200'],
  tier: 1,
  crossPage: false,
  audit: true,
};

const SELECTOR = 'link[rel=canonical]';
const ABSOLUTE = /^https?:\/\//i;

function tag(canonical) {
  return `<link rel="canonical" href="${canonical.href}">`;
}

export async function check({ facts = [], linkTargets } = {}) {
  const resolve = targetResolver(linkTargets, facts);
  const fresh = onePerTarget();
  const rows = [];
  for (const fact of contentPages(facts)) {
    if (!Array.isArray(fact.canonicals)) continue;
    const canonicals = fact.canonicals;
    if (canonicals.length === 0) {
      rows.push(pageRow(fact, 'canonical-missing', { value: null, selector: SELECTOR, snippet: '' }));
      continue;
    }
    const relative = canonicals.find((canonical) => !ABSOLUTE.test(String(canonical.href ?? '').trim()));
    if (relative) {
      rows.push(pageRow(fact, 'canonical-not-absolute', { value: relative.href, selector: SELECTOR, snippet: tag(relative) }));
    }
    const keys = new Set(canonicals.map((canonical) => canonical.key ?? canonical.href));
    if (keys.size > 1) {
      rows.push(pageRow(fact, 'canonical-multiple', {
        value: canonicals.map((canonical) => canonical.href), selector: SELECTOR, snippet: canonicals.map(tag).join(''),
      }));
    }
    for (const canonical of canonicals) {
      if (!canonical.key || canonical.key === fact.urlKey || !fresh('canonical-to-non-200', fact.urlKey, canonical.key)) continue;
      const target = resolve(canonical.key);
      const subject = { ...(target ?? { status: 0, finalUrl: null }), url: target?.url ?? canonical.url, urlKey: canonical.key };
      const reason = unknownReason(target);
      if (reason) {
        rows.push(linkRow(fact, 'canonical-to-non-200', subject, { state: 'unknown', reason, selector: SELECTOR, snippet: tag(canonical) }));
        continue;
      }
      const first = firstStatus(target);
      if (first === 200) continue;
      rows.push(linkRow(fact, 'canonical-to-non-200', subject, { value: first, status: first, selector: SELECTOR, snippet: tag(canonical) }));
    }
  }
  return rows;
}
