// @ts-check
/**
 * Acceptance tests for fix-home-restore-closed-project
 *
 * Reported 2026-08-13: going home → about → work → home landed on the homepage
 * showing the generic headline over the FIRST project's video, instead of the
 * project the user had just closed out of. The bg canvas (which mirrors the fg
 * video) was generic for the same reason.
 *
 * Three defects stacked on the same path, all in the "returning from a case
 * study" restore that only runs when the dial was DESTROYED rather than
 * suspended — i.e. exactly when home → about destroyed it:
 *
 *  1. orchestrator.js nulled RHP.videoState.caseHandoff on the line *before*
 *     calling RHP.views.home.init(), so work-dial's "restore handoff index and
 *     playback position" block was unreachable dead code.
 *  2. init() called applyActive(0) before the restore. That write is not just a
 *     wasted load: it leaves videoEl.src === project0 while currentSrc still
 *     reports the case video's URL, so the follow-up applyActive(handoffIndex)
 *     trips setVideoSourceAndPoster's dedupe guard (currentSrc === target) and
 *     skips the swap — stranding project 0's video under the right title.
 *  3. Neither setDialState(ACTIVE) nor an *initial* applyActive() writes the
 *     step headline (only the IDLE branch scrambles it), so both case-return
 *     paths kept the generic copy.
 *
 * These tests serve the local orchestrator.js + work-dial.js in place of the
 * CDN copies, so they fail against an unfixed build.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.test' });

const ROOT = path.resolve(__dirname, '../..');

async function useLocalScripts(page) {
  for (const file of ['orchestrator.js', 'work-dial.js']) {
    await page.route(`**/${file}*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: fs.readFileSync(path.join(ROOT, file), 'utf8'),
      })
    );
  }
}

async function dismissConsent(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[fs-consent-element="root"]').forEach((el) => el.remove());
  });
}

async function loadHome(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 30_000 });
  await dismissConsent(page);
  await page.waitForTimeout(7000); // let the intro settle
}

/** Barba pushState navigation — there is no `load` event to wait on. */
async function goSpa(page, url) {
  await page.evaluate((u) => window.barba.go(u), url);
  await page.waitForFunction((u) => location.pathname.startsWith(u), url, { timeout: 30_000 });
  await page.waitForTimeout(4000);
}

/** Read what the dial is actually showing. */
function readDial(page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.dial_cms-item'));
    const fg = document.querySelector('.dial_fg-video');
    const generic = document.querySelector('.dial_generic-video');
    const bg = document.querySelector('.dial_bg-canvas');
    const fgSrc = fg ? fg.currentSrc || fg.src || '' : '';
    return {
      activeIndex: window.RHP?.workDial?.getActiveIndex?.(),
      // Which project's video is actually loaded in the visible fg element
      fgProject: items.findIndex((it) => {
        const u = it.getAttribute('data-video') || '';
        return u && fgSrc && u.slice(-60) === fgSrc.slice(-60);
      }),
      genericOpacity: generic ? getComputedStyle(generic).opacity : null,
      bgOpacity: bg ? getComputedStyle(bg).opacity : null,
      stepText: document.querySelector('[data-text="step"]')?.textContent.trim(),
      titles: items.map((it) => it.getAttribute('data-title')),
      slugs: items.map((it) => {
        const a = it.querySelector('a[href]');
        const h = a ? new URL(a.href).pathname : it.getAttribute('data-url');
        return h && h.startsWith('/') ? h : '/work/' + h;
      }),
    };
  });
}

test.describe('home restores the just-closed project', () => {
  test('home > about > work > home shows that project, not the first one', async ({ page }) => {
    await useLocalScripts(page);
    await loadHome(page);

    const { slugs, titles } = await readDial(page);
    const idx = 2; // deliberately not 0 — index 0 is the buggy fallback
    expect(slugs[idx], 'dial should expose a case URL').toBeTruthy();

    await goSpa(page, '/about');
    await goSpa(page, slugs[idx]);
    await goSpa(page, '/');

    const dial = await readDial(page);
    expect(dial.activeIndex, 'dial should be on the just-closed sector').toBe(idx);
    expect(dial.fgProject, 'fg video must be that project, not project 0').toBe(idx);
    expect(dial.stepText, 'headline must be the project, not the generic copy').toBe(titles[idx]);
    // bg canvas mirrors the fg video, so a visible bg + correct fg == correct bg
    expect(dial.genericOpacity, 'generic reel must not cover the project video').toBe('0');
    expect(dial.bgOpacity, 'bg canvas should be visible behind the dial').toBe('1');
  });

  test('home > work > home (suspend/resume path) keeps the project headline', async ({ page }) => {
    await useLocalScripts(page);
    await loadHome(page);

    const { slugs, titles } = await readDial(page);
    await goSpa(page, slugs[0]);
    await goSpa(page, '/');

    const dial = await readDial(page);
    expect(dial.activeIndex).toBe(0);
    expect(dial.fgProject, 'fg video should be the project just closed').toBe(0);
    expect(dial.stepText, 'resume path must not leave the generic headline').toBe(titles[0]);
    expect(dial.genericOpacity).toBe('0');
  });

  test('a fresh home load still shows the generic reel and copy', async ({ page }) => {
    await useLocalScripts(page);
    await loadHome(page);

    const dial = await readDial(page);
    expect(dial.genericOpacity, 'IDLE home should show the generic reel').toBe('1');
    expect(
      dial.titles.includes(dial.stepText),
      `fresh home should keep the generic headline, got "${dial.stepText}"`
    ).toBe(false);
  });

  test('home > about > home (no case study) stays generic', async ({ page }) => {
    await useLocalScripts(page);
    await loadHome(page);

    await goSpa(page, '/about');
    await goSpa(page, '/');

    const dial = await readDial(page);
    expect(dial.genericOpacity, 'no case was visited — reel should still be generic').toBe('1');
    expect(
      dial.titles.includes(dial.stepText),
      `should keep the generic headline, got "${dial.stepText}"`
    ).toBe(false);
  });
});
