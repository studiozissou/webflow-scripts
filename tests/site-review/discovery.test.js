import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import { discoverPages, extractLocs, extractSitemapLocs } from '../../tools/site-review/lib/discovery.js';

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
