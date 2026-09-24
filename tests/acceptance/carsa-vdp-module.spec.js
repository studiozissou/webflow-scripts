// Phase 2 VDP swap: the template keeps only an inline window.__CARSA_VDP config block and the loader serves vdp.js; module guards run with CARSA_VDP_MODULE=1, and staging-vs-live parity runs when STAGING_URL_CARSA points at staging.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import { BASE, RELEASE_PATH_RE, FINANCE_HOST, loadPage, collectErrors, unexpectedErrors, sitemapPaths } from './helpers/carsa.js';

const SLUG = 'carsa-vdp-module';
const MODULE = !!process.env.CARSA_VDP_MODULE;
const LIVE = 'https://www.carsa.co.uk';
const ON_STAGING = !BASE.includes('www.carsa.co.uk');
const PROMO_PATH = '/used-cars/promotions/500-finance-deposit-contribution';
const CONFIG_KEYS = [
  'price', 'registrationDate', 'odometer', 'vrm', 'financeType', 'depositContribution',
  'locationName', 'isStorageLocation', 'makeName', 'modelName', 'status',
];
const MOVED_MARKERS = ['CARSA_FIN', `${FINANCE_HOST}/quote`, 'cta-option', 'search-similar', 'add-utms', 'get-px-valuation', 'sellcar.carsa.co.uk/new-order'];

async function activeVdps(request, n = 3) {
  const paths = await sitemapPaths(request, '/vehicles/used/', 12);
  return paths.slice(0, n);
}

async function promotedVdp(page) {
  await page.goto(`${BASE}${PROMO_PATH}`, { waitUntil: 'domcontentloaded' });
  const href = await page.locator('a[href*="/vehicles/used/"]').first().getAttribute('href').catch(() => null);
  return href ? new URL(href, BASE).pathname : null;
}

async function snapshot(page) {
  return page.evaluate((ids) => {
    const text = (sel) => document.querySelector(sel)?.textContent.trim() || null;
    const out = {};
    for (const id of ids) out[id] = text(`#${id}`) || text(`[data-number="${id}"]`);
    out.deposit = document.getElementById('finance-deposit')?.value || null;
    out.contribution = document.getElementById('deposit-contribution')?.value || null;
    out.apr = text('[data-number="apr"]');
    out.getStarted = document.querySelector('[data-button="booking-options"]')?.getAttribute('href') || null;
    out.similar = document.querySelector('[data-link="search-similar"]')?.getAttribute('href') || null;
    out.autotrader = document.querySelector('.autotrader_price-info')?.textContent.replace(/\s+/g, ' ').trim() || null;
    out.soldOut = [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes('schema.org/SoldOut'));
    return out;
  }, ['pcp-price', 'hp-price', 'pcp-total-amount-payable', 'hp-total-amount-payable', 'total-credit']);
}

async function settleQuote(page) {
  await page.waitForResponse((r) => r.url().includes(`${FINANCE_HOST}/quote`), { timeout: 15_000 }).catch(() => null);
  await page.waitForTimeout(1500);
}

