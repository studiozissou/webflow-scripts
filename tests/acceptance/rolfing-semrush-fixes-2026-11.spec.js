// Acceptance tests for rolfing-semrush-fixes-2026-11: the 16 Nov 2026 Semrush crawl issues (NL FAQPage microdata, root-anchor navbar link, dead footer credit, unminified loader, Science page references, resources text ratio, English policy pages); skipped until ROLFING_SEMRUSH=1, run with ROLFING_URL=https://www.rolfingamsterdam.nl after publish.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.ROLFING_URL || 'https://rolfing-amsterdam.webflow.io';
const ENABLED = process.env.ROLFING_SEMRUSH === '1';

const ROLFING_PAGES = {
  en: [
    'back-pain',
    'burnout-stress',
    'complementary-care',
    'holistic-approach',
    'knee-hip-ankle-pain',
    'neck-pain',
    'pregnancy-birth',
    'procedure',
    'rolfing-and-fascia',
    'science-and-development',
    'trauma-recovery',
    'who-is-rolfing-for',
  ],
  nl: [
    'burn-out-stress',
    'complementaire-zorg',
    'de-wetenschap-en-ontwikkeling-van-rolfing',
    'herstel-na-trauma',
    'holistische-benadering',
    'knie-heup-enkelklachten',
    'nekklachten',
    'procedure',
    'rolfing-en-fascia',
    'rugklachten',
    'voor-wie-is-rolfing-bedoeld',
    'zwangerschap-bevalling',
  ],
};

const SCIENCE = {
  en: '/en/what-is-rolfing/science-and-development',
  nl: '/nl/what-is-rolfing/de-wetenschap-en-ontwikkeling-van-rolfing',
};

const SAMPLE_PAGES = [
  '/en',
  '/nl',
  '/en/about-janco',
  '/nl/contact',
  SCIENCE.en,
  SCIENCE.nl,
];

const DEAD_LINKS = [
  'nicabm.com/faculty/peter-levine-google',
  'nicabm.com/faculty/stephen-porges',
  'ourbirthjourney.com/page/jaap-van-der-wal',
  'embryo.nl/english-1',
  'elsevier.com/books/fascial-and-membrane-technique/9780443102196',
  'books.google.to',
];

async function html(request, path) {
  const res = await request.get(BASE + path, { maxRedirects: 0 });
  expect(res.status(), `${path} status`).toBe(200);
  return res.text();
}

function textRatio(raw) {
  const text = raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length / raw.length;
}

