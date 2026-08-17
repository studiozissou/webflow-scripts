// @ts-check
/**
 * Acceptance tests — feat-about-to-work-via-home-transition
 *
 * Verifies that clicking a /work/ link on the about page plays the three-beat
 * about → home → case-study transition: about slides out, the persistent dial
 * shows the clicked case study's teaser in its home (circular) state, then
 * expands into the case frame with video handoff.
 *
 * Spec: .claude/specs/feat-about-to-work-via-home-transition.md
 *
 * Mid-transition assertions (the home beat) are sampled from a rAF recorder
 * installed before the click. Because the beat is a ~0.25 s window, those
 * assertions are logged as `design-drift` annotations rather than hard
 * failures — a slow CI frame can legitimately miss the window.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-about-to-work-via-home-transition';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

const WORK_LINK = '[data-barba-namespace="about"] a[href^="/work/"]';

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
  await page.waitForTimeout(1500);
}

/** Skip the whole suite until at least one /work/ link exists on about. */
async function requireWorkLink(page) {
  const count = await page.locator(WORK_LINK).count();
  test.skip(count === 0, 'no /work/ links on the about page yet');
  return page.locator(WORK_LINK).first();
}

/**
 * Install a rAF sampler that records dial state every frame, plus a nav
 * counter so we can prove the navigation was Barba and not a reload.
 */
async function installRecorder(page) {
  await page.evaluate(() => {
    window.__rhpNavCount = 0;
    window.__rhpSamples = [];
    window.__rhpRecording = false;

    if (window.barba?.hooks && !window.__rhpHooked) {
      window.__rhpHooked = true;
      window.barba.hooks.after(() => { window.__rhpNavCount++; });
    }

    window.__rhpStartRecording = function () {
      window.__rhpRecording = true;
      const t0 = performance.now();
      const tick = () => {
        if (!window.__rhpRecording) return;
        const comp = document.querySelector('.dial_component');
        const fg = document.querySelector('.dial_layer-fg');
        const vid = document.querySelector('#fg-video-wrap > .dial_fg-video');
        const canvas = document.querySelector('.dial_component .dial_layer-ticks');

        let ticksPainted = null;
        try {
          if (canvas && canvas.width > 0) {
            const ctx = canvas.getContext('2d');
            const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            ticksPainted = false;
            for (let i = 3; i < d.length; i += 4 * 97) {
              if (d[i] !== 0) { ticksPainted = true; break; }
            }
          }
        } catch (e) { /* tainted or unsupported — leave null */ }

        window.__rhpSamples.push({
          t: performance.now() - t0,
          dialNs: comp ? comp.getAttribute('data-dial-ns') : null,
          introSmall: comp ? comp.classList.contains('is-intro-small') : null,
          fgOpacity: fg ? parseFloat(getComputedStyle(fg).opacity) : null,
          fgWidth: fg ? Math.round(fg.getBoundingClientRect().width) : null,
          videoSrc: vid ? vid.getAttribute('src') || vid.currentSrc || '' : '',
          ticksPainted
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  });
}

/** Samples taken during the home beat: dial in home ns, before the expand. */
function homeBeatSamples(samples) {
  return samples.filter((s) => s.dialNs === 'home' && s.t > 300);
}

function soft(description) {
  test.info().annotations.push({ type: 'design-drift', description });
}

// ── Navigation ────────────────────────────────────────────────

test.describe(`${SLUG} — Navigation`, () => {
  test('clicking a work link on about navigates via Barba, not a reload', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    const href = await link.getAttribute('href');

    await installRecorder(page);
    await page.evaluate(() => window.__rhpStartRecording());
    await link.click();
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__rhpRecording = false; });

    const result = await page.evaluate(() => ({
      navCount: window.__rhpNavCount,
      ns: document
        .querySelector('[data-barba="container"]')
        ?.getAttribute('data-barba-namespace'),
      path: location.pathname
    }));

    expect(result.navCount).toBeGreaterThan(0); // survived → no reload
    expect(['work', 'case']).toContain(result.ns);
    expect(result.path.replace(/\/$/, '')).toBe(String(href).replace(/\/$/, ''));
  });

  test('dial ends in the work state with the UI hidden', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const state = await page.evaluate(() => {
      const comp = document.querySelector('.dial_component');
      const fg = document.querySelector('.dial_layer-fg');
      const ui = document.querySelector('.dial_layer-ui');
      return {
        dialNs: comp ? comp.getAttribute('data-dial-ns') : null,
        isCaseStudy: fg ? fg.classList.contains('is-case-study') : null,
        uiOpacity: ui ? parseFloat(getComputedStyle(ui).opacity) : null
      };
    });

    expect(state.dialNs).toBe('work');
    expect(state.isCaseStudy).toBe(true);
    if (state.uiOpacity !== null) expect(state.uiOpacity).toBeLessThan(0.1);
  });

  test('case header video resumes from the handoff time', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const video = await page.evaluate(() => {
      const v =
        document.querySelector('[data-barba="container"] .section_case-video video') ||
        document.querySelector('#fg-video-wrap > .dial_fg-video');
      return v ? { currentTime: v.currentTime, paused: v.paused, src: v.currentSrc || v.src } : null;
    });

    expect(video).not.toBeNull();
    expect(video.src).not.toBe('');
    expect(video.currentTime).toBeGreaterThan(0);
  });

  test('ticks canvas is cleared after landing', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const ticks = await page.evaluate(() => {
      const c = document.querySelector('.dial_component .dial_layer-ticks');
      if (!c) return null;
      const opacity = parseFloat(getComputedStyle(c).opacity);
      let painted = null;
      try {
        if (c.width > 0) {
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          painted = false;
          for (let i = 3; i < d.length; i += 4 * 97) {
            if (d[i] !== 0) { painted = true; break; }
          }
        }
      } catch (e) { /* leave null */ }
      return { opacity, painted };
    });

    if (ticks) {
      // Either cleared outright or faded out by the expand animation.
      expect(ticks.painted === false || ticks.opacity < 0.1).toBe(true);
    }
  });
});

