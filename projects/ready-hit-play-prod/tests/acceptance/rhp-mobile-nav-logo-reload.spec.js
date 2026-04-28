// @ts-check
/**
 * Acceptance tests — rhp-mobile-nav-logo-reload
 *
 * On RHP homepage tablet and below, nav logo tap does a full page reload
 * instead of replay(), so user restarts from beginning of morph.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-mobile-nav-logo-reload';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function scrollMorphComplete(page) {
  // Scroll past the intro section to complete the morph
  await page.evaluate(() => {
    const section = document.querySelector('.section_home-intro');
    if (section) window.scrollTo(0, section.offsetTop + section.offsetHeight);
  });
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(500); // settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(SLUG, () => {

  test('mobile: nav logo tap reloads page on homepage post-morph', async ({ browser }) => {
    // Emulate a touch device (iPhone-like viewport)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      // Force (hover: none) by using a mobile user agent
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await page.goto(BASE + '/');
    await waitForRHP(page);
    await page.waitForTimeout(1500); // intro settle

    // Scroll through morph
    await scrollMorphComplete(page);

    // Confirm morph is complete
    const morphComplete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(morphComplete).toBe(true);

    // Tap nav logo — should trigger a full page reload
    const navLogo = page.locator('.nav_logo-link');
    await expect(navLogo).toBeVisible({ timeout: 5000 });

    // Listen for navigation (reload = same URL)
    const navigationPromise = page.waitForNavigation({ timeout: 10_000 });
    await navLogo.click();
    await navigationPromise;

    // After reload, morph should be back at start
    await waitForRHP(page);
    const morphCompleteAfter = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(morphCompleteAfter).not.toBe(true);

    await context.close();
  });

  test('desktop: nav logo click still triggers replay, not reload', async ({ browser }) => {
    // Emulate a desktop viewport (hover: hover will be true)
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
    });
    const page = await context.newPage();
    await page.goto(BASE + '/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    await scrollMorphComplete(page);

    const morphComplete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(morphComplete).toBe(true);

    // Click nav logo — should NOT reload, should trigger replay
    const navLogo = page.locator('.nav_logo-link');
    await expect(navLogo).toBeVisible({ timeout: 5000 });

    // Track whether a full navigation (reload) happens
    let didNavigate = false;
    page.on('framenavigated', () => { didNavigate = true; });

    await navLogo.click();
    // Wait for replay to start (morph.complete should become false)
    await page.waitForFunction(
      () => window.RHP?.homeScrollMorph?.complete !== true,
      { timeout: 10_000 }
    );

    // Confirm no page reload occurred
    expect(didNavigate).toBe(false);

    await context.close();
  });

  test('no console errors during mobile logo reload', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    const errors = collectErrors(page);

    await page.goto(BASE + '/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);
    await scrollMorphComplete(page);

    await page.locator('.nav_logo-link').click();
    await page.waitForNavigation({ timeout: 10_000 }).catch(() => {});
    await waitForRHP(page).catch(() => {});
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);

    await context.close();
  });

  test('about page: mobile nav logo navigates home without reload side-effect', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await page.goto(BASE + '/about');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Check we are on about namespace
    const nsBefore = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(nsBefore).toBe('about');

    // Tap nav logo — should navigate to home (Barba or location.href), not reload about
    const navLogo = page.locator('.nav_logo-link');
    await expect(navLogo).toBeVisible({ timeout: 5000 });
    await navLogo.click();

    // Wait for home namespace
    await page.waitForFunction(
      () => document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace') === 'home',
      { timeout: 15_000 }
    );

    const nsAfter = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(nsAfter).toBe('home');

    await context.close();
  });
});
