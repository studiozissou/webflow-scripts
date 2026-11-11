// Acceptance tests for rolfing-landing-sections: landing pages give each H2 its own copied site section (blocks 1-3 and a note), hide the rich-text content section, and leave explainers unchanged; skipped until ROLFING_SECTIONS=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const FOLDER = process.env.ROLFING_FOLDER || 'what-is-rolfing';

const LANDINGS = [
  {
    path: `/en/${FOLDER}/knee-hip-ankle-pain`,
    lang: 'en',
    headings: [
      /Why look further than the knee\?/i,
      /Do you run or play sport\?/i,
      /What if the pain has been there for a long time\?/i,
      /When should you see your doctor first\?/i,
    ],
  },
  {
    path: `/nl/${FOLDER}/knie-heup-enkelklachten`,
    lang: 'nl',
    headings: [
      /Waarom verder kijken dan je knie\?/i,
      /Loop je hard of sport je\?/i,
      /En als de pijn er al lang is\?/i,
      /Wanneer eerst naar de huisarts\?/i,
    ],
  },
];
const EXPLAINERS = [
  `/en/${FOLDER}/procedure`,
  `/nl/${FOLDER}/procedure`,
  `/en/${FOLDER}/who-is-rolfing-for`,
  `/en/${FOLDER}/science-and-development`,
];
const BLOCKS = [
  '.section_experience',
  '.section_discover',
  '.section_rolfing-can-help-with',
  '.section_note',
];

test.skip(
  !process.env.ROLFING_SECTIONS,
  'Set ROLFING_SECTIONS=1 once the landing sections are on staging',
);

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, {
    waitUntil: 'networkidle',
    timeout: 45000,
  });
  expect(res.status()).toBe(200);
  await page.waitForTimeout(1000);
}

test.describe('rolfing-landing-sections', () => {
  for (const { path, lang, headings } of LANDINGS) {
    test.describe(`landing ${path}`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = trackErrors(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await open(page, path);
      });

      test('landing page gives each slot its own section in order', async ({ page }) => {
        const tops = [];
        for (const [i, sel] of BLOCKS.entries()) {
          const section = page.locator(sel);
          await expect(section).toHaveCount(1);
          await expect(section).toBeVisible();
          await expect(section.locator('h2').first()).toHaveText(headings[i]);
          tops.push((await section.boundingBox()).y);
        }
        const symptoms = (await page.locator('.section_symptoms').boundingBox()).y;
        const usp = (await page.locator('.section_usp').boundingBox()).y;
        expect(tops[0]).toBeGreaterThan(symptoms);
        expect([...tops].sort((a, b) => a - b)).toEqual(tops);
        expect(tops[tops.length - 1]).toBeLessThan(usp);
        await expect(page.locator('h1')).toHaveCount(1);
      });

      test('landing page hides the rich-text content section and shows last updated in the hero', async ({
        page,
      }) => {
        await expect(page.locator('.section_content')).toBeHidden();
        await expect(page.locator('.section_hero-secondary .content_updated')).toBeVisible();
      });

      test('blocks 1 and 2 have a photo with alt text and both booking links', async ({
        page,
      }) => {
        for (const sel of BLOCKS.slice(0, 2)) {
          const section = page.locator(sel);
          const img = section.locator('img.image-cover').first();
          await expect(img).toBeVisible();
          const alt = await img.getAttribute('alt');
          expect(alt?.trim().length ?? 0).toBeGreaterThan(5);
          await expect(section.locator(`a[href$="/${lang}/book-session"]`)).toHaveCount(1);
          await expect(section.locator(`a[href$="/${lang}/contact"]`)).toHaveCount(1);
        }
      });

      test('block without a photo has no empty image box and one column', async ({ page }) => {
        const section = page.locator('.section_rolfing-can-help-with');
        await expect(section.locator('.rolfing-can-help-with_image-wrapper')).toBeHidden();
        const ratio = await section.evaluate((el) => {
          const c = el.querySelector('.rolfing-can-help-with_content').getBoundingClientRect();
          const g = el.querySelector('.rolfing-can-help-with_component').getBoundingClientRect();
          return c.width / g.width;
        });
        expect(ratio).toBeGreaterThan(0.6);
      });

      test('block 3 without a photo: no border, heading and text side by side, bottoms aligned', async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const section = page.locator('.section_rolfing-can-help-with');
        const m = await section.evaluate((el) => {
          const c = el.querySelector('.rolfing-can-help-with_content');
          const h = c.querySelector('h2').getBoundingClientRect();
          const t = c.querySelector('.text-rich-text').getBoundingClientRect();
          return {
            border: getComputedStyle(c).borderTopWidth,
            sideBySide: h.right <= t.left,
            bottomGap: Math.abs(h.bottom - t.bottom),
          };
        });
        expect(m.border).toBe('0px');
        expect(m.sideBySide).toBe(true);
        expect(m.bottomGap).toBeLessThan(4);
      });

      test('adjacent sections never share a background colour', async ({ page }) => {
        const clashes = await page.$$eval('main > section, main > div', (els) => {
          const shown = els.filter(
            (el) => getComputedStyle(el).display !== 'none' && el.offsetHeight > 0,
          );
          const out = [];
          for (let i = 1; i < shown.length; i++) {
            const a = getComputedStyle(shown[i - 1]).backgroundColor;
            const b = getComputedStyle(shown[i]).backgroundColor;
            if (a === b && a !== 'rgba(0, 0, 0, 0)')
              out.push(`${shown[i - 1].className} | ${shown[i].className}`);
          }
          return out;
        });
        expect(clashes).toEqual([]);
      });

      test('no horizontal overflow at 375 px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test('no console errors on landing pages', async () => {
        expect(errors).toEqual([]);
      });
    });
  }

  for (const path of EXPLAINERS) {
    test.describe(`explainer ${path}`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = trackErrors(page);
        await open(page, path);
      });

      test('explainers show none of the new sections and keep their content and sidebar', async ({
        page,
      }) => {
        for (const sel of BLOCKS) await expect(page.locator(sel)).toBeHidden();
        await expect(page.locator('.section_content')).toBeVisible();
        await expect(page.locator('.content_newsletter')).toBeVisible();
      });

      test('no console errors on explainers', async () => {
        expect(errors).toEqual([]);
      });
    });
  }
});
