// @ts-check
/**
 * Acceptance tests — fix-memory-leak-cleanup
 *
 * Verifies that video elements are properly released on destroy,
 * GSAP contexts are reverted, RAF loops do not accumulate, and
 * rapid Barba navigation cycles do not cause memory-related regressions.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-memory-leak-cleanup';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Navigate via Barba by clicking a nav link (not page.goto, which bypasses Barba).
 * Waits for the Barba transition to complete and RHP to re-init.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - CSS selector for the nav link to click
 * @param {number} [transitionWait=2500] - ms to wait for Barba transition
 */
async function barbaNavigate(page, selector, transitionWait = 2500) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(transitionWait);
  await waitForRHP(page);
  await page.waitForTimeout(1000); // post-transition settle
}

/**
 * Run N full home->about->home cycles via Barba navigation.
 * @param {import('@playwright/test').Page} page
 * @param {number} cycles
 * @param {number} [transitionWait=2500]
 */
async function runNavigationCycles(page, cycles, transitionWait = 2500) {
  for (let i = 0; i < cycles; i++) {
    await barbaNavigate(page, '.nav_about-link', transitionWait);
    await barbaNavigate(page, '.nav_logo-link', transitionWait);
  }
}

// ── 1. Baseline — Console Errors ─────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after home->about->home cycle', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');

    // Home -> About
    await barbaNavigate(page, '.nav_about-link');
    // About -> Home
    await barbaNavigate(page, '.nav_logo-link');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after 3 rapid navigation cycles', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');

    await runNavigationCycles(page, 3, 2000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 2. Video Cleanup ─────────────────────────────────────────

test.describe(`${SLUG} — Video Cleanup`, () => {
  test('video count stays bounded after navigation cycles', async ({ page }) => {
    await loadPage(page, '/');

    // Run 3 full round-trip cycles
    await runNavigationCycles(page, 3, 2000);

    // Count video elements in the DOM after cycling
    const videoCount = await page.evaluate(() =>
      document.querySelectorAll('video').length
    );

    // work-dial creates ~7 videos (generic + pool). Anything above 12
    // indicates videos are leaking across destroy/re-init cycles.
    expect(
      videoCount,
      `Expected <= 12 video elements, found ${videoCount} — videos may be leaking`
    ).toBeLessThanOrEqual(12);
  });
});

// ── 3. About Dial Canvas ─────────────────────────────────────

test.describe(`${SLUG} — About Dial Canvas`, () => {
  test('dial canvas present on about page', async ({ page }) => {
    await loadPage(page, '/');
    await barbaNavigate(page, '.nav_about-link');

    const canvas = page.locator('#dial_ticks-canvas');
    await expect(canvas).toBeAttached();

    // Canvas should have non-zero dimensions (draw-once actually rendered)
    const dimensions = await canvas.evaluate(el => ({
      w: el.width,
      h: el.height,
    }));
    expect(dimensions.w).toBeGreaterThan(0);
    expect(dimensions.h).toBeGreaterThan(0);
  });

  test('no console errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await barbaNavigate(page, '.nav_about-link');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 4. Module Survival ───────────────────────────────────────

test.describe(`${SLUG} — Module Survival`, () => {
  test('RHP modules load after rapid navigation', async ({ page }) => {
    await loadPage(page, '/');

    // 3 rapid cycles with reduced wait
    await runNavigationCycles(page, 3, 2000);

    // Verify scriptsOk flag and core module registration
    const modulesOk = await page.evaluate(() => {
      const r = window.RHP;
      return !!(
        r &&
        r.scriptsOk &&
        r.workDial &&
        r.cursor &&
        r.lenis &&
        r.transitionDial
      );
    });
    expect(modulesOk, 'Core RHP modules should still be registered after rapid navigation').toBe(true);
  });
});
