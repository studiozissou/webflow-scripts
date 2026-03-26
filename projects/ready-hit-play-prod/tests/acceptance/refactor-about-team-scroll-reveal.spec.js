// @ts-check
/**
 * Acceptance tests — refactor-about-team-scroll-reveal
 *
 * Validates the per-element ScrollTrigger scrub animation on the about page
 * team section for tablet and below (≤991px). Desktop hover unchanged.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'refactor-about-team-scroll-reveal';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const ABOUT = `${BASE}/about`;
const HOME = BASE;

const VIEWPORTS = {
  tablet:  { width: 991, height: 1024 },
  mobile:  { width: 767, height: 1024 },
  small:   { width: 479, height: 812 },
  desktop: { width: 1440, height: 900 },
};

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadAbout(page) {
  await page.goto(ABOUT);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Get computed opacity and translateX for a team child element. */
async function getElementState(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const opacity = parseFloat(cs.opacity);
    // Parse translateX from matrix(a, b, c, d, tx, ty)
    const matrix = cs.transform;
    let tx = 0;
    if (matrix && matrix !== 'none') {
      const parts = matrix.match(/matrix\(([^)]+)\)/);
      if (parts) {
        const values = parts[1].split(',').map(Number);
        tx = values[4] || 0;
      }
    }
    // Parse scale from matrix (a value for uniform scale)
    let scale = 1;
    if (matrix && matrix !== 'none') {
      const parts = matrix.match(/matrix\(([^)]+)\)/);
      if (parts) {
        const values = parts[1].split(',').map(Number);
        scale = values[0] || 1;
      }
    }
    return { opacity, tx, scale };
  }, selector);
}

/** Scroll the Barba container (about page scrolls in position:fixed container). */
async function scrollToElement(page, selector, position = 'center') {
  await page.evaluate(({ sel, pos }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const container = document.querySelector('[data-barba="container"]');
    if (!container) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const vh = window.innerHeight;
    // Scroll so element top is at the desired viewport position
    const targetY = pos === 'center' ? vh * 0.3 : vh * 0.5;
    const scrollAmount = container.scrollTop + elRect.top - containerRect.top - targetY;
    container.scrollTo({ top: Math.max(0, scrollAmount), behavior: 'instant' });
    // Also fire Lenis update if available
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  }, { sel: selector, pos: position });
  await page.waitForTimeout(800); // ScrollTrigger scrub settle
}

/** Scroll the Barba container back to top. */
async function scrollToTop(page) {
  await page.evaluate(() => {
    const container = document.querySelector('[data-barba="container"]');
    if (container) container.scrollTo({ top: 0, behavior: 'instant' });
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  });
  await page.waitForTimeout(800);
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Initial state: elements hidden at mobile breakpoints */
test.describe(`${SLUG} — Initial State`, () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    if (name === 'desktop') continue; // desktop uses hover, not scroll

    test(`elements start hidden at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await loadAbout(page);

      const ryanImage = await getElementState(page, '[data-team="ryan"] .about-team_image');
      const ryanName = await getElementState(page, '[data-team="ryan"] .about-team_name');
      const ryanBio = await getElementState(page, '[data-team="ryan"] .about-team_bio');

      expect(ryanImage).not.toBeNull();
      expect(ryanImage.opacity).toBeLessThan(0.15);
      expect(Math.abs(ryanImage.tx)).toBeGreaterThan(50); // translateX ~100%

      expect(ryanName.opacity).toBeLessThan(0.15);
      expect(ryanBio.opacity).toBeLessThan(0.15);
    });
  }
});

/* 2. Scroll reveal: elements become visible */
test.describe(`${SLUG} — Scroll Reveal`, () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    if (name === 'desktop') continue;

    test(`ryan image reveals on scroll at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await loadAbout(page);

      await scrollToElement(page, '[data-team="ryan"] .about-team_image');

      const state = await getElementState(page, '[data-team="ryan"] .about-team_image');
      expect(state.opacity).toBeGreaterThan(0.3);
      expect(Math.abs(state.tx)).toBeLessThan(200); // translateX approaching 0
    });

    test(`guy bio reveals on scroll at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await loadAbout(page);

      await scrollToElement(page, '[data-team="guy"] .about-team_bio');

      const state = await getElementState(page, '[data-team="guy"] .about-team_bio');
      expect(state.opacity).toBeGreaterThan(0.3);
    });
  }
});

/* 3. Image scale */
test.describe(`${SLUG} — Image Scale`, () => {
  test('ryan image scales up on scroll at 991px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loadAbout(page);

    await scrollToElement(page, '[data-team="ryan"] .about-team_image');

    const state = await getElementState(page, '[data-team="ryan"] .about-team_image');
    expect(state.scale).toBeGreaterThan(1.0);
  });
});

/* 4. Scroll reverse */
test.describe(`${SLUG} — Scroll Reverse`, () => {
  test('elements return to hidden on scroll-up at 991px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loadAbout(page);

    // Scroll to reveal
    await scrollToElement(page, '[data-team="ryan"] .about-team_image');
    const revealed = await getElementState(page, '[data-team="ryan"] .about-team_image');
    expect(revealed.opacity).toBeGreaterThan(0.3);

    // Scroll back to top
    await scrollToTop(page);

    const hidden = await getElementState(page, '[data-team="ryan"] .about-team_image');
    expect(hidden.opacity).toBeLessThan(0.15);
  });
});

/* 5. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    if (name === 'desktop') continue;

    test(`no JS errors at ${vp.width}px`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize(vp);
      await loadAbout(page);

      // Scroll through team section
      await scrollToElement(page, '[data-team="ryan"] .about-team_image');
      await scrollToElement(page, '[data-team="guy"] .about-team_bio');
      await page.waitForTimeout(500);

      expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
        .toHaveLength(0);
    });
  }
});

/* 6. Desktop hover regression */
test.describe(`${SLUG} — Desktop Hover`, () => {
  test('bio expands on hover at 1440px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loadAbout(page);

    // Scroll to team section first
    await scrollToElement(page, '[data-team="ryan"] .about-team_image');

    // Hover ryan image
    await page.hover('[data-team="ryan"] .about-team_image');
    await page.waitForTimeout(600);

    const bioState = await getElementState(page, '[data-team="ryan"] .about-team_bio');
    expect(bioState.opacity).toBeGreaterThan(0.5);
  });
});

/* 7. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('home → about → home → about: animation reinits', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(VIEWPORTS.tablet);

    // Start at home
    await page.goto(HOME);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate to about
    await page.click('.nav_about-link');
    await page.waitForTimeout(2500); // Barba transition
    await waitForRHP(page);

    // Navigate home
    await page.click('.nav_logo-link');
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Navigate to about again
    await page.click('.nav_about-link');
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Scroll to team — animation should work on re-entry
    await scrollToElement(page, '[data-team="ryan"] .about-team_image');
    const state = await getElementState(page, '[data-team="ryan"] .about-team_image');
    expect(state.opacity).toBeGreaterThan(0.3);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 8. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('team elements visible without animation at 991px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loadAbout(page);

    // Elements should be visible without needing to scroll
    const ryanImage = await getElementState(page, '[data-team="ryan"] .about-team_image');
    const ryanName = await getElementState(page, '[data-team="ryan"] .about-team_name');
    const ryanBio = await getElementState(page, '[data-team="ryan"] .about-team_bio');

    expect(ryanImage.opacity).toBeGreaterThan(0.8);
    expect(ryanName.opacity).toBeGreaterThan(0.8);
    expect(ryanBio.opacity).toBeGreaterThan(0.8);
  });
});
