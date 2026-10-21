// TDD acceptance test: on desktop (>=1280px) the Chichester DC page fits the hero plus the whole steps band in one screen between 889 and 1301px tall, and the hero fills any extra height.
//
//   SNUGG_URL=https://snugg.webflow.io npx playwright test \
//     --config=tests/acceptance/playwright.config.js tests/acceptance/snugg-chichesterdc-fold.spec.js

import { test, expect } from '@playwright/test';

const SNUGG_URL = (process.env.SNUGG_URL || 'https://www.snugg.com').replace(/\/$/, '');
const SLUG = process.env.SNUGG_SLUG_B || 'chichesterdc-v2';
const PAGE_URL = `${SNUGG_URL}/${SLUG}`;
const THIRD_PARTY = /googletagmanager|google-analytics|facebook|turnstile|cloudflare|finsweet|slick/i;

async function measure(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const r = (s) => document.querySelector(s)?.getBoundingClientRect();
    const hero = r('.section_council-hero');
    const band = r('[data-steps-band]');
    return {
      vh: innerHeight,
      scrollH: document.documentElement.scrollHeight,
      scrollW: document.documentElement.scrollWidth,
      heroH: hero.height,
      heroBottom: hero.bottom,
      bandTop: band.top,
      bandBottom: band.bottom,
    };
  });
}

test.describe('snugg-chichesterdc-fold', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto(PAGE_URL, { waitUntil: 'load' });
    expect(res?.status(), `${PAGE_URL} should exist`).toBeLessThan(400);
    await page.waitForTimeout(1000);
  });

  test('band ends exactly at the fold on common desktop heights', async ({ page }) => {
    for (const [w, h] of [[1280, 889], [1440, 900], [1920, 1080]]) {
      const m = await measure(page, w, h);
      expect(Math.abs(m.bandBottom - h), `band bottom at ${w}x${h}`).toBeLessThanOrEqual(2);
      expect(m.scrollH, `no scroll at ${w}x${h}`).toBeLessThanOrEqual(h + 1);
    }
  });

  test('hero grows to fill tall screens with no gap below the band', async ({ page }) => {
    const m = await measure(page, 2560, 1440);
    expect(Math.abs(m.bandBottom - 1440)).toBeLessThanOrEqual(2);
    expect(m.heroH).toBeGreaterThan(941);
    expect(m.scrollH).toBeLessThanOrEqual(1441);
  });

  test('short desktop screens scroll with the band directly under the hero', async ({ page }) => {
    const m = await measure(page, 1440, 800);
    expect(m.scrollH).toBeGreaterThan(800);
    expect(Math.abs(m.bandTop - m.heroBottom)).toBeLessThanOrEqual(1);
  });

  test('below 1280px wide the fill does not apply', async ({ page }) => {
    const wrapper = page.locator('.council-page_wrapper');
    await expect(wrapper).toHaveCount(1);
    for (const [w, h] of [[1024, 1000], [375, 812]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      const minH = await wrapper.evaluate((el) => getComputedStyle(el).minHeight);
      expect(minH, `wrapper min-height at ${w}x${h}`).not.toBe(`${h}px`);
    }
    const m = await measure(page, 375, 812);
    expect(m.scrollW).toBeLessThanOrEqual(375);
  });

  test('phone does not overlap the card at the smallest fitting size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 889 });
    await page.waitForTimeout(300);
    const phone = await page.locator('.council-hero_phone').boundingBox();
    const card = await page.locator('.council-hero_card').boundingBox();
    expect(phone.x).toBeGreaterThanOrEqual(card.x + card.width - 8);
  });

  test('no console errors from page code', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !THIRD_PARTY.test(msg.location()?.url || '') && !THIRD_PARTY.test(msg.text())) {
        errors.push(msg.text());
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
