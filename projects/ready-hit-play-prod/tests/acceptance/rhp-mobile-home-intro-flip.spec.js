// @ts-check
/**
 * Acceptance tests — rhp-mobile-home-intro-flip
 *
 * Mobile home intro: 300svh section, word reveal over first 250svh,
 * logo shrink+translate to nav over last 50svh.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-mobile-home-intro-flip';
const PAGE_PATH = '/';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Mobile tests (390×844) ───────────────────────────────────

test.describe(`${SLUG} — Mobile 390×844`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('section height is 300svh on mobile', async ({ page }) => {
    const height = await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (!section) return 0;
      return parseFloat(getComputedStyle(section).height);
    });
    // 300svh on 844px viewport = 2532px (allow 10% tolerance)
    expect(height).toBeGreaterThan(2400);
    expect(height).toBeLessThan(2700);
  });

  test('logo ancestor .home-transition is fixed (keeps logo in viewport)', async ({ page }) => {
    const isFixed = await page.evaluate(() => {
      const overlay = document.querySelector('.home-transition');
      if (!overlay) return false;
      return getComputedStyle(overlay).position === 'fixed';
    });
    expect(isFixed).toBe(true);
  });

  test('no console errors during intro scroll', async ({ page }) => {
    const errors = collectErrors(page);

    // Scroll to ~50% of the section (midway through word reveal)
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight * 0.5);
    });
    await page.waitForTimeout(2000);

    // Scroll to end of section (morph complete)
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight + 100);
    });
    await page.waitForTimeout(2000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('morph complete after full scroll: .rhp-home-ready present', async ({ page }) => {
    // Scroll past the section to trigger morph complete
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight + 100);
    });
    await page.waitForTimeout(2500);

    const hasReady = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') ?? false;
    });
    expect(hasReady).toBe(true);
  });

  test('dial ACTIVE state after morph (bg canvas visible, fg layer visible)', async ({ page }) => {
    // Scroll to trigger morph complete
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight + 100);
    });
    await page.waitForTimeout(2500);

    const dialState = await page.evaluate(() => {
      const dial = document.querySelector('.dial_component[data-dial-ns="home"]');
      if (!dial) return { bgOpacity: '0', fgOpacity: '0' };
      const bg = dial.querySelector('.dial_layer-bg');
      const fg = dial.querySelector('.dial_layer-fg');
      return {
        bgOpacity: bg ? getComputedStyle(bg).opacity : '0',
        fgOpacity: fg ? getComputedStyle(fg).opacity : '0'
      };
    });
    expect(Number(dialState.bgOpacity)).toBeGreaterThan(0);
    expect(Number(dialState.fgOpacity)).toBeGreaterThan(0);
  });
});

// ── Desktop regression (1440×900) ────────────────────────────

test.describe(`${SLUG} — Desktop regression`, () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('section height is 100svh on desktop (unchanged)', async ({ page }) => {
    await loadPage(page);
    const height = await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (!section) return 0;
      return parseFloat(getComputedStyle(section).height);
    });
    // 100svh on 900px viewport = ~900px (allow tolerance for 100vh vs 100svh)
    expect(height).toBeGreaterThan(800);
    expect(height).toBeLessThan(1050);
  });
});

// ── Reduced motion ───────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });

  test('morph completes without animation, nav visible', async ({ page }) => {
    await loadPage(page);

    // Scroll past section
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight + 100);
    });
    await page.waitForTimeout(1500);

    const hasReady = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') ?? false;
    });
    expect(hasReady).toBe(true);
  });
});

// ── Barba re-entry ───────────────────────────────────────────

test.describe(`${SLUG} — Barba re-entry`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('home→about→home clean on mobile', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Complete the morph first
    await page.evaluate(() => {
      const section = document.querySelector('.section_home-intro');
      if (section) window.scrollTo(0, section.offsetHeight + 100);
    });
    await page.waitForTimeout(2500);

    // Navigate to about
    await page.click('.nav_about-link');
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Navigate back to home
    await page.click('.nav_logo-link');
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Should be in final state (skipToEnd)
    const hasReady = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-barba="wrapper"]');
      return wrapper?.classList.contains('rhp-home-ready') ?? false;
    });
    expect(hasReady).toBe(true);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
