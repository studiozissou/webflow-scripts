/**
 * Acceptance tests for the Coconut /apply-for-2-years-free landing page.
 *
 * Spec: projects/coconut/.claude/specs/apply-for-2-years-free.md
 * Run: npx playwright test tests/acceptance/apply-for-2-years-free.spec.js
 * Production run: BASE_URL=https://www.getcoconut.com, plus REVOLUT_APPLY_URL and ZEMPLER_APPLY_URL once supplied.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE_URL = process.env.BASE_URL || 'https://getcoconut.webflow.io';
const PATH = '/apply-for-2-years-free';
const IS_PRODUCTION = BASE_URL.includes('www.getcoconut.com');

test.describe('apply-for-2-years-free', () => {
  const consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await page.goto(`${BASE_URL}${PATH}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1000);
  });

  test('returns 200 and has a single offer H1', async ({ page, request }) => {
    const res = await request.get(`${BASE_URL}${PATH}`);
    expect(res.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Get Coconut FREE\s+for 2 Years!/);
  });

  test('is noindex', async ({ page }) => {
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });

  test('is not in the sitemap (production only)', async ({ request }) => {
    test.skip(!IS_PRODUCTION, 'The sitemap only applies to the production domain');
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(await res.text()).not.toContain('apply-for-2-years-free');
  });

  test('shows the offer copy and both bank cards', async ({ page }) => {
    const text = await page.locator('body').innerText();
    expect(text).toContain('Choose your bank below to claim your free 2 years of Coconut.');
    expect(text).toContain('Get Coconut free with Revolut');
    expect(text).toContain('Get Coconut free with Zempler');
    expect(text).toContain('Eligibility criteria and offer terms apply.');
    await expect(page.getByRole('link', { name: /Apply with Revolut/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Apply with Zempler/ })).toBeVisible();
  });

  test('shows the three steps', async ({ page }) => {
    const text = await page.locator('body').innerText();
    for (const step of ['How to get started', 'Choose your bank', 'Activate your offer', 'Connect to Coconut']) {
      expect(text).toContain(step);
    }
  });

  test('has no trial or template leftovers', async ({ page }) => {
    const main = await page.locator('body').innerText();
    expect(main).not.toContain('Already have an account?');
    expect(main).not.toContain('Need to upgrade?');
    expect(main).not.toContain('Start your 14-day free trial');
    expect(main).not.toContain('You’re in the right place');
  });

  test('shows the normal banner after the steps', async ({ page }) => {
    const order = await page.evaluate(() => {
      const steps = document.querySelector('._25-how-to-get-start-section');
      const trust = [...document.querySelectorAll('.trustpilot-widget')].find(
        (el) => !el.closest('nav') && !el.closest('footer'),
      );
      if (!steps || !trust) return null;
      return Boolean(steps.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);
  });

  test('terms links go to the right legal pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Zempler terms' })).toHaveAttribute(
      'href',
      /\/legal\/partnership-with-zempler-bank/,
    );
    await expect(page.getByRole('link', { name: 'Revolut terms' })).toHaveAttribute(
      'href',
      /\/legal\/partnership-with-revolut-pro/,
    );
  });

  test('Revolut Apply button goes to the supplied URL', async ({ page }) => {
    const url = process.env.REVOLUT_APPLY_URL;
    test.skip(!url, 'Waiting on the Revolut URL from Anna');
    await expect(page.getByRole('link', { name: /Apply with Revolut/ })).toHaveAttribute('href', url);
  });

  test('Zempler Apply button goes to the supplied URL', async ({ page }) => {
    const url = process.env.ZEMPLER_APPLY_URL;
    test.skip(!url, 'Waiting on the Zempler URL from Anna');
    await expect(page.getByRole('link', { name: /Apply with Zempler/ })).toHaveAttribute('href', url);
  });

  test('has no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no console errors from the page', async () => {
    expect(consoleErrors).toEqual([]);
  });
});
