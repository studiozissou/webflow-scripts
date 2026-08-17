// @ts-check
import { test, expect } from '@playwright/test';

const URL = 'https://www.getcoconut.com/mtd-software/sole-traders';

// Known JS errors from third-party scripts (not site code).
const KNOWN_ERRORS = [];

// Baseline captured 2026-07-16 (Full mode). See:
//   .claude/research/test-page/getcoconut-sole-traders-baseline-2026-07-16.json
//   .claude/research/test-page/getcoconut-sole-traders-report-2026-07-16.md
// CLS baseline is 0.11 (WARN, tracked as issue M1 — font swap + a `top`
// animation). The assertion below allows headroom so the known WARN does not
// fail, while a genuine regression (> 0.15) still trips.
const CLS_REGRESSION_CEILING = 0.15;

test.describe('getcoconut.com/mtd-software/sole-traders — regression', () => {
  /** @type {Error[]} */
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err));
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('loads without unexpected JS errors', async () => {
    const unexpected = jsErrors.filter(
      (e) => !KNOWN_ERRORS.some((known) => e.message.includes(known))
    );
    expect(
      unexpected,
      `JS errors: ${unexpected.map((e) => e.message).join(', ')}`
    ).toHaveLength(0);
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('CLS stays within regression ceiling', async ({ page }) => {
    const cls = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore layout-shift entry
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(clsValue), 5000);
      });
    });
    expect(cls).toBeLessThan(CLS_REGRESSION_CEILING);
  });

  test('single H1 and clean heading hierarchy (no skipped levels)', async ({ page }) => {
    const { h1Count, skips } = await page.evaluate(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const h1Count = hs.filter((h) => h.tagName === 'H1').length;
      const skips = [];
      let prev = 0;
      hs.forEach((h) => {
        const l = Number(h.tagName[1]);
        if (prev && l > prev + 1) skips.push(`${prev}->${l}`);
        prev = l;
      });
      return { h1Count, skips };
    });
    expect(h1Count).toBe(1);
    expect(skips).toEqual([]);
  });

  test('all images have an alt attribute', async ({ page }) => {
    const missingAlt = await page.evaluate(
      () => [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
    );
    expect(missingAlt).toBe(0);
  });

  test('SEO essentials present (title, meta description, lang)', async ({ page }) => {
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      lang: document.documentElement.getAttribute('lang') || '',
    }));
    expect(meta.title.length).toBeGreaterThan(10);
    expect(meta.description.length).toBeGreaterThan(50);
    expect(meta.lang).toBe('en');
  });
});
