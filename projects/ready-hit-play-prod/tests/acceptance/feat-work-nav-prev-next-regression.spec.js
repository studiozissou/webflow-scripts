// @ts-check
/**
 * Regression — feat-work-nav-prev-next
 *
 * Discovered during the /build verify loop on 2026-04-09:
 *   Webflow adds [data-wf-item-slug] to the <html> element on CMS Collection
 *   template pages. Barba only swaps [data-barba="container"], NOT <html> —
 *   so the attribute is STALE after any Barba case→case transition.
 *
 *   Symptom: after clicking `next` on /work/overland-ai, URL changes to
 *   /work/remote via Barba but `currentSlug` reads "overland-ai" (stale),
 *   and prev/next hrefs point at the wrong neighbours.
 *
 * Fix: resolve current slug from `location.pathname` only.
 *
 * This regression test asserts that after a Barba case→case transition the
 * prev/next hrefs reflect the NEW current page, not the old one.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-work-nav-prev-next-regression';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

const CASE_ENTRY = '/work/overland-ai';

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

async function readCmsSlugs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'))
      .map((el) => el.getAttribute('data-url'))
      .filter(Boolean)
  );
}

async function readHref(page, which) {
  return page.getAttribute(`a[data-button="work-${which}"]`, 'href');
}

test.describe(`${SLUG} — Barba case→case slug resolution`, () => {
  test('prev/next hrefs update to NEW current page after Barba transition', async ({ page }) => {
    await loadPage(page, CASE_ENTRY);

    const slugs = await readCmsSlugs(page);
    test.skip(slugs.length < 3, 'Need ≥3 cases to verify prev/next after transition');

    const currentIdx = slugs.indexOf('overland-ai');
    test.skip(currentIdx === -1, 'overland-ai not in CMS list');

    const expectedNextSlug = slugs[(currentIdx + 1) % slugs.length];
    const expectedNextNextSlug = slugs[(currentIdx + 2) % slugs.length];
    const expectedPrevAfterHop = slugs[currentIdx]; // the page we came from

    // Click next — Barba case→case transition
    await page.locator('a[data-button="work-next"]').click();
    await page.waitForTimeout(2000);
    await waitForRHP(page);

    // URL should be the expected next slug
    expect(page.url()).toMatch(new RegExp(`/work/${expectedNextSlug}/?$`));

    // After the transition, prev should point at where we came from,
    // next should point two steps forward from the original page.
    // If the bug regresses (stale [data-wf-item-slug] from <html>), prev/next
    // would still reflect the ORIGINAL page and this assertion would fail.
    const prevHref = await readHref(page, 'previous');
    const nextHref = await readHref(page, 'next');

    expect(
      prevHref,
      `After Barba transition to /work/${expectedNextSlug}, prev should point to /work/${expectedPrevAfterHop} (the page we came from). Got: ${prevHref}`
    ).toMatch(new RegExp(`/work/${expectedPrevAfterHop}/?$`));

    expect(
      nextHref,
      `After Barba transition to /work/${expectedNextSlug}, next should point to /work/${expectedNextNextSlug}. Got: ${nextHref}`
    ).toMatch(new RegExp(`/work/${expectedNextNextSlug}/?$`));
  });

  test('slug resolution does not rely on stale <html>[data-wf-item-slug]', async ({ page }) => {
    // Load first case, then navigate via Barba to a second case
    await loadPage(page, CASE_ENTRY);

    const slugs = await readCmsSlugs(page);
    test.skip(slugs.length < 2, 'Need ≥2 cases');

    await page.locator('a[data-button="work-next"]').click();
    await page.waitForTimeout(2000);
    await waitForRHP(page);

    // Read the raw <html> attribute vs the hrefs work-nav computed.
    // If the bug regressed, the <html> attribute would still say 'overland-ai'
    // AND the hrefs would match that stale slug (proving the module used it).
    const htmlSlugAttr = await page.evaluate(() =>
      document.documentElement.getAttribute('data-wf-item-slug')
    );
    const pathnameSlug = await page.evaluate(() =>
      location.pathname.split('/').filter(Boolean).pop()
    );

    // If these diverge, work-nav MUST be using pathname, not the html attr.
    if (htmlSlugAttr && htmlSlugAttr !== pathnameSlug) {
      const currentIdx = slugs.indexOf(pathnameSlug);
      const expectedPrev = slugs[(currentIdx - 1 + slugs.length) % slugs.length];
      const prevHref = await readHref(page, 'previous');
      expect(
        prevHref,
        `<html>[data-wf-item-slug] is stale ("${htmlSlugAttr}") but pathname is "${pathnameSlug}". ` +
        `work-nav must use pathname. Expected prev /work/${expectedPrev}, got ${prevHref}.`
      ).toMatch(new RegExp(`/work/${expectedPrev}/?$`));
    }
  });
});
