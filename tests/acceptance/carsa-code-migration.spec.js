/**
 * Carsa Code Migration — Acceptance Tests
 *
 * Baseline tests for each page BEFORE and AFTER migration.
 * Tests added incrementally as each page is migrated.
 * Phase 1: Homepage first, then remaining pages in priority order.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { seedSessionOnce } from './helpers/carsa.js';

dotenv.config({ path: '.env.test' });

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

  test('homepage-make-model-block-dead: the make/model redirect script is present but has no select[name=make] or .model-data to bind', async ({ page }) => {
    expect(await page.evaluate(() => [...document.scripts].filter((s) => !s.src && /make-model-redirect v2/.test(s.textContent)).length)).toBe(1);
    expect(await page.locator('select[name="make"], .model-data').count()).toBe(0);
  });

  test('homepage-valuation-form: the hero form carries a VRM input and a valuation trigger', async ({ page }) => {
    const form = page.locator('form:has([data-link="valuation"])').first();
    await expect(form).toBeAttached();
    await expect(form.locator('[name="vrm"]').first()).toBeAttached();
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

// Hosting moved to Carsa's CloudFront at SHA-versioned paths on 27 Aug 2026 (spec D2a).
// These two constants are the only place the host and path shape are named.
const LOADER_RE = /\/webflow\/[0-9a-f]{7,40}\/init\.js$/;
const LOADER_PATH_RE = /\/webflow\/[0-9a-f]{7,40}\/init\.js/;
const LOADER_SEL = 'script[src*="/webflow/"][src$="/init.js"]';
const moduleSel = (file) => `script[src*="/webflow/"][src$="/${file}"]`;
const LOADER_PAGES = ['/', '/used-cars'];

async function firstVdpPath(page) {
  const res = await page.request.get(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const m = xml.match(/https?:\/\/[^<]*\/vehicles\/[^<]+/);
  return m ? new URL(m[0]).pathname : null;
}

test.describe('carsa-code-migration — Loader (Phase 1)', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_PHASE1, 'Phase 1 loader not shipped yet; set CARSA_PHASE1=1 once init.js is in the footer');
  });

  test('loader-present-and-pinned: init.js tag points at a commit SHA, not @main', async ({ page }) => {
    await loadPage(page, '/');
    const srcs = await page.$$eval(LOADER_SEL, (els) => els.map((e) => e.src));
    expect(srcs, 'init.js tag missing from footer').toHaveLength(1);
    expect(srcs[0]).toMatch(LOADER_RE);
    for (const moving of ['@main', '@latest', '/webflow/latest/']) {
      expect(srcs[0]).not.toContain(moving);
    }
  });

  test('loader-returns-200-immutable: init.js and global.js served with immutable cache headers', async ({ page }) => {
    await loadPage(page, '/');
    const src = await page.$eval(LOADER_SEL, (e) => e.src);
    for (const file of ['init.js', 'global.js']) {
      const res = await page.request.get(src.replace('init.js', file));
      expect(res.status(), file).toBe(200);
      const cc = res.headers()['cache-control'] || '';
      expect(cc, file).toContain('immutable');
      // Guard against the versioned prefix inheriting PR #138's carousel rule (spec D10).
      expect(cc, `${file} must not revalidate on a versioned path`).not.toContain('must-revalidate');
    }
  });

  test('loader-runs-after-platform-deps: jQuery and gsap exist when init.js executes', async ({ page }) => {
    await loadPage(page, '/');
    const order = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
    const jq = order.findIndex((s) => /jquery-3\.5\.1/.test(s));
    const gsap = order.findIndex((s) => /\/gsap\.min\.js/.test(s));
    const loader = order.findIndex((s) => LOADER_PATH_RE.test(s));
    expect(loader).toBeGreaterThan(jq);
    expect(loader).toBeGreaterThan(gsap);
    const ready = await page.evaluate(() => ({ jq: !!window.jQuery, gsap: !!window.gsap }));
    expect(ready).toEqual({ jq: true, gsap: true });
  });

  for (const path of LOADER_PAGES) {
    test(`global-loaded-once: exactly one global.js on ${path}`, async ({ page }) => {
      await loadPage(page, path);
      const count = await page.locator(moduleSel('global.js')).count();
      expect(count).toBe(1);
    });
  }

  test('global-loaded-once: exactly one global.js on a VDP', async ({ page }) => {
    const vdp = await firstVdpPath(page);
    test.skip(!vdp, 'no VDP in sitemap');
    await loadPage(page, vdp);
    expect(await page.locator(moduleSel('global.js')).count()).toBe(1);
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
    const stray = await page.evaluate((loaderSource) => {
      const scripts = [...document.scripts];
      const runtime = scripts.findIndex((s) => /\/js\/webflow\./.test(s.src));
      const loader = scripts.findIndex((s) => new RegExp(loaderSource).test(s.src));
      if (runtime < 0 || loader < 0) return ['marker-missing'];
      return scripts
        .slice(runtime + 1, loader)
        .filter((s) => !s.src && !/__CARSA_/.test(s.textContent))
        .map((s) => s.textContent.trim().slice(0, 60));
    }, LOADER_PATH_RE.source);
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

// ── Phase 2: search pages (VSRP widget since CARSA-5852) ──────
// Results, filters and counters on /used-cars, /used-cars/deals and the make/model
// templates are rendered by Carsa's carsa-search.js widget, not by Webflow custom
// code. Page settings keep only the 404 toast, check-finance hover and valuation builder.

const WIDGET_SRC = 'd2zblaqlrfk95e.cloudfront.net/carsa-search.js';
const CARD_LINK = 'a[href*="/vehicles/used/"]';

for (const path of ['/used-cars', '/used-cars/deals']) {
  test.describe(`carsa-code-migration — Search ${path}`, () => {
    test(`search-no-errors on ${path}: zero JS console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      await page.waitForTimeout(2000);
      expect(errors.map((e) => e.message)).toEqual([]);
    });

    test(`search-widget-loaded on ${path}: carsa-search.js is preloaded in the head and executed exactly once`, async ({ page }) => {
      const hits = [];
      page.on('request', (r) => r.url().includes(WIDGET_SRC) && hits.push(r.url()));
      await loadPage(page, path);
      expect(await page.locator(`link[rel="preload"][href*="${WIDGET_SRC}"]`).count()).toBe(1);
      expect(await page.locator(`script[src*="${WIDGET_SRC}"]`).count()).toBe(1);
      expect(hits.length).toBeGreaterThanOrEqual(1);
    });

    test(`search-widget-renders on ${path}: the widget renders vehicle cards`, async ({ page }) => {
      await loadPage(page, path);
      await expect(page.locator(CARD_LINK).first()).toBeVisible({ timeout: 20_000 });
    });

    test(`search-valuation-link on ${path}: the instant valuation builder still runs`, async ({ page }) => {
      await loadPage(page, path);
      const trigger = page.locator('form [data-link="valuation"]').first();
      test.skip((await trigger.count()) === 0, 'no valuation form on this page');
      await trigger.locator('xpath=ancestor::form[1]').locator('[name="vrm"]').first().fill('AB12CDE');
      await page.waitForTimeout(200);
      expect(await trigger.getAttribute('href')).toContain('sellcar.carsa.co.uk/new-order?vrm=AB12CDE');
    });

    test(`search-check-finance on ${path}: widget cards expose a check-finance hook that the hover swap rewrites`, async ({ page }) => {
      await loadPage(page, path);
      await page.locator(CARD_LINK).first().waitFor({ state: 'visible', timeout: 20_000 });
      const el = page.locator('a [data-link="check-finance"][vrm]').first();
      test.skip((await el.count()) === 0, 'widget cards carry no check-finance hook on this build');
      const href = await el.evaluate((node) => {
        node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        return node.closest('a').href;
      });
      expect(href).toContain('quote.carsa.co.uk/eligibility/questions?vrm=');
    });
  });
}

test.describe('carsa-code-migration — Search: 404 toast', () => {
  test('deals-toast-script-missing: /used-cars/deals has the #redirect-message element but not the toast script, so from404Used is never consumed', async ({ page, context }) => {
    await seedSessionOnce(context, 'from404Used', 'true');
    await loadPage(page, '/used-cars/deals');
    expect(await page.locator('#redirect-message').count()).toBe(1);
    expect(await page.evaluate(() => [...document.scripts].filter((s) => !s.src && /from404Used/.test(s.textContent)).length)).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem('from404Used'))).toBe('true');
  });

  test('srp-toast-element-missing: /used-cars carries the toast script but no #redirect-message element', async ({ page, context }) => {
    await seedSessionOnce(context, 'from404Used', 'true');
    await loadPage(page, '/used-cars');
    expect(await page.locator('#redirect-message').count()).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem('from404Used'))).toBeNull();
  });

  test('deals-no-toast-by-default: #redirect-message stays hidden on a normal visit', async ({ page }) => {
    await loadPage(page, '/used-cars/deals');
    expect(await page.locator('#redirect-message').evaluate((e) => getComputedStyle(e).display)).toBe('none');
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
      expect(await page.locator(moduleSel(module)).count()).toBe(1);
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
