// @ts-check
/**
 * Acceptance tests — rhp-home-intro-scroll-morph
 *
 * Covers:
 *   - Fresh-load intro section + small dial
 *   - 100vh scroll-driven morph to dial-large + logo reparent
 *   - Scroll lock after morph complete
 *   - Barba re-entry skips intro
 *   - Home↔About slide transitions (power3.out, 0.75s)
 *   - Dial returns to IDLE on about→home
 *   - Nav logo click replays intro
 *   - Reduced motion fast-path
 *   - Mobile 375px
 *   - No console errors
 *   - axe-core WCAG 2.1 AA soft assertion
 *
 * Spec: .claude/specs/rhp-home-intro-scroll-morph.md
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-home-intro-scroll-morph';
const HOME_PATH = '/';
const ABOUT_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadHome(page) {
  await page.goto(HOME_PATH);
  await waitForRHP(page);
  // Allow home-intro sequence (step text, dial ticks, video fade, nav) to settle.
  await page.waitForTimeout(2500);
}

async function scrollMorph(page) {
  // Scroll a full viewport to drive the ScrollTrigger scrub timeline.
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight, behavior: 'auto' });
  });
  // Wait for the morph-complete event or the flag to flip.
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 5_000 }
  ).catch(() => { /* reduced-motion paths may skip event */ });
  await page.waitForTimeout(800);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── 1. Fresh-load intro state ─────────────────────────────────
test.describe(`${SLUG} — Fresh load`, () => {
  test('intro section visible with small dial and logo in slot', async ({ page }) => {
    await loadHome(page);

    // Intro section present and visible
    const intro = page.locator('.section_home-intro');
    await expect(intro).toBeAttached();
    await expect(intro).toBeVisible();

    // Logo is inside the intro slot
    const introLogo = page.locator('.home-intro_logo-slot .nav_logo-wrapper-2.is-nav');
    await expect(introLogo).toBeVisible();

    // Dial is rendered at the small size (width < large threshold)
    const dialWidth = await page.locator('.dial_component[data-dial-ns="home"]').evaluate(
      (el) => el.getBoundingClientRect().width
    );
    expect(dialWidth).toBeLessThan(500); // small dial is ~6rem–15rem range; large is >~400–600px
  });

  test('homeScrollMorph is initialised and not complete', async ({ page }) => {
    await loadHome(page);
    const state = await page.evaluate(() => ({
      hasModule: !!window.RHP?.homeScrollMorph,
      complete: window.RHP?.homeScrollMorph?.complete === true
    }));
    expect(state.hasModule).toBe(true);
    expect(state.complete).toBe(false);
  });
});

// ── 2. Scroll morph ───────────────────────────────────────────
test.describe(`${SLUG} — Scroll morph`, () => {
  test('scrolling 100vh completes morph and reparents logo to nav', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // Logo is now inside the nav
    const navLogo = page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav');
    await expect(navLogo).toBeVisible();

    // Intro logo slot no longer contains the logo
    const introSlotLogoCount = await page.locator('.home-intro_logo-slot .nav_logo-wrapper-2.is-nav').count();
    expect(introSlotLogoCount).toBe(0);
  });

  test('intro section is hidden after morph', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    const display = await page.locator('.section_home-intro').evaluate(
      (el) => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('dial reaches large size after morph', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    const dialWidth = await page.locator('.dial_component[data-dial-ns="home"]').evaluate(
      (el) => el.getBoundingClientRect().width
    );
    // Large dial should be significantly bigger than small; guard on ≥ 300px
    expect(dialWidth).toBeGreaterThan(300);
  });

  test('scroll is locked after morph complete', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.scrollY);
    // Scroll lock keeps scrollY at or very near the morph-end position
    expect(Math.abs(after - before)).toBeLessThan(5);
  });
});

// ── 3. Console errors ─────────────────────────────────────────
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors across intro + morph flow', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await scrollMorph(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 4. Barba lifecycle ────────────────────────────────────────
test.describe(`${SLUG} — Barba lifecycle`, () => {
  test('home → about: About container slides in from left', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await scrollMorph(page);

    await page.locator('a[href="/about"], a[href*="/about"]').first().click();
    // Slide is 0.75s + Barba afterEnter — give it a generous window.
    await page.waitForTimeout(1800);

    const aboutContainer = page.locator('[data-barba-namespace="about"]');
    await expect(aboutContainer).toBeVisible();

    // After the slide, xPercent should be 0 (fully on-screen)
    const bbox = await aboutContainer.boundingBox();
    expect(bbox?.x ?? -9999).toBeGreaterThanOrEqual(-5);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('about → home: slides out and home lands in dial-large (skip intro)', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(ABOUT_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    await page.locator('a.nav_logo-link, a[href="/"]').first().click();
    await page.waitForTimeout(1800);

    // Intro section should NOT be visible after Barba re-entry
    const introCount = await page.locator('.section_home-intro:visible').count();
    expect(introCount).toBe(0);

    // homeScrollMorph.complete should be true (skipToEnd fired)
    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // Nav logo must be inside the nav
    await expect(page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav')).toBeVisible();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('home → about → home: no duplicate logo, no orphaned intro section', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    // Home → About
    await page.locator('a[href="/about"], a[href*="/about"]').first().click();
    await page.waitForTimeout(1800);

    // About → Home
    await page.locator('a.nav_logo-link, a[href="/"]').first().click();
    await page.waitForTimeout(1800);

    // Exactly one logo wrapper in the DOM tree that lives inside nav
    const navLogoCount = await page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav').count();
    expect(navLogoCount).toBe(1);

    // Intro section is either absent or hidden
    const visibleIntro = await page.locator('.section_home-intro:visible').count();
    expect(visibleIntro).toBe(0);
  });
});

// ── 5. Nav logo replay ────────────────────────────────────────
test.describe(`${SLUG} — Nav logo replay`, () => {
  test('clicking nav logo on home replays morph in reverse', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    // Confirm we're in dial-large state
    let complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // Click the nav logo (same-page, not a navigation)
    await page.locator('.nav_logo-link').first().click();
    // Replay: smooth scroll to top + reverse timeline. Give it >1s.
    await page.waitForTimeout(1800);

    // Intro section should be visible again
    await expect(page.locator('.section_home-intro')).toBeVisible();

    // Flag should flip back to false
    complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(false);

    // Logo should be back in the intro slot
    await expect(page.locator('.home-intro_logo-slot .nav_logo-wrapper-2.is-nav')).toBeVisible();
  });
});

// ── 6. Reduced motion ─────────────────────────────────────────
test.describe(`${SLUG} — Reduced motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('intro completes and morph jump-cuts with no errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);

    // In reduced motion, intro fast-forwards; homeIntro.done should flip quickly.
    await page.waitForFunction(
      () => window.RHP?.homeIntro?.done === true,
      { timeout: 5_000 }
    ).catch(() => { /* tolerate if module uses a different flag */ });

    await scrollMorph(page);
    await page.waitForTimeout(500);

    // Content (logo in nav) must be visible
    await expect(page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav')).toBeVisible();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 7. Mobile responsive ──────────────────────────────────────
test.describe(`${SLUG} — Mobile 375px`, () => {
  test('intro + scroll morph work at 375×812', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await loadHome(page);

    await expect(page.locator('.section_home-intro')).toBeVisible();

    await scrollMorph(page);

    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // Logo ends up in nav
    await expect(page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav')).toBeVisible();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 8. Accessibility ──────────────────────────────────────────
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on fresh-load home', async ({ page }) => {
    await loadHome(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });

  test('no WCAG 2.1 AA violations after morph complete', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
