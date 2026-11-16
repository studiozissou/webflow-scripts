// Reports hreflang alternates that do not link back and alternates whose target is not a direct 200.

import { contentPages, factsByKey, isContentPage, linkRow, targetResolver, firstStatus, unknownReason, onePerTarget } from './_shared.js';

export const meta = {
  name: 'hreflang',
  taxonomyIds: ['hreflang-no-return', 'hreflang-non-200'],
  tier: 1,
  crossPage: true,
  audit: true,
};

const SELECTOR = 'link[rel=alternate][hreflang]';

function tag(entry) {
  return `<link rel="alternate" hreflang="${entry.lang}" href="${entry.href}">`;
}

export async function check({ facts = [], linkTargets } = {}) {
  const resolve = targetResolver(linkTargets, facts);
  const byKey = factsByKey(facts);
  const fresh = onePerTarget();
  const rows = [];
  for (const page of contentPages(facts)) {
    for (const entry of page.hreflang ?? []) {
      if (!entry.key || entry.key === page.urlKey) continue;

      const other = byKey.get(entry.key);
      if (isContentPage(other) && Array.isArray(other.hreflang) && fresh('hreflang-no-return', other.urlKey, page.urlKey)) {
        const returns = other.hreflang.some((back) => back.key === page.urlKey);
        if (!returns) {
          rows.push(linkRow(other, 'hreflang-no-return', { ...page, checkedAt: page.fetchedAt }, {
            value: other.hreflang.map((back) => back.href), selector: SELECTOR,
            snippet: other.hreflang.map(tag).join(''), related: [page.urlKey],
          }));
        }
      }

      if (!fresh('hreflang-non-200', page.urlKey, entry.key)) continue;
      const target = resolve(entry.key);
      const subject = { ...(target ?? { status: 0, finalUrl: null }), url: target?.url ?? entry.url, urlKey: entry.key };
      const reason = unknownReason(target);
      if (reason) {
        rows.push(linkRow(page, 'hreflang-non-200', subject, { state: 'unknown', reason, selector: SELECTOR, snippet: tag(entry) }));
        continue;
      }
      const first = firstStatus(target);
      if (first === 200 && target.status === 200) continue;
      rows.push(linkRow(page, 'hreflang-non-200', subject, { value: first, status: first, selector: SELECTOR, snippet: tag(entry) }));
    }
  }
  return rows;
}
