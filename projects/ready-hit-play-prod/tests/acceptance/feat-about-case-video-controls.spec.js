// @ts-check
/**
 * Acceptance tests — feat-about-case-video-controls
 *
 * Verifies the case-study video block added to the about page is wired by
 * case-video-controls.js (progress track injected, play/pause + mute working,
 * scrubbing works), renders with square corners, and tears down cleanly on a
 * Barba transition away from about.
 *
 * Spec: .claude/specs/feat-about-case-video-controls.md
 *
 * NOTE: several tests are skipped when the video has no src — the CMS embed
 * binding (About Page Slides → Vimeo Link) is a Webflow Designer prerequisite.
 * Once bound, they run automatically. See the spec's Prerequisite section.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-about-case-video-controls';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

const SECTION = '[data-barba-namespace="about"] .section_case-video';
const VIDEO = `${SECTION} video.video-cover`;
const TRACK = `${SECTION} .case-video_progress-track`;

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, {
    timeout: 20_000
  });
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

async function loadAbout(page) {
  await page.goto(`${BASE}/about`);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // GSAP / view init settle
}

/** Reveal the video (it lives inside the third about accordion). */
async function revealVideo(page) {
  await page.locator(SECTION).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000); // IntersectionObserver + resume
}

/** True once the CMS embed binding is in place. */
async function hasSource(page) {
  return page.evaluate((sel) => {
    const v = document.querySelector(sel);
    return !!(v && (v.getAttribute('src') || v.currentSrc));
  }, VIDEO);
}

// ── Elements & CSS ────────────────────────────────────────────

test.describe(`${SLUG} — Elements & CSS`, () => {
  test.beforeEach(async ({ page }) => {
    await loadAbout(page);
  });

  test('the about page has a case-video section with controls', async ({ page }) => {
    await expect(page.locator(SECTION)).toHaveCount(1);
    await expect(page.locator(`${SECTION} .case-video_control-wrapper`)).toHaveCount(1);
    await expect(page.locator(`${SECTION} .play-pause`)).toHaveCount(1);
    await expect(page.locator(`${SECTION} .mute-unmute`)).toHaveCount(1);
  });

  test('progress track is injected on the about video', async ({ page }) => {
    test.skip(!(await hasSource(page)), 'CMS embed src not bound yet');
    await revealVideo(page);
    await expect(page.locator(TRACK)).toHaveCount(1);
  });

  test('about video wrap has square corners', async ({ page }) => {
    const radius = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-barba-namespace="about"] .section_case-video .dial_video-wrap'
      );
      return el ? getComputedStyle(el).borderRadius : null;
    });
    expect(radius).not.toBeNull();
    // Every corner must resolve to 0 — the base .dial_video-wrap pill radius
    // (999px, for the home dial) must not leak into the about namespace.
    expect(String(radius).replace(/0px/g, '').trim()).toBe('');
  });

  test('home dial video wrap keeps its pill radius', async ({ page }) => {
    await page.goto(BASE);
    await waitForRHP(page);
    await page.waitForTimeout(2000);
    const radius = await page.evaluate(() => {
      const el = document.getElementById('fg-video-wrap');
      return el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) : null;
    });
    expect(radius).not.toBeNull();
    expect(radius).toBeGreaterThan(100); // pill, not squared off
  });
});

// ── Playback controls ─────────────────────────────────────────

