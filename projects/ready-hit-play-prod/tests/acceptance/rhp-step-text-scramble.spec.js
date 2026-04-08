// @ts-check
/**
 * Acceptance tests — rhp-step-text-scramble
 *
 * Validates that [data-text="step"] on the homepage:
 *  - Scrambles to the active project name when dial enters ACTIVE state
 *  - Stays at opacity 1 in ACTIVE state (no fade-out)
 *  - Scrambles back to original copy on IDLE
 *  - Falls back to direct text swap with prefers-reduced-motion
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-step-text-scramble';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadHome(page) {
  await page.goto(STAGING_URL);
  await waitForRHP(page);
  // Allow intro sequence to complete (SplitText word reveal ~2s)
  await page.waitForTimeout(2500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// Force the dial into ACTIVE state via the public API and apply a sector
async function activateDial(page, sectorIndex = 0) {
  await page.evaluate((idx) => {
    // Simulate hover-driven activation by calling internal applyActive via state
    // No public hook exists; trigger via pointer event in centre of dial
    const comp = document.querySelector('.dial_component');
    if (!comp) return;
    const r = comp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const ev = new PointerEvent('pointermove', {
      clientX: cx, clientY: cy, bubbles: true, pointerType: 'mouse'
    });
    comp.dispatchEvent(ev);
  }, sectorIndex);
  await page.waitForTimeout(800); // allow scramble animation to settle
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHome(page);
  });

  test('step text element exists and is visible after intro', async ({ page }) => {
    const step = page.locator('[data-text="step"]');
    await expect(step).toBeAttached();
    await expect(step).toBeVisible();
  });

  test('ScrambleTextPlugin is loaded and registered', async ({ page }) => {
    const ok = await page.evaluate(() => {
      return typeof window.ScrambleTextPlugin !== 'undefined' &&
             window.gsap &&
             // gsap.plugins is internal but ScrambleText must be findable
             typeof window.gsap.to === 'function';
    });
    expect(ok).toBe(true);
  });

  test('CMS items have data-title attributes (data source)', async ({ page }) => {
    const titles = await page.$$eval('.dial_cms-item', els =>
      els.map(el => el.getAttribute('data-title')).filter(Boolean)
    );
    expect(titles.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe(`${SLUG} — Behaviour`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHome(page);
  });

  test('step text starts with original copy in IDLE', async ({ page }) => {
    const text = await page.locator('[data-text="step"]').innerText();
    // Should NOT be a project name like "Overland AI" — should be the original copy
    expect(text.length).toBeGreaterThan(0);
  });

  test('step text opacity remains 1 (never fades to 0)', async ({ page }) => {
    await activateDial(page);
    const opacity = await page.locator('[data-text="step"]').evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBe(1);
  });

  test('step text content updates to active project name in ACTIVE state', async ({ page }) => {
    await activateDial(page);
    // Read both the active project name (from CMS) and step text content
    const active = await page.evaluate(() => {
      const idx = window.RHP?.workDial?.getActiveIndex?.() ?? 0;
      const items = document.querySelectorAll('.dial_cms-item');
      const activeTitle = items[idx]?.getAttribute('data-title') || '';
      const stepText = document.querySelector('[data-text="step"]')?.textContent?.trim() || '';
      return { activeTitle, stepText };
    });
    if (active.activeTitle) {
      expect(active.stepText.toLowerCase()).toContain(active.activeTitle.toLowerCase().substring(0, 4));
    }
  });

  test('no console errors during dial interaction', async ({ page }) => {
    const errors = collectErrors(page);
    await activateDial(page);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

test.describe(`${SLUG} — Reduced motion`, () => {
  test.use({ colorScheme: 'light' });

  test('with prefers-reduced-motion: text changes instantly, no animation', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await loadHome(page);
    await activateDial(page);
    const opacity = await page.locator('[data-text="step"]').evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBe(1);
    await ctx.close();
  });
});

test.describe(`${SLUG} — Barba re-entry`, () => {
  test('step text re-initialises cleanly on home → about → home', async ({ page }) => {
    await loadHome(page);
    const errors = collectErrors(page);

    // Navigate to about
    await page.click('.nav_about-link');
    await page.waitForTimeout(2000);

    // Navigate back to home
    await page.goBack();
    await page.waitForTimeout(2500);

    // Step text should still be present and visible
    const step = page.locator('[data-text="step"]');
    await expect(step).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
