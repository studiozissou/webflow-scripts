// @ts-check
/**
 * Acceptance tests — rhp-wwcf-sticky-carousel
 *
 * Verifies:
 *  1. The "Where We Come From" photo carousel is sticky on desktop — it starts
 *     top-aligned with the copy, pins below the stacked accordion titles, then
 *     releases at the bottom of the copy and travels up with it.
 *  2. Each [data-slider] is sized to its OWN tallest slide rather than sharing a
 *     single section-wide height.
 *  3. Both behaviours survive a Barba transition and a viewport resize.
 *
 * The about page scrolls inside [data-barba="container"] (position:fixed;
 * overflow:auto), NOT the window — so tests drive scrollTop on that element.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-wwcf-sticky-carousel';
const PAGE_PATH = '/about';

// The WWCF accordion is the second one; its title carries .is-2
const WWCF_CONTENT = '.accordion-title.is-2 + .accordion-content';
const WWCF_COPY = `${WWCF_CONTENT} .accordion-column:first-child`;
const WWCF_PHOTO = `${WWCF_CONTENT} .accordion-column:last-child`;

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // Swiper lazy-load + measure settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Scroll the Barba container (the real scrollport on /about). */
async function scrollTo(page, y) {
  await page.evaluate((top) => {
    const sc = document.querySelector('[data-barba="container"]');
    if (sc) sc.scrollTop = top;
  }, y);
  await page.waitForTimeout(250);
}

/** Document-space top of the WWCF block. */
async function wwcfTop(page, copySel = WWCF_COPY) {
  return page.evaluate((sel) => {
    const sc = document.querySelector('[data-barba="container"]');
    const el = document.querySelector(sel);
    if (!sc || !el) return 0;
    return el.getBoundingClientRect().top + sc.scrollTop;
  }, copySel);
}

/** Viewport rects for the copy and photo columns. */
async function rects(page) {
  return page.evaluate(([copySel, photoSel]) => {
    const c = document.querySelector(copySel)?.getBoundingClientRect();
    const p = document.querySelector(photoSel)?.getBoundingClientRect();
    if (!c || !p) return null;
    return {
      copyTop: c.top, copyBottom: c.bottom,
      photoTop: p.top, photoBottom: p.bottom
    };
  }, [WWCF_COPY, WWCF_PHOTO]);
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Sticky is actually applied and unblocked */
test.describe(`${SLUG} — Sticky CSS`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('photo column is position:sticky on desktop', async ({ page }) => {
    await loadPage(page);
    const pos = await page.evaluate(
      (sel) => getComputedStyle(document.querySelector(sel)).position, WWCF_PHOTO
    );
    expect(pos).toBe('sticky');
  });

  test('accordion-content overflow is visible so sticky is not inert', async ({ page }) => {
    await loadPage(page);
    // An ancestor with overflow != visible becomes the scrollport and kills sticky.
    const overflow = await page.evaluate(
      (sel) => getComputedStyle(document.querySelector(sel)).overflowY, WWCF_CONTENT
    );
    expect(overflow).toBe('visible');
  });

  test('sticky offset equals accordion title height x 2', async ({ page }) => {
    await loadPage(page);
    const { top, titleH } = await page.evaluate((sel) => ({
      top: parseFloat(getComputedStyle(document.querySelector(sel)).top),
      titleH: document.querySelector('.accordion-title').getBoundingClientRect().height
    }), WWCF_PHOTO);
    expect(top).toBeGreaterThan(0);
    expect(Math.abs(top - titleH * 2)).toBeLessThan(2);
  });
});

