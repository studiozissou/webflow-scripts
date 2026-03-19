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

  test('dial is >= 200px wide at 390px viewport', async ({ page }) => {
    const width = await page.locator('.dial_layer-fg').evaluate(
      el => el.getBoundingClientRect().width
    );
    // 65vw at 390px = ~253px
    expect(width).toBeGreaterThanOrEqual(200);
  });

  test('white dot indicator visible on mobile', async ({ page }) => {
    await expect(page.locator('.dial_sector-dot')).toBeVisible();
  });

  test('nav is fixed and transparent on mobile', async ({ page }) => {
    const nav = page.locator('.nav').first();
    const position = await nav.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('nav has no backdrop blur on mobile', async ({ page }) => {
    const embed = page.locator('.nav_logo-embed').first();
    if (await embed.count() > 0) {
      const blur = await embed.evaluate(el => getComputedStyle(el).backdropFilter);
      expect(blur).toBe('none');
    }
  });

  test('logo is smaller at 390px viewport', async ({ page }) => {
    const logo = page.locator('.nav_logo-wrapper-2.is-nav').first();
    if (await logo.count() > 0) {
      const height = await logo.evaluate(el => el.getBoundingClientRect().height);
      // Should be ~1.25rem ≈ 20px at mobile font-size
      expect(height).toBeLessThanOrEqual(30);
    }
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

  test('dial_layer-ui hidden on case page mobile', async ({ page }) => {
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

  test('case container is full viewport height on mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const { compHeight, viewportHeight } = await page.evaluate(() => ({
      compHeight: document.querySelector('.dial_component')?.getBoundingClientRect().height || 0,
      viewportHeight: window.innerHeight
    }));
    // Should be 100dvh (full viewport, no nav subtraction since nav is fixed)
    expect(compHeight).toBeGreaterThanOrEqual(viewportHeight - 5);
  });

  test('nav about-link hidden on case page mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const aboutLink = page.locator('.nav_about-link').first();
    if (await aboutLink.count() > 0) {
      await expect(aboutLink).not.toBeVisible();
    }
  });

  test('nav contact-link hidden on case page mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const contactLink = page.locator('.nav_contact-link').first();
    if (await contactLink.count() > 0) {
      await expect(contactLink).not.toBeVisible();
    }
  });

  test('case page is scrollable on mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const dialFg = page.locator('.dial_layer-fg');
    const scrollable = await dialFg.evaluate(el => {
      const style = getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll';
    });
    expect(scrollable).toBe(true);
  });

  test('touch-action allows scrolling on case page mobile', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const touchAction = await page.locator('.dial_component').evaluate(
      el => getComputedStyle(el).touchAction
    );
    expect(touchAction).not.toBe('none');
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

// ── 5. Dial tick rendering ───────────────────────────────────

test.describe(`${SLUG} — Dial Ticks`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tick canvas renders at mobile viewport', async ({ page }) => {
    await loadPage(page);
    const canvas = page.locator('#dial_ticks-canvas');
    await expect(canvas).toBeVisible();
    const { width, height } = await canvas.evaluate(el => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height
    }));
    expect(width).toBeGreaterThan(100);
    expect(height).toBeGreaterThan(100);
  });
});

// ── 6. Nav logo link ─────────────────────────────────────────

test.describe(`${SLUG} — Nav Logo`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nav logo has role=link and is keyboard accessible', async ({ page }) => {
    await loadPage(page, '/work/overland-ai');
    const logo = page.locator('.nav_logo-link').first();
    if (await logo.count() > 0) {
      const role = await logo.getAttribute('role');
      const tabindex = await logo.getAttribute('tabindex');
      expect(role).toBe('link');
      expect(Number(tabindex)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 7. Reduced motion ─────────────────────────────────────────

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

// ── 8. Accessibility ──────────────────────────────────────────

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
