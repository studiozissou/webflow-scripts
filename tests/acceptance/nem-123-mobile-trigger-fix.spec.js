/**
 * Acceptance tests — nem-123-mobile-trigger-fix
 *
 * Validates mobile trigger timing for 123 cards and wat-als sections,
 * plus the wat-als desktop rewrite to match the 123 cards pattern.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'nem-123-mobile-trigger-fix';
const BASE = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const PAGE_PATH = '/';

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${BASE}${path}`);
  await waitForReady(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/* ── Mobile: 123 cards ─────────────────────────────────────── */
test.describe(`${SLUG} — 123 cards mobile`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('cards start dimmed (opacity ~0.25)', async ({ page }) => {
    await loadPage(page);
    const cards = page.locator('.method-cars_wrap > *');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const opacity = await cards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeLessThanOrEqual(0.35);
    }
  });

  test('card brightens after scrolling fully into view', async ({ page }) => {
    await loadPage(page);
    const firstCard = page.locator('.method-cars_wrap > *').first();

    // Scroll until the card's bottom edge is in the viewport
    await firstCard.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const scrollTarget = window.scrollY + rect.bottom - window.innerHeight + 50;
      window.scrollTo(0, scrollTarget);
    });
    await page.waitForTimeout(1500);

    const opacity = await firstCard.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThanOrEqual(0.9);
  });
});

/* ── Mobile: wat-als ───────────────────────────────────────── */
test.describe(`${SLUG} — wat-als mobile`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('cards start dimmed (opacity ~0.25)', async ({ page }) => {
    await loadPage(page);
    const cards = page.locator('[data-animate="wat-als"] .pain-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const opacity = await cards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeLessThanOrEqual(0.35);
    }
  });

  test('card brightens after scrolling fully into view', async ({ page }) => {
    await loadPage(page);
    const firstCard = page.locator('[data-animate="wat-als"] .pain-card').first();

    await firstCard.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const scrollTarget = window.scrollY + rect.bottom - window.innerHeight + 50;
      window.scrollTo(0, scrollTarget);
    });
    await page.waitForTimeout(1500);

    const opacity = await firstCard.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThanOrEqual(0.9);
  });
});

/* ── Desktop: wat-als ──────────────────────────────────────── */
test.describe(`${SLUG} — wat-als desktop`, () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('cards start hidden (opacity ~0)', async ({ page }) => {
    await loadPage(page);
    const cards = page.locator('[data-animate="wat-als"] .pain-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const opacity = await cards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeLessThanOrEqual(0.1);
    }
  });

  test('cards reveal after scroll trigger', async ({ page }) => {
    await loadPage(page);
    const wrap = page.locator('[data-animate="wat-als"]');

    await wrap.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    // Wait for stagger: 3 cards × 1.5s + 1.2s duration
    await page.waitForTimeout(5500);

    const cards = page.locator('[data-animate="wat-als"] .pain-card');
    for (let i = 0; i < Math.min(await cards.count(), 3); i++) {
      const opacity = await cards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('no hover interaction changes opacity', async ({ page }) => {
    await loadPage(page);
    const wrap = page.locator('[data-animate="wat-als"]');

    // Scroll to trigger reveal
    await wrap.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(5500);

    const firstCard = page.locator('[data-animate="wat-als"] .pain-card').first();
    const opacityBefore = await firstCard.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );

    await firstCard.hover();
    await page.waitForTimeout(500);

    const opacityAfter = await firstCard.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );

    expect(opacityAfter).toBeCloseTo(opacityBefore, 1);
  });
});

/* ── Reduced motion ────────────────────────────────────────── */
test.describe(`${SLUG} — reduced motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('all cards fully visible without animation', async ({ page }) => {
    await loadPage(page);

    // 123 cards
    const methodCards = page.locator('.method-cars_wrap > *');
    for (let i = 0; i < Math.min(await methodCards.count(), 3); i++) {
      const opacity = await methodCards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeGreaterThanOrEqual(0.9);
    }

    // wat-als cards
    const painCards = page.locator('[data-animate="wat-als"] .pain-card');
    for (let i = 0; i < Math.min(await painCards.count(), 3); i++) {
      const opacity = await painCards.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeGreaterThanOrEqual(0.9);
    }
  });
});

/* ── Console errors ────────────────────────────────────────── */
test.describe(`${SLUG} — console errors`, () => {
  test('no JS errors on home page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
