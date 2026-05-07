// @ts-check
/**
 * Acceptance tests for perf-parallel-script-loading.
 *
 * Verifies that parallelised script loading in init.js does not break
 * module registration, GSAP plugin availability, Barba transitions,
 * or loader dismiss behaviour.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'perf-parallel-script-loading';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Navigate to a page and wait for RHP init. */
async function loadPage(page, path = '/') {
  await page.goto(`${BASE}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // allow GSAP / init settle
}

/** Attach a pageerror listener and return the errors array. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Module loading */
test.describe(`${SLUG} — Module Loading`, () => {
  test('all RHP modules load successfully', async ({ page }) => {
    await loadPage(page);
    const scriptsOk = await page.evaluate(() => window.RHP?.scriptsOk);
    expect(scriptsOk).toBe(true);
  });

  test('GSAP plugins are registered', async ({ page }) => {
    await loadPage(page);
    const plugins = await page.evaluate(() => ({
      scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
      flip: typeof window.Flip !== 'undefined',
      scramble: typeof window.ScrambleTextPlugin !== 'undefined',
      splitText: typeof window.SplitText !== 'undefined'
    }));
    expect(plugins.scrollTrigger).toBe(true);
    expect(plugins.flip).toBe(true);
    expect(plugins.scramble).toBe(true);
    expect(plugins.splitText).toBe(true);
  });
});

/* 2. No console errors on each page type */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage', async ({ page }) => {
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

  test('no JS errors on case study page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/work/overland-ai');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 3. Barba transitions */
test.describe(`${SLUG} — Barba Transitions`, () => {
  test('home to about: no errors, correct namespace', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');

    // Click about link
    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(2500); // Barba transition time
    await waitForRHP(page);

    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('about');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('about to home: no errors, correct namespace', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');

    // Click logo/home link
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('home');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Loader dismiss */
test.describe(`${SLUG} — Loader`, () => {
  test('loader dismisses on homepage', async ({ page }) => {
    await loadPage(page);
    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('rhp-scripts-loaded')
    );
    expect(hasClass).toBe(true);
  });
});

/* 5. Load timing (soft assertion — informational) */
test.describe(`${SLUG} — Performance`, () => {
  test('scripts load within 10s on uncached load', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/`);
    await waitForRHP(page);
    const elapsed = Date.now() - start;

    // Soft assertion — logs as annotation, doesn't fail
    if (elapsed > 10000) {
      test.info().annotations.push({
        type: 'perf-regression',
        description: `Scripts took ${elapsed}ms to load (target: <10s)`
      });
    }
    // Hard ceiling — something is very broken if >20s
    expect(elapsed).toBeLessThan(20000);
  });
});
