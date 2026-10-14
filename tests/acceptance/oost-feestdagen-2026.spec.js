// Acceptance tests for oost-feestdagen-2026: the Christmas and New Year takeaway notice on /afhalen, home and footer pointers, dated schema hours that match the visible dates, and the llms.txt line; skipped until OOST_FEESTDAGEN=1, removal checks until OOST_FEESTDAGEN_REMOVED=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const MAIN = ['/', '/afhalen', '/catering', '/en', '/en/afhalen', '/en/catering'];
const SPECIAL_DATES = ['2026-12-25', '2026-12-26', '2026-12-31', '2027-01-01'];
const VISIBLE_DATES = [/25 dec/i, /26 dec/i, /31 dec/i, /1 jan/i];
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const LOCALES = {
  nl: {
    afhalen: '/afhalen',
    home: '/',
    anchor: '/afhalen#feestdagen',
    heading: /kerst/i,
    special: /15-17/g,
    takeawayOnly: /alleen afhalen/i,
    normalDays: [/sinterklaas/i, /kerstavond/i],
  },
  en: {
    afhalen: '/en/afhalen',
    home: '/en',
    anchor: '/en/afhalen#feestdagen',
    heading: /christmas/i,
    special: /15:00–17:00/g,
    takeawayOnly: /takeaway only/i,
    normalDays: [/sinterklaas/i, /christmas eve/i],
  },
};

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
}

async function jsonLd(page) {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent));
  return blocks.flatMap((b) => {
    const parsed = JSON.parse(b);
    return parsed['@graph'] || [parsed];
  });
}

async function restaurantHours(page) {
  const restaurant = (await jsonLd(page)).find((n) => n['@type'] === 'Restaurant');
  expect(restaurant, 'Restaurant node').toBeTruthy();
  return restaurant.openingHoursSpecification || [];
}

function dated(hours) {
  return hours.filter((h) => h.validFrom);
}

async function anchorLinks(page, scope, anchor) {
  return page.$$eval(
    `${scope} a[href]`,
    (els, target) => els.map((a) => a.getAttribute('href')).filter((h) => h.endsWith(target)),
    anchor,
  );
}

test.describe('oost-feestdagen-2026', () => {
  test.skip(!process.env.OOST_FEESTDAGEN, 'Set OOST_FEESTDAGEN=1 once the feestdagen block is published');

  for (const [lang, L] of Object.entries(LOCALES)) {
    test.describe(`${lang} takeaway page`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await goto(page, L.afhalen);
      });

      test('takeaway page shows the feestdagen block with a Christmas heading', async ({ page }) => {
        const block = page.locator('.section_afhalen-tijden #feestdagen');
        await expect(block).toBeVisible();
        await expect(block.locator('h3')).toHaveText(L.heading);
      });

      test('feestdagen block lists the four takeaway-only days with 15 to 17 hours', async ({ page }) => {
        const block = page.locator('#feestdagen');
        const text = await block.innerText();
        await expect(block.locator('.hours_row')).toHaveCount(6);
        for (const date of VISIBLE_DATES) expect(text).toMatch(date);
        expect(text.match(L.special)?.length).toBe(4);
        expect(text).toMatch(L.takeawayOnly);
      });

      test('feestdagen block names Sinterklaas and Christmas Eve as normal days', async ({ page }) => {
        const text = await page.locator('#feestdagen').innerText();
        for (const day of L.normalDays) expect(text).toMatch(day);
        expect(text).toMatch(/5 dec/i);
        expect(text).toMatch(/24 dec/i);
      });

      test('feestdagen block gives the phone number to pre-order', async ({ page }) => {
        expect(await page.locator('#feestdagen').innerText()).toContain('023 785 1562');
        await expect(page.locator('.section_afhalen-tijden a[href="tel:+31237851562"]').first()).toBeAttached();
      });

      test('no console errors', async () => {
        expect(errors).toEqual([]);
      });
    });

    test.describe(`${lang} home`, () => {
      test.beforeEach(async ({ page }) => {
        await goto(page, L.home);
      });

      test('home hours block links to the feestdagen anchor in its own locale', async ({ page }) => {
        const links = await anchorLinks(page, '.section_home-vanavond', L.anchor);
        expect(links.length).toBeGreaterThan(0);
      });

      test('home JSON-LD has four dated special-hours entries and three regular ones', async ({ page }) => {
        const hours = await restaurantHours(page);
        const special = dated(hours);
        const regular = hours.filter((h) => !h.validFrom);
        expect(regular).toHaveLength(3);
        expect(special.map((h) => h.validFrom).sort()).toEqual(SPECIAL_DATES);
        for (const h of special) {
          expect(h.validThrough).toBe(h.validFrom);
          expect(h.opens).toBe('15:00');
          expect(h.closes).toBe('17:00');
        }
      });

      test('Tuesday never appears in the schema hours', async ({ page }) => {
        const days = (await restaurantHours(page)).flatMap((h) => h.dayOfWeek || []);
        expect(days).not.toContain('Tuesday');
      });
    });
  }

  test('English takeaway page uses 24-hour times and no Dutch', async ({ page }) => {
    await goto(page, '/en/afhalen');
    const text = await page.locator('#feestdagen').innerText();
    expect(text).not.toMatch(/\b[0-9]{1,2} ?[AP]M\b/);
    expect(text).not.toMatch(/alleen afhalen|gesloten|bel /i);
  });

  test('special hours in the schema match the visible dates on the takeaway page', async ({ page }) => {
    await goto(page, '/');
    const special = dated(await restaurantHours(page));
    await goto(page, '/afhalen');
    const text = await page.locator('#feestdagen').innerText();
    for (const h of special) {
      const [, m, d] = h.validFrom.split('-').map(Number);
      expect(text).toMatch(new RegExp(`\\b${d} ${MONTHS[m - 1]}`, 'i'));
    }
  });

  for (const path of MAIN) {
    test(`footer links to the feestdagen anchor in its own locale (${path})`, async ({ page }) => {
      await goto(page, path);
      const anchor = path.startsWith('/en') ? LOCALES.en.anchor : LOCALES.nl.anchor;
      const links = await anchorLinks(page, '.footer_component', anchor);
      expect(links.length).toBeGreaterThan(0);
    });
  }

  test('llms.txt carries the holiday line', async ({ request }) => {
    const res = await request.get(`${BASE}/llms.txt`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/takeaway only 15:00–17:00/);
  });
});

test.describe('oost-feestdagen-2026 removal', () => {
  test.skip(!process.env.OOST_FEESTDAGEN_REMOVED, 'Set OOST_FEESTDAGEN_REMOVED=1 after the 2 Jan removal is published');

  for (const path of MAIN) {
    test(`after removal: no feestdagen block or pointers (${path})`, async ({ page }) => {
      await goto(page, path);
      await expect(page.locator('#feestdagen')).toHaveCount(0);
      const links = await page.$$eval('a[href]', (els) =>
        els.map((a) => a.getAttribute('href')).filter((h) => h.endsWith('#feestdagen')),
      );
      expect(links).toEqual([]);
    });
  }

  for (const home of ['/', '/en']) {
    test(`after removal: no dated schema entries (${home})`, async ({ page }) => {
      await goto(page, home);
      const hours = await restaurantHours(page);
      expect(dated(hours)).toEqual([]);
      expect(hours).toHaveLength(3);
    });
  }
});
