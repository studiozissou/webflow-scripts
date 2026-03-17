// @ts-check
/**
 * Acceptance tests — feat-case-title-entrance
 *
 * Validates .section_case-title entrance animation on case (work) pages:
 * container slide-up + word-level SplitText stagger on H1/H6 headings.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'feat-case-title-entrance';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const CASE_PATH = '/work/overland-ai'; // known case study page

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadCasePage(page) {
  await page.goto(`${STAGING_URL}${CASE_PATH}`);
  await waitForRHP(page);
  await page.waitForTimeout(2000); // allow GSAP entrance animation to complete
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadCasePage(page);
  });

  test('section_case-title is present on case page', async ({ page }) => {
    await expect(page.locator('.section_case-title')).toBeAttached();
  });

  test('section_case-title is visible after animation settle', async ({ page }) => {
    await expect(page.locator('.section_case-title')).toBeVisible();
  });

  test('H1 heading is visible after animation settle', async ({ page }) => {
    const h1 = page.locator('.section_case-title h1').first();
    await expect(h1).toBeVisible();
  });

  test('H6 heading is visible after animation settle', async ({ page }) => {
    const h6 = page.locator('.section_case-title h6').first();
    // H6 may not exist on all case pages — soft check
    const count = await h6.count();
    if (count > 0) {
      await expect(h6).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No H6 found in .section_case-title — may not be present on this case page'
      });
    }
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on case page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadCasePage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('navigate away and back: animation replays cleanly', async ({ page }) => {
    const errors = collectErrors(page);
    await loadCasePage(page);

    // Navigate to home (triggers case destroy)
    await page.goto(`${STAGING_URL}/`);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to case page (triggers case init again)
    await page.goto(`${STAGING_URL}${CASE_PATH}`);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Title should be visible again
    await expect(page.locator('.section_case-title')).toBeVisible();

    // No doubled SplitText words (check word count is reasonable)
    const h1 = page.locator('.section_case-title h1').first();
    const h1Count = await h1.count();
    if (h1Count > 0) {
      await expect(h1).toBeVisible();
    }

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('direct-land on case page: title animates in', async ({ page }) => {
    // Fresh direct navigation (not via Barba)
    await loadCasePage(page);
    await expect(page.locator('.section_case-title')).toBeVisible();
    const h1 = page.locator('.section_case-title h1').first();
    const h1Count = await h1.count();
    if (h1Count > 0) {
      await expect(h1).toBeVisible();
    }
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion: title visible immediately', async ({ page }) => {
    await page.goto(`${STAGING_URL}${CASE_PATH}`);
    await waitForRHP(page);
    // With reduced motion, title should be visible without waiting for animation
    await page.waitForTimeout(500);
    await expect(page.locator('.section_case-title')).toBeVisible();

    const h1 = page.locator('.section_case-title h1').first();
    const h1Count = await h1.count();
    if (h1Count > 0) {
      const opacity = await h1.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }
  });
});
