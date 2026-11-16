// Acceptance tests for rolfing-ia-nav: JSON-LD URLs and /rolfing/ redirects, grouped nav, footer audience column, locale-safe Pricing link, hub and in-body inbound links; skipped until ROLFING_IA=1, ROLFING_IA_PHASE=jsonld runs only the URL checks.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const PHASE = process.env.ROLFING_IA_PHASE || 'all';
const DIR = 'what-is-rolfing';

const SLUGS = {
  en: {
    hub1: '',
    hub2: 'who-is-rolfing-for',
    method: ['procedure', 'science-and-development', 'rolfing-and-fascia', 'holistic-approach', 'complementary-care'],
    audience: ['back-pain', 'neck-pain', 'knee-hip-ankle-pain', 'burnout-stress', 'trauma-recovery', 'pregnancy-birth'],
  },
  nl: {
    hub1: '',
    hub2: 'voor-wie-is-rolfing-bedoeld',
    method: [
      'procedure',
      'de-wetenschap-en-ontwikkeling-van-rolfing',
      'rolfing-en-fascia',
      'holistische-benadering',
      'complementaire-zorg',
    ],
    audience: ['rugklachten', 'nekklachten', 'knie-heup-enkelklachten', 'burn-out-stress', 'herstel-na-trauma', 'zwangerschap-bevalling'],
  },
};
const TOPICS = (lang) => [...SLUGS[lang].method.slice(2), ...SLUGS[lang].audience];
const path = (lang, slug) => (slug ? `/${lang}/${DIR}/${slug}` : `/${lang}/${DIR}`);

const fetchHtml = async (request, url) => {
  const res = await request.get(`${BASE}${url}?ia=${Date.now()}`, { timeout: 45000 });
  expect(res.status(), url).toBe(200);
  return res.text();
};
const hrefs = (html) => [...html.matchAll(/href="([^"#?]*)/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, ''));
const visibleBodyHrefs = async (page, url) => {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
  return page.$$eval('a[href]', (as) =>
    as
      .filter((a) => !a.closest('nav, footer, .footer, .w-condition-invisible') && a.getClientRects().length > 0)
      .filter((a) => getComputedStyle(a).visibility !== 'hidden')
      .map((a) => new URL(a.href).pathname),
  );
};
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const d = JSON.parse(m[1]);
    return d['@graph'] || [d];
  });

test.skip(!process.env.ROLFING_IA, 'Set ROLFING_IA=1; ROLFING_IA_PHASE=jsonld checks only T1');

