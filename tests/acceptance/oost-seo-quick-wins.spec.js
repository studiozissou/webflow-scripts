// Acceptance tests for oost-seo-quick-wins: share images, English page schema, H1 wording, CMS menu microdata with bound prices, hasMenu linking, FAQ staying microdata, and the llms.txt email; skipped until OOST_SEO_QUICK_WINS=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const LIVE = 'https://www.oosteten.nl';
const PAGES = ['/', '/afhalen', '/catering', '/en', '/en/afhalen', '/en/catering'];
const MENU_PAGES = [
  { path: '/', lang: 'nl', firstDish: 'Nasi Campur' },
  { path: '/en', lang: 'en', firstDish: 'Nasi Campur' },
];

test.skip(!process.env.OOST_SEO_QUICK_WINS, 'Set OOST_SEO_QUICK_WINS=1 once the quick wins are published');

async function jsonLd(page) {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent));
  return blocks.map((b) => JSON.parse(b));
}

function nodes(blocks) {
  return blocks.flatMap((b) => b['@graph'] || [b]);
}

async function menuTree(page) {
  return page.evaluate(() => {
    const menu = document.querySelector('[itemtype="https://schema.org/Menu"]');
    if (!menu) return null;
    const text = (el) => (el ? (el.getAttribute('content') ?? el.textContent).trim() : null);
    const sections = [...menu.querySelectorAll('[itemprop="hasMenuSection"]')];
    const items = [...menu.querySelectorAll('[itemprop="hasMenuItem"]')].map((item) => {
      const offer = item.querySelector('[itemprop="offers"]');
      return {
        name: text(item.querySelector('[itemprop="name"]')),
        price: offer ? text(offer.querySelector('[itemprop="price"]')) : null,
        currency: offer ? text(offer.querySelector('[itemprop="priceCurrency"]')) : null,
        hasOffer: Boolean(offer),
        visible: item.innerText,
      };
    });
    const itemid = new URL(menu.getAttribute('itemid'), location.href).href;
    return { itemid, sections: sections.length, items };
  });
}

test.describe('oost-seo-quick-wins', () => {
  for (const path of PAGES) {
    test.describe(path, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      });

      test('every indexed page has a 1200x630 share image', async ({ page, request }) => {
        test.skip(!process.env.OOST_SHARE_CARD, 'Set OOST_SHARE_CARD=1 once the share card is uploaded');
        const src = await page.getAttribute('meta[property="og:image"]', 'content');
        expect(src, 'og:image').toBeTruthy();
        const res = await request.get(src);
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toMatch(/^image\//);
        const size = await page.evaluate(async (url) => {
          const img = new Image();
          img.src = url;
          await img.decode();
          return [img.naturalWidth, img.naturalHeight];
        }, src);
        expect(size).toEqual([1200, 630]);
      });

      test('no schema points at webflow.io', async ({ page }) => {
        const blocks = await jsonLd(page);
        expect(JSON.stringify(blocks)).not.toContain('webflow.io');
      });

      test('English pages carry English page schema', async ({ page }) => {
        const webPage = nodes(await jsonLd(page)).find((n) => n['@type'] === 'WebPage');
        expect(webPage, 'WebPage node').toBeTruthy();
        if (path.startsWith('/en')) {
          expect(webPage.url).toMatch(new RegExp(`^${LIVE}/en`));
          expect(webPage.inLanguage).toBe('en');
          expect(webPage.name).not.toMatch(/Indonesisch|Afhalen bij|Indonesische catering/);
        } else {
          expect(webPage.url).not.toMatch(/\/en(\/|$)/);
          expect(webPage.inLanguage).toBe('nl');
        }
      });

      test('no FAQPage JSON-LD, FAQ stays microdata', async ({ page }) => {
        const types = nodes(await jsonLd(page)).map((n) => n['@type']);
        expect(types).not.toContain('FAQPage');
        await expect(page.locator('[itemtype="https://schema.org/FAQPage"]')).toHaveCount(1);
      });

      test('no console errors', async () => {
        expect(errors).toEqual([]);
      });
    });
  }

  test('home H1 names Restaurant Oost (NL and EN)', async ({ page }) => {
    for (const path of ['/', '/en']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toContainText('Restaurant Oost');
    }
  });

  test('catering H1 names Haarlem (NL and EN)', async ({ page }) => {
    for (const path of ['/catering', '/en/catering']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toContainText('Haarlem');
    }
  });

  for (const { path, lang, firstDish } of MENU_PAGES) {
    test.describe(`menu ${path}`, () => {
      let tree;
      let restaurant;

      test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
        tree = await menuTree(page);
        restaurant = nodes(await jsonLd(page)).find((n) => n['@type'] === 'Restaurant');
      });

      test('menu microdata lists 9 sections, 36 dishes and 24 priced offers', async () => {
        expect(tree, 'Menu itemscope').not.toBeNull();
        expect(tree.sections).toBe(9);
        expect(tree.items).toHaveLength(36);
        expect(tree.items.filter((i) => i.hasOffer)).toHaveLength(24);
        expect(tree.items.some((i) => i.name === firstDish)).toBe(true);
      });

      test('offer prices match the visible menu prices', async () => {
        for (const item of tree.items.filter((i) => i.hasOffer)) {
          expect(item.currency, item.name).toBe('EUR');
          expect(item.price, item.name).toBeTruthy();
          const digits = item.price.replace(/[^\d]/g, '');
          expect(item.visible.replace(/[^\d]/g, ''), item.name).toContain(digits);
        }
      });

      test('English menu microdata uses English dish names', async () => {
        test.skip(lang !== 'en', 'English only');
        const names = tree.items.map((i) => i.name).join(' ');
        expect(names).toContain('Spekkoek with Ice Cream');
        expect(names).not.toContain('Spekkoek met IJs');
      });

      test('Restaurant hasMenu points at the menu itemid', async () => {
        const id = restaurant.hasMenu?.['@id'] ?? restaurant.hasMenu;
        expect(id).toBe(tree.itemid);
        expect(tree.itemid).toBe(lang === 'en' ? `${LIVE}/en#menu` : `${LIVE}/#menu`);
      });
    });
  }

  test('llms.txt has the correct email domain', async ({ request }) => {
    const body = await (await request.get(`${BASE}/llms.txt`)).text();
    expect(body).not.toContain('oosteeten');
    expect(body).toContain('info@oosteten.nl');
  });
});
