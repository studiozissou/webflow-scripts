// Acceptance tests for rolfing-landing-pages: /rolfing/ URLs, redirects from /what-is-rolfing/, SEO basics, FAQ microdata, JSON-LD types and claim wording; skipped until ROLFING_LANDING=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const LANDING = [
  { path: '/nl/rolfing/nekklachten', lang: 'nl' },
  { path: '/en/rolfing/neck-pain', lang: 'en' },
];
const MOVED = [
  { from: '/en/what-is-rolfing/procedure', to: '/en/rolfing/procedure' },
  { from: '/nl/what-is-rolfing/procedure', to: '/nl/rolfing/procedure' },
  {
    from: '/nl/what-is-rolfing/voor-wie-is-rolfing-bedoeld',
    to: '/nl/rolfing/voor-wie-is-rolfing-bedoeld',
  },
];
const BANNED = {
  en: [
    /pain[- ]free/i,
    /say goodbye/i,
    /\bheal(ing|s)?\b/i,
    /\btreatment\b/i,
    /\btherapy\b/i,
    /transformative/i,
  ],
  nl: [/pijnvrij/i, /genezing/i, /\bbehandeling\b/i, /-?therapie\b/i],
};

test.skip(
  !process.env.ROLFING_LANDING,
  'Set ROLFING_LANDING=1 once the first landing page is on staging',
);

async function jsonLdTypes(page) {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
    els.map((e) => e.textContent),
  );
  return blocks
    .map((b) => JSON.parse(b))
    .flatMap((b) => b['@graph'] || [b])
    .flatMap((n) => [].concat(n['@type']));
}

test.describe('rolfing-landing-pages', () => {
  test.describe('redirects', () => {
    for (const { from, to } of MOVED) {
      test(`${from} redirects once to ${to}`, async ({ request }) => {
        const res = await request.get(`${BASE}${from}`, { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(new URL(res.headers().location, BASE).pathname).toBe(to);
        const next = await request.get(`${BASE}${to}`, { maxRedirects: 0 });
        expect(next.status()).toBe(200);
      });
    }

    test('static what-is-rolfing page is not redirected', async ({ request }) => {
      for (const path of ['/en/what-is-rolfing', '/nl/what-is-rolfing']) {
        const res = await request.get(`${BASE}${path}`, { maxRedirects: 0 });
        expect(res.status()).toBe(200);
      }
    });
  });

  for (const { path, lang } of LANDING) {
    test.describe(path, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        const res = await page.goto(`${BASE}${path}`, {
          waitUntil: 'networkidle',
          timeout: 45000,
        });
        expect(res.status()).toBe(200);
      });

      test('has one h1, a branded title and a description of the right length', async ({
        page,
      }) => {
        await expect(page.locator('h1')).toHaveCount(1);
        const title = await page.title();
        expect(title.length).toBeGreaterThanOrEqual(30);
        expect(title.length).toBeLessThanOrEqual(60);
        expect(title).toMatch(/Rolfing Amsterdam$/);
        const desc = await page.getAttribute('meta[name="description"]', 'content');
        expect(desc?.length ?? 0).toBeGreaterThanOrEqual(70);
        expect(desc.length).toBeLessThanOrEqual(160);
      });

      test('FAQ has 3 to 5 items with microdata and opens', async ({ page }) => {
        const items = page.locator('.faq_list details.faq_item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(5);
        await expect(
          page.locator('[itemtype="https://schema.org/Question"]'),
        ).toHaveCount(count);
        const second = items.nth(1);
        await second.locator('summary').click();
        await expect(second).toHaveAttribute('open', '');
      });

      test('hero photo has alt text', async ({ page }) => {
        const alt = await page
          .locator('.section_hero-secondary img')
          .last()
          .getAttribute('alt');
        expect(alt?.trim().length ?? 0).toBeGreaterThan(5);
        expect(alt).not.toMatch(/decorative/i);
      });

      test('JSON-LD has WebPage and BreadcrumbList and no medical types', async ({
        page,
      }) => {
        const types = await jsonLdTypes(page);
        expect(types).toContain('WebPage');
        expect(types).toContain('BreadcrumbList');
        expect(types.filter((t) => /^Medical/.test(t))).toEqual([]);
      });

      test('no banned outcome claims in page text', async ({ page }) => {
        const text = await page.locator('main, .main-wrapper').first().innerText();
        for (const re of BANNED[lang]) expect(text, `matched ${re}`).not.toMatch(re);
      });

      test('shows a last-updated date and a Book Session CTA', async ({ page }) => {
        const label = lang === 'nl' ? /Laatst bijgewerkt/i : /Last updated/i;
        await expect(page.getByText(label)).toBeVisible();
        const hrefs = await page.$$eval('a[href]', (as) =>
          as.map((a) => a.getAttribute('href')),
        );
        expect(hrefs.some((h) => /book-session/.test(h))).toBe(true);
      });

      test('no console errors', async ({ page }) => {
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]);
      });
    });
  }
});
