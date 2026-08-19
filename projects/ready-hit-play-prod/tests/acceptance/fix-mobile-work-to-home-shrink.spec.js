// @ts-check
/**
 * Acceptance tests — fix-mobile-work-to-home-shrink
 *
 * Spec: .claude/specs/fix-mobile-work-to-home-shrink.md
 *
 * Bug: on mobile, the work→home Barba transition collapses `.dial_layer-fg`
 * to ~1×1px in a single frame and then GROWS it back to home dial size,
 * instead of shrinking. Root cause: `getDialVars()` hands GSAP the raw CSS
 * string `min(65vw, 65svh)` (ready-hit-play.css:599), which GSAP cannot parse
 * as a numeric target, so it string-interpolates from a zero-filled start.
 * Desktop escapes this only because its value is `clamp(180px, …)` and the
 * px floor slot absorbs the real start width.
 *
 * The core assertions here are shape-of-the-animation assertions, not
 * end-state assertions — the end state was already correct before the fix.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-mobile-work-to-home-shrink';
const WORK_PATH = '/work/overland-ai';

const MOBILE = { width: 393, height: 852 };   // iPhone 15 Pro
const DESKTOP = { width: 1440, height: 900 };

/** Undershoot floor, expressed as a fraction of the TARGET home width.
 *
 *  Thresholding against the start width does not work: desktop legitimately
 *  shrinks 1123px → 450px, i.e. to 40% of start. The bug's real signature is
 *  dipping BELOW the target and then growing back up:
 *    - mobile  (min(65vw,65svh), no clamp floor): dips to ~1px  = 0.3% of target
 *    - desktop (clamp(180px, …)): dips to ~373px = 83% of target
 *  A correct power2.inOut tween approaches the target from above and never
 *  undershoots, so anything below 95% of target is the bug on either platform. */
const UNDERSHOOT_FLOOR = 0.95;

/** Tolerance for "non-increasing" — GSAP + subpixel rounding can wobble. */
const MONOTONIC_TOLERANCE_PX = 5;

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Load the work (case study) page at a given viewport and let it settle. */
async function loadWorkPage(page, viewport) {
  await page.setViewportSize(viewport);
  // 'domcontentloaded', not the default 'load': case study pages hold several
  // Vimeo progressive sources open, so 'load' can exceed the 15s nav timeout.
  await page.goto(WORK_PATH, { waitUntil: 'domcontentloaded' });
  await waitForRHP(page);
  await page.waitForTimeout(1500); // GSAP / case-title entrance settle
}

/**
 * Trigger work→home and rAF-sample the transition.
 *
 * Uses `window.barba.go('/')` — exactly what the close button does
 * (orchestrator.js:1290) — so this exercises the real `work-to-home`
 * transition and its `beforeLeave`/`leave` hooks.
 *
 * @returns {Promise<{frames: Array<{t:number,w:number,h:number,containerOpacity:number|null}>, startWidth:number}>}
 */
