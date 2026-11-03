// Acceptance tests for rolfing-content-pages: the ten /rolfing/ landing pages on staging in EN and NL, keyword conformance, page-own FAQs and related cards, wording rules, and no FAQ leak onto other pages; skipped until ROLFING_CONTENT=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const ONLY = process.env.ROLFING_PAGES ? process.env.ROLFING_PAGES.split(',') : null;

const ALL_PAGES = [
  {
    id: 'U14',
    en: 'knee-hip-ankle-pain',
    nl: 'knie-heup-enkelklachten',
    head: /knie/i,
    terms: [/kniepijn/i, /heuppijn/i, /enkelpijn/i, /gewrichtspijn/i],
    links: ['U4', 'U5'],
  },
  { id: 'U1', en: 'neck-pain', nl: 'nekklachten', head: /nek/i, terms: [/nekpijn/i] },
  {
    id: 'U16',
    en: 'holistic-approach',
    nl: 'holistische-benadering',
    head: /holisti/i,
    terms: [/holistische benadering/i, /holistische therapie/i, /holistisch therapeut/i],
  },
  {
    id: 'U15',
    en: 'complementary-care',
    nl: 'complementaire-zorg',
    head: /complementair/i,
    terms: [/complementaire zorg/i, /alternatieve geneeswijzen/i, /vergoed/i],
  },
  {
    id: 'U12',
    en: 'chronic-pain',
    nl: 'chronische-pijn',
    head: /chronische pijn/i,
    terms: [/chronische pijn/i],
  },
  {
    id: 'U2',
    en: 'burnout-stress',
    nl: 'burn-out-stress',
    head: /burn-?out/i,
    terms: [/burn-?out herstel|herstel(len)? (na|van) (een )?burn-?out/i, /stress/i],
  },
  {
    id: 'U4',
    en: 'sports-injuries',
    nl: 'sportblessures',
    head: /sportblessure/i,
    terms: [/sportblessure/i],
    links: ['U14'],
  },
  {
    id: 'U5',
    en: 'pregnancy-birth',
    nl: 'zwangerschap-bevalling',
    head: /zwangerschap/i,
    terms: [/bekkenpijn/i, /vijfde maand/i],
    links: ['U14'],
  },
  {
    id: 'U3',
    en: 'trauma-recovery',
    nl: 'herstel-na-trauma',
    head: /trauma/i,
    terms: [/lichaamsgerichte traumatherapie/i],
  },
  {
    id: 'U6',
    en: 'rolfing-and-fascia',
    nl: 'rolfing-en-fascia',
    head: /fascia/i,
    terms: [/fasciatherapie/i, /fascia release/i, /massage/i],
  },
];

const PAGES = ALL_PAGES.filter((p) => !ONLY || ONLY.includes(p.id));

const DISCLAIMER = {
  en: /complementary care, not medical treatment/i,
  nl: /complementaire zorg en geen medische behandeling/i,
};
const BANNED = {
  en: [
    /pain[- ]free/i,
    /say goodbye to/i,
    /\bheals?\b/i,
    /\bcures?\b/i,
    /transformative/i,
    /holistic healing/i,
    /rolfing(®)? therapy/i,
    /holistic body therapy/i,
  ],
  nl: [
    /pijnvrij/i,
    /\bgeneest\b/i,
    /genezing/i,
    /transformati/i,
    /transformerende/i,
    /holistische genezing/i,
    /rolfing(®)?-?\s?therapie/i,
    /lichaamstherapie/i,
  ],
};
const TREATMENT_HEAD = { en: /\b(treatment|therapy)\b/i, nl: /behandeling|therapie/i };
const GENERIC_FAQS = [
  'How many sessions are recommended?',
  'Who can benefit from Rolfing?',
  'Is Rolfing safe?',
  'What should I expect during a session?',
];
const FAQ_SURFACES = ['/en', '/en/what-is-rolfing', '/en/contact', '/en/book-session'];

test.skip(
  !process.env.ROLFING_CONTENT,
  'Set ROLFING_CONTENT=1 once pages are on staging; ROLFING_PAGES=U14 limits the run to the pattern page',
);

const urlFor = (p, lang) => `/${lang}/rolfing/${p[lang]}`;
const mainText = (page) => page.locator('main, body').first().innerText();

