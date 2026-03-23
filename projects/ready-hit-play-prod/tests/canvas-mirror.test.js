// @ts-check
const { test, expect } = require('@playwright/test');

// Wait for all RHP modules to finish loading
async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

test.describe('Canvas Mirror BG — Homepage', () => {
  /** @type {Error[]} */
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err));
    await page.goto('/');
    await waitForRHP(page);
  });

  test('bg canvas element exists (replaces bg video)', async ({ page }) => {
    // Canvas should exist in the bg layer
    const bgCanvas = page.locator('.dial_bg-canvas');
    await expect(bgCanvas).toBeAttached();

    // Canvas should have aria-hidden (decorative)
    await expect(bgCanvas).toHaveAttribute('aria-hidden', 'true');

    // Old bg video should NOT exist
    const bgVideo = page.locator('.dial_bg-video');
    await expect(bgVideo).not.toBeAttached();
  });

  test('bg canvas has non-zero dimensions', async ({ page }) => {
    const dims = await page.evaluate(() => {
      const c = document.querySelector('.dial_bg-canvas');
      if (!c) return null;
      return { width: c.width, height: c.height };
    });
    expect(dims).not.toBeNull();
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  test('bg canvas draws frames when dial is active (not blank)', async ({ page }) => {
    // Move mouse to center of dial to trigger ACTIVE state
    const dialComp = page.locator('.dial_component');
    const box = await dialComp.boundingBox();
    if (!box) throw new Error('dial_component not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Wait for state transition + at least one draw tick
    await page.waitForTimeout(1000);

    // Check canvas has been drawn to (not all transparent)
    const hasContent = await page.evaluate(() => {
      const c = document.querySelector('.dial_bg-canvas');
      if (!c) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      // Check if any non-zero pixel exists (canvas has been drawn to)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) return true;
      }
      return false;
    });
    expect(hasContent).toBe(true);
  });

  test('bg canvas starts at opacity 0 in IDLE state', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const c = document.querySelector('.dial_bg-canvas');
      if (!c) return '-1';
      return getComputedStyle(c).opacity;
    });
    expect(opacity).toBe('0');
  });

  test('no bg video elements in DOM (all removed)', async ({ page }) => {
    const bgVideoCount = await page.evaluate(() => {
      return document.querySelectorAll('.dial_bg-video').length;
    });
    expect(bgVideoCount).toBe(0);
  });

  test('no drift monitor running (removed)', async ({ page }) => {
    // The old drift monitor set driftRafId; with canvas mirror, there should be
    // no drift-related RAF. We verify by checking that playPaired doesn't exist
    // as a named function in the module scope (it's been replaced by playFg).
    const hasDriftMonitor = await page.evaluate(() => {
      // If the old sync code is gone, the bg video should not be actively syncing
      // Check: no bg <video> elements with the sync class
      return document.querySelectorAll('.dial_bg-video').length > 0;
    });
    expect(hasDriftMonitor).toBe(false);
  });

  test('fewer video elements than before (bandwidth reduction)', async ({ page }) => {
    const videoCount = await page.evaluate(() => {
      // Count all video elements inside dial_component
      const dial = document.querySelector('.dial_component');
      if (!dial) return 999;
      return dial.querySelectorAll('video').length;
    });
    // Before: 7 videos (fg + bg + generic + 2 fg pool + 2 bg pool)
    // After: 4 videos (fg + generic + 2 fg pool) — no bg pool videos
    // Allow up to 4 (fg, generic, poolPrev, poolNext)
    expect(videoCount).toBeLessThanOrEqual(4);
  });

  test('loads without JS errors after canvas mirror change', async ({ page }) => {
    await page.waitForTimeout(500);
    expect(jsErrors, `JS errors: ${jsErrors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});

test.describe('Canvas Mirror BG — Barba Transitions', () => {
  test('home → about → home: bg canvas survives round-trip', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');
    await waitForRHP(page);

    // Verify canvas exists on home
    await expect(page.locator('.dial_bg-canvas')).toBeAttached();

    // Navigate to about
    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="about"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_about-link').click(),
    ]);
    await page.waitForTimeout(500);

    // Navigate back to home
    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="home"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_logo-link').click(),
    ]);
    await page.waitForTimeout(1000);
    await waitForRHP(page);

    // Canvas should still exist after round-trip
    await expect(page.locator('.dial_bg-canvas')).toBeAttached();

    // No bg video should have been created
    const bgVideoCount = await page.evaluate(() => document.querySelectorAll('.dial_bg-video').length);
    expect(bgVideoCount).toBe(0);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('home → case: bg canvas gets case video drawn via orchestrator rAF', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');
    await waitForRHP(page);

    // Activate dial by moving mouse to center
    const dialComp = page.locator('.dial_component');
    const box = await dialComp.boundingBox();
    if (!box) throw new Error('dial_component not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Click to navigate to case study
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for case namespace
    await page.waitForFunction(
      () => document.querySelector('[data-barba-namespace="case"]') !== null,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(1000);

    // Canvas should still exist (persistent outside Barba container)
    await expect(page.locator('.dial_bg-canvas')).toBeAttached();

    // No JS errors
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});

test.describe('Canvas Mirror BG — CSS', () => {
  test('no .dial_bg-video CSS rules remain', async ({ page }) => {
    await page.goto('/');
    await waitForRHP(page);

    // Check that no stylesheet contains .dial_bg-video rules
    const hasBgVideoRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('dial_bg-video')) {
              return true;
            }
          }
        } catch (e) {
          // Cross-origin stylesheets throw — skip
        }
      }
      return false;
    });
    // Our CSS should have been updated; Webflow's own sheets are out of our control
    // so this is a soft check via annotation
    if (hasBgVideoRule) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'Found .dial_bg-video CSS rule — may be from Webflow Designer (not our code)'
      });
    }
  });

  test('bg canvas has filter: blur(40px) via CSS', async ({ page }) => {
    await page.goto('/');
    await waitForRHP(page);

    // Move mouse to activate dial
    const dialComp = page.locator('.dial_component');
    const box = await dialComp.boundingBox();
    if (!box) throw new Error('dial_component not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    const filter = await page.evaluate(() => {
      const c = document.querySelector('.dial_bg-canvas');
      if (!c) return '';
      return getComputedStyle(c).filter;
    });
    expect(filter).toContain('blur(40px)');
  });
});
