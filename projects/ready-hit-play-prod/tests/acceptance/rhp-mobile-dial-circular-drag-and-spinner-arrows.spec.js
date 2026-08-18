// @ts-check
/**
 * Acceptance tests — RHP Mobile dial: circular 360° drag + spinner arrows
 * Spec: .claude/specs/rhp-mobile-dial-circular-drag-and-spinner-arrows.md
 *
 * Two behaviours under test:
 *  1. Dragging a finger in a circle around the dial rotates it continuously,
 *     with no direction reversal (the old dominant-axis dx/dy mapping flipped
 *     every 45° of arc).
 *  2. The 8px white dot at 6 o'clock is replaced by the spinner-arrows SVG.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-mobile-dial-circular-drag-and-spinner-arrows';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
const MOBILE = { width: 390, height: 844 };

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = '/') {
  await page.goto(`${STAGING_URL}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(2000); // intro + GSAP settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Centre + radius of the dial, in viewport coords. */
async function dialGeom(page) {
  return page.locator('.dial_layer-fg').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      radius: Math.min(r.width, r.height) / 2,
    };
  });
}

/** Current canvas rotation in degrees, parsed from its transform. 0 if none. */
async function readRotation(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#dial_ticks-canvas');
    if (!c) return null;
    const t = c.style.transform || '';
    const m = t.match(/rotate\(([-\d.]+)deg\)/);
    if (m) return parseFloat(m[1]);
    // Fall back to the computed matrix if the inline string isn't there.
    const cs = getComputedStyle(c).transform;
    if (!cs || cs === 'none') return 0;
    const nums = cs.match(/matrix\(([^)]+)\)/);
    if (!nums) return 0;
    const [a, b] = nums[1].split(',').map(Number);
    return Math.atan2(b, a) * 180 / Math.PI;
  });
}

/** Number of dial sectors (CMS-driven — never hardcode). */
async function sectorCount(page) {
  return page.evaluate(() => {
    const list = document.querySelector('.dial_cms-list');
    if (list) {
      const n = list.querySelectorAll('.w-dyn-item').length;
      if (n > 0) return n;
    }
    return document.querySelectorAll('.dial_work-link').length || 0;
  });
}

/**
 * Synthesise a finger arc around the dial centre.
 * Sweeps `sweepDeg` starting at `startDeg`, on a circle of `radius`,
 * in `steps` pointermove events. Returns the rotation sampled at each step.
 */
async function arcDrag(page, { cx, cy, radius, startDeg, sweepDeg, steps = 36, sample = true }) {
  const rad = (d) => d * Math.PI / 180;
  const pt = (d) => ({ x: cx + Math.cos(rad(d)) * radius, y: cy + Math.sin(rad(d)) * radius });

  const start = pt(startDeg);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  const samples = [];
  for (let i = 1; i <= steps; i++) {
    const p = pt(startDeg + (sweepDeg * i) / steps);
    await page.mouse.move(p.x, p.y);
    if (sample) samples.push(await readRotation(page));
  }
  await page.mouse.up();
  return samples;
}

/** Unwrap a sequence of mod-360 angles into a continuous series. */
function unwrap(series) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < series.length; i++) {
    if (i === 0) { acc = series[0]; out.push(acc); continue; }
    let d = series[i] - series[i - 1];
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    acc += d;
    out.push(acc);
  }
  return out;
}

// ── 1. Circular drag ──────────────────────────────────────────

