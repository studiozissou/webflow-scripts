/**
 * Carsa October 2026 fixes: absolute canonicals on six pages, and structured store schema
 * (openingHoursSpecification, clean address, generic phone) on every published store page.
 * Spec: projects/carsa/.claude/specs/carsa-oct-2026-canonicals-store-schema.md
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const BASE = process.env.CARSA_URL || 'https://www.carsa.co.uk';
const ORIGIN = 'https://www.carsa.co.uk';
const GENERIC_PHONE = '+44 344 649 8790';

const CANONICAL_PAGES = [
  '/car-finance-calculator',
  '/car-care/drive-away-car-insurance',
  '/about/gender-pay-gap-report-april-25',
  '/mot-and-car-servicing/store-locator',
  '/used-cars/promotions/500-finance-deposit-contribution',
  '/used-cars/models',
];

const STORES = [
  'bca-bristol', 'bolton', 'bradford', 'cannock', 'durham', 'gloucester',
  'halesowen', 'mountsorrel', 'portsmouth', 'southampton', 'towcester', 'wolverhampton',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

async function html(request, path) {
  const res = await request.get(`${BASE}${path}`);
  expect(res.status(), `${path} status`).toBe(200);
  return res.text();
}

function canonicals(source) {
  return [...source.matchAll(/<link[^>]+rel="canonical"[^>]*>/g)]
    .map((m) => (m[0].match(/href="([^"]*)"/) || [])[1]);
}

function jsonLd(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

function storeNode(source) {
  const nodes = jsonLd(source).flatMap((b) => (b['@graph'] ? b['@graph'] : [b]));
  return nodes.find((n) => ['AutoDealer', 'AutomotiveBusiness', 'LocalBusiness'].includes(n['@type']));
}

test.describe('carsa-oct-2026-canonicals-store-schema', () => {
  test.describe('canonicals', () => {
    for (const path of CANONICAL_PAGES) {
      test(`${path} has exactly one absolute https canonical to itself`, async ({ request }) => {
        const tags = canonicals(await html(request, path));
        expect(tags).toHaveLength(1);
        expect(tags[0]).toBe(`${ORIGIN}${path}`);
      });
    }
  });

  test.describe('store schema', () => {
    for (const slug of STORES) {
      test(`/stores/${slug} carries structured hours, a clean address and the generic phone`, async ({ request }) => {
        const source = await html(request, `/stores/${slug}`);
        const node = storeNode(source);
        expect(node, 'store JSON-LD node').toBeTruthy();

        const hours = node.openingHoursSpecification;
        expect(Array.isArray(hours) && hours.length > 0, 'openingHoursSpecification present').toBe(true);
        const covered = hours.flatMap((h) => [].concat(h.dayOfWeek).map((d) => String(d).replace(/^https?:\/\/schema\.org\//, '')));
        for (const day of DAYS) expect(covered, `${day} covered`).toContain(day);
        for (const h of hours) {
          expect(h.opens).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
          expect(h.closes).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
        }

        const a = node.address;
        expect(a.streetAddress).toBeTruthy();
        expect(a.streetAddress).not.toMatch(/^Carsa\s*-/);
        expect(a.streetAddress).not.toContain(a.postalCode);
        expect(a.addressLocality).toBeTruthy();
        expect(a.addressRegion).toBeTruthy();
        expect(a.postalCode).toMatch(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/);

        expect(node.telephone).toBe(GENERIC_PHONE);
      });
    }

    test('no HTML entities leak into store JSON-LD values', async ({ request }) => {
      for (const slug of STORES) {
        const raw = JSON.stringify(storeNode(await html(request, `/stores/${slug}`)));
        expect(raw, slug).not.toMatch(/&(amp|#39|quot|lt|gt);/);
      }
    });
  });

  test('store and canonical pages load without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const path of ['/stores/bradford', '/car-finance-calculator']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }
    expect(errors).toEqual([]);
  });
});
