// @ts-check
/**
 * Acceptance tests — rhp-work-dial-switch-deadzone
 *
 * Feature: allow project switching when the cursor is inside the fg video
 * but outside a tweakable "deadzone" radius at the centre.
 *
 * Spec: .claude/specs/rhp-work-dial-switch-deadzone.md
 *
 * NOTE ON POINTER SIMULATION
 * work-dial.js listens to pointermove on `.dial_component`. We use
 * `page.mouse.move(x, y)` which dispatches real pointer events that the
 * module receives. Intro gating is bypassed via setIntroComplete(true) +
 * setInteractionUnlocked(true) so tests are deterministic.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-work-dial-switch-deadzone';
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
  await page.waitForTimeout(1500); // GSAP / module settle
}

/**
 * Skip the home intro sequence so work-dial is immediately interactive.
 * Uses the public setters exposed on window.RHP.workDial.
 */
async function skipIntro(page) {
  await page.waitForFunction(
    () => typeof window.RHP?.workDial?.setIntroComplete === 'function'
       && typeof window.RHP?.workDial?.setInteractionUnlocked === 'function',
    { timeout: 10_000 }
  );
  await page.evaluate(() => {
    window.RHP.workDial.setIntroComplete(true);
    window.RHP.workDial.setInteractionUnlocked(true);
  });
  await page.waitForTimeout(200);
}

/**
 * Read the fg video geometry needed to simulate pointer moves at known
 * distances from its centre.
 * Returns { fgCX, fgCY, videoR } in viewport coordinates.
 */
async function getFgGeometry(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.dial_layer-fg');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      fgCX: r.left + r.width / 2,
      fgCY: r.top + r.height / 2,
      videoR: Math.min(r.width, r.height) / 2,
      width: r.width,
      height: r.height,
    };
  });
}

/**
 * Move the mouse to a point at (ratio * videoR) from the fg centre at a
 * given angle in degrees. Angle 0 = right, 90 = down.
 */
async function movePointerToFgFraction(page, geom, { ratio, angleDeg }) {
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.round(geom.fgCX + Math.cos(rad) * geom.videoR * ratio);
  const y = Math.round(geom.fgCY + Math.sin(rad) * geom.videoR * ratio);
  await page.mouse.move(x, y, { steps: 3 });
  await page.waitForTimeout(60); // let pointermove handler run + hysteresis settle
}

/** Read current active sector index from the work-dial module. */
async function getActiveIndex(page) {
  return await page.evaluate(() => {
    const fn = window.RHP?.workDial?.getActiveIndex;
    return typeof fn === 'function' ? fn() : null;
  });
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. API surface */
test.describe(`${SLUG} — API surface`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('setDeadzoneRatio is exposed on window.RHP.workDial', async ({ page }) => {
    const type = await page.evaluate(
      () => typeof window.RHP?.workDial?.setDeadzoneRatio
    );
    expect(type).toBe('function');
  });

  test('setDeadzoneRatio ignores invalid inputs without throwing', async ({ page }) => {
    const ok = await page.evaluate(() => {
      try {
        window.RHP.workDial.setDeadzoneRatio(-1);
        window.RHP.workDial.setDeadzoneRatio(2);
        window.RHP.workDial.setDeadzoneRatio('nope');
        window.RHP.workDial.setDeadzoneRatio(NaN);
        window.RHP.workDial.setDeadzoneRatio(0.5); // valid
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(ok).toBe(true);
  });
});

/* 2. Outer-ring switching works */
test.describe(`${SLUG} — Outer-ring switching`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await skipIntro(page);
  });

  test('hovering outer ring of fg video updates active sector on angle change', async ({ page }) => {
    const geom = await getFgGeometry(page);
    expect(geom, 'fg video not found').not.toBeNull();
    expect(geom.videoR, 'videoR too small — layout issue').toBeGreaterThan(80);

    // Enter the outer ring at angle 0 (right of centre), 80 % of videoR
    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 0 });
    const idxRight = await getActiveIndex(page);

    // Sweep to angle 180 (left of centre), still in outer ring
    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 180 });
    const idxLeft = await getActiveIndex(page);

    // Sectors at opposite angles must differ for any sector count > 1
    expect(idxRight, 'active index should be a number').toEqual(expect.any(Number));
    expect(idxLeft, 'active index should be a number').toEqual(expect.any(Number));
    expect(idxLeft).not.toBe(idxRight);
  });
});