async function sampleWorkToHome(page, sampleMs = 1400) {
  return page.evaluate(async (sampleMs) => {
    const fg = document.querySelector('.dial_layer-fg');
    const startWidth = fg ? fg.getBoundingClientRect().width : 0;

    // Resolve --dial-home-width to px the same way the fix does, so the test
    // knows the tween's true target without hard-coding a breakpoint value.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;top:0;left:0';
    probe.style.width = getComputedStyle(document.documentElement)
      .getPropertyValue('--dial-home-width').trim();
    document.body.appendChild(probe);
    const targetWidth = probe.getBoundingClientRect().width;
    probe.remove();

    const frames = [];
    const t0 = performance.now();

    const snap = () => {
      const el = document.querySelector('.dial_layer-fg');
      const b = el ? el.getBoundingClientRect() : null;
      // The OUTGOING container is the one still tagged 'work'. Once Barba
      // swaps, the query returns the incoming 'home' container — so key on
      // the namespace rather than blindly taking the first match.
      const c = document.querySelector('[data-barba="container"][data-barba-namespace="work"]');
      frames.push({
        t: Math.round(performance.now() - t0),
        w: b ? b.width : 0,
        h: b ? b.height : 0,
        containerOpacity: c ? Number(getComputedStyle(c).opacity) : null
      });
    };

    snap();
    window.barba.go('/');

    await new Promise((resolve) => {
      const tick = () => {
        snap();
        if (performance.now() - t0 < sampleMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    return { frames, startWidth, targetWidth };
  }, sampleMs);
}

/**
 * Shared assertions for "the dial shrinks correctly" — run at both viewports.
 * The fix must make this pass on mobile AND desktop; before the fix it fails
 * on both (mobile catastrophically, desktop as a ~17% undershoot).
 */
function assertCleanShrink({ frames, startWidth, targetWidth }, label) {
  expect(startWidth, `${label}: should start at full work-page width`)
    .toBeGreaterThan(targetWidth);

  const active = transitionFrames(frames);
  expect(active.length, `${label}: sampler should capture transition frames`)
    .toBeGreaterThan(5);

  // 1. Never undershoot the target and grow back.
  const floor = targetWidth * UNDERSHOOT_FLOOR;
  const undershot = active.filter((f) => f.w < floor);
  expect(
    undershot,
    `${label}: dial undershot its ${Math.round(targetWidth)}px target, dipping to ` +
    `${Math.round(Math.min(...active.map((f) => f.w)))}px on ${undershot.length} frame(s). ` +
    `Widths: ${active.map((f) => Math.round(f.w)).join(', ')}`
  ).toHaveLength(0);

  // 2. Monotonic — the collapse-then-grow signature is a rising sequence.
  const widths = active.map((f) => f.w);
  const growth = [];
  for (let i = 1; i < widths.length; i++) {
    if (widths[i] - widths[i - 1] > MONOTONIC_TOLERANCE_PX) {
      growth.push(`frame ${i}: ${Math.round(widths[i - 1])} → ${Math.round(widths[i])}`);
    }
  }
  expect(
    growth,
    `${label}: dial grew mid-transition (collapse-then-grow signature): ${growth.join('; ')}`
  ).toHaveLength(0);
}

/** Frames captured while the outgoing work container still existed. */
function transitionFrames(frames) {
  return frames.filter((f) => f.containerOpacity !== null && f.w > 0);
}

/** Attach a pageerror listener and return the errors array. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1–4. Mobile — the bug and the fix */
test.describe(`${SLUG} — Mobile shrink`, () => {
  test('dial shrinks cleanly — no collapse, no growth mid-transition', async ({ page }) => {
    await loadWorkPage(page, MOBILE);
    const sample = await sampleWorkToHome(page);
    assertCleanShrink(sample, 'mobile');
  });

  test('lands at home dial size with home namespace applied', async ({ page }) => {
    await loadWorkPage(page, MOBILE);
    await sampleWorkToHome(page);
    await page.waitForTimeout(600); // afterEnter clearProps settle

    const end = await page.evaluate(() => {
      const fg = document.querySelector('.dial_layer-fg');
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;top:0;left:0';
      probe.style.width = getComputedStyle(document.documentElement)
        .getPropertyValue('--dial-home-width').trim();
      document.body.appendChild(probe);
      const expected = probe.getBoundingClientRect().width;
      probe.remove();
      return {
        width: fg ? fg.getBoundingClientRect().width : 0,
        expected,
        dialNs: document.querySelector('.dial_component')?.getAttribute('data-dial-ns'),
        hasCaseClass: !!fg?.classList.contains('is-case-study')
      };
    });

    expect(end.dialNs).toBe('home');
    expect(end.hasCaseClass, 'is-case-study should be removed').toBe(false);
    expect(Math.abs(end.width - end.expected)).toBeLessThanOrEqual(4);
  });

  test('outgoing case content fades out during the transition', async ({ page }) => {
    await loadWorkPage(page, MOBILE);
    const { frames } = await sampleWorkToHome(page);

    const opacities = transitionFrames(frames).map((f) => f.containerOpacity);
    const min = Math.min(...opacities);

    expect(
      min,
      `outgoing container should fade to near-zero on mobile; min opacity was ${min}`
    ).toBeLessThan(0.1);
  });
});

/* 5–6. Desktop regression guards — must be unchanged by this fix */
test.describe(`${SLUG} — Desktop regression`, () => {
  /* Desktop is affected by the same GSAP string-interpolation bug, but the
     clamp() px floor limits it to an ~17% undershoot (dips to ~373px before
     settling at 450px) rather than a full collapse. The px fix removes that
     undershoot, so this asserts the same clean-shrink contract as mobile. */
  test('dial shrinks cleanly — clamp floor undershoot is gone', async ({ page }) => {
    await loadWorkPage(page, DESKTOP);
    const sample = await sampleWorkToHome(page);
    assertCleanShrink(sample, 'desktop');
  });

  test('no mobile-only content fade is applied on desktop', async ({ page }) => {
    await loadWorkPage(page, DESKTOP);
    const { frames } = await sampleWorkToHome(page);

    const opacities = transitionFrames(frames).map((f) => f.containerOpacity);
    const min = Math.min(...opacities);

    expect(
      min,
      `desktop container should not be faded by this feature; min opacity was ${min}`
    ).toBeGreaterThan(0.99);
  });
});

/* 7. Untouched path regression guard */
test.describe(`${SLUG} — Expand path regression`, () => {
  test('home→work expand still works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000); // home intro settle

    const before = await page.evaluate(
      () => document.querySelector('.dial_component')?.getAttribute('data-dial-ns')
    );
    expect(before).toBe('home');

    await page.evaluate((path) => window.barba.go(path), WORK_PATH);
    await page.waitForTimeout(2500); // Barba transition + expand tween

    const after = await page.evaluate(() => {
      const fg = document.querySelector('.dial_layer-fg');
      return {
        dialNs: document.querySelector('.dial_component')?.getAttribute('data-dial-ns'),
        hasCaseClass: !!fg?.classList.contains('is-case-study'),
        width: fg ? fg.getBoundingClientRect().width : 0
      };
    });

    expect(after.dialNs).toBe('work');
    expect(after.hasCaseClass).toBe(true);
    // Mobile case width is 100vw (ready-hit-play.css:1219)
    expect(after.width).toBeGreaterThan(MOBILE.width * 0.9);
  });
});

/* 8. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during work→home on mobile', async ({ page }) => {
    const errors = collectErrors(page);
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await loadWorkPage(page, MOBILE);
    await sampleWorkToHome(page);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `console.error: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});

/* 9. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('transition completes instantly with no fade', async ({ page }) => {
    await loadWorkPage(page, MOBILE);
    const { frames } = await sampleWorkToHome(page, 900);

    // With dur = 0 the dial should reach home size almost immediately —
    // very few frames should still show the outgoing work container.
    const active = transitionFrames(frames);
    const opacities = active.map((f) => f.containerOpacity);

    // No partial fade values: content is either fully opaque or already gone.
    const partial = opacities.filter((o) => o > 0.05 && o < 0.95);
    expect(
      partial,
      `reduced motion should not animate opacity; saw partial values: ${partial.join(', ')}`
    ).toHaveLength(0);

    const end = await page.evaluate(
      () => document.querySelector('.dial_component')?.getAttribute('data-dial-ns')
    );
    expect(end).toBe('home');
  });
});
