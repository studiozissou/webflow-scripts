import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL;

test.describe('Canary: verify test pipeline works', () => {
  test('staging URL is configured', async () => {
    expect(STAGING_URL).toBeTruthy();
    expect(STAGING_URL).toContain('.webflow.io');
  });

  test('staging site loads successfully', async ({ page }) => {
    const response = await page.goto(STAGING_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    expect(response.status()).toBe(200);
  });

  test('page has a body element', async ({ page }) => {
    await page.goto(STAGING_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await expect(page.locator('body')).toBeVisible();
  });

  test('no critical console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(STAGING_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5000);
    // Filter out known benign errors (Webflow analytics, third-party scripts)
    const critical = errors.filter(
      (e) =>
        !e.includes('third-party') &&
        !e.includes('analytics') &&
        !e.includes('favicon')
    );
    expect(critical).toEqual([]);
  });
});
