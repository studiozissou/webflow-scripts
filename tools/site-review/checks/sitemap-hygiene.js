// Reports sitemap entries that are not clean 200 pages or are noindexed, and a site with no valid sitemap.

import { isContentPage, pageRow, siteRow, chainSnippet, UNUSABLE_STATES } from './_shared.js';

export const meta = {
  name: 'sitemap-hygiene',
  taxonomyIds: ['sitemap-incorrect-page', 'sitemap-noindex', 'sitemap-missing', 'sitemap-invalid'],
  tier: 1,
  crossPage: false,
  audit: true,
};

const READABLE = ['ok', 'non_html'];

function siteFileRows(site, facts) {
  if (!site) return [];
  const sitemaps = site.sitemaps ?? [];
  const rows = [];
  const fetched = sitemaps.filter((sitemap) => sitemap.status === 200);
  if (fetched.length === 0) {
    const first = sitemaps[0] ?? null;
    const failed = sitemaps.find((sitemap) => UNUSABLE_STATES.includes(sitemap.fetchState));
    const snippet = sitemaps.map((sitemap) => `GET ${sitemap.url} -> ${sitemap.status}`).join('; ');
    const opts = {
      value: sitemaps.map((sitemap) => sitemap.url), status: first?.status ?? 0, finalUrl: first?.url ?? null,
      selector: 'sitemap.xml', snippet,
    };
    rows.push(siteRow(site, facts, 'sitemap-missing', failed ? { ...opts, state: 'unknown', reason: failed.fetchState } : opts));
  }
  const invalid = fetched.filter((sitemap) => sitemap.valid === false);
  if (invalid.length > 0) {
    rows.push(siteRow(site, facts, 'sitemap-invalid', {
      value: invalid.map((sitemap) => sitemap.url), status: invalid[0].status, finalUrl: invalid[0].url,
      selector: 'sitemap.xml', snippet: invalid.map((sitemap) => `${sitemap.url}: ${sitemap.error ?? 'not a urlset or sitemapindex'}`).join('; '),
    }));
  }
  return rows;
}

export async function check({ facts = [], site } = {}) {
  const rows = [];
  for (const fact of facts) {
    if (!fact.inSitemap || !READABLE.includes(fact.fetchState)) continue;
    const chain = fact.redirectChain ?? [];
    if (fact.status !== 200 || chain.length > 0) {
      rows.push(pageRow(fact, 'sitemap-incorrect-page', {
        value: chain[0]?.status ?? fact.status, status: chain[0]?.status ?? fact.status,
        selector: 'sitemap > url > loc', snippet: chainSnippet(fact),
      }));
    }
    if (isContentPage(fact) && /\bnoindex\b/.test(fact.robotsMeta ?? '')) {
      rows.push(pageRow(fact, 'sitemap-noindex', {
        value: fact.robotsMeta, selector: 'meta[name=robots]', snippet: `<meta name="robots" content="${fact.robotsMeta}">`,
      }));
    }
  }
  return [...rows, ...siteFileRows(site, facts)];
}
