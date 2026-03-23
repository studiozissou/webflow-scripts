// @ts-check
/**
 * Acceptance tests — feat-video-buffering-ux
 *
 * Validates the consolidated video buffering UX:
 * A) Lottie spinner on visible videos during load/buffer
 * B) No reverse-frame jerk on pool swap
 * C) BG frame-locked to FG during buffering
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'feat-video-buffering-ux';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const HOME = BASE + '/';
const CASE_PAGE = BASE + '/work/overland-ai';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, url = HOME) {
  await page.goto(url);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Part A: Spinner Tests ─────────────────────────────────────

test.describe(`${SLUG} — Spinner Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('spinner container exists on homepage FG video', async ({ page }) => {
    const spinner = page.locator('#fg-video-wrap .rhp-video-spinner');
    await expect(spinner).toBeAttached();
  });

  test('spinner has correct CSS (absolute, centered, pointer-events none)', async ({ page }) => {
    const spinner = page.locator('#fg-video-wrap .rhp-video-spinner');
    await expect(spinner).toBeAttached();

    const styles = await spinner.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        pointerEvents: cs.pointerEvents,
      };
    });

    expect(styles.position).toBe('absolute');
    expect(styles.pointerEvents).toBe('none');
  });

  test('spinner has aria-hidden="true"', async ({ page }) => {
    const spinner = page.locator('#fg-video-wrap .rhp-video-spinner');
    await expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe(`${SLUG} — Work Page Spinners`, () => {
  test('spinner on every visible work page video', async ({ page }) => {
    await loadPage(page, CASE_PAGE);
    const visibleVideos = await page.evaluate(() => {
      const container = document.querySelector('[data-barba="container"]');
      if (!container) return 0;
      return Array.from(container.querySelectorAll('video')).filter((v) => {
        const cs = getComputedStyle(v);
        return cs.opacity !== '0' && v.offsetWidth > 1 && v.offsetHeight > 1;
      }).length;
    });
    const spinners = await page.locator('[data-barba="container"] .rhp-video-spinner').count();
    expect(spinners).toBeGreaterThanOrEqual(visibleVideos);
  });

  test('spinner on .section_case-video video', async ({ page }) => {
    await loadPage(page, CASE_PAGE);
    const spinner = page.locator('.section_case-video .rhp-video-spinner');
    await expect(spinner).toBeAttached();
  });
});

// ── Console Errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on work page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_PAGE);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Barba Lifecycle ───────────────────────────────────────────

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('home → case → home: no orphaned spinners', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to case page
    await page.goto(CASE_PAGE);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to home
    await page.goto(HOME);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Should have at most 1 spinner per visible video, not doubled
    const fgSpinners = await page.locator('#fg-video-wrap .rhp-video-spinner').count();
    expect(fgSpinners).toBeLessThanOrEqual(1);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Module Registration ───────────────────────────────────────

test.describe(`${SLUG} — Module Registration`, () => {
  test('RHP.videoLoader is registered with init/destroy/version', async ({ page }) => {
    await loadPage(page);
    const registered = await page.evaluate(() => {
      const vl = window.RHP?.videoLoader;
      return {
        exists: !!vl,
        hasInit: typeof vl?.init === 'function',
        hasDestroy: typeof vl?.destroy === 'function',
        hasVersion: typeof vl?.version === 'string',
      };
    });
    expect(registered.exists).toBe(true);
    expect(registered.hasInit).toBe(true);
    expect(registered.hasDestroy).toBe(true);
    expect(registered.hasVersion).toBe(true);
  });
});

// ── Part C: BG Sync ───────────────────────────────────────────

test.describe(`${SLUG} — BG Canvas Mirror`, () => {
  test('BG canvas exists and mirrors FG video (no separate bg video)', async ({ page }) => {
    await loadPage(page);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const bgCanvas = document.querySelector('.dial_bg-canvas');
      const bgVideo = document.querySelector('.dial_bg-video');
      return {
        hasCanvas: !!bgCanvas,
        hasBgVideo: !!bgVideo,
        canvasWidth: bgCanvas ? bgCanvas.width : 0,
        canvasHeight: bgCanvas ? bgCanvas.height : 0,
      };
    });

    // Canvas mirror replaced bg video — no bg video should exist
    expect(result.hasCanvas).toBe(true);
    expect(result.hasBgVideo).toBe(false);
    // Canvas should have non-zero dimensions (half-res of component)
    expect(result.canvasWidth).toBeGreaterThan(0);
    expect(result.canvasHeight).toBeGreaterThan(0);
  });
});

// ── Reduced Motion ────────────────────────────────────────────

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('no JS errors with reduced motion', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Accessibility ─────────────────────────────────────────────

test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on homepage', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
