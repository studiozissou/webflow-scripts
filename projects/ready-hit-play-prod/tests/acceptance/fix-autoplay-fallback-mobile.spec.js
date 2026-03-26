// @ts-check
/**
 * Acceptance tests — fix-autoplay-fallback-mobile
 *
 * Tests mobile autoplay fallback UI: tap-to-play on homepage,
 * persistent controls on case videos, SVG overlay on no-controls videos,
 * and viewport auto-pause/resume behaviour.
 *
 * Autoplay blocking is simulated via page.addInitScript that overrides
 * HTMLVideoElement.prototype.play to reject with NotAllowedError.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-autoplay-fallback-mobile';
const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

/** Wait for RHP scripts to finish initialising (window.RHP.scriptsOk). */
async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

/** Navigate to a page and wait for RHP init. */
async function loadPage(page, path = '/') {
  await page.goto(`${STAGING_URL}${path}`);
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
 * Override HTMLVideoElement.prototype.play to reject with NotAllowedError.
 * After the first real user click/pointerdown, play is allowed again
 * (mimics browser gesture-unlock behaviour).
 * Must be called BEFORE page.goto (via addInitScript).
 */
async function blockAutoplay(page) {
  await page.addInitScript(() => {
    const origPlay = HTMLVideoElement.prototype.play;
    let gestureUnlocked = false;

    document.addEventListener('click', () => { gestureUnlocked = true; }, { once: false });
    document.addEventListener('pointerdown', () => { gestureUnlocked = true; }, { once: false });

    HTMLVideoElement.prototype.play = function () {
      if (gestureUnlocked) {
        return origPlay.call(this);
      }
      const err = new DOMException('Autoplay blocked by test', 'NotAllowedError');
      return Promise.reject(err);
    };
  });
}

// ── Homepage tests (autoplay blocked) ─────────────────────────

test.describe(`${SLUG} — Homepage autoplay blocked`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('step text shows "Tap here to play" when autoplay blocked', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);
    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible();
    const text = await stepEl.textContent();
    expect(text?.toLowerCase()).toContain('tap');
  });

  test('ticks and nav still animate when autoplay blocked', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(4000);
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached();
    await expect(page.locator('.nav')).toBeVisible();
  });

  test('tap on dial starts video playback', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);

    await page.locator('.dial_layer-fg').click();
    await page.waitForTimeout(1000);

    const isPlaying = await page.evaluate(() => {
      const videos = document.querySelectorAll('.dial_component video');
      return Array.from(videos).some(v => !v.paused);
    });
    expect(isPlaying).toBe(true);
  });

  test('step text reverts to "Step into the circle" after tap', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);

    const stepEl = page.locator('[data-text="step"]');
    const textBefore = await stepEl.textContent();
    expect(textBefore?.toLowerCase()).toContain('tap');

    await page.locator('.dial_layer-fg').click();
    await page.waitForTimeout(1000);

    const textAfter = await stepEl.textContent();
    expect(textAfter?.toLowerCase()).not.toContain('tap');
  });
});

// ── Case page: videos WITH controls ───────────────────────────

test.describe(`${SLUG} — Case controls autoplay blocked`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('control UI visible when autoplay blocked', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/microsoft');
    await page.waitForTimeout(2000);

    const section = page.locator('.section_case-video').first();
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const controls = section.locator('.case-video_control-wrapper');
    if (await controls.count() > 0) {
      const opacity = await controls.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.5);
    }
  });

  test('play tap starts video and begins auto-hide timer', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/microsoft');
    await page.waitForTimeout(2000);

    const section = page.locator('.section_case-video').first();
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const playBtn = section.locator('.play-pause');
    if (await playBtn.count() > 0) {
      await playBtn.click();
      await page.waitForTimeout(500);

      const isPlaying = await section.locator('video').evaluate(v => !v.paused);
      expect(isPlaying).toBe(true);

      // Wait for auto-hide timer (3000ms + buffer)
      await page.waitForTimeout(4000);
      const controls = section.locator('.case-video_control-wrapper');
      const opacity = await controls.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeLessThan(0.5);
    }
  });
});

// ── Case page: videos WITHOUT controls ────────────────────────

