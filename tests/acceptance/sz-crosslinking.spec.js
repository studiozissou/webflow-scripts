// Acceptance tests for sz-crosslinking: every page links to the care hub and contact in body copy, nested pages carry a breadcrumb that matches BreadcrumbList JSON-LD, collection pages show a related block, the lean footer carries its link set, locations link to restaurants and Oost, and Dutch pages never leak English links; skipped until SZ_REDESIGN=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.STAGING_URL || 'https://studiozissou.webflow.io').replace(/\/$/, '');

const EN_TOP = ['/', '/for-businesses', '/for-agencies', '/work', '/pricing', '/about', '/contact'];
const EN_SERVICES = [
  '/services/website-care',
  '/services/new-website',
  '/services/website-redesign',
  '/services/webflow-development',
  '/services/get-found',
];
const EN_INDUSTRIES = ['/industries/restaurants', '/industries/zzp'];
const EN_LOCATIONS = ['/locations/den-haag', '/locations/haarlem', '/locations/amsterdam', '/locations/rotterdam'];
const EN_CASES = ['/work/oost'];
const NL_TOP = ['/nl', '/nl/voor-ondernemers', '/nl/werk', '/nl/tarieven', '/nl/over', '/nl/contact'];
const NL_SERVICES = [
  '/nl/diensten/website-onderhoud',
  '/nl/diensten/website-laten-maken',
  '/nl/diensten/website-vernieuwen',
  '/nl/diensten/gevonden-worden',
];
const NL_INDUSTRIES = ['/nl/branches/restaurants', '/nl/branches/zzp'];
const NL_LOCATIONS = ['/nl/locaties/den-haag', '/nl/locaties/haarlem', '/nl/locaties/amsterdam', '/nl/locaties/rotterdam'];
const NL_CASES = ['/nl/werk/oost'];

const EN_NESTED = [...EN_SERVICES, ...EN_INDUSTRIES, ...EN_LOCATIONS, ...EN_CASES];
const NL_NESTED = [...NL_SERVICES, ...NL_INDUSTRIES, ...NL_LOCATIONS, ...NL_CASES];
const EN_ALL = [...EN_TOP, ...EN_NESTED];
const NL_ALL = [...NL_TOP, ...NL_NESTED];
const ALL = [...EN_ALL, ...NL_ALL];
const RELATED_PAGES = [...EN_NESTED, ...NL_NESTED];
const EN_ONLY = ['/for-agencies', '/services/webflow-development'];

const FRAME = '[data-sz="nav"], [data-sz="footer"], [data-sz="breadcrumb"], .w-locales-list, [data-sz="locale-switcher"]';

test.skip(!process.env.SZ_REDESIGN, 'Set SZ_REDESIGN=1 once the redesigned pages are published to staging');

async function visit(page, path) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  return { response, errors };
}

async function bodyHrefs(page) {
  return page.$$eval(
    'a[href]',
    (anchors, frame) =>
      anchors
        .filter((a) => !a.closest(frame))
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('/')),
    FRAME,
  );
}

async function breadcrumbNames(page) {
  return page.$$eval('[data-sz="breadcrumb"] li', (items) => items.map((li) => li.textContent.trim()));
}

async function jsonLdBreadcrumb(page) {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => JSON.parse(n.textContent)),
  );
  const flat = blocks.flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b]));
  const list = flat.find((b) => b['@type'] === 'BreadcrumbList');
  return list ? list.itemListElement.map((el) => el.name || (el.item && el.item.name)) : null;
}

function isNl(path) {
  return path === '/nl' || path.startsWith('/nl/');
}

