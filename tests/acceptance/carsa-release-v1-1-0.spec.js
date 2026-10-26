// Acceptance tests for carsa-v1.1.x: check-finance.js loads once on every page from the release folder, replaces the inline copies page by page as each is listed in CARSA_V111_DONE, and fixes the homepage cards.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import {
  loadPage,
  collectErrors,
  unexpectedErrors,
  firstPath,
  seedAttribution,
  mockFinance,
  waitForQuotes,
  RELEASE_PATH_RE,
} from './helpers/carsa.js';

const SEED = { utms: { utm_source: 'seed', utm_medium: 'v110' }, referrer: 'https://www.google.com/', referrerDomain: 'google.com' };
const CARD = 'a [data-link="check-finance"][vrm], a[data-link="check-finance"][vrm]';
const MODULE = 'script[src*="/webflow/"][src$="/check-finance.js"]';
const ELIGIBILITY = 'https://quote.carsa.co.uk/eligibility/questions?vrm=';
const VDP_PATH = '/vehicles/used/bl73dmu';
const VDP_MODULE = 'script[src*="/webflow/"][src$="/vdp.js"]';

const STATIC_PAGES = ['/', '/used-cars', '/used-cars/deals', '/car-finance-calculator', '/reserve'];
const TEMPLATE_PREFIXES = [
  '/used-cars/make/',
  '/used-cars/models/',
  '/used-cars/fuel/',
  '/used-cars/near/',
  '/used-cars/promotions/',
  '/stores/',
  '/sell-car/store/',
  '/vehicles/used/',
];

const DONE = (process.env.CARSA_V111_DONE || '').split(',').map((s) => s.trim()).filter(Boolean);

function isDone(entry) {
  return DONE.includes('all') || DONE.includes(entry);
}

async function inlineCopies(page) {
  return page.$$eval('script:not([src])', (els) =>
    els.map((e) => e.textContent).filter((t) => t.includes('check-finance-car-card-click') || t.includes('[data-link="check-finance"]')),
  );
}

function params(href) {
  return Object.fromEntries(new URL(href).searchParams.entries());
}

async function resolve(request, entry) {
  if (!entry.endsWith('/')) return entry;
  const path = await firstPath(request, entry);
  test.skip(!path, `no ${entry} item in sitemap`);
  return path;
}

async function hoverSwap(page, card) {
  await card.scrollIntoViewIfNeeded();
  const anchor = card.locator('xpath=ancestor-or-self::a[1]');
  const original = await anchor.evaluate((a) => a.href);
  const vrm = await card.getAttribute('vrm');
  await card.hover();
  await page.waitForTimeout(200);
  const swapped = await anchor.evaluate((a) => a.href);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  const restored = await anchor.evaluate((a) => a.href);
  return { original, vrm, swapped, restored, event: await anchor.getAttribute('data-analytics-event') };
}

test.describe('carsa-release-v1-1-0', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_V110, 'v1.1.0 not published yet; set CARSA_V110=1 once the footer tag points at v1.1.0');
  });

  for (const entry of [...STATIC_PAGES, ...TEMPLATE_PREFIXES]) {
    test(`check-finance-loaded-once on ${entry}: one check-finance.js from a release folder`, async ({ page, request }) => {
      await loadPage(page, await resolve(request, entry));
      const srcs = await page.$$eval(MODULE, (els) => els.map((e) => e.src));
      expect(srcs).toHaveLength(1);
      expect(srcs[0]).toMatch(RELEASE_PATH_RE);
    });

    test(`check-finance-inline-removed on ${entry}: no inline handler copy left`, async ({ page, request }) => {
      test.skip(!isDone(entry), `${entry} not swapped yet; add it to CARSA_V111_DONE once its body is published`);
      await loadPage(page, await resolve(request, entry));
      expect(await inlineCopies(page)).toEqual([]);
    });

    test(`check-finance-double-run-safe on ${entry}: inline copy and module together still swap and restore once`, async ({ page, context, request }) => {
      test.skip(isDone(entry), `${entry} already swapped`);
      await seedAttribution(context, SEED);
      await loadPage(page, await resolve(request, entry), 4000);
      test.skip((await inlineCopies(page)).length === 0, `${entry} has no inline copy on this build`);
      const card = page.locator(CARD).first();
      test.skip((await card.count()) === 0, `no finance card rendered on ${entry}`);
      const r = await hoverSwap(page, card);
      expect(r.swapped.startsWith(ELIGIBILITY + encodeURIComponent(r.vrm))).toBe(true);
      expect(params(r.swapped)).toMatchObject({ utm_source: 'seed', referrer: 'google.com' });
      expect(r.restored).toBe(r.original);
    });
  }

  test('homepage-hover-swap: a homepage card link swaps to the eligibility URL with VRM and attribution, then restores', async ({ page, context }) => {
    await seedAttribution(context, SEED);
    await loadPage(page, '/');
    const card = page.locator(CARD).first();
    await expect(card).toHaveCount(1);
    const r = await hoverSwap(page, card);
    expect(r.swapped.startsWith(ELIGIBILITY + encodeURIComponent(r.vrm))).toBe(true);
    expect(params(r.swapped)).toMatchObject({ vrm: r.vrm, utm_source: 'seed', utm_medium: 'v110', referrer: 'google.com' });
    expect(r.restored).toBe(r.original);
  });

  test('homepage-click-fallback: a click with no hover still swaps the href before navigation', async ({ page, context }) => {
    await seedAttribution(context, SEED);
    await loadPage(page, '/');
    const result = await page.locator(CARD).first().evaluate((node) => {
      const anchor = node.closest('a');
      anchor.addEventListener('click', (e) => e.preventDefault(), { once: true });
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return { href: anchor.href, event: anchor.getAttribute('data-analytics-event') };
    });
    expect(result.href).toContain(ELIGIBILITY);
    expect(result.href).toContain('utm_source=seed');
    expect(result.event).toBe('check-finance-car-card-click');
  });

  test('widget-cards-swap: search-widget cards on /used-cars get the swap', async ({ page, context }) => {
    await seedAttribution(context, SEED);
    await loadPage(page, '/used-cars', 4000);
    const card = page.locator(CARD).nth(1);
    test.skip((await card.count()) === 0, 'widget rendered no cards with a finance link');
    const r = await hoverSwap(page, card);
    expect(r.swapped.startsWith(ELIGIBILITY + encodeURIComponent(r.vrm))).toBe(true);
    expect(r.restored).toBe(r.original);
  });

  test('card-less page: check-finance.js loads on /faq without errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/faq');
    expect(await page.locator(MODULE).count()).toBe(1);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('vdp-inert-before-swap: on the old VDP body vdp.js loads, finds no __CARSA_VDP and leaves the inline blocks to quote alone', async ({ page }) => {
    test.skip(isDone('/vehicles/used/'), 'VDP already swapped');
    const calls = await mockFinance(page);
    const errors = collectErrors(page);
    await loadPage(page, VDP_PATH, 4000);
    expect(await page.locator(VDP_MODULE).count()).toBe(1);
    expect(await page.evaluate(() => (window.__CARSA_LOADER || {}).modules || [])).toContain('vdp.js');
    expect(await page.evaluate(() => window.__CARSA_VDP === undefined)).toBe(true);
    expect(await waitForQuotes(page, calls, 1)).toBeGreaterThanOrEqual(1);
    expect(calls.config).toBe(1);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  for (const path of ['/', '/used-cars']) {
    test(`no-unexpected-errors on ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }
});
