// @ts-check
/**
 * Acceptance tests: rhp-mobile-dial-permanent-lengthened-ticks
 *
 * Spec: projects/ready-hit-play-prod/.claude/specs/rhp-mobile-dial-permanent-lengthened-ticks.md
 *
 * Feature: on mobile, the lengthened dial ticks ("the bulge") are locked to the
 * sector that was active when the dial appeared, in CANVAS space. Because the
 * ticks canvas is rotated as a whole by a CSS transform, a fixed canvas angle
 * turns with the dial. Previously the target angle was recomputed every frame as
 * `mod(180 - rotationDeg, 360)`, which cancelled the rotation out and pinned the
 * bulge to screen-bottom while ticks slid through it.
 *
 * ── How these tests measure tick length ──
 *
 * There is no public API for tick geometry, so we sample the canvas bitmap.
 * For each of the 96 tick angles we walk outward from `innerR` along that ray
 * and record the last radius carrying ink. Two alpha thresholds are used:
 *
 *   SOLID (140) — the crisp stroke. Used for length / bulge-shape assertions.
 *   INK   (20)  — stroke *plus* the blur(12px) glow composite. Used for the
 *                 overflow assertion, where including the glow makes the test
 *                 stricter rather than looser.
 *
 * We sample the UNROTATED bitmap (getImageData ignores the CSS transform), so
 * results are in canvas space. Screen angle = canvas angle + rotationDeg, read
 * back from the computed transform matrix. Assertions are deliberately
 * RELATIVE (ratios, self-calibrating thresholds, before/after comparisons)
 * rather than absolute pixel counts, so glow bleed cannot skew them.
 *
 * Angle frame: tick i is drawn at canvas math angle `i/96*360` in a y-DOWN
 * frame, so screen-bottom is +90deg. A bulge is "at screen bottom" when
 * `mod(canvasCentre + rotationDeg, 360) === 90`.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-mobile-dial-permanent-lengthened-ticks';
const PAGE_PATH = '/';

// Mobile viewport used throughout. 393x852 = iPhone 15. Measured clearance
// between the bulge tip and the screen edge at this size is 23.0px.
const MOBILE = { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

/** Wait for the home intro morph to finish (.rhp-home-ready on the Barba wrapper). */
async function waitForMorphComplete(page) {
  await page.waitForFunction(
    () => document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'),
    { timeout: 30_000 }
  );
}

/**
 * Load home and drive the intro to completion. The morph is scroll-scrubbed, so
 * we scroll to the bottom repeatedly until the wrapper reports ready.
 */
async function loadHomePastIntro(page, { settle = 2000 } = {}) {
  await page.goto(PAGE_PATH);
  await waitForRHP(page);
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() =>
      !!document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready'));
    if (done) break;
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
  }
  await waitForMorphComplete(page);
  await page.waitForTimeout(settle); // tick intro (3.5s total) + bulge grow-in
}

/** Attach a pageerror listener and return the errors array. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Sample the ticks canvas and return per-tick lengths in canvas space, plus the
 * bulge's angular centre and the live rotation.
 */
