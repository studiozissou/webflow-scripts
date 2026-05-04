// @ts-check
/**
 * Acceptance tests — rhp-about-accordion-scroll
 *
 * Click .accordion-title → smooth-scroll so .accordion-content top
 * is one title-height below the viewport top.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-about-accordion-scroll';
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

test.describe(`${SLUG} — Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('accordion-title elements are present and clickable', async ({ page }) => {
    const titles = page.locator('.section_about-hero .accordion-title');
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(titles.nth(i)).toBeVisible();
    }
  });
});

test.describe(`${SLUG} — Scroll Behaviour`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('click first accordion-title scrolls to its content', async ({ page }) => {
    const firstTitle = page.locator('.section_about-hero .accordion-title').first();

    await firstTitle.click();
    // Wait for Lenis smooth scroll to settle
    await page.waitForTimeout(1500);

    // Content top should be near viewport top + one title height
    const positions = await page.evaluate(() => {
      const title = document.querySelector('.section_about-hero .accordion-title');
      const content = title?.nextElementSibling;
      if (!title || !content || !content.classList.contains('accordion-content')) return null;
      const titleHeight = title.offsetHeight;
      const contentRect = content.getBoundingClientRect();
      return { titleHeight, contentTop: contentRect.top };
    });

    expect(positions).not.toBeNull();
    // Content top should be within 20px of the title height (accounting for Lenis easing)
    expect(Math.abs(positions.contentTop - positions.titleHeight)).toBeLessThan(20);
  });

  test('click last accordion-title scrolls as far as possible without error', async ({ page }) => {
    const errors = collectErrors(page);
    const titles = page.locator('.section_about-hero .accordion-title');
    const count = await titles.count();
    const lastTitle = titles.nth(count - 1);

    await lastTitle.click();
    await page.waitForTimeout(1500);

    // Should not error even if content can't reach viewport top
    expect(errors).toHaveLength(0);

    // Last content should be visible somewhere in the viewport
    const lastContentVisible = await page.evaluate(() => {
      const allTitles = document.querySelectorAll('.section_about-hero .accordion-title');
      const last = allTitles[allTitles.length - 1];
      const content = last?.nextElementSibling;
      if (!content) return false;
      const rect = content.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(lastContentVisible).toBe(true);
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on accordion click', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    const titles = page.locator('.section_about-hero .accordion-title');
    const count = await titles.count();
    for (let i = 0; i < count; i++) {
      await titles.nth(i).click();
      await page.waitForTimeout(800);
    }

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Barba Lifecycle`, () => {
  test('accordion scroll works after Barba round-trip', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);

    // Navigate to home
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    // Navigate back to about
    await loadPage(page);

    // Click first accordion title — should still scroll
    const firstTitle = page.locator('.section_about-hero .accordion-title').first();
    await firstTitle.click();
    await page.waitForTimeout(1500);

    const positions = await page.evaluate(() => {
      const title = document.querySelector('.section_about-hero .accordion-title');
      const content = title?.nextElementSibling;
      if (!title || !content || !content.classList.contains('accordion-content')) return null;
      const titleHeight = title.offsetHeight;
      const contentRect = content.getBoundingClientRect();
      return { titleHeight, contentTop: contentRect.top };
    });

    expect(positions).not.toBeNull();
    expect(Math.abs(positions.contentTop - positions.titleHeight)).toBeLessThan(20);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('scroll still works with reduced motion', async ({ page }) => {
    await loadPage(page);

    const firstTitle = page.locator('.section_about-hero .accordion-title').first();
    await firstTitle.click();
    // Native scrollIntoView fallback — shorter wait
    await page.waitForTimeout(1000);

    // Content should have scrolled (scrollTop > 0 or content near top)
    const scrolled = await page.evaluate(() => {
      const container = document.querySelector('[data-barba="container"]');
      return container ? container.scrollTop > 0 : false;
    });
    expect(scrolled).toBe(true);
  });
});
