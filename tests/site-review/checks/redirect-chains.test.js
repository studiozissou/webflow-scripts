import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta } from '../../../tools/site-review/checks/redirect-chains.js';
import { loadConfig } from '../../../tools/site-review/config.js';
import { createLogger } from '../../../tools/site-review/lib/logger.js';

function makeMockFetchPage(resultMap) {
  return async (url) => resultMap[url] ?? {
    html: '<html></html>',
    headers: {},
    statusCode: 200,
    redirectChain: [],
  };
}

describe('redirect-chains check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'redirect-chains');
    assert.equal(meta.category, 'seo');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, true);
    assert.ok(meta.label);
  });
});

describe('redirect-chains check — threshold logic', () => {
  it('no redirect chain produces no findings', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [url]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: [],
        },
      }),
    });

    assert.equal(findings.length, 0);
  });

  it('1 hop produces no finding (threshold is > 1)', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [url]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: ['http://example.com'],
        },
      }),
    });

    assert.equal(findings.length, 0, 'Single hop should not trigger finding');
  });

  it('2 hops produces a warning', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [url]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: ['http://example.com', 'http://www.example.com'],
        },
      }),
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'warning');
    assert.equal(findings[0].category, 'seo');
  });

  it('4 hops produces a critical finding', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [url]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: [
            'http://example.com',
            'http://www.example.com',
            'https://www.example.com',
            'https://example.com/home',
          ],
        },
      }),
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'critical');
  });

  it('checks multiple pages independently', async () => {
    const pages = ['https://example.com/a', 'https://example.com/b'];
    const findings = await check({
      url: 'https://example.com',
      pages,
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        [pages[0]]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: ['http://example.com/a', 'http://www.example.com/a'],
        },
        [pages[1]]: {
          html: '<html></html>',
          headers: {},
          statusCode: 200,
          redirectChain: [],
        },
      }),
    });

    assert.equal(findings.length, 1, 'Only page A should have a finding');
    assert.ok(findings[0].url.includes('/a'));
  });
});
