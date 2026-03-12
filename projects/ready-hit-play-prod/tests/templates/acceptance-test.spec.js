// @ts-check
/**
 * Acceptance-test template — Ready Hit Play (RHP).
 *
 * Project-specific override of .claude/templates/acceptance-test.spec.js.
 * Uses CommonJS (RHP package.json "type": "commonjs"), waitForRHP helper,
 * and @axe-core/playwright (installed in devDependencies).
 *
 * Claude: use this template (not the generic one) when generating acceptance
 * tests for ready-hit-play-prod features. Replace FEATURE_SLUG, PAGE_PATH,
 * and test bodies with real values. Delete pattern sections that don't apply.
 *
 * ── Playwright timing reference for RHP ──
 *
 * | What you're waiting for              | waitForTimeout value        |
 * |--------------------------------------|-----------------------------|
 * | Page load (domcontentloaded)         | Built into goto, no extra   |
 * | RHP scripts initialised              | waitForRHP helper (20 s)    |
 * | GSAP animation to complete           | 1000–2000 ms                |
 * | ScrollTrigger to fire after scroll   | 500–1000 ms                 |
 * | Barba page transition                | 1500–2500 ms                |
 * | Lenis smooth scroll to settle        | 500–1000 ms                 |
 * | Work dial sector change              | 500–1000 ms                 |
 * | About transition (overlay + morph)   | 1500–2500 ms                |
 *
 * When a test fails on timing:
 * 1. Increase the wait by 50 %
 * 2. If still failing, use page.waitForFunction instead of a fixed timeout
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'FEATURE_SLUG';          // matches spec filename
const PAGE_PATH = '/';                 // page under test (relative)

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Navigate to the feature page and wait for RHP init. */
async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // allow GSAP / init settle
}

/** Attach a pageerror listener and return the errors array. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Element presence & visibility */
test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('key element is present', async ({ page }) => {
    await expect(page.locator('.your-selector')).toBeAttached();
  });

  test('key element is visible', async ({ page }) => {
    await expect(page.locator('.your-selector')).toBeVisible();
  });
});

/* 2. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 3. CSS class / style applied after interaction */
test.describe(`${SLUG} — Interactions`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('element has correct class after trigger', async ({ page }) => {
    await page.locator('.trigger-element').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.target-element')).toHaveClass(/is-active/);
  });

  test('element becomes visible after scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1500);
    await expect(page.locator('.target-element')).toBeVisible();
  });
});

/* 4. Barba page transition lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('no JS errors on page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('navigate away and back: no errors, clean re-init', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate away (triggers destroy)
    await page.goto('/');
    await waitForRHP(page);

    // Navigate back (triggers re-init)
    await loadPage(page);

    // No orphaned / duplicated DOM nodes
    const count = await page.locator('.your-selector').count();
    expect(count).toBe(1);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. prefers-reduced-motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content is visible without animation', async ({ page }) => {
    await loadPage(page);
    const el = page.locator('.animated-element');
    const opacity = await el.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

/* 6. Accessibility (axe-core WCAG 2.1 AA) */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});

/* 7. Responsive behaviour */
test.describe(`${SLUG} — Responsive`, () => {
  test('mobile layout at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    await expect(page.locator('.mobile-element')).toBeVisible();
    await expect(page.locator('.desktop-only-element')).not.toBeVisible();
  });
});
