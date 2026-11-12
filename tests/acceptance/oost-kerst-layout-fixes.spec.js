// Acceptance tests for oost-kerst-layout-fixes: both special-times lists use hours_list is-medium and fit one line per row at 992 and 1280 px, the footer bottom sits on one row without a spacer, and the footer carries no Kerstdeal pointer.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const SPECIAL = {
  '/': '.section_home-feestdagen .hours_list',
  '/en': '.section_home-feestdagen .hours_list',
  '/afhalen': '#feestdagen .hours_list',
  '/en/afhalen': '#feestdagen .hours_list',
};
const WIDTHS = [992, 1280];
const EN_DAYS = [
  'Wed 23 Dec',
  'Thu 24 Dec',
  'Fri 25 Dec',
  'Sat 26 Dec',
  'Thu 31 Dec',
  'Fri 1 Jan',
];
const EN_WRAP_EXCEPTION = 'Wed 23 Dec';

async function goto(page, path, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
}

test.describe('oost-kerst-layout-fixes', () => {
  for (const [path, selector] of Object.entries(SPECIAL)) {
    for (const width of WIDTHS) {
      test.describe(`${path} at ${width}px`, () => {
        let errors;

        test.beforeEach(async ({ page }) => {
          errors = [];
          page.on('pageerror', (err) => errors.push(err.message));
          await goto(page, path, width);
        });

        test(`special-times list on ${path} uses is-medium at ${width}`, async ({
          page,
        }) => {
          const list = page.locator(selector);
          await expect(list).toHaveCount(1);
          await expect(list).toHaveClass(/\bis-medium\b/);
          await expect(list).not.toHaveClass(/\bis-large\b/);
        });

        test(`special-times rows on ${path} stay on one line at ${width}`, async ({
          page,
        }) => {
          const wrapped = await page.$$eval(`${selector} .hours_row`, (rows) =>
            rows
              .filter((r) =>
                [...r.children].some((c) => {
                  const cs = getComputedStyle(c);
                  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
                  return c.getBoundingClientRect().height > lh * 1.5;
                }),
              )
              .map((r) => r.querySelector('.hours_day')?.textContent.trim() || ''),
          );
          expect(wrapped.filter((day) => day !== EN_WRAP_EXCEPTION)).toEqual([]);
        });

        if (path.startsWith('/en')) {
          test(`EN special rows on ${path} drop the holiday names`, async ({ page }) => {
            const days = await page.$$eval(`${selector} .hours_day`, (els) =>
              els.map((e) => e.textContent.trim()),
            );
            expect(days).toEqual(EN_DAYS);
          });
        }

        test(`footer on ${path} carries no Kerstdeal pointer`, async ({ page }) => {
          const footer = page.locator('.footer_component');
          await expect(footer).not.toContainText(/kerstdeal|christmas deal/i);
          await expect(footer.locator('a[href$="#feestdagen"]')).toHaveCount(0);
        });

        test(`no console errors on ${path}`, async () => {
          expect(errors).toEqual([]);
        });
      });
    }
  }

  test('special-times lists share one type style', async ({ page }) => {
    const styles = [];
    for (const [path, selector] of Object.entries(SPECIAL)) {
      await goto(page, path, 1280);
      styles.push(
        await page.$eval(selector, (list) => {
          const row = getComputedStyle(list.querySelector('.hours_row'));
          return {
            fontSize: row.fontSize,
            fontWeight: row.fontWeight,
            maxWidth: getComputedStyle(list).maxWidth,
          };
        }),
      );
    }
    for (const s of styles)
      expect(s).toEqual({ fontSize: '18px', fontWeight: '500', maxWidth: '448px' });
  });

  for (const path of Object.keys(SPECIAL)) {
    test(`footer bottom on ${path} has no spacer and sits on one row at 1280 px`, async ({
      page,
    }) => {
      await goto(page, path, 1280);
      await expect(page.locator('.footer_bottom .spacer-xxsmall')).toHaveCount(0);
      const tops = await page.$$eval('.footer_bottom > p', (ps) =>
        ps.map((p) => p.getBoundingClientRect().top),
      );
      expect(tops.length).toBe(2);
      expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(8);
    });
  }

  test('regular hours lists keep their classes', async ({ page }) => {
    await goto(page, '/', 1280);
    const homeRegular = page.locator(
      '.hours_list:not(.section_home-feestdagen .hours_list):not(.footer_component .hours_list)',
    );
    await expect(homeRegular).toHaveCount(1);
    await expect(homeRegular).toHaveClass(/\bis-large\b/);
    await goto(page, '/afhalen', 1280);
    await expect(
      page
        .locator('.section_afhalen-tijden .hours_list:not(#feestdagen .hours_list)')
        .first(),
    ).toHaveClass(/\bis-large\b/);
    await expect(page.locator('.footer_component .hours_list')).not.toHaveClass(
      /\bis-medium\b/,
    );
  });
});
