import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { check, meta } from '../../../tools/site-review/checks/psi.js';
import { loadConfig } from '../../../tools/site-review/config.js';
import { createLogger } from '../../../tools/site-review/lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', 'fixtures', 'psi-response.json');

async function loadFixture() {
  const raw = await readFile(fixturePath, 'utf-8');
  return JSON.parse(raw);
}

function makeMockFetchPage(htmlMap) {
  return async (url) => ({
    html: htmlMap[url] ?? '',
    headers: {},
    statusCode: 200,
    redirectChain: [],
  });
}

describe('psi check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'psi');
    assert.equal(meta.category, 'performance');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, false);
    assert.ok(meta.label);
  });
});

describe('psi check — empty API key', () => {
  it('returns empty array when no API key configured', async () => {
    const config = loadConfig();
    config.googlePsiApiKey = '';

    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    assert.equal(findings.length, 0);
  });
});

describe('psi check — with mocked API', () => {
  let originalFetch;
  let fixtureData;

  before(async () => {
    fixtureData = await loadFixture();
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('detects poor LCP as critical', async () => {
    globalThis.fetch = async (url) => {
      if (url.toString().includes('pagespeedonline')) {
        return {
          ok: true,
          json: async () => fixtureData,
        };
      }
      return originalFetch(url);
    };

    const config = loadConfig();
    config.googlePsiApiKey = 'test-key-123';

    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    // LCP is 4500ms in fixture, threshold critical is 4000
    const lcpFinding = findings.find(
      (f) => f.title.toLowerCase().includes('lcp') && f.severity === 'critical',
    );
    assert.ok(lcpFinding, 'Should find a critical LCP finding');
    assert.equal(lcpFinding.category, 'performance');
  });

  it('extracts Lighthouse performance score and flags low score', async () => {
    globalThis.fetch = async (url) => {
      if (url.toString().includes('pagespeedonline')) {
        return {
          ok: true,
          json: async () => fixtureData,
        };
      }
      return originalFetch(url);
    };

    const config = loadConfig();
    config.googlePsiApiKey = 'test-key-123';

    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    // Performance score is 0.35 (35), which is < 50 → warning
    const perfFinding = findings.find(
      (f) => f.title.toLowerCase().includes('performance') && f.title.toLowerCase().includes('lighthouse'),
    );
    assert.ok(perfFinding, 'Should find a Lighthouse performance finding');
    assert.equal(perfFinding.severity, 'warning');
  });

  it('runs for both mobile and desktop strategies', async () => {
    const calledStrategies = [];
    globalThis.fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('pagespeedonline')) {
        const strategy = new URL(urlStr).searchParams.get('strategy');
        calledStrategies.push(strategy);
        return {
          ok: true,
          json: async () => fixtureData,
        };
      }
      return originalFetch(url);
    };

    const config = loadConfig();
    config.googlePsiApiKey = 'test-key-123';

    await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    assert.ok(calledStrategies.includes('mobile'), 'Should call mobile strategy');
    assert.ok(calledStrategies.includes('desktop'), 'Should call desktop strategy');
  });

  it('handles API errors gracefully', async () => {
    globalThis.fetch = async (url) => {
      if (url.toString().includes('pagespeedonline')) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'Rate limited' } }),
        };
      }
      return originalFetch(url);
    };

    const config = loadConfig();
    config.googlePsiApiKey = 'test-key-123';

    // Should not throw
    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    // Should produce an info finding about the failure
    assert.ok(Array.isArray(findings));
  });
});
