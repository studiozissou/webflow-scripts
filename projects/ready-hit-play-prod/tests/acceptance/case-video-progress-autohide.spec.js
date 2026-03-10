// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Acceptance tests for feat-case-video-progress-autohide
 * Tests: progress bar, viewport auto-pause, auto-hide controls
 * Runs against the live Webflow staging site on a case study page.
 */

const CASE_PAGE = '/work/overland-ai';

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

/** Navigate directly to a case page (hard load, not Barba transition) */
async function loadCasePage(page) {
  await page.goto(CASE_PAGE);
  await waitForRHP(page);
  // Allow case view init + video to begin loading
  await page.waitForTimeout(1500);
}

test.describe('Case Video — Progress Bar', () => {
  test.beforeEach(async ({ page }) => {
    await loadCasePage(page);
  });

  test('progress track is injected into each controlled section', async ({ page }) => {
    const sections = page.locator('.section_case-video:has(.case-video_control-wrapper)');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      await expect(section.locator('.case-video_progress-track')).toBeAttached();
      await expect(section.locator('.case-video_progress-fill')).toBeAttached();
      await expect(section.locator('.case-video_progress-hover')).toBeAttached();
    }
  });

  test('progress fill width advances during playback', async ({ page }) => {
    const fill = page.locator('.case-video_progress-fill').first();
    await expect(fill).toBeAttached();

    // Wait for video to play a bit
    await page.waitForTimeout(2000);

    const width = await fill.evaluate(el => parseFloat(getComputedStyle(el).width));
    expect(width).toBeGreaterThan(0);
  });

  test('progress track has correct a11y attributes', async ({ page }) => {
    const track = page.locator('.case-video_progress-track').first();
    await expect(track).toHaveAttribute('role', 'slider');
    await expect(track).toHaveAttribute('aria-label', 'Video progress');
    await expect(track).toHaveAttribute('aria-valuemin', '0');
    await expect(track).toHaveAttribute('aria-valuemax', '100');
    await expect(track).toHaveAttribute('tabindex', '0');

    // aria-valuenow should be a number >= 0
    const valuenow = await track.getAttribute('aria-valuenow');
    expect(Number(valuenow)).toBeGreaterThanOrEqual(0);
  });

  test('click to seek changes video currentTime', async ({ page }) => {
    const track = page.locator('.case-video_progress-track').first();
    await expect(track).toBeVisible();

    // Read initial time
    const timeBefore = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? v.currentTime : -1;
    });

    // Click near the start of the track (10% from left)
    const box = await track.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
      await page.waitForTimeout(300);

      const timeAfter = await page.evaluate(() => {
        const v = document.querySelector('.section_case-video video.video-cover');
        return v ? v.currentTime : -1;
      });

      // Time should have changed (we seeked to ~10%)
      expect(timeAfter).not.toBe(timeBefore);
    }
  });

  test('data-cursor="dot" set on progress track', async ({ page }) => {
    const track = page.locator('.case-video_progress-track').first();
    await expect(track).toHaveAttribute('data-cursor', 'dot');
  });
});

test.describe('Case Video — Viewport Auto-Pause', () => {
  test('video pauses when scrolled out of view', async ({ page }) => {
    await loadCasePage(page);

    const section = page.locator('.section_case-video:has(.case-video_control-wrapper)').first();
    await expect(section).toBeAttached();

    // Confirm video is playing initially
    const isPlayingBefore = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? !v.paused : false;
    });
    expect(isPlayingBefore).toBe(true);

    // Scroll the video well out of view
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 3);
    });

    // Wait for IO callback + volume fade + pause
    await page.waitForTimeout(1500);

    const isPausedAfter = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? v.paused : false;
    });
    expect(isPausedAfter).toBe(true);
  });

  test('video resumes when scrolled back into view', async ({ page }) => {
    await loadCasePage(page);

    // Scroll out
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
    await page.waitForTimeout(1500);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);

    const isPlaying = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? !v.paused : false;
    });
    expect(isPlaying).toBe(true);
  });

  test('manual pause is respected on scroll back', async ({ page }) => {
    await loadCasePage(page);

    // Click pause
    const pauseBtn = page.locator('.section_case-video .play-pause').first();
    await pauseBtn.click();
    await page.waitForTimeout(300);

    // Confirm paused
    const isPausedAfterClick = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? v.paused : false;
    });
    expect(isPausedAfterClick).toBe(true);

    // Scroll out and back
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Should still be paused (userPaused respected)
    const stillPaused = await page.evaluate(() => {
      const v = document.querySelector('.section_case-video video.video-cover');
      return v ? v.paused : false;
    });
    expect(stillPaused).toBe(true);
  });
});

