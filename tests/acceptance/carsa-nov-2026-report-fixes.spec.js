/**
 * Carsa November 2026 report fixes — acceptance tests (Webflow content, so raw HTML after a publish).
 * Spec: projects/carsa/.claude/specs/carsa-nov-2026-report-fixes.md
 * Run against staging first: CARSA_URL=https://carsa-v2.webflow.io
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const BASE = process.env.CARSA_URL || 'https://www.carsa.co.uk';
const SLUG = 'carsa-nov-2026-report-fixes';
const PROMO_A = '/used-cars/promotions/500-deposit-on-us-25k-30k';
const PROMO_B = '/used-cars/promotions/500-finance-deposit-contribution';
const VAGUE_LINK_PAGES = [
  '/about/careers',
  '/car-care/car-extras',
  '/car-care/car-paint-interior-protection',
  '/car-care/carsacover',
  '/car-care/electric-vehicle-cover',
  '/car-care/overview',
  '/used-cars/promotions/300-deposit-on-us',
  '/used-cars/promotions/400-deposit-on-us',
  '/used-cars/promotions/750-deposit-on-us',
  '/used-cars/promotions/1000-deposit-on-us',
  PROMO_A,
  PROMO_B,
  '/used-cars/promotions/free-1-year-warranty',
  '/used-cars/promotions/free-1-year-warranty-1000-claim-limit',
  '/used-cars/promotions/free-1-year-warranty-with-approved-finance',
  '/used-cars/promotions/free-4-year-ev-warranty',
];
const TITLE_LIMIT = 70;

async function html(request, path) {
  const res = await request.get(`${BASE}${path}`);
  expect(res.status(), `${path} status`).toBe(200);
  return res.text();
}

function title(page) {
  const m = page.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'") : '';
}

function metaDescription(page) {
  const m =
    page.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
    page.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i);
  return m ? m[1] : '';
}

function canonical(page) {
  const m = page.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i);
  return m ? m[1] : '';
}

test.describe(SLUG, () => {
  test('tax strategy canonical is an absolute https address', async ({ request }) => {
    const page = await html(request, '/about/tax-strategy');
    expect(canonical(page)).toBe('https://www.carsa.co.uk/about/tax-strategy');
  });

  for (const path of VAGUE_LINK_PAGES) {
    test(`no "Learn more" link text on ${path}`, async ({ request }) => {
      const page = await html(request, path);
      expect(page).not.toMatch(/>\s*Learn more\s*</i);
    });
  }

  test('promotions cards keep their finance and part exchange destinations', async ({ request }) => {
    const page = await html(request, '/used-cars/promotions/300-deposit-on-us');
    expect(page).toContain('href="/car-finance"');
    expect(page).toContain('href="/sell-car/part-exchange"');
  });

  test('car care overview keeps all six destinations', async ({ request }) => {
    const page = await html(request, '/car-care/overview');
    for (const href of [
      '/car-care/carsacover',
      '/car-care/electric-vehicle-cover',
      '/car-care/car-paint-interior-protection',
      '/car-care/car-extras',
      'service.carsa.co.uk',
      '/car-care/drive-away-car-insurance',
    ]) {
      expect(page, href).toContain(href);
    }
  });

  for (const path of ['/car-care/carsacover', '/blog/is-the-volkswagen-golf-reliable-used-buyer-guide']) {
    test(`title is within ${TITLE_LIMIT} characters on ${path}`, async ({ request }) => {
      const t = title(await html(request, path));
      expect(t.length).toBeGreaterThan(20);
      expect(t.length).toBeLessThanOrEqual(TITLE_LIMIT);
    });
  }

  test('Golf title still leads with the query it ranks for', async ({ request }) => {
    const t = title(await html(request, '/blog/is-the-volkswagen-golf-reliable-used-buyer-guide'));
    expect(t).toMatch(/^Is the Volkswagen Golf Reliable\?/);
  });

  test('the two £500 promotion pages have different titles', async ({ request }) => {
    const a = title(await html(request, PROMO_A));
    const b = title(await html(request, PROMO_B));
    expect(a).not.toBe(b);
  });

  test('the two £500 promotion pages have different descriptions', async ({ request }) => {
    const a = metaDescription(await html(request, PROMO_A));
    const b = metaDescription(await html(request, PROMO_B));
    expect(a.length).toBeGreaterThan(50);
    expect(b.length).toBeGreaterThan(50);
    expect(a).not.toBe(b);
  });
});
