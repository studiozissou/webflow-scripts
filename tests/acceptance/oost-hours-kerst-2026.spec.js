// Acceptance tests for oost-hours-kerst-2026: the 17:00–21:00 hours everywhere, the lunch copy gone, the Christmas pre-order block on /afhalen with home and footer pointers, closed 24–26 Dec in the schema, and the llms.txt lines; removal checks run when OOST_KERST_REMOVED=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const MAIN = ['/', '/afhalen', '/catering', '/en', '/en/afhalen', '/en/catering'];
const NOT_FOUND = '/deze-pagina-bestaat-niet';
const CLOSED_DATES = ['2026-12-24', '2026-12-25', '2026-12-26'];
const OPEN_DAYS = ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const OLD_HOURS = /\b12-22\b|\b17-22\b|12:00\s*[–-]\s*22:00|17:00\s*[–-]\s*22:00|tot 22|to 22:00|\b10 PM\b|\b12 PM\b/i;

const LOCALES = {
  nl: {
    home: '/',
    afhalen: '/afhalen',
    catering: '/catering',
    anchor: '/afhalen#feestdagen',
    open: /^17-21$/,
    closedDay: /^dinsdag$/i,
    closed: /^gesloten$/i,
    heading: /kerst/i,
    deadline: /vóór 20 december/i,
    pickup: /23 of 24 december/i,
    window: /15:00 en 17:00/,
    closedDates: /24, 25 en 26 december/,
    dishes: [/rijsttafel oost/i, /vegetarische rijsttafel/i, /nasi tjampoer speciaal met vlees/i, /nasi tjampoer speciaal vegetarisch/i],
    bases: [/bami goreng/i, /nasi goreng/i, /witte rijst/i, /gele rijst/i],
    wine: /wijn/i,
    sunday: /17:00 tot 21:00/,
    lunchIntro: /^lunch met collega/im,
    eveningOnly: /pas 's avonds open/i,
  },
  en: {
    home: '/en',
    afhalen: '/en/afhalen',
    catering: '/en/catering',
    anchor: '/en/afhalen#feestdagen',
    open: /^17:00–21:00$/,
    closedDay: /^tuesday$/i,
    closed: /^closed$/i,
    heading: /christmas/i,
    deadline: /before 20 december/i,
    pickup: /23 or 24 december/i,
    window: /15:00 and 17:00/,
    closedDates: /24, 25 and 26 december/i,
    dishes: [/rijsttafel oost/i, /vegetarian rijsttafel/i, /nasi tjampoer speciaal with meat/i, /nasi tjampoer speciaal, vegetarian/i],
    bases: [/bami goreng/i, /nasi goreng/i, /white rice/i, /yellow rice/i],
    wine: /wine/i,
    sunday: /17:00 to 21:00/,
    lunchIntro: /^lunch with colleagues/im,
    eveningOnly: /only open in the evening|11:30 AM/i,
  },
};

const localeOf = (path) => (path.startsWith('/en') ? LOCALES.en : LOCALES.nl);

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

async function anchorLinks(page, scope, anchor) {
  return page.$$eval(
    `${scope} a[href]`,
    (els, target) => els.map((a) => a.getAttribute('href')).filter((h) => h.endsWith(target)),
    anchor,
  );
}

async function regularRows(page) {
  return page.$$eval('.hours_list:not(#feestdagen .hours_list) .hours_row', (rows) =>
    rows.map((r) => ({
      day: r.querySelector('.hours_day')?.textContent.trim() || '',
      time: r.querySelector('.hours_time')?.textContent.trim() || '',
    })),
  );
}

