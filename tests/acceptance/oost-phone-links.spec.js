// Acceptance tests for oost-phone-links: every tel: and wa.me link on oosteten (NL + EN) points at the restaurant line +31 23 785 1562, the mobile and placeholder numbers are gone from markup, JSON-LD and llms.txt, and the WhatsApp prefill text survives.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://oosteten.webflow.io';
const NUMBER = '31237851562';
const TEL = `tel:+${NUMBER}`;
const WA = `https://wa.me/${NUMBER}`;
const OLD = ['648979760', '600000000', '06-48979760', '06-48 97 97 60'];
const LLMS = fileURLToPath(new URL('../../projects/oost/llms.txt', import.meta.url));

const PAGES = [
  { path: '/', prefilled: 0 },
  { path: '/afhalen', prefilled: 2 },
  { path: '/catering', prefilled: 0 },
  { path: '/contact', prefilled: 0 },
  { path: '/privacybeleid', prefilled: 0 },
  { path: '/algemene-voorwaarden', prefilled: 0 },
  { path: '/en', prefilled: 0 },
  { path: '/en/afhalen', prefilled: 2 },
  { path: '/en/catering', prefilled: 0 },
  { path: '/en/contact', prefilled: 0 },
  { path: '/en/privacybeleid', prefilled: 0 },
  { path: '/en/algemene-voorwaarden', prefilled: 0 },
  { path: '/pagina-bestaat-niet', prefilled: 0 },
];

async function links(page) {
  return page.$$eval('a[href^="tel:"], a[href*="wa.me/"]', (els) =>
    els.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })),
  );
}

test.describe('oost-phone-links', () => {
  for (const { path, prefilled } of PAGES) {
    test.describe(path, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      });

      test('every tel: link dials the restaurant line', async ({ page }) => {
        const tels = (await links(page)).filter((l) => l.href.startsWith('tel:'));
        expect(tels.length).toBeGreaterThan(0);
        for (const l of tels) expect(l.href, l.text).toBe(TEL);
      });

      test('every wa.me link opens the restaurant line with prefill text', async ({ page }) => {
        const was = (await links(page)).filter((l) => l.href.includes('wa.me/'));
        expect(was.length).toBeGreaterThan(0);
        for (const l of was) {
          expect(l.href.startsWith(`${WA}?text=`), `${l.text} → ${l.href}`).toBe(true);
        }
        const orders = was.filter((l) => l.href.includes('afhalen%3A'));
        expect(orders).toHaveLength(prefilled);
      });

      test('no old or placeholder number anywhere in the HTML', async ({ page }) => {
        const html = await page.content();
        for (const n of OLD) expect(html, n).not.toContain(n);
      });

      test('no console errors', async ({ page }) => {
        await page.waitForLoadState('load');
        expect(errors).toEqual([]);
      });
    });
  }

  test('home JSON-LD lists only the restaurant line', async ({ page }) => {
    await page.goto(BASE + '/');
    const phones = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.flatMap((s) => [...s.textContent.matchAll(/"telephone"\s*:\s*"([^"]+)"/g)].map((m) => m[1])),
    );
    expect(phones.length).toBeGreaterThan(0);
    for (const p of phones) expect(p).toBe(`+${NUMBER}`);
  });

  test('llms.txt in the repo carries only the restaurant line', () => {
    const txt = readFileSync(LLMS, 'utf8');
    for (const n of OLD) expect(txt, n).not.toContain(n);
    expect(txt).toContain('023-785 1562');
  });
});
