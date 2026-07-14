/**
 * Carsa Code Migration — Acceptance Tests
 *
 * Baseline tests for each page BEFORE and AFTER migration.
 * Tests added incrementally as each page is migrated.
 * Phase 1: Homepage first, then remaining pages in priority order.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const BASE = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(2000); // Finsweet + GSAP init
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Homepage ──────────────────────────────────────────────────

test.describe('carsa-code-migration — Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/');
  });

  test('homepage-no-errors: zero JS console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.waitForTimeout(2000);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('homepage-make-dropdown: make dropdown populates with options', async ({ page }) => {
    const options = page.locator('select[name="make"] option, [name="make"] .w-dropdown-link');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('homepage-search-button: search submit button present', async ({ page }) => {
    const btn = page.locator('#search-submit, #search-instant, [data-element="search-submit"]');
    await expect(btn.first()).toBeAttached();
  });

  test('homepage-price-tabs: price tab elements present', async ({ page }) => {
    const monthly = page.locator('#price-monthly-tab');
    const full = page.locator('#price-full-tab');
    const monthlyCount = await monthly.count();
    const fullCount = await full.count();
    expect(monthlyCount + fullCount).toBeGreaterThan(0);
  });

  test('homepage-px-form: PX form links contain quote.carsa.co.uk', async ({ page }) => {
    const pxLinks = page.locator('#px-form-large a, #px-form-small a, [data-link="px"] a');
    const count = await pxLinks.count();
    if (count > 0) {
      const href = await pxLinks.first().getAttribute('href');
      expect(href).toContain('quote.carsa.co.uk');
    }
  });

  test('homepage-equal-height: equal-height card containers present', async ({ page }) => {
    const cards = page.locator('[data-card-height="equal"]');
    await expect(cards.first()).toBeAttached();
  });

  test('homepage-svg-draw-line: SVG draw-line containers present', async ({ page }) => {
    const lines = page.locator('[data-svg="draw-line"]');
    await expect(lines.first()).toBeAttached();
  });

  test('homepage-svg-draw-shape: SVG draw-shape containers present', async ({ page }) => {
    const shapes = page.locator('[data-svg="draw-shape"]');
    await expect(shapes.first()).toBeAttached();
  });

  test('homepage-valuation-links: valuation links present', async ({ page }) => {
    const links = page.locator('[data-link="valuation"]');
    await expect(links.first()).toBeAttached();
  });

  test('homepage-mobile: key elements visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });
});

// ── Generic per-page tests (added as pages are migrated) ──────

/**
 * After migration, add a describe block per page with:
 * - {page}-no-errors
 * - {page}-cdn-loaded (check for script[src*="cdn.jsdelivr.net"])
 * - {page}-specific feature tests
 */
