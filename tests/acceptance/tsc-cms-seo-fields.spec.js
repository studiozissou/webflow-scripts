import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

// Item pages sampled across the 5 templated collections that get dedicated SEO fields.
const SAMPLED_ITEMS = [
  '/products/etcs',
  '/products/pzb',
  '/services/etcs-retrofit-viability-assessment',
  '/services/first-in-class-homologation',
  '/railos-devices/ievc',
  '/railos-devices/gsm-r-frmcs-radio',
  '/projects/lineas-hld77',
  '/projects/skoda-regiojet',
  '/news/worlds-first-software-defined-etcs-certified',
  '/news/etcs-wins-railtech-innovation-award',
];

// Worked examples from the spec — exact expected metadata after population.
const EXACT = [
  {
    url: '/products/etcs',
    title: 'ETCS Onboard: Software-Defined Train Protection | TSC',
    description:
      "TSC's ETCS onboard system delivers pan-European train protection, software-defined on RailOS — lighter, faster to install and retrofit-ready. See the product.",
  },
  {
    url: '/projects/lineas-hld77',
    title: 'Lineas HLD77 ETCS Retrofit Case Study | TSC',
    description:
      'How TSC retrofitted ETCS and Belgian Class B across 109 Lineas HLD77 freight locomotives in Belgium, the Netherlands and Germany. Read the case study.',
  },
  {
    url: '/news/worlds-first-software-defined-etcs-certified',
    title: "World's First Software-Defined ETCS Safety System Certified",
    description:
      "TÜV Rheinland has certified TSC's on-board ETCS as the world's first software-defined train protection system — now adopted by Škoda Group.",
  },
];

const metaContent = (page, name) =>
  page.locator(`meta[name="${name}"]`).getAttribute('content');
const ogContent = (page, property) =>
  page.locator(`meta[property="${property}"]`).getAttribute('content');

test.describe('TSC CMS SEO fields', () => {

  // ── Worked examples: exact title + description ─────────────────
  for (const item of EXACT) {
    test.describe(`exact metadata — ${item.url}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`${STAGING_URL}${item.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      });

      test('title tag matches spec', async ({ page }) => {
        await expect(page).toHaveTitle(item.title);
      });

      test('meta description matches spec', async ({ page }) => {
        expect(await metaContent(page, 'description')).toBe(item.description);
      });
    });
  }

  // ── All sampled items: valid, non-empty, in-bounds metadata ───
  for (const url of SAMPLED_ITEMS) {
    test.describe(`metadata sanity — ${url}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`${STAGING_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      });

      test('title is non-empty and <= 65 chars', async ({ page }) => {
        const title = await page.title();
        expect(title.trim().length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(65);
      });

      test('meta description is non-empty and 50–160 chars', async ({ page }) => {
        const desc = await metaContent(page, 'description');
        expect(desc, `meta description missing on ${url}`).toBeTruthy();
        expect(desc.length).toBeGreaterThanOrEqual(50);
        expect(desc.length).toBeLessThanOrEqual(160);
      });

      test('open graph title + description present', async ({ page }) => {
        const ogTitle = await ogContent(page, 'og:title');
        const ogDesc = await ogContent(page, 'og:description');
        expect(ogTitle && ogTitle.trim().length, `og:title missing on ${url}`).toBeGreaterThan(0);
        expect(ogDesc && ogDesc.trim().length, `og:description missing on ${url}`).toBeGreaterThan(0);
      });
    });
  }

  // ── No console errors on a representative item page ────────────
  test('no console errors on a templated item page', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${STAGING_URL}/products/etcs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
