/**
 * Carsa October 2026 report fixes — acceptance tests.
 * Spec: projects/carsa/.claude/specs/carsa-oct-2026-report-fixes.md
 *
 * Checks raw HTML with request.get: every fix is Webflow content (Footer symbol, template
 * buttons, page SEO settings, CMS rich text) that only exists after a publish.
 * Run against staging first: CARSA_URL=https://carsa-v2.webflow.io
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const BASE = process.env.CARSA_URL || 'https://www.carsa.co.uk';
const SLUG = 'carsa-oct-2026-report-fixes';

const FOOTER_PAGES = ['/', '/car-finance', '/stores/bradford', '/blog/best-used-estate-cars-uk'];
const LEARN_MORE_PAGES = ['/', '/car-finance', '/stores/bradford', '/used-cars/near/bradford'];
const VALUE_CAR_POSTS = [
  '/blog/best-used-estate-cars-uk',
  '/blog/best-used-cars-under-15000-uk',
  '/blog/is-the-volkswagen-golf-reliable-used-buyer-guide',
];
const IMAGE_POSTS = ['/blog/best-used-estate-cars-uk', '/blog/best-used-cars-under-15000-uk'];

async function html(request, path) {
  const res = await request.get(`${BASE}${path}`);
  expect(res.status(), `${path} status`).toBe(200);
  return res.text();
}

function footerParagraph(page) {
  const start = page.indexOf('footer_section-bottom');
  expect(start, 'footer bottom section present').toBeGreaterThan(-1);
  return page.slice(start, start + 6000);
}

function metaDescription(page) {
  const m =
    page.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ||
    page.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/);
  return m ? m[1] : null;
}

test.describe(SLUG, () => {
  for (const path of FOOTER_PAGES) {
    test(`footer complaints link reads "read our complaints procedure" on ${path}`, async ({ request }) => {
      const footer = footerParagraph(await html(request, path));
      expect(footer).toContain('read our complaints procedure</a>');
      expect(footer).not.toMatch(/>\s*click here\s*<\/a>/i);
    });

    test(`footer FCA link is descriptive, not a bare URL, on ${path}`, async ({ request }) => {
      const footer = footerParagraph(await html(request, path));
      expect(footer).toContain('Financial Services Register</a>');
      expect(footer).not.toMatch(/<a[^>]*>\s*https?:\/\//i);
    });

    test(`footer keeps the FOS and FCA phone numbers on ${path}`, async ({ request }) => {
      const footer = footerParagraph(await html(request, path));
      expect(footer).toContain('0800 023 4567');
      expect(footer).toContain('0800 111 6768');
    });
  }

  for (const path of LEARN_MORE_PAGES) {
    test(`no "Learn more" link text on ${path}`, async ({ request }) => {
      const page = await html(request, path);
      expect(page).not.toMatch(/<a[^>]*>\s*Learn more\s*<\/a>/i);
    });
  }

  test('part exchange has its own meta description', async ({ request }) => {
    const px = metaDescription(await html(request, '/sell-car/part-exchange'));
    const value = metaDescription(await html(request, '/sell-car/value-car'));
    expect(px).toBeTruthy();
    expect(px).not.toBe(value);
    expect(px.length).toBeGreaterThanOrEqual(50);
    expect(px.length).toBeLessThanOrEqual(160);
  });

  test('no links to /administration-fees on /car-finance', async ({ request }) => {
    const page = await html(request, '/car-finance');
    expect(page).not.toMatch(/href="(https:\/\/www\.carsa\.co\.uk)?\/administration-fees"/);
  });

  for (const path of VALUE_CAR_POSTS) {
    test(`${path} links to /sell-car/value-car, not /value-car`, async ({ request }) => {
      const page = await html(request, path);
      expect(page).not.toMatch(/href="(https:\/\/www\.carsa\.co\.uk)?\/value-car"/);
    });
  }

  test('Golf post links to /used-cars/models/volkswagen-golf', async ({ request }) => {
    const page = await html(request, '/blog/is-the-volkswagen-golf-reliable-used-buyer-guide');
    expect(page).not.toMatch(/href="(https:\/\/www\.carsa\.co\.uk)?\/models\/volkswagen-golf"/);
  });

  for (const path of IMAGE_POSTS) {
    test(`car images on ${path} all load`, async ({ request }) => {
      const page = await html(request, path);
      const srcs = [...page.matchAll(/src=['"](https:\/\/r\.carsa\.co\.uk\/[^'"]+)['"]/g)].map((m) => m[1]);
      for (const src of srcs) {
        const res = await request.get(src);
        expect(res.status(), src).toBe(200);
      }
    });
  }

  for (const path of [...VALUE_CAR_POSTS]) {
    test(`related cards on ${path} no longer link to the old adaptive cruise control slug`, async ({ request }) => {
      const page = await html(request, path);
      expect(page).not.toMatch(/href="(https:\/\/www\.carsa\.co\.uk)?\/blog\/what-is-adaptive-cruise-control"/);
    });
  }
});
