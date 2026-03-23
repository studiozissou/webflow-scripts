// @ts-check
/**
 * Acceptance tests — rhp-about-hero-logo-scroll
 *
 * Mobile-only scroll-driven logo animation on the about page hero.
 * GSAP timeline + ScrollTrigger scrub drives 3 bell-curve segments
 * (READY → HIT → PLAY) as user scrolls through ~250svh section.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-hero-logo-scroll';
const PAGE_PATH = '/about';
const MOBILE_VP = { width: 390, height: 844 };
const DESKTOP_VP = { width: 1280, height: 900 };

// ── Helpers ───────────────────────────────────────────────────

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

/**
 * Scroll to a ScrollTrigger progress percentage (0–100) within the about-hero section.
 * The ST range is start: 'top top', end: 'bottom bottom' on a custom scroller
 * (Barba container with position:fixed + overflow:auto), so the scroll distance
 * is sectionHeight - viewportHeight. We scroll the Barba container directly and
 * force a ScrollTrigger.update() to ensure scrub catches the new position.
 */
async function scrollToSTProgress(page, progressPct) {
  await page.evaluate((pct) => {
    const section = document.querySelector('.section_about-hero');
    const scroller = document.querySelector('[data-barba="container"]');
    if (!section || !scroller) return;
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const viewportHeight = scroller.clientHeight;
    // ST scroll range = sectionHeight - viewportHeight
    const scrollRange = sectionHeight - viewportHeight;
    const scrollTarget = sectionTop + (scrollRange * pct / 100);
    scroller.scrollTop = scrollTarget;
    // Force ScrollTrigger to read the new position
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  }, progressPct);
  await page.waitForTimeout(1000); // ScrollTrigger + scrub settle
}

async function getHeroReadyOpacity(page, index) {
  return page.evaluate((i) => {
    const els = document.querySelectorAll('.section_about-hero .about-hero_ready');
    if (!els[i]) return -1;
    return parseFloat(getComputedStyle(els[i]).opacity);
  }, index);
}

// ── Tests: Elements ──────────────────────────────────────────

test.describe(`${SLUG} — Elements (mobile)`, () => {
  test.use({ viewport: MOBILE_VP });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('section_about-hero is present and tall on mobile', async ({ page }) => {
    const section = page.locator('.section_about-hero');
    await expect(section).toBeAttached();
    const height = await section.evaluate(el => el.offsetHeight);
    // 250svh at 844px viewport ≈ 2110px; allow some tolerance
    expect(height).toBeGreaterThan(1500);
  });

  test('logo wrapper is sticky on mobile', async ({ page }) => {
    const position = await page.evaluate(() => {
      const wrapper = document.querySelector('.section_about-hero .nav_logo-wrapper-2');
      return wrapper ? getComputedStyle(wrapper).position : null;
    });
    expect(position).toBe('sticky');
  });
});

// ── Tests: Console Errors ────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: MOBILE_VP });

  test('no JS errors on about page load (mobile)', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Scroll Animation ─────────────────────────────────

test.describe(`${SLUG} — Scroll Animation (mobile)`, () => {
  test.use({ viewport: MOBILE_VP });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('READY word animates on scroll through first third', async ({ page }) => {
    // ST progress ~16.7% = middle of first third (READY peak)
    await scrollToSTProgress(page, 16.7);
    const opacity = await getHeroReadyOpacity(page, 0);
    expect(opacity).toBeGreaterThan(0.7);
  });

  test('HIT word animates on scroll through second third', async ({ page }) => {
    // ST progress ~50% = middle of second third (HIT peak)
    await scrollToSTProgress(page, 50);
    const opacity = await getHeroReadyOpacity(page, 1);
    expect(opacity).toBeGreaterThan(0.7);
  });

  test('PLAY word animates on scroll through third third', async ({ page }) => {
    // ST progress ~83.3% = middle of third third (PLAY peak)
    await scrollToSTProgress(page, 83.3);
    const opacity = await getHeroReadyOpacity(page, 2);
    expect(opacity).toBeGreaterThan(0.7);
  });

  test('words return to initial state between thirds', async ({ page }) => {
    // ST progress ~33% = boundary of first and second third
    await scrollToSTProgress(page, 33);
    const readyOpacity = await getHeroReadyOpacity(page, 0);
    const hitOpacity = await getHeroReadyOpacity(page, 1);
    // Both should be near initial state (0.4)
    expect(readyOpacity).toBeLessThan(0.6);
    expect(hitOpacity).toBeLessThan(0.6);
  });
});

// ── Tests: Reduced Motion ───────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ viewport: MOBILE_VP, reducedMotion: 'reduce' });

  test('prefers-reduced-motion: all words visible', async ({ page }) => {
    await loadPage(page);
    for (let i = 0; i < 3; i++) {
      const opacity = await getHeroReadyOpacity(page, i);
      expect(opacity).toBeGreaterThanOrEqual(0.9);
    }
  });
});

// ── Tests: Barba Lifecycle ──────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test.use({ viewport: MOBILE_VP });

  test('no errors after home→about→home→about', async ({ page }) => {
    const errors = collectErrors(page);

    // Load about
    await loadPage(page);

    // Navigate to home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to about
    await loadPage(page);

    // Section still present
    const section = page.locator('.section_about-hero');
    await expect(section).toBeAttached();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Tests: Desktop exclusion ────────────────────────────────

test.describe(`${SLUG} — Desktop exclusion`, () => {
  test.use({ viewport: DESKTOP_VP });

  test('desktop viewport: scroll animation not active', async ({ page }) => {
    await loadPage(page);
    // On desktop, the hover interaction runs, not scroll.
    // All .about-hero_ready should be at base opacity (0.4) without scrolling.
    const opacity = await getHeroReadyOpacity(page, 0);
    expect(opacity).toBeLessThanOrEqual(0.5);
  });
});
