// @ts-check
/**
 * Acceptance tests — RHP Home Intro Mobile/Tablet (≤991px)
 *
 * Tests the mobile-specific home intro: fg video hidden on load, 250svh section,
 * logo fade-out, auto-engage ACTIVE state, dial position, bg canvas visibility.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-home-intro-mobile';
const PAGE_PATH = '/';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// Mobile viewport
const MOBILE_VP = { width: 375, height: 812 };
// Tablet viewport
const TABLET_VP = { width: 768, height: 1024 };
// Desktop viewport (regression check)
const DESKTOP_VP = { width: 1440, height: 900 };

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests: Mobile Elements ───────────────────────────────────

test.describe(`${SLUG} — Mobile Elements`, () => {
  test.use({ viewport: MOBILE_VP });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('fg layer hidden on mobile home load', async ({ page }) => {
    const fgLayer = page.locator('.dial_component[data-dial-ns="home"] .dial_layer-fg');
    const opacity = await fgLayer.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(0);
  });

  test('section_home-intro has 250svh height on mobile', async ({ page }) => {
    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    // 250svh should be approximately 2.5x viewport height (allowing 10% tolerance)
    expect(height).toBeGreaterThan(vh * 2.2);
    expect(height).toBeLessThan(vh * 2.8);
  });

  test('generic video (idle) is visible on page load', async ({ page }) => {
    const genericVideo = page.locator('.dial_generic-video');
    await expect(genericVideo).toBeAttached();
    const opacity = await genericVideo.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

// ── Tests: Mobile Console Errors ─────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: MOBILE_VP });

  test('no JS errors on mobile home load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Mobile Scroll Morph ───────────────────────────────

test.describe(`${SLUG} — Mobile Scroll Morph`, () => {
  test.use({ viewport: MOBILE_VP });

  test('dial reaches ACTIVE state after full scroll morph', async ({ page }) => {
    await loadPage(page);

    // Scroll through the full 250svh section
    const sectionHeight = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });

    // Scroll past the section
    await page.evaluate((h) => window.scrollTo(0, h + 100), sectionHeight);
    await page.waitForTimeout(2500); // morph complete + settle

    // Check dial is in ACTIVE state: fg layer visible
    const fgOpacity = await page.locator('.dial_component[data-dial-ns="home"] .dial_layer-fg')
      .evaluate(el => getComputedStyle(el).opacity);
    expect(Number(fgOpacity)).toBe(1);

    // Check bg canvas visible
    const bgCanvas = page.locator('.dial_component[data-dial-ns="home"] .dial_bg-canvas');
    if (await bgCanvas.count() > 0) {
      const bgOpacity = await bgCanvas.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(bgOpacity)).toBe(1);
    }
  });

  test('rhp-home-ready class applied after morph complete', async ({ page }) => {
    await loadPage(page);

    const sectionHeight = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });

    await page.evaluate((h) => window.scrollTo(0, h + 100), sectionHeight);
    await page.waitForTimeout(2500);

    const hasClass = await page.locator('[data-barba="wrapper"]')
      .evaluate(el => el.classList.contains('rhp-home-ready'));
    expect(hasClass).toBe(true);
  });
});

// ── Tests: Desktop Regression ────────────────────────────────

test.describe(`${SLUG} — Desktop Regression`, () => {
  test.use({ viewport: DESKTOP_VP });

  test('desktop section_home-intro is NOT 250svh', async ({ page }) => {
    await loadPage(page);

    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    // Desktop should be ~100vh, not 250svh
    expect(height).toBeLessThan(vh * 1.5);
  });

  test('no JS errors on desktop home load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Tablet ────────────────────────────────────────────

test.describe(`${SLUG} — Tablet`, () => {
  test.use({ viewport: TABLET_VP });

  test('tablet uses mobile intro (250svh section)', async ({ page }) => {
    await loadPage(page);

    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    expect(height).toBeGreaterThan(vh * 2.2);
  });
});

// ── Tests: Reduced Motion ────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ viewport: MOBILE_VP, reducedMotion: 'reduce' });

  test('content visible without animation on mobile', async ({ page }) => {
    await loadPage(page);

    // Generic video should still be visible
    const genericVideo = page.locator('.dial_generic-video');
    if (await genericVideo.count() > 0) {
      const opacity = await genericVideo.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }
  });
});

// ── Tests: Barba Lifecycle ───────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test.use({ viewport: MOBILE_VP });

  test('home → about → home: clean re-init on mobile', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to about
    await page.locator('.nav_about-link').click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Navigate back to home
    await page.locator('.nav_logo-link').click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Should be in home-ready state (skip-to-end path)
    const hasClass = await page.locator('[data-barba="wrapper"]')
      .evaluate(el => el.classList.contains('rhp-home-ready'));
    expect(hasClass).toBe(true);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Accessibility ─────────────────────────────────────

test.describe(`${SLUG} — Accessibility`, () => {
  test.use({ viewport: MOBILE_VP });

  test('no WCAG 2.1 AA violations on mobile home', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
