// Acceptance tests for oost-cleanup: no template leftovers, consistent walk time, postcode, phone and EN wording, bound form labels, eager logo, clean loader tag, legal pages noindex; skipped until OOST_CLEANUP=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const SHARE_CARD = '6ac5370ce2ed0856d9f3046e';
const MAIN = ['/', '/afhalen', '/catering', '/en', '/en/afhalen', '/en/catering'];
const LEGAL = ['/privacybeleid', '/algemene-voorwaarden', '/en/privacybeleid', '/en/algemene-voorwaarden'];
const ALL = [...MAIN, ...LEGAL];

test.skip(!process.env.OOST_CLEANUP, 'Set OOST_CLEANUP=1 once the cleanup is published');

async function visibleText(page) {
  return page.evaluate(() => document.body.innerText);
}

test.describe('oost-cleanup', () => {
  for (const path of ALL) {
    test.describe(path, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      });

      test('no template placeholders on any page', async ({ page }) => {
        const text = await visibleText(page);
        expect(text).not.toMatch(/\[(Voornaam|First name|Drie Google-reviews|Three Google reviews)[^\]]*\]/);
      });

      test('no image placeholder captions', async ({ page }) => {
        const captions = await page.$$eval('.image-placeholder_caption', (els) =>
          els.map((e) => e.innerText.trim()).filter(Boolean),
        );
        expect(captions).toEqual([]);
      });

      test('map boxes are decorative', async ({ page }) => {
        const labelled = await page.$$eval('.image-placeholder[aria-label]', (els) => els.length);
        expect(labelled).toBe(0);
      });

      test('walk time is 15 minutes everywhere', async ({ page }) => {
        const text = await visibleText(page);
        expect(text).not.toMatch(/10 minuten lopen|10-minute walk|10 minutes' walk|ten-minute walk/i);
      });

      test('postcode and phone are written consistently', async ({ page }) => {
        const text = await visibleText(page);
        expect(text).not.toContain('2013DL');
        expect(text).not.toMatch(/023-?7851562|023-785 1562/);
      });

      test('no console errors', async () => {
        expect(errors).toEqual([]);
      });

      test('loader tag has no data-allow-local', async ({ page }) => {
        const flagged = await page.$$eval('script[src*="projects/oost/init.js"]', (els) =>
          els.filter((e) => e.hasAttribute('data-allow-local')).length,
        );
        expect(flagged).toBe(0);
      });
    });
  }

  test('reviews section shows three real quotes', async ({ page }) => {
    test.skip(!process.env.OOST_REVIEWS, 'Set OOST_REVIEWS=1 once real reviews are in');
    for (const path of ['/', '/en']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      const section = page.locator('section', { hasText: /Wat gasten zeggen|What guests say/ });
      const text = await section.innerText();
      expect(text).not.toContain('[');
      expect(text.match(/via Google/g) || []).toHaveLength(3);
    }
  });

  test('walk time mentions say 15 minutes', async ({ page }) => {
    await page.goto(`${BASE}/afhalen`, { waitUntil: 'domcontentloaded' });
    expect(await visibleText(page)).toMatch(/15 minuten|kwartier/);
    await page.goto(`${BASE}/en/afhalen`, { waitUntil: 'domcontentloaded' });
    expect(await visibleText(page)).toMatch(/15-minute|15 minutes/);
  });

  test('catering names the whole spekkoek', async ({ page }) => {
    await page.goto(`${BASE}/catering`, { waitUntil: 'domcontentloaded' });
    expect(await visibleText(page)).toContain('Een hele spekkoek');
  });

  test('English pages say takeaway, not takeout', async ({ page }) => {
    for (const path of ['/en', '/en/afhalen', '/en/catering']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      expect(await visibleText(page), path).not.toMatch(/takeout/i);
    }
  });

  test('English 404 has an English title', async ({ page }) => {
    await page.goto(`${BASE}/en/does-not-exist`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveTitle(/Pagina niet gevonden/);
  });

  test('English terms link to the English privacy page', async ({ page }) => {
    await page.goto(`${BASE}/en/algemene-voorwaarden`, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.$$eval('main a[href*="privacybeleid"]', (els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/\/en\/privacybeleid/);
  });

  test('catering form labels are bound and have no example text', async ({ page }) => {
    for (const path of ['/catering', '/en/catering']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      const result = await page.$$eval('form label', (labels) =>
        labels.map((l) => {
          const id = l.getAttribute('for');
          const field = id ? document.getElementById(id) : null;
          return { id, bound: Boolean(field), placeholder: field?.getAttribute('placeholder') || '' };
        }),
      );
      expect(result.length, path).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.bound, `${path} label for="${r.id}"`).toBe(true);
        expect(r.placeholder, path).not.toMatch(/Example text/i);
      }
    }
  });

  test('nav logo loads eagerly with dimensions', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const logo = page.locator('.nav_logo').first();
    await expect(logo).toHaveAttribute('loading', 'eager');
    await expect(logo).toHaveAttribute('width', /\d+/);
    await expect(logo).toHaveAttribute('height', /\d+/);
  });

  test('English legal pages use the share card', async ({ page }) => {
    for (const path of ['/en/privacybeleid', '/en/algemene-voorwaarden']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      const og = await page.getAttribute('meta[property="og:image"]', 'content');
      expect(og, path).toContain(SHARE_CARD);
    }
  });

  test('legal pages stay noindex', async ({ page }) => {
    for (const path of LEGAL) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', /noindex/);
    }
  });

  test('llms.txt says 15 minutes', async ({ request }) => {
    const body = await (await request.get(`${BASE}/llms.txt`)).text();
    expect(body).toMatch(/15 minutes/);
    expect(body).not.toMatch(/10 minutes' walk/);
  });
});
