import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  check,
  meta,
  extractCustomCode,
  reviewCode,
} from '../../../tools/site-review/checks/code-review.js';
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

/**
 * Create a mock Anthropic client that returns a canned JSON response.
 * @param {Array} findings - Array of finding objects the AI would return
 * @returns {object} mock client with messages.create()
 */
function makeMockClient(findings) {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify(findings) }],
      }),
    },
  };
}

/**
 * Create a mock Anthropic client that returns invalid JSON.
 */
function makeBrokenClient() {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      }),
    },
  };
}

// ─── meta ────────────────────────────────────────────────────────────────

describe('code-review check — meta export', () => {
  it('has correct meta fields', () => {
    assert.equal(meta.name, 'code-review');
    assert.equal(meta.category, 'code-quality');
    assert.equal(meta.tier, 1);
    assert.equal(meta.parallel, false);
    assert.ok(meta.label);
  });
});

// ─── extractCustomCode ──────────────────────────────────────────────────

describe('extractCustomCode', () => {
  it('extracts inline scripts and styles', () => {
    const html = `<html><head>
      <script>const x = 1; doSomething(x);</script>
      <style>.foo { color: red; }</style>
    </head><body></body></html>`;

    const result = extractCustomCode(html);
    assert.ok(result.includes('const x = 1'), 'Should include script content');
    assert.ok(result.includes('.foo { color: red; }'), 'Should include style content');
  });

  it('skips scripts with src attribute', () => {
    const html = `<html><head>
      <script src="https://cdn.example.com/lib.js">fallback</script>
      <script>const custom = true;</script>
    </head><body></body></html>`;

    const result = extractCustomCode(html);
    assert.ok(!result.includes('fallback'), 'Should skip external scripts');
    assert.ok(result.includes('const custom = true'), 'Should include inline scripts');
  });

  it('skips library scripts with known signatures in first lines', () => {
    const html = `<html><head>
      <script>
        Webflow.push(function() {
          // Webflow interaction code
          var ix = Webflow.require('ix2');
          ix.init();
        });
      </script>
      <script>
        const myApp = {
          init() { document.querySelector('.btn').addEventListener('click', handler); },
          destroy() { /* cleanup */ },
        };
        myApp.init();
      </script>
    </head><body></body></html>`;

    const result = extractCustomCode(html);
    assert.ok(!result.includes('Webflow.push'), 'Should skip Webflow library script');
    assert.ok(result.includes('myApp'), 'Should include custom script');
  });

  it('skips analytics/tracking scripts', () => {
    const html = `<html><head>
      <script>
        gtag('config', 'GA-123');
        gtag('event', 'page_view');
      </script>
      <script>
        window._hsq = window._hsq || [];
        _hsq.push(['setContentType', 'standard-page']);
      </script>
    </head><body></body></html>`;

    const result = extractCustomCode(html);
    assert.ok(!result.includes('gtag'), 'Should skip gtag script');
    assert.ok(!result.includes('_hsq'), 'Should skip HubSpot script');
  });

  it('returns empty string for page with only library scripts', () => {
    const html = `<html><head>
      <script src="https://cdn.example.com/gsap.js"></script>
      <script>
        Webflow.push(function() { /* init */ });
      </script>
    </head><body></body></html>`;

    const result = extractCustomCode(html);
    assert.equal(result.trim(), '', 'Should return empty for library-only page');
  });

  it('returns empty string for page with no scripts or styles', () => {
    const html = '<html><head><title>Plain</title></head><body><p>Hello</p></body></html>';
    const result = extractCustomCode(html);
    assert.equal(result.trim(), '');
  });
});

// ─── reviewCode ─────────────────────────────────────────────────────────

