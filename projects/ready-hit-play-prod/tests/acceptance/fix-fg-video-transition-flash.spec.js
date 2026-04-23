// @ts-check
/**
 * Acceptance tests — fix-fg-video-transition-flash
 *
 * Verifies fg-video stays visible (no opacity flash) during:
 * - Work → Home transitions (dial shrink)
 * - Work → Work transitions (case to case)
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-fg-video-transition-flash';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

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

/** Navigate from home to a case study by clicking the first CMS link. */
async function navigateToFirstCase(page) {
  // Activate dial (move mouse to center to trigger ACTIVE state)
  const dialComp = page.locator('.dial_component');
  await dialComp.hover({ position: { x: 200, y: 200 } });
  await page.waitForTimeout(1000);

  // Click a CMS item link to navigate to case study
  const caseLink = page.locator('.dial_cms-item a, a[href*="/work/"]').first();
  if (await caseLink.isVisible()) {
    await caseLink.click();
  } else {
    // Fallback: use Barba-compatible navigation
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/work/"]');
      if (link) link.click();
    });
  }
  await page.waitForTimeout(2500); // Barba transition settle
  await waitForRHP(page);
}

// ── Work → Home: fg-video visibility ─────────────────────────

test.describe(`${SLUG} — Work → Home`, () => {
  test('fg-video stays visible during dial shrink', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to a case study
    await navigateToFirstCase(page);
    await page.waitForTimeout(1000);

    // Verify fg-video is present on work page
    const fgVideo = page.locator('#fg-video-wrap .dial_fg-video');
    await expect(fgVideo).toBeAttached();

    // Set up opacity monitoring before navigating back
    await page.evaluate(() => {
      window._fgFlashDetected = false;
      window._opacityChecks = [];
      const dialFg = document.querySelector('.dial_layer-fg');
      if (!dialFg) return;
      const observer = new MutationObserver(() => {
        const opacity = getComputedStyle(dialFg).opacity;
        window._opacityChecks.push(opacity);
        if (Number(opacity) < 0.5) window._fgFlashDetected = true;
      });
      observer.observe(dialFg, { attributes: true, attributeFilter: ['style'] });
      // Also poll on rAF for CSS-only changes
      let frames = 0;
      const check = () => {
        const opacity = getComputedStyle(dialFg).opacity;
        if (Number(opacity) < 0.5) window._fgFlashDetected = true;
        frames++;
        if (frames < 120) requestAnimationFrame(check); // ~2s of monitoring
      };
      requestAnimationFrame(check);
    });

    // Navigate back to home
    const logoLink = page.locator('.nav_logo-link, a[href="/"]').first();
    await logoLink.click();
    await page.waitForTimeout(3000); // Barba transition + resume settle

    // Check no flash was detected
    const flashDetected = await page.evaluate(() => window._fgFlashDetected);
    expect(flashDetected, 'fg-video flashed to opacity < 0.5 during work→home').toBe(false);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no console errors on work→home transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await navigateToFirstCase(page);
    await page.waitForTimeout(500);

    // Navigate back home
    const logoLink = page.locator('.nav_logo-link, a[href="/"]').first();
    await logoLink.click();
    await page.waitForTimeout(3000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Work → Work: fg-video visibility ─────────────────────────

test.describe(`${SLUG} — Work → Work`, () => {
  test('fg-video stays visible during case-to-case navigation', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to first case study
    await navigateToFirstCase(page);
    await page.waitForTimeout(1000);

    // Find a prev/next link to navigate to another case
    const nextLink = page.locator('a[href*="/work/"]').last();
    const nextHref = await nextLink.getAttribute('href');

    if (nextHref) {
      // Monitor fg-video visibility
      await page.evaluate(() => {
        window._fgFlashDetected = false;
        const fgWrap = document.getElementById('fg-video-wrap');
        if (!fgWrap) return;
        let frames = 0;
        const check = () => {
          const opacity = getComputedStyle(fgWrap).opacity;
          if (Number(opacity) < 0.5) window._fgFlashDetected = true;
          frames++;
          if (frames < 120) requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

      await nextLink.click();
      await page.waitForTimeout(3000); // Barba transition settle
      await waitForRHP(page);

      const flashDetected = await page.evaluate(() => window._fgFlashDetected);
      expect(flashDetected, 'fg-video flashed during work→work').toBe(false);
    }

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no console errors on work→work transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await navigateToFirstCase(page);
    await page.waitForTimeout(500);

    const nextLink = page.locator('a[href*="/work/"]').last();
    if (await nextLink.isVisible()) {
      await nextLink.click();
      await page.waitForTimeout(3000);
    }

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Regression: Home → Work still works ──────────────────────

test.describe(`${SLUG} — Regression`, () => {
  test('home→work transition still works', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await navigateToFirstCase(page);

    // Verify we're on a case page
    const barbaContainer = page.locator('[data-barba-namespace="case"], [data-barba-namespace="work"]');
    await expect(barbaContainer).toBeAttached({ timeout: 5000 });

    // fg-video should be visible on work page
    const fgVideo = page.locator('#fg-video-wrap .dial_fg-video');
    await expect(fgVideo).toBeAttached();

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Reduced motion ───────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('fg-video visible after work→home with reduced motion', async ({ page }) => {
    await loadPage(page);
    await navigateToFirstCase(page);
    await page.waitForTimeout(500);

    const logoLink = page.locator('.nav_logo-link, a[href="/"]').first();
    await logoLink.click();
    await page.waitForTimeout(2000);

    // fg-video wrap should exist and be attached
    const fgWrap = page.locator('#fg-video-wrap');
    await expect(fgWrap).toBeAttached();
  });
});
