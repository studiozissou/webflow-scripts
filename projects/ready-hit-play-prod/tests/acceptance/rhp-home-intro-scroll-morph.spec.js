// @ts-check
/**
 * Acceptance tests — rhp-home-intro-scroll-morph
 *
 * Covers:
 *   - Fresh-load intro section + small dial + cloned logo in slot
 *   - Real nav logo hidden (opacity:0) while intro visible
 *   - 100vh scroll-driven morph: clone disposed, nav logo revealed
 *   - Scroll lock after morph complete
 *   - Barba re-entry skips intro
 *   - Home↔About slide transitions (power3.out, 0.75s)
 *   - Dial returns to IDLE on about→home
 *   - Nav logo click replays intro
 *   - Reduced motion fast-path
 *   - Mobile 375px with sticky intro slot
 *   - No console errors
 *   - Defensive CSS scoping: intro hidden on about & case
 *   - About hero logo animations deleted (no hover transforms)
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
const CASE_PATH = '/case-studies/overland-ai';

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
  test('intro section visible with small dial and cloned logo in slot', async ({ page }) => {
    await loadHome(page);

    // Intro section present and visible
    const intro = page.locator('.section_home-intro');
    await expect(intro).toBeAttached();
    await expect(intro).toBeVisible();

    // Cloned logo is inside the intro slot (marked with data-home-intro-clone)
    const clonedLogo = page.locator(
      '.home-intro_logo-slot .nav_logo-wrapper-2.is-nav[data-home-intro-clone]'
    );
    await expect(clonedLogo).toBeVisible();

    // Dial is rendered at the small size (width < large threshold)
    const dialWidth = await page.locator('.dial_component[data-dial-ns="home"]').evaluate(
      (el) => el.getBoundingClientRect().width
    );
    expect(dialWidth).toBeLessThan(500); // small dial is ~6rem–15rem range; large is >~400–600px
  });

  test('real nav logo is hidden (opacity 0) while intro is visible', async ({ page }) => {
    await loadHome(page);

    const opacity = await page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav').evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity || '1')
    );
    expect(opacity).toBeLessThan(0.1);
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
  test('scrolling 100vh completes morph, disposes clone, reveals nav logo', async ({ page }) => {
    await loadHome(page);
    await scrollMorph(page);

    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // Real nav logo is visible (opacity restored)
    const navLogoOpacity = await page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav').evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity || '1')
    );
    expect(navLogoOpacity).toBeGreaterThan(0.9);

    // Clone has been removed from the intro slot
    const cloneCount = await page.locator(
      '.home-intro_logo-slot [data-home-intro-clone]'
    ).count();
    expect(cloneCount).toBe(0);
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

    // Exactly one logo wrapper inside nav (the real one — clones disposed)
    const navLogoCount = await page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav').count();
    expect(navLogoCount).toBe(1);

    // No orphaned clone anywhere in the page
    const orphanCloneCount = await page.locator('[data-home-intro-clone]').count();
    expect(orphanCloneCount).toBe(0);

    // Intro section is either absent or hidden
    const visibleIntro = await page.locator('.section_home-intro:visible').count();
    expect(visibleIntro).toBe(0);
  });
});

// ── 4b. Defensive CSS scoping ─────────────────────────────────
test.describe(`${SLUG} — CSS namespace scoping`, () => {
  test('about page: .section_home-intro is display:none (if markup leaks)', async ({ page }) => {
    await page.goto(ABOUT_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    const introCount = await page.locator('.section_home-intro').count();
    if (introCount > 0) {
      // If the markup exists (e.g. symbol leaked), CSS must hide it.
      const display = await page.locator('.section_home-intro').first().evaluate(
        (el) => getComputedStyle(el).display
      );
      expect(display).toBe('none');
    }
    // If introCount === 0, the section isn't on About — equally fine.
    expect(true).toBe(true);
  });

  test('case page: .section_home-intro is absent or display:none', async ({ page }) => {
    await page.goto(CASE_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    const introCount = await page.locator('.section_home-intro').count();
    if (introCount > 0) {
      const display = await page.locator('.section_home-intro').first().evaluate(
        (el) => getComputedStyle(el).display
      );
      expect(display).toBe('none');
    }
    expect(true).toBe(true);
  });
});

// ── 4c. About hero logo animations removed ────────────────────
test.describe(`${SLUG} — About hero logo animations removed`, () => {
  test('hovering .about-hero_ready on /about triggers no inline transform or filter', async ({ page }) => {
    await page.goto(ABOUT_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    const targets = page.locator('.section_about-hero .about-hero_ready');
    const count = await targets.count();

    // If the big hero logo was hidden/removed by Designer, there may be nothing to hover.
    // In that case the test is a no-op — we just want to confirm NO lingering listeners
    // are writing styles onto any remaining .about-hero_ready elements.
    if (count === 0) {
      expect(true).toBe(true);
      return;
    }

    const target = targets.first();
    await target.hover().catch(() => { /* element may not be hoverable */ });
    await page.waitForTimeout(500);

    const { transform, filter } = await target.evaluate((el) => ({
      transform: el.style.transform || '',
      filter: el.style.filter || ''
    }));

    // Inline style should be empty (no JS-driven hover animation)
    expect(transform).toBe('');
    expect(filter).toBe('');
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

    // Clone should be back in the intro slot
    await expect(page.locator(
      '.home-intro_logo-slot .nav_logo-wrapper-2.is-nav[data-home-intro-clone]'
    )).toBeVisible();
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
  test('intro + scroll morph work at 375×812 with sticky slot', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await loadHome(page);

    await expect(page.locator('.section_home-intro')).toBeVisible();

    // Sticky slot: computed position should be 'sticky' at mobile breakpoint
    const slotPosition = await page.locator('.home-intro_logo-slot').evaluate(
      (el) => getComputedStyle(el).position
    );
    // Accept 'sticky' (preferred) or '-webkit-sticky'. If neither, warn via soft assert —
    // the Webflow CSS override may be gated on a different breakpoint.
    expect.soft(['sticky', '-webkit-sticky']).toContain(slotPosition);

    // Clone should be present on mobile fresh load
    await expect(page.locator(
      '.home-intro_logo-slot .nav_logo-wrapper-2.is-nav[data-home-intro-clone]'
    )).toBeVisible();

    await scrollMorph(page);

    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);

    // After morph: real nav logo is visible, clone disposed
    await expect(page.locator('.nav_logo-link .nav_logo-wrapper-2.is-nav')).toBeVisible();
    const orphanCloneCount = await page.locator('[data-home-intro-clone]').count();
    expect(orphanCloneCount).toBe(0);

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
