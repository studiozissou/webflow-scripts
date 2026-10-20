// TDD acceptance tests — pre-implementation.
// These FAIL against the current site until (a) the staging careers fix is
// published live, (b) the PZB hero asset is swapped, and (c) init.js corrects
// the width-only `sizes` hint on object-fit: cover images.
//
// Feature (spec: projects/the-signalling-company/.claude/specs/tsc-cover-image-srcset.md):
//   Webflow writes `sizes` from the element's width on the Designer canvas. An
//   `object-fit: cover` image in a box taller than the photo's aspect is scaled
//   by height, which `sizes` cannot express, so the browser picks a candidate
//   that is far too small on retina screens (careers: 1080px chosen, 1260px
//   needed). The fix recomputes `sizes` from the rendered box.
//
// DOM hooks (verified live 2026-10-19):
//   Cover images:   img.image_cover  (CSS: object-fit: cover; width/height 100%)
//   Careers hero:   img.image_cover.is-careers inside .image-wrap_testimonial (70vh)
//   PZB hero:       img.product-image.is-full-width on /products/pzb

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';
const PAGES = ['/', '/products', '/news', '/contact', '/careers'];
const TOLERANCE = 0.9;

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

async function loadPage(page, path) {
  await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

// For every cover image: the pixel width of the candidate the browser chose,
// the largest candidate on offer, and the device pixels the box needs when
// the photo is cover-fitted into it.
async function coverImageReport(page) {
  return page.evaluate(async () => {
    const dpr = window.devicePixelRatio;
    const imgs = [...document.querySelectorAll('img.image_cover')];
    return Promise.all(
      imgs.map(async (img) => {
        const box = img.getBoundingClientRect();
        const candidates = (img.getAttribute('srcset') || '')
          .split(',')
          .map((c) => c.trim().split(/\s+/))
          .filter(([url, w]) => url && /w$/.test(w || ''))
          .map(([url, w]) => ({ url, w: parseInt(w, 10) }));
        const chosen = candidates.find((c) => c.url === img.currentSrc);
        let chosenW = chosen ? chosen.w : 0;
        if (!chosenW) {
          chosenW = await new Promise((resolve) => {
            const probe = new Image();
            probe.onload = () => resolve(probe.naturalWidth);
            probe.onerror = () => resolve(0);
            probe.src = img.currentSrc;
          });
        }
        const aspect = img.naturalWidth / img.naturalHeight || 1.5;
        const neededCss = Math.max(box.width, box.height * aspect);
        return {
          cls: img.className,
          src: img.currentSrc.split('/').pop(),
          chosenW,
          maxW: Math.max(chosenW, ...candidates.map((c) => c.w)),
          neededPx: Math.ceil(neededCss * dpr),
          visible: box.width > 0 && box.height > 0,
        };
      }),
    );
  });
}

test.describe('tsc-cover-image-srcset — careers hero', () => {
  test('careers hero candidate covers the box height at DPR 2', async ({ page }) => {
    await loadPage(page, '/careers');
    const report = await coverImageReport(page);
    const hero = report.find((r) => /is-careers/.test(r.cls));
    expect(hero, 'careers hero image present').toBeTruthy();
    expect(hero.chosenW, `chose ${hero.src}`).toBeGreaterThanOrEqual(hero.neededPx * TOLERANCE);
  });
});

test.describe('tsc-cover-image-srcset — site-wide', () => {
  for (const path of PAGES) {
    test(`cover images on ${path} are not upscaled beyond 10 percent`, async ({ page }) => {
      await loadPage(page, path);
      const report = (await coverImageReport(page)).filter((r) => r.visible);
      const failures = report.filter(
        (r) => r.chosenW < r.neededPx * TOLERANCE && r.chosenW < r.maxW,
      );
      expect(failures, JSON.stringify(failures, null, 1)).toEqual([]);
    });

    test(`no console errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));
      await loadPage(page, path);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('tsc-cover-image-srcset — PZB hero asset', () => {
  test('pzb hero source is at least 2000px wide', async ({ page }) => {
    await loadPage(page, '/products/pzb');
    const sourceWidth = await page.evaluate(async () => {
      const img = document.querySelector('img.product-image.is-full-width');
      if (!img) return 0;
      const original = img.getAttribute('src');
      return new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(probe.naturalWidth);
        probe.onerror = () => resolve(0);
        probe.src = original;
      });
    });
    expect(sourceWidth).toBeGreaterThanOrEqual(2000);
  });
});
