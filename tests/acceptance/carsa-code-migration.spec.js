/**
 * Carsa Code Migration — Acceptance Tests
 *
 * Baseline tests for each page BEFORE and AFTER migration.
 * Tests added incrementally as each page is migrated.
 * Phase 1: Homepage first, then remaining pages in priority order.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const BASE = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(2000); // Finsweet + GSAP init
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Homepage ──────────────────────────────────────────────────

test.describe('carsa-code-migration — Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/');
  });

  test('homepage-no-errors: zero JS console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.waitForTimeout(2000);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('homepage-make-dropdown: make dropdown populates with options', async ({ page }) => {
    const options = page.locator('select[name="make"] option, [name="make"] .w-dropdown-link');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('homepage-search-button: search submit button present', async ({ page }) => {
    const btn = page.locator('#search-submit, #search-instant, [data-element="search-submit"]');
    await expect(btn.first()).toBeAttached();
  });

  test('homepage-price-tabs: price tab elements present', async ({ page }) => {
    const monthly = page.locator('#price-monthly-tab');
    const full = page.locator('#price-full-tab');
    const monthlyCount = await monthly.count();
    const fullCount = await full.count();
    expect(monthlyCount + fullCount).toBeGreaterThan(0);
  });

  test('homepage-px-form: PX form links contain quote.carsa.co.uk', async ({ page }) => {
    const pxLinks = page.locator('#px-form-large a, #px-form-small a, [data-link="px"] a');
    const count = await pxLinks.count();
    if (count > 0) {
      const href = await pxLinks.first().getAttribute('href');
      expect(href).toContain('quote.carsa.co.uk');
    }
  });

  test('homepage-equal-height: equal-height card containers present', async ({ page }) => {
    const cards = page.locator('[data-card-height="equal"]');
    await expect(cards.first()).toBeAttached();
  });

  test('homepage-svg-draw-line: SVG draw-line containers present', async ({ page }) => {
    const lines = page.locator('[data-svg="draw-line"]');
    await expect(lines.first()).toBeAttached();
  });

  test('homepage-svg-draw-shape: SVG draw-shape containers present', async ({ page }) => {
    const shapes = page.locator('[data-svg="draw-shape"]');
    await expect(shapes.first()).toBeAttached();
  });

  test('homepage-valuation-links: valuation links present', async ({ page }) => {
    const links = page.locator('[data-link="valuation"]');
    await expect(links.first()).toBeAttached();
  });

  test('homepage-mobile: key elements visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });
});

// ── Phase 1: footer loader + global.js ────────────────────────

const LOADER_RE = /cdn\.jsdelivr\.net\/gh\/studiozissou\/webflow-scripts@[0-9a-f]{7,40}\/projects\/carsa\/init\.js$/;
const LOADER_PAGES = ['/', '/used-cars'];

async function firstVdpPath(page) {
  const res = await page.request.get(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const m = xml.match(/https?:\/\/[^<]*\/vehicles\/[^<]+/);
  return m ? new URL(m[0]).pathname : null;
}

test.describe('carsa-code-migration — Loader (Phase 1)', () => {
  test('loader-present-and-pinned: init.js tag points at a commit SHA, not @main', async ({ page }) => {
    await loadPage(page, '/');
    const srcs = await page.$$eval('script[src*="/projects/carsa/init.js"]', (els) => els.map((e) => e.src));
    expect(srcs, 'init.js tag missing from footer').toHaveLength(1);
    expect(srcs[0]).toMatch(LOADER_RE);
    expect(srcs[0]).not.toContain('@main');
  });

  test('loader-returns-200-immutable: init.js and global.js served with immutable cache headers', async ({ page }) => {
    await loadPage(page, '/');
    const src = await page.$eval('script[src*="/projects/carsa/init.js"]', (e) => e.src);
    for (const file of ['init.js', 'global.js']) {
      const res = await page.request.get(src.replace('init.js', file));
      expect(res.status(), file).toBe(200);
      expect(res.headers()['cache-control'] || '', file).toContain('immutable');
    }
  });

  test('loader-runs-after-platform-deps: jQuery and gsap exist when init.js executes', async ({ page }) => {
    await loadPage(page, '/');
    const order = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
    const jq = order.findIndex((s) => /jquery-3\.5\.1/.test(s));
    const gsap = order.findIndex((s) => /\/gsap\.min\.js/.test(s));
    const loader = order.findIndex((s) => /\/projects\/carsa\/init\.js/.test(s));
    expect(loader).toBeGreaterThan(jq);
    expect(loader).toBeGreaterThan(gsap);
    const ready = await page.evaluate(() => ({ jq: !!window.jQuery, gsap: !!window.gsap }));
    expect(ready).toEqual({ jq: true, gsap: true });
  });

  for (const path of LOADER_PAGES) {
    test(`global-loaded-once: exactly one global.js on ${path}`, async ({ page }) => {
      await loadPage(page, path);
      const count = await page.locator('script[src*="/projects/carsa/global.js"]').count();
      expect(count).toBe(1);
    });
  }

  test('global-loaded-once: exactly one global.js on a VDP', async ({ page }) => {
    const vdp = await firstVdpPath(page);
    test.skip(!vdp, 'no VDP in sitemap');
    await loadPage(page, vdp);
    expect(await page.locator('script[src*="/projects/carsa/global.js"]').count()).toBe(1);
  });

  test('global-copyright-year: #year shows the current year', async ({ page }) => {
    await loadPage(page, '/');
    await expect(page.locator('#year').first()).toHaveText(String(new Date().getFullYear()));
  });

  test('global-noopener: external _blank links carry noopener', async ({ page }) => {
    await loadPage(page, '/');
    const offenders = await page.$$eval('a[target="_blank"]', (els) =>
      els
        .filter((a) => a.href && !a.href.includes('carsa.co.uk'))
        .filter((a) => !/noopener/.test(a.rel))
        .map((a) => a.href)
    );
    expect(offenders).toEqual([]);
  });

  test('global-attribution-storage: utm visit writes attribution keys', async ({ page }) => {
    await loadPage(page, '/?utm_source=acceptance&utm_medium=test');
    const stored = await page.evaluate(() => ({
      local: localStorage.getItem('attribution'),
      session: sessionStorage.getItem('attribution_session'),
    }));
    expect(stored.local).toContain('acceptance');
    expect(stored.session).toContain('acceptance');
  });

  test('global-store-list-prepend: #find-store-link is first child of #store-list', async ({ page }) => {
    await loadPage(page, '/');
    const list = page.locator('#store-list');
    test.skip((await list.count()) === 0, 'no store list on this page');
    const firstId = await list.locator('> *').first().getAttribute('id');
    expect(firstId).toBe('find-store-link');
  });

  test('global-menu-scroll-lock: opening the nav locks body scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page, '/');
    await page.locator('.w-nav-button').first().click();
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('global-chat-widget: n8n chat mounts within 5s', async ({ page }) => {
    await loadPage(page, '/');
    const chat = page.locator('.chat-window-wrapper, #n8n-chat, [class*="n8n-chat"]');
    await expect(chat.first()).toBeAttached({ timeout: 5000 });
  });

  test('no-inline-footer-scripts: no inline <script> between the Webflow runtime and init.js', async ({ page }) => {
    await loadPage(page, '/');
    const stray = await page.evaluate(() => {
      const scripts = [...document.scripts];
      const runtime = scripts.findIndex((s) => /\/js\/webflow\./.test(s.src));
      const loader = scripts.findIndex((s) => /\/projects\/carsa\/init\.js/.test(s.src));
      if (runtime < 0 || loader < 0) return ['marker-missing'];
      return scripts
        .slice(runtime + 1, loader)
        .filter((s) => !s.src && !/__CARSA_/.test(s.textContent))
        .map((s) => s.textContent.trim().slice(0, 60));
    });
    expect(stray).toEqual([]);
  });

  for (const path of LOADER_PAGES) {
    test(`loader-no-errors: zero JS errors on ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      await page.waitForTimeout(2000);
      expect(errors.map((e) => e.message)).toEqual([]);
    });
  }
});

// ── Phase 2: SRP baseline (pre- and post-swap) ────────────────

test.describe('carsa-code-migration — SRP', () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/used-cars');
    await page.waitForTimeout(2000);
  });

  test('srp-no-errors: zero JS console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.waitForTimeout(2000);
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  test('srp-results-list: #results-list renders at least one item', async ({ page }) => {
    await expect(page.locator('#results-list')).toBeAttached();
    const items = page.locator('#results-list [role="listitem"], #results-list .w-dyn-item');
    await expect(items.first()).toBeVisible({ timeout: 15000 });
  });

  test('srp-results-counter: #desktop-results shows a number', async ({ page }) => {
    const counter = page.locator('#desktop-results');
    await expect(counter).toBeAttached();
    await expect(counter).toHaveText(/\d/, { timeout: 15000 });
  });

  test('srp-mobile-filter-toggle: mobile filters link opens the filter panel at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const link = page.locator('#mobile-filters-link');
    await expect(link).toBeVisible({ timeout: 15000 });
    await link.click();
    await expect(page.locator('#filters-mobile-close')).toBeVisible();
  });

  test('srp-vrm-sanitiser: #vrm-search strips disallowed characters', async ({ page }) => {
    const input = page.locator('#vrm-search');
    test.skip((await input.count()) === 0, 'no VRM input on this build');
    await input.fill('ab12 c!d£e');
    await input.dispatchEvent('input');
    expect(await input.inputValue()).toMatch(/^[A-Za-z0-9 ]*$/);
  });

  test('srp-valuation-link: instant valuation link points at sellcar.carsa.co.uk', async ({ page }) => {
    const link = page.locator('[data-link="valuation"]').first();
    test.skip((await link.count()) === 0, 'no valuation link on SRP');
    await link.hover();
    await page.waitForTimeout(300);
    expect(await link.getAttribute('href')).toContain('sellcar.carsa.co.uk');
  });

  test('srp-check-finance-hover: finance links resolve to quote.carsa.co.uk/eligibility', async ({ page }) => {
    const link = page.locator('a[href*="eligibility"], [data-link="check-finance"]').first();
    await expect(link).toBeAttached({ timeout: 15000 });
    await link.hover();
    await page.waitForTimeout(300);
    expect(await link.getAttribute('href')).toContain('quote.carsa.co.uk/eligibility');
  });

  test('srp-redirect-toast: #redirect-message shows when arriving from a 404 VDP', async ({ page }) => {
    await loadPage(page, '/used-cars?redirect=vdp');
    const toast = page.locator('#redirect-message');
    test.skip((await toast.count()) === 0, 'toast element not on this build');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});

// ── Phase 2: Deals baseline ───────────────────────────────────

test.describe('carsa-code-migration — Deals', () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/used-cars/deals');
    await page.waitForTimeout(2000);
  });

  test('deals-no-errors: zero JS console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.waitForTimeout(2000);
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  test('deals-results-list: #results-list renders at least one item', async ({ page }) => {
    const items = page.locator('#results-list [role="listitem"], #results-list .w-dyn-item');
    await expect(items.first()).toBeVisible({ timeout: 15000 });
  });

  test('deals-promo-cards: promo storage element present', async ({ page }) => {
    await expect(page.locator('#promo-storage')).toBeAttached();
  });
});

// ── Generic per-page guards (one block per page as it migrates) ─

const MIGRATED = [];

for (const { path, module } of MIGRATED) {
  test.describe(`carsa-code-migration — ${path}`, () => {
    test(`${path}-no-errors: zero JS console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      await page.waitForTimeout(2000);
      expect(errors.map((e) => e.message)).toEqual([]);
    });

    test(`${path}-module-loaded-once: ${module} loaded exactly once`, async ({ page }) => {
      await loadPage(page, path);
      expect(await page.locator(`script[src*="/projects/carsa/${module}"]`).count()).toBe(1);
    });

    test(`${path}-inline-removed: no inline scripts other than a __CARSA_ config block`, async ({ page }) => {
      await loadPage(page, path);
      const stray = await page.evaluate(() =>
        [...document.scripts]
          .filter((s) => !s.src && !s.type.includes('json') && !/__CARSA_|dataLayer|_vwo|gtm/.test(s.textContent))
          .map((s) => s.textContent.trim().slice(0, 60))
      );
      expect(stray).toEqual([]);
    });
  });
}
