/**
 * Acceptance tests for Coconut named authors: article bylines, /author/{slug} profiles, the /authors index and Person schema; expected to fail until the build ships.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', quiet: true });

const BASE_URL = process.env.COCONUT_STAGING_URL || 'https://getcoconut.webflow.io';
const SLUG = 'coconut-named-authors';

const NAMED_ARTICLE = '/knowledge-hub/what-information-is-sent-to-hmrc-under-mtd';
const TEAM_ARTICLE = '/knowledge-hub/making-tax-digital';
const GUIDE_ARTICLE = '/knowledge-hub/complete-guide-self-assessment-tax-returns';
const ARTICLES = [NAMED_ARTICLE, TEAM_ARTICLE, GUIDE_ARTICLE];
const PROFILE = '/author/mike-parkes';
const INDEX = '/authors';
const BYLINE = '[data-author-byline]';
const IGNORED_ERRORS = /OptinMonster|Failed to load resource|Meta Pixel|Intercom/i;

async function loadPage(page, path, settle = 1500) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30_000 });
  await page.waitForTimeout(settle);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  return errors;
}

async function jsonLd(page) {
  return page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.flatMap((n) => {
      const data = JSON.parse(n.textContent);
      return Array.isArray(data) ? data : data['@graph'] || [data];
    })
  );
}

test.describe(SLUG, () => {
  test.describe.configure({ timeout: 90_000 });

  test.describe('byline', () => {
    for (const path of ARTICLES) {
      test(`byline link to the profile is in the raw HTML: ${path}`, async ({ request }) => {
        const html = await (await request.get(`${BASE_URL}${path}`)).text();
        expect(html).toContain('data-author-byline');
        expect(html).toMatch(/href="\/author\/[a-z0-9-]+"/);
      });
    }

    test('byline shows name and role and sits after the h1', async ({ page }) => {
      await loadPage(page, NAMED_ARTICLE);
      const byline = page.locator(BYLINE);
      await expect(byline).toHaveCount(1);
      await expect(byline).toBeVisible();
      await expect(byline.locator('a[href^="/author/"]').first()).toHaveText(/\S/);
      await expect(byline).toContainText('Technical Director');
      const follows = await byline.evaluate((el) => {
        const h1 = document.querySelector('h1');
        return Boolean(h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(follows).toBe(true);
    });

    test('team article still shows a byline with a name', async ({ page }) => {
      await loadPage(page, TEAM_ARTICLE);
      await expect(page.locator(`${BYLINE} a[href^="/author/"]`).first()).toHaveText(/\S/);
    });

    test('byline fits a 375 px screen without sideways scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await loadPage(page, NAMED_ARTICLE);
      const box = await page.locator(BYLINE).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    });

    test('byline link opens a live profile', async ({ page, request }) => {
      await loadPage(page, NAMED_ARTICLE);
      const href = await page.locator(`${BYLINE} a[href^="/author/"]`).first().getAttribute('href');
      expect((await request.get(`${BASE_URL}${href}`, { maxRedirects: 0 })).status()).toBe(200);
    });
  });

  test.describe('schema', () => {
    test('article has one BlogPosting with an Organization publisher reference', async ({ page }) => {
      await loadPage(page, NAMED_ARTICLE);
      const posts = (await jsonLd(page)).filter((d) => d['@type'] === 'BlogPosting');
      expect(posts).toHaveLength(1);
      expect(posts[0]['@context']).toBe('https://schema.org');
      expect(posts[0].publisher['@id']).toContain('#organization');
    });

    test('author is a Person with a live profile url, job title and LinkedIn', async ({ page, request }) => {
      await loadPage(page, NAMED_ARTICLE);
      const { author } = (await jsonLd(page)).find((d) => d['@type'] === 'BlogPosting');
      expect(author['@type']).toBe('Person');
      expect(author.url).toMatch(/\/author\/mike-parkes$/);
      expect(author.jobTitle).toBeTruthy();
      expect([].concat(author.sameAs)).toEqual(expect.arrayContaining([expect.stringContaining('linkedin.com')]));
      const path = new URL(author.url, BASE_URL).pathname;
      expect((await request.get(`${BASE_URL}${path}`, { maxRedirects: 0 })).status()).toBe(200);
    });

    test('team author is an Organization, not a Person', async ({ page }) => {
      await loadPage(page, TEAM_ARTICLE);
      const { author } = (await jsonLd(page)).find((d) => d['@type'] === 'BlogPosting');
      if (author.name === 'The Coconut Team') expect(author['@type']).toBe('Organization');
    });

    test('no article author value is empty', async ({ page }) => {
      for (const path of ARTICLES) {
        await loadPage(page, path, 500);
        const { author } = (await jsonLd(page)).find((d) => d['@type'] === 'BlogPosting');
        expect(author.name, path).toBeTruthy();
        expect(author.url, path).not.toMatch(/\/author\/?$/);
        expect(author.sameAs, path).toBeTruthy();
      }
    });
  });

  test.describe('profile', () => {
    test('profile shows one h1, role, bio, LinkedIn and their articles', async ({ page }) => {
      await loadPage(page, PROFILE);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(/Mike Parkes/);
      await expect(page.locator('body')).toContainText('Technical Director');
      await expect(page.locator('a[href*="linkedin.com/in/"]').first()).toBeAttached();
      expect(await page.locator('main a[href^="/knowledge-hub/"]').count()).toBeGreaterThan(0);
    });

    test('profile has ProfilePage schema and a link back to the index', async ({ page }) => {
      await loadPage(page, PROFILE);
      const types = (await jsonLd(page)).map((d) => d['@type']);
      expect(types).toContain('ProfilePage');
      expect(types).toContain('BreadcrumbList');
      await expect(page.locator('a[href="/authors"]').first()).toBeAttached();
    });
  });

  test.describe('index', () => {
    test('index returns 200 and every listed profile returns 200', async ({ page, request }) => {
      expect((await request.get(`${BASE_URL}${INDEX}`, { maxRedirects: 0 })).status()).toBe(200);
      await loadPage(page, INDEX);
      const hrefs = await page.$$eval('a[href^="/author/"]', (a) => [...new Set(a.map((l) => l.getAttribute('href')))]);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect((await request.get(`${BASE_URL}${href}`, { maxRedirects: 0 })).status(), href).toBe(200);
      }
    });

    test('index lists no placeholder authors', async ({ page }) => {
      await loadPage(page, INDEX);
      await expect(page.locator('body')).not.toContainText('Aisha Schuppe');
      await expect(page.locator('body')).not.toContainText('Dolores Johnson');
    });
  });

  test.describe('console', () => {
    for (const path of [NAMED_ARTICLE, PROFILE, INDEX]) {
      test(`no console errors: ${path}`, async ({ page }) => {
        const errors = collectErrors(page);
        await loadPage(page, path);
        expect(errors.filter((e) => !IGNORED_ERRORS.test(e))).toEqual([]);
      });
    }
  });
});