/* 2. The three behaviours the client asked for */
test.describe(`${SLUG} — Scroll Behaviour`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
  });

  test('starts top-aligned with the copy', async ({ page }) => {
    const top = await wwcfTop(page);
    await scrollTo(page, top - 200);
    const r = await rects(page);
    expect(r).not.toBeNull();
    expect(Math.abs(r.photoTop - r.copyTop)).toBeLessThan(2);
  });

  test('pins below the stacked titles while the copy scrolls past', async ({ page }) => {
    const top = await wwcfTop(page);
    // Derive a scroll offset that is genuinely inside the pin, rather than a
    // fixed number. Measured from the WWCF block top, the element is pinned for
    // d in [-stickyTop, travel - stickyTop]; this test also wants the copy
    // scrolled above the fold (d > 0), so aim at the middle of [0, travel - stickyTop].
    const { travel, stickyTop } = await page.evaluate(([copySel, photoSel]) => {
      const c = document.querySelector(copySel).getBoundingClientRect().height;
      const p = document.querySelector(photoSel);
      return {
        travel: c - p.getBoundingClientRect().height,
        stickyTop: parseFloat(getComputedStyle(p).top)
      };
    }, [WWCF_COPY, WWCF_PHOTO]);

    const pinnedRange = travel - stickyTop;
    expect(pinnedRange).toBeGreaterThan(20);
    await scrollTo(page, top + Math.round(pinnedRange / 2));

    const r = await page.evaluate(([copySel, photoSel]) => {
      const c = document.querySelector(copySel).getBoundingClientRect();
      const p = document.querySelector(photoSel);
      return { copyTop: c.top, photoTop: p.getBoundingClientRect().top };
    }, [WWCF_COPY, WWCF_PHOTO]);

    // Copy has scrolled above the fold; photo is held at its sticky offset.
    expect(r.copyTop).toBeLessThan(0);
    expect(Math.abs(r.photoTop - stickyTop)).toBeLessThan(2);
  });

  test('releases at the bottom of the copy and travels up with it', async ({ page }) => {
    const top = await wwcfTop(page);
    await scrollTo(page, top + 700);
    const r = await rects(page);
    // Once released the photo's bottom is locked to the copy's bottom.
    expect(Math.abs(r.photoBottom - r.copyBottom)).toBeLessThan(2);
  });

  test('photo never escapes its copy block', async ({ page }) => {
    const top = await wwcfTop(page);
    for (const d of [-200, 0, 200, 400, 600, 800]) {
      await scrollTo(page, top + d);
      const r = await rects(page);
      expect(r.photoTop).toBeGreaterThanOrEqual(r.copyTop - 2);
      expect(r.photoBottom).toBeLessThanOrEqual(r.copyBottom + 2);
    }
  });
});

/* 3. Per-slider independent sizing */
test.describe(`${SLUG} — Per-Slider Height`, () => {
  test('sliders are sized independently, not to one shared height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const heights = await page.evaluate(() =>
      [...document.querySelectorAll('.section_about-hero [data-slider]')]
        .map(s => Math.round(s.getBoundingClientRect().height))
    );

    expect(heights.length).toBeGreaterThan(1);
    // WWCF has captioned slides so it is taller than the single-slide first
    // section — if they are identical the shared-height bug has returned.
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  test('captioned and uncaptioned slides render the same image height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 }); // short: height cap binds
    await loadPage(page);

    const heights = await page.evaluate(() => {
      const slider = document.querySelector('.accordion-title.is-2 + .accordion-content [data-slider]');
      return [...slider.querySelectorAll('.swiper-slide')]
        .map(s => s.querySelector('img'))
        .filter(Boolean)
        .map(img => Math.round(img.getBoundingClientRect().height));
    });

    expect(heights.length).toBeGreaterThan(1);
    // Without a reserved caption allowance, uncaptioned slides came out a full
    // caption height (~32px) taller than captioned ones.
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  });

  test('caption has breathing room inside the slide box, not just on the column', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const gap = await page.evaluate(() => {
      const slider = document.querySelector('.accordion-title.is-2 + .accordion-content [data-slider]');
      const cap = [...slider.querySelectorAll('.spacer-medium')][0];
      if (!cap) return null;
      return Math.round(slider.getBoundingClientRect().bottom - cap.getBoundingClientRect().bottom);
    });

    // The column is the sticky element, so padding on it only reads as spacing
    // once the sticky releases. The gap must live inside the slide box to
    // survive every scroll position. It was 0 before this fix.
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThan(30);
  });

  test('caption matches the image width when the image is height-capped', async ({ page }) => {
    // Short viewport: the slide box height binds, so `width: auto` shrinks the
    // image inside the column. The caption used to keep the full column width
    // and overhang the image by ~186px.
    await page.setViewportSize({ width: 1440, height: 650 });
    await loadPage(page);

    const rows = await page.evaluate(() => {
      const slider = document.querySelector('.accordion-title.is-2 + .accordion-content [data-slider]');
      return [...slider.querySelectorAll('.swiper-slide')].map((s) => {
        const img = s.querySelector('img');
        const cap = s.querySelector('.spacer-medium');
        if (!img || !cap) return null;
        const r = img.getBoundingClientRect(), c = cap.getBoundingClientRect();
        return { overhang: Math.round(c.width - r.width), leftDelta: Math.round(c.left - r.left) };
      }).filter(Boolean);
    });

    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(({ overhang, leftDelta }) => {
      expect(Math.abs(overhang)).toBeLessThanOrEqual(2);
      expect(Math.abs(leftDelta)).toBeLessThanOrEqual(2);
    });
  });

  test('every slide places its image at the same vertical offset', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await loadPage(page);

    const offsets = await page.evaluate(() => {
      const slider = document.querySelector('.accordion-title.is-2 + .accordion-content [data-slider]');
      return [...slider.querySelectorAll('.swiper-slide')].map((s) => {
        const img = s.querySelector('img');
        const box = s.querySelector('.slide-caption');
        if (!img || !box) return null;
        return Math.round(img.getBoundingClientRect().top - box.getBoundingClientRect().top);
      }).filter(v => v !== null);
    });

    expect(offsets.length).toBeGreaterThan(1);
    // Centring used to drop uncaptioned slides ~16px lower than captioned ones,
    // so the image jumped position on every crossfade.
    expect(Math.max(...offsets) - Math.min(...offsets)).toBeLessThanOrEqual(2);
  });

  test('no slider is left with dead space from the max-width proxy', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const slack = await page.evaluate(() =>
      [...document.querySelectorAll('.section_about-hero [data-slider]')].map((s) => {
        const h = s.getBoundingClientRect().height;
        const img = s.querySelector('.swiper-slide img');
        const cap = s.querySelector('.swiper-slide .spacer-medium');
        const content = (img ? img.getBoundingClientRect().height : 0)
          + (cap ? cap.getBoundingClientRect().height : 0);
        return h - content;
      })
    );
    // Previously the first slider carried ~160px of unused vertical space.
    slack.forEach(s => expect(s).toBeLessThan(80));
  });
});

