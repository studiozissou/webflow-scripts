// Unit tests for the site-archive mirror plan: wget domain list and sitemap URL list, with a stub fetch.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorDomains, sitemapUrls, CDN_HOSTS } from '../../tools/site-archive/mirror-plan.js';

const urlset = (locs) =>
  `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs
    .map((l) => `<url><loc>${l}</loc></url>`)
    .join('')}</urlset>`;

function stubFetch(routes) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    const body = routes[String(url)];
    return body === undefined
      ? { ok: false, status: 404, text: async () => '' }
      : { ok: true, status: 200, text: async () => body };
  });
  return calls;
}

test('mirrorDomains lists the www host, its apex twin and the Webflow CDN hosts', () => {
  assert.deepEqual(mirrorDomains('https://www.example.com/'), ['www.example.com', 'example.com', ...CDN_HOSTS]);
});

test('mirrorDomains adds the www twin for an apex URL', () => {
  assert.deepEqual(mirrorDomains('https://example.com/about').slice(0, 2), ['example.com', 'www.example.com']);
});

test('the CDN hosts are the five Webflow asset hosts', () => {
  assert.deepEqual(CDN_HOSTS, [
    'cdn.prod.website-files.com',
    'uploads-ssl.webflow.com',
    'assets.website-files.com',
    'daks2k3a4ib2z.cloudfront.net',
    'd3e54v103j8qbb.cloudfront.net',
  ]);
});

test('sitemapUrls reads <origin>/sitemap.xml and drops the start URL and duplicates', async (t) => {
  t.after(() => mock.restoreAll());
  const calls = stubFetch({
    'https://www.example.com/sitemap.xml': urlset([
      'https://www.example.com/',
      'https://www.example.com/about',
      'https://www.example.com/about',
      'https://www.example.com/work/one',
    ]),
  });
  const urls = await sitemapUrls('https://www.example.com/');
  assert.deepEqual(urls, ['https://www.example.com/about', 'https://www.example.com/work/one']);
  assert.equal(calls[0], 'https://www.example.com/sitemap.xml');
});

test('sitemapUrls follows a sitemap index', async (t) => {
  t.after(() => mock.restoreAll());
  stubFetch({
    'https://example.com/sitemap.xml':
      '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>',
    'https://example.com/a.xml': urlset(['https://example.com/a']),
    'https://example.com/b.xml': urlset(['https://example.com/b']),
  });
  assert.deepEqual(await sitemapUrls('https://example.com'), ['https://example.com/a', 'https://example.com/b']);
});

test('the CLI prints the domain list, also when run through a symlinked folder', () => {
  const toolDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'site-archive');
  const link = join(mkdtempSync(join(tmpdir(), 'mirror-plan-')), 'site-archive');
  symlinkSync(toolDir, link);
  const out = execFileSync(process.execPath, [join(link, 'mirror-plan.js'), 'domains', 'https://www.example.com/'], {
    encoding: 'utf8',
  });
  assert.equal(out.trim(), ['www.example.com', 'example.com', ...CDN_HOSTS].join(','));
});

test('sitemapUrls returns an empty list when there is no sitemap', async (t) => {
  t.after(() => mock.restoreAll());
  stubFetch({});
  assert.deepEqual(await sitemapUrls('https://example.com/'), []);
});