test.describe(`${SLUG} — Circular drag`, () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('no console errors on mobile home at 390px', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('rotation is monotonic through a full 360 finger arc', async ({ page }) => {
    const { cx, cy, radius } = await dialGeom(page);
    const samples = await arcDrag(page, {
      cx, cy,
      radius: radius * 1.15, // outside innerR, inside the tick ring
      startDeg: 0,
      sweepDeg: 360,
      steps: 36,
    });

    expect(samples.every(s => s !== null && Number.isFinite(s)),
      `non-finite rotation sampled: ${JSON.stringify(samples)}`).toBe(true);

    // The old dominant-axis mapping reversed at every 45° boundary, so the
    // unwrapped series went up and down. Pure angular tracking only ever rises.
    const series = unwrap(samples);
    const backwards = [];
    for (let i = 1; i < series.length; i++) {
      const d = series[i] - series[i - 1];
      if (d < -1) backwards.push({ step: i, delta: d.toFixed(2) });
    }
    expect(backwards, `direction reversed mid-arc: ${JSON.stringify(backwards)}`)
      .toHaveLength(0);

    // 1:1 gain — a 360° finger arc should move the dial roughly 360°.
    const total = series[series.length - 1] - series[0];
    expect(Math.abs(total)).toBeGreaterThan(300);
    expect(Math.abs(total)).toBeLessThan(420);
  });

  test('clockwise finger arc rotates the dial clockwise', async ({ page }) => {
    const { cx, cy, radius } = await dialGeom(page);
    const before = await readRotation(page);
    const samples = await arcDrag(page, {
      cx, cy, radius: radius * 1.15, startDeg: 0, sweepDeg: 90, steps: 12,
    });
    const series = unwrap([before, ...samples]);
    expect(series[series.length - 1] - series[0]).toBeGreaterThan(0);
  });

  test('one sector-angle of arc advances exactly one sector', async ({ page }) => {
    const n = await sectorCount(page);
    expect(n, 'could not read sector count from the DOM').toBeGreaterThan(1);
    const sectorSize = 360 / n;

    const startIdx = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.());
    const { cx, cy, radius } = await dialGeom(page);
    await arcDrag(page, {
      cx, cy, radius: radius * 1.15,
      startDeg: 0, sweepDeg: sectorSize, steps: 12, sample: false,
    });
    await page.waitForTimeout(600); // snap tween

    const endIdx = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.());
    const moved = ((endIdx - startIdx) % n + n) % n;
    expect(moved, `expected 1 sector, moved ${moved} (n=${n})`).toBe(1);
  });

  test('two full turns return to the starting sector', async ({ page }) => {
    const n = await sectorCount(page);
    const startIdx = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.());
    const { cx, cy, radius } = await dialGeom(page);
    await arcDrag(page, {
      cx, cy, radius: radius * 1.15,
      startDeg: 0, sweepDeg: 720, steps: 72, sample: false,
    });
    await page.waitForTimeout(600);

    const endIdx = await page.evaluate(() => window.RHP?.workDial?.getActiveIndex?.());
    expect(((endIdx - startIdx) % n + n) % n,
      `two full turns should land back on the start sector (n=${n})`).toBe(0);
  });

  test('dial snaps to a sector boundary on pointerup', async ({ page }) => {
    const n = await sectorCount(page);
    const sectorSize = 360 / n;
    const { cx, cy, radius } = await dialGeom(page);

    await arcDrag(page, {
      cx, cy, radius: radius * 1.15,
      startDeg: 0, sweepDeg: sectorSize * 1.4, steps: 16, sample: false,
    });
    await page.waitForTimeout(600); // 0.2s tween + margin

    const rot = await readRotation(page);
    const off = Math.abs(((rot % sectorSize) + sectorSize) % sectorSize);
    const err = Math.min(off, sectorSize - off);
    expect(err, `rotation ${rot} is ${err} off a ${sectorSize}° boundary`)
      .toBeLessThan(1.5);
  });

  test('tap inside the inner circle does not rotate the dial', async ({ page }) => {
    const { cx, cy, radius } = await dialGeom(page);
    const before = await readRotation(page);

    // Start well inside the video circle, then drag — startedInInner must block it.
    await page.mouse.move(cx, cy - radius * 0.3);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + i * 8, cy - radius * 0.3 + i * 8);
    }
    await page.mouse.up();
    await page.waitForTimeout(600);

    const after = await readRotation(page);
    expect(Math.abs(after - before), 'inner-circle drag rotated the dial')
      .toBeLessThan(1.5);
  });

  test('page does not scroll while dragging the dial', async ({ page }) => {
    const { cx, cy, radius } = await dialGeom(page);
    const before = await page.evaluate(() => window.scrollY);
    await arcDrag(page, {
      cx, cy, radius: radius * 1.15,
      startDeg: 0, sweepDeg: 180, steps: 24, sample: false,
    });
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBe(before);
  });
});

// ── 2. Spinner arrows indicator ───────────────────────────────

test.describe(`${SLUG} — Spinner arrows`, () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('spinner arrows SVG is rendered inside .dial_sector-dot', async ({ page }) => {
    const dot = page.locator('.dial_sector-dot');
    await expect(dot).toBeVisible();

    const shape = await dot.evaluate((el) => {
      const svg = el.querySelector('svg');
      return svg ? {
        paths: svg.querySelectorAll('path').length,
        lines: svg.querySelectorAll('line').length,
        viewBox: svg.getAttribute('viewBox'),
      } : null;
    });
    expect(shape, 'no <svg> inside .dial_sector-dot').not.toBeNull();
    expect(shape.paths).toBe(2);
    expect(shape.lines).toBe(2);
    expect(shape.viewBox).toBe('0 0 53 19');
  });

  test('indicator box is 53x19 with no dot styling', async ({ page }) => {
    const box = await page.locator('.dial_sector-dot').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: r.width, h: r.height,
        bg: cs.backgroundColor,
        radius: cs.borderRadius,
      };
    });
    expect(Math.round(box.w)).toBe(53);
    expect(Math.round(box.h)).toBe(19);
    // Old dot was a solid white 50%-radius circle — both must be gone.
    expect(box.bg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(box.radius).not.toBe('50%');
  });

  test('indicator is aria-hidden', async ({ page }) => {
    await expect(page.locator('.dial_sector-dot'))
      .toHaveAttribute('aria-hidden', 'true');
  });

  test('indicator is hidden above 991px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await expect(page.locator('.dial_sector-dot')).not.toBeVisible();
  });

  test('indicator is hidden on the about namespace', async ({ page }) => {
    await page.click('a[href="/about"]');
    await page.waitForTimeout(2500); // Barba transition
    await expect(page.locator('.dial_sector-dot')).not.toBeVisible();
  });
});

