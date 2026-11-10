// Tests for fetchPage: legacy call form, manual redirects with per-hop status, retry and Retry-After, fetch states, headers and the no-keep-alive transport.

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import { fetchPage } from '../../tools/site-review/lib/fetch-page.js';
import { DEFAULT_USER_AGENT } from '../../tools/site-review/config.js';
import { startGoldenServer } from './fixtures/golden/server.js';

function createTestServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(resolve);
  });
}

describe('fetchPage legacy call form', () => {
  let server;
  let baseUrl;

  before(async () => {
    const result = await createTestServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200, { 'content-type': 'text/html', 'x-custom': 'test-value' });
        res.end('<html><body>Hello</body></html>');
      } else if (req.url === '/redirect-start') {
        res.writeHead(301, { location: '/redirect-end' });
        res.end();
      } else if (req.url === '/redirect-end') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>Redirected</body></html>');
      } else if (req.url === '/double-redirect') {
        res.writeHead(302, { location: '/redirect-start' });
        res.end();
      } else if (req.url === '/loop-a') {
        res.writeHead(301, { location: '/loop-b' });
        res.end();
      } else if (req.url === '/loop-b') {
        res.writeHead(301, { location: '/loop-a' });
        res.end();
      } else if (req.url === '/not-found') {
        res.writeHead(404, { 'content-type': 'text/html' });
        res.end('<html><body>Not Found</body></html>');
      } else if (req.url === '/server-error') {
        res.writeHead(500, { 'content-type': 'text/html' });
        res.end('<html><body>Internal Server Error</body></html>');
      } else if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('x'.repeat(10_000));
      } else if (req.url === '/hang') {
        return;
      } else {
        res.writeHead(200);
        res.end('default');
      }
    });
    server = result.server;
    baseUrl = result.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('returns correct shape for a successful fetch', async () => {
    const result = await fetchPage(`${baseUrl}/ok`, { cache: new Map() });
    assert.equal(typeof result.html, 'string');
    assert.ok(result.html.includes('Hello'));
    assert.equal(result.body, result.html);
    assert.equal(result.statusCode, 200);
    assert.equal(result.status, 200);
    assert.equal(result.fetchState, 'ok');
    assert.equal(result.attempts, 1);
    assert.equal(result.contentType, 'text/html');
    assert.equal(result.headers['x-custom'], 'test-value');
    assert.deepEqual(result.redirectChain, []);
    assert.equal(result.bytes, 31);
    assert.ok(!Number.isNaN(Date.parse(result.fetchedAt)));
  });

  it('records a single redirect in the chain with its status', async () => {
    const result = await fetchPage(`${baseUrl}/redirect-start`, { cache: new Map() });
    assert.equal(result.statusCode, 200);
    assert.ok(result.html.includes('Redirected'));
    assert.deepEqual(result.redirectChain, [{ url: `${baseUrl}/redirect-start`, status: 301 }]);
    assert.equal(result.finalUrl, `${baseUrl}/redirect-end`);
  });

  it('records a double redirect chain in order', async () => {
    const result = await fetchPage(`${baseUrl}/double-redirect`, { cache: new Map() });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.redirectChain, [
      { url: `${baseUrl}/double-redirect`, status: 302 },
      { url: `${baseUrl}/redirect-start`, status: 301 },
    ]);
  });

  it('flags a redirect loop without throwing', async () => {
    const result = await fetchPage(`${baseUrl}/loop-a`, { retries: 0 });
    assert.equal(result.redirectLoop, true);
    assert.equal(result.redirectChain.length, 2);
  });

  it('returns cached result on second call (same object reference)', async () => {
    const cache = new Map();
    const first = await fetchPage(`${baseUrl}/ok`, { cache });
    const second = await fetchPage(`${baseUrl}/ok`, { cache });
    assert.equal(first, second, 'cache should return the exact same object');
  });

  it('captures non-200 status codes; a 5xx on both attempts stays ok with the status', async () => {
    const r404 = await fetchPage(`${baseUrl}/not-found`, { cache: new Map() });
    assert.equal(r404.statusCode, 404);
    assert.equal(r404.attempts, 1);
    assert.ok(r404.html.includes('Not Found'));
    const r500 = await fetchPage(`${baseUrl}/server-error`, { cache: new Map(), retryDelayMs: 10 });
    assert.equal(r500.statusCode, 500);
    assert.equal(r500.attempts, 2);
    assert.equal(r500.fetchState, 'ok');
  });

  it('returns a timeout fetch state instead of throwing', async () => {
    const result = await fetchPage(`${baseUrl}/hang`, { cache: new Map(), timeoutMs: 200, retryDelayMs: 10 });
    assert.equal(result.fetchState, 'timeout');
    assert.equal(result.errorCode, 'ETIMEDOUT');
    assert.equal(result.status, 0);
    assert.equal(result.attempts, 2);
    assert.equal(result.html, '');
  });

  it('truncates a body over maxBytes and keeps the first maxBytes', async () => {
    for (const keepAlive of [true, false]) {
      const result = await fetchPage(`${baseUrl}/big`, { maxBytes: 100, keepAlive });
      assert.equal(result.fetchState, 'truncated');
      assert.equal(result.body.length, 100);
    }
  });

  it('HEAD and readBody false skip the body', async () => {
    const head = await fetchPage(`${baseUrl}/ok`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body, null);
    const noBody = await fetchPage(`${baseUrl}/ok`, { readBody: false, keepAlive: false });
    assert.equal(noBody.body, null);
    assert.equal(noBody.fetchState, 'ok');
  });

  it('headers are a plain object, not a Headers instance', async () => {
    const result = await fetchPage(`${baseUrl}/ok`, { cache: new Map() });
    assert.equal(Object.getPrototypeOf(result.headers), Object.prototype);
  });
});