test.describe(`${SLUG} — Controls`, () => {
  test.beforeEach(async ({ page }) => {
    await loadAbout(page);
    test.skip(!(await hasSource(page)), 'CMS embed src not bound yet');
    await revealVideo(page);
  });

  test('video autoplays muted once in view', async ({ page }) => {
    const state = await page.evaluate((sel) => {
      const v = document.querySelector(sel);
      return { paused: v.paused, muted: v.muted };
    }, VIDEO);
    expect(state.muted).toBe(true);
    expect(state.paused).toBe(false);
  });

  test('play/pause button toggles playback and swaps icons', async ({ page }) => {
    await page.locator(`${SECTION} .play-pause`).click();
    await page.waitForTimeout(400);

    let state = await page.evaluate((sel) => {
      const v = document.querySelector(sel);
      const sec = v.closest('.section_case-video');
      return {
        paused: v.paused,
        play: getComputedStyle(sec.querySelector('.is-play')).display,
        pause: getComputedStyle(sec.querySelector('.is-pause')).display
      };
    }, VIDEO);
    expect(state.paused).toBe(true);
    expect(state.play).toBe('flex');
    expect(state.pause).toBe('none');

    await page.locator(`${SECTION} .play-pause`).click();
    await page.waitForTimeout(400);

    state = await page.evaluate((sel) => {
      const v = document.querySelector(sel);
      const sec = v.closest('.section_case-video');
      return {
        paused: v.paused,
        play: getComputedStyle(sec.querySelector('.is-play')).display,
        pause: getComputedStyle(sec.querySelector('.is-pause')).display
      };
    }, VIDEO);
    expect(state.paused).toBe(false);
    expect(state.play).toBe('none');
    expect(state.pause).toBe('flex');
  });

  test('mute/unmute button toggles muted and swaps icons', async ({ page }) => {
    await page.locator(`${SECTION} .mute-unmute`).click();
    await page.waitForTimeout(400);

    const state = await page.evaluate((sel) => {
      const v = document.querySelector(sel);
      const sec = v.closest('.section_case-video');
      return {
        muted: v.muted,
        mute: getComputedStyle(sec.querySelector('.is-mute')).display,
        unmute: getComputedStyle(sec.querySelector('.is-unmute')).display
      };
    }, VIDEO);
    expect(state.muted).toBe(false);
    expect(state.mute).toBe('flex');
    expect(state.unmute).toBe('none');
  });

  test('clicking the progress track seeks the video', async ({ page }) => {
    const duration = await page.evaluate((sel) => {
      const v = document.querySelector(sel);
      return isFinite(v.duration) ? v.duration : 0;
    }, VIDEO);
    test.skip(duration <= 0, 'video metadata not loaded');

    const box = await page.locator(TRACK).boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.waitForTimeout(500);

    const current = await page.evaluate((sel) => document.querySelector(sel).currentTime, VIDEO);
    expect(current).toBeGreaterThan(duration * 0.35);
    expect(current).toBeLessThan(duration * 0.65);
  });
});

// ── Barba teardown ────────────────────────────────────────────

test.describe(`${SLUG} — Barba lifecycle`, () => {
  test('leaving about tears down the progress track and restores the cursor', async ({ page }) => {
    await loadAbout(page);
    test.skip(!(await hasSource(page)), 'CMS embed src not bound yet');
    await revealVideo(page);
    await expect(page.locator(TRACK)).toHaveCount(1);

    await page.locator('.nav_logo-link, .nav_logo-wrapper-2').first().click();
    await page.waitForTimeout(2500); // Barba about → home

    const after = await page.evaluate(() => {
      const cursor = document.querySelector('.cursor_dot-wrapper');
      return {
        tracks: document.querySelectorAll('.case-video_progress-track').length,
        cursorOpacity: cursor ? getComputedStyle(cursor).opacity : null
      };
    });
    expect(after.tracks).toBe(0);
    if (after.cursorOpacity !== null) {
      expect(parseFloat(after.cursorOpacity)).toBeGreaterThan(0.9);
    }
  });

  test('re-entering about does not double up progress tracks', async ({ page }) => {
    await loadAbout(page);
    test.skip(!(await hasSource(page)), 'CMS embed src not bound yet');

    await page.locator('.nav_logo-link, .nav_logo-wrapper-2').first().click();
    await page.waitForTimeout(2500);
    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(2500);
    await revealVideo(page);

    await expect(page.locator('.case-video_progress-track')).toHaveCount(1);
  });
});

// ── Errors & reduced motion ───────────────────────────────────

test.describe(`${SLUG} — Errors & reduced motion`, () => {
  test('about page loads with no console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadAbout(page);
    await revealVideo(page);
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  test('prefers-reduced-motion: controls stay visible and no errors', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = collectErrors(page);
    await loadAbout(page);
    await revealVideo(page);

    const opacity = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-barba-namespace="about"] .section_case-video .case-video_control-wrapper'
      );
      return el ? getComputedStyle(el).opacity : null;
    });
    if (opacity !== null) expect(parseFloat(opacity)).toBeGreaterThan(0.9);
    expect(errors.map((e) => e.message)).toEqual([]);
  });
});