test.describe('rolfing-ia-nav', () => {
  for (const lang of ['en', 'nl']) {
    test.describe(`jsonld ${lang}`, () => {
      test('JSON-LD page URL matches the real URL on every topic page and explainer', async ({ request }) => {
        for (const slug of [...SLUGS[lang].method, ...SLUGS[lang].audience, SLUGS[lang].hub2]) {
          const html = await fetchHtml(request, path(lang, slug));
          expect(html, slug).not.toContain(`/${lang}/rolfing/`);
          const graph = jsonLd(html);
          const webPage = graph.find((x) => x['@type'] === 'WebPage');
          const crumbs = graph.find((x) => x['@type'] === 'BreadcrumbList');
          expect(webPage, `${slug} WebPage`).toBeTruthy();
          expect(crumbs, `${slug} BreadcrumbList`).toBeTruthy();
          expect(new URL(webPage.url).pathname, slug).toBe(path(lang, slug));
          expect(new URL(webPage['@id']).pathname, slug).toBe(path(lang, slug));
          const last = crumbs.itemListElement.at(-1).item || `${BASE}${path(lang, slug)}`;
          expect(new URL(last).pathname, slug).toBe(path(lang, slug));
        }
      });

      test('old /rolfing/ URLs redirect to /what-is-rolfing/', async ({ request }) => {
        const slug = SLUGS[lang].audience[1];
        const res = await request.get(`${BASE}/${lang}/rolfing/${slug}`, { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(res.headers().location).toMatch(new RegExp(`/${lang}/${DIR}/${slug}$`));
      });
    });

    test.describe(`structure ${lang}`, () => {
      test.skip(PHASE === 'jsonld', 'T3-T6 not built yet');

      test('nav dropdown shows the method group then the audience group in IA order, no duplicates', async ({
        request,
      }) => {
        const html = await fetchHtml(request, `/${lang}`);
        const list = html.match(/class="navbar_dropdown-list[\s\S]*?<\/nav>/)[0];
        const got = hrefs(list).filter((h) => h.startsWith(`/${lang}/${DIR}`));
        const want = [
          path(lang, SLUGS[lang].hub1),
          ...SLUGS[lang].method.map((s) => path(lang, s)),
          path(lang, SLUGS[lang].hub2),
          ...SLUGS[lang].audience.map((s) => path(lang, s)),
        ];
        expect(got).toEqual(want);
        expect(new Set(got).size).toBe(got.length);
      });

      test('footer lists the six audience pages in order', async ({ request }) => {
        const html = await fetchHtml(request, path(lang, SLUGS[lang].audience[1]));
        const footer = html.slice(html.search(/<footer|class="footer/));
        const want = SLUGS[lang].audience.map((s) => path(lang, s));
        expect(hrefs(footer).filter((h) => want.includes(h))).toEqual(want);
      });

      test('nav pricing link stays in the current locale', async ({ request }) => {
        const html = await fetchHtml(request, `/${lang}`);
        const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
        const pricing = [...nav.matchAll(/href="([^"]*#pricing)"/g)].map((m) => m[1]);
        expect(pricing.length).toBeGreaterThan(0);
        for (const h of pricing) expect(h).toMatch(new RegExp(`^(https?://[^/]+)?/${lang}/?#pricing$`));
      });

      test('Who is Rolfing for links to all six audience pages in its body', async ({ page }) => {
        const body = await visibleBodyHrefs(page, path(lang, SLUGS[lang].hub2));
        for (const s of SLUGS[lang].audience) expect(body, s).toContain(path(lang, s));
      });

      test('What is Rolfing links to the hub and the three method topics', async ({ page }) => {
        const body = await visibleBodyHrefs(page, path(lang, ''));
        for (const s of [SLUGS[lang].hub2, ...SLUGS[lang].method.slice(2)]) expect(body, s).toContain(path(lang, s));
      });

      test('Home links to the burnout page and the hub outside the nav', async ({ page }) => {
        const body = await visibleBodyHrefs(page, `/${lang}`);
        expect(body).toContain(path(lang, SLUGS[lang].audience[3]));
        expect(body).toContain(path(lang, SLUGS[lang].hub2));
      });

      test('every topic page has at least two in-body inbound links', async ({ page }) => {
        test.setTimeout(240000);
        const sources = [`/${lang}`, path(lang, ''), path(lang, SLUGS[lang].hub2), ...TOPICS(lang).map((s) => path(lang, s))];
        const inbound = Object.fromEntries(TOPICS(lang).map((s) => [s, 0]));
        for (const src of sources) {
          const body = new Set(await visibleBodyHrefs(page, src));
          for (const s of TOPICS(lang)) if (src !== path(lang, s) && body.has(path(lang, s))) inbound[s] += 1;
        }
        for (const [s, n] of Object.entries(inbound)) expect(n, s).toBeGreaterThanOrEqual(2);
      });

      test('pages load with no console errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        for (const url of [`/${lang}`, path(lang, SLUGS[lang].hub2), path(lang, SLUGS[lang].audience[0])]) {
          await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
        }
        expect(errors).toEqual([]);
      });
    });
  }

  test.describe('nl only', () => {
    test.skip(PHASE === 'jsonld', 'T3 not built yet');
    test('nav label reads Hulpbronnen', async ({ request }) => {
      const nav = (await fetchHtml(request, '/nl')).match(/<nav[\s\S]*?<\/nav>/)[0];
      expect(nav).toMatch(/>\s*Hulpbronnen\s*</);
    });
  });

  test.describe('regression', () => {
    test.skip(PHASE === 'jsonld', 'checked with the structure phase');
    test('FAQ counts on the generic pages are unchanged', async ({ request }) => {
      const want = { '/en': 4, '/nl': 4, '/en/what-is-rolfing': 4, '/en/contact': 4, '/en/book-session': 4, '/en/faq': 5 };
      for (const [url, n] of Object.entries(want)) {
        const html = await fetchHtml(request, url);
        expect((html.match(/class="faq_accordion/g) || []).length, url).toBe(n);
      }
    });
  });
});
