/**
 * Acceptance tests — Coconut site overhaul (performance, nav and IA, Client-First migration)
 *
 * Spec: projects/coconut/.claude/specs/coconut-site-overhaul.md
 * Target: staging (getcoconut.webflow.io). Run one phase at a time:
 *   npx playwright test tests/acceptance/coconut-site-overhaul.spec.js --grep @phase1
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', quiet: true });

const BASE_URL = process.env.COCONUT_STAGING_URL || 'https://getcoconut.webflow.io';
const SLUG = 'coconut-site-overhaul';

const KEY_PAGES = ['/', '/pricing', '/mtd-software', '/features', '/accountant-software'];
const ARTICLE = '/knowledge-hub/complete-guide-self-assessment-tax-returns';
const NON_HOME = [...KEY_PAGES.slice(1), ARTICLE, '/categories/making-tax-digital'];
const MARKETING_HOSTS = /hotjar\.com|intercom\.io|widget\.intercom|analytics\.tiktok\.com|connect\.facebook\.net/;

async function waitForReady(page) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30_000 });
}

async function loadPage(page, path, settle = 1500) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(settle);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  return errors;
}

async function navAndFooterHrefs(page) {
  return page.$$eval('nav a[href], header a[href], footer a[href], .top-nav-bar a[href]', (links) =>
    [...new Set(links.map((a) => a.getAttribute('href')))]
  );
}

async function jsonLd(page) {
  return page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.flatMap((n) => {
      try {
        const data = JSON.parse(n.textContent);
        return Array.isArray(data) ? data : data['@graph'] || [data];
      } catch (e) {
        return [];
      }
    })
  );
}

test.describe(SLUG, () => {
  test.describe.configure({ timeout: 90_000 });

  test.describe('@phase1', () => {
    for (const path of KEY_PAGES) {
      test(`no layout shift from injected top padding after load ${path}`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await loadPage(page, path, 5000);
        const padding = await page.evaluate(() => getComputedStyle(document.documentElement).paddingTop);
        expect(parseFloat(padding)).toBe(0);
      });

      test(`page has exactly one h1 and a non-empty title ${path}`, async ({ page }) => {
        await loadPage(page, path);
        await expect(page.locator('h1')).toHaveCount(1);
        expect((await page.title()).trim().length).toBeGreaterThan(0);
      });

      test(`no console errors ${path}`, async ({ page }) => {
        const errors = collectErrors(page);
        await loadPage(page, path, 3000);
        expect(errors).toEqual([]);
      });
    }

    test('nav and footer contain no href="#" links', async ({ page }) => {
      await loadPage(page, '/');
      const hrefs = await navAndFooterHrefs(page);
      expect(hrefs.filter((h) => h === '#' || h === '')).toEqual([]);
    });

    test('nav and footer links resolve without redirect or 404', async ({ page, request }) => {
      await loadPage(page, '/');
      const internal = (await navAndFooterHrefs(page)).filter((h) => h.startsWith('/') && !h.startsWith('//'));
      const bad = [];
      for (const href of internal) {
        const res = await request.get(`${BASE_URL}${href}`, { maxRedirects: 0 });
        if (res.status() !== 200) bad.push(`${href} → ${res.status()}`);
      }
      expect(bad).toEqual([]);
    });

    test('article breadcrumb schema item 2 resolves with 200', async ({ page, request }) => {
      await loadPage(page, ARTICLE);
      const crumbs = (await jsonLd(page)).find((d) => d['@type'] === 'BreadcrumbList');
      expect(crumbs).toBeTruthy();
      const item = crumbs.itemListElement.find((i) => Number(i.position) === 2);
      const url = typeof item.item === 'string' ? item.item : item.item['@id'];
      const res = await request.get(url.replace('https://www.getcoconut.com', BASE_URL), { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('@phase2', () => {
    test('webfont.js is not requested', async ({ page }) => {
      const urls = [];
      page.on('request', (req) => urls.push(req.url()));
      await loadPage(page, '/');
      expect(urls.filter((u) => u.includes('webfont.js'))).toEqual([]);
    });

    test('hero image is eager with high fetch priority', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loadPage(page, '/');
      const hero = page.locator('img[fetchpriority="high"]').first();
      await expect(hero).toHaveCount(1);
      expect(await hero.getAttribute('loading')).not.toBe('lazy');
    });

    test('marketing tags do not load before consent', async ({ page }) => {
      const hits = [];
      page.on('request', (req) => { if (MARKETING_HOSTS.test(req.url())) hits.push(req.url()); });
      await loadPage(page, '/', 6000);
      expect(hits).toEqual([]);
    });

    test('inline custom JS is 2 KB or less and init.js is served from a pinned tag', async ({ page }) => {
      await loadPage(page, '/');
      const inlineBytes = await page.$$eval('script:not([src])', (nodes) =>
        nodes
          .filter((n) => !/json/.test(n.type) && !/gtm|dataLayer|consent/i.test(n.textContent))
          .reduce((sum, n) => sum + n.textContent.length, 0)
      );
      expect(inlineBytes).toBeLessThanOrEqual(2048);
      const src = await page.$$eval('script[src*="projects/coconut/init"]', (n) => n.map((s) => s.src));
      expect(src.length).toBe(1);
      expect(src[0]).toMatch(/@coconut-live-v\d+/);
    });
  });

  test.describe('@phase3', () => {
    test('knowledge hub index returns 200', async ({ request }) => {
      const res = await request.get(`${BASE_URL}/knowledge-hub`, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });

    test('authors index and author profiles return 200', async ({ page, request }) => {
      const index = await request.get(`${BASE_URL}/authors`, { maxRedirects: 0 });
      expect(index.status()).toBe(200);
      await loadPage(page, '/authors');
      const profiles = (await page.$$eval('a[href^="/authors/"]', (a) => [...new Set(a.map((l) => l.getAttribute('href')))])).slice(0, 3);
      expect(profiles.length).toBeGreaterThan(0);
      for (const href of profiles) {
        expect((await request.get(`${BASE_URL}${href}`, { maxRedirects: 0 })).status()).toBe(200);
      }
    });

    test('article shows a linked author byline and Person schema with sameAs', async ({ page }) => {
      await loadPage(page, ARTICLE);
      await expect(page.locator('a[href^="/authors/"]').first()).toBeVisible();
      const person = (await jsonLd(page)).flatMap((d) => [d, d.author].filter(Boolean)).find((d) => d['@type'] === 'Person');
      expect(person).toBeTruthy();
      expect([].concat(person.sameAs || []).some((u) => u.includes('linkedin.com'))).toBe(true);
    });

    test('header has six top-level items whose parents link to hub pages', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loadPage(page, '/');
      const parents = page.locator('[data-nav-item="top"] > a');
      await expect(parents).toHaveCount(6);
      const hrefs = await parents.evaluateAll((a) => a.map((l) => l.getAttribute('href')));
      expect(hrefs.every((h) => h && h.startsWith('/') && h !== '#')).toBe(true);
    });

    test('nav dropdown is keyboard operable', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loadPage(page, '/');
      const toggle = page.locator('[data-nav-toggle]').first();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    for (const path of NON_HOME) {
      test(`breadcrumb and BreadcrumbList present on non-home pages ${path}`, async ({ page }) => {
        await loadPage(page, path);
        await expect(page.locator('nav[aria-label*="readcrumb"], .breadcrumb, [class*="breadcrumb"]').first()).toBeVisible();
        expect((await jsonLd(page)).some((d) => d['@type'] === 'BreadcrumbList')).toBe(true);
      });
    }
  });

  test.describe('@phase4', () => {
    for (const path of [...KEY_PAGES, ARTICLE]) {
      test(`page uses the Client-First page skeleton ${path}`, async ({ page }) => {
        await loadPage(page, path);
        await expect(page.locator('.page-wrapper .main-wrapper')).toHaveCount(1);
        expect(await page.locator('.main-wrapper [class*="section_"]').count()).toBeGreaterThan(0);
      });

      test(`no legacy text classes remain ${path}`, async ({ page }) => {
        await loadPage(page, path);
        const legacy = await page.$$eval('[class]', (els) =>
          els.filter((el) => /(^|\s)(_25-heading-\d|_25-pargraph-\d|bold-text-\d)/.test(el.className)).length
        );
        expect(legacy).toBe(0);
      });
    }

    test('shared CSS is 260 KB or less', async ({ page, request }) => {
      await loadPage(page, '/');
      const href = await page.$eval('link[rel="stylesheet"][href*="webflow.shared"]', (l) => l.href);
      const body = await (await request.get(href)).body();
      expect(body.length).toBeLessThanOrEqual(260 * 1024);
    });
  });
});
