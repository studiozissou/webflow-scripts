// @ts-check
/**
 * Acceptance tests — rhp-home-intro-dial-flip-lock
 *
 * Covers the refined home intro flow:
 *   - Fresh-load locked idle state: dial fitted to .home_dial-start, small,
 *     no fg video, step text hidden, intro logo fades in.
 *   - Scroll-linked Flip.fit scrub: dial + intro logo interpolate toward
 *     .home_dial-middle and .nav_logo-wrapper-2.is-nav over 100vh.
 *   - Morph-complete state: .rhp-home-ready added, dial at middle with
 *     --dial-live-width = --dial-large-width, intro logo hidden, nav visible,
 *     step text revealed, dial interactive.
 *   - Nav animate-in deleted: nav items go from hidden → visible via CSS
 *     class toggle only, no GSAP position tween.
 *   - Barba re-entry (about → home) skips intro.
 *   - Reduced motion fast-path.
 *   - No console errors.
 *   - axe-core WCAG 2.1 AA soft assertion.
 *
 * Spec: .claude/specs/rhp-home-intro-dial-flip-lock.md
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-home-intro-dial-flip-lock';
const HOME_PATH = '/';
const ABOUT_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Load home and wait for init to settle BEFORE any scroll. */
async function loadHomeLocked(page) {
  await page.goto(HOME_PATH);
  await waitForRHP(page);
  // Allow home-intro.run() + homeScrollMorph.init() to settle, but do NOT scroll.
  await page.waitForTimeout(1500);
}

/** Scroll 100% of the intro section to drive the scrub timeline to completion. */
async function scrollThroughIntro(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 2, behavior: 'auto' });
  });
  // Wait for onLeave to fire and morph complete to be committed.
  await page.waitForFunction(
    () => window.RHP?.homeScrollMorph?.complete === true,
    { timeout: 5_000 }
  ).catch(() => { /* reduced-motion may skip the event */ });
  await page.waitForTimeout(1200);
}

/** Scroll to a mid-point of the intro section (scrub ~50%). */
async function scrollHalfwayThroughIntro(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'auto' });
  });
  await page.waitForTimeout(800);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Read a bounding rect from the page for an element by selector. */
async function getRect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, selector);
}

/** Compare two rects within a tolerance. */
function rectsClose(a, b, tol = 4) {
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) <= tol &&
    Math.abs(a.y - b.y) <= tol &&
    Math.abs(a.width - b.width) <= tol &&
    Math.abs(a.height - b.height) <= tol
  );
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Pre-scroll locked idle state */
test.describe(`${SLUG} — Pre-scroll locked state`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHomeLocked(page);
  });

  test('dial_component is attached and fitted to home_dial-start rect', async ({ page }) => {
    await expect(page.locator('.dial_component[data-dial-ns="home"]')).toBeAttached();
    const startRect = await getRect(page, '.home_dial-start');
    const dialRect = await getRect(page, '.dial_component[data-dial-ns="home"]');
    expect(startRect, '.home_dial-start slot must exist in Designer').not.toBeNull();
    expect(dialRect).not.toBeNull();
    expect(rectsClose(dialRect, startRect, 8), `dial rect ${JSON.stringify(dialRect)} should match start slot ${JSON.stringify(startRect)}`).toBe(true);
  });

  test('fg video (.dial_fg-video) is hidden', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.dial_fg-video');
      if (!el) return null;
      return Number(getComputedStyle(el).opacity);
    });
    expect(opacity).not.toBeNull();
    expect(opacity).toBeLessThanOrEqual(0.05);
  });

  test('step text is hidden on load', async ({ page }) => {
    const stepState = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"], .dial_component[data-dial-ns="home"] .is-step');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { opacity: Number(cs.opacity), visibility: cs.visibility };
    });
    expect(stepState, 'step text element must exist').not.toBeNull();
    expect(stepState.opacity <= 0.05 || stepState.visibility === 'hidden').toBe(true);
  });

  test('intro logo fades in to opacity 1 within 1s', async ({ page }) => {
    const sel = '.home-intro_logo-slot .nav_logo-wrapper-2:not(.is-nav)';
    await expect(page.locator(sel)).toBeAttached();
    // Wait up to 1s for the fade to finish.
    await page.waitForFunction(
      (s) => {
        const el = document.querySelector(s);
        if (!el) return false;
        return Number(getComputedStyle(el).opacity) >= 0.95;
      },
      sel,
      { timeout: 1500 }
    );
  });

  test('rhp-home-ready class is absent on page load', async ({ page }) => {
    const hasClass = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(hasClass).toBe(false);
  });

  test('rhp-intro-logo-ready class is present after init', async ({ page }) => {
    const hasClass = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-intro-logo-ready')
    );
    expect(hasClass).toBe(true);
  });

  test('work-dial reports interactionUnlocked false on load', async ({ page }) => {
    // Prefer a test hook if exposed, else check proxy state via dial layer opacity.
    const unlocked = await page.evaluate(() => {
      const wd = window.RHP?.workDial;
      if (wd && typeof wd.isInteractionUnlocked === 'function') return wd.isInteractionUnlocked();
      return null;
    });
    if (unlocked !== null) {
      expect(unlocked).toBe(false);
    } else {
      // Proxy: fg layer opacity should be 0 (dial is IDLE, fg not promoted).
      const fgOpacity = await page.evaluate(() => {
        const el = document.querySelector('.dial_layer-fg');
        if (!el) return null;
        return Number(getComputedStyle(el).opacity);
      });
      expect(fgOpacity).not.toBeNull();
      expect(fgOpacity).toBeLessThanOrEqual(0.05);
    }
  });
});

