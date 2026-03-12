import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { check, meta } from '../../../tools/site-review/checks/broken-links.js';
import { loadConfig } from '../../../tools/site-review/config.js';
import { createLogger } from '../../../tools/site-review/lib/logger.js';

function makeMockFetchPage(htmlMap) {
  return async (url) => ({
    html: htmlMap[url] ?? '',
    headers: {},
    statusCode: 200,
    redirectChain: [],
  });
}

describe('broken-links check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'broken-links');
    assert.equal(meta.category, 'seo');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, false);
    assert.ok(meta.label);
  });
});

describe('broken-links check — with local server', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200);
        res.end('OK');
      } else if (req.url === '/not-found') {
        res.writeHead(404);
        res.end('Not Found');
      } else if (req.url === '/server-error') {
        res.writeHead(500);
        res.end('Server Error');
      } else if (req.url === '/page') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('OK');
      } else {
        res.writeHead(200);
        res.end('OK');
      }
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('flags 404 as critical', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="${baseUrl}/ok">Good</a>
      <a href="${baseUrl}/not-found">Bad</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    const notFound = findings.find((f) => f.title.includes('404'));
    assert.ok(notFound, 'Should find a 404 finding');
    assert.equal(notFound.severity, 'critical');
    assert.equal(notFound.category, 'seo');
  });

  it('flags 500 as warning', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="${baseUrl}/server-error">Error</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    const serverErr = findings.find((f) => f.title.includes('500'));
    assert.ok(serverErr, 'Should find a 500 finding');
    assert.equal(serverErr.severity, 'warning');
  });

  it('skips mailto, tel, fragment-only, and javascript links', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="mailto:test@example.com">Email</a>
      <a href="tel:+1234567890">Phone</a>
      <a href="#section">Section</a>
      <a href="javascript:void(0)">JS</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    assert.equal(findings.length, 0, 'Should produce no findings for skippable links');
  });

  it('resolves relative URLs against page URL', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="/ok">Relative</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    assert.equal(findings.length, 0, 'Relative /ok should resolve and return 200');
  });

  it('deduplicates URLs before checking', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="${baseUrl}/not-found">Link 1</a>
      <a href="${baseUrl}/not-found">Link 2</a>
      <a href="${baseUrl}/not-found">Link 3</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    const notFoundFindings = findings.filter((f) => f.title.includes('404'));
    assert.equal(notFoundFindings.length, 1, 'Should deduplicate and only report once');
  });

  it('checks img src, link href, script src attributes', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><head>
      <link href="${baseUrl}/not-found" rel="stylesheet">
    </head><body>
      <img src="${baseUrl}/ok" alt="img">
      <script src="${baseUrl}/server-error"></script>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    assert.ok(findings.length >= 2, 'Should find findings for link and script');
  });

  it('handles many links without crashing (concurrency)', async () => {
    const pageUrl = `${baseUrl}/page`;
    const links = Array.from({ length: 30 }, (_, i) => `<a href="${baseUrl}/ok?i=${i}">Link ${i}</a>`);
    const html = `<html><body>${links.join('\n')}</body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    // All should be 200 OK, so no findings
    assert.equal(findings.length, 0);
  });

  it('returns no findings for page with only valid links', async () => {
    const pageUrl = `${baseUrl}/page`;
    const html = `<html><body>
      <a href="${baseUrl}/ok">Good</a>
    </body></html>`;

    const findings = await check({
      url: baseUrl,
      pages: [pageUrl],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [pageUrl]: html }),
    });

    assert.equal(findings.length, 0);
  });
});
