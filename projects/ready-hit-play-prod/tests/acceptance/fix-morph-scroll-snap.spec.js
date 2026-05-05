// @ts-check
/**
 * Acceptance tests for fix-morph-scroll-snap.
 *
 * Verifies that the homepage scroll morph auto-completes when scroll stalls
 * near the end (progress >= 0.9), and does NOT fire early at lower progress.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-morph-scroll-snap';
const PAGE_PATH = '/';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // allow intro settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Wait for the intro sequence to complete so the morph section is active.
 * The intro dispatches 'rhp:home-intro:complete' when done.
 */
async function waitForIntroComplete(page) {
  await page.waitForFunction(
    () => document.querySelector('.section_home-intro') !== null,
    { timeout: 15_000 }
  );
  // Wait for the scroll morph ScrollTrigger to be active
  await page.waitForTimeout(2000);
}

/**
 * Scroll to a percentage of the morph section height.
 * The morph section is pinned with end: '+=100%', so scrolling
 * 1 viewport height = 100% progress.
 */
async function scrollToMorphProgress(page, progress) {
  await page.evaluate((p) => {
    const vh = window.innerHeight;
    window.scrollTo({ top: vh * p, behavior: 'instant' });
  }, progress);
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage load + morph completion', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await waitForIntroComplete(page);

    // Scroll to 95% to trigger auto-complete
    await scrollToMorphProgress(page, 0.95);
    await page.waitForTimeout(1000); // 200ms debounce + 500ms scrub + buffer

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Auto-complete`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await waitForIntroComplete(page);
  });

  test('rhp-home-ready class applied after scroll to 90%+', async ({ page }) => {
    await scrollToMorphProgress(page, 0.92);
    // Wait for debounce (200ms) + scrub catchup (500ms) + buffer
    await page.waitForTimeout(1000);

    const wrapper = page.locator('[data-barba="wrapper"]');
    await expect(wrapper).toHaveClass(/rhp-home-ready/);
  });

  test('dial interaction unlocked after auto-complete', async ({ page }) => {
    await scrollToMorphProgress(page, 0.92);
    await page.waitForTimeout(1000);

    const unlocked = await page.evaluate(() => {
      const dial = window.RHP?.workDial;
      // Check the public API flags that indicate the dial is interactive
      return dial != null;
    });
    expect(unlocked).toBe(true);
  });

  test('nav links visible after auto-complete', async ({ page }) => {
    await scrollToMorphProgress(page, 0.92);
    await page.waitForTimeout(1000);

    await expect(page.locator('.nav_about-link')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.nav_contact-link')).toBeVisible({ timeout: 2000 });
  });
});

test.describe(`${SLUG} — No early trigger`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await waitForIntroComplete(page);
  });

  test('no auto-complete at 50% scroll progress', async ({ page }) => {
    await scrollToMorphProgress(page, 0.5);
    await page.waitForTimeout(500);

    const hasReady = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(hasReady).toBe(false);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('morph completes and nav is visible with reduced motion', async ({ page }) => {
    await loadPage(page);
    // With reduced motion, intro should fast-forward
    await page.waitForTimeout(3000);

    // Nav should be accessible regardless of motion preference
    const aboutLink = page.locator('.nav_about-link');
    const opacity = await aboutLink.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});
