/**
 * Acceptance tests for rhp-home-scroll-back-to-intro
 * Desktop wheel-up gesture in the completed home state reverse-plays the intro
 * morph back to the landing view; forward scroll re-completes it (back-and-forth).
 * Expected to FAIL until the feature ships (registered in registry.json per convention).
 *
 * Requires: STAGING_URL in .env.test (falls back to the live RHP staging site).
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.RHP_STAGING_URL || 'https://rhpcircle.webflow.io';
const WRAPPER = '[data-barba="wrapper"]';

async function completeForwardMorph(page) {
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector(`${WRAPPER}.rhp-home-ready`, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function wheelBackGesture(page) {
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(80);
  }
}

test.describe('rhp-home-scroll-back-to-intro acceptance', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  });

  test('scrolling down through the intro completes the morph', async ({ page }) => {
    await completeForwardMorph(page);
    await expect(page.locator(WRAPPER)).toHaveClass(/rhp-home-ready/);
  });

  test('wheel up from the completed state returns to the intro landing view', async ({ page }) => {
    await completeForwardMorph(page);
    await wheelBackGesture(page);
    await expect(page.locator(WRAPPER)).not.toHaveClass(/rhp-home-ready/, { timeout: 3000 });
    const introDisplay = await page
      .locator('.section_home-intro')
      .evaluate((el) => getComputedStyle(el).display);
    expect(introDisplay).not.toBe('none');
  });

  test('forward scroll works again after scrolling back', async ({ page }) => {
    await completeForwardMorph(page);
    await wheelBackGesture(page);
    await expect(page.locator(WRAPPER)).not.toHaveClass(/rhp-home-ready/, { timeout: 3000 });
    await page.waitForTimeout(1500);
    await completeForwardMorph(page);
    await expect(page.locator(WRAPPER)).toHaveClass(/rhp-home-ready/);
  });

  test('single small wheel tick does not trigger the reverse', async ({ page }) => {
    await completeForwardMorph(page);
    await page.mouse.wheel(0, -50);
    await page.waitForTimeout(1500);
    await expect(page.locator(WRAPPER)).toHaveClass(/rhp-home-ready/);
  });

  test('no console errors on home during back-and-forth', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await completeForwardMorph(page);
    await wheelBackGesture(page);
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('reduced motion: reverse completes near-instantly', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await completeForwardMorph(page);
    await wheelBackGesture(page);
    await expect(page.locator(WRAPPER)).not.toHaveClass(/rhp-home-ready/, { timeout: 1500 });
  });
});
