/**
 * Acceptance tests — rhp-dial-engaged-ticks-dynamic-sectors
 *
 * Verifies:
 * - Dial canvas and CMS items present on homepage
 * - Dynamic sector count (6 CMS items = 6 sectors)
 * - No console errors during page load
 * - Reduced motion compatibility
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-dial-engaged-ticks-dynamic-sectors';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadHome(page) {
  await page.goto(STAGING_URL);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Elements ─────────────────────────────────────────────────

test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHome(page);
  });

  test('dial canvas is present', async ({ page }) => {
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached();
  });

  test('6 CMS items present on homepage', async ({ page }) => {
    const count = await page.locator('.dial_cms-item').count();
    expect(count).toBe(6);
  });

  test('RHP scripts initialise', async ({ page }) => {
    const ok = await page.evaluate(() => window.RHP?.scriptsOk);
    expect(ok).toBe(true);
  });
});

// ── Console Errors ───────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Reduced Motion ───────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('ticks visible with reduced motion', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached();
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
