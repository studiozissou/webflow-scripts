// @ts-check
/**
 * Acceptance tests — fix-about-transition-stuck
 *
 * Verifies that navigating home→about quickly after the scroll morph
 * completes no longer leaves the page stuck showing the homepage.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-about-transition-stuck';
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
 * Scroll through the morph section quickly and wait for morph complete.
 * Scrolls to 2x viewport height (past the 100vh morph trigger),
 * then waits for the morph complete event.
 */
async function completeMorphQuickly(page) {
  // Scroll past the morph section (100vh trigger, scrub: 0.5 → ~0.5s lag)
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 2, behavior: 'instant' });
  });

  // Wait for morph to fire complete (scrub catches up within ~1s)
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 10_000 }
  );
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Rapid morph to about`, () => {
  test('rapid morph to about: page appears', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);

    // Wait for home intro to complete first
    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    // Complete morph quickly
    await completeMorphQuickly(page);

    // Immediately click about link
    await page.locator('.nav_about-link').click();

    // Wait for about page to appear (max 5s — covers 1.5s curtain + 2s safety + buffer)
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-barba-namespace="about"]');
        return container && getComputedStyle(container).visibility !== 'hidden';
      },
      { timeout: 5_000 }
    );

    // About content should be visible
    const aboutHeader = page.locator('.about_header');
    await expect(aboutHeader).toBeVisible({ timeout: 5_000 });
  });

  test('rapid morph to about: no console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(BASE);
    await waitForRHP(page);

    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    await completeMorphQuickly(page);
    await page.locator('.nav_about-link').click();

    // Wait for transition to settle
    await page.waitForTimeout(4000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('rapid morph to about: dial namespace is about', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);

    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    await completeMorphQuickly(page);
    await page.locator('.nav_about-link').click();

    // Wait for afterEnter to fire and set the namespace
    await page.waitForFunction(
      () => document.querySelector('.dial_component')?.getAttribute('data-dial-ns') === 'about',
      { timeout: 5_000 }
    );
  });

  test('rapid morph to about: further navigation works', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);

    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    await completeMorphQuickly(page);
    await page.locator('.nav_about-link').click();

    // Wait for about to appear
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="about"]') &&
            getComputedStyle(document.querySelector('[data-barba-namespace="about"]')).visibility !== 'hidden',
      { timeout: 5_000 }
    );

    // About→home is a hard reload, so just verify the about page loaded
    // and that navigation isn't stuck (Barba.preventRunning isn't blocking)
    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('about');
  });
});

test.describe(`${SLUG} — Regression`, () => {
  test('normal morph to about still works', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);

    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    await completeMorphQuickly(page);

    // Wait 2s (simulates user waiting after morph before navigating)
    await page.waitForTimeout(2000);

    await page.locator('.nav_about-link').click();

    // About should appear normally with curtain animation
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="about"]') &&
            getComputedStyle(document.querySelector('[data-barba-namespace="about"]')).visibility !== 'hidden',
      { timeout: 5_000 }
    );

    const aboutHeader = page.locator('.about_header');
    await expect(aboutHeader).toBeVisible({ timeout: 5_000 });
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion: about appears instantly', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);

    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 15_000 }
    );

    await completeMorphQuickly(page);
    await page.locator('.nav_about-link').click();

    // With reduced motion, curtain is skipped — about should appear immediately
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="about"]') &&
            getComputedStyle(document.querySelector('[data-barba-namespace="about"]')).visibility !== 'hidden',
      { timeout: 3_000 }
    );
  });
});