describe('reviewCode', () => {
  it('maps AI response to Finding objects', async () => {
    const aiFindings = [
      {
        severity: 'warning',
        title: 'Using var instead of const/let',
        description: 'Line 3 uses var which can cause scoping issues.',
        recommendation: 'Replace var with const or let.',
      },
      {
        severity: 'critical',
        title: 'Exposed API key',
        description: 'An API key is hardcoded on line 7.',
        recommendation: 'Move the key to an environment variable.',
      },
    ];

    const client = makeMockClient(aiFindings);
    const findings = await reviewCode('var x = 1;', 'https://example.com', client);

    assert.equal(findings.length, 2);
    assert.equal(findings[0].check, 'code-review');
    assert.equal(findings[0].category, 'code-quality');
    assert.equal(findings[0].severity, 'warning');
    assert.equal(findings[0].title, 'Using var instead of const/let');
    assert.ok(findings[0].recommendation);
    assert.equal(findings[1].severity, 'critical');
  });

  it('returns empty array for empty code', async () => {
    const client = makeMockClient([]);
    const findings = await reviewCode('', 'https://example.com', client);
    assert.equal(findings.length, 0);
  });

  it('returns empty array for whitespace-only code', async () => {
    const client = makeMockClient([]);
    const findings = await reviewCode('   \n  \n  ', 'https://example.com', client);
    assert.equal(findings.length, 0);
  });

  it('handles JSON parse failure from AI', async () => {
    const client = makeBrokenClient();
    const findings = await reviewCode('const x = 1;', 'https://example.com', client);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'info');
    assert.ok(findings[0].title.toLowerCase().includes('parse'));
    assert.equal(findings[0].check, 'code-review');
  });

  it('handles AI returning invalid severity gracefully', async () => {
    const aiFindings = [
      {
        severity: 'banana',
        title: 'Some issue',
        description: 'Something wrong.',
        recommendation: 'Fix it.',
      },
    ];

    const client = makeMockClient(aiFindings);
    const findings = await reviewCode('const x = 1;', 'https://example.com', client);

    // Should downgrade invalid severity to 'info'
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'info');
  });
});

// ─── full check() ───────────────────────────────────────────────────────

describe('code-review check — full check()', () => {
  it('returns findings from mocked client', async () => {
    const html = `<html><head>
      <script>
        var myGlobal = 'oops';
        function doStuff() {
          eval(myGlobal);
          return undefined;
        }
        doStuff();
      </script>
    </head><body></body></html>`;

    const aiFindings = [
      {
        severity: 'critical',
        title: 'Use of eval()',
        description: 'eval() is used on line 3, which is a security risk.',
        recommendation: 'Avoid eval. Use JSON.parse or Function() if dynamic execution is truly needed.',
      },
    ];

    const config = loadConfig();
    config.anthropicClient = makeMockClient(aiFindings);

    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ 'https://example.com': html }),
    });

    assert.ok(findings.length >= 1, 'Should return at least one finding');
    assert.equal(findings[0].check, 'code-review');
    assert.equal(findings[0].severity, 'critical');
    assert.ok(findings[0].title.includes('eval'));
  });

  it('skips when no API key available and no client injected', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const config = loadConfig();
      // No anthropicClient injected, no env var

      const findings = await check({
        url: 'https://example.com',
        pages: ['https://example.com'],
        config,
        log: createLogger(false),
        fetchPage: makeMockFetchPage({
          'https://example.com': '<html><head><script>const x = 1;</script></head><body></body></html>',
        }),
      });

      assert.equal(findings.length, 0);
    } finally {
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });

  it('returns empty array when pages have no custom code', async () => {
    const html = `<html><head>
      <script src="https://cdn.example.com/lib.js"></script>
    </head><body></body></html>`;

    const config = loadConfig();
    config.anthropicClient = makeMockClient([]);

    const findings = await check({
      url: 'https://example.com',
      pages: ['https://example.com'],
      config,
      log: createLogger(false),
      fetchPage: makeMockFetchPage({ 'https://example.com': html }),
    });

    assert.equal(findings.length, 0);
  });
});
