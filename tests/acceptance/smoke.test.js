// @ts-check
import { test, expect } from '@playwright/test';

// Known JS errors from Webflow or third-party scripts (not our code)
const KNOWN_ERRORS = [
  'missing ) after argument list',
];

test.describe('Homepage — structure', () => {
  /** @type {Error[]} */
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
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

  test('Client First page-wrapper present', async ({ page }) => {
    await expect(page.locator('.page-wrapper')).toBeAttached();
  });

  test('global-styles embed present', async ({ page }) => {
    await expect(page.locator('.global-styles')).toBeAttached();
  });
});

test.describe('Homepage — global.js', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('copyright year element shows current year', async ({ page }) => {
    const yearEl = page.locator('#year');
    const exists = (await yearEl.count()) > 0;
    if (!exists) {
      test.skip(true, '#year element not yet on staging');
      return;
    }
    const text = await yearEl.textContent();
    expect(text).toBe(String(new Date().getFullYear()));
  });

  test('external links have rel="noreferrer noopener"', async ({ page }) => {
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    if (count === 0) {
      test.skip(true, 'no external links on staging yet');
      return;
    }
    for (let i = 0; i < count; i++) {
      const rel = await externalLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('noreferrer');
      expect(rel).toContain('noopener');
    }
  });

  test('forms have tracking fields injected', async ({ page }) => {
    const forms = page.locator('form');
    const count = await forms.count();
    if (count === 0) {
      test.skip(true, 'no forms on staging yet');
      return;
    }
    for (let i = 0; i < count; i++) {
      const form = forms.nth(i);
      const trackingAttr = await form.getAttribute('data-tracking-injected');
      expect(trackingAttr).toBe('true');
      const conversionField = form.locator('input[name="Conversion Page"]');
      await expect(conversionField).toBeAttached();
    }
  });
});