test.describe('rolfing-content-pages', () => {
  for (const p of PAGES) {
    for (const lang of ['en', 'nl']) {
      test.describe(`${p.id} ${lang}`, () => {
        let errors;

        test.beforeEach(async ({ page }) => {
          errors = [];
          page.on('pageerror', (err) => errors.push(err.message));
          const res = await page.goto(`${BASE}${urlFor(p, lang)}`, {
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
          expect(title).toMatch(/\| Rolfing Amsterdam$/);
          const description = await page.locator('meta[name="description"]').getAttribute('content');
          expect(description.length).toBeGreaterThanOrEqual(70);
          expect(description.length).toBeLessThanOrEqual(160);
        });

        test('title and h1 do not imply treatment', async ({ page }) => {
          const h1 = await page.locator('h1').innerText();
          expect(await page.title()).not.toMatch(TREATMENT_HEAD[lang]);
          expect(h1).not.toMatch(TREATMENT_HEAD[lang]);
        });

        test('uses no banned claim wording and carries the complementary-care line', async ({
          page,
        }) => {
          const text = await mainText(page);
          for (const rule of BANNED[lang]) expect(text).not.toMatch(rule);
          expect(text).toMatch(DISCLAIMER[lang]);
        });

        test('FAQ has 3 to 5 own questions with microdata and opens', async ({ page }) => {
          const items = page.locator('.faq_list details.faq_item');
          const count = await items.count();
          expect(count).toBeGreaterThanOrEqual(3);
          expect(count).toBeLessThanOrEqual(5);
          await expect(items.first()).toHaveAttribute('itemtype', 'https://schema.org/Question');
          const questions = await page.locator('.faq_summary').allInnerTexts();
          for (const generic of GENERIC_FAQS) expect(questions).not.toContain(generic);
          await page.locator('.faq_summary').nth(1).click();
          await expect(items.nth(1)).toHaveAttribute('open', /.*/);
        });

        test('landing blocks are all visible and filled', async ({ page }) => {
          for (const selector of [
            '.hero-secondary_intro',
            '.hero-secondary_image-wrapper img',
            '.symptoms_rich-text li',
            '.content_updated',
            '.section_usp',
            '.section_about-janco',
            '.section_related .related_item',
          ]) {
            await expect(page.locator(selector).first()).toBeVisible();
          }
          const alt = await page.locator('.hero-secondary_image-wrapper img').getAttribute('alt');
          expect(alt.length).toBeGreaterThan(5);
          const intro = await page.locator('.hero-secondary_intro').innerText();
          expect(intro.length).toBeGreaterThan(40);
        });

        test('related cards link to two or three sibling pages in the same locale', async ({
          page,
        }) => {
          const hrefs = await page.$$eval('.section_related .related_item', (els) =>
            els.map((e) => e.closest('a')?.getAttribute('href') ?? e.querySelector('a')?.getAttribute('href')),
          );
          expect(hrefs.length).toBeGreaterThanOrEqual(2);
          expect(hrefs.length).toBeLessThanOrEqual(3);
          for (const href of hrefs) expect(href).toMatch(new RegExp(`^/${lang}/rolfing/`));
          expect(hrefs).not.toContain(urlFor(p, lang));
          for (const id of p.links ?? []) {
            const sibling = ALL_PAGES.find((s) => s.id === id);
            expect(hrefs).toContain(urlFor(sibling, lang));
          }
        });

        test('links to Book Session', async ({ page }) => {
          const hrefs = await page.$$eval('main a[href], a[href]', (els) =>
            els.map((a) => a.getAttribute('href')),
          );
          expect(hrefs.some((h) => /book-session/.test(h))).toBe(true);
        });

        test('no console errors', async ({ page }) => {
          await page.waitForTimeout(1000);
          expect(errors).toEqual([]);
        });

        if (lang === 'nl') {
          test('Dutch page conforms to its keyword map', async ({ page }) => {
            const head = `${await page.title()} ${await page.locator('h1').innerText()}`;
            expect(head).toMatch(p.head);
            const text = await mainText(page);
            for (const term of p.terms) expect(text).toMatch(term);
          });
        }
      });
    }
  }

  test.describe('other pages', () => {
    for (const path of FAQ_SURFACES) {
      test(`${path} still shows only its own four FAQs`, async ({ page }) => {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
        const text = await mainText(page);
        await expect(page.locator('.faq_accordion')).toHaveCount(GENERIC_FAQS.length);
        for (const question of GENERIC_FAQS) expect(text).toContain(question);
      });
    }

    test('explainers stay out of the landing layout', async ({ page }) => {
      await page.goto(`${BASE}/en/rolfing/procedure`, { waitUntil: 'networkidle', timeout: 45000 });
      await expect(page.locator('.hero-secondary_intro')).toHaveCount(0);
      await expect(page.locator('.section_usp')).toBeHidden();
    });
  });
});
