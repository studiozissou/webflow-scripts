// Acceptance tests for tz-footer-credit: every in-scope client footer credits Team Zissou with one link to https://www.teamzissou.io/ and no longer links to the dead wdmorley.com domain.
import { test, expect } from '@playwright/test';

const TARGET = 'https://www.teamzissou.io/';
const PAGES = [
  { site: 'oost', url: 'https://www.oosteten.nl/', lead: 'Built on Webflow by' },
  { site: 'oost', url: 'https://www.oosteten.nl/en', lead: 'Built on Webflow by' },
  { site: 'rolfing-amsterdam', url: 'https://www.rolfingamsterdam.nl/en', lead: 'Website by' },
  { site: 'rolfing-amsterdam', url: 'https://www.rolfingamsterdam.nl/nl', lead: 'Website door' },
  ...(process.env.TZ_CREDIT_EXTRA || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({ site: new URL(url).hostname, url, lead: null })),
];

function creditLinks(html) {
  const re = /<a\b([^>]*)>\s*Team Zissou\s*<\/a>/gi;
  return [...html.matchAll(re)].map((m) => ({
    attrs: m[1],
    href: (m[1].match(/href="([^"]+)"/i) || [])[1] || null,
    rel: (m[1].match(/rel="([^"]+)"/i) || [])[1] || '',
    target: (m[1].match(/target="([^"]+)"/i) || [])[1] || null,
    before: html.slice(Math.max(0, m.index - 80), m.index),
  }));
}

test.describe('tz-footer-credit', () => {
  for (const p of PAGES) {
    test.describe(p.url, () => {
      let html;

      test.beforeAll(async ({ request }) => {
        const res = await request.get(p.url, { timeout: 30000 });
        expect(res.status(), `${p.url} answers 200`).toBe(200);
        html = await res.text();
      });

      test('footer has at least one Team Zissou credit link', () => {
        expect(creditLinks(html).length).toBeGreaterThan(0);
      });

      test('every credit link points to https://www.teamzissou.io/', () => {
        for (const link of creditLinks(html)) expect(link.href).toBe(TARGET);
      });

      test('every credit link opens in a new tab', () => {
        for (const link of creditLinks(html)) expect(link.target).toBe('_blank');
      });

      test('after load every credit link has rel noopener and no nofollow', async ({ page }) => {
        await page.goto(p.url, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(1000);
        const rels = await page
          .locator('a', { hasText: /^\s*Team Zissou\s*$/ })
          .evaluateAll((els) => els.map((el) => el.getAttribute('rel') || ''));
        expect(rels.length).toBeGreaterThan(0);
        for (const rel of rels) {
          expect(rel).toMatch(/\bnoopener\b/);
          expect(rel).not.toMatch(/\bnofollow\b/);
        }
      });

      test('credit lead-in text matches the locale', () => {
        test.skip(!p.lead, 'lead-in is site-specific for TZ_CREDIT_EXTRA pages');
        expect(creditLinks(html)[0]?.before).toContain(p.lead);
      });

      test('page has no link to wdmorley.com and no "Studio Zissou" or "Will Morley" credit', () => {
        expect(html).not.toMatch(/href="https?:\/\/(www\.)?wdmorley\.com/i);
        expect(html).not.toMatch(/>\s*(Studio Zissou|Will Morley)\s*</);
      });
    });
  }
});
