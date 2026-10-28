// Acceptance tests for rolfing-template-2a: the upgraded Rolfing Pages template renders explainers unchanged and a filled landing fixture with every block; skipped until ROLFING_TEMPLATE=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const FOLDER = process.env.ROLFING_FOLDER || 'what-is-rolfing';
const FIXTURE = process.env.ROLFING_FIXTURE || 'template-test';
const EXPLAINERS = [
  { path: `/en/${FOLDER}/procedure`, lang: 'en' },
  { path: `/nl/${FOLDER}/procedure`, lang: 'nl' },
  { path: `/en/${FOLDER}/who-is-rolfing-for`, lang: 'en' },
  { path: `/nl/${FOLDER}/de-wetenschap-en-ontwikkeling-van-rolfing`, lang: 'nl' },
];
const FIXTURES = [
  { path: `/en/${FOLDER}/${FIXTURE}`, lang: 'en' },
  { path: `/nl/${FOLDER}/${FIXTURE}`, lang: 'nl' },
];
const COPY = {
  en: { updated: /Last updated/i, symptoms: /Does this sound familiar\?/i },
  nl: { updated: /Laatst bijgewerkt/i, symptoms: /Herken je dit\?/i },
};

test.skip(
  !process.env.ROLFING_TEMPLATE,
  'Set ROLFING_TEMPLATE=1 once the template is rebuilt and the fixture is on staging',
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
}

test.describe('rolfing-template-2a', () => {
  for (const { path } of EXPLAINERS) {
    test.describe(`explainer ${path}`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = trackErrors(page);
        await open(page, path);
      });

      test('has one h1 and keeps the centred icon hero without a photo', async ({
        page,
      }) => {
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('.hero-secondary_image-wrapper')).toBeHidden();
        const display = await page
          .locator('.hero-secondary_component')
          .evaluate((el) => getComputedStyle(el).display);
        expect(display).not.toBe('grid');
      });

      test('landing-only blocks stay hidden', async ({ page }) => {
        for (const sel of ['.section_usp', '.section_about-janco', '.section_related'])
          await expect(page.locator(sel)).toBeHidden();
      });

      test('no visible section in main is empty', async ({ page }) => {
        const empty = await page.$$eval('main > section, main > div', (els) =>
          els
            .filter((el) => getComputedStyle(el).display !== 'none')
            .filter((el) => el.innerText.trim().length === 0 && !el.querySelector('img'))
            .map((el) => el.className),
        );
        expect(empty).toEqual([]);
      });

      test('no console errors', async ({ page }) => {
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]);
      });
    });
  }

  for (const { path, lang } of FIXTURES) {
    test.describe(`landing fixture ${path}`, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = trackErrors(page);
        await open(page, path);
      });

      test('hero puts the photo right of the heading on desktop, with alt text', async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        const wrapper = page.locator('.hero-secondary_image-wrapper');
        await expect(wrapper).toBeVisible();
        const h1 = await page.locator('h1').boundingBox();
        const img = await wrapper.boundingBox();
        expect(img.x).toBeGreaterThan(h1.x);
        const alt = await wrapper.locator('img').getAttribute('alt');
        expect(alt?.trim().length ?? 0).toBeGreaterThan(5);
        await expect(page.locator('h1')).toHaveCount(1);
      });

      test('hero stacks the photo under the heading on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        const h1 = await page.locator('h1').boundingBox();
        const img = await page.locator('.hero-secondary_image-wrapper').boundingBox();
        expect(img.y).toBeGreaterThan(h1.y);
      });

      test('shows intro, symptoms and the last-updated date', async ({ page }) => {
        await expect(page.locator('.hero-secondary_intro')).toBeVisible();
        await expect(page.getByText(COPY[lang].symptoms)).toBeVisible();
        await expect(page.locator('.symptoms_rich-text li').first()).toBeVisible();
        await expect(page.getByText(COPY[lang].updated)).toBeVisible();
      });

      test('shows the session and About Janco blocks', async ({ page }) => {
        await expect(page.locator('.section_usp')).toBeVisible();
        await expect(page.locator('.section_about-janco')).toBeVisible();
      });

      test('shows the bound testimonial instead of the slider', async ({ page }) => {
        await expect(page.locator('.section_testimonial-large blockquote')).toBeVisible();
        await expect(page.locator('.section_testimonials-slider')).toBeHidden();
      });

      test('FAQ is native details with Question and Answer microdata', async ({
        page,
      }) => {
        const items = page.locator('.faq_list details.faq_item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(3);
        await expect(
          page.locator('details.faq_item[itemtype="https://schema.org/Question"]'),
        ).toHaveCount(count);
        await expect(
          page.locator(
            '[itemprop="acceptedAnswer"][itemtype="https://schema.org/Answer"]',
          ),
        ).toHaveCount(count);
        await expect(items.first()).toHaveAttribute('open', '');
        await items.nth(1).locator('summary').click();
        await expect(items.nth(1)).toHaveAttribute('open', '');
      });

      test('related cards link to sibling pages in the same locale', async ({ page }) => {
        const hrefs = await page.$$eval('.related_item a[href]', (as) =>
          as.map((a) => a.getAttribute('href')),
        );
        expect(hrefs.length).toBeGreaterThanOrEqual(2);
        for (const h of hrefs)
          expect(h).toMatch(new RegExp(`^/${lang}/${FOLDER}/[a-z0-9-]+$`));
      });

      test('no console errors', async ({ page }) => {
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]);
      });
    });
  }
});
