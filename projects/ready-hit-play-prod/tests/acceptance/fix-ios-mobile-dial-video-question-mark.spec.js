// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-ios-mobile-dial-video-question-mark';
const PAGE_PATH = '/';

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Video Visibility`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('fg-video has visibility visible after RHP init', async ({ page }) => {
    const vis = await page.locator('.dial_fg-video').evaluate(
      el => getComputedStyle(el).visibility
    );
    expect(vis).toBe('visible');
  });

  test('fg-video has a valid src after RHP init', async ({ page }) => {
    const src = await page.locator('.dial_fg-video').evaluate(
      el => el.src || el.currentSrc
    );
    expect(src).toBeTruthy();
    expect(src).toContain('vimeo');
  });

  test('fg-video readyState >= 2 after init settle', async ({ page }) => {
    await page.waitForTimeout(3000); // extra time for video decode
    const ready = await page.locator('.dial_fg-video').evaluate(
      el => el.readyState
    );
    expect(ready).toBeGreaterThanOrEqual(2);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    // Filter out known Webflow 403 placeholder error
    const realErrors = errors.filter(
      e => !e.message.includes('placeholder.60f9b1840c.svg')
    );
    expect(realErrors, `JS errors: ${realErrors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Height Freeze`, () => {
  test('dial component has inline height style on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    // Scroll through morph
    await page.evaluate(() => {
      window.scrollTo(0, document.querySelector('.section_home-intro')?.scrollHeight || 3000);
    });
    await page.waitForTimeout(2000);
    const height = await page.locator('.dial_component').evaluate(
      el => el.style.height
    );
    expect(height).toMatch(/^\d+px$/);
  });
});

test.describe(`${SLUG} — Desktop Regression`, () => {
  test('desktop: fg-video is visible without delay', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    const vis = await page.locator('.dial_fg-video').evaluate(
      el => getComputedStyle(el).visibility
    );
    expect(vis).toBe('visible');
  });
});

test.describe(`${SLUG} — Barba Re-entry`, () => {
  test('fg-video visible after about round-trip', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to about
    await page.locator('.nav_about-link').click();
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to home
    await page.locator('.nav_logo-link').click();
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    const vis = await page.locator('.dial_fg-video').evaluate(
      el => getComputedStyle(el).visibility
    );
    expect(vis).toBe('visible');

    const realErrors = errors.filter(
      e => !e.message.includes('placeholder.60f9b1840c.svg')
    );
    expect(realErrors, `JS errors: ${realErrors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on homepage', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.w-webflow-badge')
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
