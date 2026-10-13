// Acceptance tests for oost-menu-final-prices: the CMS menu on NL and EN matches Roos's final food menu (5 Oct), every dish shows a price with matching Offer microdata, and both locales list the same dishes; skipped until OOST_MENU_FINAL=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://oosteten.webflow.io';
const EXPECTED_DISHES = Number(process.env.OOST_MENU_DISH_COUNT || 36);
const ITEM = '#menukaart .dish_item';

test.skip(
  process.env.OOST_MENU_FINAL !== '1',
  'set OOST_MENU_FINAL=1 once the final menu is published',
);

async function readMenu(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.locator('#menukaart').scrollIntoViewIfNeeded();
  return page.locator(ITEM).evaluateAll((items) =>
    items.map((el) => ({
      name: el.querySelector('.dish_name')?.textContent.trim() ?? '',
      priceText: el.querySelector('.dish_price')?.textContent.trim() ?? '',
      priceAttr: el.querySelector('[itemprop="price"]')?.getAttribute('content') ?? null,
      hasOffer: !!el.querySelector('.dish_offer'),
    })),
  );
}

function euros(text) {
  const m = text.replace(/\s/g, '').match(/(\d+)[,.](\d{2})/);
  return m ? `${m[1]}.${m[2]}` : null;
}

test.describe('oost-menu-final-prices', () => {
  for (const path of ['/', '/en']) {
    test(`${path} lists the expected number of dishes`, async ({ page }) => {
      const dishes = await readMenu(page, path);
      expect(dishes).toHaveLength(EXPECTED_DISHES);
    });

    test(`${path} shows a price with matching Offer microdata on every dish`, async ({ page }) => {
      const dishes = await readMenu(page, path);
      for (const d of dishes) {
        expect(d.hasOffer, `${d.name} has dish_offer`).toBe(true);
        const shown = euros(d.priceText);
        expect(shown, `${d.name} visible price`).not.toBeNull();
        if (d.priceAttr !== null) expect(Number(d.priceAttr).toFixed(2), `${d.name} microdata price`).toBe(shown);
      }
    });
  }

  test('NL and EN show the same prices in the same order', async ({ page }) => {
    const nl = (await readMenu(page, '/')).map((d) => euros(d.priceText));
    const en = (await readMenu(page, '/en')).map((d) => euros(d.priceText));
    expect(en).toEqual(nl);
  });

  test('Restaurant hasMenu JSON-LD is still valid JSON', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const blocks = [...(await res.text()).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(() => JSON.parse(b[1])).not.toThrow();
  });

  test('menu pages load without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const path of ['/', '/en']) await readMenu(page, path);
    expect(errors).toEqual([]);
  });
});
