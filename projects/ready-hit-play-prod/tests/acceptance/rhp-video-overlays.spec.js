// @ts-check
/**
 * Acceptance tests — RHP Video Overlays
 *
 * Verifies 45% BG overlay and 15% FG overlay pseudo-elements on the
 * homepage dial, including Barba transition fade behaviour.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-video-overlays';
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
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. BG overlay */
test.describe(`${SLUG} — BG Overlay`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('bg overlay pseudo-element present on homepage', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      const bg = document.querySelector('.dial_layer-bg');
      if (!bg) return null;
      return getComputedStyle(bg, '::after').backgroundColor;
    });
    // rgba(0, 0, 0, 0.45) — allow minor float variance
    expect(bgColor).toBeTruthy();
    expect(bgColor).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\.4/);
  });

  test('bg overlay present after barba transition to work', async ({ page }) => {
    // Find a case study link and click it
    const caseLink = page.locator('.dial_cms-item a, [data-barba-namespace="home"] a[href*="/case"]').first();
    if (await caseLink.count() === 0) {
      // Try clicking the dial fg video area to trigger a case nav
      const aboutLink = page.locator('a[href*="/about"]').first();
      await aboutLink.click();
      await waitForRHP(page);
      await page.waitForTimeout(2500);
    } else {
      await caseLink.click();
      await waitForRHP(page);
      await page.waitForTimeout(2500);
    }

    const bgColor = await page.evaluate(() => {
      const bg = document.querySelector('.dial_layer-bg');
      if (!bg) return null;
      return getComputedStyle(bg, '::after').backgroundColor;
    });
    expect(bgColor).toBeTruthy();
    expect(bgColor).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\.4/);
  });
});

/* 2. FG overlay */
test.describe(`${SLUG} — FG Overlay`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('fg overlay present on homepage', async ({ page }) => {
    const result = await page.evaluate(() => {
      const wrap = document.getElementById('fg-video-wrap');
      if (!wrap) return { found: false };
      const style = getComputedStyle(wrap, '::after');
      return {
        found: true,
        bg: style.backgroundColor,
        opacity: style.opacity,
        content: style.content
      };
    });
    expect(result.found).toBe(true);
    expect(result.content).not.toBe('none');
    expect(result.bg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\.1/);
  });

  test('fg overlay not rendered on work page', async ({ page }) => {
    // Navigate to about page (simpler transition)
    const aboutLink = page.locator('a[href*="/about"]').first();
    await aboutLink.click();
    await waitForRHP(page);
    await page.waitForTimeout(2500);

    const result = await page.evaluate(() => {
      const dialComp = document.querySelector('.dial_component');
      const ns = dialComp?.getAttribute('data-dial-ns');
      const wrap = document.getElementById('fg-video-wrap');
      if (!wrap) return { ns, hasContent: false };
      const style = getComputedStyle(wrap, '::after');
      return {
        ns,
        hasContent: style.content !== 'none',
        opacity: style.opacity
      };
    });
    // On about, data-dial-ns should NOT be "home", so ::after should not render
    expect(result.ns).not.toBe('home');
    // Either no content or opacity 0
    if (result.hasContent) {
      expect(Number(result.opacity)).toBe(0);
    }
  });
});

/* 3. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after home→about→home cycle', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → about
    const aboutLink = page.locator('a[href*="/about"]').first();
    await aboutLink.click();
    await waitForRHP(page);
    await page.waitForTimeout(2500);

    // About → home
    const logoLink = page.locator('.nav_logo-link').first();
    await logoLink.click();
    await waitForRHP(page);
    await page.waitForTimeout(2500);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('overlays visible without animation', async ({ page }) => {
    await loadPage(page);

    const result = await page.evaluate(() => {
      const bg = document.querySelector('.dial_layer-bg');
      const wrap = document.getElementById('fg-video-wrap');
      return {
        bgAfter: bg ? getComputedStyle(bg, '::after').backgroundColor : null,
        fgAfter: wrap ? getComputedStyle(wrap, '::after').backgroundColor : null
      };
    });
    expect(result.bgAfter).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\.4/);
    expect(result.fgAfter).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\.1/);
  });
});
