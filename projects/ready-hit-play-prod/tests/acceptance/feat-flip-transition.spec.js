// @ts-check
/**
 * Acceptance tests — feat-flip-transition
 * GSAP Flip-based about transition: logo + dial reparenting,
 * forward-only easing, overlay hold until work-dial ready.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-flip-transition';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ────────────────────────────────────────────────────

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

async function navigateViaBarba(page, linkSelector) {
  await page.locator(linkSelector).first().click();
  await page.waitForTimeout(2500); // about transition duration
  await waitForRHP(page);
  await page.waitForTimeout(1000); // settle
}

// ── Home → About ─────────────────────────────────────────────

test.describe(`${SLUG} — Home → About`, () => {
  test('no JS errors during transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await navigateViaBarba(page, 'a[href="/about"], [data-barba-link][href="/about"]');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('logo ends up in .about-transition_logo-middle', async ({ page }) => {
    await loadPage(page, '/');
    await navigateViaBarba(page, 'a[href="/about"], [data-barba-link][href="/about"]');
    const logoParent = await page.evaluate(() => {
      const logo = document.querySelector('#transition-logo');
      return logo?.parentElement?.className || null;
    });
    expect(logoParent).toContain('about-transition_logo-middle');
  });

  test('dial ends up in .about_dial-wrapper', async ({ page }) => {
    await loadPage(page, '/');
    await navigateViaBarba(page, 'a[href="/about"], [data-barba-link][href="/about"]');
    const dialParent = await page.evaluate(() => {
      const dial = document.querySelector('.transition-dial');
      return dial?.parentElement?.className || null;
    });
    expect(dialParent).toContain('about_dial-wrapper');
  });

  test('overlay is visible during transition', async ({ page }) => {
    await loadPage(page, '/');
    // Click and check overlay mid-transition
    await page.locator('a[href="/about"], [data-barba-link][href="/about"]').first().click();
    await page.waitForTimeout(300); // after overlay fade starts
    const display = await page.evaluate(() => {
      const el = document.querySelector('.about-transition');
      return el ? getComputedStyle(el).display : 'none';
    });
    expect(display).not.toBe('none');
    await waitForRHP(page);
  });
});

// ── About → Home ─────────────────────────────────────────────

test.describe(`${SLUG} — About → Home`, () => {
  test('no JS errors during transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('logo ends up in .about-transition_logo-start', async ({ page }) => {
    await loadPage(page, '/about');
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');
    const logoParent = await page.evaluate(() => {
      const logo = document.querySelector('#transition-logo');
      return logo?.parentElement?.className || null;
    });
    expect(logoParent).toContain('about-transition_logo-start');
  });

  test('dial ends up in .about-transition_logo-middle', async ({ page }) => {
    await loadPage(page, '/about');
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');
    const dialParent = await page.evaluate(() => {
      const dial = document.querySelector('.transition-dial');
      return dial?.parentElement?.className || null;
    });
    expect(dialParent).toContain('about-transition_logo-middle');
  });

  test('overlay stays visible until homepage loaded', async ({ page }) => {
    await loadPage(page, '/about');
    await page.locator('.nav_logo-link, a[href="/"]').first().click();
    // Check overlay is still visible after Barba swap but before full init
    await page.waitForTimeout(1000);
    const visible = await page.evaluate(() => {
      const el = document.querySelector('.about-transition');
      if (!el) return false;
      const style = getComputedStyle(el);
      return style.display !== 'none' && Number(style.opacity) > 0;
    });
    expect(visible).toBe(true);
    await waitForRHP(page);
  });

  test('overlay fades out after work-dial ready', async ({ page }) => {
    await loadPage(page, '/about');
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');
    // After full navigation + work-dial init, overlay should be hidden
    await page.waitForTimeout(1000); // extra settle for fade
    const hidden = await page.evaluate(() => {
      const el = document.querySelector('.about-transition');
      if (!el) return true;
      return getComputedStyle(el).display === 'none' || Number(getComputedStyle(el).opacity) === 0;
    });
    expect(hidden).toBe(true);
  });
});

// ── Re-entry ─────────────────────────────────────────────────

test.describe(`${SLUG} — Re-entry`, () => {
  test('home→about→home→about: no errors, clean DOM', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');

    // home → about
    await navigateViaBarba(page, 'a[href="/about"], [data-barba-link][href="/about"]');
    // about → home
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');
    // home → about (re-entry)
    await navigateViaBarba(page, 'a[href="/about"], [data-barba-link][href="/about"]');

    // Only one #transition-logo should exist
    const logoCount = await page.locator('#transition-logo').count();
    expect(logoCount).toBe(1);

    // Only one .transition-dial should exist
    const dialCount = await page.locator('.transition-dial').count();
    expect(dialCount).toBe(1);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Direct Land ──────────────────────────────────────────────

test.describe(`${SLUG} — Direct Land`, () => {
  test('direct land /about: logo in correct container', async ({ page }) => {
    await loadPage(page, '/about');
    const logoParent = await page.evaluate(() => {
      const logo = document.querySelector('#transition-logo');
      return logo?.parentElement?.className || null;
    });
    expect(logoParent).toContain('about-transition_logo-middle');
  });

  test('direct land /about→home: transition plays correctly', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');
    await navigateViaBarba(page, '.nav_logo-link, a[href="/"]');

    // Logo should be back in start container
    const logoParent = await page.evaluate(() => {
      const logo = document.querySelector('#transition-logo');
      return logo?.parentElement?.className || null;
    });
    expect(logoParent).toContain('about-transition_logo-start');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Reduced Motion ───────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content visible without animation delay', async ({ page }) => {
    await loadPage(page, '/');
    await page.locator('a[href="/about"], [data-barba-link][href="/about"]').first().click();
    await page.waitForTimeout(500); // minimal wait — should be instant with reduced motion
    await waitForRHP(page);

    // About page content should be visible
    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba-namespace]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('about');
  });
});

// ── Console Errors ───────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on about page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
