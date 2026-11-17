// Reports orphaned sitemap pages and internal links that use http, carry nofollow or have no accessible name.

import { contentPages, isContentPage, linkRow, pageRow, onePerTarget, linkSnippet, absolute } from './_shared.js';

export const meta = {
  name: 'internal-links',
  taxonomyIds: ['sitemap-orphan', 'links-to-http', 'nofollow-internal-link', 'link-no-accessible-name'],
  tier: 1,
  crossPage: true,
  audit: true,
};

export async function check({ facts = [], linkTargets } = {}) {
  const fresh = onePerTarget();
  const rows = [];
  const linkedFrom = new Map();
  for (const fact of contentPages(facts)) {
    const https = String(fact.finalUrl ?? fact.url).startsWith('https:');
    const base = fact.finalUrl ?? fact.url;
    for (const link of fact.links ?? []) {
      const key = link.hrefKey;
      if (!key) continue;
      if (key !== fact.urlKey) linkedFrom.set(key, (linkedFrom.get(key) ?? 0) + 1);
      const target = { ...(linkTargets?.get?.(key) ?? {}), url: absolute(link.href, base), urlKey: key };
      const opts = { selector: 'a[href]', snippet: linkSnippet(link) };
      if (link.internal && https && key.startsWith('http:') && fresh('links-to-http', fact.urlKey, key)) {
        rows.push(linkRow(fact, 'links-to-http', target, { ...opts, value: link.href }));
      }
      if (link.internal && /(^|\s)nofollow(\s|$)/.test(link.rel ?? '') && fresh('nofollow-internal-link', fact.urlKey, key)) {
        rows.push(linkRow(fact, 'nofollow-internal-link', target, { ...opts, value: link.rel }));
      }
      if (link.accessibleName === '' && fresh('link-no-accessible-name', fact.urlKey, key)) {
        rows.push(linkRow(fact, 'link-no-accessible-name', target, { ...opts, value: '' }));
      }
    }
  }
  for (const fact of facts) {
    if (!fact.inSitemap || !isContentPage(fact) || linkedFrom.has(fact.urlKey)) continue;
    rows.push(pageRow(fact, 'sitemap-orphan', { value: 0, selector: 'a[href]', snippet: `no page links to ${fact.url}` }));
  }
  return rows;
}
