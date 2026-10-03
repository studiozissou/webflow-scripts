// Acceptance tests for oost-faq-cms: FAQ sections render from the CMS, only the first item starts open, faq-accordion.js animates open and close, and FAQPage schema comes from microdata on the list; skipped until OOST_FAQ_CMS=1.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://oosteten.webflow.io';
const PAGES = [
  { path: '/', count: 9 },
  { path: '/afhalen', count: 7 },
  { path: '/catering', count: 5 },
  { path: '/en/', count: 9 },
  { path: '/en/afhalen', count: 7 },
  { path: '/en/catering', count: 5 },
];
const LIST = '.faq_list';
const ITEM = `${LIST} .w-dyn-item`;
const DETAILS = `${ITEM} details.faq_item`;
const SUMMARY = `${DETAILS} > summary`;

test.skip(
  process.env.OOST_FAQ_CMS !== '1',
  'set OOST_FAQ_CMS=1 once the CMS FAQ is on staging',
);

async function load(page, path) {
  await page.goto(BASE + path);
  await page.waitForFunction(
    () => document.documentElement.classList.contains('faq-ready'),
    null,
    { timeout: 15_000 },
  );
  await page.locator(LIST).first().scrollIntoViewIfNeeded();
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function itemState(page, index) {
  return page
    .locator(DETAILS)
    .nth(index)
    .evaluate((el) => ({
      open: el.hasAttribute('open'),
      height: el.getBoundingClientRect().height,
      summary: el.querySelector('summary').getBoundingClientRect().height,
      animations: el.getAnimations({ subtree: true }).length,
    }));
}

async function fullHeight(page, index) {
  return page
    .locator(DETAILS)
    .nth(index)
    .evaluate((el) => {
      const clone = el.cloneNode(true);
      clone.setAttribute('open', '');
      clone.style.cssText =
        'position:absolute;visibility:hidden;height:auto;width:' + el.offsetWidth + 'px';
      el.parentNode.appendChild(clone);
      const h = clone.getBoundingClientRect().height;
      clone.remove();
      return h;
    });
}

test.describe('oost-faq-cms', () => {
  for (const { path, count } of PAGES) {
    test.describe(path, () => {
      test(`${path}: FAQ renders from CMS with the expected count`, async ({ page }) => {
        await load(page, path);
        await expect(page.locator(ITEM)).toHaveCount(count);
        await expect(page.locator(DETAILS)).toHaveCount(count);
      });

      test(`${path}: only the first item is open after init`, async ({ page }) => {
        await load(page, path);
        const open = await page
          .locator(DETAILS)
          .evaluateAll((els) => els.map((el) => el.hasAttribute('open')));
        expect(open[0]).toBe(true);
        expect(open.slice(1).every((v) => v === false)).toBe(true);
      });

      test(`${path}: microdata FAQPage has one Question per item with name and answer text`, async ({
        page,
      }) => {
        await load(page, path);
        const data = await page.evaluate(() => {
          const list = document.querySelector('[itemtype="https://schema.org/FAQPage"]');
          if (!list) return null;
          const questions = [
            ...list.querySelectorAll(
              '[itemprop="mainEntity"][itemtype="https://schema.org/Question"]',
            ),
          ];
          return questions.map((q) => ({
            name: q.querySelector('[itemprop="name"]')?.textContent.trim() || '',
            answer:
              q
                .querySelector(
                  '[itemprop="acceptedAnswer"][itemtype="https://schema.org/Answer"] [itemprop="text"]',
                )
                ?.textContent.trim() || '',
          }));
        });
        expect(data).not.toBeNull();
        expect(data).toHaveLength(count);
        for (const q of data) {
          expect(q.name.length).toBeGreaterThan(0);
          expect(q.answer.length).toBeGreaterThan(0);
        }
      });

      test(`${path}: no FAQPage left in JSON-LD`, async ({ page }) => {
        await load(page, path);
        const blocks = await page
          .locator('script[type="application/ld+json"]')
          .allTextContents();
        expect(blocks.some((b) => b.includes('"FAQPage"'))).toBe(false);
      });

      test(`${path}: no console errors`, async ({ page }) => {
        const errors = collectErrors(page);
        await load(page, path);
        await page.locator(SUMMARY).nth(1).click();
        await page.waitForTimeout(700);
        expect(errors).toEqual([]);
      });
    });
  }

  test('click opens an item with a height animation', async ({ page }) => {
    await load(page, '/');
    const before = await itemState(page, 1);
    const target = await fullHeight(page, 1);
    expect(before.open).toBe(false);
    await page.locator(SUMMARY).nth(1).click();
    await page.waitForTimeout(150);
    const mid = await itemState(page, 1);
    expect(mid.height).toBeGreaterThan(before.height + 1);
    expect(mid.height).toBeLessThan(target - 1);
    await page.waitForTimeout(500);
    const end = await itemState(page, 1);
    expect(end.open).toBe(true);
    expect(end.animations).toBe(0);
    expect(Math.abs(end.height - target)).toBeLessThan(2);
  });

  test('click again closes it after the animation', async ({ page }) => {
    await load(page, '/');
    const closed = await itemState(page, 1);
    await page.locator(SUMMARY).nth(1).click();
    await page.waitForTimeout(600);
    await page.locator(SUMMARY).nth(1).click();
    await page.waitForTimeout(100);
    expect((await itemState(page, 1)).open).toBe(true);
    await page.waitForTimeout(450);
    const end = await itemState(page, 1);
    expect(end.open).toBe(false);
    expect(end.animations).toBe(0);
    expect(Math.abs(end.height - closed.height)).toBeLessThan(2);
  });

  test('rapid double click ends in a consistent state', async ({ page }) => {
    await load(page, '/');
    const closed = await itemState(page, 2);
    await page.locator(SUMMARY).nth(2).click();
    await page.waitForTimeout(80);
    await page.locator(SUMMARY).nth(2).click();
    await page.waitForTimeout(700);
    const end = await itemState(page, 2);
    expect(end.animations).toBe(0);
    expect(end.open).toBe(false);
    expect(Math.abs(end.height - closed.height)).toBeLessThan(2);
  });

  test('Enter and Space on the summary toggle the item', async ({ page }) => {
    await load(page, '/');
    await page.locator(SUMMARY).nth(3).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    expect((await itemState(page, 3)).open).toBe(true);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    expect((await itemState(page, 3)).open).toBe(false);
  });

  test('reduced motion toggles instantly with no animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, '/');
    await page.locator(SUMMARY).nth(1).click();
    const s = await itemState(page, 1);
    expect(s.open).toBe(true);
    expect(s.animations).toBe(0);
  });

  test('without JS every item is open (Designer and no-JS fallback)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE + '/');
    const open = await page
      .locator(DETAILS)
      .evaluateAll((els) => els.map((el) => el.hasAttribute('open')));
    expect(open.length).toBe(9);
    expect(open.every(Boolean)).toBe(true);
    await expect(page.locator(`${ITEM}:nth-child(2) .faq_answer-wrap`)).toBeVisible();
    await context.close();
  });

  test('EN pages show English questions', async ({ page }) => {
    await load(page, '/en/');
    await expect(page.locator(`${ITEM} .faq_question`).first()).toHaveText(
      /reservation/i,
    );
    await load(page, '/');
    await expect(page.locator(`${ITEM} .faq_question`).first()).toHaveText(/reserveren/i);
  });

  test('home group answer links to catering (NL /catering, EN /en/catering)', async ({
    page,
  }) => {
    await load(page, '/');
    await expect(page.locator(`${ITEM} .faq_answer a[href$="/catering"]`)).toHaveCount(1);
    await load(page, '/en/');
    await expect(page.locator(`${ITEM} .faq_answer a[href$="/en/catering"]`)).toHaveCount(
      1,
    );
  });

  test('faq-accordion.js loads once through the pinned loader', async ({ page }) => {
    await load(page, '/');
    const srcs = await page
      .locator('script[src*="faq-accordion.js"]')
      .evaluateAll((els) => els.map((el) => el.src));
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toMatch(
      /webflow-scripts@oost-v\d+\.\d+\.\d+\/projects\/oost\/faq-accordion\.js$/,
    );
    expect(await page.evaluate(() => typeof window.OOST?.faq?.init)).toBe('function');
  });

  test('FAQ section has no serious axe violations', async ({ page }) => {
    await load(page, '/');
    const results = await new AxeBuilder({ page }).include(LIST).analyze();
    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact),
    );
    expect(serious.map((v) => v.id)).toEqual([]);
  });
});
