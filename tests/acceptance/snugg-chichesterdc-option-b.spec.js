// TDD acceptance test for Option B of the Chichester DC partner page: the centred card layout.
// The shared checks (form, UTMs, terms, steps, cookie banner, a11y) live in
// snugg-chichesterdc-partner-page.spec.js; run that too with SNUGG_SLUG=chichesterdc-v2.
//
//   SNUGG_URL=https://snugg.webflow.io npx playwright test \
//     --config=tests/acceptance/playwright.config.js snugg-chichesterdc-option-b

import { test, expect } from '@playwright/test';

const SNUGG_URL = (process.env.SNUGG_URL || 'https://www.snugg.com').replace(/\/$/, '');
const SLUG = process.env.SNUGG_SLUG_B || 'chichesterdc-v2';
const PAGE_URL = `${SNUGG_URL}/${SLUG}`;

test.describe('snugg-chichesterdc-option-b', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `${PAGE_URL} should exist`).toBeLessThan(400);
    await page.waitForTimeout(1000);
  });

  test('has no top navbar, only the centred Snugg logo above the card', async ({ page }) => {
    await expect(page.locator('.navbar1_component')).toHaveCount(0);
    await expect(page.locator('.section_council-hero img[alt="Snugg"]').first()).toBeVisible();
  });

  test('card holds the council logo, headline and postcode form', async ({ page }) => {
    const card = page.locator('.council-hero_card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('img[alt*="Chichester" i]')).toBeVisible();
    await expect(card.locator('h1')).toContainText(/smarter home energy improvements/i);
    await expect(card.locator('form.postcode-form')).toBeVisible();
    await expect(card.getByText(/read and agree to the/i)).toBeVisible();
  });

  test('card is white and horizontally centred at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const card = page.locator('.council-hero_card');
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
    const box = await card.boundingBox();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - 720)).toBeLessThan(4);
    expect(box?.width ?? 0).toBeLessThanOrEqual(760);
  });

  test('phone image shows beside the card on desktop and below it on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const phone = page.locator('.council-hero_phone');
    const card = page.locator('.council-hero_card');
    await expect(phone).toBeVisible();
    let p = await phone.boundingBox();
    let c = await card.boundingBox();
    expect(p?.x ?? 0).toBeGreaterThan((c?.x ?? 0) + (c?.width ?? 0) - 40);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    p = await phone.boundingBox();
    c = await card.boundingBox();
    expect(p?.y ?? 0).toBeGreaterThan((c?.y ?? 0) + (c?.height ?? 0) - 1);
  });
});
