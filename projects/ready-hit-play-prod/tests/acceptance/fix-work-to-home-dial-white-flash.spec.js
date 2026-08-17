// @ts-check
/**
 * Acceptance tests — fix-work-to-home-dial-white-flash
 *
 * Spec: .claude/specs/fix-work-to-home-dial-white-flash.md
 *
 * Bug: navigating work → home, `setDialNs('home')` fires while the old Barba
 * container (~4,957 px of case content) is still a sibling flex item inside
 * `.dial_layer-fg`. The home CSS rule for `#fg-video-wrap` omits
 * `flex-shrink: 0`, so that sibling crushes the video wrap to 0 px height. The
 * white `.case-studies_wrapper` sections then fill the whole dial for the
 * entire ~800 ms shrink.
 *
 * These tests sample geometry every animation frame across the transition,
 * because the fault is transient — it is fully healed by the time Barba removes
 * the old container, so a post-transition snapshot would show nothing wrong.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-work-to-home-dial-white-flash';
const WORK_PATH = '/work/overland-ai';
const HOME_PATH = '/';

/** Opacity at or below which the case content is considered invisible. */
const HIDDEN_OPACITY = 0.05;
/** Fade is 0.2 s; allow generous slack for a slow staging frame. */
const FADE_DEADLINE_MS = 250;
/** 0.8 s shrink + Barba swap + settle. */
const TRANSITION_SETTLE_MS = 2500;

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Navigate to a path and wait for RHP init plus a GSAP settle. */
async function loadPage(page, path) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

/** Attach a pageerror listener and return the errors array. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/**
 * Start a requestAnimationFrame sampler that records dial geometry per frame.
 * Must be running before the transition is triggered.
 */
async function startSampler(page) {
  await page.evaluate(() => {
    window.__flashSamples = [];
    window.__flashT0 = performance.now();
    const tick = () => {
      const dialFg = document.querySelector('.dial_layer-fg');
      const videoWrap = document.getElementById('fg-video-wrap');
      const caseWrap = document.querySelector('.case-studies_wrapper');
      if (dialFg) {
        const dr = dialFg.getBoundingClientRect();
        const vr = videoWrap ? videoWrap.getBoundingClientRect() : null;
        window.__flashSamples.push({
          t: Math.round(performance.now() - window.__flashT0),
          ns: document.querySelector('.dial_component')?.getAttribute('data-dial-ns'),
          dialH: Math.round(dr.height),
          videoH: vr ? Math.round(vr.height) : null,
          caseAttached: !!caseWrap,
          caseOpacity: caseWrap ? Number(getComputedStyle(caseWrap).opacity) : null
        });
      }
      window.__flashRaf = requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Stop the sampler and return the recorded frames. */
async function stopSampler(page) {
  return page.evaluate(() => {
    cancelAnimationFrame(window.__flashRaf);
    return window.__flashSamples;
  });
}

/** Click the in-dial link back to the homepage (triggers work-to-home). */
async function clickHomeLink(page) {
  const clicked = await page.evaluate(() => {
    const a = document.querySelector('a.case-homepage-link')
      || Array.from(document.querySelectorAll('a'))
        .find((x) => new URL(x.href, location.href).pathname === '/');
    if (!a) return false;
    a.click();
    return true;
  });
  expect(clicked, 'could not find the in-dial homepage link').toBe(true);
}

/** Run one full work → home transition with sampling. Returns the frames. */
async function sampleWorkToHome(page) {
  await startSampler(page);
  await clickHomeLink(page);
  await page.waitForTimeout(TRANSITION_SETTLE_MS);
  return stopSampler(page);
}

/** Frames from the start of the transition until the old container is gone. */
function shrinkFrames(samples) {
  return samples.filter((s) => s.caseAttached);
}

// ── Tests ─────────────────────────────────────────────────────

/* T1 — the core regression guard */
test.describe(`${SLUG} — Video wrap survives the shrink`, () => {
  test('video wrap never collapses to zero height during the shrink', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    const samples = await sampleWorkToHome(page);

    const during = shrinkFrames(samples);
    expect(during.length, 'sampler recorded no frames with the case container attached')
      .toBeGreaterThan(5);

    const collapsed = during.filter((s) => s.videoH !== null && s.videoH <= 0);
    expect(
      collapsed,
      `#fg-video-wrap collapsed to 0 px on ${collapsed.length}/${during.length} frames `
      + `(first at t=${collapsed[0]?.t}ms). The home CSS rule omits flex-shrink:0, so the `
      + `oversized Barba container sibling crushes it once setDialNs('home') fires.`
    ).toHaveLength(0);
  });

  test('video tracks the dial box at the end of the shrink', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    const samples = await sampleWorkToHome(page);

    const last = samples[samples.length - 1];
    expect(last.videoH, 'no final video wrap measurement').not.toBeNull();
    expect(
      Math.abs(last.videoH - last.dialH),
      `video wrap (${last.videoH}px) should match the dial box (${last.dialH}px) once home`
    ).toBeLessThanOrEqual(8);
  });
});

/* T2 — the white content is gone fast */
test.describe(`${SLUG} — Case content fades out`, () => {
  test('case wrapper is faded out before the dial starts shrinking', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    const samples = await sampleWorkToHome(page);

    const during = shrinkFrames(samples);
    const late = during.filter((s) => s.t >= FADE_DEADLINE_MS);
    expect(late.length, 'no frames sampled after the fade deadline').toBeGreaterThan(0);

    const stillVisible = late.filter((s) => s.caseOpacity > HIDDEN_OPACITY);
    expect(
      stillVisible,
      `.case-studies_wrapper was still visible on ${stillVisible.length}/${late.length} frames `
      + `after t=${FADE_DEADLINE_MS}ms (max opacity `
      + `${Math.max(0, ...stillVisible.map((s) => s.caseOpacity))}). Its child sections are `
      + `#fff and fill the dial.`
    ).toHaveLength(0);
  });

  test('fade starts immediately rather than partway through the shrink', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    const samples = await sampleWorkToHome(page);

    // By the halfway point of the 0.2 s fade the wrapper should be well under 1.
    const midFade = shrinkFrames(samples).filter((s) => s.t >= 120 && s.t < FADE_DEADLINE_MS);
    if (midFade.length) {
      const minOpacity = Math.min(...midFade.map((s) => s.caseOpacity));
      expect(minOpacity, 'fade does not appear to have started by t=120ms').toBeLessThan(0.6);
    }
  });
});

