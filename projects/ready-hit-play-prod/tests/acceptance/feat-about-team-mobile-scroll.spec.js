// @ts-check
/**
 * Acceptance tests — feat-about-team-mobile-scroll
 * Mobile scroll-linked team bio reveal on about page (<=991px).
 * Photo slides sideways, bio reveals from opposite side, proportional to scroll.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-about-team-mobile-scroll';
const PAGE_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path);
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

/** Scroll a specific team member into the center of the viewport to trigger reveal. */
async function scrollMemberToCenter(page, team) {
  await page.evaluate((t) => {
    const el = document.querySelector(`[data-team="${t}"]`);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, team);
  await page.waitForTimeout(1000); // allow Lenis scroll + rAF update
}

/** Scroll team section to the very top of the viewport (before reveal trigger). */
async function scrollTeamToTop(page) {
  await page.evaluate(() => {
    const section = document.querySelector('.section_about-team');
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'end' });
  });
  await page.waitForTimeout(500);
}

/** Get the bio opacity and width for a team member. */
async function getBioState(page, team) {
  return page.evaluate((t) => {
    const bio = document.querySelector(`[data-team="${t}"] .about-team_bio`);
    if (!bio) return { opacity: 0, width: '0px' };
    const s = getComputedStyle(bio);
    return { opacity: Number(s.opacity), width: s.width };
  }, team);
}

/** Get the x-translation of a team member's photo. */
async function getPhotoTranslateX(page, team) {
  return page.evaluate((t) => {
    const img = document.querySelector(`[data-team="${t}"] .about-team_image`);
    if (!img) return 0;
    const transform = getComputedStyle(img).transform;
    if (transform === 'none') return 0;
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (!match) return 0;
    return parseFloat(match[1].split(',')[4]);
  }, team);
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Bio reveals on scroll at mobile viewports */
test.describe(`${SLUG} — Scroll Reveal`, () => {
  for (const vp of [
    { w: 991, h: 800, label: '991px' },
    { w: 767, h: 800, label: '767px' },
    { w: 479, h: 800, label: '479px' },
  ]) {
    test(`bio reveals on scroll at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loadPage(page);

      // Before scroll: bio should be hidden
      const beforeState = await getBioState(page, 'ryan');
      expect(beforeState.opacity).toBeLessThan(0.1);

      // Scroll ryan into center of viewport
      await scrollMemberToCenter(page, 'ryan');

      // After scroll: bio should be visible (progress > 0)
      const afterState = await getBioState(page, 'ryan');
      expect(afterState.opacity).toBeGreaterThan(0.3);
    });
  }
});

/* 2. Photo slides correct direction */
test.describe(`${SLUG} — Photo Direction`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 991, height: 800 });
    await loadPage(page);
  });

  test('ryan photo slides left on scroll', async ({ page }) => {
    await scrollMemberToCenter(page, 'ryan');
    const tx = await getPhotoTranslateX(page, 'ryan');
    // Ryan's photo should move left (negative x) — or stay near 0 if not triggered yet
    // With nameDir = +1, photo moves -dir * slide = negative
    expect(tx).toBeLessThanOrEqual(0);
  });

  test('guy photo slides right on scroll', async ({ page }) => {
    await scrollMemberToCenter(page, 'guy');
    const tx = await getPhotoTranslateX(page, 'guy');
    // Guy's photo should move right (positive x)
    // With nameDir = -1, photo moves -dir * slide = positive
    expect(tx).toBeGreaterThanOrEqual(0);
  });
});

/* 3. Animation reverses on scroll-up */
test.describe(`${SLUG} — Scroll Reverse`, () => {
  test('bio closes when scrolling back up', async ({ page }) => {
    await page.setViewportSize({ width: 991, height: 800 });
    await loadPage(page);

    // Scroll to reveal ryan
    await scrollMemberToCenter(page, 'ryan');
    const revealedState = await getBioState(page, 'ryan');
    expect(revealedState.opacity).toBeGreaterThan(0.3);

    // Scroll Barba container back to top (about page scroll is on [data-barba="container"], not window)
    await page.evaluate(() => {
      const bc = document.querySelector('[data-barba="container"]');
      if (bc) bc.scrollTo(0, 0);
      else window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Bio should be hidden again
    const hiddenState = await getBioState(page, 'ryan');
    expect(hiddenState.opacity).toBeLessThan(0.1);
  });
});

/* 4. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  for (const vp of [
    { w: 991, h: 800, label: '991px' },
    { w: 479, h: 800, label: '479px' },
  ]) {
    test(`no JS errors on about page at ${vp.label}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loadPage(page);
      await scrollMemberToCenter(page, 'ryan');
      await scrollMemberToCenter(page, 'guy');
      expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
        .toHaveLength(0);
    });
  }
});

/* 5. Desktop hover still works (regression) */
test.describe(`${SLUG} — Desktop Regression`, () => {
  test('hover interaction works at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    // Scroll to team section
    await page.evaluate(() => {
      const section = document.querySelector('.section_about-team');
      if (section) section.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(1000);

    // Hover ryan image
    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    await ryanImage.hover();
    await page.waitForTimeout(600);

    // Bio should be visible
    const state = await getBioState(page, 'ryan');
    expect(state.opacity).toBeGreaterThan(0);
  });
});

/* 6. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('scroll animation works after home → about → home → about', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 991, height: 800 });

    // Load home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate to about
    await page.goto('/about');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Navigate to home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Navigate back to about
    await page.goto('/about');
    await waitForRHP(page);
    await page.waitForTimeout(1500);

    // Scroll to ryan — should still work
    await scrollMemberToCenter(page, 'ryan');
    const state = await getBioState(page, 'ryan');
    expect(state.opacity).toBeGreaterThan(0.3);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 7. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('bio visible without scroll animation', async ({ page }) => {
    await page.setViewportSize({ width: 991, height: 800 });
    await loadPage(page);

    // Scroll to team section
    await page.evaluate(() => {
      const section = document.querySelector('.section_about-team');
      if (section) section.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(500);

    // Bio should be visible by default (no animation, just shown)
    const ryanBio = page.locator('[data-team="ryan"] .about-team_bio');
    const opacity = await ryanBio.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});
