// @ts-check
/**
 * Acceptance tests — fix-case-video-autoplay-barba
 *
 * Verifies that controlled video sections (.section_case-video with
 * .case-video_control-wrapper) autoplay after Barba transitions,
 * not just on direct page load.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-case-video-autoplay-barba';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const HOME = BASE + '/';
const ABOUT = BASE + '/about';
// Use a case study page that has controlled video sections
const WORK_PATH = '/work/';  // resolved dynamically from first nav link

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, url) {
  await page.goto(url);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Navigate from home to a work page via Barba (click a dial sector link).
 * Returns the work page URL.
 */
async function barbaHomeToWork(page) {
  await loadPage(page, HOME);
  // Find first case study link in the dial
  const caseLink = page.locator('a[href*="/work/"]').first();
  const href = await caseLink.getAttribute('href');
  await caseLink.click();
  // Wait for Barba transition to complete
  await page.waitForTimeout(2500);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
  return href;
}

/**
 * Check that all controlled videos on the page are playing (not paused).
 * Returns { total, playing, paused } counts.
 */
async function getControlledVideoStates(page) {
  return page.evaluate(() => {
    const sections = document.querySelectorAll('.section_case-video');
    let total = 0;
    let playing = 0;
    let paused = 0;
    sections.forEach(sec => {
      if (!sec.querySelector('.case-video_control-wrapper')) return;
      const vid = sec.querySelector('video.video-cover') || sec.querySelector('video');
      if (!vid) return;
      total++;
      if (vid.paused) paused++;
      else playing++;
    });
    return { total, playing, paused };
  });
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Home to Work transition`, () => {
  test('controlled videos play after home → work Barba nav', async ({ page }) => {
    await barbaHomeToWork(page);

    // Scroll down to reveal video sections
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1500);

    const states = await getControlledVideoStates(page);
    if (states.total === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No controlled video sections found on this work page'
      });
      return;
    }
    expect(states.paused, `${states.paused}/${states.total} controlled videos still paused`).toBe(0);
  });
});

test.describe(`${SLUG} — About to Work transition`, () => {
  test('controlled videos play after about → work Barba nav', async ({ page }) => {
    await loadPage(page, ABOUT);

    // Navigate to a work page via a link
    const workLink = page.locator('a[href*="/work/"]').first();
    const hasLink = await workLink.count();
    if (!hasLink) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No work link found on about page'
      });
      return;
    }
    await workLink.click();
    await page.waitForTimeout(2500);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1500);

    const states = await getControlledVideoStates(page);
    if (states.total === 0) return;
    expect(states.paused, `${states.paused}/${states.total} controlled videos still paused`).toBe(0);
  });
});

test.describe(`${SLUG} — Direct load (regression)`, () => {
  test('controlled videos play on direct page load', async ({ page }) => {
    // Get a work page URL from the home page
    await page.goto(HOME);
    await waitForRHP(page);
    const workLink = page.locator('a[href*="/work/"]').first();
    const href = await workLink.getAttribute('href');
    if (!href) {
      test.skip();
      return;
    }

    const workUrl = href.startsWith('http') ? href : BASE + href;
    await loadPage(page, workUrl);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1500);

    const states = await getControlledVideoStates(page);
    if (states.total === 0) return;
    expect(states.paused, `${states.paused}/${states.total} controlled videos still paused on direct load`).toBe(0);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on home → work transition', async ({ page }) => {
    const errors = collectErrors(page);
    await barbaHomeToWork(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
