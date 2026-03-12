import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta } from '../../../tools/site-review/checks/mixed-content.js';
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

describe('mixed-content check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'mixed-content');
    assert.equal(meta.category, 'security');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, true);
    assert.ok(meta.label);
  });
});

describe('mixed-content check — HTTPS site', () => {
  it('flags img with http src on HTTPS page', async () => {
    const url = 'https://example.com';
    const html = '<html><body><img src="http://cdn.example.com/photo.jpg" alt="photo"></body></html>';

    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'warning');
    assert.equal(findings[0].category, 'security');
  });

  it('does not flag a href with http (links are OK)', async () => {
    const url = 'https://example.com';
    const html = '<html><body><a href="http://other-site.com">External</a></body></html>';

    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 0, 'Links to HTTP pages should not be flagged');
  });

  it('returns no findings when all resources are HTTPS', async () => {
    const url = 'https://example.com';
    const html = `<html><head>
      <link href="https://cdn.example.com/style.css" rel="stylesheet">
    </head><body>
      <img src="https://cdn.example.com/photo.jpg" alt="photo">
      <script src="https://cdn.example.com/app.js"></script>
    </body></html>`;

    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 0);
  });

  it('flags script, link, and form action with HTTP', async () => {
    const url = 'https://example.com';
    const html = `<html><head>
      <link href="http://cdn.example.com/style.css" rel="stylesheet">
    </head><body>
      <script src="http://cdn.example.com/app.js"></script>
      <form action="http://api.example.com/submit"></form>
    </body></html>`;

    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 3, 'Should flag link, script, and form action');
  });
});

describe('mixed-content check — HTTP site', () => {
  it('returns no findings for HTTP site (not HTTPS)', async () => {
    const url = 'http://example.com';
    const html = '<html><body><img src="http://cdn.example.com/photo.jpg" alt="photo"></body></html>';

    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ [url]: html }),
    });

    assert.equal(findings.length, 0, 'HTTP site should not trigger mixed content');
  });
});