test.describe(`${SLUG} — module in place`, () => {
  test.skip(!MODULE, 'set CARSA_VDP_MODULE=1 once the VDP swap is published');

  test('config-global: window.__CARSA_VDP carries every CMS value with the right types', async ({ page, request }) => {
    const [path] = await activeVdps(request, 1);
    await loadPage(page, path);
    const cfg = await page.evaluate(() => window.__CARSA_VDP || null);
    expect(cfg).not.toBeNull();
    for (const k of CONFIG_KEYS) expect(cfg, `key ${k}`).toHaveProperty(k);
    expect(Number(cfg.price)).toBeGreaterThan(0);
    expect(String(cfg.vrm).toLowerCase()).toBe(path.split('/').pop().toLowerCase());
    expect(Number.isNaN(new Date(cfg.registrationDate).getTime())).toBe(false);
  });

  test('module-loaded-once: vdp.js loads exactly once from the release folder via the loader', async ({ page, request }) => {
    const [path] = await activeVdps(request, 1);
    await loadPage(page, path);
    const r = await page.evaluate(() => ({
      srcs: [...document.scripts].map((s) => s.src).filter((s) => /\/vdp\.js$/.test(s)),
      modules: window.__CARSA_LOADER?.modules || [],
    }));
    expect(r.srcs).toHaveLength(1);
    expect(r.srcs[0]).toMatch(RELEASE_PATH_RE);
    expect(r.modules).toContain('vdp.js');
  });

  test('inline-removed: no moved VDP code remains inline on the template', async ({ page, request }) => {
    const [path] = await activeVdps(request, 1);
    await loadPage(page, path);
    const leftovers = await page.evaluate((markers) =>
      [...document.scripts]
        .filter((s) => !s.src && !/__CARSA_VDP\s*=/.test(s.textContent))
        .flatMap((s) => markers.filter((m) => s.textContent.includes(m))),
    MOVED_MARKERS);
    expect(leftovers).toEqual([]);
  });

  test('late-start: calculator and links still initialise when vdp.js runs after DOMContentLoaded', async ({ page, request }) => {
    const [path] = await activeVdps(request, 1);
    await page.route(/\/webflow\/v\d+\.\d+\.\d+\/vdp\.js$/, async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    const errors = collectErrors(page);
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await settleQuote(page);
    const s = await snapshot(page);
    expect(s.deposit, 'deposit painted').toMatch(/^£/);
    expect(s['pcp-price'] || s['hp-price'], 'a monthly figure painted').toMatch(/^£/);
    expect(s.similar).toContain('/used-cars');
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('no-contribution car: empty deposit-contribution binding does not throw and quotes on the full deposit', async ({ page, request }) => {
    const [path] = await activeVdps(request, 1);
    const errors = collectErrors(page);
    const quotes = [];
    page.on('request', (r) => { if (r.url().includes(`${FINANCE_HOST}/quote`)) quotes.push(r.postDataJSON()); });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await settleQuote(page);
    const cfg = await page.evaluate(() => window.__CARSA_VDP);
    test.skip(Number(String(cfg.depositContribution).replace(/[^0-9.]/g, '')) > 0, 'first sitemap car is promoted');
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.at(-1).criteria.cashDeposit).toBe(Number(String((await snapshot(page)).deposit).replace(/[^0-9.]/g, '')));
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('no console errors on three VDPs', async ({ page, request }) => {
    for (const path of await activeVdps(request, 3)) {
      const errors = collectErrors(page);
      await loadPage(page, path, 2500);
      expect(unexpectedErrors(errors), path).toEqual([]);
    }
  });
});

test.describe(`${SLUG} — staging matches live`, () => {
  test.skip(!ON_STAGING || !MODULE, 'runs only against staging with the module published there');

  async function compare(browser, path) {
    const out = {};
    for (const [name, host] of [['staging', BASE], ['live', LIVE]]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${host}${path}`, { waitUntil: 'domcontentloaded' });
      await settleQuote(page);
      out[name] = await snapshot(page);
      await ctx.close();
    }
    return out;
  }

  test('parity: finance figures, links, AutoTrader line and schema match live on three VDPs', async ({ browser, request }) => {
    for (const path of await activeVdps(request, 3)) {
      const { staging, live } = await compare(browser, path);
      expect(staging, path).toEqual(live);
    }
  });

  test('parity: promoted car shows the same contribution, deposit and monthly figures as live', async ({ browser, page }) => {
    const path = await promotedVdp(page);
    test.skip(!path, 'no promoted car listed');
    const { staging, live } = await compare(browser, path);
    expect(staging.contribution).toMatch(/^£[1-9]/);
    expect(staging).toEqual(live);
  });
});

test.describe(`${SLUG} — removed car`, () => {
  test('removed VDP renders and marks the offer SoldOut', async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(`${BASE}/vehicles/used/a26eta`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    expect(res.status()).toBeLessThan(400);
    expect((await snapshot(page)).soldOut).toBe(true);
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});
