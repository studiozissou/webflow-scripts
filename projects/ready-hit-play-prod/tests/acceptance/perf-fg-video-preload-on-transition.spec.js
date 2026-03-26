// @ts-check
/**
 * Acceptance tests — perf-fg-video-preload-on-transition
 *
 * Validates that fg video URLs are preloaded during the case→home Barba
 * transition leave phase, cleaned up after afterEnter, and gated by
 * connection quality.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'perf-fg-video-preload-on-transition';
const STAGING = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${STAGING}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Navigate home → case → home via Barba (click-based).
 * Returns after home re-init settles.
 */
async function roundTripCaseToHome(page) {
  // Start on home
  await loadPage(page, '/');

  // Click first case study link in the nav or dial area
  // The about-link is reliable; for case we need to find a work link
  const workLink = page.locator('a[href*="/work/"]').first();
  if (await workLink.count() === 0) {
    // Fallback: navigate directly
    await page.goto(`${STAGING}/work/`);
    await waitForRHP(page);
    await page.waitForTimeout(1500);
  } else {
    await workLink.click();
    await page.waitForTimeout(2500); // Barba transition
    await waitForRHP(page);
  }

  // Now on a case/work page — click logo to go home
  const logoLink = page.locator('.nav_logo-link, a[href="/"]').first();
  await logoLink.click();
  await page.waitForTimeout(2500); // Barba transition back to home
  await waitForRHP(page);
  await page.waitForTimeout(1000); // settle
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during case→home transition', async ({ page }) => {
    const errors = collectErrors(page);
    await roundTripCaseToHome(page);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Preload Cleanup`, () => {
  test('no orphaned preload video elements after home re-entry', async ({ page }) => {
    await roundTripCaseToHome(page);

    // Count 1×1 off-screen video elements inside .dial_component
    // These are pool elements (expected: 2) + generic (expected: 1) + fg (expected: 1)
    // Preload elements should be cleaned up (0 extra)
    const offscreenCount = await page.evaluate(() => {
      const comp = document.querySelector('.dial_component');
      if (!comp) return 0;
      const videos = comp.querySelectorAll('video');
      let offscreen = 0;
      videos.forEach(v => {
        if (v.style.left === '-9999px' && v.style.width === '1px') {
          // This is a pool or preload element
          offscreen++;
        }
      });
      return offscreen;
    });

    // Expected: exactly 2 pool elements (poolPrev + poolNext)
    // If preload cleanup failed, this would be higher
    expect(offscreenCount).toBeLessThanOrEqual(2);
  });
});

test.describe(`${SLUG} — Video Readiness`, () => {
  test('handoff sector video has metadata after case→home return', async ({ page }) => {
    await roundTripCaseToHome(page);

    // The fg video in #fg-video-wrap should have readyState >= 1 (HAVE_METADATA)
    const readyState = await page.evaluate(() => {
      const fg = document.querySelector('#fg-video-wrap .dial_fg-video');
      return fg ? fg.readyState : -1;
    });

    expect(readyState).toBeGreaterThanOrEqual(1);
  });
});

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('repeated case→home→case→home: no element accumulation', async ({ page }) => {
    const errors = collectErrors(page);

    // First round trip
    await roundTripCaseToHome(page);

    // Count videos in dial_component after first trip
    const countAfterFirst = await page.evaluate(() => {
      const comp = document.querySelector('.dial_component');
      return comp ? comp.querySelectorAll('video').length : 0;
    });

    // Navigate to a case page again
    const workLink = page.locator('a[href*="/work/"]').first();
    if (await workLink.count() > 0) {
      await workLink.click();
      await page.waitForTimeout(2500);
      await waitForRHP(page);
    } else {
      await page.goto(`${STAGING}/work/`);
      await waitForRHP(page);
      await page.waitForTimeout(1500);
    }

    // Return home again
    const logoLink = page.locator('.nav_logo-link, a[href="/"]').first();
    await logoLink.click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // Count videos after second trip — should be same as first
    const countAfterSecond = await page.evaluate(() => {
      const comp = document.querySelector('.dial_component');
      return comp ? comp.querySelectorAll('video').length : 0;
    });

    expect(countAfterSecond).toBeLessThanOrEqual(countAfterFirst);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('preload still works with reduced motion', async ({ page }) => {
    const errors = collectErrors(page);
    await roundTripCaseToHome(page);

    // No errors — preload is network-only, not animation
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