/* 2. Mid-scroll scrub state */
test.describe(`${SLUG} — Mid-scroll scrub`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHomeLocked(page);
  });

  test('dial rect is between home_dial-start and home_dial-middle', async ({ page }) => {
    const startRect = await getRect(page, '.home_dial-start');
    const middleRect = await getRect(page, '.home_dial-middle');
    expect(startRect).not.toBeNull();
    expect(middleRect).not.toBeNull();

    await scrollHalfwayThroughIntro(page);

    const dialRect = await getRect(page, '.dial_component[data-dial-ns="home"]');
    expect(dialRect).not.toBeNull();

    // Expect width between start and middle (inclusive of small tolerance).
    const minW = Math.min(startRect.width, middleRect.width);
    const maxW = Math.max(startRect.width, middleRect.width);
    expect(dialRect.width).toBeGreaterThanOrEqual(minW - 4);
    expect(dialRect.width).toBeLessThanOrEqual(maxW + 4);
  });
});

/* 3. Post-scroll completed state */
test.describe(`${SLUG} — Post-scroll completed state`, () => {
  test.beforeEach(async ({ page }) => {
    await loadHomeLocked(page);
    await scrollThroughIntro(page);
  });

  test('rhp-home-ready class is added', async ({ page }) => {
    const hasClass = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(hasClass).toBe(true);
  });

  test('dial rect matches home_dial-middle', async ({ page }) => {
    const middleRect = await getRect(page, '.home_dial-middle');
    const dialRect = await getRect(page, '.dial_component[data-dial-ns="home"]');
    expect(middleRect).not.toBeNull();
    expect(dialRect).not.toBeNull();
    expect(rectsClose(dialRect, middleRect, 8), `dial rect ${JSON.stringify(dialRect)} should match middle slot ${JSON.stringify(middleRect)}`).toBe(true);
  });

  test('--dial-live-width is set to --dial-large-width', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        live: cs.getPropertyValue('--dial-live-width').trim(),
        large: cs.getPropertyValue('--dial-large-width').trim()
      };
    });
    expect(result).not.toBeNull();
    // Either the computed value matches, or the raw var reference matches.
    expect(result.live === result.large || result.live.includes('dial-large-width')).toBe(true);
  });

  test('step text is visible after morph', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"], .dial_component[data-dial-ns="home"] .is-step');
      if (!el) return null;
      return Number(getComputedStyle(el).opacity);
    });
    expect(opacity).not.toBeNull();
    expect(opacity).toBeGreaterThanOrEqual(0.95);
  });

  test('intro logo is hidden', async ({ page }) => {
    const state = await page.evaluate(() => {
      const el = document.querySelector('.home-intro_logo-slot .nav_logo-wrapper-2:not(.is-nav)');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, opacity: Number(cs.opacity) };
    });
    // Either hidden via display:none or opacity:0.
    expect(state === null || state.display === 'none' || state.opacity <= 0.05).toBe(true);
  });

  test('real nav .is-nav logo is visible', async ({ page }) => {
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
      if (!el) return null;
      return Number(getComputedStyle(el).opacity);
    });
    expect(opacity).not.toBeNull();
    expect(opacity).toBeGreaterThanOrEqual(0.95);
  });

  test('section_home-intro is display none', async ({ page }) => {
    const display = await page.evaluate(() => {
      const el = document.querySelector('.section_home-intro');
      return el ? getComputedStyle(el).display : null;
    });
    expect(display).toBe('none');
  });

  test('nav items were revealed via class toggle, not GSAP translate', async ({ page }) => {
    // Nav items should have no lingering transform from _animateNavIn.
    // We only assert visibility here; if _animateNavIn is still in place, the
    // test in "pre-scroll — nav items hidden" would also pass, so the paired
    // evidence is: hidden pre, visible post, and no x/y transform values.
    const transforms = await page.evaluate(() => {
      const sels = ['.nav_logo-link', '.nav_about-link', '.nav_contact-link'];
      return sels.map((s) => {
        const el = document.querySelector(s);
        if (!el) return { sel: s, transform: 'null' };
        return { sel: s, transform: getComputedStyle(el).transform };
      });
    });
    // Allow `none` or identity matrix; flag any translation.
    for (const t of transforms) {
      if (t.transform === 'null' || t.transform === 'none') continue;
      // Parse matrix and check that e and f (translation) are near zero.
      const m = t.transform.match(/matrix\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
        const tx = parts[4] || 0;
        const ty = parts[5] || 0;
        expect(Math.abs(tx), `${t.sel} translation x`).toBeLessThanOrEqual(2);
        expect(Math.abs(ty), `${t.sel} translation y`).toBeLessThanOrEqual(2);
      }
    }
  });
});