test.describe(`${SLUG} — Case no-controls autoplay blocked`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('SVG play overlay present when autoplay blocked', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/overland-ai');
    await page.waitForTimeout(2000);

    const overlay = page.locator('.rhp-play-overlay');
    if (await overlay.count() > 0) {
      await overlay.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await expect(overlay.first()).toBeVisible();
    }
  });

  test('tap overlay starts video and removes overlay', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/overland-ai');
    await page.waitForTimeout(2000);

    const overlay = page.locator('.rhp-play-overlay').first();
    if (await overlay.count() > 0) {
      await overlay.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await overlay.click();
      await page.waitForTimeout(1000);

      await expect(overlay).not.toBeAttached();
    }
  });
});

// ── Viewport auto-pause/resume ────────────────────────────────

test.describe(`${SLUG} — Viewport auto-pause`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('video pauses when scrolled out of view', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/microsoft');
    await page.waitForTimeout(2000);

    const section = page.locator('.section_case-video').first();
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const playBtn = section.locator('.play-pause');
    if (await playBtn.count() > 0) {
      await playBtn.click();
      await page.waitForTimeout(500);

      // Scroll away
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const isPaused = await section.locator('video').evaluate(v => v.paused);
      expect(isPaused).toBe(true);
    }
  });

  test('video auto-resumes on scroll-back after gesture unlock', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/work/microsoft');
    await page.waitForTimeout(2000);

    const section = page.locator('.section_case-video').first();
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const playBtn = section.locator('.play-pause');
    if (await playBtn.count() > 0) {
      await playBtn.click();
      await page.waitForTimeout(500);

      // Scroll away
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      // Scroll back
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      const isPlaying = await section.locator('video').evaluate(v => !v.paused);
      expect(isPlaying).toBe(true);
    }
  });
});

// ── Console errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console errors`, () => {
  test('no JS errors on homepage with autoplay blocked', async ({ page }) => {
    const errors = collectErrors(page);
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);
    await page.locator('.dial_layer-fg').click();
    await page.waitForTimeout(1000);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on case page with autoplay blocked', async ({ page }) => {
    const errors = collectErrors(page);
    await blockAutoplay(page);
    await loadPage(page, '/work/microsoft');
    await page.waitForTimeout(2000);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Barba re-entry ────────────────────────────────────────────

test.describe(`${SLUG} — Barba re-entry`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no stale overlays or listeners after home→about→home', async ({ page }) => {
    const errors = collectErrors(page);
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);

    // Tap to unlock on home
    await page.locator('.dial_layer-fg').click();
    await page.waitForTimeout(1000);

    // Navigate to about
    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(2500);

    // Navigate back home
    await page.locator('.nav_logo-link').first().click();
    await page.waitForTimeout(2500);

    const overlays = await page.locator('.rhp-play-overlay').count();
    expect(overlays).toBe(0);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Desktop regression ────────────────────────────────────────

test.describe(`${SLUG} — Desktop regression`, () => {
  test('autoplay works normally, no fallback UI shown', async ({ page }) => {
    await loadPage(page, '/');
    await page.waitForTimeout(4000);

    const stepEl = page.locator('[data-text="step"]');
    if (await stepEl.isVisible()) {
      const text = await stepEl.textContent();
      expect(text?.toLowerCase()).not.toContain('tap');
    }

    const overlays = await page.locator('.rhp-play-overlay').count();
    expect(overlays).toBe(0);
  });
});

// ── Reduced motion ────────────────────────────────────────────

test.describe(`${SLUG} — Reduced motion`, () => {
  test.use({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  });

  test('fallback UI still functional with reduced motion', async ({ page }) => {
    await blockAutoplay(page);
    await loadPage(page, '/');
    await page.waitForTimeout(3000);

    const stepEl = page.locator('[data-text="step"]');
    await expect(stepEl).toBeVisible();

    await page.locator('.dial_layer-fg').click();
    await page.waitForTimeout(1000);

    const isPlaying = await page.evaluate(() => {
      const videos = document.querySelectorAll('.dial_component video');
      return Array.from(videos).some(v => !v.paused);
    });
    expect(isPlaying).toBe(true);
  });
});
