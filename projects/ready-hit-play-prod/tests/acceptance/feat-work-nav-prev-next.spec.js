// @ts-check
/**
 * Acceptance tests — feat-work-nav-prev-next
 *
 * Spec: .claude/specs/feat-work-nav-prev-next.md
 *
 * Verifies that the two buttons with data-button="work-previous" and
 * data-button="work-next" on /work/<slug> pages are wired to navigate
 * to the previous / next case study in the CMS collection, cyclically.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-work-nav-prev-next';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

const CASE_ENTRY = '/work/overland-ai';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // allow Barba/GSAP init to settle
}

/** Read the ordered slug list from the hidden .dial_cms-list on the page. */
async function readCmsSlugs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'))
      .map((el) => el.getAttribute('data-url'))
      .filter(Boolean)
  );
}

/** Read the href attribute of a button (prev or next). */
async function readButtonHref(page, which) {
  return page.getAttribute(`a[data-button="work-${which}"]`, 'href');
}

/** Read the label text of a button (prev or next). */
async function readButtonLabel(page, which) {
  return page.locator(
    `a[data-button="work-${which}"] .text-size-tiny.text-style-allcaps`
  ).textContent();
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Elements & hrefs`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, CASE_ENTRY);
  });

  test('both buttons exist and are attached', async ({ page }) => {
    await expect(page.locator('a[data-button="work-previous"]')).toBeAttached();
    await expect(page.locator('a[data-button="work-next"]')).toBeAttached();
  });

  test('hrefs are populated with /work/ paths (not #)', async ({ page }) => {
    const prev = await readButtonHref(page, 'previous');
    const next = await readButtonHref(page, 'next');
    expect(prev, 'previous href').not.toBe('#');
    expect(next, 'next href').not.toBe('#');
    expect(prev).toMatch(/\/work\/[\w-]+\/?$/);
    expect(next).toMatch(/\/work\/[\w-]+\/?$/);
  });

  test('RHP.workNav module is registered with a version', async ({ page }) => {
    const version = await page.evaluate(() => window.RHP?.workNav?.version);
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  test('button labels show the target project title (not "Previous"/"Next")', async ({ page }) => {
    // Read CMS data-title for the prev/next neighbours of the entry case
    const meta = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'))
        .map((el) => ({
          url: el.getAttribute('data-url'),
          title: el.getAttribute('data-title')
        }))
        .filter((i) => i.url && i.title);
      const slug = location.pathname.split('/').filter(Boolean).pop();
      const idx = items.findIndex((i) => i.url === slug);
      if (idx === -1 || items.length < 2) return null;
      const prev = items[(idx - 1 + items.length) % items.length];
      const next = items[(idx + 1) % items.length];
      return { prevTitle: prev.title, nextTitle: next.title };
    });
    test.skip(meta === null, 'CMS list missing or current slug not in list');

    const prevLabel = (await readButtonLabel(page, 'previous')).trim();
    const nextLabel = (await readButtonLabel(page, 'next')).trim();
    expect(prevLabel).toBe(meta.prevTitle);
    expect(nextLabel).toBe(meta.nextTitle);
    // Defensive: ensure we did NOT leave the placeholder labels in place
    expect(prevLabel.toLowerCase()).not.toBe('previous');
    expect(nextLabel.toLowerCase()).not.toBe('next');
  });
});

test.describe(`${SLUG} — Cyclic wrapping`, () => {
  test('previous on first CMS item wraps to last', async ({ page }) => {
    // Read the CMS list from any case page so we know which case is first
    await loadPage(page, CASE_ENTRY);
    const slugs = await readCmsSlugs(page);
    test.skip(slugs.length < 2, 'CMS list has fewer than 2 items');

    const firstSlug = slugs[0];
    const lastSlug = slugs[slugs.length - 1];

    await loadPage(page, `/work/${firstSlug}`);

    const prev = await readButtonHref(page, 'previous');
    expect(prev, `previous on first (${firstSlug}) should wrap to last (${lastSlug})`)
      .toMatch(new RegExp(`/work/${lastSlug}/?$`));
  });

  test('next on last CMS item wraps to first', async ({ page }) => {
    await loadPage(page, CASE_ENTRY);
    const slugs = await readCmsSlugs(page);
    test.skip(slugs.length < 2, 'CMS list has fewer than 2 items');

    const firstSlug = slugs[0];
    const lastSlug = slugs[slugs.length - 1];

    await loadPage(page, `/work/${lastSlug}`);

    const next = await readButtonHref(page, 'next');
    expect(next, `next on last (${lastSlug}) should wrap to first (${firstSlug})`)
      .toMatch(new RegExp(`/work/${firstSlug}/?$`));
  });
});

test.describe(`${SLUG} — Barba navigation`, () => {
  test('clicking next navigates to the expected case via Barba', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_ENTRY);

    const slugs = await readCmsSlugs(page);
    const currentIndex = slugs.indexOf('overland-ai');
    test.skip(currentIndex === -1, 'overland-ai not in CMS list');
    const expectedNext = slugs[(currentIndex + 1) % slugs.length];

    // Click the next button — Barba should intercept
    await page.locator('a[data-button="work-next"]').click();

    // Wait for Barba transition to complete
    await page.waitForTimeout(2000);
    await waitForRHP(page);

    expect(page.url()).toMatch(new RegExp(`/work/${expectedNext}/?$`));
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Barba re-entry`, () => {
  test('hrefs still correct after home → case → home → case', async ({ page }) => {
    const errors = collectErrors(page);

    await loadPage(page, CASE_ENTRY);
    const firstPrev = await readButtonHref(page, 'previous');
    const firstNext = await readButtonHref(page, 'next');

    // Navigate home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Navigate back to the same case
    await loadPage(page, CASE_ENTRY);

    const secondPrev = await readButtonHref(page, 'previous');
    const secondNext = await readButtonHref(page, 'next');

    expect(secondPrev).toBe(firstPrev);
    expect(secondNext).toBe(firstNext);

    // No duplicate buttons introduced by the re-init
    expect(await page.locator('a[data-button="work-previous"]').count()).toBe(1);
    expect(await page.locator('a[data-button="work-next"]').count()).toBe(1);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on case page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_ENTRY);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
