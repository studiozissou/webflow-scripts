// @ts-check
/**
 * Acceptance tests — rhp-about-swipers
 *
 * Two Swiper.js crossfade sliders on the RHP about page.
 * [data-slider] elements inside .section_about-hero (value "1" and "" per CMS).
 * Autoplay 4s, crossfade 750ms, pause on hover, swipe, no nav/pagination.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-swipers';
const PAGE_PATH = '/about';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${BASE}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(2000); // allow Swiper init + about content reveal
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Element presence */
test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('swiper containers are present', async ({ page }) => {
    await expect(page.locator('[data-slider="1"]')).toBeAttached();
    await expect(page.locator('.accordion-column.is-second [data-slider]')).toBeAttached();
  });

  test('swiper initialised on both sliders', async ({ page }) => {
    // Swiper adds .swiper-initialized to the container on init
    await expect(page.locator('[data-slider="1"].swiper-initialized')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('.accordion-column.is-second [data-slider].swiper-initialized')).toBeAttached({ timeout: 10_000 });
  });

  test('correct slide counts', async ({ page }) => {
    const slider1Slides = page.locator('[data-slider="1"] .swiper-slide');
    const slider2Slides = page.locator('.accordion-column.is-second [data-slider] .swiper-slide');
    // CMS slides — at least 3 and 2 respectively (loop may duplicate)
    expect(await slider1Slides.count()).toBeGreaterThanOrEqual(3);
    expect(await slider2Slides.count()).toBeGreaterThanOrEqual(2);
  });
});

/* 2. Autoplay */
test.describe(`${SLUG} — Autoplay`, () => {
  test('autoplay advances slide after delay', async ({ page }) => {
    await loadPage(page);

    // Get initial active slide index for slider 1
    const initialIndex = await page.evaluate(() => {
      const el = document.querySelector('[data-slider="1"]');
      return el?.swiper?.activeIndex ?? -1;
    });

    // Wait for autoplay (4s delay + 750ms transition + buffer)
    await page.waitForTimeout(5500);

    const newIndex = await page.evaluate(() => {
      const el = document.querySelector('[data-slider="1"]');
      return el?.swiper?.activeIndex ?? -1;
    });

    expect(newIndex).not.toBe(-1);
    expect(newIndex).not.toBe(initialIndex);
  });
});

/* 3. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('navigate away and back: swipers re-init, no errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Verify sliders initialised
    await expect(page.locator('[data-slider="1"].swiper-initialized')).toBeAttached({ timeout: 10_000 });

    // Navigate to home (triggers destroy)
    await page.goto(`${BASE}/`);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to about (triggers re-init)
    await loadPage(page);

    // Sliders should be re-initialised
    await expect(page.locator('[data-slider="1"].swiper-initialized')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('.accordion-column.is-second [data-slider].swiper-initialized')).toBeAttached({ timeout: 10_000 });

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('no autoplay with reduced motion', async ({ page }) => {
    await loadPage(page);

    const initialIndex = await page.evaluate(() => {
      const el = document.querySelector('[data-slider="1"]');
      return el?.swiper?.activeIndex ?? -1;
    });

    // Wait longer than autoplay delay
    await page.waitForTimeout(5500);

    const newIndex = await page.evaluate(() => {
      const el = document.querySelector('[data-slider="1"]');
      return el?.swiper?.activeIndex ?? -1;
    });

    // Index should NOT have changed (no autoplay)
    expect(newIndex).toBe(initialIndex);
  });

  test('first slide is visible', async ({ page }) => {
    await loadPage(page);
    const firstSlide = page.locator('[data-slider="1"] .swiper-slide').first();
    const opacity = await firstSlide.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

/* 6. Max height constraint */
test.describe(`${SLUG} — Layout`, () => {
  test('slider max-height within viewport', async ({ page }) => {
    await loadPage(page);
    const result = await page.evaluate(() => {
      const slider = document.querySelector('[data-slider="1"]');
      if (!slider) return { sliderHeight: 0, viewportHeight: 0 };
      return {
        sliderHeight: slider.getBoundingClientRect().height,
        viewportHeight: window.innerHeight
      };
    });
    expect(result.sliderHeight).toBeLessThanOrEqual(result.viewportHeight);
  });
});

/* 7. Accessibility */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on slider region', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .include('.accordion-wrapper')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
