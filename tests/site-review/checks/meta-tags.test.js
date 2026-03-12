import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { check, meta } from '../../../tools/site-review/checks/meta-tags.js';
import { loadConfig } from '../../../tools/site-review/config.js';
import { createLogger } from '../../../tools/site-review/lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', 'fixtures', 'sample-page.html');

async function loadFixture() {
  return readFile(fixturePath, 'utf-8');
}

function makeMockFetchPage(htmlMap) {
  return async (url) => ({
    html: htmlMap[url] ?? '',
    headers: {},
    statusCode: 200,
    redirectChain: [],
  });
}

describe('meta-tags check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'meta-tags');
    assert.equal(meta.category, 'seo');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, true);
    assert.ok(meta.label);
  });
});

describe('meta-tags check — single page with fixture', () => {
  it('flags title too short', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const titleShort = findings.find(
      (f) => f.title.includes('too short') && f.title.toLowerCase().includes('title'),
    );
    assert.ok(titleShort, 'Should find a "title too short" finding');
    assert.equal(titleShort.severity, 'warning');
    assert.equal(titleShort.category, 'seo');
    assert.equal(titleShort.check, 'meta-tags');
    assert.equal(titleShort.actual, 2);
  });

  it('flags missing meta description', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingDesc = findings.find(
      (f) => f.severity === 'critical' && f.title.toLowerCase().includes('description'),
    );
    assert.ok(missingDesc, 'Should find a "missing description" finding');
    assert.equal(missingDesc.category, 'seo');
  });

  it('flags missing canonical', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingCanonical = findings.find(
      (f) => f.title.toLowerCase().includes('canonical'),
    );
    assert.ok(missingCanonical, 'Should find a "missing canonical" finding');
    assert.equal(missingCanonical.severity, 'warning');
  });

  it('flags missing og:image but not og:title or og:description', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingOgImage = findings.find(
      (f) => f.title.toLowerCase().includes('og:image'),
    );
    assert.ok(missingOgImage, 'Should find missing og:image');
    assert.equal(missingOgImage.severity, 'info');

    const ogTitle = findings.find(
      (f) => f.title.toLowerCase().includes('og:title'),
    );
    assert.equal(ogTitle, undefined, 'Should NOT flag og:title (it exists)');

    const ogDesc = findings.find(
      (f) => f.title.toLowerCase().includes('og:description'),
    );
    assert.equal(ogDesc, undefined, 'Should NOT flag og:description (it exists)');
  });

  it('does not flag missing title when title exists', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingTitle = findings.find(
      (f) => f.severity === 'critical' && f.title.toLowerCase().includes('missing') && f.title.toLowerCase().includes('title'),
    );
    assert.equal(missingTitle, undefined, 'Should NOT flag missing title (it exists, just short)');
  });
});

describe('meta-tags check — duplicate detection', () => {
  it('flags duplicate titles across pages', async () => {
    const html1 = '<html><head><title>Same Title Here For Testing</title><meta name="description" content="Unique desc one for page one."></head><body></body></html>';
    const html2 = '<html><head><title>Same Title Here For Testing</title><meta name="description" content="Unique desc two for page two testing.</meta></head><body></body></html>';

    const pages = ['https://example.com/a', 'https://example.com/b'];
    const findings = await check({
      url: 'https://example.com',
      pages,
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [pages[0]]: html1,
        [pages[1]]: html2,
      }),
    });

    const dupes = findings.filter(
      (f) => f.title.toLowerCase().includes('duplicate') && f.title.toLowerCase().includes('title'),
    );
    assert.ok(dupes.length > 0, 'Should detect duplicate titles');
    assert.equal(dupes[0].severity, 'warning');
  });

  it('flags duplicate descriptions across pages', async () => {
    const desc = 'This is a repeated meta description that is long enough to pass length checks easily.';
    const html1 = `<html><head><title>Page One Title Is Long Enough</title><meta name="description" content="${desc}"></head><body></body></html>`;
    const html2 = `<html><head><title>Page Two Title Is Long Enough</title><meta name="description" content="${desc}"></head><body></body></html>`;

    const pages = ['https://example.com/a', 'https://example.com/b'];
    const findings = await check({
      url: 'https://example.com',
      pages,
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [pages[0]]: html1,
        [pages[1]]: html2,
      }),
    });

    const dupes = findings.filter(
      (f) => f.title.toLowerCase().includes('duplicate') && f.title.toLowerCase().includes('description'),
    );
    assert.ok(dupes.length > 0, 'Should detect duplicate descriptions');
    assert.equal(dupes[0].severity, 'warning');
  });
});

describe('meta-tags check — content attribute order', () => {
  it('detects description when content appears before name', async () => {
    const html = `<html><head>
      <title>A perfectly fine title for SEO purposes</title>
      <meta content="This is a meta description with content before name attribute, long enough to pass." name="description">
      <link rel="canonical" href="https://example.com/order">
      <meta property="og:title" content="OG Title">
      <meta property="og:description" content="OG Desc">
      <meta property="og:image" content="https://example.com/img.jpg">
    </head><body></body></html>`;

    const url = 'https://example.com/order';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingDesc = findings.find(
      (f) => f.title.toLowerCase().includes('description') && f.severity === 'critical',
    );
    assert.equal(missingDesc, undefined, 'Should NOT flag missing description when content is before name');
  });

  it('detects description with extra attributes between name and content', async () => {
    const html = `<html><head>
      <title>A perfectly fine title for SEO purposes</title>
      <meta name="description" data-extra="x" content="This is a meta description with extra attributes between name and content attrs.">
      <link rel="canonical" href="https://example.com/extra">
      <meta property="og:title" content="OG Title">
      <meta property="og:description" content="OG Desc">
      <meta property="og:image" content="https://example.com/img.jpg">
    </head><body></body></html>`;

    const url = 'https://example.com/extra';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingDesc = findings.find(
      (f) => f.title.toLowerCase().includes('description') && f.severity === 'critical',
    );
    assert.equal(missingDesc, undefined, 'Should NOT flag missing description with extra attrs');
  });
});

describe('meta-tags check — clean page produces no findings', () => {
  it('returns empty array for a well-formed page', async () => {
    const html = `<html><head>
      <title>A perfectly fine title for SEO purposes</title>
      <meta name="description" content="This is a well-written meta description that falls within the recommended length range for search results.">
      <link rel="canonical" href="https://example.com/clean">
      <meta property="og:title" content="Clean Page">
      <meta property="og:description" content="OG description here.">
      <meta property="og:image" content="https://example.com/og.jpg">
    </head><body></body></html>`;

    const url = 'https://example.com/clean';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 0, `Expected no findings, got: ${JSON.stringify(findings, null, 2)}`);
  });
});
