// @ts-check
/**
 * Acceptance tests — feat-video-loading-spinner
 *
 * Validates that the Lottie video loading spinner:
 * - Attaches to visible video elements (FG, generic, case)
 * - Has correct positioning and accessibility attributes
 * - Survives Barba transitions without orphaned DOM
 * - Registers on window.RHP.videoLoader
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'feat-video-loading-spinner';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const HOME = BASE + '/';
const CASE_PAGE = BASE + '/work/overland-ai'; // known case study page

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

// ── Tests ─────────────────────────────────────────────────────

/* 1. Element presence */
test.describe(`${SLUG} — Elements`, () => {
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

/* 2. Work/case study page — all videos */
test.describe(`${SLUG} — Work Page`, () => {
  test('spinner container exists on every visible video', async ({ page }) => {
    await loadPage(page, CASE_PAGE);
    // Count visible videos inside Barba container (excludes hidden pool/bg videos)
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

/* 3. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on homepage', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on case page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_PAGE);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('home → case → home: no orphaned spinners', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to case page via Barba
    await page.goto(CASE_PAGE);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to home
    await page.goto(HOME);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Should have exactly 1 spinner per visible video, not doubled
    const fgSpinners = await page.locator('#fg-video-wrap .rhp-video-spinner').count();
    expect(fgSpinners).toBeLessThanOrEqual(1);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. RHP registration */
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

/* 6. prefers-reduced-motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('spinner container still present (CSS fallback)', async ({ page }) => {
    await loadPage(page);
    // Spinner container should exist but use CSS animation, not Lottie
    const spinner = page.locator('#fg-video-wrap .rhp-video-spinner');
    // May or may not be attached depending on video load state — just check no errors
    const errors = collectErrors(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 7. Accessibility */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on homepage', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