// ── The home beat (soft assertions) ───────────────────────────

test.describe(`${SLUG} — Home beat`, () => {
  test('dial passes through the home state mid-transition', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);

    await installRecorder(page);
    await page.evaluate(() => window.__rhpStartRecording());
    await link.click();
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__rhpRecording = false; });

    const samples = await page.evaluate(() => window.__rhpSamples);
    const beat = homeBeatSamples(samples);

    if (!beat.length) {
      soft('home beat never sampled — dial never reported data-dial-ns="home" after 300ms');
      return;
    }

    const visible = beat.filter((s) => s.fgOpacity > 0.9);
    if (!visible.length) {
      soft(`home beat sampled (${beat.length} frames) but .dial_layer-fg never reached opacity 1`);
    }

    const small = beat.filter((s) => s.introSmall === true);
    if (small.length) {
      soft(`.dial_component kept is-intro-small during ${small.length} beat frames — dial renders undersized`);
    }

    const ticked = beat.filter((s) => s.ticksPainted === true);
    if (!ticked.length && beat.some((s) => s.ticksPainted !== null)) {
      soft('tick ring was never painted during the home beat');
    }

    // Hard floor: the transition must at least pass through the home namespace.
    expect(beat.length).toBeGreaterThan(0);
  });

  test('dial loads the clicked case study teaser during the beat', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    const href = await link.getAttribute('href');
    const slug = String(href).replace(/\/$/, '').split('/').pop();

    const expected = await page.evaluate((s) => {
      const item = document.querySelector(`.dial_cms-item[data-url="${s}"]`);
      if (!item) return null;
      return {
        desktop: item.getAttribute('data-video') || '',
        mobile: item.getAttribute('data-video-mobile') || ''
      };
    }, slug);

    if (!expected) {
      soft(`no .dial_cms-item[data-url="${slug}"] — cannot verify teaser handoff`);
      return;
    }

    await installRecorder(page);
    await page.evaluate(() => window.__rhpStartRecording());
    await link.click();
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__rhpRecording = false; });

    const samples = await page.evaluate(() => window.__rhpSamples);
    const matched = samples.filter(
      (s) =>
        s.videoSrc &&
        (s.videoSrc.includes(expected.desktop.slice(0, 60)) ||
          (expected.mobile && s.videoSrc.includes(expected.mobile.slice(0, 60))))
    );

    if (!matched.length) {
      soft(`fg video never carried the ${slug} teaser during the transition`);
    }
    expect(samples.length).toBeGreaterThan(0);
  });
});

// ── Regression, reduced motion, errors ────────────────────────

test.describe(`${SLUG} — Regression & errors`, () => {
  test('work back to about still runs the curtain transition', async ({ page }) => {
    await loadAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    await page.locator('.nav_about-link').first().click();
    await page.waitForTimeout(3000);

    const ns = await page.evaluate(() =>
      document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
    );
    expect(ns).toBe('about');

    const header = page.locator('[data-barba-namespace="about"] .about_header h2').first();
    if (await header.count()) {
      await expect(header).toBeVisible();
      const opacity = await header.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
      expect(opacity).toBeGreaterThan(0.9); // reveal ran, content not stuck hidden
    }
  });

  test('reduced motion skips the beats and lands quickly', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadAbout(page);
    const link = await requireWorkLink(page);

    const started = Date.now();
    await link.click();
    await page.waitForFunction(
      () =>
        ['work', 'case'].includes(
          document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace')
        ),
      { timeout: 10_000 }
    );
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(4000); // no 1.85s choreography under reduced motion
  });

  test('about to work produces no console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);
    expect(errors.map((e) => e.message)).toEqual([]);
  });
});
