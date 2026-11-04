// Acceptance tests for sz-launch-2026: the rebuilt Studio Zissou homepage passes SEO, quality and form checks on staging, and with SZ_LIVE=1 every old wdmorley.com URL and defensive domain 301s to studiozissou.com.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config({ path: '.env.test' });

const MAP = JSON.parse(readFileSync(new URL('./fixtures/sz-redirect-map.json', import.meta.url), 'utf8'));
const LIVE = Boolean(process.env.SZ_LIVE);
const NEW_HOST = (process.env.LIVE_URL || MAP.newHost).replace(/\/$/, '');
const BASE = LIVE ? NEW_HOST : (process.env.STAGING_URL || 'https://wdmorley.webflow.io').replace(/\/$/, '');
const CANONICAL = `${MAP.newHost}/`;
const PLACEHOLDERS = /\[copy\]|\[photo|TODO|Lorem ipsum|Thank you! Your submission has been received!|Oops! Something went wrong/i;
const WIDTHS = [390, 767, 1440, 1920];
const ALLOWED_FONTS = /PPPangaia-Medium|PPRader-(Regular|Italic|Bold)/;
const PROPOSAL_PATHS = (process.env.SZ_PROPOSAL_PATHS || '').split(',').map((p) => p.trim()).filter(Boolean);

async function head(request, url) {
  const res = await request.get(url, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers()['location'] || null };
}

function absolute(location, from) {
  return new URL(location, from).toString();
}

async function follow(request, url, maxHops = 3) {
  const hops = [];
  let current = url;
  for (let i = 0; i <= maxHops; i += 1) {
    const { status, location } = await head(request, current);
    hops.push({ url: current, status });
    if (status < 300 || status >= 400 || !location) return { final: current, status, hops };
    current = absolute(location, current);
  }
  return { final: current, status: 0, hops };
}

function jsonLdTypes(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return blocks.flatMap((m) => {
    const data = JSON.parse(m[1]);
    const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
    return nodes.map((n) => n['@type']).flat();
  });
}

test.describe('sz-launch-2026 homepage', () => {
  let html = '';

  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
    html = await res.text();
  });

  test('home returns 200 with one h1 and SEO meta', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toMatch(/Studio Zissou$/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThanOrEqual(70);
    expect(description?.length ?? 0).toBeLessThanOrEqual(160);
    for (const prop of ['og:title', 'og:description', 'og:image']) {
      await expect(page.locator(`meta[property="${prop}"]`)).toHaveCount(1);
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('canonical points at studiozissou.com', async () => {
    const match = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
    expect(match?.[1]).toBe(CANONICAL);
  });

  test('JSON-LD parses and includes Organization, WebSite, FAQPage', async () => {
    const types = jsonLdTypes(html);
    for (const type of ['Organization', 'WebSite', 'FAQPage']) expect(types).toContain(type);
  });

  test('no placeholders or Webflow default form text', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(PLACEHOLDERS);
  });

  test('old site markup is gone', async () => {
    expect(html).not.toContain('testimonial-slider');
    expect(html).not.toContain('elfsight');
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('no serious or critical axe violations', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
    expect(bad).toEqual([]);
  });

  test('at most four font files load', async ({ page }) => {
    const fonts = [];
    page.on('request', (req) => req.resourceType() === 'font' && fonts.push(req.url()));
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    expect(fonts.length).toBeLessThanOrEqual(4);
    for (const url of fonts) expect(decodeURIComponent(url)).toMatch(ALLOWED_FONTS);
  });

  test('every link is real and resolves', async ({ page, request }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const links = await page.locator('a').evaluateAll((els) =>
      els.map((a) => ({ href: a.getAttribute('href') || '', abs: a.href, target: a.target, rel: a.rel })),
    );
    for (const link of links) {
      expect(link.href, 'empty or # link').not.toMatch(/^(#?)$/);
      if (link.target === '_blank') expect(link.rel).toContain('noopener');
    }
    const internal = [...new Set(links.map((l) => l.abs).filter((u) => u.startsWith(BASE)).map((u) => u.split('#')[0]))];
    for (const url of internal) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status(), url).toBeLessThan(400);
    }
  });

  test('form inputs are labelled and attribution fields are injected', async ({ page }) => {
    await page.goto(`${BASE}/?utm_source=acceptance`, { waitUntil: 'networkidle' });
    const unlabelled = await page.locator('form input:not([type=hidden]):not([type=submit]), form textarea').evaluateAll((els) =>
      els.filter((el) => !el.getAttribute('aria-label') && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest('label')).length,
    );
    expect(unlabelled).toBe(0);
    await expect(page.locator('form input[type=hidden][name="utm_source"]')).toHaveCount(1);
    await expect(page.locator('form input[type=hidden][name="conversion_page"]')).toHaveCount(1);
  });

  test('init.js loads from a pinned jsDelivr tag', async () => {
    expect(html).toMatch(/cdn\.jsdelivr\.net\/gh\/studiozissou\/webflow-scripts@studio-zissou-v\d+\.\d+\.\d+\/projects\/studio-zissou\/init\.js/);
  });

  test('privacy and terms pages exist and unknown paths 404', async ({ request }) => {
    for (const path of ['/privacy', '/terms']) expect((await request.get(`${BASE}${path}`)).status(), path).toBe(200);
    expect((await request.get(`${BASE}/this-page-does-not-exist`)).status()).toBe(404);
  });
});

test.describe('sz-launch-2026 live cutover', () => {
  test.skip(!LIVE, 'Set SZ_LIVE=1 after the custom-domain publish');

  test('every old wdmorley.com URL 301s to its new target', async ({ request }) => {
    for (const row of MAP.paths) {
      const from = `${MAP.oldHosts[0]}${row.from}`;
      const first = await head(request, from);
      expect(first.status, from).toBe(301);
      const result = await follow(request, from);
      expect(result.status, from).toBe(200);
      expect(result.final, from).toBe(`${NEW_HOST}${row.to}`);
      expect(result.hops.length - 1, `${from} hops`).toBeLessThanOrEqual(2);
    }
  });

  test('every host variant and defensive domain lands on studiozissou.com', async ({ request }) => {
    for (const host of [...MAP.oldHosts, ...MAP.defensiveHosts]) {
      const result = await follow(request, `${host}/`);
      expect(result.status, host).toBe(200);
      expect(result.final, host).toBe(`${NEW_HOST}/`);
    }
  });

  test('sitemap and robots are clean', async ({ request }) => {
    const sitemap = await request.get(`${NEW_HOST}/sitemap.xml`);
    expect(sitemap.status()).toBe(200);
    const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc.startsWith(NEW_HOST)).toBe(true);
      expect(loc).not.toContain('/project-proposals/');
    }
    const robots = await (await request.get(`${NEW_HOST}/robots.txt`)).text();
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robots).toContain('sitemap.xml');
  });

  test('proposal URLs 404', async ({ request }) => {
    test.skip(PROPOSAL_PATHS.length === 0, 'Set SZ_PROPOSAL_PATHS in .env.test');
    for (const path of PROPOSAL_PATHS) {
      expect((await request.get(`${NEW_HOST}${path}`)).status(), path).toBe(404);
    }
  });
});
