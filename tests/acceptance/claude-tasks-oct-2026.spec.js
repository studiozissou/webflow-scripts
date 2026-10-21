// TDD acceptance tests for the Oct 2026 Claude task batch; they fail until each Webflow change is published (spec: .claude/specs/claude-tasks-oct-2026.md).

import { test, expect } from '@playwright/test';

const CARSA = 'https://www.carsa.co.uk';
const COCONUT = 'https://www.getcoconut.com';
const TSC = process.env.TSC_STAGING_URL || 'https://tsc-v2.webflow.io';
const OOST = 'https://www.oosteten.nl';

const OOST_NOINDEX_INTENDED = [/\/privacybeleid/, /\/algemene-voorwaarden/, /\/cookie/, /\/disclaimer/, /\/vraag\//, /\/vragen\//, /\/paginas\//];

function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('Carsa store and town pages', () => {
  test('store page links to its town page', async ({ page }) => {
    await page.goto(`${CARSA}/stores/bradford`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href*="/used-cars/near/bradford"]').first()).toBeAttached();
  });

  test('town page links to its store for opening times', async ({ page }) => {
    await page.goto(`${CARSA}/used-cars/near/bradford`, { waitUntil: 'domcontentloaded' });
    const storeLink = page.locator('a[href*="/stores/"]', { hasText: /opening times/i });
    await expect(storeLink.first()).toBeAttached();
  });
});

test('coconut legal side menu lists Partnership with Revolut Pro', async ({ page }) => {
  await page.goto(`${COCONUT}/legal/terms`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.side-nav-menu-item[href*="partnership-with-revolut-pro"], .side-nav-menu-item a[href*="partnership-with-revolut-pro"], a[href*="partnership-with-revolut-pro"]').first()).toBeAttached();
});

test('tsc staging shows an ERCI award block', async ({ page }) => {
  await page.goto(TSC, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/ERCI/i).first()).toBeAttached();
});

test('oost sitemap pages are indexable unless intended', async ({ request }) => {
  const sitemap = await (await request.get(`${OOST}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length).toBeGreaterThan(0);
  const unintended = [];
  for (const url of urls) {
    const res = await request.get(url, { maxRedirects: 0 });
    const html = res.status() === 200 ? await res.text() : '';
    const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)/i) || [])[1] || '';
    const header = res.headers()['x-robots-tag'] || '';
    const noindex = /noindex/i.test(robots) || /noindex/i.test(header);
    if ((res.status() !== 200 || noindex) && !OOST_NOINDEX_INTENDED.some((re) => re.test(url))) {
      unintended.push(`${res.status()} ${noindex ? 'noindex ' : ''}${url}`);
    }
  }
  expect(unintended, unintended.join('\n')).toEqual([]);
});

test('no console errors on checked pages', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  for (const url of [`${CARSA}/stores/bradford`, `${CARSA}/used-cars/near/bradford`, `${COCONUT}/legal/terms`, TSC]) {
    await page.goto(url, { waitUntil: 'load' });
  }
  expect(errors).toEqual([]);
});