test.describe('sz-crosslinking', () => {
  for (const path of ALL) {
    test.describe(path, () => {
      test('links to the care service and contact outside nav and footer', async ({ page }) => {
        await visit(page, path);
        const hrefs = await bodyHrefs(page);
        const care = isNl(path) ? '/nl/diensten/website-onderhoud' : '/services/website-care';
        const contact = isNl(path) ? '/nl/contact' : '/contact';
        if (path !== care) expect(hrefs, `${path} should link to ${care}`).toContain(care);
        if (path !== contact) expect(hrefs, `${path} should link to ${contact}`).toContain(contact);
      });

      test('no link points to "#"', async ({ page }) => {
        await visit(page, path);
        const dead = await page.$$eval('a[href="#"]', (a) => a.length);
        expect(dead).toBe(0);
      });

      test('no console errors', async ({ page }) => {
        const { errors } = await visit(page, path);
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]);
      });
    });
  }

  for (const path of [...EN_NESTED, ...NL_NESTED]) {
    test(`${path} shows a breadcrumb whose last item is the current page`, async ({ page }) => {
      await visit(page, path);
      const crumb = page.locator('[data-sz="breadcrumb"]');
      await expect(crumb).toHaveCount(1);
      await expect(crumb.locator('nav[aria-label]')).toHaveCount(1);
      const current = crumb.locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current.locator('a')).toHaveCount(0);
      const names = await breadcrumbNames(page);
      expect(names.length).toBeGreaterThanOrEqual(2);
    });

    test(`${path} breadcrumb text matches the BreadcrumbList JSON-LD`, async ({ page }) => {
      await visit(page, path);
      const visible = await breadcrumbNames(page);
      const schema = await jsonLdBreadcrumb(page);
      expect(schema, `${path} should carry BreadcrumbList`).not.toBeNull();
      expect(visible).toEqual(schema);
    });
  }

  for (const path of [...EN_TOP, ...NL_TOP]) {
    test(`${path} shows no breadcrumb`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('[data-sz="breadcrumb"]')).toHaveCount(0);
    });
  }

  for (const path of RELATED_PAGES) {
    test(`${path} shows a related block with three to six items`, async ({ page }) => {
      await visit(page, path);
      const items = page.locator('[data-sz="related"] [data-sz-related-item]');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(6);
    });

    test(`${path} related block never links to the current page`, async ({ page }) => {
      await visit(page, path);
      const hrefs = await page.$$eval('[data-sz="related"] a[href]', (a) =>
        a.map((el) => el.getAttribute('href').replace(/\/$/, '')),
      );
      expect(hrefs).not.toContain(path.replace(/\/$/, ''));
    });
  }

  test('footer carries at least twelve content links on English pages', async ({ page }) => {
    await visit(page, '/');
    const links = await page.$$eval('[data-sz="footer"] a[href^="/"]', (a) => a.map((el) => el.getAttribute('href')));
    expect(links.length).toBeGreaterThanOrEqual(12);
    expect(links).not.toContain('#');
    for (const service of EN_SERVICES) expect(links).toContain(service);
    for (const city of EN_LOCATIONS) expect(links).toContain(city);
  });

  test('footer carries at least ten content links on Dutch pages', async ({ page }) => {
    await visit(page, '/nl');
    const links = await page.$$eval('[data-sz="footer"] a[href^="/"]', (a) => a.map((el) => el.getAttribute('href')));
    expect(links.length).toBeGreaterThanOrEqual(10);
    for (const service of NL_SERVICES) expect(links).toContain(service);
    for (const city of NL_LOCATIONS) expect(links).toContain(city);
  });

  for (const path of EN_LOCATIONS) {
    test(`${path} links to the restaurant page and the Oost case study`, async ({ page }) => {
      await visit(page, path);
      const hrefs = await bodyHrefs(page);
      expect(hrefs).toContain('/industries/restaurants');
      expect(hrefs).toContain('/work/oost');
    });
  }

  for (const path of NL_LOCATIONS) {
    test(`${path} links to the restaurant page and the Oost case study`, async ({ page }) => {
      await visit(page, path);
      const hrefs = await bodyHrefs(page);
      expect(hrefs).toContain('/nl/branches/restaurants');
      expect(hrefs).toContain('/nl/werk/oost');
    });
  }

  for (const path of NL_ALL) {
    test(`${path} links only within /nl apart from the locale switcher and alternates`, async ({ page }) => {
      await visit(page, path);
      const hrefs = await page.$$eval(
        'a[href^="/"]',
        (anchors) =>
          anchors
            .filter((a) => !a.closest('.w-locales-list, [data-sz="locale-switcher"]'))
            .map((a) => a.getAttribute('href')),
      );
      const leaks = hrefs.filter((h) => !(h === '/nl' || h.startsWith('/nl/')));
      expect(leaks, `${path} leaks English links`).toEqual([]);
    });

    test(`${path} never links to the English-only agency pages`, async ({ page }) => {
      await visit(page, path);
      const hrefs = await page.$$eval('a[href]', (a) => a.map((el) => el.getAttribute('href')));
      for (const enOnly of EN_ONLY) expect(hrefs).not.toContain(enOnly);
      await expect(page.locator('[data-sz="cta-band"] a[href="/for-agencies"]')).toHaveCount(0);
    });
  }
});