async function measureTicks(page) {
  return page.evaluate(() => {
    const SOLID = 140;
    const INK = 20;
    const BARS = 96;

    const canvas = document.querySelector('#dial_ticks-canvas');
    const fg = document.querySelector('#fg-video-wrap');
    if (!canvas || !fg) return null;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    const cx = cssW / 2;
    const cy = cssH / 2;

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    const bw = canvas.width;
    const bh = canvas.height;

    const alphaAt = (x, y) => {
      const ix = Math.round(x * dpr);
      const iy = Math.round(y * dpr);
      if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) return 0;
      return data[(iy * bw + ix) * 4 + 3];
    };

    // Geometry mirrors work-dial.js resize()
    const fr = fg.getBoundingClientRect();
    const REF_R = 253;
    const videoR = Math.min(fr.width, fr.height) / 2;
    const innerR = videoR * (1 + 24 / REF_R);
    const baseLen = videoR * (22.51 / REF_R);
    const maxScan = videoR * 0.75; // well past the longest possible tick

    const solidLen = [];
    let maxInkRadius = 0;

    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * Math.PI * 2;
      let lastSolid = 0;
      for (let r = innerR; r <= innerR + maxScan; r += 0.5) {
        const al = alphaAt(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        if (al >= SOLID) lastSolid = r;
        if (al >= INK && r > maxInkRadius) maxInkRadius = r;
      }
      solidLen.push(lastSolid > 0 ? lastSolid - innerR : 0);
    }

    // Rotation from the computed transform matrix. rotate(R) in a y-down frame
    // gives matrix(cos R, sin R, -sin R, cos R), so atan2(b, a) === R.
    let rotationDeg = 0;
    const tr = getComputedStyle(canvas).transform;
    const m = tr && tr !== 'none' ? tr.match(/matrix\(([^)]+)\)/) : null;
    if (m) {
      const p = m[1].split(',').map(Number);
      rotationDeg = ((Math.atan2(p[1], p[0]) * 180 / Math.PI) % 360 + 360) % 360;
    }

    const minLen = Math.min(...solidLen);
    const maxLen = Math.max(...solidLen);
    const span = maxLen - minLen;

    // Self-calibrating threshold: a tick is "long" if it is a quarter of the way
    // from the shortest to the longest. Immune to absolute glow offset.
    const longThresh = minLen + span * 0.25;
    const longIdx = [];
    for (let i = 0; i < BARS; i++) if (solidLen[i] >= longThresh) longIdx.push(i);

    // Circular mean of the excess length gives the bulge centre in canvas space.
    let sx = 0, sy = 0;
    for (let i = 0; i < BARS; i++) {
      const wgt = Math.max(0, solidLen[i] - minLen);
      const a = (i / BARS) * Math.PI * 2;
      sx += Math.cos(a) * wgt;
      sy += Math.sin(a) * wgt;
    }
    const bulgeCentreCanvasDeg = span > 0.5
      ? ((Math.atan2(sy, sx) * 180 / Math.PI) % 360 + 360) % 360
      : null;
    const bulgeCentreScreenDeg = bulgeCentreCanvasDeg === null
      ? null
      : (bulgeCentreCanvasDeg + rotationDeg) % 360;

    return {
      solidLen, minLen, maxLen, span,
      lengthRatio: minLen > 0 ? maxLen / minLen : null,
      longCount: longIdx.length,
      longIdx,
      bulgeCentreCanvasDeg,
      bulgeCentreScreenDeg,
      rotationDeg,
      maxInkRadius,
      videoR, innerR, baseLen,
      canvasHalfWidth: cssW / 2,
      canvasHalfHeight: cssH / 2,
      canvasOpacity: getComputedStyle(canvas).opacity
    };
  });
}

