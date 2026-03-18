// @ts-check
/**
 * Acceptance tests — RHP Mobile: Homepage & Work/Case Pages
 * Spec: .claude/specs/rhp-mobile-home-work.md
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-mobile-home-work';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(2000); // intro + GSAP settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── 1. Homepage mobile — elements & sizing ────────────────────

test.describe(`${SLUG} — Homepage Mobile Elements`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('no JS errors at 390px', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('dial is >= 300px wide at 390px viewport', async ({ page }) => {
    const width = await page.locator('.dial_layer-fg').evaluate(
      el => el.getBoundingClientRect().width
    );
    expect(width).toBeGreaterThanOrEqual(300);
  });

  test('white dot indicator visible on mobile', async ({ page }) => {
    await expect(page.locator('.dial_sector-dot')).toBeVisible();
  });
});

// ── 2. White dot hidden on desktop ────────────────────────────

test.describe(`${SLUG} — Desktop White Dot`, () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('white dot hidden at 1280px', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator('.dial_sector-dot')).not.toBeVisible();
  });
});

// ── 3. Case page mobile layout ────────────────────────────────

test.describe(`${SLUG} — Case Page Mobile`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no JS errors on case page at 390px', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/work/overland-ai');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('bottom nav hidden on case page mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    await expect(page.locator('.dial_layer-ui')).not.toBeVisible();
  });

  test('case container is full width on mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const width = await page.locator('.dial_layer-fg').evaluate(
      el => el.getBoundingClientRect().width
    );
    expect(width).toBeGreaterThanOrEqual(380);
  });
});

// ── 4. Barba transition at mobile viewport ────────────────────

test.describe(`${SLUG} — Barba Mobile`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('home → case transition: no errors at 390px', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to case page via Barba
    const projectLink = page.locator('.dial_project-info a, .dial_project-info').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForTimeout(3000); // Barba transition
      await waitForRHP(page);
    }

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 5. Reduced motion ─────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });

  test('dial and dot visible with reduced motion', async ({ page }) => {
    await loadPage(page);
    const dialFg = page.locator('.dial_layer-fg');
    const opacity = await dialFg.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

// ── 6. Accessibility ──────────────────────────────────────────

test.describe(`${SLUG} — Accessibility`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no WCAG 2.1 AA violations at 390px', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.w-webflow-badge') // Webflow badge — not our code
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
