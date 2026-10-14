// Acceptance tests for sz-site-redesign: every v1 page has sound SEO meta, no template leftovers, FAQ and schema markup, working doors, UTM capture, Dutch alternates, llms.txt and sitemap; skipped until SZ_REDESIGN=1.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.STAGING_URL || 'https://studiozissou.webflow.io').replace(/\/$/, '');
const BRAND = /Studio Zissou$/;

const EN_STATIC = ['/', '/for-businesses', '/for-agencies', '/work', '/pricing', '/about', '/contact'];
const EN_SERVICES = [
  '/services/website-care',
  '/services/new-website',
  '/services/webflow-development',
  '/services/get-found',
];
const EN_OTHER = ['/industries/restaurants', '/locations/haarlem', '/locations/amsterdam', '/work/oost'];
const NL_PAGES = [
  '/nl',
  '/nl/voor-ondernemers',
  '/nl/diensten/website-onderhoud',
  '/nl/diensten/website-laten-maken',
  '/nl/diensten/gevonden-worden',
  '/nl/branches/restaurants',
  '/nl/locaties/haarlem',
  '/nl/locaties/amsterdam',
  '/nl/tarieven',
  '/nl/over',
  '/nl/contact',
];
const EN_WITH_NL_TWIN = ['/', '/for-businesses', '/services/website-care', '/pricing', '/about', '/contact'];
const FAQ_PAGES = ['/', '/for-businesses', '/for-agencies', ...EN_SERVICES, ...EN_OTHER.slice(0, 3)];
const ALL_EN = [...EN_STATIC, ...EN_SERVICES, ...EN_OTHER];
const ALL = [...ALL_EN, ...NL_PAGES];
const LEFTOVERS = /Destinazione|Provienza|Data della presentazione|Oggi|Lorem ipsum|Thank you! Your submission has been received!|Oops! Something went wrong/i;

test.skip(!process.env.SZ_REDESIGN, 'Set SZ_REDESIGN=1 once the redesigned pages are published to staging');

async function visit(page, path) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  return { response, errors };
}

async function jsonLd(page) {
  return page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => JSON.parse(n.textContent)),
  );
}

function types(blocks) {
  return blocks.flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b])).map((b) => b['@type']);
}

