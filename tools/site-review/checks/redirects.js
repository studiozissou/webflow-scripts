// Reports internal links through redirect chains, temporary and permanent redirects, sitemap pages behind chains, and a temporary redirect on the root.

import { contentPages, targetResolver, linkRow, pageRow, onePerTarget, linkSnippet, thresholds, chainSnippet, rootOf } from './_shared.js';

export const meta = {
  name: 'redirects',
  taxonomyIds: ['redirect-chain', 'temporary-redirect', 'permanent-redirect'],
  tier: 1,
  crossPage: false,
  audit: true,
};

const TEMPORARY = [302, 303, 307];
const PERMANENT = [301, 308];
const READABLE = ['ok', 'non_html'];

function hops(chain) {
  return (chain ?? []).map((hop) => ({ url: hop.url, status: hop.status }));
}

function isChain(subject, min) {
  return subject.redirectLoop === true || (subject.redirectChain?.length ?? 0) >= min;
}

export async function check({ facts = [], linkTargets, site, config } = {}) {
  const min = thresholds(config).redirectChainMin;
  const resolve = targetResolver(linkTargets, facts);
  const fresh = onePerTarget();
  const rows = [];

  for (const fact of contentPages(facts)) {
    for (const link of fact.links ?? []) {
      if (!link.internal || !link.hrefKey) continue;
      const target = resolve(link.hrefKey);
      if (!target?.redirectChain?.length && !target?.redirectLoop) continue;
      const chain = target.redirectChain ?? [];
      const first = chain[0]?.status ?? target.status;
      const opts = { status: first, selector: 'a[href]', snippet: linkSnippet(link) };
      const subject = { ...target, urlKey: link.hrefKey };
      if (isChain(target, min) && fresh('redirect-chain', fact.urlKey, link.hrefKey)) {
        rows.push(linkRow(fact, 'redirect-chain', subject, { ...opts, value: hops(chain) }));
      }
      if (TEMPORARY.includes(first) && fresh('temporary-redirect', fact.urlKey, link.hrefKey)) {
        rows.push(linkRow(fact, 'temporary-redirect', subject, { ...opts, value: hops(chain) }));
      }
      if (PERMANENT.includes(first) && fresh('permanent-redirect', fact.urlKey, link.hrefKey)) {
        rows.push(linkRow(fact, 'permanent-redirect', subject, { ...opts, value: hops(chain) }));
      }
    }
  }

  for (const fact of facts) {
    if (!fact.inSitemap || !READABLE.includes(fact.fetchState) || !isChain(fact, min)) continue;
    rows.push(pageRow(fact, 'redirect-chain', {
      value: hops(fact.redirectChain), status: fact.redirectChain?.[0]?.status ?? fact.status,
      selector: 'http:location', snippet: chainSnippet(fact),
    }));
  }

  const root = rootOf(site, facts);
  const rootFirst = root.fact?.redirectChain?.[0]?.status;
  if (root.fact && READABLE.includes(root.fact.fetchState) && TEMPORARY.includes(rootFirst)) {
    rows.push(pageRow(root.fact, 'temporary-redirect', {
      value: hops(root.fact.redirectChain), status: rootFirst, selector: 'http:location', snippet: chainSnippet(root.fact), siteLevel: true,
    }));
  }
  return rows;
}
