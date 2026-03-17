// @ts-check
/**
 * Acceptance tests — feat-about-team-hover
 * About page team section hover animations: image scale, name shift, mobile tap toggle.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'feat-about-team-hover';
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

/** Scroll the team section into view. */
async function scrollToTeam(page) {
  await page.evaluate(() => {
    const section = document.querySelector('.section_about-team');
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(1000);
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Scroll reveal exclusion */
test.describe(`${SLUG} — Scroll Reveal Exclusion`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('team section heading still animates on scroll', async ({ page }) => {
    // Before scroll: heading should be opacity 0 (hidden by about-text-lines)
    const heading = page.locator('.section_about-team h2');
    await expect(heading).toBeAttached();

    // Scroll to bottom of page to trigger all reveals
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    // After scroll: heading should be visible (opacity > 0)
    const opacity = await heading.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });

  test('team member names excluded from scroll reveal', async ({ page }) => {
    // Team member names should NOT be split by SplitText (no .about-text-line children)
    const nameLines = await page.locator('.about-team_name .about-text-line').count();
    expect(nameLines).toBe(0);
  });
});

/* 2. Desktop hover interactions */
test.describe(`${SLUG} — Desktop Hover`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await scrollToTeam(page);
  });

  test('image scales on hover', async ({ page }) => {
    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    await ryanImage.hover();
    await page.waitForTimeout(500);

    // Check scale on .image-cover or .about-team_image
    const scaleTarget = page.locator('[data-team="ryan"] .image-cover, [data-team="ryan"] .about-team_image').first();
    const transform = await scaleTarget.evaluate(el => getComputedStyle(el).transform);
    // matrix(1.1, 0, 0, 1.1, ...) or scale value > 1
    expect(transform).not.toBe('none');
    // Extract scale from matrix if present
    if (transform.startsWith('matrix')) {
      const values = transform.match(/matrix\(([^)]+)\)/);
      if (values) {
        const scale = parseFloat(values[1].split(',')[0]);
        expect(scale).toBeCloseTo(1.1, 1);
      }
    }
  });

  test('name shifts right on ryan hover', async ({ page }) => {
    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    await ryanImage.hover();
    await page.waitForTimeout(600);

    const name = page.locator('[data-team="ryan"] .about-team_name');
    const transform = await name.evaluate(el => getComputedStyle(el).transform);
    expect(transform).not.toBe('none');
    // x translation should be positive (rightward)
    if (transform.startsWith('matrix')) {
      const values = transform.match(/matrix\(([^)]+)\)/);
      if (values) {
        const tx = parseFloat(values[1].split(',')[4]);
        expect(tx).toBeGreaterThan(0);
      }
    }
  });

  test('name shifts left on guy hover', async ({ page }) => {
    const guyImage = page.locator('[data-team="guy"] .about-team_image');
    await guyImage.hover();
    await page.waitForTimeout(600);

    const name = page.locator('[data-team="guy"] .about-team_name');
    const transform = await name.evaluate(el => getComputedStyle(el).transform);
    expect(transform).not.toBe('none');
    if (transform.startsWith('matrix')) {
      const values = transform.match(/matrix\(([^)]+)\)/);
      if (values) {
        const tx = parseFloat(values[1].split(',')[4]);
        expect(tx).toBeLessThan(0);
      }
    }
  });

  test('hover animations reverse on leave', async ({ page }) => {
    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    const ryanName = page.locator('[data-team="ryan"] .about-team_name');

    // Hover in
    await ryanImage.hover();
    await page.waitForTimeout(600);

    // Hover out (move to body)
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);

    // Name should be back to x: 0
    const transform = await ryanName.evaluate(el => getComputedStyle(el).transform);
    if (transform === 'none') {
      // Good — no transform means back to default
      expect(true).toBe(true);
    } else if (transform.startsWith('matrix')) {
      const values = transform.match(/matrix\(([^)]+)\)/);
      if (values) {
        const tx = parseFloat(values[1].split(',')[4]);
        expect(Math.abs(tx)).toBeLessThan(2); // close to 0
      }
    }
  });
});

/* 3. Console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('hover works after home → about → home → about', async ({ page }) => {
    const errors = collectErrors(page);

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

    await scrollToTeam(page);

    // Hover ryan image — should still work
    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    await ryanImage.hover();
    await page.waitForTimeout(600);

    // Bio should be visible
    const ryanBio = page.locator('[data-team="ryan"] .about-team_bio');
    const opacity = await ryanBio.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('team content visible without animation', async ({ page }) => {
    await loadPage(page);
    await scrollToTeam(page);

    // Team names should be visible (not hidden by scroll reveal since excluded)
    const ryanName = page.locator('[data-team="ryan"] .about-team_name');
    await expect(ryanName).toBeVisible();

    const guyName = page.locator('[data-team="guy"] .about-team_name');
    await expect(guyName).toBeVisible();
  });
});

/* 6. Mobile tap toggle */
test.describe(`${SLUG} — Mobile Tap`, () => {
  test('tap toggle at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    await scrollToTeam(page);

    const ryanImage = page.locator('[data-team="ryan"] .about-team_image');
    const ryanBio = page.locator('[data-team="ryan"] .about-team_bio');
    const guyImage = page.locator('[data-team="guy"] .about-team_image');
    const guyBio = page.locator('[data-team="guy"] .about-team_bio');

    // Tap Ryan — should open
    await ryanImage.tap();
    await page.waitForTimeout(700);
    const ryanOpacity1 = await ryanBio.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(ryanOpacity1)).toBeGreaterThan(0);

    // Tap Guy — should close Ryan, open Guy
    await guyImage.tap();
    await page.waitForTimeout(700);
    const ryanOpacity2 = await ryanBio.evaluate(el => getComputedStyle(el).opacity);
    const guyOpacity1 = await guyBio.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(ryanOpacity2)).toBe(0);
    expect(Number(guyOpacity1)).toBeGreaterThan(0);

    // Tap Guy again — should close
    await guyImage.tap();
    await page.waitForTimeout(700);
    const guyOpacity2 = await guyBio.evaluate(el => getComputedStyle(el).opacity);
    expect(Number(guyOpacity2)).toBe(0);
  });
});