describe('fetchPage against the golden server', () => {
  let golden;

  before(async () => {
    golden = await startGoldenServer();
  });

  beforeEach(() => golden.reset());

  after(async () => {
    await golden.close();
  });

  it('fetch: retries once on 503 and 429, honours Retry-After, and two failures give unknown fetch_failed', async () => {
    const throttled = [];
    const flaky503 = await fetchPage(`${golden.url}/flaky-503`, { retryDelayMs: 10 });
    assert.equal(flaky503.status, 200);
    assert.equal(flaky503.attempts, 2);
    assert.equal(flaky503.fetchState, 'ok');

    const started = Date.now();
    const flaky429 = await fetchPage(`${golden.url}/flaky-429`, { retryDelayMs: 10, onThrottle: (host) => throttled.push(host) });
    assert.ok(Date.now() - started >= 950, 'Retry-After: 1 must delay the retry by about a second');
    assert.equal(flaky429.status, 200);
    assert.equal(flaky429.attempts, 2);
    assert.deepEqual(throttled, [new URL(golden.url).host]);

    const reset = await fetchPage(`${golden.url}/reset`, { retryDelayMs: 10 });
    assert.equal(reset.fetchState, 'fetch_failed');
    assert.equal(reset.errorCode, 'ECONNRESET');
    assert.equal(reset.attempts, 2);
    assert.equal(golden.countOf('/reset'), 2);

    const missing = await fetchPage('http://golden-missing.invalid/', { retryDelayMs: 10 });
    assert.equal(missing.fetchState, 'fetch_failed');
    assert.equal(missing.errorCode, 'ENOTFOUND');

    const rate = await fetchPage(`${golden.externalOrigin}/rate`, { retryDelayMs: 10 });
    assert.equal(rate.status, 429);
    assert.equal(rate.fetchState, 'blocked');
  });

  it('fetch: sends the configured Accept-Language and the default or overridden user agent', async () => {
    const page = await fetchPage(`${golden.url}/about`, { acceptLanguage: 'nl-NL,nl;q=0.9' });
    const sent = golden.requests.at(-1).headers;
    assert.equal(sent['user-agent'], DEFAULT_USER_AGENT);
    assert.equal(sent['accept-language'], 'nl-NL,nl;q=0.9');
    assert.equal(sent.accept, 'text/html,application/xhtml+xml,*/*;q=0.8');
    assert.match(page.body, /About the golden fixture practice/);

    const wall = await fetchPage(`${golden.url}/about`, { userAgent: 'curl/8', keepAlive: false });
    const sentNode = golden.requests.at(-1).headers;
    assert.equal(sentNode['user-agent'], 'curl/8');
    assert.equal(sentNode.connection, 'close');
    assert.equal(sentNode['accept-language'], undefined);
    assert.match(wall.body, /Checking your browser/);
  });

  it('follows a 302 chain with per-hop status on both transports', async () => {
    for (const keepAlive of [true, false]) {
      const result = await fetchPage(`${golden.url}/redirect-a`, { keepAlive });
      assert.deepEqual(result.redirectChain, [
        { url: `${golden.url}/redirect-a`, status: 302 },
        { url: `${golden.url}/redirect-b`, status: 302 },
      ]);
      assert.equal(result.finalUrl, `${golden.url}/redirect-c`);
      assert.equal(result.status, 200);
      assert.equal(result.contentEncoding, 'gzip');
      assert.match(result.body, /End of the redirect chain/);
    }
  });

  it('marks non-HTML responses non_html without a body', async () => {
    for (const keepAlive of [true, false]) {
      const pdf = await fetchPage(`${golden.url}/document.pdf`, { keepAlive });
      assert.equal(pdf.fetchState, 'non_html');
      assert.equal(pdf.status, 200);
      assert.equal(pdf.body, null);
      assert.equal(pdf.contentType, 'application/pdf');
    }
    const robots = await fetchPage(`${golden.url}/robots.txt`, { acceptAnyType: true });
    assert.equal(robots.fetchState, 'ok');
    assert.match(robots.body, /Disallow: \/private/);
  });

  it('reports a missing content encoding as null', async () => {
    const result = await fetchPage(`${golden.url}/uncompressed`);
    assert.equal(result.contentEncoding, null);
    assert.equal(result.fetchState, 'ok');
  });
});

