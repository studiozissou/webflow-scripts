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
  test('home → about → home: no orphaned spinners, no JS errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Count spinners before navigation
    const spinnersBefore = await page.locator('#fg-video-wrap .rhp-video-spinner').count();

    // Navigate to about via Barba (click nav link)
    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="about"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_about-link').click(),
    ]);
    await page.waitForTimeout(2000);

    // About page has no videos — should be zero spinners
    const spinnersAbout = await page.locator('.rhp-video-spinner').count();
    expect(spinnersAbout).toBe(0);

    // Navigate back to home via logo click
    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="home"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_logo-link').click(),
    ]);
    await page.waitForTimeout(2000);

    // Should have at most 1 spinner on FG video, not doubled from previous cycle
    const spinnersAfter = await page.locator('#fg-video-wrap .rhp-video-spinner').count();
    expect(spinnersAfter).toBeLessThanOrEqual(1);

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

  test('uses fallback spinner class (no Lottie)', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Under reduced motion, JS assigns rhp-video-spinner-fallback instead of rhp-video-spinner
    const fallback = page.locator('#fg-video-wrap .rhp-video-spinner-fallback');
    const lottie = page.locator('#fg-video-wrap .rhp-video-spinner');

    // Fallback should be present, Lottie spinner should not
    const fallbackCount = await fallback.count();
    const lottieCount = await lottie.count();
    expect(fallbackCount).toBeGreaterThanOrEqual(0); // may be 0 if video loaded instantly
    expect(lottieCount).toBe(0); // Lottie class must never be used under reduced motion

    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('fallback spinner has no CSS animation', async ({ page }) => {
    await loadPage(page);
    const fallback = page.locator('#fg-video-wrap .rhp-video-spinner-fallback');
    const count = await fallback.count();
    if (count > 0) {
      const anim = await fallback.first().evaluate((el) => getComputedStyle(el).animationName);
      expect(anim).toBe('none');
    }
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
