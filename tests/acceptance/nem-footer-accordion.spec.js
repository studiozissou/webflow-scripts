import { test, expect } from '@playwright/test';

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-footer-accordion';
const BASE = 'https://nem-life-1.webflow.io';
const PAGE_PATH = BASE;

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await waitForReady(page);
  await page.waitForTimeout(2000); // allow GSAP init to settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Mobile viewport (≤767px) ─────────────────────────────────

test.describe(`${SLUG} — Mobile Default State`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('footer nav columns exist on page', async ({ page }) => {
    const cols = page.locator('.footer_nav-col');
    const count = await cols.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('all footer sections are collapsed by default on mobile', async ({ page }) => {
    const wraps = page.locator('.footer_navlinks-wrap');
    const count = await wraps.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const height = await wraps.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBe(0);
    }
  });

  test('no footer columns have is-open class by default', async ({ page }) => {
    const cols = page.locator('.footer_nav-col');
    const count = await cols.count();

    for (let i = 0; i < count; i++) {
      await expect(cols.nth(i)).not.toHaveClass(/is-open/);
    }
  });
});

test.describe(`${SLUG} — Mobile Expand/Collapse`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('clicking trigger expands footer section', async ({ page }) => {
    const trigger = page.locator('.footer_accordion-trigger').first();
    await trigger.click();
    await page.waitForTimeout(600);

    const col = page.locator('.footer_nav-col').first();
    await expect(col).toHaveClass(/is-open/);

    const wrap = col.locator('.footer_navlinks-wrap');
    const height = await wrap.evaluate(el => el.offsetHeight);
    expect(height).toBeGreaterThan(0);
  });

  test('clicking another trigger closes the previous section', async ({ page }) => {
    const triggers = page.locator('.footer_accordion-trigger');

    // Open first
    await triggers.nth(0).click();
    await page.waitForTimeout(600);

    // Open second — first should close
    await triggers.nth(1).click();
    await page.waitForTimeout(600);

    const cols = page.locator('.footer_nav-col');
    await expect(cols.nth(0)).not.toHaveClass(/is-open/);
    await expect(cols.nth(1)).toHaveClass(/is-open/);
  });

  test('clicking same trigger again collapses it', async ({ page }) => {
    const trigger = page.locator('.footer_accordion-trigger').first();
    const col = page.locator('.footer_nav-col').first();

    // Open
    await trigger.click();
    await page.waitForTimeout(600);
    await expect(col).toHaveClass(/is-open/);

    // Close
    await trigger.click();
    await page.waitForTimeout(600);
    await expect(col).not.toHaveClass(/is-open/);

    const wrap = col.locator('.footer_navlinks-wrap');
    const height = await wrap.evaluate(el => el.offsetHeight);
    expect(height).toBe(0);
  });

  test('arrow rotates on expand and resets on collapse', async ({ page }) => {
    const trigger = page.locator('.footer_accordion-trigger').first();
    const arrow = page.locator('.footer_nav-col').first().locator('.footer_arrow');

    // Expand
    await trigger.click();
    await page.waitForTimeout(600);

    const rotateOpen = await arrow.evaluate(el => {
      const t = window.getComputedStyle(el).transform;
      if (!t || t === 'none') return 0;
      const vals = t.match(/matrix\((.+)\)/);
      if (!vals) return 0;
      const parts = vals[1].split(', ');
      return Math.round(Math.atan2(parseFloat(parts[1]), parseFloat(parts[0])) * (180 / Math.PI));
    });
    expect(rotateOpen).toBe(90);

    // Collapse
    await trigger.click();
    await page.waitForTimeout(600);

    const rotateClosed = await arrow.evaluate(el => {
      const t = window.getComputedStyle(el).transform;
      if (!t || t === 'none') return 0;
      const vals = t.match(/matrix\((.+)\)/);
      if (!vals) return 0;
      const parts = vals[1].split(', ');
      return Math.round(Math.atan2(parseFloat(parts[1]), parseFloat(parts[0])) * (180 / Math.PI));
    });
    expect(rotateClosed).toBe(0);
  });
});

// ── Desktop viewport (>767px) ────────────────────────────────

test.describe(`${SLUG} — Desktop Reset`, () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('all footer sections are visible on desktop', async ({ page }) => {
    await loadPage(page);

    const wraps = page.locator('.footer_navlinks-wrap');
    const count = await wraps.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const height = await wraps.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBeGreaterThan(0);
    }
  });

  test('no is-open class on desktop', async ({ page }) => {
    await loadPage(page);

    const cols = page.locator('.footer_nav-col');
    const count = await cols.count();

    for (let i = 0; i < count; i++) {
      await expect(cols.nth(i)).not.toHaveClass(/is-open/);
    }
  });
});

// ── Console Errors ───────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no JS errors on mobile page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
