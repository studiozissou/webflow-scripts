// @ts-check
/**
 * Acceptance tests — FG Overlay Transition Fade
 *
 * Verifies the 15% FG overlay on #fg-video-wrap fades out on home→work,
 * stays hidden on work→work, and fades back in on work→home.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'feat-fg-overlay-transition-fade';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

async function getFgOverlayOpacity(page) {
  return page.evaluate(() => {
    const wrap = document.getElementById('fg-video-wrap');
    if (!wrap) return null;
    return getComputedStyle(wrap, '::after').opacity;
  });
}

async function navigateToWork(page) {
  // Click a CMS item link or the dial to trigger home→work
  const caseLink = page.locator('a[href*="/work/"]').first();
  if (await caseLink.count() > 0) {
    await caseLink.click();
  } else {
    // Fallback: click the fg video area
    const fgWrap = page.locator('#fg-video-wrap');
    await fgWrap.click();
  }
  await waitForRHP(page);
  await page.waitForTimeout(2500); // Wait for morph + afterEnter
}

async function navigateToHome(page) {
  const logoLink = page.locator('.nav_logo-link').first();
  await logoLink.click();
  await waitForRHP(page);
  await page.waitForTimeout(2500); // Wait for shrink + afterEnter
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — FG Overlay Opacity`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('fg overlay has opacity 1 on homepage', async ({ page }) => {
    const opacity = await getFgOverlayOpacity(page);
    expect(opacity).toBeTruthy();
    expect(Number(opacity)).toBeCloseTo(1, 1);
  });

  test('fg overlay fades to 0 after home→work transition', async ({ page }) => {
    await navigateToWork(page);

    const opacity = await getFgOverlayOpacity(page);
    expect(Number(opacity)).toBeCloseTo(0, 1);
  });

  test('fg overlay stays at 0 on work page', async ({ page }) => {
    await navigateToWork(page);

    // Verify namespace
    const ns = await page.evaluate(() => {
      const comp = document.querySelector('.dial_component');
      return comp?.getAttribute('data-dial-ns');
    });
    expect(ns).toBe('work');

    const opacity = await getFgOverlayOpacity(page);
    expect(Number(opacity)).toBeCloseTo(0, 1);
  });

  test('fg overlay fades to 1 after work→home round trip', async ({ page }) => {
    await navigateToWork(page);
    await navigateToHome(page);

    const opacity = await getFgOverlayOpacity(page);
    expect(Number(opacity)).toBeCloseTo(1, 1);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after home→work→home cycle', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    await navigateToWork(page);
    await navigateToHome(page);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('overlay appears instantly on home (no animation)', async ({ page }) => {
    await loadPage(page);

    const opacity = await getFgOverlayOpacity(page);
    expect(Number(opacity)).toBeCloseTo(1, 1);
  });
});
