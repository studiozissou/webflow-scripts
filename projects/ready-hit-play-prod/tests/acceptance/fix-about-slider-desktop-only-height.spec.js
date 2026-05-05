// @ts-check
/**
 * Acceptance tests — fix-about-slider-desktop-only-height
 *
 * Verifies: slider height JS only fires on desktop (>991px),
 * auto height on tablet/mobile, pauseOnMouseEnter removed.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-about-slider-desktop-only-height';
const PAGE_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

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

/* 1. Desktop: JS-set height present */
test.describe(`${SLUG} — Desktop Height`, () => {
  test('slider has JS-set --slide-max-height on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const hasVar = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return false;
      return section.style.getPropertyValue('--slide-max-height') !== '';
    });
    expect(hasVar).toBe(true);
  });

  test('slider computed height is not auto on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const height = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider) return '0';
      return getComputedStyle(slider).height;
    });
    expect(height).not.toBe('auto');
    expect(parseInt(height, 10)).toBeGreaterThan(100);
  });
});

/* 2. Tablet: auto height, no JS vars */
test.describe(`${SLUG} — Tablet Auto Height`, () => {
  test('no --slide-max-height on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loadPage(page);

    const hasVar = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return false;
      return section.style.getPropertyValue('--slide-max-height') !== '';
    });
    expect(hasVar).toBe(false);
  });

  test('slider content visible and not collapsed on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loadPage(page);

    const height = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider) return 0;
      return slider.getBoundingClientRect().height;
    });
    expect(height).toBeGreaterThan(50);
  });
});

/* 3. Mobile: auto height */
test.describe(`${SLUG} — Mobile Auto Height`, () => {
  test('slider content visible and not collapsed on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);

    const height = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider) return 0;
      return slider.getBoundingClientRect().height;
    });
    expect(height).toBeGreaterThan(50);
  });
});

/* 4. Pause on hover removed */
test.describe(`${SLUG} — No Pause on Hover`, () => {
  test('autoplay does not pause on mouse enter', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    // Get initial active slide index
    const initialIndex = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider?.swiper) return -1;
      return slider.swiper.activeIndex;
    });

    // Hover over the slider
    const slider = page.locator('.section_about-hero [data-slider]').first();
    await slider.hover();

    // Wait for autoplay cycle (delay is 4000ms + 750ms transition)
    await page.waitForTimeout(5500);

    // Check slide advanced despite hover
    const newIndex = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider?.swiper) return -1;
      return slider.swiper.activeIndex;
    });

    expect(newIndex).not.toBe(initialIndex);
  });
});

/* 5. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 6. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('no autoplay with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const hasAutoplay = await page.evaluate(() => {
      const slider = document.querySelector('.section_about-hero [data-slider]');
      if (!slider?.swiper) return false;
      return slider.swiper.autoplay?.running === true;
    });
    expect(hasAutoplay).toBe(false);
  });
});

/* 7. Barba re-entry */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('home → about → home → about: clean re-init, no errors', async ({ page }) => {
    const errors = collectErrors(page);

    // First visit to about
    await loadPage(page);

    // Navigate to home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to about
    await loadPage(page);

    // Slider should still work
    const sliderCount = await page.locator('.section_about-hero [data-slider]').count();
    expect(sliderCount).toBeGreaterThan(0);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
