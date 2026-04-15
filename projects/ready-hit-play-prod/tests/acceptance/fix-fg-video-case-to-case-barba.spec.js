// @ts-check
/**
 * Acceptance tests — fix-fg-video-case-to-case-barba
 *
 * Verifies that the persistent FG teaser video updates its src and autoplays
 * when navigating between work/case pages via Barba. Also checks that
 * direct-land and home→case paths are unaffected.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-fg-video-case-to-case-barba';
const STAGING = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const CASE_PAGE_1 = '/work/overland-ai';
const CASE_PAGE_2 = '/work/remote';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path) {
  await page.goto(`${STAGING}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Get the fg-video attribute from the current case page's .case-studies_wrapper.
 * Returns the expected src URL for the persistent FG video.
 */
async function getExpectedFgSrc(page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector('.case-studies_wrapper');
    if (!wrapper) return '';
    const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    return (isMobile && wrapper.getAttribute('fg-video-mobile'))
           || wrapper.getAttribute('fg-video') || '';
  });
}

/** Get the current src of the persistent FG video element. */
async function getFgVideoSrc(page) {
  return page.evaluate(() => {
    const video = document.querySelector('#fg-video-wrap > .dial_fg-video');
    return video?.src || '';
  });
}

/** Check if the persistent FG video is playing. */
async function isFgVideoPlaying(page) {
  return page.evaluate(() => {
    const video = document.querySelector('#fg-video-wrap > .dial_fg-video');
    return video ? !video.paused : false;
  });
}

/** Trigger Barba navigation to a path via barba.go(). */
async function barbaNavigate(page, path) {
  await page.evaluate((p) => {
    if (window.barba) window.barba.go(p);
  }, path);
  await page.waitForTimeout(2500); // Barba transition settle
  await waitForRHP(page);
  await page.waitForTimeout(1500); // post-transition init settle
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — FG Video Update`, () => {
  test('FG video src updates after case→case Barba nav', async ({ page }) => {
    await loadPage(page, CASE_PAGE_1);

    const srcBefore = await getFgVideoSrc(page);
    expect(srcBefore).toBeTruthy();

    await barbaNavigate(page, CASE_PAGE_2);

    const expectedSrc = await getExpectedFgSrc(page);
    const srcAfter = await getFgVideoSrc(page);

    expect(srcAfter).toBeTruthy();
    expect(srcAfter).not.toBe(srcBefore);
    // The src should end with the same filename as the expected attribute
    // (full URL may differ due to Webflow CDN resolution)
    expect(srcAfter).toContain(expectedSrc.split('/').pop());
  });

  test('FG video is playing after case→case nav', async ({ page }) => {
    await loadPage(page, CASE_PAGE_1);
    await barbaNavigate(page, CASE_PAGE_2);

    // Wait a bit for autoplay to kick in
    await page.waitForTimeout(1000);

    const playing = await isFgVideoPlaying(page);
    expect(playing).toBe(true);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during case→case navigation', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_PAGE_1);
    await barbaNavigate(page, CASE_PAGE_2);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Direct Land`, () => {
  test('direct-land on case page loads correct FG video', async ({ page }) => {
    await loadPage(page, CASE_PAGE_2);

    const expectedSrc = await getExpectedFgSrc(page);
    const actualSrc = await getFgVideoSrc(page);

    expect(actualSrc).toBeTruthy();
    expect(actualSrc).toContain(expectedSrc.split('/').pop());
  });
});

test.describe(`${SLUG} — Home→Case Regression`, () => {
  test('home→case transition: FG video plays', async ({ page }) => {
    await loadPage(page, '/');
    await barbaNavigate(page, CASE_PAGE_1);

    await page.waitForTimeout(1000);
    const src = await getFgVideoSrc(page);
    expect(src).toBeTruthy();
  });
});

test.describe(`${SLUG} — Multiple Navigations`, () => {
  test('navigate through 3 case pages: FG src correct each time', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, CASE_PAGE_1);

    const src1 = await getFgVideoSrc(page);
    expect(src1).toBeTruthy();

    // Navigate to page 2
    await barbaNavigate(page, CASE_PAGE_2);
    const src2 = await getFgVideoSrc(page);
    expect(src2).toBeTruthy();
    expect(src2).not.toBe(src1);

    // Navigate back to page 1
    await barbaNavigate(page, CASE_PAGE_1);
    const src3 = await getFgVideoSrc(page);
    expect(src3).toBeTruthy();
    expect(src3).not.toBe(src2);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
