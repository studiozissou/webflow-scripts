// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'feat-page-loader';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${BASE}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Loader Dismissed`, () => {
  test('rhp-scripts-loaded class is present after load', async ({ page }) => {
    await loadPage(page);
    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('rhp-scripts-loaded')
    );
    expect(hasClass).toBe(true);
  });

  test('.loader is removed from DOM after scripts load', async ({ page }) => {
    await loadPage(page);
    const count = await page.locator('.loader').count();
    expect(count).toBe(0);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('loader not visible with reduced motion', async ({ page }) => {
    await loadPage(page);
    // Loader should be removed from DOM (transition: none means instant hide + remove)
    const count = await page.locator('.loader').count();
    expect(count).toBe(0);
  });
});

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('loader does not reappear after Barba transition', async ({ page }) => {
    await loadPage(page, '/');

    // Navigate to about via Barba
    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(2500); // Barba transition settle

    // Loader should not exist in DOM
    const count = await page.locator('.loader').count();
    expect(count).toBe(0);

    // rhp-scripts-loaded should still be on <html>
    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('rhp-scripts-loaded')
    );
    expect(hasClass).toBe(true);
  });
});
