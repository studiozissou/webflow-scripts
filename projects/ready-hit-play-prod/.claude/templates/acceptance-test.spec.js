/**
 * Acceptance test template for Webflow projects.
 * Claude: use this as a reference when generating tests from specs.
 * Replace FEATURE_SLUG, PAGE_PATH, and test bodies with real values.
 *
 * ── Playwright timing reference for Webflow projects ──
 *
 * These are typical wait times needed when testing Webflow staging sites.
 * Staging sites are slower than production due to Webflow's preview overhead.
 *
 * | What you're waiting for              | waitForTimeout value        |
 * |--------------------------------------|-----------------------------|
 * | Page load (networkidle)              | Built into goto, no extra   |
 * | Custom JS initialisation             | 1500-2000ms                 |
 * | GSAP animation to complete           | 1000-2000ms (depends)       |
 * | ScrollTrigger to fire after scroll   | 500-1000ms                  |
 * | Finsweet CMS Filter to process       | 800-1200ms                  |
 * | Finsweet CMS Load to render          | 1000-1500ms                 |
 * | Barba page transition                | 1500-2500ms                 |
 * | Lenis smooth scroll to settle        | 500-1000ms                  |
 * | Webflow interactions (IX2)           | 500-1500ms                  |
 *
 * When a test fails on timing:
 * 1. First try increasing the wait by 50%
 * 2. If still failing, use page.waitForSelector or page.waitForFunction
 *    instead of a fixed timeout — these are more reliable
 * 3. Example:
 *    await page.waitForFunction(() =>
 *      document.querySelector('.hero-title').style.opacity === '1',
 *      { timeout: 5000 }
 *    );
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL;

test.describe('FEATURE_SLUG acceptance', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the page this feature lives on
    await page.goto(`${STAGING_URL}/PAGE_PATH`, {
      waitUntil: 'domcontentloaded'
    });
    // Wait for GSAP, barba, Finsweet, and custom scripts to initialise
    await page.waitForTimeout(2000);
  });

  // --- PATTERN: Element visibility after interaction ---
  test('element becomes visible after scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1500); // allow GSAP animation to complete
    await expect(page.locator('.target-element')).toBeVisible();
  });

  // --- PATTERN: CSS class or style applied ---
  test('element has correct class after trigger', async ({ page }) => {
    await page.locator('.trigger-element').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.target-element')).toHaveClass(/is-active/);
  });

  // --- PATTERN: CMS filtering ---
  test('CMS filter reduces visible items', async ({ page }) => {
    const totalBefore = await page.locator('.cms-item').count();
    await page.locator('[data-filter="category-a"]').click();
    await page.waitForTimeout(1000); // allow Finsweet filter to process
    const totalAfter = await page.locator('.cms-item:visible').count();
    expect(totalAfter).toBeLessThan(totalBefore);
  });

  // --- PATTERN: No console errors ---
  test('page loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Re-navigate to capture errors from initial load
    await page.goto(`${STAGING_URL}/PAGE_PATH`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  // --- PATTERN: Animation respects reduced motion ---
  test('animation is disabled with prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${STAGING_URL}/PAGE_PATH`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    // Element should be in its final state immediately, not animated
    const opacity = await page.locator('.animated-element').evaluate(
      el => getComputedStyle(el).opacity
    );
    expect(opacity).toBe('1');
  });

  // --- PATTERN: Barba page transition ---
  test('page transition works without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Click an internal link to trigger barba transition
    await page.locator('a[href="/about"]').click();
    await page.waitForURL(`${STAGING_URL}/about`, { timeout: 5000 });
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
    await expect(page.locator('[data-barba="container"]')).toBeVisible();
  });

  // --- PATTERN: Responsive behaviour ---
  test('mobile nav is visible at mobile breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${STAGING_URL}/PAGE_PATH`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(1500);
    await expect(page.locator('.mobile-nav-trigger')).toBeVisible();
    await expect(page.locator('.desktop-nav')).not.toBeVisible();
  });
});
