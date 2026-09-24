// Acceptance tests for carsa-v1.1.0 VDP module: vdp.js loads once from the release folder, the template keeps only the __CARSA_VDP config block, and the finance calculator, links and schema still work after a late start.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import {
  loadPage,
  collectErrors,
  unexpectedErrors,
  firstPath,
  sitemapPaths,
  mockFinance,
  waitForQuotes,
  idOrData,
  gbp,
  FINANCE_CONFIG,
  FINANCE_QUOTE,
  RELEASE_PATH_RE,
} from './helpers/carsa.js';

dotenv.config({ path: '.env.test' });

const VDP_PATH = '/vehicles/used/bl73dmu';
const REMOVED_PATH = '/vehicles/used/a26eta';
const LIVE = 'https://www.carsa.co.uk';
const MODULE = 'script[src*="/webflow/"][src$="/vdp.js"]';
const KEYS = ['price', 'registrationDate', 'odometer', 'vrm', 'financeType', 'depositContribution', 'locationName', 'isStorageLocation', 'makeName', 'modelName', 'status'];
const INLINE_MARKERS = ['CARSA_FIN', 'quote.carsa.co.uk/quote', 'cta-option', 'search-similar', 'add-utms', 'get-px-valuation', 'sellcar'];
const MONTHLY = `${idOrData('pcp-price')}, ${idOrData('hp-price')}`;
const DEPOSIT = '[data-number="deposit"]';
const PARITY_TEXT = [idOrData('pcp-price'), idOrData('hp-price'), idOrData('pcp-total-amount-payable'), idOrData('hp-total-amount-payable'), DEPOSIT, '[data-number="apr"]'];
const PARITY_HREF = ['[data-button="booking-options"]', '[data-link="search-similar"]'];

async function readVdp(page) {
  return page.evaluate(() => window.__CARSA_VDP || null);
}

async function firstText(page, selector) {
  const loc = page.locator(selector).first();
  return (await loc.count()) ? (await loc.textContent()).trim() : null;
}

async function firstHref(page, selector) {
  const loc = page.locator(selector).first();
  return (await loc.count()) ? loc.getAttribute('href') : null;
}

async function snapshot(page) {
  const out = {};
  for (const sel of PARITY_TEXT) out[sel] = await firstText(page, sel);
  for (const sel of PARITY_HREF) out[sel] = await firstHref(page, sel);
  return out;
}

test.describe('carsa-vdp-module', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_V110, 'v1.1.0 not published yet; set CARSA_V110=1 once the footer tag points at v1.1.0');
  });

  test('config-global: window.__CARSA_VDP carries all 11 string values and the VRM matches the slug', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    const vdp = await readVdp(page);
    expect(vdp).not.toBeNull();
    expect(Object.keys(vdp).sort()).toEqual([...KEYS].sort());
    for (const k of KEYS) expect(typeof vdp[k], k).toBe('string');
    expect(Number(vdp.price)).toBeGreaterThan(0);
    expect(vdp.vrm.trim().toLowerCase()).toBe(VDP_PATH.split('/').pop());
  });

  test('module-loaded-once: one vdp.js from a release folder, loader lists vdp.js and check-finance.js', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    const srcs = await page.$$eval(MODULE, (els) => els.map((e) => e.src));
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toMatch(RELEASE_PATH_RE);
    const modules = await page.evaluate(() => (window.__CARSA_LOADER || {}).modules || []);
    expect(modules).toEqual(expect.arrayContaining(['vdp.js', 'check-finance.js']));
  });

  test('inline-removed: no inline script still carries the VDP behaviour', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    const hits = await page.$$eval(
      'script:not([src])',
      (els, markers) => els.flatMap((e) => markers.filter((m) => e.textContent.includes(m))),
      INLINE_MARKERS,
    );
    expect(hits).toEqual([]);
  });

  test('late-start: with vdp.js delayed 3 s the deposit and monthly figures still paint', async ({ page }) => {
    const calls = await mockFinance(page);
    await page.route(/\/webflow\/v\d+\.\d+\.\d+\/vdp\.js(\?.*)?$/, async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    const errors = collectErrors(page);
    await loadPage(page, VDP_PATH, 5000);
    expect(await waitForQuotes(page, calls, 1)).toBeGreaterThanOrEqual(1);
    await expect(page.locator(DEPOSIT).first()).toHaveText(gbp(FINANCE_CONFIG.defaultDepositAmount));
    const monthly = await page.$$eval(MONTHLY, (els) => els.map((e) => e.textContent.trim()));
    expect(monthly).toEqual(expect.arrayContaining([gbp(FINANCE_QUOTE.pcp.payments.regular, 2)]));
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('no-contribution car: a non-promoted VDP loads cleanly and still quotes', async ({ page, request }) => {
    const paths = await sitemapPaths(request, '/vehicles/used/', 6);
    let found = null;
    for (const path of paths) {
      await loadPage(page, path, 500);
      const vdp = await readVdp(page);
      if (vdp && vdp.depositContribution.replace(/[^0-9.]/g, '') === '') { found = path; break; }
    }
    test.skip(!found, 'no non-promoted VDP in the first sitemap entries');
    const calls = await mockFinance(page);
    const errors = collectErrors(page);
    await loadPage(page, found);
    expect(await waitForQuotes(page, calls, 1)).toBeGreaterThanOrEqual(1);
    expect(calls.quotes[0].criteria.cashDeposit).toBe(FINANCE_CONFIG.defaultDepositAmount);
    await expect(page.locator(DEPOSIT).first()).toHaveText(gbp(FINANCE_CONFIG.defaultDepositAmount));
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  for (const entry of [VDP_PATH, '/vehicles/used/', REMOVED_PATH]) {
    test(`no-unexpected-errors on ${entry}`, async ({ page, request }) => {
      const path = entry.endsWith('/') ? await firstPath(request, entry) : entry;
      test.skip(!path, `no ${entry} item in sitemap`);
      const errors = collectErrors(page);
      await loadPage(page, path);
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }

  test('removed VDP: renders and the Product JSON-LD offer is SoldOut with no price', async ({ page }) => {
    await loadPage(page, REMOVED_PATH);
    await expect(page.locator('h1').first()).toBeVisible();
    expect((await readVdp(page)).status.trim().toLowerCase()).toBe('removed');
    const offers = await page.$$eval('script[type="application/ld+json"]', (els) => {
      const found = [];
      els.forEach((e) => {
        if (!e.textContent.includes('"Product"')) return;
        try {
          const data = JSON.parse(e.textContent);
          (data['@graph'] || [data]).forEach((n) => { if (n && n.offers) found.push(...[].concat(n.offers)); });
        } catch (_) {}
      });
      return found;
    });
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      expect(o.availability).toBe('https://schema.org/SoldOut');
      expect(o.price).toBeUndefined();
    }
  });

  test('parity: finance figures match live', async ({ browser }) => {
    const staging = process.env.STAGING_URL_CARSA;
    test.skip(!staging, 'STAGING_URL_CARSA not set');
    const read = async (origin) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${origin}${VDP_PATH}`, { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      const snap = await snapshot(page);
      await ctx.close();
      return snap;
    };
    const [a, b] = await Promise.all([read(staging), read(LIVE)]);
    expect(a).toEqual(b);
    expect(Object.values(a).some((v) => v)).toBe(true);
  });
});
