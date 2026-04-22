// @ts-check
/**
 * Acceptance tests — rhp-nav-logo-replay-and-dial-click
 *
 * Covers:
 * 1. Nav logo click replays morph (scroll to top, section visible, complete reset)
 * 2. Morph re-plays on scroll after replay
 * 3. Transition dial click smooth-scrolls through morph
 * 4. No JS errors during interactions
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-nav-logo-replay-and-dial-click';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadHome(page) {
  await page.goto(BASE + '/');
  await waitForRHP(page);
  await page.waitForTimeout(1500); // allow intro / GSAP settle
}

/** Scroll through the morph and wait for it to complete. */
async function scrollMorph(page) {
  // Scroll to the bottom of .section_home-intro to trigger the morph
  await page.evaluate(() => {
    const section = document.querySelector('.section_home-intro');
    if (section) window.scrollTo(0, section.offsetTop + section.offsetHeight);
  });
  // Wait for morph to complete
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

test.describe(`${SLUG} — Nav logo replay`, () => {
  test('clicking nav logo replays morph — section visible, complete false', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    // Morph is complete — click nav logo
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(1800);

    // .section_home-intro should be visible again
    await expect(page.locator('.section_home-intro')).toBeVisible();

    // complete flag should be false
    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(complete).toBe(false);

    // .rhp-home-ready should be removed from wrapper
    const wrapper = page.locator('[data-barba="wrapper"]');
    await expect(wrapper).not.toHaveClass(/rhp-home-ready/);
  });

  test('morph re-plays on scroll after replay', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    // Replay
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(1800);

    // Scroll through morph again
    await scrollMorph(page);

    // Morph should be complete again
    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(complete).toBe(true);

    // .rhp-home-ready should be back
    const wrapper = page.locator('[data-barba="wrapper"]');
    await expect(wrapper).toHaveClass(/rhp-home-ready/);
  });
});

test.describe(`${SLUG} — Dial click to scroll`, () => {
  test('clicking transition dial smooth-scrolls through morph', async ({ page }) => {
    await loadHome(page);

    // The transition dial should be visible during the intro/morph
    const dial = page.locator('.home-transition-dial');
    await expect(dial).toBeVisible({ timeout: 5000 });

    // Click it
    await dial.click();

    // Wait for the morph to complete via smooth scroll
    await page.waitForFunction(
      () => window.RHP?.homeScrollMorph?.complete === true,
      { timeout: 15_000 }
    );

    // .rhp-home-ready should be present
    const wrapper = page.locator('[data-barba="wrapper"]');
    await expect(wrapper).toHaveClass(/rhp-home-ready/);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during replay and dial click interactions', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await scrollMorph(page);

    // Replay via nav logo
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(1800);

    // Scroll through morph again
    await scrollMorph(page);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
