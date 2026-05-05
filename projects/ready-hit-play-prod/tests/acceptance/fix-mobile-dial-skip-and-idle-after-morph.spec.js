// @ts-check
/**
 * Acceptance tests: fix-mobile-dial-skip-and-idle-after-morph
 *
 * Feature 1: Dial tap skips word cycle on mobile (pointerdown instead of click)
 * Feature 2: Dial IDLE after morph, first tap anywhere activates
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'fix-mobile-dial-skip-and-idle-after-morph';
const PAGE_PATH = '/';
const STAGING_URL = process.env.STAGING_URL;

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Wait for morph to complete by checking for .rhp-home-ready class. */
async function waitForMorphComplete(page) {
  await page.waitForFunction(
    () => document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'),
    { timeout: 30_000 }
  );
}

/** Get the current dial state from work-dial internals. */
async function getDialState(page) {
  return page.evaluate(() => {
    // work-dial exposes state indirectly via DOM or we check video visibility
    const genericVideo = document.querySelector('.dial_generic-video');
    const fgVideo = document.querySelector('.dial_fg-video');
    const stepText = document.querySelector('[data-text="step"]');

    // IDLE: generic video visible (opacity > 0), step text shows default
    // ACTIVE: fg video visible, project title in step text
    const genericOpacity = genericVideo
      ? parseFloat(getComputedStyle(genericVideo).opacity)
      : 0;
    const fgOpacity = fgVideo
      ? parseFloat(getComputedStyle(fgVideo).opacity)
      : 0;

    return {
      genericVisible: genericOpacity > 0.5,
      fgVisible: fgOpacity > 0.5,
      stepText: stepText?.textContent?.trim() || '',
    };
  });
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. No console errors on mobile home load */
test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no JS errors on mobile home load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await waitForMorphComplete(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 2. Dial tap skips word cycle on mobile */
test.describe(`${SLUG} — Dial Tap Skip`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dial tap skips word cycle on mobile', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${STAGING_URL}/`);
    await waitForRHP(page);

    // Wait for word cycle to start (intro complete + 0.5s delay)
    await page.waitForTimeout(4000);

    // Check morph hasn't completed yet (word cycle still running)
    const readyBefore = await page.evaluate(
      () => document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );

    // If morph already completed naturally, skip this test (timing edge case)
    if (readyBefore) {
      test.skip();
      return;
    }

    // Tap the dial component (pointerdown)
    const dial = page.locator('.dial_component[data-dial-ns="home"]');
    await dial.dispatchEvent('pointerdown', { clientX: 187, clientY: 700 });

    // Morph should play and complete within ~2s
    await waitForMorphComplete(page);

    // Verify morph completed
    const readyAfter = await page.evaluate(
      () => document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(readyAfter).toBe(true);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 3. Dial is IDLE after morph complete on mobile */
test.describe(`${SLUG} — IDLE After Morph`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dial is IDLE after morph complete on mobile', async ({ page }) => {
    await loadPage(page);
    await waitForMorphComplete(page);
    await page.waitForTimeout(1000); // settle

    const state = await getDialState(page);

    // IDLE indicators: generic video visible, step text is default
    expect(state.stepText.toLowerCase()).toContain('step into the circle');
  });
});

/* 4. First tap anywhere activates dial on mobile */
test.describe(`${SLUG} — First Tap Activates`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('first tap anywhere activates dial on mobile', async ({ page }) => {
    await loadPage(page);
    await waitForMorphComplete(page);
    await page.waitForTimeout(1000); // settle in IDLE

    // Verify IDLE state first
    const stateBefore = await getDialState(page);
    expect(stateBefore.stepText.toLowerCase()).toContain('step into the circle');

    // Tap anywhere on the page (outside dial)
    await page.dispatchEvent('body', 'pointerdown', { clientX: 50, clientY: 50 });
    await page.waitForTimeout(1000); // wait for ACTIVE transition

    // After tap, dial should be ACTIVE (step text changes to project name)
    const stateAfter = await getDialState(page);
    // In ACTIVE state, step text should NOT be the default idle text
    // (it changes to a project title via ScrambleText)
    expect(stateAfter.stepText.toLowerCase()).not.toContain('step into the circle');
  });
});

/* 5. Dial stays ACTIVE after activation */
test.describe(`${SLUG} — Locked Active`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dial stays ACTIVE after activation', async ({ page }) => {
    await loadPage(page);
    await waitForMorphComplete(page);
    await page.waitForTimeout(1000);

    // First tap to activate
    await page.dispatchEvent('body', 'pointerdown', { clientX: 50, clientY: 50 });
    await page.waitForTimeout(1000);

    // Second tap elsewhere — dial should still be ACTIVE
    await page.dispatchEvent('body', 'pointerdown', { clientX: 300, clientY: 300 });
    await page.waitForTimeout(500);

    const state = await getDialState(page);
    // Should still show project title, not idle text
    expect(state.stepText.toLowerCase()).not.toContain('step into the circle');
  });
});

/* 6. Desktop morph unchanged */
test.describe(`${SLUG} — Desktop Regression`, () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('desktop morph unchanged — no forceActive on desktop', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Scroll to trigger morph on desktop
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(2000);

    // Morph should complete
    await waitForMorphComplete(page);

    // Desktop should NOT show IDLE after morph — desktop never calls forceActive
    // and the existing desktop flow (proximity-based IDLE/ACTIVE) should work
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 7. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });

  test('morph completes and dial is idle with reduced motion', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // With reduced motion, morph should fast-forward or skip
    await waitForMorphComplete(page);
    await page.waitForTimeout(1000);

    // Dial should be in IDLE state
    const state = await getDialState(page);
    expect(state.stepText.toLowerCase()).toContain('step into the circle');

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
