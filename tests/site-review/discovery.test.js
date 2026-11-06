// Tests for sitemap and robots discovery: the legacy discoverPages wrapper, the parsers and discoverSite's SiteFiles.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import {
  discoverPages,
  discoverSite,
  extractLocs,
  extractSitemapLocs,
  parseUrlset,
  sitemapKind,
} from '../../tools/site-review/lib/discovery.js';
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
  return new Promise((resolve) => server.close(resolve));
}

describe('discoverPages', () => {
  let server;
  let baseUrl;

  before(async () => {
    const result = await createTestServer((req, res) => {
      if (req.url === '/sitemap.xml') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        const dynamicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
  <url><loc>${baseUrl}/about</loc></url>
  <url><loc>${baseUrl}/work</loc></url>
</urlset>`;
        res.end(dynamicSitemap);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    server = result.server;
    baseUrl = result.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('parses sitemap.xml and returns all <loc> URLs', async () => {
    const pages = await discoverPages(baseUrl);

    assert.equal(pages.length, 3);
    assert.ok(pages.includes(`${baseUrl}/`));
    assert.ok(pages.includes(`${baseUrl}/about`));
    assert.ok(pages.includes(`${baseUrl}/work`));
  });

  it('returns manual pages resolved against root URL when provided', async () => {
    const pages = await discoverPages(baseUrl, ['/contact', '/pricing']);

    assert.equal(pages.length, 2);
    assert.ok(pages.includes(`${baseUrl}/contact`));
    assert.ok(pages.includes(`${baseUrl}/pricing`));
  });

  it('handles full URLs in manual pages (no double-joining)', async () => {
    const fullUrl = 'https://other-site.com/page';
    const pages = await discoverPages(baseUrl, [fullUrl, '/local']);

    assert.equal(pages.length, 2);
    assert.ok(pages.includes(fullUrl));
    assert.ok(pages.includes(`${baseUrl}/local`));
  });

  it('handles trailing slash on rootUrl', async () => {
    const pages = await discoverPages(`${baseUrl}/`, ['/about']);

    assert.equal(pages.length, 1);
    assert.ok(!pages[0].includes('//about'), `Got double slash: ${pages[0]}`);
    assert.ok(pages[0].endsWith('/about'));
  });

  it('falls back to [rootUrl] when sitemap is missing', async () => {
    let noSitemapResult;
    try {
      noSitemapResult = await createTestServer((req, res) => {
        res.writeHead(404);
        res.end('Not Found');
      });
      const pages = await discoverPages(noSitemapResult.baseUrl);
      assert.equal(pages.length, 1);
      assert.equal(pages[0], noSitemapResult.baseUrl);
    } finally {
      if (noSitemapResult) await closeServer(noSitemapResult.server);
    }
  });
});

describe('sitemap index support', () => {
  let server;
  let baseUrl;

  before(async () => {
    const result = await createTestServer((req, res) => {
      if (req.url === '/sitemap.xml') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-posts.xml</loc></sitemap>
</sitemapindex>`;
        res.end(sitemapIndex);
      } else if (req.url === '/sitemap-pages.xml') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
  <url><loc>${baseUrl}/about</loc></url>
</urlset>`);
      } else if (req.url === '/sitemap-posts.xml') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/blog/post-1</loc></url>
  <url><loc>${baseUrl}/blog/post-2</loc></url>
</urlset>`);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    server = result.server;
    baseUrl = result.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('follows sitemap index and collects URLs from child sitemaps', async () => {
    const pages = await discoverPages(baseUrl);

    assert.equal(pages.length, 4);
    assert.ok(pages.includes(`${baseUrl}/`));
    assert.ok(pages.includes(`${baseUrl}/about`));
    assert.ok(pages.includes(`${baseUrl}/blog/post-1`));
    assert.ok(pages.includes(`${baseUrl}/blog/post-2`));
  });
});

describe('extractLocs', () => {
  it('extracts <loc> from <url> tags only, not <image:loc>', () => {
    const xml = `
<urlset>
  <url><loc>https://example.com/page1</loc></url>
  <url>
    <loc>https://example.com/page2</loc>
    <image:image><image:loc>https://example.com/img.jpg</image:loc></image:image>
  </url>
</urlset>`;
    const urls = extractLocs(xml);
    assert.equal(urls.length, 2);
    assert.ok(!urls.some((u) => u.includes('img.jpg')));
  });

  it('strips CDATA wrappers from <loc> values', () => {
    const xml = `<urlset><url><loc><![CDATA[https://example.com/page]]></loc></url></urlset>`;
    const urls = extractLocs(xml);
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://example.com/page');
  });
});

describe('extractSitemapLocs', () => {
  it('extracts <loc> from <sitemap> tags', () => {
    const xml = `
<sitemapindex>
  <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap>
</sitemapindex>`;
    const urls = extractSitemapLocs(xml);
    assert.equal(urls.length, 2);
    assert.equal(urls[0], 'https://example.com/sitemap-1.xml');
  });
});

describe('parseUrlset and sitemapKind', () => {
  it('reads loc and lastmod in any child order and decodes XML entities', () => {
    const xml = '<urlset><url><lastmod>2026-01-01</lastmod><loc>https://e.com/a?x=1&amp;y=2</loc></url><!-- <url><loc>https://e.com/c</loc></url> --><url><loc> https://e.com/b </loc></url></urlset>';
    assert.deepEqual(parseUrlset(xml), [
      { loc: 'https://e.com/a?x=1&y=2', lastmod: '2026-01-01' },
      { loc: 'https://e.com/b', lastmod: null },
    ]);
  });

  it('classifies the root element', () => {
    assert.equal(sitemapKind('<?xml version="1.0"?>\n<urlset xmlns="x"></urlset>'), 'urlset');
    assert.equal(sitemapKind('<sitemapindex></sitemapindex>'), 'index');
    assert.equal(sitemapKind('<!DOCTYPE html><html></html>'), null);
    assert.equal(sitemapKind('not xml'), null);
  });
});

describe('discoverSite on the golden server', () => {
  let golden;
  let site;

  before(async () => {
    golden = await startGoldenServer();
    site = await discoverSite(golden.url, { crawlConfig: { acceptLanguage: 'nl-NL', retryDelayMs: 10 }, fetchPage });
  });

  after(async () => {
    await golden.close();
  });

  it('returns robots, sitemaps, deduplicated rows and llms state', () => {
    assert.deepEqual(site.root, { url: golden.url, urlKey: `${golden.url}/` });
    assert.equal(site.robots.status, 200);
    assert.match(site.robots.text, /Disallow: \/private/);
    assert.deepEqual(site.robots.sitemapUrls, [`${golden.url}/sitemap.xml`]);
    assert.equal(site.sitemaps.length, 1);
    assert.equal(site.sitemaps[0].kind, 'urlset');
    assert.equal(site.sitemaps[0].valid, true);
    assert.equal(site.sitemaps[0].error, null);
    const keys = site.rows.map((row) => row.urlKey);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(site.sitemaps[0].urlCount, keys.length + 1);
    assert.equal(keys.filter((key) => key === `${golden.url}/about`).length, 1);
    const about = site.rows.find((row) => row.urlKey === `${golden.url}/about`);
    assert.deepEqual(about, { url: `${golden.url}/about`, urlKey: `${golden.url}/about`, lastmod: '2026-11-01', sitemap: `${golden.url}/sitemap.xml` });
    assert.deepEqual(site.llms, { url: `${golden.url}/llms.txt`, status: 404, fetchState: 'ok' });
  });

  it('sends the crawl user agent and Accept-Language on every discovery request', () => {
    const sent = golden.requests.filter((request) => request.host === 'site');
    assert.deepEqual(sent.map((request) => request.path), ['/robots.txt', '/sitemap.xml', '/llms.txt']);
    for (const request of sent) {
      assert.equal(request.headers['user-agent'], DEFAULT_USER_AGENT);
      assert.equal(request.headers['accept-language'], 'nl-NL');
    }
  });
});

describe('discoverSite edge cases', () => {
  let server;
  let baseUrl;

  before(async () => {
    const result = await createTestServer((req, res) => {
      const xml = { 'content-type': 'application/xml' };
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(`User-agent: *\nSitemap: ${baseUrl}/index.xml\nSitemap: ${baseUrl}/broken.xml\nSitemap: ${baseUrl}/gone.xml\n`);
      } else if (req.url === '/index.xml') {
        res.writeHead(200, xml);
        res.end(`<sitemapindex><sitemap><loc>${baseUrl}/a.xml</loc></sitemap><sitemap><loc>${baseUrl}/nested.xml</loc></sitemap></sitemapindex>`);
      } else if (req.url === '/a.xml') {
        res.writeHead(200, xml);
        res.end(`<urlset><url><loc>${baseUrl}/x</loc></url><url><loc>${baseUrl}/X/</loc></url></urlset>`);
      } else if (req.url === '/nested.xml') {
        res.writeHead(200, xml);
        res.end(`<sitemapindex><sitemap><loc>${baseUrl}/deep.xml</loc></sitemap></sitemapindex>`);
      } else if (req.url === '/broken.xml') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body>Not a sitemap</body></html>');
      } else {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('nope');
      }
    });
    server = result.server;
    baseUrl = result.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('recurses one index level, marks invalid and missing sitemaps, and passes the user agent', async () => {
    const agents = [];
    const spy = (url, opts) => {
      agents.push(opts.userAgent);
      return fetchPage(url, opts);
    };
    const site = await discoverSite(baseUrl, { crawlConfig: { userAgent: 'curl/8', retryDelayMs: 10 }, fetchPage: spy });
    const byUrl = Object.fromEntries(site.sitemaps.map((entry) => [entry.url.replace(baseUrl, ''), entry]));
    assert.equal(byUrl['/index.xml'].kind, 'index');
    assert.equal(byUrl['/index.xml'].urlCount, 2);
    assert.equal(byUrl['/a.xml'].urlCount, 2);
    assert.equal(byUrl['/nested.xml'].kind, 'index');
    assert.equal(byUrl['/deep.xml'], undefined);
    assert.equal(byUrl['/broken.xml'].valid, false);
    assert.match(byUrl['/broken.xml'].error, /urlset/);
    assert.equal(byUrl['/gone.xml'].status, 404);
    assert.equal(byUrl['/gone.xml'].valid, false);
    assert.equal(byUrl['/gone.xml'].error, 'HTTP 404');
    assert.deepEqual(site.rows.map((row) => row.url), [`${baseUrl}/x`]);
    assert.ok(agents.length > 0 && agents.every((agent) => agent === 'curl/8'));
  });
});