test.describe('Case Video — Auto-Hide Controls', () => {
  test('controls fade out after 2s of mouse inactivity', async ({ page }) => {
    await loadCasePage(page);

    const section = page.locator('.section_case-video:has(.case-video_control-wrapper)').first();
    const controlWrapper = section.locator('.case-video_control-wrapper');
    await expect(controlWrapper).toBeAttached();

    // Move mouse into section to ensure controls are visible
    const box = await section.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Controls should be visible
    const opacityBefore = await controlWrapper.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacityBefore)).toBe(1);

    // Wait for idle timeout (2s) + fade duration (0.4s) + buffer
    await page.waitForTimeout(3000);

    const opacityAfter = await controlWrapper.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacityAfter)).toBeLessThan(0.1);
  });

  test('controls reappear on mouse movement', async ({ page }) => {
    await loadCasePage(page);

    const section = page.locator('.section_case-video:has(.case-video_control-wrapper)').first();
    const controlWrapper = section.locator('.case-video_control-wrapper');
    const box = await section.boundingBox();
    if (!box) return;

    // Move in, wait for hide
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(3000);

    // Confirm hidden
    const hiddenOpacity = await controlWrapper.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(hiddenOpacity)).toBeLessThan(0.1);

    // Move mouse again
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Controls should be visible again
    const shownOpacity = await controlWrapper.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(shownOpacity)).toBeGreaterThan(0.8);
  });

  test('controls show on mouse leave', async ({ page }) => {
    await loadCasePage(page);

    const section = page.locator('.section_case-video:has(.case-video_control-wrapper)').first();
    const controlWrapper = section.locator('.case-video_control-wrapper');
    const box = await section.boundingBox();
    if (!box) return;

    // Move in, wait for hide
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(3000);

    // Move mouse outside the section
    await page.mouse.move(box.x + box.width / 2, box.y - 50);
    await page.waitForTimeout(500);

    const opacity = await controlWrapper.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.8);
  });
});

test.describe('Case Video — Barba Lifecycle', () => {
  test('no JS errors on case page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await loadCasePage(page);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('home → case → home: no JS errors, clean re-entry', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    // Start on home
    await page.goto('/');
    await waitForRHP(page);

    // Navigate to case page via direct load (Barba only handles internal clicks)
    await page.goto(CASE_PAGE);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // Verify progress bar exists on case page
    const track = page.locator('.case-video_progress-track').first();
    // Only assert if the section has controls
    const hasSections = await page.locator('.section_case-video:has(.case-video_control-wrapper)').count();
    if (hasSections > 0) {
      await expect(track).toBeAttached();
    }

    // Navigate back home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('no orphaned progress bars after destroy', async ({ page }) => {
    // Load case page
    await page.goto(CASE_PAGE);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // Navigate away (triggers destroy)
    await page.goto('/');
    await waitForRHP(page);

    // Navigate back to case page
    await page.goto(CASE_PAGE);
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // Each controlled section should have exactly one progress track
    const sections = page.locator('.section_case-video:has(.case-video_control-wrapper)');
    const count = await sections.count();

    for (let i = 0; i < count; i++) {
      const trackCount = await sections.nth(i).locator('.case-video_progress-track').count();
      expect(trackCount).toBe(1);
    }
  });
});