/** Smallest absolute difference between two angles, in degrees. */
function angleDelta(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/**
 * Vertical drag on the dial to rotate it. Starts inside the dial but off-centre
 * so the press is treated as a drag rather than a centre tap that navigates.
 */
async function dragDial(page, deltaY) {
  const geo = await page.evaluate(() => {
    const c = document.querySelector('#dial_ticks-canvas');
    const r = c.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const startY = geo.cy - 40;
  await page.mouse.move(geo.cx, startY);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(geo.cx, startY + (deltaY * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(1200); // snap tween
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Bulge present and centred at screen bottom on first appearance */
test.describe(`${SLUG} — Initial Bulge`, () => {
  test.use(MOBILE);

  test('bulge is present and centred at screen bottom on first appearance', async ({ page }) => {
    await loadHomePastIntro(page);
    const m = await measureTicks(page);

    expect(m, 'ticks canvas and #fg-video-wrap must both be present').not.toBeNull();
    expect(parseFloat(m.canvasOpacity), 'ticks canvas should be visible after morph').toBeGreaterThan(0.9);

    // A bulge exists: some ticks are meaningfully longer than the base length.
    expect(m.span, `no length variation across ticks — no bulge (min ${m.minLen}, max ${m.maxLen})`)
      .toBeGreaterThan(m.baseLen * 0.5);

    // Peak-to-base ratio with MOBILE_ATTR_EASE = 0.6 is
    // (baseLen + (maxLen-baseLen)*0.6) / baseLen = 2.96. Generous band because
    // the crisp-stroke threshold and the round line cap both shift it slightly.
    expect(m.lengthRatio, `peak/base length ratio was ${m.lengthRatio}`).toBeGreaterThan(2.2);
    expect(m.lengthRatio, `peak/base length ratio was ${m.lengthRatio}`).toBeLessThan(3.8);

    // ~9-10 ticks in the bulge (18deg taper each side, ticks 3.75deg apart).
    expect(m.longCount, `long-tick count was ${m.longCount}`).toBeGreaterThanOrEqual(5);
    expect(m.longCount, `long-tick count was ${m.longCount}`).toBeLessThanOrEqual(16);

    // At first appearance the bulge sits under .dial_sector-dot at screen bottom
    // (+90deg in the y-down frame).
    expect(m.bulgeCentreScreenDeg, 'bulge centre could not be determined').not.toBeNull();
    expect(
      angleDelta(m.bulgeCentreScreenDeg, 90),
      `bulge centre is at screen ${m.bulgeCentreScreenDeg}deg, expected ~90deg (bottom); rotation ${m.rotationDeg}`
    ).toBeLessThan(12);
  });
});

/* 2. Bulge rotates with the dial (the core behaviour change) */
test.describe(`${SLUG} — Bulge Rotates With Dial`, () => {
  test.use(MOBILE);

  test('bulge rotates with the dial and does not stay at screen bottom', async ({ page }) => {
    await loadHomePastIntro(page);
    const before = await measureTicks(page);
    expect(before.bulgeCentreCanvasDeg, 'no bulge before drag').not.toBeNull();

    await dragDial(page, -260); // upward drag rotates the dial
    const after = await measureTicks(page);

    const applied = angleDelta(after.rotationDeg, before.rotationDeg);
    test.skip(applied < 10, `drag rotated the dial only ${applied}deg — cannot assert travel`);

    // THE key assertion: the bulge is fixed in CANVAS space. Its canvas-space
    // centre must not move, which is exactly what "locked and rotating with the
    // dial" means. The old behaviour moved it by -rotationDeg to stay on screen
    // bottom, so this fails on the pre-fix build.
    expect(
      angleDelta(after.bulgeCentreCanvasDeg, before.bulgeCentreCanvasDeg),
      `bulge moved in canvas space: ${before.bulgeCentreCanvasDeg} -> ${after.bulgeCentreCanvasDeg} ` +
      `(rotation ${before.rotationDeg} -> ${after.rotationDeg}). It should be locked.`
    ).toBeLessThan(10);

    // And consequently it is no longer at screen bottom.
    expect(
      angleDelta(after.bulgeCentreScreenDeg, 90),
      `bulge is still at screen bottom (${after.bulgeCentreScreenDeg}deg) after ${applied}deg of rotation — ` +
      `it is still being pinned to the dot`
    ).toBeGreaterThan(10);

    // Its screen travel matches the rotation applied.
    const travel = angleDelta(after.bulgeCentreScreenDeg, before.bulgeCentreScreenDeg);
    expect(travel, `bulge travelled ${travel}deg but dial rotated ${applied}deg`)
      .toBeGreaterThan(applied - 15);
  });

  test('long-tick count stays constant across rotation', async ({ page }) => {
    await loadHomePastIntro(page);
    const before = await measureTicks(page);

    await dragDial(page, -180);
    const mid = await measureTicks(page);
    await dragDial(page, -180);
    const after = await measureTicks(page);

    // No other tick grows: the bulge is the same size wherever it points.
    expect(Math.abs(mid.longCount - before.longCount),
      `long-tick count changed ${before.longCount} -> ${mid.longCount} after rotating`).toBeLessThanOrEqual(2);
    expect(Math.abs(after.longCount - before.longCount),
      `long-tick count changed ${before.longCount} -> ${after.longCount} after rotating`).toBeLessThanOrEqual(2);

    // Peak length is unchanged too — ticks are not growing as they pass bottom.
    expect(Math.abs(after.maxLen - before.maxLen),
      `peak tick length drifted ${before.maxLen} -> ${after.maxLen}`).toBeLessThan(before.baseLen * 0.6);
  });
});

/* 3. Handoff: bulge locks to the active project, not always sector 0 */
test.describe(`${SLUG} — Case Study Handoff`, () => {
  test.use(MOBILE);

  test('active index and canvas rotation agree after case-study handoff', async ({ page }) => {
    await loadHomePastIntro(page);

    // Rotate away from sector 0 so the project we open is not index 0.
    await dragDial(page, -260);
    const rotated = await measureTicks(page);
    const idxBefore = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.() ?? null);
    test.skip(idxBefore === null, 'RHP.workDial.getActiveIndex() unavailable');
    test.skip(idxBefore === 0, `active index is still 0 after ${rotated.rotationDeg}deg rotation`);

    // Tap the dial centre to open the active case study.
    const centre = await page.evaluate(() => {
      const r = document.querySelector('#dial_ticks-canvas').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const urlBefore = page.url();
    await page.mouse.click(centre.x, centre.y);
    await page.waitForTimeout(2500); // Barba transition

    const navigated = page.url() !== urlBefore;
    test.skip(!navigated, 'dial tap did not navigate to a case study');

    // Back to home.
    await page.goBack();
    await waitForRHP(page);
    await page.waitForTimeout(2500);

    const idxAfter = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.() ?? null);
    const m = await measureTicks(page);

    // The handoff restored a non-zero index...
    expect(idxAfter, `active index after handoff was ${idxAfter}, expected ${idxBefore}`).toBe(idxBefore);

    // ...and rotation now encodes it. Pre-fix, rotationDeg stays 0 while the
    // index is restored, which is the desync this feature depends on fixing.
    expect(
      m.rotationDeg,
      `active index is ${idxAfter} but canvas rotation is ${m.rotationDeg}deg — ` +
      `rotation is desynced from the restored index`
    ).toBeGreaterThan(1);

    // The bulge is on that project's ticks, which puts it back under the dot.
    expect(m.bulgeCentreScreenDeg, 'no bulge after handoff').not.toBeNull();
    expect(
      angleDelta(m.bulgeCentreScreenDeg, 90),
      `after handoff the bulge is at screen ${m.bulgeCentreScreenDeg}deg, expected ~90deg (under the dot)`
    ).toBeLessThan(15);
  });
});

/* 4. Grow-in animation */
test.describe(`${SLUG} — Grow In`, () => {
  test.use(MOBILE);

  test('bulge grows in rather than popping', async ({ page }) => {
    // Sample early, before the ~0.5s grow-in has settled.
    await loadHomePastIntro(page, { settle: 0 });
    await page.waitForTimeout(150);
    const early = await measureTicks(page);

    await page.waitForTimeout(2000);
    const settled = await measureTicks(page);

    expect(settled.span, 'no bulge after settle').toBeGreaterThan(settled.baseLen * 0.5);

    // Partway through the grow-in the peak must be shorter than its final value.
    // If the bulge popped instantly, early.maxLen === settled.maxLen.
    expect(
      early.maxLen,
      `peak length was already ${early.maxLen} at 150ms and ${settled.maxLen} once settled — no grow-in`
    ).toBeLessThan(settled.maxLen - 1);

    // ...but it has started, so it is longer than the base length.
    expect(early.maxLen, `peak length at 150ms was ${early.maxLen}, base is ${early.baseLen}`)
      .toBeGreaterThan(early.baseLen * 0.8);
  });
});

/* 5. No overflow at any rotation */
test.describe(`${SLUG} — No Overflow`, () => {
  test.use(MOBILE);

  test('bulge never overflows the canvas at any rotation', async ({ page }) => {
    await loadHomePastIntro(page);

    // Measured bulge tip is 173.5px at this viewport against a 196.5px
    // half-width — 23.0px clearance. maxInkRadius includes the 12px glow, so
    // this is the strict form of the check.
    for (const delta of [0, -140, -140, -140, -140]) {
      if (delta !== 0) await dragDial(page, delta);
      const m = await measureTicks(page);
      const limit = Math.min(m.canvasHalfWidth, m.canvasHalfHeight);
      expect(
        m.maxInkRadius,
        `ink reaches ${m.maxInkRadius}px from centre at rotation ${m.rotationDeg}deg, ` +
        `canvas limit is ${limit}px`
      ).toBeLessThan(limit - 2);
    }
  });

  test('no ink in the outermost columns of the canvas', async ({ page }) => {
    await loadHomePastIntro(page);
    await dragDial(page, -220); // put the bulge near the horizontal axis

    const edge = await page.evaluate(() => {
      const canvas = document.querySelector('#dial_ticks-canvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const scan = (x0, x1) => {
        const d = ctx.getImageData(x0, 0, x1 - x0, h).data;
        let max = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > max) max = d[i];
        return max;
      };
      return { left: scan(0, 3), right: scan(w - 3, w) };
    });

    expect(edge.left, `ink found in the leftmost canvas columns (alpha ${edge.left})`).toBeLessThan(8);
    expect(edge.right, `ink found in the rightmost canvas columns (alpha ${edge.right})`).toBeLessThan(8);
  });
});

/* 6. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test.use(MOBILE);

  test('no console errors on mobile home through morph and drag', async ({ page }) => {
    const errors = collectErrors(page);
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await loadHomePastIntro(page);
    await dragDial(page, -200);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `console.error: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});

/* 7. Desktop regression */
test.describe(`${SLUG} — Desktop Unaffected`, () => {
  test.use(DESKTOP);

  test('desktop tick attraction still follows the pointer', async ({ page }) => {
    await loadHomePastIntro(page);

    const geo = await page.evaluate(() => {
      const c = document.querySelector('#dial_ticks-canvas');
      const r = c.getBoundingClientRect();
      const fr = document.querySelector('#fg-video-wrap').getBoundingClientRect();
      return {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        ringR: Math.min(fr.width, fr.height) / 2 * 1.13
      };
    });

    // Pointer to the LEFT of the dial: bulge should follow to screen 180deg.
    await page.mouse.move(geo.cx - geo.ringR, geo.cy, { steps: 6 });
    await page.waitForTimeout(900);
    const left = await measureTicks(page);

    // Pointer ABOVE the dial: bulge should move to screen 270deg (y-down frame).
    await page.mouse.move(geo.cx, geo.cy - geo.ringR, { steps: 6 });
    await page.waitForTimeout(900);
    const top = await measureTicks(page);

    // Desktop never rotates the canvas.
    expect(left.rotationDeg, 'desktop canvas should not be rotated').toBeLessThan(1);
    expect(top.rotationDeg, 'desktop canvas should not be rotated').toBeLessThan(1);

    expect(left.bulgeCentreScreenDeg, 'no desktop attraction bulge with pointer left').not.toBeNull();
    expect(top.bulgeCentreScreenDeg, 'no desktop attraction bulge with pointer above').not.toBeNull();

    // The bulge tracked the pointer, i.e. it is NOT locked on desktop.
    const moved = angleDelta(left.bulgeCentreScreenDeg, top.bulgeCentreScreenDeg);
    expect(moved, `desktop bulge barely moved (${moved}deg) when the pointer went from left to top — ` +
      `pointer attraction may have been locked by mistake`).toBeGreaterThan(40);
  });
});

/* 8. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ ...MOBILE, reducedMotion: 'reduce' });

  test('reduced motion leaves all mobile ticks at base length', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHomePastIntro(page);
    const m = await measureTicks(page);

    // hasAttrMobile includes !prefersReduced(), so there is no bulge at all
    // under reduced motion. This guards the assumption flagged in the spec: if
    // the client later asks for a static marker for reduced-motion users, this
    // test is the one to update.
    expect(m.span, `tick lengths vary by ${m.span}px under reduced motion — expected a flat ring`)
      .toBeLessThan(m.baseLen * 0.5);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});
