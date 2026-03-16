// @ts-check
/**
 * Acceptance tests: rhp-case-transition-polish
 *
 * Bug 1: FG video fills 100% during expand (should leave gap for title peek)
 * Bug 2: Case->home video not visible if user scrolled down
 * Bug 3: After case->home resume, fg-video not visible (clearProps wipes dialFg opacity)
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-case-transition-polish';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Navigate from home to the first case study via work-dial click.
 * Falls back to direct nav link if dial interaction fails.
 */
async function navigateHomeToCase(page) {
  // Click the dial fg layer to trigger case study navigation
  // The work-dial opens case studies via Barba when a sector is clicked
  const dialFg = page.locator('.dial_layer-fg');
  const workLink = page.locator('.dial_work-link').first();

  if (await workLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await workLink.click();
  } else {
    // Fallback: hover dial to enter ACTIVE state, then click fg
    await dialFg.hover({ force: true });
    await page.waitForTimeout(500);
    await dialFg.click({ force: true });
  }

  // Wait for case namespace to mount
  await page.waitForFunction(
    () => document.querySelector('[data-barba-namespace="case"]') !== null,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(2000); // settle after transition
}

// ── Bug 1: Video sizing leaves gap for title peek ─────────────

test.describe(`${SLUG} — Video sizing gap`, () => {

  test('case page video does not fill 100% of dial height (title gap exists)', async ({ page }) => {
    // Direct-land on a case page — CSS handles sizing without JS expand tween
    await loadPage(page, '/case-studies/overland-ai');

    const dialFg = page.locator('.dial_layer-fg');
    const videoWrap = page.locator('#fg-video-wrap');

    const fgHeight = await dialFg.evaluate(el => el.getBoundingClientRect().height);
    const vwHeight = await videoWrap.evaluate(el => el.getBoundingClientRect().height);

    // videoWrap should be shorter than dialFg by at least 60px (smallest gap at mobile portrait)
    expect(fgHeight - vwHeight).toBeGreaterThanOrEqual(60);
  });

  test('--dial-case-title-gap CSS variable is defined', async ({ page }) => {
    await loadPage(page, '/case-studies/overland-ai');

    const gap = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--dial-case-title-gap').trim();
    });

    expect(gap).toBeTruthy();
    expect(gap).not.toBe('');
  });
});

// ── Bug 2: Scroll to top before case→home shrink ─────────────

test.describe(`${SLUG} — Scroll position reset`, () => {

  test('case->home: dialFg scrollTop is 0 when shrink starts', async ({ page }) => {
    const errors = collectErrors(page);

    // Land on a case page directly
    await loadPage(page, '/case-studies/overland-ai');

    // Scroll down inside the dial fg layer
    await page.evaluate(() => {
      const dialFg = document.querySelector('.dial_layer-fg');
      if (dialFg) dialFg.scrollTop = 500;
    });
    await page.waitForTimeout(300);

    // Verify we actually scrolled
    const scrolledPos = await page.evaluate(() => {
      const dialFg = document.querySelector('.dial_layer-fg');
      return dialFg ? dialFg.scrollTop : 0;
    });
    // Only proceed with the return-home test if scrolling was possible
    if (scrolledPos > 100) {
      // Click home link to trigger case→home transition
      await page.locator('.nav_logo-link').click({ force: true });

      // Wait briefly for beforeLeave to fire (scrollTop reset happens there)
      await page.waitForTimeout(300);

      // Check dialFg scrollTop was reset to 0
      const scrollTopAfter = await page.evaluate(() => {
        const dialFg = document.querySelector('.dial_layer-fg');
        return dialFg ? dialFg.scrollTop : 0;
      });

      expect(scrollTopAfter).toBe(0);
    } else {
      // Short case page — scroll wasn't needed, annotate as design-drift
      test.info().annotations.push({
        type: 'design-drift',
        description: 'Case page too short to scroll — scroll reset test skipped'
      });
    }

    // Wait for transition to complete
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="home"]') !== null,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(1500);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});

// ── Bug 3: FG video visible after case→home resume ───────────

test.describe(`${SLUG} — FG visibility after resume`, () => {

  test('case->home: dial_layer-fg has opacity > 0 after transition', async ({ page }) => {
    const errors = collectErrors(page);

    // Start on home
    await loadPage(page);

    // Navigate to a case study (triggers suspend on work-dial)
    await page.goto('/case-studies/overland-ai');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to home (triggers resume on work-dial)
    await page.locator('.nav_logo-link').click({ force: true });

    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="home"]') !== null,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(3000); // let resume + setDialState settle

    // Move mouse over dial to trigger ACTIVE state (which reveals fg)
    const dialComp = page.locator('.dial_component');
    await dialComp.hover({ position: { x: 200, y: 200 }, force: true });
    await page.waitForTimeout(1000);

    // Check dialFg opacity — should be 1 when in ACTIVE state
    const fgOpacity = await page.evaluate(() => {
      const dialFg = document.querySelector('.dial_layer-fg');
      if (!dialFg) return 0;
      return parseFloat(getComputedStyle(dialFg).opacity);
    });

    // In ACTIVE state, dialFg opacity must be > 0
    // CSS default for home is opacity:0, but setDialState(ACTIVE) sets inline opacity:1
    expect(fgOpacity).toBeGreaterThan(0);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});

// ── General: no JS errors on transition paths ────────────────

test.describe(`${SLUG} — Transition error-free`, () => {

  test('home->case->home round trip: zero JS errors', async ({ page }) => {
    const errors = collectErrors(page);

    await loadPage(page);

    // Home -> case via direct navigation
    await page.goto('/case-studies/overland-ai');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Case -> home via nav logo
    await page.locator('.nav_logo-link').click({ force: true });
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="home"]') !== null,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(2000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('rapid: home->case->home->case: no errors, correct namespace', async ({ page }) => {
    const errors = collectErrors(page);

    await loadPage(page);

    // First round: home -> case
    await page.goto('/case-studies/overland-ai');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // case -> home
    await page.locator('.nav_logo-link').click({ force: true });
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="home"]') !== null,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(2000);

    // Second round: home -> case again
    await page.goto('/case-studies/overland-ai');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-barba-namespace="case"]')).toBeAttached();
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});

// ── Direct land: video sizing correct via CSS alone ──────────

test.describe(`${SLUG} — Direct land`, () => {

  test('direct land on case page: video sizing correct', async ({ page }) => {
    await loadPage(page, '/case-studies/overland-ai');

    const videoWrap = page.locator('#fg-video-wrap');
    await expect(videoWrap).toBeAttached();

    // Video wrap should have a height (not 0, not auto-collapsed)
    const height = await videoWrap.evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(100);
  });
});
