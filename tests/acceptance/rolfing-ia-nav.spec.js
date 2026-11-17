// Acceptance tests for rolfing-ia-nav: JSON-LD URLs and /rolfing/ redirects, Rolfing and Who it helps nav dropdowns, three-column footer, approved labels, locale-safe Pricing link, hub and in-body inbound links; skipped until ROLFING_IA=1, ROLFING_IA_PHASE=jsonld runs only the URL checks.
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
const NAV_METHOD = {
  en: ['procedure', 'rolfing-and-fascia', 'holistic-approach', 'complementary-care', 'science-and-development'],
  nl: [
    'procedure',
    'rolfing-en-fascia',
    'holistische-benadering',
    'complementaire-zorg',
    'de-wetenschap-en-ontwikkeling-van-rolfing',
  ],
};
const LABELS = {
  en: {
    top: ['Rolfing', 'Who it helps'],
    rolfing: [
      'How a session works',
      'Rolfing and fascia',
      'A holistic approach',
      'Alongside medical care',
      'Science and history',
      'Recommended books',
    ],
    footer: ['Rolfing', 'Who it helps', 'Practice'],
    footerRolfing: ['What is Rolfing?', 'How a session works', 'Science and history', 'Recommended books'],
  },
  nl: {
    top: ['Rolfing', 'Voor wie'],
    rolfing: [
      'Zo verloopt een sessie',
      'Rolfing en fascia',
      'Een holistische benadering',
      'Naast reguliere zorg',
      'Wetenschap en geschiedenis',
      'Aanbevolen boeken',
    ],
    footer: ['Rolfing', 'Voor wie', 'Praktijk'],
    footerRolfing: ['Wat is Rolfing?', 'Zo verloopt een sessie', 'Wetenschap en geschiedenis', 'Aanbevolen boeken'],
  },
};
const header = (html) => html.slice(0, html.indexOf('<main'));
const footerOf = (html) => html.slice(html.search(/class="footer/));
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const classLinks = (html, classes) =>
  [...html.matchAll(/(<a [^>]*>)([\s\S]*?)<\/a>/g)]
    .filter((m) => !m[1].includes('w-locales-item'))
    .filter((m) => classes.some((c) => new RegExp(`class="(?:[^"]*\\s)?${c}(?:\\s[^"]*)?"`).test(m[1])))
    .map((m) => ({ href: ((m[1].match(/href="([^"]*)"/) || [])[1] || '').replace(/^https?:\/\/[^/]+/, ''), text: clean(m[2]) }))
    .filter((l) => l.href);
const classHrefs = (html, classes) => classLinks(html, classes).map((l) => l.href);
const classTexts = (html, cls) =>
  [...html.matchAll(new RegExp(`class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</`, 'g'))].map((m) => clean(m[1]));
const visibleBodyHrefs = async (page, url) => {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
  return page.$$eval('a[href]', (as) =>
    as
      .filter(
        (a) =>
          !a.closest('nav, footer, .footer, .footer_component, .navbar_component, .w-condition-invisible') &&
          a.getClientRects().length > 0,
      )
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

      test('top-level Rolfing, Who it helps and About link to their pages; dropdown and Pricing hrefs in IA order, no duplicates', async ({
        request,
      }) => {
        const html = await fetchHtml(request, `/${lang}`);
        const got = classHrefs(header(html), ['navbar_link', 'navbar_dropdown-link']);
        const want = [
          path(lang, SLUGS[lang].hub1),
          ...NAV_METHOD[lang].map((s) => path(lang, s)),
          `/${lang}/resources`,
          path(lang, SLUGS[lang].hub2),
          ...SLUGS[lang].audience.map((s) => path(lang, s)),
          `/${lang}#pricing`,
          `/${lang}/about-janco`,
          `/${lang}/testimonials`,
          `/${lang}/faq`,
          `/${lang}/contact`,
        ];
        expect(got).toEqual(want);
        expect(new Set(got).size).toBe(got.length);
      });

      test('footer has Rolfing, Who it helps and Practice columns in IA order', async ({ request }) => {
        const html = await fetchHtml(request, path(lang, SLUGS[lang].audience[1]));
        const want = [
          path(lang, SLUGS[lang].hub1),
          path(lang, 'procedure'),
          path(lang, SLUGS[lang].method[1]),
          `/${lang}/resources`,
          `/${lang}/faq`,
          path(lang, SLUGS[lang].hub2),
          ...SLUGS[lang].audience.map((s) => path(lang, s)),
          `/${lang}/about-janco`,
          `/${lang}/testimonials`,
          `/${lang}#pricing`,
          `/${lang}/book-session`,
          `/${lang}/contact`,
        ];
        expect(classHrefs(footerOf(html), ['footer_menu-link'])).toEqual(want);
      });

      test('nav and footer use the approved labels in order', async ({ request }) => {
        const html = await fetchHtml(request, `/${lang}`);
        const L = LABELS[lang];
        const top = classLinks(header(html), ['navbar_link']).map((l) => l.text);
        expect(top.slice(0, 2), 'top-level links').toEqual(L.top);
        const toggles = [...header(html).matchAll(/<div [^>]*class="navbar_dropdwn-toggle[^"]*"[^>]*>/g)].map((m) => m[0]);
        for (const t of toggles.slice(0, 3)) expect(t, 'chevron toggle needs an aria-label').toMatch(/aria-label="[^"]+"/);
        const items = classLinks(header(html), ['navbar_dropdown-link']).map((l) => l.text);
        expect(items.slice(0, 6), 'Rolfing dropdown').toEqual(L.rolfing);
        expect(classTexts(footerOf(html), 'footer_menu-heading'), 'footer headings').toEqual(L.footer);
        const footerItems = classLinks(footerOf(html), ['footer_menu-link']).map((l) => l.text);
        expect(footerItems.slice(0, 4), 'footer Rolfing column').toEqual(L.footerRolfing);
      });

      test('nav pricing link stays in the current locale', async ({ request }) => {
        const html = await fetchHtml(request, `/${lang}`);
        const pricing = classHrefs(header(html), ['navbar_link']).filter((h) => h.includes('#pricing'));
        expect(pricing.length).toBeGreaterThan(0);
        for (const h of pricing) expect(h).toMatch(new RegExp(`^/${lang}/?#pricing$`));
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