// ── 3. Regression & accessibility ─────────────────────────────

test.describe(`${SLUG} — Regression & a11y`, () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test('dial still spins after home to about to home', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    await page.click('a[href="/about"]');
    await page.waitForTimeout(2500);
    await page.click('a[href="/"]');
    await page.waitForTimeout(2500);

    // Indicator came back, and came back exactly once.
    await expect(page.locator('.dial_sector-dot')).toHaveCount(1);
    await expect(page.locator('.dial_sector-dot svg')).toHaveCount(1);

    const { cx, cy, radius } = await dialGeom(page);
    const before = await readRotation(page);
    const samples = await arcDrag(page, {
      cx, cy, radius: radius * 1.15, startDeg: 0, sweepDeg: 120, steps: 16,
    });
    const series = unwrap([before, ...samples]);
    expect(Math.abs(series[series.length - 1] - series[0]),
      'dial did not rotate after home→about→home').toBeGreaterThan(60);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('prefers-reduced-motion: rotation works, snap is instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadPage(page);

    const n = await sectorCount(page);
    const sectorSize = 360 / n;
    const { cx, cy, radius } = await dialGeom(page);

    await arcDrag(page, {
      cx, cy, radius: radius * 1.15,
      startDeg: 0, sweepDeg: sectorSize * 1.4, steps: 16, sample: false,
    });
    await page.waitForTimeout(100); // reduced motion snaps without a tween

    const rot = await readRotation(page);
    const off = Math.abs(((rot % sectorSize) + sectorSize) % sectorSize);
    const err = Math.min(off, sectorSize - off);
    expect(err, 'reduced-motion snap should be immediate').toBeLessThan(1.5);
  });

  test('axe-core: no new violations on mobile home', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(serious, `a11y violations: ${serious.map(v => v.id).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── 4. Multi-touch regression ─────────────────────────────────
// Found in review during /build: without pointerId tracking, a second
// finger's pointermove was read as the tracked finger's and could inject
// up to ±180° into rotationDeg in a single event (shortestArc has no
// distance clamp). Guard: only the gesture-owning pointerId rotates.
// Playwright's mouse API is single-pointer, so this dispatches raw
// PointerEvents in-page, mirroring the MCP check that verified the fix.

test.describe(`${SLUG} — Multi-touch guard`, () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test('a second finger cannot inject rotation into an active drag', async ({ page }) => {
    await loadPage(page);
    const jumped = await page.evaluate(async () => {
      const comp = document.querySelector('.dial_component');
      const fg = document.querySelector('.dial_layer-fg');
      const fr = fg.getBoundingClientRect();
      const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
      const radius = Math.min(fr.width, fr.height) / 2 * 1.15;
      const pt = (d) => ({
        x: cx + Math.cos(d * Math.PI / 180) * radius,
        y: cy + Math.sin(d * Math.PI / 180) * radius,
      });
      const readRot = () => {
        const m = document.querySelector('#dial_ticks-canvas')
          .style.transform.match(/rotate\((-?[\d.]+)deg\)/);
        return m ? parseFloat(m[1]) : 0;
      };
      const fire = (type, target, d, pid) => {
        const p = pt(d);
        target.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: pid,
          pointerType: 'touch', clientX: p.x, clientY: p.y,
        }));
      };
      const raf = () => new Promise(r => requestAnimationFrame(r));

      // Finger A drags 30° of arc…
      fire('pointerdown', comp, 0, 41);
      for (let i = 1; i <= 6; i++) { fire('pointermove', comp, i * 5, 41); await raf(); }
      const rotA = readRot();
      // …then a stray finger B move lands on the opposite side of the dial.
      fire('pointermove', comp, 180, 42);
      await raf();
      const rotAfterB = readRot();
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId: 41, pointerType: 'touch',
      }));
      return Math.abs(rotAfterB - rotA);
    });
    // Pre-fix this was ~±180°; the owning-pointer guard makes it 0.
    expect(jumped, `second finger injected ${jumped}° of rotation`).toBeLessThan(5);
  });
});
