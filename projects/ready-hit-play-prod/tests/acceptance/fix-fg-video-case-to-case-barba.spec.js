// @ts-check
/**
 * Acceptance tests — fix-fg-video-case-to-case-barba
 *
 * Spec: .claude/specs/fix-fg-video-case-to-case-barba.md
 *
 * Verifies that the persistent foreground video (#fg-video-wrap > .dial_fg-video)
 * updates its src to the correct teaser when navigating between case studies
 * via Barba page transitions (work→work).
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-fg-video-case-to-case-barba';
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
  await page.waitForTimeout(1500); // allow GSAP / Barba init to settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Read the fg-video attribute from the case-studies_wrapper inside the Barba container. */
async function readCaseFgVideoAttr(page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector('[data-barba="container"] .case-studies_wrapper');
    if (!wrapper) return null;
    const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    return (isMobile && wrapper.getAttribute('fg-video-mobile'))
      || wrapper.getAttribute('fg-video')
      || null;
  });
}

/** Read the current src of the persistent FG video element. */
async function readFgVideoSrc(page) {
  return page.evaluate(() => {
    const v = document.querySelector('#fg-video-wrap > .dial_fg-video');
    return v ? v.src : null;
  });
}

/** Read the currentTime of the persistent FG video element. */
async function readFgVideoTime(page) {
  return page.evaluate(() => {
    const v = document.querySelector('#fg-video-wrap > .dial_fg-video');
    return v ? v.currentTime : null;
  });
}

/** Read the CMS slug list from the hidden dial CMS list. */
async function readCmsSlugs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'))
      .map((el) => el.getAttribute('data-url'))
      .filter(Boolean)
  );
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — FG video src update on work→work`, () => {
  test('FG video src updates after work→work Barba transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_ENTRY);

    // Record the FG video src on the first case page
    const firstSrc = await readFgVideoSrc(page);
    expect(firstSrc, 'FG video should have a src on first case').toBeTruthy();

    // Find the next case slug from the CMS list
    const slugs = await readCmsSlugs(page);
    const currentIndex = slugs.indexOf('overland-ai');
    test.skip(currentIndex === -1, 'overland-ai not in CMS list');
    test.skip(slugs.length < 2, 'CMS list has fewer than 2 items');
    const nextSlug = slugs[(currentIndex + 1) % slugs.length];

    // Navigate to next case via Barba (click the work-next button)
    await page.locator('a[data-button="work-next"]').click();
    await page.waitForTimeout(2500); // Barba transition
    await waitForRHP(page);

    // Read the new case's expected fg-video attribute
    const expectedAttr = await readCaseFgVideoAttr(page);
    test.skip(!expectedAttr, 'Next case has no fg-video attribute');

    // Verify FG video src updated
    const newSrc = await readFgVideoSrc(page);
    expect(newSrc, 'FG video src should have changed').not.toBe(firstSrc);

    // Verify the new src resolves to the expected attribute
    const resolvedExpected = await page.evaluate(
      (url) => new URL(url, location.href).href,
      expectedAttr
    );
    expect(newSrc).toBe(resolvedExpected);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('FG video currentTime resets to near 0 after transition', async ({ page }) => {
    await loadPage(page, CASE_ENTRY);

    // Let the video play for a few seconds so currentTime advances
    await page.waitForTimeout(3000);
    const timeBefore = await readFgVideoTime(page);
    expect(timeBefore, 'Video should have advanced past 0').toBeGreaterThan(0.5);

    // Navigate to next case
    await page.locator('a[data-button="work-next"]').click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    // Wait a beat for the new video to start
    await page.waitForTimeout(500);
    const timeAfter = await readFgVideoTime(page);
    expect(timeAfter, 'Video currentTime should reset to near 0').toBeLessThan(2);
  });

  test('same-case navigation does not reload the video', async ({ page }) => {
    await loadPage(page, CASE_ENTRY);

    const srcBefore = await readFgVideoSrc(page);

    // Navigate to the same case (programmatic Barba go)
    await page.evaluate((path) => {
      if (window.barba) window.barba.go(path);
    }, CASE_ENTRY);
    await page.waitForTimeout(2500);
    await waitForRHP(page);

    const srcAfter = await readFgVideoSrc(page);
    expect(srcAfter, 'src should not change on same-case nav').toBe(srcBefore);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during case→case transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_ENTRY);

    await page.locator('a[data-button="work-next"]').click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Direct load & round-trip`, () => {
  test('FG video still loads correctly on direct page load', async ({ page }) => {
    await loadPage(page, CASE_ENTRY);

    const src = await readFgVideoSrc(page);
    const attr = await readCaseFgVideoAttr(page);

    test.skip(!attr, 'Case has no fg-video attribute');
    expect(src, 'FG video should be populated on direct load').toBeTruthy();

    const resolved = await page.evaluate(
      (url) => new URL(url, location.href).href,
      attr
    );
    expect(src).toBe(resolved);
  });

  test('home→case→case→home round-trip has no errors', async ({ page }) => {
    const errors = collectErrors(page);

    // Start on home
    await loadPage(page, '/');

    // Navigate to a case page via direct URL (Barba intercepts)
    await page.goto(`${BASE}${CASE_ENTRY}`);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Navigate to next case via work-next
    const hasNextButton = await page.locator('a[data-button="work-next"]').count();
    if (hasNextButton > 0) {
      await page.locator('a[data-button="work-next"]').click();
      await page.waitForTimeout(2500);
      await waitForRHP(page);
    }

    // Navigate home
    await page.goto(`${BASE}/`);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
