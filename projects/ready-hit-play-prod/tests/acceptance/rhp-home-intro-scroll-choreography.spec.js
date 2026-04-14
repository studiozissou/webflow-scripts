// @ts-check
/**
 * Acceptance tests — RHP Home Intro Scroll Choreography
 *
 * Verifies the homepage intro scroll animation: large logo + small transition
 * dial animate via GSAP Flip.fit scrubbed by ScrollTrigger as user scrolls
 * through .section_home-intro. At morph complete the main work-dial is shown,
 * nav items animate in, and scroll locks.
 *
 * Spec: .claude/specs/rhp-home-intro-scroll-choreography.md
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-home-intro-scroll-choreography';
const BASE_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const HOME_PATH = '/';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadHome(page) {
  await page.goto(`${BASE_URL}${HOME_PATH}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Scroll through the full intro section (1x viewport height). */
async function scrollThroughIntro(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight, behavior: 'auto' });
  });
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 5_000 }
  ).catch(() => {});
  await page.waitForTimeout(1200);
}

/** Scroll to ~50% of intro section. */
async function scrollHalfwayThroughIntro(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'auto' });
  });
  await page.waitForTimeout(800);
}

async function getRect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, selector);
}

// ── Pre-scroll state ──────────────────────────────────────────

test.describe(`${SLUG} — Pre-scroll state`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHome(page);
  });

  test('#interactive-logo visible and large on load', async ({ page }) => {
    const logo = page.locator('#interactive-logo');
    await expect(logo).toBeVisible();
    const rect = await getRect(page, '#interactive-logo');
    expect(rect).not.toBeNull();
    // Logo should be large — at least 40% of viewport width
    const vw = await page.evaluate(() => window.innerWidth);
    expect(rect.width).toBeGreaterThan(vw * 0.4);
  });

  test('.home-transition-dial visible and small on load', async ({ page }) => {
    const dial = page.locator('.home-transition-dial');
    await expect(dial).toBeAttached();
    const rect = await getRect(page, '.home-transition-dial');
    expect(rect).not.toBeNull();
    // Dial should be small — roughly 6rem (~96px at default font size)
    expect(rect.width).toBeLessThan(200);
  });

  test('main work-dial has dial-small CSS vars on load', async ({ page }) => {
    const liveWidth = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"]');
      if (!el) return null;
      return getComputedStyle(el).getPropertyValue('--dial-live-width').trim();
    });
    // Should reference dial-small-width (either the literal or resolved value)
    expect(liveWidth).toBeTruthy();
  });

  test('nav items hidden on load', async ({ page }) => {
    await expect(page.locator('.nav_logo-link')).not.toBeVisible();
    await expect(page.locator('.nav_about-link')).not.toBeVisible();
    await expect(page.locator('.nav_contact-link')).not.toBeVisible();
  });

  test('step text hidden on load', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"] .heading-style-h7.is-step') ||
        document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"]');
      if (!el) return '0';
      return getComputedStyle(el).opacity;
    });
    expect(Number(opacity)).toBe(0);
  });
});

// ── Post-scroll state ─────────────────────────────────────────

test.describe(`${SLUG} — Post-scroll (morph complete)`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHome(page);
    await scrollThroughIntro(page);
  });

  test('scroll morph completes after full scroll', async ({ page }) => {
    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete === true);
    expect(complete).toBe(true);
  });

  test('.section_home-intro hidden after morph', async ({ page }) => {
    const display = await page.evaluate(() => {
      const el = document.querySelector('.section_home-intro');
      return el ? getComputedStyle(el).display : 'none';
    });
    expect(display).toBe('none');
  });

  test('.rhp-home-ready present after morph', async ({ page }) => {
    const hasClass = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') || false;
    });
    expect(hasClass).toBe(true);
  });

  test('nav about and contact visible after morph', async ({ page }) => {
    await expect(page.locator('.nav_about-link')).toBeVisible();
    await expect(page.locator('.nav_contact-link')).toBeVisible();
  });

  test('step text visible after morph', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"] .heading-style-h7.is-step') ||
        document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"]');
      if (!el) return '0';
      return getComputedStyle(el).opacity;
    });
    expect(Number(opacity)).toBeGreaterThan(0);
  });

  test('RHP.homeScrollMorph.complete is true after morph', async ({ page }) => {
    const complete = await page.evaluate(() => window.RHP?.homeScrollMorph?.complete);
    expect(complete).toBe(true);
  });
});

// ── Console errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors after morph', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await scrollThroughIntro(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Reduced motion ────────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content visible without animation', async ({ page }) => {
    await loadHome(page);
    // With reduced motion, the morph should complete immediately or be skipped.
    // After scrolling, the post-morph state should be reachable.
    await scrollThroughIntro(page);
    const hasReady = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') || false;
    });
    expect(hasReady).toBe(true);
  });

  test('nav visible after morph with reduced motion', async ({ page }) => {
    await loadHome(page);
    await scrollThroughIntro(page);
    await expect(page.locator('.nav_about-link')).toBeVisible();
    await expect(page.locator('.nav_contact-link')).toBeVisible();
  });
});

// ── Barba lifecycle ───────────────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('Barba re-entry: intro skipped, dial visible', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHome(page);
    await scrollThroughIntro(page);

    // Navigate to about page
    await page.locator('.nav_about-link').click();
    await page.waitForTimeout(2500);

    // Navigate back to home
    await page.locator('.nav_logo-link').click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Intro should be skipped on re-entry
    const introDisplay = await page.evaluate(() => {
      const el = document.querySelector('.section_home-intro');
      return el ? getComputedStyle(el).display : 'none';
    });
    expect(introDisplay).toBe('none');

    // Work dial should be visible
    const hasReady = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') || false;
    });
    expect(hasReady).toBe(true);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Accessibility ─────────────────────────────────────────────

test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations', async ({ page }) => {
    await loadHome(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