/* T3 — clean landing on home */
test.describe(`${SLUG} — Home state after the transition`, () => {
  test('home state is clean after the transition', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    await clickHomeLink(page);
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    const state = await page.evaluate(() => {
      const videoWrap = document.getElementById('fg-video-wrap');
      return {
        ns: document.querySelector('.dial_component')?.getAttribute('data-dial-ns'),
        caseAttached: !!document.querySelector('.case-studies_wrapper'),
        inlineWidth: videoWrap?.style.width || '',
        inlineHeight: videoWrap?.style.height || '',
        inlineFlexShrink: videoWrap?.style.flexShrink || '',
        videoH: videoWrap ? Math.round(videoWrap.getBoundingClientRect().height) : null
      };
    });

    expect(state.ns).toBe('home');
    expect(state.caseAttached, 'old case container should have been removed').toBe(false);
    expect(state.inlineWidth, 'stale inline width on #fg-video-wrap').toBe('');
    expect(state.inlineHeight, 'stale inline height on #fg-video-wrap').toBe('');
    expect(state.inlineFlexShrink, 'stale inline flex-shrink on #fg-video-wrap').toBe('');
    expect(state.videoH).toBeGreaterThan(0);
  });
});

/* T4 — re-entry correctness across repeated cycles */
test.describe(`${SLUG} — Barba re-entry`, () => {
  test('work → home → work → home leaves no stale opacity or inline size', async ({ page }) => {
    const errors = collectErrors(page);

    // Cycle 1
    await loadPage(page, WORK_PATH);
    await clickHomeLink(page);
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    // Back to work via Barba (not a hard reload)
    await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a'))
        .find((x) => /^\/work\//.test(new URL(x.href, location.href).pathname));
      if (a) a.click();
    });
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    const onWork = await page.evaluate(() => {
      const w = document.querySelector('.case-studies_wrapper');
      return {
        attached: !!w,
        opacity: w ? getComputedStyle(w).opacity : null,
        ns: document.querySelector('.dial_component')?.getAttribute('data-dial-ns')
      };
    });

    // If the site has no in-dial link back to a case, skip the second half
    // rather than reporting a false failure.
    test.skip(!onWork.attached, 'no Barba route back to a work page from home');

    expect(onWork.ns).toBe('work');
    expect(onWork.opacity, 'incoming .case-studies_wrapper must not inherit opacity 0')
      .toBe('1');

    // Cycle 2 — the regression guard must still hold
    const samples = await sampleWorkToHome(page);
    const collapsed = shrinkFrames(samples).filter((s) => s.videoH !== null && s.videoH <= 0);
    expect(collapsed, 'video wrap collapsed on the second work → home cycle').toHaveLength(0);

    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});

/* T5 — content restored on a work page */
test.describe(`${SLUG} — Case content restored`, () => {
  test('case wrapper opacity is restored on a work page', async ({ page }) => {
    await loadPage(page, HOME_PATH);
    await page.goto(WORK_PATH);
    await waitForRHP(page);
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    const wrapper = page.locator('.case-studies_wrapper');
    await expect(wrapper).toBeAttached();
    const opacity = await wrapper.evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity, 'case content must be fully visible on a work page').toBe('1');
    await expect(wrapper).toBeVisible();
  });
});

/* T6 — console hygiene */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on the work page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, WORK_PATH);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });

  test('no console errors across the work → home transition', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, WORK_PATH);
    await clickHomeLink(page);
    await page.waitForTimeout(TRANSITION_SETTLE_MS);
    expect(errors, `JS errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});

/* T7 — reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion completes the transition without a white frame', async ({ page }) => {
    await loadPage(page, WORK_PATH);
    const samples = await sampleWorkToHome(page);

    // With reduced motion the shrink duration is 0, so there may be very few
    // frames with the container attached — that is the desired outcome.
    const visibleWhite = shrinkFrames(samples)
      .filter((s) => s.t >= FADE_DEADLINE_MS && s.caseOpacity > HIDDEN_OPACITY);
    expect(visibleWhite, 'case content visible after the fade deadline under reduced motion')
      .toHaveLength(0);

    const ns = await page.evaluate(
      () => document.querySelector('.dial_component')?.getAttribute('data-dial-ns')
    );
    expect(ns).toBe('home');
  });
});
