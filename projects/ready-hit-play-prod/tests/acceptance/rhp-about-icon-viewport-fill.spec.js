// @ts-check
/**
 * Acceptance tests — About Icon Viewport Fill (rhp-about-icon-viewport-fill)
 *
 * Verifies that .icon-embed-r on the about page is dynamically sized
 * to fill remaining viewport height after .about_header, 4x .accordion-title,
 * and 5vw section padding are accounted for.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-icon-viewport-fill';
const PAGE_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${process.env.STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. CSS custom property set */
test.describe(`${SLUG} — CSS Variable`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('CSS var --icon-max-height is set on section', async ({ page }) => {
    const value = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return null;
      return section.style.getPropertyValue('--icon-max-height');
    });
    expect(value).toBeTruthy();
    expect(value).toMatch(/^\d+(\.\d+)?px$/);
    // Value should be positive
    const px = parseFloat(value);
    expect(px).toBeGreaterThan(0);
  });
});

/* 2. Icon visibility */
test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('.icon-embed-r is visible within viewport', async ({ page }) => {
    const icon = page.locator('.section_about-hero .icon-embed-r').first();
    await expect(icon).toBeVisible();

    // Check icon is within viewport bounds
    const box = await icon.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toBeTruthy();
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 5); // 5px tolerance
  });
});

/* 3. Module registration */
test.describe(`${SLUG} — Module`, () => {
  test('RHP.aboutIconScale module is registered', async ({ page }) => {
    await loadPage(page);
    const moduleInfo = await page.evaluate(() => ({
      exists: typeof window.RHP?.aboutIconScale !== 'undefined',
      hasVersion: typeof window.RHP?.aboutIconScale?.version === 'string',
      hasInit: typeof window.RHP?.aboutIconScale?.init === 'function',
      hasDestroy: typeof window.RHP?.aboutIconScale?.destroy === 'function',
      hasMeasure: typeof window.RHP?.aboutIconScale?.measure === 'function'
    }));
    expect(moduleInfo.exists).toBe(true);
    expect(moduleInfo.hasVersion).toBe(true);
    expect(moduleInfo.hasInit).toBe(true);
    expect(moduleInfo.hasDestroy).toBe(true);
    expect(moduleInfo.hasMeasure).toBe(true);
  });
});

/* 4. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('Barba re-entry: home to about to home to about', async ({ page }) => {
    const errors = collectErrors(page);

    // Load about page
    await loadPage(page);

    // Navigate to home (triggers destroy)
    await page.goto(`${process.env.STAGING_URL}/`);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to about (triggers re-init)
    await loadPage(page);

    // CSS var should be set again
    const value = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return null;
      return section.style.getPropertyValue('--icon-max-height');
    });
    expect(value).toBeTruthy();
    expect(value).toMatch(/^\d+(\.\d+)?px$/);

    // Icon should be visible
    const icon = page.locator('.section_about-hero .icon-embed-r').first();
    await expect(icon).toBeVisible();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 6. Responsive */
test.describe(`${SLUG} — Responsive`, () => {
  test('mobile 375px: CSS var set and icon visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);

    const value = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return null;
      return section.style.getPropertyValue('--icon-max-height');
    });
    expect(value).toBeTruthy();
    const px = parseFloat(value);
    expect(px).toBeGreaterThan(0);

    const icon = page.locator('.section_about-hero .icon-embed-r').first();
    await expect(icon).toBeVisible();
  });
});

/* 7. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('icon visible with reduced motion', async ({ page }) => {
    await loadPage(page);
    const icon = page.locator('.section_about-hero .icon-embed-r').first();
    await expect(icon).toBeVisible();

    const value = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return null;
      return section.style.getPropertyValue('--icon-max-height');
    });
    expect(value).toBeTruthy();
  });
});
