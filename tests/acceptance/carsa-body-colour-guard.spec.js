/**
 * Acceptance tests for carsa-body-colour-guard
 *
 * The VDP image carousel (d1kcoelx4vkza6.cloudfront.net/bundle.js) is a
 * Material UI widget whose CssBaseline injects `body { color: rgba(0,0,0,.87) }`
 * at runtime, beating Webflow's own `body` rule by source order. A site-wide
 * `html body { color: var(--_primitives---carsa-brand-purple) }` rule in the
 * head custom code wins on specificity. These tests guard that rule.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const SLUG = 'carsa-body-colour-guard';
const STAGING_URL = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';
const VDP_PATH = '/vehicles/used/cf23rpx';
const BRAND_PURPLE = 'rgb(81, 30, 98)';

async function loadPage(page, path) {
  await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', {
    timeout: 20_000,
  });
}

async function bodyColor(page) {
  return page.evaluate(() => getComputedStyle(document.body).color);
}

async function guardRulePresent(page) {
  return page.evaluate(() =>
    [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some(
          (r) =>
            r.selectorText === 'html body' && /carsa-brand-purple/.test(r.style.color),
        );
      } catch {
        return false;
      }
    }),
  );
}

test.describe(`${SLUG} — site-wide guard rule`, () => {
  test('head custom code ships the html body colour guard', async ({ page }) => {
    await loadPage(page, '/');
    expect(await guardRulePresent(page)).toBe(true);
  });

  test('homepage body text is brand purple', async ({ page }) => {
    await loadPage(page, '/');
    expect(await bodyColor(page)).toBe(BRAND_PURPLE);
  });
});

test.describe(`${SLUG} — VDP with Material UI carousel`, () => {
  test('body text stays brand purple after the carousel mounts', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    await page.waitForSelector('#carsa-carousel-root [class*="Mui"]', {
      timeout: 15_000,
    });
    expect(await bodyColor(page)).toBe(BRAND_PURPLE);
  });

  test('paragraph text inherits brand purple, not the MUI default', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    await page.waitForSelector('#carsa-carousel-root [class*="Mui"]', {
      timeout: 15_000,
    });
    const color = await page.evaluate(() => {
      const p = document.querySelector('.details_component p');
      return p ? getComputedStyle(p).color : null;
    });
    expect(color).toBe(BRAND_PURPLE);
  });
});
