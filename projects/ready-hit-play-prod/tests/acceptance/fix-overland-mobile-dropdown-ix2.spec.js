// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// -- Config ────────────────────────────────────────────────────
const SLUG = 'fix-overland-mobile-dropdown-ix2';
const PAGE_PATH = '/work/overland-ai';

// -- Helpers ───────────────────────────────────────────────────

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

// -- Elements ─────────────────────────────────────────────────

test.describe(`${SLUG} — Elements`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('dropdown toggle is present at mobile viewport', async ({ page }) => {
    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    await expect(toggle).toBeAttached();
    await expect(toggle).toBeVisible();
  });

  test('section_overland-import is present', async ({ page }) => {
    await expect(page.locator('.section_overland-import')).toBeAttached();
  });
});

// -- Console Errors ───────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no JS errors on direct page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after Barba transition', async ({ page }) => {
    const errors = collectErrors(page);
    // Start on home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);
    // Navigate to overland-ai via Barba
    await page.evaluate(() => window.barba?.go('/work/overland-ai'));
    await page.waitForTimeout(3000);
    await waitForRHP(page);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// -- Interactions ─────────────────────────────────────────────

test.describe(`${SLUG} — Interactions`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    // Scroll to the benefits section
    await page.evaluate(() => {
      const section = document.querySelector('.section_overland-import');
      if (section) section.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
  });

  test('dropdown opens with w--open class on click', async ({ page }) => {
    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    const list = page.locator('.benefits_dropdown-list-mobile').first();
    await toggle.click();
    await page.waitForTimeout(500);
    await expect(list).toHaveClass(/w--open/);
  });

  test('dropdown GSAP animation applies on open', async ({ page }) => {
    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    await toggle.click();
    await page.waitForTimeout(600); // 100ms delay + 300ms animation + buffer

    // Check logo colour turned orange
    const logoColor = await page.locator('.benefits_dropdown-mobile .key-benefits_logo').first()
      .evaluate(el => getComputedStyle(el).color);
    // rgb(243, 78, 12) — orange
    expect(logoColor).toContain('243');

    // Check toggle corners turned orange
    const cornerColor = await page.locator('.benefits_dropdown-mobile .benefits_dropdown-toggle-mobile .grid-corner').first()
      .evaluate(el => getComputedStyle(el).borderColor);
    expect(cornerColor).toContain('243');
  });

  test('dropdown GSAP animation resets on close', async ({ page }) => {
    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    // Open
    await toggle.click();
    await page.waitForTimeout(600);
    // Close
    await toggle.click();
    await page.waitForTimeout(500);

    // Check logo colour reset to teal
    const logoColor = await page.locator('.benefits_dropdown-mobile .key-benefits_logo').first()
      .evaluate(el => getComputedStyle(el).color);
    // rgb(98, 116, 111) — teal
    expect(logoColor).toContain('98');

    // Check list opacity is 0
    const listOpacity = await page.locator('.benefits_dropdown-list-mobile').first()
      .evaluate(el => getComputedStyle(el).opacity);
    expect(Number(listOpacity)).toBeLessThan(0.1);
  });
});

// -- Barba Lifecycle ──────────────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('navigate away and back: no errors, dropdowns still functional', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate away
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back
    await loadPage(page);

    // Scroll to section and test dropdown
    await page.evaluate(() => {
      const section = document.querySelector('.section_overland-import');
      if (section) section.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(1000);

    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    const list = page.locator('.benefits_dropdown-list-mobile').first();
    await toggle.click();
    await page.waitForTimeout(600);
    await expect(list).toHaveClass(/w--open/);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// -- Reduced Motion ───────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce'
  });

  test('dropdown content visible after open without animation', async ({ page }) => {
    await loadPage(page);
    await page.evaluate(() => {
      const section = document.querySelector('.section_overland-import');
      if (section) section.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(1000);

    const toggle = page.locator('.benefits_dropdown-toggle-mobile').first();
    await toggle.click();
    await page.waitForTimeout(300);

    const list = page.locator('.benefits_dropdown-list-mobile').first();
    const opacity = await list.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

// -- Accessibility ────────────────────────────────────────────

test.describe(`${SLUG} — Accessibility`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no WCAG 2.1 AA violations', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