describe('fetchPage retry floor and Retry-After cap', () => {
  it('fetch: waits at least minRetryDelayMs and caps Retry-After at maxRetryAfterMs', async () => {
    let hits = 0;
    const times = [];
    const server = http.createServer((req, res) => {
      hits += 1;
      times.push(Date.now());
      if (hits === 1) {
        res.writeHead(503, { 'retry-after': '60' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<html></html>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      const capped = await fetchPage(url, { retryDelayMs: 1, maxRetryAfterMs: 50, minRetryDelayMs: 300 });
      assert.equal(capped.status, 200);
      const gap = times[1] - times[0];
      assert.ok(gap >= 290 && gap < 2000, `gap ${gap} ms`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe('fetchPage legacy call form', () => {
  let server;
  let base;
  before(async () => {
    ({ server, baseUrl: base } = await createTestServer((req, res) => {
      if (req.url === '/old') {
        res.writeHead(301, { location: '/new' });
        return res.end();
      }
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end('User-agent: *\nDisallow: /private\n');
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<html>new</html>');
    }));
  });
  after(() => closeServer(server));

  it('fetchPage(url, cacheMap) keeps the pre-2.0 shape: string redirect chain, finalUrl, body for any content type', async () => {
    const cache = new Map();
    const moved = await fetchPage(`${base}/old`, cache);
    assert.deepEqual(moved.redirectChain, [`${base}/old`]);
    assert.equal(moved.finalUrl, `${base}/new`);
    assert.equal(moved.statusCode, 200);
    assert.equal(moved.html, '<html>new</html>');
    const robots = await fetchPage(`${base}/robots.txt`, cache);
    assert.match(robots.html, /Disallow: \/private/);
    assert.equal(await fetchPage(`${base}/old`, cache), moved);
  });
});