/* 3. Deadzone lock holds */
test.describe(`${SLUG} — Deadzone lock`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await skipIntro(page);
  });

  test('hovering deep inside deadzone does NOT change active sector', async ({ page }) => {
    const geom = await getFgGeometry(page);
    expect(geom).not.toBeNull();

    // First move into the outer ring to pick a known starting sector
    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 0 });
    const idxStart = await getActiveIndex(page);

    // Now move into the deadzone (0.3 * videoR) at a DIFFERENT angle
    await movePointerToFgFraction(page, geom, { ratio: 0.3, angleDeg: 90 });
    const idxAfter1 = await getActiveIndex(page);

    // And another angle inside the deadzone
    await movePointerToFgFraction(page, geom, { ratio: 0.3, angleDeg: 270 });
    const idxAfter2 = await getActiveIndex(page);

    // Active index should be frozen at whatever it was when we entered the deadzone
    expect(idxAfter1).toBe(idxStart);
    expect(idxAfter2).toBe(idxStart);
  });
});

/* 4. No console errors during a full pointermove sweep */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors during pointer sweep across dial', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await skipIntro(page);

    const geom = await getFgGeometry(page);
    expect(geom).not.toBeNull();

    // Sweep a ring of 12 points at 0.8 * videoR (outer switchable ring)
    for (let i = 0; i < 12; i++) {
      await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: i * 30 });
    }
    // Sweep a ring of 4 points inside the deadzone
    for (let i = 0; i < 4; i++) {
      await movePointerToFgFraction(page, geom, { ratio: 0.3, angleDeg: i * 90 });
    }

    expect(
      errors,
      `JS errors: ${errors.map((e) => e.message).join(', ')}`
    ).toHaveLength(0);
  });
});

/* 5. setDeadzoneRatio changes behaviour live */
test.describe(`${SLUG} — Live tuning`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await skipIntro(page);
  });

  test('lowering deadzone ratio unlocks switching at 0.5 * videoR', async ({ page }) => {
    const geom = await getFgGeometry(page);
    expect(geom).not.toBeNull();

    // With default ratio (0.7), 0.5 * videoR is inside the deadzone → locked.
    // Seed a starting sector in the outer ring, then move to 0.5 * videoR.
    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 0 });
    const idxSeed = await getActiveIndex(page);

    await movePointerToFgFraction(page, geom, { ratio: 0.5, angleDeg: 180 });
    const idxLocked = await getActiveIndex(page);
    expect(idxLocked, 'should be locked at 0.5 * videoR with default ratio').toBe(idxSeed);

    // Lower deadzone to 0.3 → 0.5 * videoR is now OUTSIDE the deadzone.
    await page.evaluate(() => window.RHP.workDial.setDeadzoneRatio(0.3));
    await page.waitForTimeout(60);

    // Nudge pointer to force a fresh pointermove, at a NEW angle
    await movePointerToFgFraction(page, geom, { ratio: 0.5, angleDeg: 0 });
    const idxUnlocked1 = await getActiveIndex(page);
    await movePointerToFgFraction(page, geom, { ratio: 0.5, angleDeg: 180 });
    const idxUnlocked2 = await getActiveIndex(page);

    // With the smaller deadzone, switching should resume at 0.5 * videoR
    expect(idxUnlocked2).not.toBe(idxUnlocked1);

    // Restore default for hygiene
    await page.evaluate(() => window.RHP.workDial.setDeadzoneRatio(0.7));
  });
});

/* 6. Reduced motion — switching still functional */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('outer-ring switching still works with reduced motion', async ({ page }) => {
    await loadPage(page);
    await skipIntro(page);

    const geom = await getFgGeometry(page);
    expect(geom).not.toBeNull();

    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 0 });
    const idx1 = await getActiveIndex(page);

    await movePointerToFgFraction(page, geom, { ratio: 0.8, angleDeg: 180 });
    const idx2 = await getActiveIndex(page);

    expect(idx2).not.toBe(idx1);
  });
});
