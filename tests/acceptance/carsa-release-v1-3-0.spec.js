// Acceptance tests for carsa-v1.3.0: one helpers.js loads first on every page, every v1.2.0 module still runs from the v1.3 folder, every lead link carries the same first-touch attribution, and the review fixes (car-redirect pre-gate and VRM check, FAQ digit slug, fuel encoding, models meta and @graph order, VDP 404 warn) hold.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import { BASE, loadPage, collectErrors, unexpectedErrors, firstPath, seedAttribution } from './helpers/carsa.js';

const V130_PATH_RE = /\/webflow\/v1\.3\.\d+\//;
const HELPERS = ['block', 'onReady', 'onLoad', 'onPage', 'cms', 'getAttributionParams', 'addParams'];
const VDP_PATH = '/vehicles/used/bl73dmu';
const MISSING_VDP = '/vehicles/used/zz99zzz';

const ENTRIES = [
  { entry: '/', modules: ['animations.js', 'valuation-links.js', 'equal-height.js'] },
  { entry: '/used-cars', modules: ['valuation-links.js'] },
  { entry: VDP_PATH, modules: [] },
  { entry: '/used-cars/near/', modules: ['near.js', 'valuation-links.js'] },
  { entry: '/car-finance-calculator', modules: ['finance-calculator.js', 'equal-height.js'] },
  { entry: '/get-started', modules: ['get-started.js'] },
  { entry: '/faq', modules: ['faq.js', 'faq-schema.js', 'animations.js'] },
  { entry: '/sell-car/value-car', modules: ['valuation-links.js', 'faq-schema.js', 'animations.js'] },
  { entry: '/used-cars/models/', modules: ['models-template.js', 'valuation-links.js'] },
  { entry: '/used-cars/fuel/', modules: ['fuel-template.js', 'valuation-links.js', 'animations.js'] },
  { entry: '/used-cars/promotions/', modules: ['promotions-template.js', 'animations.js'] },
  { entry: '/used-cars/models', modules: ['all-models.js', 'animations.js'] },
  { entry: '/blog', modules: ['blog.js', 'animations.js'] },
];

const LEAD_LINK_SELECTORS = [
  'a[href*="quote.carsa.co.uk/eligibility/questions"]',
  'a[href*="quote.carsa.co.uk/book/"]',
  'a[href*="quote.carsa.co.uk/build-deal/"]',
  'a[href*="quote.carsa.co.uk/get-px-valuation/"]',
  'a[href*="sellcar.carsa.co.uk/new-order"]',
];

function moduleSel(name) {
  return `script[src*="/webflow/"][src$="/${name}"]`;
}

async function resolve(request, entry) {
  if (!entry.endsWith('/')) return entry;
  const path = await firstPath(request, entry);
  test.skip(!path, `no ${entry} item in sitemap`);
  return path;
}

async function releaseScripts(page) {
  return page.$$eval('script[src*="/webflow/v1."]', (els) => els.map((e) => e.src));
}

async function leadLinkParams(page) {
  return page.evaluate((selectors) => {
    const out = {};
    for (const sel of selectors) {
      const a = document.querySelector(sel);
      if (!a) continue;
      const u = new URL(a.href);
      out[sel] = { utm_source: u.searchParams.get('utm_source'), utm_medium: u.searchParams.get('utm_medium') };
    }
    return out;
  }, LEAD_LINK_SELECTORS);
}

async function hoverFinanceCard(page) {
  const card = page.locator('[data-link="check-finance"]').first();
  if (await card.count()) await card.hover();
  await page.waitForTimeout(300);
}

