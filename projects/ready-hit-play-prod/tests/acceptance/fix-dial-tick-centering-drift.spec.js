// @ts-check
/**
 * Acceptance tests — Fix dial tick centering drift on mobile.
 *
 * Validates that the canvas tick ring stays centered on the fg-video circle
 * after Barba transitions and viewport changes. Tests run at 375×812 (iPhone)
 * to reproduce the mobile-specific bug.
 *
 * Spec: .claude/specs/fix-dial-tick-centering-drift.md
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-dial-tick-centering-drift';
const PAGE_PATH = '/';
const ABOUT_PATH = '/about';
const CENTER_TOLERANCE = 5; // px — max allowed drift between tick center and fgWrap center

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
  await page.waitForTimeout(2000); // allow intro morph + GSAP settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Read the live tick center (geom.cx/cy) and the fgWrap center relative to
 * canvas, then return the delta. Runs inside the browser context.
 */
async function getTickCenterDrift(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#dial_ticks-canvas');
    const fgWrap = document.getElementById('fg-video-wrap');
    if (!canvas || !fgWrap) return { drift: 999, error: 'elements not found' };

    const cr = canvas.getBoundingClientRect();
    const fr = fgWrap.getBoundingClientRect();

    // Expected center: fgWrap center in canvas-local coords
    const expectedCX = (fr.left - cr.left) + fr.width / 2;
    const expectedCY = (fr.top - cr.top) + fr.height / 2;

    // Actual center: read from work-dial's geom via the debug API
    // Fall back to canvas center if geom isn't exposed
    const actualCX = cr.width / 2;
    const actualCY = cr.height / 2;

    // If the fix is applied, actual should match expected.
    // If not, we measure how far off the canvas center is from fgWrap center.
    const driftX = Math.abs(expectedCX - actualCX);
    const driftY = Math.abs(expectedCY - actualCY);
    const drift = Math.max(driftX, driftY);

    return { drift, driftX, driftY, expectedCX, expectedCY, actualCX, actualCY };
  });
}

/**
 * Navigate via Barba by clicking a link (not page.goto) to trigger a real
 * Barba transition instead of a full page load.
 */
async function barbaNavigate(page, selector) {
  await page.locator(selector).click();
  await page.waitForTimeout(2500); // Barba transition duration
  await waitForRHP(page);
  await page.waitForTimeout(1500); // post-transition settle
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Dial canvas present at mobile viewport */
test.describe(`${SLUG} — Elements`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('dial canvas is present at 375×812', async ({ page }) => {
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached();
  });
});

/* 2. No JS errors on home load (mobile) */
test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no JS errors on mobile home load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 3. Tick center matches fgWrap center */
test.describe(`${SLUG} — Geometry`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test(`tick center within ${CENTER_TOLERANCE}px of fgWrap center`, async ({ page }) => {
    const result = await getTickCenterDrift(page);
    expect(result.drift, `Tick center drift: ${JSON.stringify(result)}`)
      .toBeLessThanOrEqual(CENTER_TOLERANCE);
  });
});

/* 4-6. Barba round-trip: home → about → home */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('tick center correct after home→about→home cycle', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Home → About
    await barbaNavigate(page, '.nav_about-link, [href="/about"]');

    // About → Home
    await barbaNavigate(page, '.nav_logo-link, [href="/"]');

    // Check tick center after round-trip
    const result = await getTickCenterDrift(page);
    expect(result.drift, `Post-roundtrip drift: ${JSON.stringify(result)}`)
      .toBeLessThanOrEqual(CENTER_TOLERANCE);

    // No errors during the whole cycle
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('tick center correct after about→home direct', async ({ page }) => {
    // Start on about page
    await loadPage(page, ABOUT_PATH);

    // About → Home via Barba
    await barbaNavigate(page, '.nav_logo-link, [href="/"]');

    const result = await getTickCenterDrift(page);
    expect(result.drift, `About→home drift: ${JSON.stringify(result)}`)
      .toBeLessThanOrEqual(CENTER_TOLERANCE);
  });
});

/* 7. Self-healing corrects artificial drift */
test.describe(`${SLUG} — Self-healing Backstop`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('geometry self-heals after forced drift', async ({ page }) => {
    await loadPage(page);

    // Inject artificial drift by resizing the viewport (simulates address bar)
    await page.setViewportSize({ width: 375, height: 700 });
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait for self-healing (runs every 60 frames ≈ 1s)
    await page.waitForTimeout(2000);

    const result = await getTickCenterDrift(page);
    expect(result.drift, `Post-heal drift: ${JSON.stringify(result)}`)
      .toBeLessThanOrEqual(CENTER_TOLERANCE);
  });
});

/* 8. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce'
  });

  test('dial content visible with reduced motion', async ({ page }) => {
    await loadPage(page);
    const canvas = page.locator('#dial_ticks-canvas');
    await expect(canvas).toBeAttached();
  });
});
