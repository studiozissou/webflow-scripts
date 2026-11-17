// Acceptance tests for sz-nl-translation: /nl Home, Privacy and Terms on Team Zissou serve Dutch text, Dutch SEO, Dutch JSON-LD and /nl-only internal links, and the English pages are unchanged.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_LIVE ? 'https://www.teamzissou.io' : 'https://teamzissou.webflow.io').replace(/\/$/, '');
const PAGES = [
  { en: '/', nl: '/nl' },
  { en: '/privacy', nl: '/nl/privacy' },
  { en: '/terms', nl: '/nl/terms' },
];
const ENGLISH_UI = /\b(Send it over|Got it!|Not sure yet|Your name|Your email|Anything else|That didn’t send|Last updated)\b/;
const bust = () => `?cb=${Date.now()}`;

async function fetchHtml(request, path) {
  const res = await request.get(`${BASE}${path}${bust()}`);
  expect(res.status(), path).toBe(200);
  return res.text();
}

function attr(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

const titleOf = (html) => attr(html, /<title>([^<]*)<\/title>/);
const descOf = (html) => attr(html, /<meta[^>]*name="description"[^>]*content="([^"]*)"/) ?? attr(html, /<meta[^>]*content="([^"]*)"[^>]*name="description"/);

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const data = JSON.parse(m[1]);
    return Array.isArray(data) ? data : data['@graph'] || [data];
  });
}

test.describe('sz-nl-translation', () => {
  for (const { en, nl } of PAGES) {
    test(`${nl} declares Dutch and has a Dutch title and description`, async ({ request }) => {
      const [nlHtml, enHtml] = [await fetchHtml(request, nl), await fetchHtml(request, en)];
      expect(attr(nlHtml, /<html[^>]*lang="([^"]*)"/)).toMatch(/^nl/);
      expect(attr(enHtml, /<html[^>]*lang="([^"]*)"/)).toMatch(/^en/);
      expect(titleOf(nlHtml)).toBeTruthy();
      expect(titleOf(nlHtml)).not.toBe(titleOf(enHtml));
      expect(descOf(nlHtml)).toBeTruthy();
      expect(descOf(nlHtml)).not.toBe(descOf(enHtml));
      expect(descOf(nlHtml).replace(/&amp;/g, '&').length).toBeLessThanOrEqual(160);
    });

    test(`${nl} links only to /nl pages`, async ({ page }) => {
      await page.goto(`${BASE}${nl}`, { waitUntil: 'domcontentloaded' });
      const leaks = await page.$$eval('a[href^="/"]', (links) =>
        links
          .filter((a) => !a.closest('.w-locales-list'))
          .map((a) => a.getAttribute('href'))
          .filter((href) => href !== '/nl' && !href.startsWith('/nl/') && !href.startsWith('/nl#')),
      );
      expect(leaks).toEqual([]);
    });

    test(`${nl} keeps hreflang alternates for both locales`, async ({ request }) => {
      const html = await fetchHtml(request, nl);
      expect(html).toMatch(/hreflang="en-NL"/i);
      expect(html).toMatch(/hreflang="nl-NL"/i);
    });

    test(`${nl} shows no English interface text`, async ({ page }) => {
      await page.goto(`${BASE}${nl}`, { waitUntil: 'networkidle' });
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).not.toMatch(ENGLISH_UI);
    });

    test(`${nl} loads without console errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
      await page.goto(`${BASE}${nl}`, { waitUntil: 'networkidle' });
      expect(errors).toEqual([]);
    });
  }

  test('/nl contact form uses Dutch placeholders, button and progress', async ({ page }) => {
    await page.goto(`${BASE}/nl`, { waitUntil: 'networkidle' });
    const placeholders = await page.$$eval('#contact-name, #contact-business, #contact-email, #contact-message', (els) => els.map((e) => e.placeholder));
    for (const p of placeholders) expect(p).not.toMatch(/^(Your|Anything)/);
    await expect(page.locator('input[type="submit"]')).not.toHaveValue('Send it over');
    await expect(page.locator('[data-sz="contact-count"]')).toHaveText(/^1 van 6$/);
    const labels = await page.$$eval('[data-sz="contact-next"]', (els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels.length).toBe(5);
    for (const l of labels) expect(l).toBe('Volgende');
  });

  test('English contact progress still reads "1 of 6"', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-sz="contact-count"]')).toHaveText(/^1 of 6$/);
  });

  test('/nl JSON-LD is Dutch and matches the visible FAQ', async ({ page, request }) => {
    const nodes = jsonLd(await fetchHtml(request, '/nl'));
    const site = nodes.find((n) => n['@type'] === 'WebSite');
    expect(site.inLanguage).toBe('nl');
    expect(site.url).toBe('https://www.teamzissou.io/nl');
    const faq = nodes.find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(10);
    await page.goto(`${BASE}/nl`, { waitUntil: 'networkidle' });
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    for (const q of faq.mainEntity) expect(body).toContain(q.name.replace(/\s+/g, ' '));
  });

  test('English JSON-LD is unchanged', async ({ request }) => {
    const nodes = jsonLd(await fetchHtml(request, '/'));
    expect(nodes.find((n) => n['@type'] === 'WebSite').inLanguage).toBe('en');
    expect(nodes.find((n) => n['@type'] === 'FAQPage').mainEntity).toHaveLength(10);
  });

  test('/nl home has no serious or critical axe violations', async ({ page }) => {
    await page.goto(`${BASE}/nl`, { waitUntil: 'networkidle' });
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
  });
});
