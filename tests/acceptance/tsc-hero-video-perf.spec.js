// TDD acceptance tests — pre-implementation.
// These tests assert future behaviour that is NOT yet built (see spec below).
// They are expected to FAIL until init.js T1–T3 land (setupBackgroundVideos(),
// progressive low/high hero swap, shortened revealHeroFailsafe()).
//
// Spec: projects/the-signalling-company/.claude/specs/tsc-hero-video-perf-2026-07-13.md
// (see §9 Tier 1, §10 Verify Loop, §11 Acceptance Tests index)
//
// DEPENDENCY (verified live 2026-07-13): the off-breakpoint / CTA-defer network
// assertions (tests 1-3, 6) require the HEAD source-strip snippet
// (projects/the-signalling-company/head-video-strip.html) to be live in the
// Webflow site-wide <head> — it strips <source src> during parse, before the
// browser fetches. init.js loads in the footer and hydrates, but cannot prevent
// the parse-time fetch on its own. So these tests go green only once BOTH init.js
// (deployed to CDN) AND the head snippet (published in Webflow) are live.

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

// DOM hooks (verified live, per spec §3/§55):
//   Hero wrapper: .video_about-b-video  (variants toggled via .is-desktop / .is-mobile display)
//   CTA wrapper:  .video_cta            (deferred, below fold)
// URL patterns (verified live, per spec §1 table):
//   Hero desktop: *02-desktop-1280x720*.mp4   Hero mobile: *02-mobile-640x360*.mp4
//   CTA desktop:  *08-desktop-1280x720*.mp4   CTA mobile:  *08-mobile-640x360*.mp4

// These match the VIDEO files only, not the poster image. Webflow names both
// from the same stem — video: `…_02-desktop-1280x720_mp4.mp4`, poster:
// `…_02-desktop-1280x720_poster.0000000.jpg` — so we require an .mp4/.webm
// extension. The poster loads eagerly (frame-0, desired); without the
// extension guard the poster falsely trips the "video requested" assertions.
const VIDEO_EXT = String.raw`[^"']*\.(?:mp4|webm)`;
const HERO_MOBILE_RE = new RegExp(`02-mobile-640x360${VIDEO_EXT}`);
const HERO_DESKTOP_RE = new RegExp(`02-desktop-1280x720${VIDEO_EXT}`);
const CTA_MOBILE_RE = new RegExp(`08-mobile-640x360${VIDEO_EXT}`);
const CTA_DESKTOP_RE = new RegExp(`08-desktop-1280x720${VIDEO_EXT}`);
const ANY_HERO_RE = new RegExp(`02-(?:desktop-1280x720|mobile-640x360)${VIDEO_EXT}`);

/** Reads the currently-visible hero <video> (inside .is-desktop or .is-mobile,
 *  whichever the CSS breakpoint has switched to `display` != none) and returns
 *  its playback state. Returns null if the wrapper or a visible video isn't found. */
function readHeroVideoState() {
  const wrapper = document.querySelector('.video_about-b-video');
  if (!wrapper) return null;
  const videos = Array.from(wrapper.querySelectorAll('video'));
  const visible = videos.find((v) => v.offsetParent !== null);
  if (!visible) return null;
  const sourceSrc = visible.querySelector('source')?.getAttribute('src') || '';
  return {
    src: visible.currentSrc || visible.getAttribute('src') || sourceSrc || '',
    readyState: visible.readyState,
    paused: visible.paused,
  };
}