test.describe('oost-hours-kerst-2026', () => {
  for (const path of [...MAIN, NOT_FOUND]) {
    test.describe(`page ${path}`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await goto(page, path);
      });

      test('hours lists show 17 to 21 and Tuesday closed', async ({ page }) => {
        const L = localeOf(path);
        const rows = await regularRows(page);
        expect(rows.length).toBeGreaterThanOrEqual(7);
        for (const { day, time } of rows) {
          if (L.closedDay.test(day)) expect(time).toMatch(L.closed);
          else expect(time, day).toMatch(L.open);
        }
      });

      test('no old hours anywhere in the visible text', async ({ page }) => {
        expect(await page.locator('body').innerText()).not.toMatch(OLD_HOURS);
      });

      if (path !== NOT_FOUND) {
        test('footer links to the Christmas block in its own locale', async ({ page }) => {
          const links = await anchorLinks(page, '.footer_component', localeOf(path).anchor);
          expect(links.length).toBeGreaterThan(0);
        });
      }

      test('no console errors', async () => {
        expect(errors).toEqual([]);
      });
    });
  }

  for (const [lang, L] of Object.entries(LOCALES)) {
    test.describe(`${lang} takeaway page`, () => {
      test.beforeEach(async ({ page }) => {
        await goto(page, L.afhalen);
      });

      test('takeaway page shows the Christmas block with its heading', async ({ page }) => {
        const block = page.locator('.section_afhalen-tijden #feestdagen');
        await expect(block).toBeVisible();
        await expect(block.locator('h3')).toHaveText(L.heading);
        await expect(block.locator('.hours_row')).toHaveCount(4);
      });

      test('Christmas block gives the closed days, order deadline and pickup window', async ({ page }) => {
        const text = await page.locator('#feestdagen').innerText();
        expect(text).toMatch(L.closedDates);
        expect(text).toMatch(L.deadline);
        expect(text).toMatch(L.pickup);
        expect(text).toMatch(L.window);
      });

      test('Christmas block lists the four dishes and four bases and mentions wine', async ({ page }) => {
        const text = await page.locator('#feestdagen').innerText();
        for (const dish of L.dishes) expect(text).toMatch(dish);
        for (const base of L.bases) expect(text).toMatch(base);
        expect(text).toMatch(L.wine);
      });

      test('Christmas block gives the phone number to order', async ({ page }) => {
        expect(await page.locator('#feestdagen').innerText()).toContain('023 785 1562');
        await expect(page.locator('#feestdagen a[href="tel:+31237851562"]')).toHaveCount(1);
      });

      test('Sunday FAQ answer says 21:00', async ({ page }) => {
        expect(await page.locator('.faq_list').first().innerText()).toMatch(L.sunday);
      });

      test('takeaway page no longer offers lunch', async ({ page }) => {
        expect(await page.locator('body').innerText()).not.toMatch(L.lunchIntro);
      });
    });

    test.describe(`${lang} home`, () => {
      test.beforeEach(async ({ page }) => {
        await goto(page, L.home);
      });

      test('home links to the Christmas block in its own locale', async ({ page }) => {
        const links = await anchorLinks(page, '.section_home-vanavond', L.anchor);
        expect(links.length).toBeGreaterThan(0);
      });

      test('Sunday FAQ answer says 21:00', async ({ page }) => {
        expect(await page.locator('.faq_list').first().innerText()).toMatch(L.sunday);
      });

      test('home JSON-LD has the new regular hours and closed 24 to 26 December', async ({ page }) => {
        const hours = await restaurantHours(page);
        const regular = hours.filter((h) => !h.validFrom);
        const special = hours.filter((h) => h.validFrom);
        expect(hours).toHaveLength(4);
        expect(regular).toHaveLength(1);
        expect([...regular[0].dayOfWeek].sort()).toEqual([...OPEN_DAYS].sort());
        expect(regular[0].opens).toBe('17:00');
        expect(regular[0].closes).toBe('21:00');
        expect(special.map((h) => h.validFrom).sort()).toEqual(CLOSED_DATES);
        for (const h of special) {
          expect(h.validThrough).toBe(h.validFrom);
          expect(h.opens).toBe('00:00');
          expect(h.closes).toBe('00:00');
        }
      });

      test('Tuesday never appears in the schema hours', async ({ page }) => {
        const days = (await restaurantHours(page)).flatMap((h) => h.dayOfWeek || []);
        expect(days).not.toContain('Tuesday');
      });
    });

    test(`${lang} catering FAQ no longer says the restaurant is only open in the evening`, async ({ page }) => {
      await goto(page, L.catering);
      expect(await page.locator('body').innerText()).not.toMatch(L.eveningOnly);
    });
  }

  test('English Christmas block uses 24-hour times and no Dutch', async ({ page }) => {
    await goto(page, '/en/afhalen');
    const text = await page.locator('#feestdagen').innerText();
    expect(text).not.toMatch(/\b[0-9]{1,2}(:[0-9]{2})? ?[AP]M\b/);
    expect(text).not.toMatch(/afhalen|gesloten|bestel|kerstdag|witte|gele/i);
  });

  test('llms.txt carries the new hours and the Christmas line', async ({ request }) => {
    const res = await request.get(`${BASE}/llms.txt`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Hours: 17:00–21:00 every day except Tuesday/);
    expect(text).toMatch(/Christmas 2026: closed 24, 25 and 26 Dec/);
    expect(text).not.toMatch(/12:00–22:00|17:00–22:00/);
  });
});

test.describe('oost-hours-kerst-2026 removal', () => {
  test.skip(!process.env.OOST_KERST_REMOVED, 'Set OOST_KERST_REMOVED=1 after the 27 Dec removal is published');

  for (const path of MAIN) {
    test(`after removal: no Christmas block or pointers (${path})`, async ({ page }) => {
      await goto(page, path);
      await expect(page.locator('#feestdagen .hours_row')).toHaveCount(0);
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
      expect(hours.filter((h) => h.validFrom)).toEqual([]);
      expect(hours).toHaveLength(1);
    });
  }
});
