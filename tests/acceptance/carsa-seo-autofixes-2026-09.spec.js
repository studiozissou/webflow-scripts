/**
 * Carsa September SEO auto-fixes — acceptance tests.
 * Spec: projects/carsa/.claude/specs/carsa-seo-autofixes-2026-09.md
 *
 * Runs against the live site: these are CMS, redirect and page-schema changes that only
 * exist after a Webflow publish, so there is no local or staging equivalent.
 * Raw HTML is checked with request.get rather than the rendered DOM, because the sold-car
 * schema bug this work sits next to is precisely a raw-versus-rendered mismatch.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const BASE = process.env.CARSA_URL || 'https://www.carsa.co.uk';
const SLUG = 'carsa-seo-autofixes-2026-09';

/** Fetch a URL without following redirects and return status plus location. */
async function head(request, path) {
  const res = await request.get(`${BASE}${path}`, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers()['location'] || null };
}

/** Extract and parse every JSON-LD block from raw HTML. */
function parseJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Flatten @graph wrappers into a single list of nodes. */
function nodes(jsonLdBlocks) {
  return jsonLdBlocks.flatMap((d) => (d['@graph'] ? d['@graph'] : [d]));
}

function hasType(node, type) {
  const t = node['@type'];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

test.describe(SLUG, () => {
  test('duplicate vehicle j16bnt-fa27e is gone and j16bnt survives', async ({ request }) => {
    const dupe = await head(request, '/vehicles/used/j16bnt-fa27e');
    expect(dupe.status).toBe(404);

    const kept = await head(request, '/vehicles/used/j16bnt');
    expect(kept.status).toBe(200);
  });

  test('duplicate vehicle f14yeg-03cc0 is gone and f14yeg survives', async ({ request }) => {
    const dupe = await head(request, '/vehicles/used/f14yeg-03cc0');
    expect(dupe.status).toBe(404);

    const kept = await head(request, '/vehicles/used/f14yeg');
    expect(kept.status).toBe(200);
  });

  test('adaptive cruise control bare slug redirects to the guide', async ({ request }) => {
    const bare = await head(request, '/blog/what-is-adaptive-cruise-control');
    expect(bare.status).toBe(301);
    expect(bare.location).toContain('/blog/what-is-adaptive-cruise-control-guide');

    const guide = await head(request, '/blog/what-is-adaptive-cruise-control-guide');
    expect(guide.status).toBe(200);
  });

  test('warranty page emits Product and BreadcrumbList in raw HTML', async ({ request }) => {
    const res = await request.get(`${BASE}/car-care/extended-mechanical-warranty`);
    expect(res.status()).toBe(200);
    const all = nodes(parseJsonLd(await res.text()));

    const product = all.find((n) => hasType(n, 'Product'));
    expect(product, 'Product node present').toBeTruthy();
    expect(product['@id']).toBe(
      'https://www.carsa.co.uk/car-care/extended-mechanical-warranty#product'
    );
    expect(product.name).toBeTruthy();
    expect(product.description).toBeTruthy();
    // never ship an empty string field — that is the sold-car VDP bug
    for (const [key, value] of Object.entries(product)) {
      expect(value, `${key} is not an empty string`).not.toBe('');
    }

    expect(all.some((n) => hasType(n, 'BreadcrumbList')), 'BreadcrumbList present').toBe(true);
  });

  test('warranty page keeps its canonical after the schema write', async ({ request }) => {
    const html = await (await request.get(`${BASE}/car-care/extended-mechanical-warranty`)).text();
    const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
    expect(canonical, 'canonical tag present').toBeTruthy();
    expect(canonical[1]).toBe('https://www.carsa.co.uk/car-care/extended-mechanical-warranty');
  });

  test('shrewsbury store page redirects to the stores hub', async ({ request }) => {
    const res = await head(request, '/stores/shrewsbury');
    expect(res.status).toBe(301);
    expect(res.location).toContain('/stores');
  });

  test('regression: sell pages self-canonicalise and old URLs still redirect', async ({
    request,
  }) => {
    for (const [oldPath, newPath] of [
      ['/value-car', '/sell-car/value-car'],
      ['/part-exchange', '/sell-car/part-exchange'],
    ]) {
      const redirect = await head(request, oldPath);
      expect(redirect.status).toBe(301);
      expect(redirect.location).toContain(newPath);

      const html = await (await request.get(`${BASE}${newPath}`)).text();
      const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
      expect(canonical, `canonical present on ${newPath}`).toBeTruthy();
      expect(canonical[1]).toBe(`https://www.carsa.co.uk${newPath}`);
    }
  });

  test('no console errors on the touched pages', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const path of [
      '/car-care/extended-mechanical-warranty',
      '/blog/what-is-adaptive-cruise-control-guide',
    ]) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
    }

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
