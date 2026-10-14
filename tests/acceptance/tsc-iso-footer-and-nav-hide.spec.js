// TDD acceptance tests — pre-implementation.
// These assert behaviour that is NOT yet built. They FAIL against the currently
// published site until the Webflow changes (Products "Hide in nav" switch +
// Collection List filter, footer ISO badge + legal line) are published to staging.
//
// Feature (spec: projects/the-signalling-company/.claude/specs/tsc-iso-footer-and-nav-hide.md):
//   1. Products collection gets a Switch "Hide in nav". Telecom Box is ON. The
//      Products mega-menu Collection List is filtered "Hide in nav is Off", so
//      Telecom Box leaves the nav (desktop + mobile, same component) but stays
//      on /products, on its own page and in the footer Products column.
//   2. Footer gets an ISO 9001:2015 seal (img, linked to the certificate PDF) in
//      .footer_bottom-right and a text link "ISO 9001:2015 certified by
//      Certifer Belgorail" in the first .footer_legal row.
//
// DOM hooks (verified live 2026-10-14):
//   Nav CMS list:      [data-nav="list"]   (6 on the page: Services/Projects/Products × desktop+mobile)
//   Products list:     the [data-nav="list"] whose first card links to /products/etcs
//   Nav cards:         a.card_nav-menu[href="/products/<slug>"]
//   See-all link:      [data-nav="see-all"] (init.js appends it into the list on desktop)
//   Footer products:   .footer a.link_footer[href="/products/<slug>"]
//   Footer legal rows: .footer_legal > .link_footer-legal
//   Badge:             img[alt*="ISO 9001"] inside a[href$=".pdf"] (new)

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const OTHER_PRODUCTS = ['/products/etcs', '/products/tbl1', '/products/pzb', '/products/computer-box', '/products/sensor-box'];
const HIDDEN_PRODUCT = '/products/telecom-box';

/** One row per Products nav list (desktop + mobile instances of the nav component). */
function productsNavLists(page) {
  return page.evaluate(({ hidden, others }) => {
    const rows = [];
    document.querySelectorAll('[data-nav="list"]').forEach((list, i) => {
      const first = list.querySelector('a.card_nav-menu');
      if (!first || first.getAttribute('href') !== '/products/etcs') return;
      const hrefs = Array.from(list.querySelectorAll('a.card_nav-menu')).map((a) => a.getAttribute('href'));
      const seeAll = list.querySelector('[data-nav="see-all"]');
      rows.push({
        i,
        inMobile: !!list.closest('.wrap_mobile-menu'),
        hasHidden: hrefs.includes(hidden),
        missingOthers: others.filter((h) => !hrefs.includes(h)),
        seeAllLast: !!seeAll && list.lastElementChild === seeAll,
      });
    });
    return rows;
  }, { hidden: HIDDEN_PRODUCT, others: OTHER_PRODUCTS });
}

async function gotoHome(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
}

test.describe('TSC ISO 9001 footer + Products hide-in-nav — 14 Oct 2026 (pre-implementation TDD)', () => {
  test('no console errors on homepage', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));
    await gotoHome(page, DESKTOP);
    await page.hover('.nav-menu-dektop .dropdown-toggle >> nth=0').catch(() => {});
    await page.waitForTimeout(500);
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('Telecom Box is absent from every Products nav list', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const rows = await productsNavLists(page);
    expect(rows.length, 'expected Products nav lists (desktop + mobile)').toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(r.hasHidden, `list ${r.i} (${r.inMobile ? 'mobile' : 'desktop'}) still shows Telecom Box`).toBe(false);
    }
  });

  test('the other five products remain in every Products nav list', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const rows = await productsNavLists(page);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(r.missingOthers, `list ${r.i} is missing: ${r.missingOthers.join(', ')}`).toHaveLength(0);
    }
  });

  test('see-all link is still appended on desktop', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const rows = await productsNavLists(page);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(r.seeAllLast, `list ${r.i}: see-all should still be the last child on desktop`).toBe(true);
    }
  });

  test('Telecom Box stays in the footer Products column', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const link = page.locator(`.footer a.link_footer[href="${HIDDEN_PRODUCT}"]`);
    await expect(link).toHaveCount(1);
  });

  test('Telecom Box product page still resolves', async ({ page }) => {
    const response = await page.goto(`${STAGING_URL}${HIDDEN_PRODUCT}`, { waitUntil: 'load', timeout: 30000 });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toContainText(/telecom/i);
  });

  test('footer badge image is visible, loaded and links to the PDF', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const img = page.locator('.footer img[alt*="ISO 9001"]').first();
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    const loaded = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    expect(loaded, 'badge image should have loaded').toBe(true);
    const link = img.locator('xpath=ancestor::a[1]');
    await expect(link).toHaveAttribute('href', /\.pdf(\?.*)?$/i);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('footer legal row has the ISO text link to the PDF', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const link = page.locator('.footer_legal a', { hasText: 'ISO 9001:2015' }).first();
    await expect(link).toHaveCount(1);
    await expect(link).toContainText('certified by Certifer Belgorail');
    await expect(link).toHaveAttribute('href', /\.pdf(\?.*)?$/i);
  });

  test('footer badge is visible on mobile', async ({ page }) => {
    await gotoHome(page, MOBILE);
    const img = page.locator('.footer img[alt*="ISO 9001"]').first();
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal overflow on mobile').toBeLessThanOrEqual(0);
  });

  test('badge link and image have accessible names', async ({ page }) => {
    await gotoHome(page, DESKTOP);
    const img = page.locator('.footer img[alt*="ISO 9001"]').first();
    const alt = await img.getAttribute('alt');
    expect(alt?.trim().length).toBeGreaterThan(0);
    const link = img.locator('xpath=ancestor::a[1]');
    const name = await link.evaluate((el) => el.getAttribute('aria-label') || el.textContent?.trim() || '');
    expect(name.length, 'badge link needs an accessible name').toBeGreaterThan(0);
  });
});
