import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta } from '../../../tools/site-review/checks/security-headers.js';
import { loadConfig } from '../../../tools/site-review/config.js';
import { createLogger } from '../../../tools/site-review/lib/logger.js';

function makeMockFetchPage(headers) {
  return async () => ({
    html: '<html><body></body></html>',
    headers,
    statusCode: 200,
    redirectChain: [],
  });
}

describe('security-headers check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'security-headers');
    assert.equal(meta.category, 'security');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, true);
    assert.ok(meta.label);
  });
});

describe('security-headers check — all headers missing', () => {
  it('flags all 6 missing headers', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    assert.equal(findings.length, 6);
    assert.ok(findings.every((f) => f.check === 'security-headers'));
    assert.ok(findings.every((f) => f.category === 'security'));

    const names = findings.map((f) => f.title.toLowerCase());
    assert.ok(names.some((n) => n.includes('strict-transport-security')));
    assert.ok(names.some((n) => n.includes('content-security-policy')));
    assert.ok(names.some((n) => n.includes('x-content-type-options')));
    assert.ok(names.some((n) => n.includes('x-frame-options')));
    assert.ok(names.some((n) => n.includes('referrer-policy')));
    assert.ok(names.some((n) => n.includes('permissions-policy')));
  });

  it('uses correct severity levels', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({}),
    });

    const warningHeaders = ['strict-transport-security', 'content-security-policy', 'x-content-type-options'];
    const infoHeaders = ['x-frame-options', 'referrer-policy', 'permissions-policy'];

    for (const f of findings) {
      const headerName = f.meta?.header;
      if (warningHeaders.includes(headerName)) {
        assert.equal(f.severity, 'warning', `${headerName} should be warning`);
      } else if (infoHeaders.includes(headerName)) {
        assert.equal(f.severity, 'info', `${headerName} should be info`);
      }
    }
  });
});

describe('security-headers check — all headers present', () => {
  it('returns empty array when all headers exist', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()',
      }),
    });

    assert.equal(findings.length, 0);
  });
});

describe('security-headers check — partial headers', () => {
  it('only flags missing headers', async () => {
    const url = 'https://example.com';
    const findings = await check({
      url,
      pages: [url],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: makeMockFetchPage({
        'strict-transport-security': 'max-age=31536000',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
      }),
    });

    // Missing: content-security-policy (warning), referrer-policy (info), permissions-policy (info)
    assert.equal(findings.length, 3);
    const names = findings.map((f) => f.meta?.header);
    assert.ok(names.includes('content-security-policy'));
    assert.ok(names.includes('referrer-policy'));
    assert.ok(names.includes('permissions-policy'));
  });
});

describe('security-headers check — only checks root URL', () => {
  it('calls fetchPage with the root url, not individual pages', async () => {
    const calledUrls = [];
    const mockFetchPage = async (url) => {
      calledUrls.push(url);
      return {
        html: '<html></html>',
        headers: {
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'referrer-policy': 'strict-origin',
          'permissions-policy': 'camera=()',
        },
        statusCode: 200,
        redirectChain: [],
      };
    };

    await check({
      url: 'https://example.com',
      pages: ['https://example.com', 'https://example.com/about', 'https://example.com/contact'],
      config: loadConfig(),
      log: createLogger(false),
      fetchPage: mockFetchPage,
    });

    assert.equal(calledUrls.length, 1);
    assert.equal(calledUrls[0], 'https://example.com');
  });
});
