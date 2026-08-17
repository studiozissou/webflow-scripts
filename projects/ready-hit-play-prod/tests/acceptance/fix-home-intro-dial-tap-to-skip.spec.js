// @ts-check
/**
 * Acceptance tests for fix-home-intro-dial-tap-to-skip
 *
 * Regression (self-inflicted, 2026-08-13): tapping the small dial on the
 * homepage to skip the intro word-cycle stopped working.
 *
 * Cause: the fix for the mobile close button put a blanket
 * `pointer-events: none` on `.home-transition-dial`. That wrapper is not purely
 * decorative — on home it IS the skip-intro control. home-scroll-morph.js binds
 * `pointerdown` to it:
 *
 *   // Tap dial to skip word cycle and snap straight to morph
 *   // Use dialWrapper (.home-transition-dial) — that's the visible/tappable
 *   const skipTarget = dialWrapper || dialEl;
 *
 * Fix: scope the rule to case-study mode only
 * (`[data-barba="wrapper"]:has(.dial_layer-fg.is-case-study)`), keyed on the
 * same signal work-dial.js guards on. The canvas keeps an unconditional
 * `pointer-events: none` — that is safe, because the listener is on the parent
 * wrapper and a non-interactive child passes the event through to it.
 *
 * These tests serve the local CSS in place of the CDN copy.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.test' });

const LOCAL_CSS = path.resolve(__dirname, '../../ready-hit-play.css');

async function useLocalCss(page) {
  await page.route('**/ready-hit-play.css*', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(LOCAL_CSS, 'utf8') })
  );
}

async function dismissConsent(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[fs-consent-element="root"]').forEach((el) => el.remove());
  });
}

/** Load home and stop early in the intro, while the skip control is live. */
async function loadHomeDuringIntro(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 25_000 });
  await page.waitForTimeout(1500);
  await dismissConsent(page);
}

test.describe('home intro — tap the small dial to skip', () => {
  test('the skip-intro dial is interactive on home', async ({ page }) => {
    await useLocalCss(page);
    await loadHomeDuringIntro(page);

    const state = await page.evaluate(() => {
      const w = document.querySelector('.home-transition-dial');
      if (!w) return { present: false };
      const r = w.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      return {
        present: true,
        pe: getComputedStyle(w).pointerEvents,
        // The wrapper must be the hit target (its canvas child is
        // pointer-events:none, so taps fall through to the wrapper itself).
        hitsWrapper: !!top && (top === w || w.contains(top)),
        topEl: top ? `${top.tagName}.${(typeof top.className === 'string' ? top.className : '').split(' ')[0]}` : null,
      };
    });

    expect(state.present, '.home-transition-dial should exist on home').toBe(true);
    expect(state.pe, 'skip-intro dial must accept pointer input on home').not.toBe('none');
    expect(state.hitsWrapper, `tap would land on ${state.topEl}`).toBe(true);
  });

  test('the decorative canvas stays non-interactive but lets taps through', async ({ page }) => {
    await useLocalCss(page);
    await loadHomeDuringIntro(page);

    const pe = await page.evaluate(() => {
      const c = document.querySelector('.transition-dial_canvas');
      return c ? getComputedStyle(c).pointerEvents : 'absent';
    });
    if (pe !== 'absent') expect(pe).toBe('none');
  });

  test('tapping the dial skips the intro', async ({ page }) => {
    await useLocalCss(page);
    await loadHomeDuringIntro(page);

    const wrapper = page.locator('.home-transition-dial');
    await expect(wrapper).toHaveCount(1);

    // Record whether the intro was still running, then tap the dial.
    const before = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'));

    const box = await wrapper.boundingBox();
    expect(box, 'skip dial should be visible').not.toBeNull();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    // Skipping snaps straight to the morph completion state.
    await page.waitForFunction(
      () => document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'),
      { timeout: 12_000 }
    );

    const after = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'));
    expect(after, 'tapping the dial should complete the intro').toBe(true);
    expect(before, 'intro should not already have been complete before the tap').toBe(false);
  });
});
