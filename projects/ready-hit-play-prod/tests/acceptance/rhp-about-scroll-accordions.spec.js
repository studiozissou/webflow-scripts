// @ts-check
/**
 * Acceptance tests — RHP About Page Scroll Accordions
 *
 * Scroll-triggered accordion reveal on the about page.
 * .accordion-content opens (height 0 → auto, opacity 0 → 1) when
 * sibling .accordion-title crosses 35% from bottom of viewport.
 * Reverses on scroll-back.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'rhp-about-scroll-accordions';
const PAGE_PATH = '/about';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  const base = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';
  await page.goto(`${base}${path}`);
  await waitForRHP(page);
  await page.waitForTimeout(1500); // GSAP / init settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. Element presence & initial state */
test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('accordion-content elements are present and start collapsed', async ({ page }) => {
    const contents = page.locator('.section_about-hero .accordion-content');
    const count = await contents.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const content = contents.nth(i);
      await expect(content).toBeAttached();

      // Should be collapsed: height ~0, opacity ~0
      const styles = await content.evaluate(el => {
        const cs = getComputedStyle(el);
        return { height: el.offsetHeight, opacity: Number(cs.opacity) };
      });
      expect(styles.height).toBeLessThanOrEqual(1);
      expect(styles.opacity).toBeLessThanOrEqual(0.01);
    }
  });

  test('accordion-title elements are visible', async ({ page }) => {
    const titles = page.locator('.section_about-hero .accordion-title');
    const count = await titles.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      await expect(titles.nth(i)).toBeVisible();
    }
  });
});

/* 2. Scroll trigger opens accordion */
test.describe(`${SLUG} — Scroll Trigger`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('accordion opens when title scrolls to 35% from bottom', async ({ page }) => {
    const firstTitle = page.locator('.section_about-hero .accordion-title').first();
    const firstContent = page.locator('.section_about-hero .accordion-content').first();

    // Scroll the first accordion title into the trigger zone (65% from top)
    await firstTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Scroll a bit more to ensure it passes the 65% from top threshold
    await page.evaluate(() => {
      const title = document.querySelector('.section_about-hero .accordion-title');
      if (title) {
        const rect = title.getBoundingClientRect();
        const target = window.innerHeight * 0.5; // scroll title well past trigger
        window.scrollBy(0, rect.top - target);
      }
    });
    await page.waitForTimeout(1500); // 0.75s animation + buffer

    // Content should now be expanded
    const styles = await firstContent.evaluate(el => {
      const cs = getComputedStyle(el);
      return { height: el.offsetHeight, opacity: Number(cs.opacity) };
    });
    expect(styles.height).toBeGreaterThan(10);
    expect(styles.opacity).toBeGreaterThan(0.5);
  });

  test('accordion reverses when scrolling back up', async ({ page }) => {
    const firstTitle = page.locator('.section_about-hero .accordion-title').first();
    const firstContent = page.locator('.section_about-hero .accordion-content').first();

    // Open the accordion first
    await page.evaluate(() => {
      const title = document.querySelector('.section_about-hero .accordion-title');
      if (title) {
        const rect = title.getBoundingClientRect();
        window.scrollBy(0, rect.top - window.innerHeight * 0.4);
      }
    });
    await page.waitForTimeout(1500);

    // Verify it opened
    const openHeight = await firstContent.evaluate(el => el.offsetHeight);
    expect(openHeight).toBeGreaterThan(10);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);

    // Content should be collapsed again
    const closedStyles = await firstContent.evaluate(el => {
      const cs = getComputedStyle(el);
      return { height: el.offsetHeight, opacity: Number(cs.opacity) };
    });
    expect(closedStyles.height).toBeLessThanOrEqual(1);
    expect(closedStyles.opacity).toBeLessThanOrEqual(0.1);
  });

  test('multiple accordions can be open simultaneously', async ({ page }) => {
    // Scroll far enough to trigger multiple accordions
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.section_about-hero .accordion-block');
      if (blocks.length >= 2) {
        const lastTitle = blocks[blocks.length - 1].querySelector('.accordion-title');
        if (lastTitle) {
          const rect = lastTitle.getBoundingClientRect();
          window.scrollBy(0, rect.top - window.innerHeight * 0.4);
        }
      }
    });
    await page.waitForTimeout(2000); // wait for all animations

    const contents = page.locator('.section_about-hero .accordion-content');
    const count = await contents.count();
    let openCount = 0;
    for (let i = 0; i < count; i++) {
      const h = await contents.nth(i).evaluate(el => el.offsetHeight);
      if (h > 10) openCount++;
    }
    expect(openCount).toBeGreaterThanOrEqual(2);
  });
});

/* 3. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on about page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Scroll through the accordion section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 4. Barba lifecycle */
test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('Barba re-entry: accordions work on second visit', async ({ page }) => {
    const errors = collectErrors(page);
    const base = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

    // First visit to about
    await loadPage(page);

    // Navigate to home via Barba
    await page.locator('.nav_logo-link, a[href="/"]').first().click();
    await page.waitForTimeout(2500); // Barba transition

    // Navigate back to about
    await page.locator('a[href="/about"]').first().click();
    await page.waitForTimeout(2500); // Barba transition
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // Verify accordions are collapsed (fresh state)
    const firstContent = page.locator('.section_about-hero .accordion-content').first();
    const height = await firstContent.evaluate(el => el.offsetHeight);
    expect(height).toBeLessThanOrEqual(1);

    // Scroll to trigger — should still work
    await page.evaluate(() => {
      const title = document.querySelector('.section_about-hero .accordion-title');
      if (title) {
        const rect = title.getBoundingClientRect();
        window.scrollBy(0, rect.top - window.innerHeight * 0.4);
      }
    });
    await page.waitForTimeout(1500);

    const openHeight = await firstContent.evaluate(el => el.offsetHeight);
    expect(openHeight).toBeGreaterThan(10);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

/* 5. Reduced motion */
test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content visible without animation', async ({ page }) => {
    await loadPage(page);

    const contents = page.locator('.section_about-hero .accordion-content');
    const count = await contents.count();

    for (let i = 0; i < count; i++) {
      const opacity = await contents.nth(i).evaluate(el =>
        Number(getComputedStyle(el).opacity)
      );
      expect(opacity).toBeGreaterThan(0.5);
    }
  });
});

/* 6. Accessibility */
test.describe(`${SLUG} — Accessibility`, () => {
  test('no WCAG 2.1 AA violations in accordion section', async ({ page }) => {
    await loadPage(page);
    const results = await new AxeBuilder({ page })
      .include('.section_about-hero')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect.soft(results.violations).toEqual([]);
  });
});
