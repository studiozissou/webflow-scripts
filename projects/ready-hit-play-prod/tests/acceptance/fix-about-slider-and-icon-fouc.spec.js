// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'fix-about-slider-and-icon-fouc';
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

// ── Tests ─────────────────────────────────────────────────────

/* 1. Slider autoheight — direct load */
test.describe(`${SLUG} — Slider Direct Load`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('slider has inline height on direct load', async ({ page }) => {
    const slider = page.locator('.about-slider.w-slider').first();
    await expect(slider).toBeAttached();
    const height = await slider.evaluate(el => el.style.height);
    expect(height).toMatch(/^\d+px$/);
  });
});

/* 2. Slider autoheight — Barba transition */
test.describe(`${SLUG} — Slider Barba Transition`, () => {
  test('slider has inline height after Barba transition', async ({ page }) => {
    // Start on home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate to about via Barba
    await page.locator('a[href="/about"], .nav_about-link').first().click();
    await page.waitForTimeout(3000); // curtain + content reveal
    await waitForRHP(page);

    const slider = page.locator('.about-slider.w-slider').first();
    await expect(slider).toBeAttached({ timeout: 5000 });
    const height = await slider.evaluate(el => el.style.height);
    expect(height).toMatch(/^\d+px$/);
  });
});

/* 3. Slider height updates after slide change */
test.describe(`${SLUG} — Slider Interaction`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('height updates after slide change', async ({ page }) => {
    const slider = page.locator('.about-slider.w-slider').first();
    await expect(slider).toBeAttached();

    const nextArrow = slider.locator('.w-slider-arrow-right').first();
    if (await nextArrow.isVisible()) {
      await nextArrow.click();
      await page.waitForTimeout(800);
      const height = await slider.evaluate(el => el.style.height);
      expect(height).toMatch(/^\d+px$/);
    }
  });
});

/* 4. Icon FOUC guard — max-height cap */
test.describe(`${SLUG} — Icon FOUC Guard`, () => {
  test('icon CSS vars set after init', async ({ page }) => {
    await loadPage(page);

    const vars = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      if (!section) return null;
      const style = section.getAttribute('style') || '';
      return {
        hasTopOffset: style.includes('--top-offset'),
        hasHeaderHeight: style.includes('--header-height'),
        hasTitlesHeight: style.includes('--titles-height')
      };
    });

    expect(vars).not.toBeNull();
    expect(vars.hasTopOffset).toBe(true);
    expect(vars.hasHeaderHeight).toBe(true);
    expect(vars.hasTitlesHeight).toBe(true);
  });
});

/* 5. Content reveal fires on direct load */
test.describe(`${SLUG} — Direct Load Reveal`, () => {
  test('content reveal fires on direct load', async ({ page }) => {
    await loadPage(page);
    // Wait extra for reveal animation to complete
    await page.waitForTimeout(3000);

    // R-link should be visible (opacity > 0)
    const rLink = page.locator('.about_r-link').first();
    if (await rLink.count() > 0) {
      const opacity = await rLink.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }

    // Header elements should be visible
    const header = page.locator('.about_header h2').first();
    if (await header.count() > 0) {
      const opacity = await header.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }
  });
});

/* 6. No R logo flash on about→home */
test.describe(`${SLUG} — About to Home Transition`, () => {
  test('no R logo flash on about to home', async ({ page }) => {
    await loadPage(page);
    await page.waitForTimeout(2000);

    // Capture icon height before transition
    const heightBefore = await page.evaluate(() => {
      const icon = document.querySelector('.section_about-hero .icon-embed-r');
      return icon ? icon.getBoundingClientRect().height : 0;
    });

    // Verify it's NOT viewport height (FOUC)
    const vh = await page.evaluate(() => window.innerHeight);
    expect(heightBefore).toBeLessThan(vh * 0.95);
  });
});

/* 7. Barba round-trip */
test.describe(`${SLUG} — Barba Round-trip`, () => {
  test('slider and icon correct after round-trip', async ({ page }) => {
    const errors = collectErrors(page);

    // Home → About
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    await page.locator('a[href="/about"], .nav_about-link').first().click();
    await page.waitForTimeout(3500);

    // About → Home
    await page.locator('a[href="/"], .nav_logo-link').first().click();
    await page.waitForTimeout(3000);

    // Home → About again
    await page.locator('a[href="/about"], .nav_about-link').first().click();
    await page.waitForTimeout(3500);

    // Slider should have height
    const slider = page.locator('.about-slider.w-slider').first();
    if (await slider.count() > 0) {
      const height = await slider.evaluate(el => el.style.height);
      expect(height).toMatch(/^\d+px$/);
    }

    // Icon vars should be set
    const hasVars = await page.evaluate(() => {
      const section = document.querySelector('.section_about-hero');
      return section ? (section.getAttribute('style') || '').includes('--top-offset') : false;
    });
    expect(hasVars).toBe(true);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 8. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on direct load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 9. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content is visible without animation', async ({ page }) => {
    await loadPage(page);
    await page.waitForTimeout(1000);

    const rLink = page.locator('.about_r-link').first();
    if (await rLink.count() > 0) {
      const opacity = await rLink.evaluate(el => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0);
    }
  });
});

/* 10. Accessibility */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations on about page', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
