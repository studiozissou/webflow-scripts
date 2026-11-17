// Tests for extractFacts on the golden fixture pages, run through discovery and the crawl so URL keys and fetch states are real.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractFacts } from '../../tools/site-review/lib/facts.js';
import { fetchPage } from '../../tools/site-review/lib/fetch-page.js';
import { discoverSite } from '../../tools/site-review/lib/discovery.js';
import { crawlSite } from '../../tools/site-review/lib/crawl.js';
import { SCHEMA_VERSION } from '../../tools/site-review/config.js';
import { startGoldenServer } from './fixtures/golden/server.js';

const IDENTITY = ['schemaVersion', 'url', 'urlKey', 'finalUrl', 'status', 'redirectChain', 'redirectLoop', 'headers', 'bytes', 'fetchedAt', 'fetchState', 'errorCode'];
const PARSED = [
  'htmlHash', 'textHash', 'doctype', 'wfPage', 'wfSite', 'lang', 'title', 'titleCount', 'metaDescription', 'metaDescriptionCount',
  'metaRefresh', 'robotsMeta', 'canonicals', 'hreflang', 'h1', 'headings', 'wordCount', 'textToHtmlRatio', 'links', 'resources',
  'images', 'jsonLd', 'scripts', 'viewport', 'charset', 'inSitemap', 'lastmod', 'sitemap',
];

describe('facts on the golden site', () => {
  let golden;
  let facts;
  let linkTargets;
  const crawlConfig = { retryDelayMs: 10 };
  const byPath = (path) => facts.find((record) => record.urlKey === `${golden.url}${path}`);

  before(async () => {
    golden = await startGoldenServer();
    const site = await discoverSite(golden.url, { crawlConfig, fetchPage });
    ({ facts, linkTargets } = await crawlSite({ site, crawlConfig, fetchPage }));
  });

  after(async () => {
    await golden.close();
  });

  it('every record carries exactly the contract fields', () => {
    for (const record of facts) assert.deepEqual(Object.keys(record).sort(), [...IDENTITY, ...PARSED].sort());
    assert.ok(facts.every((record) => record.schemaVersion === SCHEMA_VERSION));
    assert.ok(facts.every((record) => !('body' in record) && !('html' in record)));
  });

  it('facts: extracts title, description, canonicals, robots meta, hreflang, H1s, wfPage, links with accessible names and resources from the golden pages', () => {
    const about = byPath('/about');
    assert.equal(about.title, 'About the golden fixture practice in Amsterdam');
    assert.equal(about.titleCount, 1);
    assert.match(about.metaDescription, /^About the golden fixture practice in Amsterdam: a description/);
    assert.deepEqual(about.canonicals, [{ href: `${golden.url}/about`, url: `${golden.url}/about`, key: `${golden.url}/about` }]);
    assert.deepEqual(about.h1, ['About the golden fixture practice in Amsterdam heading']);
    assert.equal(about.wfPage, 'p-about');
    assert.equal(about.wfSite, 'golden');
    assert.equal(about.lang, 'en');
    assert.equal(about.doctype, 'html');
    assert.equal(about.charset, 'utf-8');
    assert.match(about.viewport, /width=device-width/);
    assert.equal(about.headers.contentEncoding, 'gzip');
    assert.equal(about.headers.security.xFrameOptions, 'SAMEORIGIN');
    assert.match(about.htmlHash, /^[0-9a-f]{16}$/);
    assert.ok(about.wordCount >= 240);
    assert.equal(about.inSitemap, true);
    assert.equal(about.lastmod, '2026-11-01');

    assert.equal(byPath('/noindex').robotsMeta, 'noindex, follow');
    assert.equal(byPath('/about').robotsMeta, null);
    assert.deepEqual(byPath('/en').hreflang.map(({ lang, key }) => [lang, key.replace(golden.url, '')]), [['en', '/en'], ['nl', '/nl'], ['de', '/de']]);
    assert.equal(byPath('/canonical-relative').canonicals[0].href, '/canonical-relative');
    assert.equal(byPath('/canonical-multiple').canonicals.length, 2);
    assert.deepEqual(byPath('/canonical-missing').canonicals, []);
    assert.deepEqual(byPath('/multi-h1').h1, ['First heading', 'Second heading']);
    assert.deepEqual(byPath('/no-h1').h1, []);
    assert.deepEqual(byPath('/svg-title').title, null);
    assert.equal(byPath('/apostrophe').metaDescription, "Janco's practice in Amsterdam: the description must be read in full, past the apostrophe.");
    assert.equal(byPath('/entity-title').title, 'Rolfing – structural integration in Amsterdam');
    assert.deepEqual(byPath('/empty-h1').h1, ['']);
    assert.deepEqual(byPath('/').jsonLd.types, ['Organization']);
    assert.match(byPath('/jsonld-error').jsonLd.parseErrors[0].message, /JSON/);
    assert.equal(byPath('/bare-document').doctype, null);
    assert.equal(byPath('/bare-document').viewport, null);
    assert.equal(byPath('/bare-document').charset, null);
    assert.equal(byPath('/uncompressed').headers.contentEncoding, null);

    const links = byPath('/links').links;
    const named = Object.fromEntries(links.map((link) => [link.href.replace(golden.url, ''), link]));
    assert.equal(named['/missing-page'].accessibleName, 'A broken internal link');
    assert.equal(named['/missing-page'].internal, true);
    assert.equal(named['/services'].accessibleName, '');
    assert.equal(named['/about'].rel, 'nofollow');
    assert.equal(named[`${golden.externalOrigin}/ok`].internal, false);
    const images = byPath('/links').images;
    assert.deepEqual(images.map((image) => image.alt), [null, 'A broken external image', '']);
    assert.deepEqual(byPath('/links').resources.map((resource) => resource.kind), ['img', 'img', 'img']);
    assert.equal(byPath('/many-links').links.length, 3002);
  });

  it('facts: records a 302 chain with per-hop status and the final URL', () => {
    const target = linkTargets.get(`${golden.url}/redirect-a`);
    assert.deepEqual(target.redirectChain, [
      { url: `${golden.url}/redirect-a`, status: 302 },
      { url: `${golden.url}/redirect-b`, status: 302 },
    ]);
    assert.equal(target.finalUrl, `${golden.url}/redirect-c`);
    assert.equal(target.status, 200);
    const oldPage = byPath('/old-page');
    assert.deepEqual(oldPage.redirectChain, [{ url: `${golden.url}/old-page`, status: 301 }]);
    assert.equal(oldPage.finalUrl, `${golden.url}/about`);
  });

  it('facts: four URL variants of one page share one URL key and one record', () => {
    assert.equal(facts.filter((record) => record.urlKey === `${golden.url}/about`).length, 1);
    const home = byPath('/');
    const variants = home.links.filter((link) => /About, spelt/.test(link.accessibleName));
    assert.equal(variants.length, 4);
    assert.deepEqual([...new Set(variants.map((link) => link.hrefKey))], [`${golden.url}/about`]);
    assert.equal(linkTargets.get(`${golden.url}/about`).isFact, true);
  });

  it('facts: a non-HTML sitemap entry is non_html and only status-checked', () => {
    const pdf = byPath('/document.pdf');
    assert.equal(pdf.fetchState, 'non_html');
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.contentType, 'application/pdf');
    assert.equal(pdf.htmlHash, null);
    assert.equal(pdf.title, null);
    assert.deepEqual(pdf.links, []);
    assert.equal(golden.countOf('/document.pdf'), 1);
  });

  it('records robots-disallowed and failing pages without parsed fields', () => {
    const blocked = byPath('/private');
    assert.equal(blocked.fetchState, 'blocked');
    assert.equal(golden.countOf('/private'), 0);
    const reset = byPath('/reset');
    assert.equal(reset.fetchState, 'fetch_failed');
    assert.equal(reset.errorCode, 'ECONNRESET');
    assert.equal(reset.title, null);
    assert.deepEqual(reset.h1, []);
  });
});

