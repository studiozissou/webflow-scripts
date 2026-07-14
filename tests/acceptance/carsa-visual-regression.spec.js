/**
 * carsa-visual-regression — Acceptance tests
 *
 * Proof-of-concept tests validating the visual regression approach
 * works against Carsa's live site. The full system will live on
 * focalstrategy/carsa-website-support — these tests prove the
 * pattern before building it out there.
 *
 * Tests here focus on:
 * 1. toHaveScreenshot works with Carsa pages (static + masked CMS)
 * 2. Console error collection works
 * 3. Broken link detection works
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'carsa-visual-regression';
const BASE = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await waitForReady(page);
  await page.waitForTimeout(2000); // Finsweet + custom JS settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// Known third-party error patterns to filter out
const THIRD_PARTY_NOISE = [
  /google/i,
  /gtm/i,
  /facebook/i,
  /hotjar/i,
  /cookiebot/i,
  /tawk/i,
  /intercom/i,
  /clarity/i,
];

function isThirdParty(error) {
  const msg = error.message || String(error);
  return THIRD_PARTY_NOISE.some((pattern) => pattern.test(msg));
}

// ── Visual Regression: Static Page ────────────────────────────

test.describe(`${SLUG} — Visual: Static Page`, () => {
  test('homepage desktop matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadPage(page, '/about');
    await expect(page).toHaveScreenshot('about-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('homepage mobile matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadPage(page, '/about');
    await expect(page).toHaveScreenshot('about-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

// ── Visual Regression: CMS Page with Masking ──────────────────

test.describe(`${SLUG} — Visual: CMS Page (Masked)`, () => {
  test('SRP desktop — CMS cards masked', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadPage(page, '/used-cars');

    // Mask dynamic CMS content so only layout/chrome is compared
    const masks = [
      page.locator('.w-dyn-item'),
      page.locator('[fs-cmsfilter-element="total-count"]'),
      page.locator('.w-pagination-wrapper'),
    ];

    await expect(page).toHaveScreenshot('used-cars-desktop-masked.png', {
      fullPage: true,
      mask: masks,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('SRP mobile — CMS cards masked', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadPage(page, '/used-cars');

    const masks = [
      page.locator('.w-dyn-item'),
      page.locator('[fs-cmsfilter-element="total-count"]'),
      page.locator('.w-pagination-wrapper'),
    ];

    await expect(page).toHaveScreenshot('used-cars-mobile-masked.png', {
      fullPage: true,
      mask: masks,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

// ── Visual Regression: Dynamic VDP ────────────────────────────

test.describe(`${SLUG} — Visual: Dynamic VDP`, () => {
  test('VDP from homepage carousel — desktop, CMS masked', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loadPage(page, '/');

    // Grab the first vehicle link from the homepage carousel
    const vdpHref = await page.evaluate(() => {
      const link = document.querySelector('.w-dyn-list .w-dyn-item a[href*="/vehicles/"]');
      return link ? link.getAttribute('href') : null;
    });
    expect(vdpHref, 'No vehicle link found in homepage carousel').toBeTruthy();

    await loadPage(page, vdpHref);

    const masks = [
      page.locator('.w-dyn-item'),         // any CMS sub-lists
      page.locator('[data-price]'),         // price elements
      page.locator('.vehicle-gallery img'), // gallery images
    ];

    await expect(page).toHaveScreenshot('vdp-desktop-masked.png', {
      fullPage: true,
      mask: masks,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

// ── Console Error Detection ───────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  const pages = ['/', '/used-cars', '/car-finance', '/about', '/contact'];

  for (const path of pages) {
    test(`no first-party JS errors on ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      await page.waitForTimeout(1000);

      const firstPartyErrors = errors.filter((e) => !isThirdParty(e));
      expect(
        firstPartyErrors,
        `JS errors on ${path}: ${firstPartyErrors.map((e) => e.message).join(', ')}`
      ).toHaveLength(0);
    });
  }
});

// ── Broken Link Detection ─────────────────────────────────────

test.describe(`${SLUG} — Broken Links`, () => {
  test('homepage has no broken internal links', async ({ page, request }) => {
    await loadPage(page, '/');

    // Collect all internal links
    const links = await page.evaluate((base) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map((a) => a.href)
        .filter(
          (href) =>
            href.startsWith(base) ||
            href.startsWith('/') ||
            href.startsWith(base.replace('https://', 'http://'))
        )
        .filter(
          (href) =>
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('javascript:') &&
            !href.includes('#')
        );
    }, BASE);

    // Deduplicate
    const unique = [...new Set(links)];

    // Check each link (HEAD request, 10s timeout)
    const broken = [];
    for (const url of unique.slice(0, 30)) {
      // Cap at 30 to avoid rate limiting
      try {
        const resp = await request.head(url, { timeout: 10_000 });
        if (resp.status() >= 400) {
          broken.push({ url, status: resp.status() });
        }
      } catch {
        broken.push({ url, status: 'timeout' });
      }
    }

    expect(
      broken,
      `Broken links: ${broken.map((b) => `${b.url} (${b.status})`).join(', ')}`
    ).toHaveLength(0);
  });
});
