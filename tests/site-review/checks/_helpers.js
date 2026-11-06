// Small hand-written FactRecord and LinkTarget factories plus a row validator shared by the check tests.

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { loadConfig } from '../../../tools/site-review/config.js';
import { findingsFromRows, indexTaxonomy } from '../../../tools/site-review/lib/finding.js';

export const ORIGIN = 'https://example.com';
export const AT = '2026-11-06T10:00:00.000Z';

const taxonomy = JSON.parse(readFileSync(new URL('../../../tools/site-review/taxonomy.json', import.meta.url), 'utf8'));
export const TAXONOMY = indexTaxonomy(taxonomy);

export function key(path, origin = ORIGIN) {
  return `${origin}${path}`;
}

export function link(path, overrides = {}) {
  const internal = overrides.internal ?? !/^https?:/.test(path);
  const href = overrides.href ?? path;
  return {
    href,
    hrefKey: overrides.hrefKey ?? (internal && !/^https?:/.test(path) ? key(path) : path),
    accessibleName: 'Link text',
    rel: '',
    internal,
    snippet: `<a href="${href}">Link text</a>`,
    ...overrides,
  };
}

export function page(path, overrides = {}) {
  const url = key(path);
  return {
    schemaVersion: 1, url, urlKey: url, finalUrl: url, status: 200, redirectChain: [], redirectLoop: false,
    headers: {
      contentType: 'text/html; charset=utf-8', contentEncoding: 'gzip', xRobotsTag: null, contentLength: 1000,
      security: {
        strictTransportSecurity: 'max-age=1', contentSecurityPolicy: "default-src 'self'", xContentTypeOptions: 'nosniff',
        xFrameOptions: 'DENY', referrerPolicy: 'no-referrer', permissionsPolicy: 'camera=()',
      },
    },
    bytes: 20_000, fetchedAt: AT, fetchState: 'ok', errorCode: null,
    htmlHash: `h${path}`, textHash: `t${path}`, doctype: 'html', wfPage: 'tpl', wfSite: 'site', lang: 'en',
    title: `A perfectly sized title for the page ${path}`.slice(0, 60), titleCount: 1,
    metaDescription: `Description for ${path}`, metaDescriptionCount: 1, metaRefresh: null, robotsMeta: null,
    canonicals: [{ href: url, url, key: url }], hreflang: [], h1: [`Heading for ${path}`],
    headings: { h2: 1, h3: 0, h4: 0, h5: 0, h6: 0 }, wordCount: 400, textToHtmlRatio: 0.3,
    links: [], resources: [], images: [], jsonLd: { types: [], hashes: [], parseErrors: [] },
    scripts: { count: 1, inlineBytes: 10, externalCount: 1 }, viewport: 'width=device-width', charset: 'utf-8',
    inSitemap: true, lastmod: null, sitemap: key('/sitemap.xml'),
    ...overrides,
  };
}

export function target(urlOrPath, overrides = {}) {
  const url = /^https?:/.test(urlOrPath) ? urlOrPath : key(urlOrPath);
  return {
    urlKey: url, url, internal: url.startsWith(ORIGIN), inSitemap: false, isFact: false, kinds: ['link'], method: 'HEAD',
    status: 200, finalUrl: url, redirectChain: [], redirectLoop: false, fetchState: 'ok', errorCode: null,
    capExceeded: false, checkedAt: AT,
    ...overrides,
  };
}

export function targets(...list) {
  return new Map(list.map((t) => [t.urlKey, t]));
}

export function site(overrides = {}) {
  return {
    root: { url: `${ORIGIN}/`, urlKey: key('/') },
    rows: [],
    sitemaps: [{ url: key('/sitemap.xml'), status: 200, fetchState: 'ok', kind: 'urlset', valid: true, error: null, urlCount: 1 }],
    robots: { url: key('/robots.txt'), status: 200, fetchState: 'ok', text: 'User-agent: *\nAllow: /\n', sitemapUrls: [] },
    llms: { url: key('/llms.txt'), status: 200, fetchState: 'ok' },
    ...overrides,
  };
}

export function config(overrides = {}) {
  return { ...loadConfig(), googlePsiApiKey: '', ...overrides };
}

export function assertValidRows(rows) {
  const { rejected } = findingsFromRows(rows, TAXONOMY);
  assert.deepEqual(rejected.map((r) => ({ id: r.row.taxonomyId, errors: r.errors })), []);
  for (const row of rows) {
    assert.ok(['fail', 'unknown'].includes(row.state));
    assert.equal(row.evidence.source, 'raw');
    assert.ok(row.evidence.snippet.length <= 200);
    if (TAXONOMY.get(row.taxonomyId).unit === 'link' && !row.siteLevel && row.target !== undefined) {
      assert.equal(typeof row.targetKey, 'string');
    }
  }
  return rows;
}

export function ids(rows) {
  return rows.map((row) => `${row.taxonomyId} ${row.urlKey.replace(ORIGIN, '')}${row.targetKey ? ` -> ${row.targetKey.replace(ORIGIN, '')}` : ''}${row.state === 'unknown' ? ` (${row.reason})` : ''}`).sort();
}