test.describe('sz-site-redesign', () => {
  for (const path of ALL) {
    test.describe(path, () => {
      let result;

      test.beforeEach(async ({ page }) => {
        result = await visit(page, path);
      });

      test('every v1 page returns 200 and has exactly one H1', async ({ page }) => {
        expect(result.response.status()).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);
      });

      test('title is 30-60 characters and ends with the brand', async ({ page }) => {
        const title = await page.title();
        expect(title.length).toBeGreaterThanOrEqual(30);
        expect(title.length).toBeLessThanOrEqual(60);
        expect(title).toMatch(BRAND);
      });

      test('meta description is 70-160 characters', async ({ page }) => {
        const description = await page.getAttribute('meta[name="description"]', 'content');
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThanOrEqual(70);
        expect(description.length).toBeLessThanOrEqual(160);
      });

      test('canonical, og:title and og:image are present', async ({ page }) => {
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
        expect(await page.getAttribute('meta[property="og:title"]', 'content')).toBeTruthy();
        expect(await page.getAttribute('meta[property="og:image"]', 'content')).toMatch(/^https?:\/\//);
      });

      test('no nav or footer link points to "#"', async ({ page }) => {
        const dead = await page.$$eval('nav a, footer a', (links) =>
          links.map((a) => a.getAttribute('href')).filter((href) => !href || href === '#'),
        );
        expect(dead).toEqual([]);
      });

      test('no template leftovers', async ({ page }) => {
        const text = await page.evaluate(() => document.body.innerText);
        expect(text).not.toMatch(LEFTOVERS);
      });

      test('no console errors', async () => {
        expect(result.errors).toEqual([]);
      });
    });
  }

  test.describe('homepage', () => {
    test.beforeEach(async ({ page }) => {
      await visit(page, '/');
    });

    test('homepage has two door links that resolve to the door pages', async ({ page }) => {
      const doors = page.locator('[data-sz="doors"]');
      await expect(doors.locator('a[href="/for-businesses"]')).toHaveCount(1);
      await expect(doors.locator('a[href="/for-agencies"]')).toHaveCount(1);
      await doors.locator('a[href="/for-businesses"]').click();
      await expect(page).toHaveURL(/\/for-businesses$/);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('homepage hero has a primary CTA to /contact', async ({ page }) => {
      await expect(page.locator('[data-sz="hero"] a[href="/contact"]')).toHaveCount(1);
    });

    test('homepage FAQ has at least three items with FAQPage markup', async ({ page }) => {
      const faq = page.locator('[data-sz="faq"]');
      await expect(faq).toHaveCount(1);
      expect(await faq.locator('[itemprop="mainEntity"]').count()).toBeGreaterThanOrEqual(3);
      expect(await faq.getAttribute('itemtype')).toMatch(/schema\.org\/FAQPage/);
    });

    test('homepage hero stays visible with prefers-reduced-motion', async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-sz="hero"] h1')).toBeVisible();
      const opacity = await page.locator('[data-sz="hero"] h1').evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.9);
      await context.close();
    });

    test('homepage passes axe with no serious or critical violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).analyze();
      const severe = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(severe.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });

    test('mobile viewport shows no horizontal overflow on the homepage', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test('contact form carries hidden utm_source and conversion_page fields', async ({ page }) => {
    await visit(page, '/contact?utm_source=sz-test');
    await page.waitForTimeout(1000);
    const form = page.locator('[data-sz="contact-form"] form');
    await expect(form).toHaveCount(1);
    await expect(form.locator('input[name="utm_source"]')).toHaveValue('sz-test');
    await expect(form.locator('input[name="conversion_page"]')).toHaveCount(1);
  });

  for (const path of FAQ_PAGES.filter((p) => p !== '/')) {
    test(`FAQ block with FAQPage markup on ${path}`, async ({ page }) => {
      await visit(page, path);
      const faq = page.locator('[data-sz="faq"]');
      await expect(faq).toHaveCount(1);
      expect(await faq.locator('[itemprop="mainEntity"]').count()).toBeGreaterThanOrEqual(3);
    });
  }

  for (const path of EN_SERVICES) {
    test(`service page ${path} exposes a JSON-LD block that parses and names a Service`, async ({ page }) => {
      await visit(page, path);
      const found = types(await jsonLd(page));
      expect(found.some((t) => ['Service', 'ProfessionalService'].includes(t))).toBe(true);
    });
  }

  for (const path of ['/locations/haarlem', '/locations/amsterdam']) {
    test(`location page ${path} exposes ProfessionalService schema with areaServed`, async ({ page }) => {
      await visit(page, path);
      const blocks = (await jsonLd(page)).flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b]));
      const local = blocks.find((b) => b['@type'] === 'ProfessionalService');
      expect(local).toBeTruthy();
      expect(local.areaServed).toBeTruthy();
    });
  }

  test('pricing page shows at least three tiers with euro amounts', async ({ page }) => {
    await visit(page, '/pricing');
    const tiers = page.locator('[data-sz="tiers"] [data-sz-tier]');
    expect(await tiers.count()).toBeGreaterThanOrEqual(3);
    const text = await page.locator('[data-sz="tiers"]').innerText();
    expect((text.match(/€\s?\d/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  test('Oost case study page names Oost and shows at least one outcome stat', async ({ page }) => {
    await visit(page, '/work/oost');
    await expect(page.locator('h1')).toContainText(/Oost/);
    expect(await page.locator('[data-sz="stats"] [data-sz-stat]').count()).toBeGreaterThanOrEqual(1);
    expect(types(await jsonLd(page))).toContain('Article');
  });

  for (const path of NL_PAGES) {
    test(`Dutch page ${path} declares lang="nl" and links to its English alternate`, async ({ page }) => {
      await visit(page, path);
      expect(await page.getAttribute('html', 'lang')).toMatch(/^nl/);
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    });
  }

  for (const path of EN_WITH_NL_TWIN) {
    test(`English page ${path} declares the nl hreflang`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('link[rel="alternate"][hreflang="nl"]')).toHaveCount(1);
    });
  }

  test('llms.txt exists and names Studio Zissou and the care offer', async ({ request }) => {
    const res = await request.get(`${BASE}/llms.txt`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Studio Zissou/);
    expect(body).toMatch(/website-care|website care/i);
  });

  test('sitemap.xml lists the door and service pages', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    for (const path of ['/for-businesses', '/for-agencies', ...EN_SERVICES]) {
      expect(body).toContain(path);
    }
  });
});
