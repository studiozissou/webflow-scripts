// @ts-check
import { test, expect } from '@playwright/test';

const URL = 'https://www.getcoconut.com/thetimes';

// Known JS errors from third-party scripts (not site code).
const KNOWN_ERRORS = [];

test.describe('getcoconut.com/thetimes — regression', () => {
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

  test('CLS is below 0.1 threshold', async ({ page }) => {
    const cls = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(clsValue), 5000);
      });
    });
    expect(cls).toBeLessThan(0.1);
  });
});