test.describe('TSC Hero Video Perf — 13 Jul 2026 (pre-implementation TDD)', () => {

  // ── 1. Desktop: mobile hero variant is not requested ──────────────
  test.describe('desktop: mobile hero variant is not requested', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('desktop: mobile hero variant is not requested', async ({ page }) => {
      test.setTimeout(45000);
      const requests = [];
      page.on('request', (r) => requests.push(r.url()));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const mobileHeroRequested = requests.some((url) => HERO_MOBILE_RE.test(url));
      expect(mobileHeroRequested).toBe(false);
    });
  });

  // ── 2. Mobile: desktop hero + CTA variants are not requested ──────
  test.describe('mobile: desktop hero + CTA variants are not requested', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('mobile: desktop hero + CTA variants are not requested', async ({ page }) => {
      test.setTimeout(45000);
      const requests = [];
      page.on('request', (r) => requests.push(r.url()));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const desktopHeroRequested = requests.some((url) => HERO_DESKTOP_RE.test(url));
      const desktopCtaRequested = requests.some((url) => CTA_DESKTOP_RE.test(url));
      expect(desktopHeroRequested).toBe(false);
      expect(desktopCtaRequested).toBe(false);
    });
  });

  // ── 3. Mobile: CTA video deferred until scrolled into view ────────
  test.describe('mobile: CTA video deferred until scrolled into view', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('mobile: CTA video deferred until scrolled into view', async ({ page }) => {
      test.setTimeout(45000);
      const requests = [];
      page.on('request', (r) => requests.push(r.url()));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1000);

      const ctaRequestedBeforeScroll = requests.some((url) => CTA_MOBILE_RE.test(url));
      expect(ctaRequestedBeforeScroll).toBe(false);

      // `.video_cta` matches BOTH breakpoint wrappers (.is-desktop is
      // display:none on mobile). Scroll to the visible (mobile) variant — the
      // only one that hydrates. (Original selector matched 2 elements and
      // scrolled to a hidden node → timeout.)
      const ctaWrapper = page.locator('.video_cta.is-mobile');
      await ctaWrapper.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      const ctaRequestedAfterScroll = requests.some((url) => CTA_MOBILE_RE.test(url));
      expect(ctaRequestedAfterScroll).toBe(true);
    });
  });

  // ── 4. Hero video hydrates and plays (active variant only) ────────
  test.describe('hero video hydrates and plays (active variant only)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('hero video hydrates and plays (active variant only)', async ({ page }) => {
      test.setTimeout(30000);
      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });

      await expect.poll(
        async () => {
          const state = await page.evaluate(readHeroVideoState);
          if (!state) return false;
          return state.src.length > 0 && state.readyState > 0 && state.paused === false;
        },
        { timeout: 3000, message: 'hero video did not hydrate a src and start playing within 3s' }
      ).toBe(true);
    });
  });

  // ── 5. Hero progressive swap: low requested first, high after load ─
  test.describe('hero progressive swap: low requested first, high after load', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('hero progressive swap: low requested first, high after load', async ({ page }) => {
      test.setTimeout(30000);
      const requests = [];
      page.on('request', (r) => requests.push(r.url()));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3000); // allow window.load / requestIdleCallback swap window

      const lowSrcAttr = await page.evaluate(() => {
        const wrapper = document.querySelector('.video_about-b-video');
        return wrapper ? wrapper.getAttribute('data-video-lowsrc') : null;
      });

      test.skip(
        !lowSrcAttr,
        'No data-video-lowsrc attribute on hero wrapper — low-res asset not yet wired (spec §12 handoff, client asset pending)'
      );

      const lowFragment = lowSrcAttr.split('/').pop().split('?')[0];
      const lowIndex = requests.findIndex((url) => url.includes(lowFragment));
      const highIndex = requests.findIndex((url) => ANY_HERO_RE.test(url) && !url.includes(lowFragment));

      expect(lowIndex, 'expected the low-res hero source to be requested').toBeGreaterThan(-1);
      expect(highIndex, 'expected the high-res hero source to be requested after load').toBeGreaterThan(-1);
      expect(lowIndex).toBeLessThan(highIndex);

      const finalSrc = await page.evaluate(readHeroVideoState);
      expect(finalSrc?.src).toMatch(ANY_HERO_RE);
      expect(finalSrc?.src).not.toContain(lowFragment);
    });
  });

  // ── 6. prefers-reduced-motion: no hero video hydrated (poster only) ─
  test.describe('prefers-reduced-motion: no hero video hydrated (poster only)', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

    test('prefers-reduced-motion: no hero video hydrated (poster only)', async ({ page }) => {
      test.setTimeout(30000);
      // The `reducedMotion` context option (test.use) proved unreliable here —
      // the page read no-preference — so force it explicitly and guard that it
      // actually applied, otherwise this test silently runs under normal motion.
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const requests = [];
      page.on('request', (r) => requests.push(r.url()));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const rmApplied = await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches
      );
      expect(rmApplied, 'reduced-motion emulation must be active for this assertion to be meaningful').toBe(true);

      const heroVideoRequested = requests.some((url) => ANY_HERO_RE.test(url));
      expect(heroVideoRequested).toBe(false);

      const heroSrc = await page.evaluate(() => {
        const wrapper = document.querySelector('.video_about-b-video');
        if (!wrapper) return '';
        const videos = Array.from(wrapper.querySelectorAll('video'));
        return videos
          .map((v) => v.currentSrc || v.getAttribute('src') || v.querySelector('source')?.getAttribute('src') || '')
          .join('');
      });
      expect(heroSrc).toBe('');
    });
  });

  // ── 7. Homepage: no console errors (desktop + mobile) ─────────────
  test.describe('homepage: no console errors (desktop + mobile)', () => {
    test('no console errors (desktop)', async ({ page }) => {
      test.setTimeout(30000);
      await page.setViewportSize({ width: 1440, height: 900 });

      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const filtered = errors.filter((e) => !e.includes('favicon') && !e.includes('consentpro'));
      expect(filtered).toHaveLength(0);
    });

    test('no console errors (mobile)', async ({ page }) => {
      test.setTimeout(30000);
      await page.setViewportSize({ width: 390, height: 844 });

      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`${STAGING_URL}/`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const filtered = errors.filter((e) => !e.includes('favicon') && !e.includes('consentpro'));
      expect(filtered).toHaveLength(0);
    });
  });
});