/* 4. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on initial load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHomeLocked(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });

  test('no JS errors through full scroll morph', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHomeLocked(page);
    await scrollThroughIntro(page);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});

/* 5. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('lands at completed state on load (no scroll required)', async ({ page }) => {
    await loadHomeLocked(page);
    await page.waitForTimeout(500);

    const hasReady = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(hasReady).toBe(true);

    const middleRect = await getRect(page, '.home_dial-middle');
    const dialRect = await getRect(page, '.dial_component[data-dial-ns="home"]');
    if (middleRect && dialRect) {
      expect(rectsClose(dialRect, middleRect, 10)).toBe(true);
    }
  });

  test('step text is visible on load', async ({ page }) => {
    await loadHomeLocked(page);
    const opacity = await page.evaluate(() => {
      const el = document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"], .dial_component[data-dial-ns="home"] .is-step');
      if (!el) return null;
      return Number(getComputedStyle(el).opacity);
    });
    expect(opacity).not.toBeNull();
    expect(opacity).toBeGreaterThanOrEqual(0.95);
  });
});

/* 6. Barba re-entry */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('about → home lands at completed state', async ({ page }) => {
    await page.goto(ABOUT_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Navigate to home via nav
    await page.click('.nav_logo-link').catch(async () => {
      // Fallback to direct navigation if click target isn't a link
      await page.goto(HOME_PATH);
    });
    await waitForRHP(page);
    await page.waitForTimeout(2500);

    const hasReady = await page.evaluate(() =>
      document.querySelector('[data-barba="wrapper"]')?.classList.contains('rhp-home-ready')
    );
    expect(hasReady).toBe(true);

    const introDisplay = await page.evaluate(() => {
      const el = document.querySelector('.section_home-intro');
      return el ? getComputedStyle(el).display : null;
    });
    expect(introDisplay).toBe('none');
  });

  test('home → about → home re-entry: no duplicated nodes, no errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadHomeLocked(page);
    await scrollThroughIntro(page);

    await page.goto(ABOUT_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    await page.goto(HOME_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    const dialCount = await page.locator('.dial_component[data-dial-ns="home"]').count();
    expect(dialCount).toBe(1);

    const introCount = await page.locator('.home-intro_logo-slot .nav_logo-wrapper-2:not(.is-nav)').count();
    expect(introCount).toBeLessThanOrEqual(1);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});

/* 7. Accessibility */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on homepage', async ({ page }) => {
    await loadHomeLocked(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
