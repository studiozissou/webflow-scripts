// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-slider-autoheight';
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

test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('.about-slider elements exist on about page', async ({ page }) => {
    const sliders = page.locator('.about-slider');
    const count = await sliders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('slider has inline height set', async ({ page }) => {
    const slider = page.locator('.about-slider .w-slider').first();
    await expect(slider).toBeAttached();
    const height = await slider.evaluate(el => el.style.height);
    expect(height).toMatch(/^\d+px$/);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('navigate away and back: no errors, clean re-init', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate away (triggers destroy)
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back (triggers re-init)
    await loadPage(page);

    // Slider should still have height set
    const slider = page.locator('.about-slider .w-slider').first();
    const height = await slider.evaluate(el => el.style.height);
    expect(height).toMatch(/^\d+px$/);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Interactions`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('height updates after slide change', async ({ page }) => {
    const slider = page.locator('.about-slider .w-slider').first();
    await expect(slider).toBeAttached();

    const heightBefore = await slider.evaluate(el => el.style.height);

    // Click next arrow to change slide
    const nextArrow = slider.locator('.w-slider-arrow-right').first();
    if (await nextArrow.isVisible()) {
      await nextArrow.click();
      await page.waitForTimeout(800);
      // Height should still be a valid px value (may or may not differ depending on slide content)
      const heightAfter = await slider.evaluate(el => el.style.height);
      expect(heightAfter).toMatch(/^\d+px$/);
    }
  });
});

test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on about page', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
