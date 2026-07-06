const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';
const SLUG = 'tsc-historic-blog-migration';

// ── Helpers ───────────────────────────────────────────────────

async function loadPage(page, path = '/news') {
  await page.goto(`${STAGING_URL}${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// ── News listing page ─────────────────────────────────────────

test.describe(`${SLUG} — News listing`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('H1 correct', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('News & Insights');
  });

  test('renders at least 13 published news articles', async ({ page }) => {
    const articles = page.locator('main a[href*="/news/"]');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(13);
  });

  test('articles span 2019–2026 date range', async ({ page }) => {
    const dates2019 = page.locator('main').getByText('2019', { exact: false });
    const dates2025plus = page.locator('main').getByText(/202[5-9]/, { exact: false });
    expect(await dates2019.count()).toBeGreaterThanOrEqual(1);
    expect(await dates2025plus.count()).toBeGreaterThanOrEqual(1);
  });

  test('2019 articles present — Stanislas Pinte nomination', async ({ page }) => {
    await expect(
      page.locator('main').getByText('Stanislas Pinte', { exact: false }).first()
    ).toBeVisible();
  });

  test('2020 articles present — Geert Pauwels / European Railway Award', async ({ page }) => {
    await expect(
      page.locator('main').getByText(/European Railway Award|Geert Pauwels/, { exact: false }).first()
    ).toBeVisible();
  });

  test('CAF Signalling draft not visible on public listing', async ({ page }) => {
    const cafPost = page.locator('main').getByText('CAF Signalling launch open cooperation', { exact: false });
    await expect(cafPost).toHaveCount(0);
  });
});

// ── Article detail pages ──────────────────────────────────────

test.describe(`${SLUG} — Article detail pages`, () => {
  test('Digital STMs article accessible', async ({ page }) => {
    await loadPage(page, '/news/digital-stms-will-accelerate-ertms-roll-out');
    await expect(page.locator('h1')).toContainText(/Digital STM/i);
  });

  test('Try and Cert article accessible', async ({ page }) => {
    const slug = 'the-signalling-company-and-try-and-cert-introduce-silicon-valley-best-practice-into-european-etcs-development';
    await loadPage(page, `/news/${slug}`);
    await expect(page.locator('h1')).toContainText(/Try and Cert|Silicon Valley/i);
  });

  test('Nomination article accessible', async ({ page }) => {
    await loadPage(page, '/news/nomination-of-stanislas-pinte-as-ceo-of-thesignallingcompany');
    await expect(page.locator('h1')).toContainText(/Nomination|Stanislas Pinte/i);
  });

  test('Better ETCS article accessible', async ({ page }) => {
    await loadPage(page, '/news/a-better-etcs-onboard-no-more-no-less');
    await expect(page.locator('h1')).toContainText(/better ETCS/i);
  });

  test('Lineas award article accessible', async ({ page }) => {
    await loadPage(page, '/news/geert-pauwels-ceo-of-lineas-wins-prestigious-european-railway-award');
    await expect(page.locator('h1')).toContainText(/Geert Pauwels|European Railway Award/i);
  });

  test('Train positioning article accessible', async ({ page }) => {
    await loadPage(page, '/news/shaping-the-train-positioning-algorithms-of-the-future');
    await expect(page.locator('h1')).toContainText(/train positioning/i);
  });
});

// ── Console errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console errors`, () => {
  test('no console errors on /news', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('no console errors on article detail page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/news/digital-stms-will-accelerate-ertms-roll-out');
    await page.waitForTimeout(500);
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
