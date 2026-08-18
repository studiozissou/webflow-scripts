// TDD acceptance tests — pre-implementation.
// These assert future behaviour that is NOT yet built. They FAIL against the
// currently-deployed init.js (which appends the "see all" link at every
// viewport) until the responsive placement ships and the CDN hash is bumped.
//
// Feature: each mega-menu dropdown has a [data-nav="see-all"] link sitting next
// to its CMS [data-nav="list"]. init.js moves it INTO the list. Desktop keeps it
// at the END (append, unchanged); tablet-and-below (Webflow ≤991px) moves it to
// the START (prepend) so it reads first in the stacked mobile menu. The order
// must also update live when the viewport crosses the 991px breakpoint.
//
// DOM hooks (verified live 2026-07-16):
//   Dropdown panel:  .w-dropdown-list
//   CMS list:        [data-nav="list"]   (inside the panel)
//   See-all link:    [data-nav="see-all"] (inside the panel, moved into the list)
// Webflow renders BOTH nav subtrees at once — desktop (.nav-menu-dektop) and
// mobile (.wrap_mobile-menu) — and CSS shows/hides them by breakpoint. The
// placement rule is viewport-based and applies to every dropdown, so these
// tests assert on ALL dropdowns that carry both hooks.

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 810, height: 1080 }; // Webflow tablet range (≤991)
const MOBILE = { width: 375, height: 812 }; // Webflow mobile portrait (≤479)

/** For every .w-dropdown-list that has both a [data-nav="list"] and a
 *  [data-nav="see-all"], report whether see-all is the first / last child of
 *  the list. Returns one row per qualifying dropdown. */
function seeAllPlacement(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('.w-dropdown-list').forEach((dd, i) => {
      const list = dd.querySelector('[data-nav="list"]');
      const seeAll = dd.querySelector(':scope [data-nav="see-all"]');
      if (!list || !seeAll) return;
      rows.push({
        i,
        inMobile: !!dd.closest('.wrap_mobile-menu'),
        inList: list.contains(seeAll),
        isFirst: list.firstElementChild === seeAll,
        isLast: list.lastElementChild === seeAll,
        count: list.children.length,
      });
    });
    return rows;
  });
}

test.describe('TSC nav see-all responsive placement — 16 Jul 2026 (pre-implementation TDD)', () => {
  test('desktop (≥992px): see-all is APPENDED (last child) in every dropdown', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500); // Webflow nav + init.js settle

    const rows = await seeAllPlacement(page);
    expect(rows.length, 'expected mega-menu dropdowns with a see-all link').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.inList, `dropdown ${r.i}: see-all should be moved into the list`).toBe(true);
      expect(r.isLast, `dropdown ${r.i}: see-all should be the LAST child on desktop`).toBe(true);
    }
  });

  test('tablet (≤991px): see-all is PREPENDED (first child) in every dropdown', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    const rows = await seeAllPlacement(page);
    expect(rows.length, 'expected mega-menu dropdowns with a see-all link').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.inList, `dropdown ${r.i}: see-all should be moved into the list`).toBe(true);
      expect(r.isFirst, `dropdown ${r.i}: see-all should be the FIRST child on tablet`).toBe(true);
    }
  });

  test('mobile (≤479px): see-all is PREPENDED (first child) — "tablet and below"', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    const rows = await seeAllPlacement(page);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.isFirst, `dropdown ${r.i}: see-all should be the FIRST child on mobile`).toBe(true);
    }
  });

  test('placement updates live when the viewport crosses the 991px breakpoint', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Start desktop → all appended (last).
    let rows = await seeAllPlacement(page);
    expect(rows.every((r) => r.isLast), 'all see-all should be last at desktop').toBe(true);

    // Shrink across the breakpoint → all prepended (first).
    await page.setViewportSize(TABLET);
    await page.waitForTimeout(400);
    rows = await seeAllPlacement(page);
    expect(rows.every((r) => r.isFirst), 'all see-all should move to first below 991px').toBe(true);

    // Grow back → all appended (last) again.
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(400);
    rows = await seeAllPlacement(page);
    expect(rows.every((r) => r.isLast), 'all see-all should return to last above 991px').toBe(true);
  });

  test('no console errors on load (tablet viewport)', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.setViewportSize(TABLET);
    await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
