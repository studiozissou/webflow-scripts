// @ts-check
/**
 * Acceptance tests — fix-nav-logo-reload-and-replay-bugs
 *
 * Bug 1: Logo click does nothing after Barba re-entry → should reload
 * Bug 2: Spaces lost in logo text during replay on fresh visit
 * Bug 3: Double dial visible during replay after complex navigation
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-nav-logo-reload-and-replay-bugs';
const PAGE_PATH = '/';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Scroll through the morph until homeScrollMorph.complete is true. */
async function scrollThroughMorph(page) {
  // Scroll down in steps to trigger the ScrollTrigger scrub
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.3));
    await page.waitForTimeout(200);
  }
  // Wait for morph to complete
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(500);
}

/** Navigate to about page via Barba (click the about link). */
async function navigateToAbout(page) {
  await page.click('.nav_about-link');
  await page.waitForFunction(
    () => document.querySelector('[data-barba-namespace="about"]') !== null,
    { timeout: 10_000 }
  );
  await waitForRHP(page);
  await page.waitForTimeout(2000); // about transition settle
}

/** Click the nav logo to navigate home via Barba. */
async function clickLogoToHome(page) {
  await page.click('.nav_logo-link');
  await page.waitForFunction(
    () => document.querySelector('[data-barba-namespace="home"]') !== null,
    { timeout: 10_000 }
  );
  await waitForRHP(page);
  await page.waitForTimeout(2000); // home transition settle
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(SLUG, () => {
  test.describe('Bug 1 — Logo reload after Barba re-entry', () => {

    test('logo click reloads after Barba re-entry (about→home)', async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page);
      await scrollThroughMorph(page);
      await navigateToAbout(page);
      await clickLogoToHome(page);

      // Now on home via Barba. morph.arrivedViaBarba should be true.
      const arrivedViaBarba = await page.evaluate(
        () => window.RHP?.homeScrollMorph?.arrivedViaBarba === true
      );
      expect(arrivedViaBarba).toBe(true);

      // Click logo — should trigger window.location.reload()
      // We detect reload by checking that the page fires a new load event
      const reloadPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 });
      await page.click('.nav_logo-link');
      await reloadPromise;

      // After reload, morph should be in initial state (not complete)
      await waitForRHP(page);
      const morphComplete = await page.evaluate(
        () => window.RHP?.homeScrollMorph?.complete === true
      );
      expect(morphComplete).toBe(false);
      expect(errors).toHaveLength(0);
    });

    test('logo click reloads after Barba re-entry (work→about→home)', async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page);
      await scrollThroughMorph(page);

      // Navigate to a work/case page first
      const caseLink = await page.$('.work_item a, [data-barba-namespace="home"] a[href*="case-studies"]');
      if (caseLink) {
        await caseLink.click();
        await page.waitForFunction(
          () => document.querySelector('[data-barba-namespace="case"]') !== null,
          { timeout: 10_000 }
        );
        await waitForRHP(page);
        await page.waitForTimeout(2000);
      } else {
        test.skip();
        return;
      }

      await navigateToAbout(page);
      await clickLogoToHome(page);

      const arrivedViaBarba = await page.evaluate(
        () => window.RHP?.homeScrollMorph?.arrivedViaBarba === true
      );
      expect(arrivedViaBarba).toBe(true);

      const reloadPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 });
      await page.click('.nav_logo-link');
      await reloadPromise;

      await waitForRHP(page);
      const morphComplete = await page.evaluate(
        () => window.RHP?.homeScrollMorph?.complete === true
      );
      expect(morphComplete).toBe(false);
      expect(errors).toHaveLength(0);
    });

    test('no console errors during Barba re-entry reload flow', async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page);
      await scrollThroughMorph(page);
      await navigateToAbout(page);
      await clickLogoToHome(page);
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Bug 2+3 — Replay fixes on fresh visit', () => {

    test('replay runs (not reload) on fresh visit desktop', async ({ page }) => {
      await loadPage(page);
      await scrollThroughMorph(page);

      // arrivedViaBarba should be false on fresh visit
      const arrivedViaBarba = await page.evaluate(
        () => window.RHP?.homeScrollMorph?.arrivedViaBarba === true
      );
      expect(arrivedViaBarba).toBe(false);

      // Click logo — should trigger replay, not reload
      await page.click('.nav_logo-link');
      await page.waitForTimeout(500);

      // Check that .rhp-home-ready is removed (replay removes it in onComplete)
      // Allow time for the 1.2s reverse animation
      await page.waitForFunction(
        () => !document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'),
        { timeout: 5_000 }
      );
    });

    test('replay preserves text spaces on fresh visit', async ({ page }) => {
      await loadPage(page);
      await scrollThroughMorph(page);

      // Click logo to trigger replay
      await page.click('.nav_logo-link');
      // Wait a moment for _splitLogoText to run
      await page.waitForTimeout(300);

      // Check that text content preserves spaces
      const textContent = await page.evaluate(() => {
        const uppers = document.querySelectorAll('#interactive-logo .is-about-upper');
        const lowers = document.querySelectorAll('#interactive-logo .is-about-lower');
        const all = [...uppers, ...lowers];
        return all.map(el => el.textContent).join(' | ');
      });

      // Text should not have concatenated words (e.g. "WITHGREAT" instead of "WITH GREAT")
      expect(textContent).not.toMatch(/[A-Z]{2,}[A-Z]{2,}/); // crude check for missing spaces
      // More specific: check known phrases have spaces
      if (textContent.includes('WITH')) {
        expect(textContent).toContain('WITH ');
      }
    });

    test('replay shows single dial on fresh visit', async ({ page }) => {
      await loadPage(page);
      await scrollThroughMorph(page);

      // Click logo to trigger replay
      await page.click('.nav_logo-link');
      await page.waitForTimeout(500); // let replay set up

      // #dial_ticks-canvas should be hidden during replay
      const ticksHidden = await page.evaluate(() => {
        const canvas = document.querySelector('#dial_ticks-canvas');
        if (!canvas) return true;
        const style = window.getComputedStyle(canvas);
        return parseFloat(style.opacity) === 0;
      });
      expect(ticksHidden).toBe(true);

      // .dial_generic-video should be hidden during replay
      const videoHidden = await page.evaluate(() => {
        const video = document.querySelector('.dial_generic-video');
        if (!video) return true;
        const style = window.getComputedStyle(video);
        return parseFloat(style.opacity) === 0;
      });
      expect(videoHidden).toBe(true);
    });

    test('no console errors during fresh-visit replay', async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page);
      await scrollThroughMorph(page);
      await page.click('.nav_logo-link');
      await page.waitForTimeout(2000); // full replay duration
      expect(errors).toHaveLength(0);
    });
  });
});
