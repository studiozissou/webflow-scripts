// Guards the live-site scan for old jsDelivr repo URLs: URL extraction, the inventory page list, and a crawl of the sitemap plus inventory pages that fails on a non-200 page, against a fake fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repoUrls, scanSite, inventoryPages } from '../../tools/release/cdn-scan-site.js';

test('repoUrls finds cdn.jsdelivr.net/gh/studiozissou URLs once each', () => {
  const html = [
    '<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.4.2/projects/oost/init.js"></script>',
    "<script src='//cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/shared/a.js'></script>",
    '<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.4.2/projects/oost/init.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js"></script>',
    '<script src="https://cdn.jsdelivr.net/gh/someoneelse/repo@1/a.js"></script>',
    '<script>load("https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@v1/x.js")</script>'
  ].join('\n');
  assert.deepEqual(repoUrls(html), [
    'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.4.2/projects/oost/init.js',
    '//cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/shared/a.js',
    'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@v1/x.js'
  ]);
  assert.deepEqual(repoUrls('<p>clean</p>'), []);
});

const INVENTORY = [
  '# Inventory',
  '',
  '## Inventory pages for `cdn:scan`',
  '- `https://teamzissou.io`: `/`, `/privacy`, `/terms`',
  '- `https://www.oosteten.nl`: `/`, `/afhalen`, `/en/catering`',
  '',
  '## Next section',
  '- `https://elsewhere.example`: `/x`'
].join('\n');

test('inventoryPages reads the page list for one origin', () => {
  assert.deepEqual(inventoryPages(INVENTORY, 'https://www.oosteten.nl'), ['/', '/afhalen', '/en/catering']);
  assert.deepEqual(inventoryPages(INVENTORY, 'https://teamzissou.io/'), ['/', '/privacy', '/terms']);
  assert.deepEqual(inventoryPages(INVENTORY, 'https://elsewhere.example'), []);
});

const OLD = 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.4.2/projects/oost/init.js';
const NEW = 'https://zissou-cdn.pages.dev/oost-v0.4.3/projects/oost/init.js';
const page = (src) => `<html><body><script src="${src}"></script></body></html>`;

function siteFake(routes) {
  const seen = [];
  const fetch = async (url, opts) => {
    seen.push(url);
    assert.ok(opts?.signal, 'fetch gets a timeout signal');
    const route = routes[url];
    if (!route) return new Response('missing', { status: 404 });
    if (route instanceof Error) throw route;
    return new Response(route.body, { status: route.status ?? 200 });
  };
  return { fetch, seen };
}

const SITEMAP = `<?xml version="1.0"?><urlset><url><loc>https://www.oosteten.nl/</loc></url><url><loc>https://www.oosteten.nl/afhalen</loc></url></urlset>`;

test('scanSite reads the sitemap plus inventory pages and reports 0 old URLs on a swapped site', async () => {
  const { fetch, seen } = siteFake({
    'https://www.oosteten.nl/sitemap.xml': { body: SITEMAP },
    'https://www.oosteten.nl/': { body: page(NEW) },
    'https://www.oosteten.nl/afhalen': { body: page(NEW) },
    'https://www.oosteten.nl/hidden': { body: page(NEW) }
  });
  const result = await scanSite({ origin: 'https://www.oosteten.nl', pages: ['/', '/hidden'], fetch, limit: 2 });
  assert.deepEqual(seen.filter((u) => !u.endsWith('sitemap.xml')).sort(), [
    'https://www.oosteten.nl/',
    'https://www.oosteten.nl/afhalen',
    'https://www.oosteten.nl/hidden'
  ]);
  assert.deepEqual(result.hits, []);
  assert.deepEqual(result.failures, []);
  assert.equal(result.line, 'Scanned 3 pages on https://www.oosteten.nl: 0 old URLs, 0 failures');
  assert.equal(result.exitCode, 0);
});

test('scanSite reports an old URL on a page and exits 1', async () => {
  const { fetch } = siteFake({
    'https://www.oosteten.nl/sitemap.xml': { body: SITEMAP },
    'https://www.oosteten.nl/': { body: page(NEW) },
    'https://www.oosteten.nl/afhalen': { body: page(OLD) }
  });
  const result = await scanSite({ origin: 'https://www.oosteten.nl', pages: [], fetch });
  assert.deepEqual(result.hits, [{ page: 'https://www.oosteten.nl/afhalen', url: OLD }]);
  assert.equal(result.exitCode, 1);
  assert.match(result.line, /1 old URLs, 0 failures/);
});

test('scanSite fails on a page that does not return 200 and on a timeout', async () => {
  const { fetch } = siteFake({
    'https://www.oosteten.nl/sitemap.xml': { body: SITEMAP },
    'https://www.oosteten.nl/': { body: page(NEW) },
    'https://www.oosteten.nl/afhalen': { status: 500, body: '' },
    'https://www.oosteten.nl/slow': new DOMException('The operation timed out.', 'TimeoutError')
  });
  const result = await scanSite({ origin: 'https://www.oosteten.nl', pages: ['/gone', '/slow'], fetch });
  const byPage = Object.fromEntries(result.failures.map((f) => [f.page, f.problem]));
  assert.match(byPage['https://www.oosteten.nl/afhalen'], /status 500/);
  assert.match(byPage['https://www.oosteten.nl/gone'], /status 404/);
  assert.match(byPage['https://www.oosteten.nl/slow'], /timed out/i);
  assert.equal(result.exitCode, 1);
});

test('scanSite fails when the sitemap does not return 200 but still scans the inventory pages', async () => {
  const { fetch } = siteFake({ 'https://www.oosteten.nl/': { body: page(NEW) } });
  const result = await scanSite({ origin: 'https://www.oosteten.nl/', pages: ['/'], fetch });
  assert.deepEqual(result.failures, [{ page: 'https://www.oosteten.nl/sitemap.xml', problem: 'status 404' }]);
  assert.equal(result.exitCode, 1);
});