/* 4. Mobile: sticky must not apply */
test.describe(`${SLUG} — Mobile`, () => {
  test('photo column is not sticky below 992px', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 });
    await loadPage(page);

    const pos = await page.evaluate(
      (sel) => getComputedStyle(document.querySelector(sel)).position, WWCF_PHOTO
    );
    expect(pos).toBe('static');
  });

  test('columns stack and no stale desktop height leaks in', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 });
    await loadPage(page);

    const res = await page.evaluate(() => {
      const cw = document.querySelector('.accordion-title.is-2 + .accordion-content .accordion-column-wrapper');
      const stale = [...document.querySelectorAll('.section_about-hero [data-slider]')]
        .some(s => s.style.getPropertyValue('--slide-max-height') !== '');
      return { dir: getComputedStyle(cw).flexDirection, stale };
    });
    expect(res.dir).toBe('column');
    expect(res.stale).toBe(false);
  });
});

/* 5. Resize recalculation */
test.describe(`${SLUG} — Resize`, () => {
  test('slider heights recalculate when the viewport changes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const before = await page.evaluate(() =>
      document.querySelector('.section_about-hero [data-slider]')
        .style.getPropertyValue('--slide-max-height')
    );

    // Shrink height so the viewport cap binds instead of the content cap.
    await page.setViewportSize({ width: 1440, height: 620 });
    await page.waitForTimeout(600); // rAF debounce + re-measure

    const after = await page.evaluate(() =>
      document.querySelector('.section_about-hero [data-slider]')
        .style.getPropertyValue('--slide-max-height')
    );

    expect(before).not.toBe('');
    expect(after).not.toBe('');
    expect(after).not.toBe(before);
  });

  test('desktop → mobile resize clears the JS-set heights', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    await page.setViewportSize({ width: 430, height: 900 });
    await page.waitForTimeout(600);

    const stale = await page.evaluate(() =>
      [...document.querySelectorAll('.section_about-hero [data-slider]')]
        .some(s => s.style.getPropertyValue('--slide-max-height') !== '')
    );
    expect(stale).toBe(false);
  });
});

/* 6. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('sticky and per-slider sizing survive home → about → home → about', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loadPage(page);
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);
    await loadPage(page);

    const res = await page.evaluate((sel) => {
      const photo = document.querySelector(sel);
      const sliders = [...document.querySelectorAll('.section_about-hero [data-slider]')];
      return {
        position: photo ? getComputedStyle(photo).position : null,
        stickyTop: photo ? parseFloat(getComputedStyle(photo).top) : 0,
        titleVar: getComputedStyle(document.querySelector('.section_about-hero'))
          .getPropertyValue('--accordion-title-height').trim(),
        allSized: sliders.length > 0
          && sliders.every(s => s.style.getPropertyValue('--slide-max-height') !== ''),
        distinct: new Set(sliders.map(s => Math.round(s.getBoundingClientRect().height))).size
      };
    }, WWCF_PHOTO);

    expect(res.position).toBe('sticky');
    expect(res.stickyTop).toBeGreaterThan(0);
    expect(res.titleVar).not.toBe('');   // re-measured after Barba insert
    expect(res.allSized).toBe(true);
    expect(res.distinct).toBeGreaterThan(1);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('still pins correctly after a Barba re-entry', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);
    await loadPage(page);

    const top = await wwcfTop(page);
    await scrollTo(page, top + 150);
    const r = await rects(page);
    expect(r.copyTop).toBeLessThan(0);
    expect(r.photoTop).toBeGreaterThan(0); // held, not scrolled away
  });
});

/* 7. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page load', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('no JS errors when resizing across the 992px breakpoint', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    await page.setViewportSize({ width: 430, height: 900 });
    await page.waitForTimeout(400);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});
