import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import { fetchPage } from '../../tools/site-review/lib/fetch-page.js';

/**
 * Helpers — spin up a local HTTP server for each test suite.
 */
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
  return new Promise((resolve) => server.close(resolve));
}

describe('fetchPage', () => {
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
      } else if (req.url === '/not-found') {
        res.writeHead(404, { 'content-type': 'text/html' });
        res.end('<html><body>Not Found</body></html>');
      } else if (req.url === '/server-error') {
        res.writeHead(500, { 'content-type': 'text/html' });
        res.end('<html><body>Internal Server Error</body></html>');
      } else if (req.url === '/hang') {
        // Never respond — used for timeout test
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
    const cache = new Map();
    const result = await fetchPage(`${baseUrl}/ok`, cache);

    assert.equal(typeof result.html, 'string');
    assert.ok(result.html.includes('Hello'));
    assert.equal(result.statusCode, 200);
    assert.equal(typeof result.headers, 'object');
    assert.equal(result.headers['x-custom'], 'test-value');
    assert.ok(Array.isArray(result.redirectChain));
    assert.equal(result.redirectChain.length, 0);
  });

  it('records a single redirect in the chain', async () => {
    const cache = new Map();
    const result = await fetchPage(`${baseUrl}/redirect-start`, cache);

    assert.equal(result.statusCode, 200);
    assert.ok(result.html.includes('Redirected'));
    assert.equal(result.redirectChain.length, 1);
    assert.ok(result.redirectChain[0].includes('/redirect-start'));
  });

  it('records a double redirect chain', async () => {
    const cache = new Map();
    const result = await fetchPage(`${baseUrl}/double-redirect`, cache);

    assert.equal(result.statusCode, 200);
    assert.equal(result.redirectChain.length, 2);
    assert.ok(result.redirectChain[0].includes('/double-redirect'));
    assert.ok(result.redirectChain[1].includes('/redirect-start'));
  });

  it('returns cached result on second call (same object reference)', async () => {
    const cache = new Map();
    const first = await fetchPage(`${baseUrl}/ok`, cache);
    const second = await fetchPage(`${baseUrl}/ok`, cache);

    assert.equal(first, second, 'cache should return the exact same object');
  });

  it('captures non-200 status codes', async () => {
    const cache = new Map();

    const r404 = await fetchPage(`${baseUrl}/not-found`, cache);
    assert.equal(r404.statusCode, 404);
    assert.ok(r404.html.includes('Not Found'));

    const r500 = await fetchPage(`${baseUrl}/server-error`, new Map());
    assert.equal(r500.statusCode, 500);
  });

  it('throws on timeout (server that never responds)', async () => {
    const cache = new Map();
    await assert.rejects(
      () => fetchPage(`${baseUrl}/hang`, cache, { timeoutMs: 500 }),
      (err) => {
        // AbortError or timeout-related error
        assert.ok(
          err.name === 'AbortError' || err.name === 'TimeoutError' || /abort/i.test(err.message),
          `Expected abort/timeout error, got: ${err.name} — ${err.message}`,
        );
        return true;
      },
    );
  });

  it('headers are a plain object, not a Headers instance', async () => {
    const cache = new Map();
    const result = await fetchPage(`${baseUrl}/ok`, cache);

    // Headers instance has a .forEach method but isn't a plain object
    assert.equal(Object.getPrototypeOf(result.headers), Object.prototype);
  });
});