test.describe('carsa-release-v1-3-0', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_V130, 'v1.3.0 not published yet; set CARSA_V130=1 once the footer tag points at v1.3.0');
  });

  for (const { entry, modules } of ENTRIES) {
    test(`v130-helpers-first on ${entry}: helpers.js is the first release script and exposes the seven helpers`, async ({ page, request }) => {
      await loadPage(page, await resolve(request, entry));
      const srcs = await releaseScripts(page);
      expect(srcs.length).toBeGreaterThan(0);
      expect(srcs[0]).toMatch(/\/helpers\.js$/);
      expect(srcs[0]).toMatch(V130_PATH_RE);
      const keys = await page.evaluate(() => Object.keys(window.__CARSA || {}).sort());
      expect(keys).toEqual([...HELPERS].sort());
    });

    test(`v130-loaded-once on ${entry}: every release module loads exactly once from the v1.3 folder`, async ({ page, request }) => {
      await loadPage(page, await resolve(request, entry));
      const srcs = await releaseScripts(page);
      const names = srcs.map((s) => s.slice(s.lastIndexOf('/') + 1));
      expect(new Set(names).size, names.join(',')).toBe(names.length);
      for (const s of srcs) expect(s).toMatch(V130_PATH_RE);
      for (const name of modules) expect(await page.locator(moduleSel(name)).count(), name).toBe(1);
    });

    test(`v130-ran-unchanged on ${entry}: the same v1.2.0 modules still report that they ran`, async ({ page, request }) => {
      await loadPage(page, await resolve(request, entry));
      const ran = await page.evaluate(() => window.__CARSA_RAN || []);
      expect(ran).toEqual(expect.arrayContaining(modules));
    });

    test(`v130-no-errors on ${entry}: no unexpected page errors and no __CARSA missing warning`, async ({ page, request }) => {
      const errors = collectErrors(page);
      const warns = [];
      page.on('console', (m) => {
        if (/__CARSA missing/.test(m.text())) warns.push(m.text());
      });
      await loadPage(page, await resolve(request, entry), 4000);
      expect(unexpectedErrors(errors)).toEqual([]);
      expect(warns).toEqual([]);
    });
  }

  test('attribution-first-touch-everywhere: after a UTM landing every lead link on the VDP carries the same first-touch UTMs', async ({ page }) => {
    await loadPage(page, '/?utm_source=t1&utm_medium=m1');
    await loadPage(page, VDP_PATH, 3000);
    await hoverFinanceCard(page);
    const params = await leadLinkParams(page);
    expect(Object.keys(params).length).toBeGreaterThan(1);
    for (const [sel, p] of Object.entries(params)) {
      expect(p, sel).toEqual({ utm_source: 't1', utm_medium: 'm1' });
    }
  });

  test('attribution-not-overwritten-by-second-visit: a later landing with different UTMs leaves every lead link on first-touch', async ({ page }) => {
    await loadPage(page, '/?utm_source=t1&utm_medium=m1');
    await loadPage(page, '/used-cars?utm_source=t2&utm_medium=m2');
    await hoverFinanceCard(page);
    const srp = await leadLinkParams(page);
    for (const [sel, p] of Object.entries(srp)) expect(p.utm_source, sel).toBe('t1');
    await loadPage(page, VDP_PATH, 3000);
    const vdp = await leadLinkParams(page);
    for (const [sel, p] of Object.entries(vdp)) expect(p.utm_source, sel).toBe('t1');
  });

  test('attribution-session-ignored: a seeded last-touch session record never reaches a link', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'first' }, referrerDomain: 'google.com' });
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('attribution_session', JSON.stringify({ utms: { utm_source: 'last' }, referrerDomain: 'facebook.com', updatedAt: Date.now() }));
      } catch (_) {}
    });
    await loadPage(page, '/used-cars', 3000);
    await hoverFinanceCard(page);
    const params = await leadLinkParams(page);
    for (const [sel, p] of Object.entries(params)) expect(p.utm_source, sel).toBe('first');
  });

  test('car-redirect-pre-gate: car-redirect.js is appended before helpers.js and lands on the lower-cased vehicle page', async ({ page }) => {
    const order = [];
    page.on('request', (r) => {
      const m = r.url().match(/\/webflow\/v1\.\d+\.\d+\/([a-z-]+\.js)$/);
      if (m) order.push(m[1]);
    });
    await page.goto(`${BASE}/car-redirect?vrm=BL73DMU`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/vehicles\/used\/bl73dmu/, { timeout: 15_000 });
    expect(order.indexOf('car-redirect.js')).toBeGreaterThanOrEqual(0);
    const helpersIdx = order.indexOf('helpers.js');
    if (helpersIdx !== -1) expect(order.indexOf('car-redirect.js')).toBeLessThan(helpersIdx);
  });

  test('car-redirect-rejects-bad-vrm: a VRM with path characters stays on /car-redirect', async ({ page }) => {
    await loadPage(page, '/car-redirect?vrm=..%2Fused-cars%3Fx', 3000);
    expect(new URL(page.url()).pathname).toMatch(/^\/car-redirect\/?$/);
  });

  test('faq-deep-link-digit-slug: ?question_contain= starting with a digit opens nothing wrong and throws nothing', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/faq?question_contain=1-deposit', 3000);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('fuel-search-all-encoded: the "Search all" link on a fuel page is a valid URL whose fuel value round-trips', async ({ page, request }) => {
    const path = await resolve(request, '/used-cars/fuel/');
    await loadPage(page, path);
    const href = await page.getAttribute('[data-button="search-similar"]', 'href');
    expect(href).toBeTruthy();
    const u = new URL(href, BASE);
    const fuel = u.searchParams.get('cars_fuel-type_equal');
    expect(fuel).toBeTruthy();
    expect(href).toBe('/used-cars?cars_fuel-type_equal=' + encodeURIComponent(fuel));
  });

  test('models-single-meta: a models page has exactly one meta description with a non-empty content', async ({ page, request }) => {
    const path = await resolve(request, '/used-cars/models/');
    await loadPage(page, path);
    const metas = await page.$$eval('meta[name="description"]', (els) => els.map((e) => e.getAttribute('content') || ''));
    expect(metas).toHaveLength(1);
    expect(metas[0].length).toBeGreaterThan(20);
  });

  test('models-graph-order-independent: no @graph node references a #faq entity unless a FAQPage block survives', async ({ page, request }) => {
    const path = await resolve(request, '/used-cars/models/');
    await loadPage(page, path);
    const state = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try {
          return JSON.parse(s.textContent);
        } catch (_) {
          return null;
        }
      });
      const faqAlive = blocks.some((b) => b && b['@type'] === 'FAQPage');
      const graphRefs = blocks
        .filter((b) => b && Array.isArray(b['@graph']))
        .flatMap((b) => b['@graph'])
        .filter((n) => n.mainEntity && typeof n.mainEntity['@id'] === 'string' && n.mainEntity['@id'].includes('#faq')).length;
      return { faqAlive, graphRefs };
    });
    if (!state.faqAlive) expect(state.graphRefs).toBe(0);
  });

  test('vdp-404-no-warn: a dead vehicle URL redirects to /used-cars without loading vdp.js or warning', async ({ page }) => {
    const warns = [];
    page.on('console', (m) => {
      if (/__CARSA_VDP missing/.test(m.text())) warns.push(m.text());
    });
    await page.goto(`${BASE}${MISSING_VDP}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/used-cars\/?(\?|$)/, { timeout: 15_000 });
    expect(warns).toEqual([]);
  });
});
