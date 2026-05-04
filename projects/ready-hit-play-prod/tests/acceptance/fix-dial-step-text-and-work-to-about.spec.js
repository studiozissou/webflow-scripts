// @ts-check
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-dial-step-text-and-work-to-about';
const DEFAULT_STEP_TEXT = 'Great stories made undeniable';

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

/** Click a Barba link and wait for the transition to settle. */
async function barbaNavigate(page, selector, settleMs = 2500) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(settleMs);
  await waitForRHP(page);
  await page.waitForTimeout(500);
}

// ── Bug 1: Step text reset ──────────────────────────────────

test.describe(`${SLUG} — Step Text Reset`, () => {
  test('step text shows default after home→work→about→home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → Work (click first case study link)
    const caseLink = page.locator('.dial_cms-item a, [data-barba-namespace="home"] a[href*="/work/"]').first();
    if (await caseLink.count() > 0) {
      await caseLink.click();
    } else {
      // Fallback: navigate via URL
      await page.goto('/work/');
    }
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(500);

    // Work → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link');

    // About → Home
    await barbaNavigate(page, 'a[href="/"], .nav_logo-link');

    // Check step text
    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible({ timeout: 5000 });
    const text = await stepEl.textContent();
    expect(text.trim().toLowerCase()).toBe(DEFAULT_STEP_TEXT.toLowerCase());

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('step text shows default after home→about→home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link');

    // About → Home
    await barbaNavigate(page, 'a[href="/"], .nav_logo-link');

    // Check step text
    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible({ timeout: 5000 });
    const text = await stepEl.textContent();
    expect(text.trim().toLowerCase()).toBe(DEFAULT_STEP_TEXT.toLowerCase());

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Bug 2: Work→About single transition ─────────────────────

test.describe(`${SLUG} — Work to About Transition`, () => {
  test('no console errors on work→about path', async ({ page }) => {
    const errors = collectErrors(page);

    // Direct-land on a case page
    await page.goto('/work/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Work → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('work→about→home: dial is interactive and step text correct', async ({ page }) => {
    const errors = collectErrors(page);

    // Direct-land on a case page
    await page.goto('/work/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Work → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link');

    // About → Home
    await barbaNavigate(page, 'a[href="/"], .nav_logo-link');

    // Check dial canvas is present (dial re-initialised)
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached({ timeout: 5000 });

    // Check step text
    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible({ timeout: 5000 });
    const text = await stepEl.textContent();
    expect(text.trim().toLowerCase()).toBe(DEFAULT_STEP_TEXT.toLowerCase());

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no console errors on full round-trip home→work→about→home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → Work (via any case link in nav or dial)
    const caseLink = page.locator('a[href*="/work/"]').first();
    if (await caseLink.count() > 0) {
      await caseLink.click();
    } else {
      await page.goto('/work/');
    }
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(500);

    // Work → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link');

    // About → Home
    await barbaNavigate(page, 'a[href="/"], .nav_logo-link');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Reduced motion ──────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('step text correct with reduced motion after round-trip', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → About
    await barbaNavigate(page, 'a[href="/about"], .nav_about-link', 1500);

    // About → Home
    await barbaNavigate(page, 'a[href="/"], .nav_logo-link', 1500);

    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible({ timeout: 5000 });
    const text = await stepEl.textContent();
    expect(text.trim().toLowerCase()).toBe(DEFAULT_STEP_TEXT.toLowerCase());

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
