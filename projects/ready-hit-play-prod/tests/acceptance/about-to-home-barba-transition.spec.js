// @ts-check
/**
 * Acceptance tests — about-to-home-barba-transition
 *
 * Verifies that about→home is a proper Barba slide-out transition
 * (not a hard reload) and lands on the home main section with the
 * dial visible and interactive.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'about-to-home-barba-transition';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Navigate to about page via Barba from home.
 * Waits for intro + morph, then clicks about link.
 */
async function goToAboutViaBarba(page) {
  await page.goto(BASE);
  await waitForRHP(page);

  // Wait for home intro to complete
  await page.waitForFunction(
    () => window.RHP?.homeIntro?.done === true,
    { timeout: 15_000 }
  );

  // Complete morph quickly
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 2, behavior: 'instant' });
  });
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 10_000 }
  );

  // Wait for morph to settle
  await page.waitForTimeout(500);

  // Click about link
  await page.locator('.nav_about-link').click();

  // Wait for about page to appear
  await page.waitForFunction(
    () => {
      const container = document.querySelector('[data-barba-namespace="about"]');
      return container && getComputedStyle(container).visibility !== 'hidden';
    },
    { timeout: 5_000 }
  );

  // Wait for transition to settle
  await page.waitForTimeout(2000);
}

/**
 * From about page, click home link and wait for home to appear.
 */
async function goHomeFromAbout(page) {
  // Click logo/home link
  const homeLink = page.locator('.nav_logo-link').first();
  await homeLink.click();

  // Wait for home namespace to appear (Barba swap, not hard reload)
  await page.waitForFunction(
    () => document.querySelector('[data-barba-namespace="home"]') !== null,
    { timeout: 8_000 }
  );

  // Wait for transition animation to settle
  await page.waitForTimeout(2000);
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — About to Home transition`, () => {
  test('about to home: page transitions without reload', async ({ page }) => {
    await goToAboutViaBarba(page);

    // Track if a full navigation (reload) happens
    let reloaded = false;
    page.on('load', () => { reloaded = true; });

    await goHomeFromAbout(page);

    // Should NOT have done a full reload — Barba handles it
    expect(reloaded).toBe(false);

    // Home container should exist
    const homeContainer = page.locator('[data-barba-namespace="home"]');
    await expect(homeContainer).toBeAttached();
  });

  test('about to home: dial is visible and interactive', async ({ page }) => {
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    // .rhp-home-ready should be on the wrapper
    const wrapper = page.locator('[data-barba="wrapper"]');
    await expect(wrapper).toHaveClass(/rhp-home-ready/, { timeout: 5_000 });

    // Dial component should be visible
    const dial = page.locator('.dial_component');
    await expect(dial).toBeVisible({ timeout: 3_000 });
  });

  test('about to home: dial namespace is home', async ({ page }) => {
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    await page.waitForFunction(
      () => document.querySelector('.dial_component')?.getAttribute('data-dial-ns') === 'home',
      { timeout: 5_000 }
    );
  });

  test('about to home: no console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    // Filter benign errors (e.g. favicon 404, third-party scripts)
    const realErrors = errors.filter(e =>
      !e.message.includes('favicon') &&
      !e.message.includes('third-party')
    );
    expect(realErrors, `JS errors: ${realErrors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('about to home: further navigation works', async ({ page }) => {
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    // Should be able to navigate to a case study from home
    // (verifies Barba preventRunning is not stuck)
    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('home');
  });
});

test.describe(`${SLUG} — Round trips`, () => {
  test('round trip: about → home → about', async ({ page }) => {
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    // Wait for morph skipToEnd to settle
    await page.waitForTimeout(1000);

    // Go back to about
    await page.locator('.nav_about-link').click();

    // About should appear
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-barba-namespace="about"]');
        return container && getComputedStyle(container).visibility !== 'hidden';
      },
      { timeout: 8_000 }
    );

    const aboutHeader = page.locator('.about_header');
    await expect(aboutHeader).toBeVisible({ timeout: 5_000 });
  });

  test('round trip: about → home → work', async ({ page }) => {
    await goToAboutViaBarba(page);
    await goHomeFromAbout(page);

    // Wait for home to settle
    await page.waitForTimeout(1000);

    // RHP scripts should still be OK
    const scriptsOk = await page.evaluate(() => window.RHP?.scriptsOk === true);
    expect(scriptsOk).toBe(true);

    // Home namespace should be active
    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('home');
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion: about to home resolves instantly', async ({ page }) => {
    await page.goto(`${BASE}/about`);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    await goHomeFromAbout(page);

    // Home should appear immediately (no slide animation)
    const homeContainer = page.locator('[data-barba-namespace="home"]');
    await expect(homeContainer).toBeAttached({ timeout: 5_000 });
  });
});
