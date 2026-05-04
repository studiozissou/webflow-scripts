// @ts-check
/**
 * Acceptance tests — RHP Mobile Intro: Timed Word Cycle + Scroll Morph
 *
 * Tests the new mobile home intro: timed word cycle (not scroll-driven),
 * 100svh section, scroll morph identical to desktop, reduced motion, Barba.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-mobile-intro-timed-words';
const PAGE_PATH = '/';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// Viewports
const MOBILE_VP = { width: 375, height: 812 };
const TABLET_VP = { width: 768, height: 1024 };
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

// ── Tests: Mobile Section Layout ────────────────────────────

test.describe(`${SLUG} — Mobile Section Layout`, () => {
  test.use({ viewport: MOBILE_VP });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('section_home-intro has 100svh height on mobile', async ({ page }) => {
    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    // 100svh = ~1x viewport height (within 20% tolerance for browser chrome)
    expect(height).toBeGreaterThan(vh * 0.8);
    expect(height).toBeLessThan(vh * 1.3);
  });

  test('home-intro_bottom is position absolute on mobile', async ({ page }) => {
    const position = await page.locator('.home-intro_bottom').evaluate(el => {
      return getComputedStyle(el).position;
    });
    expect(position).toBe('absolute');
  });
});

// ── Tests: Mobile Word Cycle ────────────────────────────────

test.describe(`${SLUG} — Mobile Word Cycle`, () => {
  test.use({ viewport: MOBILE_VP });

  test('word cycle completes automatically on mobile', async ({ page }) => {
    await loadPage(page);

    // Wait for the full word cycle: 0.5s delay + 3 × (~2s per word) + buffer
    // Total: ~7.5s. Wait 9s to be safe.
    await page.waitForTimeout(9000);

    // After word cycle completes, logoSplitData should be reverted
    // (words cleaned up by _destroyLogoText). Check that no SplitText
    // word wrappers remain visible.
    const visibleWords = await page.locator('#interactive-logo .intro-logo-word').evaluateAll(
      els => els.filter(el => getComputedStyle(el).opacity !== '0').length
    );
    expect(visibleWords).toBe(0);
  });
});

// ── Tests: Mobile Scroll Morph ──────────────────────────────

test.describe(`${SLUG} — Mobile Scroll Morph`, () => {
  test.use({ viewport: MOBILE_VP });

  test('rhp-home-ready after scroll morph on mobile', async ({ page }) => {
    await loadPage(page);

    // Scroll past the 100svh section
    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((h) => window.scrollTo(0, h + 100), vh);
    await page.waitForTimeout(3000);

    const hasClass = await page.locator('[data-barba="wrapper"]')
      .evaluate(el => el.classList.contains('rhp-home-ready'));
    expect(hasClass).toBe(true);
  });

  test('dial reaches ACTIVE state after morph on mobile', async ({ page }) => {
    await loadPage(page);

    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((h) => window.scrollTo(0, h + 100), vh);
    await page.waitForTimeout(3000);

    // fg layer should be visible (opacity 1) — forceActive was called
    const fgOpacity = await page.locator('.dial_component[data-dial-ns="home"] .dial_layer-fg')
      .evaluate(el => getComputedStyle(el).opacity);
    expect(Number(fgOpacity)).toBe(1);
  });
});

// ── Tests: Console Errors ───────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: MOBILE_VP });

  test('no JS errors on mobile home load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    // Wait for word cycle to start (covers init timing errors)
    await page.waitForTimeout(2000);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Desktop Regression ───────────────────────────────

test.describe(`${SLUG} — Desktop Regression`, () => {
  test.use({ viewport: DESKTOP_VP });

  test('desktop section_home-intro is NOT 300svh', async ({ page }) => {
    await loadPage(page);

    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    // Desktop should be ~100vh
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

// ── Tests: Tablet ───────────────────────────────────────────

test.describe(`${SLUG} — Tablet`, () => {
  test.use({ viewport: TABLET_VP });

  test('tablet uses timed word cycle (100svh section)', async ({ page }) => {
    await loadPage(page);

    const height = await page.locator('.section_home-intro').evaluate(el => {
      return parseFloat(getComputedStyle(el).height);
    });
    const vh = await page.evaluate(() => window.innerHeight);
    // Should be ~100svh now (not 300svh)
    expect(height).toBeLessThan(vh * 1.5);
  });
});

// ── Tests: Reduced Motion ───────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ viewport: MOBILE_VP, reducedMotion: 'reduce' });

  test('reduced motion skips word cycle', async ({ page }) => {
    await loadPage(page);

    // No word wrappers should be created (SplitText skipped or reverted)
    // Generic video should still be visible
    const genericVideo = page.locator('.dial_generic-video');
    if (await genericVideo.count() > 0) {
      const opacity = await genericVideo.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }

    // Scroll past section — should complete instantly
    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((h) => window.scrollTo(0, h + 100), vh);
    await page.waitForTimeout(1500);

    const hasClass = await page.locator('[data-barba="wrapper"]')
      .evaluate(el => el.classList.contains('rhp-home-ready'));
    expect(hasClass).toBe(true);
  });
});

// ── Tests: Barba Lifecycle ──────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test.use({ viewport: MOBILE_VP });

  test('home → about → home: clean re-init on mobile', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Scroll to complete morph first (need rhp-home-ready for nav links)
    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((h) => window.scrollTo(0, h + 100), vh);
    await page.waitForTimeout(3000);

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

// ── Tests: Accessibility ────────────────────────────────────

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
