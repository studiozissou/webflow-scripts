// @ts-check
/**
 * Acceptance tests — RHP About Entrance Curtain & Content Reveal
 *
 * Tests the two-phase home/work → about transition:
 * 1. Fullscreen curtain slides in from left (1.5s)
 * 2. About content reveals with SplitText line stagger (2s)
 *
 * Timing reference:
 * - Curtain animation: 1.5s
 * - Content reveal: 2s (starts after curtain)
 * - Total transition settle: ~4s
 * - Barba page transition overhead: 500ms
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-entrance-curtain';
const HOME_PATH = '/';
const ABOUT_PATH = '/about';
const CASE_PATH = '/work/overland-ai'; // any case page

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Navigate via Barba by clicking a link, then wait for transition + scripts. */
async function barbaNavigate(page, linkSelector, settleMs = 4500) {
  await page.locator(linkSelector).first().click();
  await page.waitForTimeout(settleMs);
  await waitForRHP(page);
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Curtain element presence */
test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, HOME_PATH);
  });

  test('curtain element exists after RHP init', async ({ page }) => {
    await expect(page.locator('.rhp-about-curtain')).toBeAttached();
  });

  test('curtain is hidden on home page', async ({ page }) => {
    const display = await page.locator('.rhp-about-curtain')
      .evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });
});

/* 2. No console errors on transitions */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home → about transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, HOME_PATH);
    await barbaNavigate(page, 'a[href="/about"]');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on work → about transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_PATH);
    await barbaNavigate(page, 'a[href="/about"]');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 3. Curtain visible during transition */
test.describe(`${SLUG} — Curtain Animation`, () => {
  test('curtain is visible during home → about transition', async ({ page }) => {
    await loadPage(page, HOME_PATH);

    // Click about link and check curtain mid-transition
    await page.locator('a[href="/about"]').first().click();
    // Check after 0.5s — curtain should be mid-animation
    await page.waitForTimeout(500);

    const curtain = page.locator('.rhp-about-curtain');
    const display = await curtain.evaluate(el => getComputedStyle(el).display);
    expect(display).not.toBe('none');

    // Wait for full transition to settle
    await page.waitForTimeout(4000);
    await waitForRHP(page);
  });
});

/* 4. Content visible after transition */
test.describe(`${SLUG} — Content Reveal`, () => {
  test('about content visible after home → about transition', async ({ page }) => {
    await loadPage(page, HOME_PATH);
    await barbaNavigate(page, 'a[href="/about"]');

    // All target elements should be visible after the 4.5s settle
    await expect(page.locator('.about_r-link')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.about_header h2').first()).toBeVisible({ timeout: 5000 });

    // At least one accordion title should be visible
    const firstAccordionH2 = page.locator('.accordion-title h2').first();
    await expect(firstAccordionH2).toBeVisible({ timeout: 5000 });
  });

  test('curtain hidden after transition completes', async ({ page }) => {
    await loadPage(page, HOME_PATH);
    await barbaNavigate(page, 'a[href="/about"]');

    const display = await page.locator('.rhp-about-curtain')
      .evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });
});

/* 5. Re-entry: home → about → home → about */
test.describe(`${SLUG} — Re-entry`, () => {
  test('second home → about transition works cleanly', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, HOME_PATH);

    // First trip: home → about
    await barbaNavigate(page, 'a[href="/about"]');

    // Return: about → home
    await barbaNavigate(page, 'a[href="/"]', 2500);

    // Second trip: home → about
    await barbaNavigate(page, 'a[href="/about"]');

    // Content should be visible again
    await expect(page.locator('.about_r-link')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.about_header h2').first()).toBeVisible({ timeout: 5000 });

    // No doubled curtain elements
    const curtainCount = await page.locator('.rhp-about-curtain').count();
    expect(curtainCount).toBe(1);

    // No JS errors through the full cycle
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 6. About → home still works */
test.describe(`${SLUG} — About to Home`, () => {
  test('about → home transition loads home page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, HOME_PATH);
    await barbaNavigate(page, 'a[href="/about"]');

    // Navigate back to home
    await barbaNavigate(page, 'a[href="/"]', 2500);

    // Home page should be loaded — check for dial element
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached({ timeout: 5000 });

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 7. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content immediately visible with reduced motion', async ({ page }) => {
    await loadPage(page, HOME_PATH);
    await barbaNavigate(page, 'a[href="/about"]', 2000);

    // Content should be visible without waiting for animation
    const rLinkOpacity = await page.locator('.about_r-link')
      .evaluate(el => getComputedStyle(el).opacity);
    expect(Number(rLinkOpacity)).toBeGreaterThan(0);

    const headerOpacity = await page.locator('.about_header h2').first()
      .evaluate(el => getComputedStyle(el).opacity);
    expect(Number(headerOpacity)).toBeGreaterThan(0);
  });
});
