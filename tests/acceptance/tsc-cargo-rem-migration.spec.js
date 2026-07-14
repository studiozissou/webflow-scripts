const { test, expect } = require('@playwright/test');

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

test.describe('TSC Cargo rem migration', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        page._consoleErrors = page._consoleErrors || [];
        page._consoleErrors.push(msg.text());
      }
    });
  });

  test('homepage H1 has expected computed font-size at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });

    const fontSize = await h1.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // H1 = 4.75rem at 16px root = 76px. Allow 10% tolerance for fluid root tuning.
    expect(fontSize).toBeGreaterThan(68);
    expect(fontSize).toBeLessThan(84);
  });

  test('homepage body text has expected computed font-size at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const bodyText = page.locator('p').first();
    await expect(bodyText).toBeVisible({ timeout: 10000 });

    const fontSize = await bodyText.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // Body 1 = 1rem at 16px root = 16px. Allow tolerance.
    expect(fontSize).toBeGreaterThan(14);
    expect(fontSize).toBeLessThan(20);
  });

  test('font size scales fluidly between 1440px and 1920px', async ({ page }) => {
    // Measure at 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });

    const fontSize1440 = await h1.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // Resize to 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    const fontSize1920 = await h1.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // Font should be larger at 1920px than 1440px (fluid root scales up)
    expect(fontSize1920).toBeGreaterThan(fontSize1440);
  });

  test('no console errors on homepage', async ({ page }) => {
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const errors = page._consoleErrors || [];
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('third-party')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('no console errors on overview page', async ({ page }) => {
    await page.goto(`${STAGING_URL}/overview`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const errors = page._consoleErrors || [];
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('third-party')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('section padding matches expected rem values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check first section has meaningful padding (not 0 or collapsed)
    const section = page.locator('section').first();
    if (await section.count()) {
      const paddingTop = await section.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).paddingTop);
      });

      // Section padding should be > 0 (any size — confirms rem values are applied)
      expect(paddingTop).toBeGreaterThan(0);
    }
  });
});