describe('extractFacts', () => {
  it('merges X-Robots-Tag with the robots meta and resolves against the final URL', () => {
    const record = extractFacts({
      fetchResult: {
        url: 'https://www.example.com/a',
        finalUrl: 'https://www.example.com/dir/b',
        status: 200,
        redirectChain: [{ url: 'https://www.example.com/a', status: 301 }],
        headers: { 'content-type': 'text/html', 'x-robots-tag': 'NoArchive', 'content-length': '10' },
        body: '<html><head><meta name="robots" content="NOINDEX"></head><body><a href="c">C</a></body></html>',
        bytes: 99,
        fetchState: 'ok',
        fetchedAt: '2026-11-06T00:00:00.000Z',
      },
      row: { url: 'https://www.example.com/a', lastmod: null, sitemap: 'https://www.example.com/sitemap.xml' },
      crawlConfig: { canonicalHost: 'www.example.com' },
      schemaVersion: 1,
    });
    assert.equal(record.robotsMeta, 'noindex, noarchive');
    assert.equal(record.links[0].href, 'https://www.example.com/dir/c');
    assert.equal(record.headers.contentLength, 10);
    assert.equal(record.inSitemap, true);
    assert.equal(record.urlKey, 'https://www.example.com/a');
  });

  it('returns empty parsed fields for a failed fetch', () => {
    const record = extractFacts({
      fetchResult: { url: 'https://e.com/x', finalUrl: 'https://e.com/x', status: 0, redirectChain: [], headers: {}, body: null, fetchState: 'timeout', errorCode: 'ETIMEDOUT' },
      row: { url: 'https://e.com/x', inSitemap: false },
      crawlConfig: {},
      schemaVersion: 1,
    });
    assert.equal(record.fetchState, 'timeout');
    assert.equal(record.htmlHash, null);
    assert.equal(record.title, null);
    assert.deepEqual(record.links, []);
    assert.equal(record.inSitemap, false);
  });
});