function bodyWords(raw) {
  const main = (raw.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [null, raw])[1];
  return main
    .replace(/<(script|style|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .filter(Boolean);
}

function languageScore(words) {
  const nl = new Set([
    'de',
    'het',
    'een',
    'je',
    'ik',
    'van',
    'en',
    'zijn',
    'niet',
    'wordt',
  ]);
  const en = new Set(['the', 'and', 'of', 'you', 'your', 'is', 'to', 'we', 'not', 'are']);
  return {
    nl: words.filter((w) => nl.has(w)).length,
    en: words.filter((w) => en.has(w)).length,
  };
}

test.describe('rolfing-semrush-fixes-2026-11', () => {
  test.skip(!ENABLED, 'Set ROLFING_SEMRUSH=1 to run');
  test.setTimeout(120000);

  test('every Rolfing page has at most one FAQPage scope, with questions when it has FAQs', async ({
    page,
  }) => {
    for (const [locale, slugs] of Object.entries(ROLFING_PAGES)) {
      for (const slug of slugs) {
        const path = `/${locale}/what-is-rolfing/${slug}`;
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        const scopes = page.locator('[itemtype="https://schema.org/FAQPage"]');
        const count = await scopes.count();
        expect(count, `${path} FAQPage scopes`).toBeLessThanOrEqual(1);
        const items = await page.locator('.faq_list details.faq_item').count();
        if (items > 0) {
          expect(count, `${path} FAQPage scopes`).toBe(1);
          const questions = scopes.first().locator('[itemprop="mainEntity"]');
          expect(await questions.count(), `${path} mainEntity`).toBeGreaterThan(0);
        }
      }
    }
  });

  test('no link points at the bare root or a root anchor', async ({ page }) => {
    for (const path of SAMPLE_PAGES) {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      const bad = await page.$$eval('a[href]', (links) =>
        links
          .map((a) => a.getAttribute('href'))
          .filter((h) => h === '/' || h.startsWith('/#')),
      );
      expect(bad, `${path} root links`).toEqual([]);
    }
  });

  test('navbar pricing link keeps the locale', async ({ page }) => {
    for (const locale of ['en', 'nl']) {
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'domcontentloaded' });
      const href = await page
        .locator('a.navbar_link[href*="#pricing"]')
        .first()
        .getAttribute('href');
      expect(href).toBe(`/${locale}#pricing`);
    }
  });

  test('footer credit link does not point at wdmorley.com and resolves', async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' });
    expect(await page.locator('a[href*="wdmorley"]').count()).toBe(0);
    const href = await page.locator('a.is-attribute-link').first().getAttribute('href');
    const res = await request.get(href);
    expect(res.status()).toBeLessThan(400);
  });

  test('loader is the minified file and the FAQ accordion still opens', async ({
    page,
  }) => {
    await page.goto(`${BASE}/nl/what-is-rolfing/rugklachten`, { waitUntil: 'load' });
    const src = await page
      .locator('script[src*="projects/rolfing-amsterdam/init"]')
      .first()
      .getAttribute('src');
    expect(src).toMatch(
      /@rolfing-amsterdam-v[\w.-]+\/projects\/rolfing-amsterdam\/init\.min\.js$/,
    );
    await page.waitForFunction(() => window.ROLFING && window.ROLFING.base, null, {
      timeout: 10000,
    });
    const base = await page.evaluate(() => window.ROLFING.base);
    expect(base).toMatch(/\/projects\/rolfing-amsterdam\/$/);
    const items = page.locator('.faq_list details.faq_item');
    expect(await items.count()).toBeGreaterThan(1);
    await page.waitForTimeout(1500);
    const second = items.nth(1);
    await second.locator('summary').click();
    await page.waitForTimeout(1500);
    expect(await second.evaluate((el) => el.open)).toBe(true);
  });

  test('science page links show names, not URLs', async ({ page }) => {
    for (const path of Object.values(SCIENCE)) {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      const urlText = await page.$$eval('a[href^="http"]', (links) =>
        links
          .filter((a) => !a.href.includes('rolfingamsterdam'))
          .map((a) => a.textContent.trim())
          .filter((t) => /^(https?:\/\/|www\.)/i.test(t)),
      );
      expect(urlText, `${path} URL-as-text links`).toEqual([]);
    }
  });

  test('science page has no dead or blocked reference links', async ({ request }) => {
    for (const path of Object.values(SCIENCE)) {
      const raw = await html(request, path);
      for (const dead of DEAD_LINKS)
        expect(raw, `${path} links ${dead}`).not.toContain(dead);
    }
  });

  test('resources page text-HTML ratio is at least 0.11', async ({ request }) => {
    const ratio = textRatio(await html(request, '/en/resources'));
    expect(ratio).toBeGreaterThanOrEqual(0.11);
  });

  test('English privacy policy is in English', async ({ request }) => {
    const score = languageScore(bodyWords(await html(request, '/en/privacy-policy')));
    expect(score.en).toBeGreaterThan(score.nl * 2);
  });

  test('Dutch privacy policy stays in Dutch', async ({ request }) => {
    const score = languageScore(bodyWords(await html(request, '/nl/privacy-policy')));
    expect(score.nl).toBeGreaterThan(score.en * 2);
  });

  test('spam policy is English or redirects to the privacy policy', async ({
    request,
  }) => {
    for (const locale of ['en', 'nl']) {
      const res = await request.get(`${BASE}/${locale}/spam-policy`, { maxRedirects: 0 });
      if (res.status() === 200) {
        if (locale === 'en') {
          const score = languageScore(bodyWords(await res.text()));
          expect(score.en).toBeGreaterThan(score.nl * 2);
        }
      } else {
        expect(res.status()).toBe(301);
        expect(res.headers().location).toContain(`/${locale}/privacy-policy`);
      }
    }
  });

  test('touched pages log no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    for (const path of [...SAMPLE_PAGES, '/en/resources', '/en/privacy-policy']) {
      await page.goto(BASE + path, { waitUntil: 'load' });
      await page.waitForTimeout(1000);
    }
    expect(errors).toEqual([]);
  });
});
