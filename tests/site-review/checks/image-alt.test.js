import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { check, meta } from '../../../tools/site-review/checks/image-alt.js';
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

describe('image-alt check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'image-alt');
    assert.equal(meta.category, 'accessibility');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, true);
    assert.ok(meta.label);
  });
});

describe('image-alt check — fixture page', () => {
  it('flags image with no alt attribute', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const noAlt = findings.find(
      (f) => f.severity === 'warning' && f.title.toLowerCase().includes('missing alt'),
    );
    assert.ok(noAlt, 'Should find image with missing alt');
    assert.equal(noAlt.category, 'accessibility');
    assert.equal(noAlt.check, 'image-alt');
    assert.ok(noAlt.element.includes('photo.jpg'), 'Should reference the image src');
  });

  it('flags empty alt on non-decorative image', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    // spacer.gif has alt="" but no role="presentation" or aria-hidden="true"
    const emptyAlt = findings.find(
      (f) => f.severity === 'info' && f.title.toLowerCase().includes('empty alt') && f.element.includes('spacer.gif'),
    );
    assert.ok(emptyAlt, 'Should flag empty alt on non-decorative image (spacer.gif)');
  });

  it('does NOT flag empty alt on decorative image', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    // icon-decorative.svg has alt="" AND role="presentation"
    const decorative = findings.find(
      (f) => f.element && f.element.includes('icon-decorative.svg') && f.title.toLowerCase().includes('empty alt'),
    );
    assert.equal(decorative, undefined, 'Should NOT flag empty alt on decorative image');
  });

  it('flags image missing width and height', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const missingDims = findings.find(
      (f) => f.category === 'performance' && f.element && f.element.includes('no-dimensions.jpg'),
    );
    assert.ok(missingDims, 'Should flag image missing width/height');
    assert.equal(missingDims.severity, 'info');
  });

  it('does NOT flag image with good alt and dimensions', async () => {
    const html = await loadFixture();
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const heroFindings = findings.filter(
      (f) => f.element && f.element.includes('hero.jpg') && f.category === 'accessibility',
    );
    assert.equal(heroFindings.length, 0, 'Should not flag hero.jpg (has good alt)');
  });
});

describe('image-alt check — clean page', () => {
  it('returns empty array when all images are valid', async () => {
    const html = '<html><body><img src="a.jpg" alt="Photo" width="100" height="100"></body></html>';
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });
    assert.equal(findings.length, 0);
  });
});

describe('image-alt check — multi-line img tag', () => {
  it('captures img tags that span multiple lines', async () => {
    const html = `<html><body>
      <img
        src="multi-line.jpg"
        alt="A multi-line image tag"
        width="800"
        height="600"
      >
    </body></html>`;
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });
    assert.equal(findings.length, 0, 'Should find the multi-line img and detect it has alt+dims');
  });

  it('flags missing alt on multi-line img', async () => {
    const html = `<html><body>
      <img
        src="no-alt-multiline.jpg"
        width="800"
        height="600"
      >
    </body></html>`;
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });
    const noAlt = findings.find((f) => f.title.includes('Missing alt'));
    assert.ok(noAlt, 'Should flag missing alt on multi-line img tag');
  });
});

describe('image-alt check — aria-hidden decorative', () => {
  it('does not flag empty alt on aria-hidden image', async () => {
    const html = '<html><body><img src="bg.png" alt="" aria-hidden="true" width="10" height="10"></body></html>';
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    const emptyAltFindings = findings.filter(
      (f) => f.title.toLowerCase().includes('empty alt'),
    );
    assert.equal(emptyAltFindings.length, 0);
  });
});
