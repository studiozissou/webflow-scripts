// @ts-check
/**
 * Acceptance tests for fix-dial-namespace-selectors
 *
 * Verifies that .dial_component gets the correct data-dial-ns attribute
 * and computed display:grid on all pages and Barba transitions.
 *
 * Root cause: .dial_component:has([data-barba-namespace]) CSS selectors
 * fail when the Barba container is outside dial_component (about page).
 * Fix: replace :has() with [data-dial-ns] attribute selectors.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-dial-namespace-selectors';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

async function getDialState(page) {
  return page.evaluate(() => {
    const dialComp = document.querySelector('.dial_component');
    if (!dialComp) return { dialNs: null, display: null };
    return {
      dialNs: dialComp.getAttribute('data-dial-ns'),
      display: getComputedStyle(dialComp).display,
    };
  });
}

// ── Direct land tests ─────────────────────────────────────────

test.describe(`${SLUG} — Direct land`, () => {
  test('direct land home — data-dial-ns="home" and display grid', async ({ page }) => {
    await loadPage(page, '/');
    const state = await getDialState(page);
    expect(state.dialNs).toBe('home');
    expect(state.display).toBe('grid');
  });

  test('direct land about — data-dial-ns="about" and display grid', async ({ page }) => {
    await loadPage(page, '/about');
    const state = await getDialState(page);
    expect(state.dialNs).toBe('about');
    expect(state.display).toBe('grid');
  });
});

// ── Barba transition tests ────────────────────────────────────

test.describe(`${SLUG} — Barba transitions`, () => {
  test('about→home — data-dial-ns="home" and display grid after transition', async ({ page }) => {
    const errors = collectErrors(page);

    // Direct land on about
    await loadPage(page, '/about');

    // Navigate to home via logo click
    const logo = page.locator('.nav_logo-link').first();
    await logo.click();
    await page.waitForTimeout(2500); // about transition overlay + morph
    await waitForRHP(page);
    await page.waitForTimeout(1500); // settle

    const state = await getDialState(page);
    expect(state.dialNs).toBe('home');
    expect(state.display).toBe('grid');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('home→about — data-dial-ns="about" and display grid after transition', async ({ page }) => {
    const errors = collectErrors(page);

    // Direct land on home
    await loadPage(page, '/');

    // Navigate to about
    const aboutLink = page.locator('.nav_about-link').first();
    await aboutLink.click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    const state = await getDialState(page);
    expect(state.dialNs).toBe('about');
    expect(state.display).toBe('grid');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('about→home→about round trip — no errors, correct namespace', async ({ page }) => {
    const errors = collectErrors(page);

    // Direct land about
    await loadPage(page, '/about');

    // about → home
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    let state = await getDialState(page);
    expect(state.dialNs).toBe('home');
    expect(state.display).toBe('grid');

    // home → about
    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    state = await getDialState(page);
    expect(state.dialNs).toBe('about');
    expect(state.display).toBe('grid');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Console errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/about');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on home page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
