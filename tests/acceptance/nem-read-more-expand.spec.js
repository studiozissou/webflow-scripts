import { test, expect } from '@playwright/test';

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-read-more-expand';
const BASE = 'https://nem-life-1.webflow.io';
const PAGE_PATH = `${BASE}/missie-nem-life`;

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

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Default State`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('blocks are collapsed by default on page load', async ({ page }) => {
    const blocks = page.locator('[data-block="read-more-expand"]');
    const count = await blocks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const height = await blocks.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBe(0);
    }
  });

  test('button text is "Lees meer" on load', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();
    await expect(btn).toContainText('Lees meer');
  });
});

test.describe(`${SLUG} — Expand/Collapse`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('clicking button expands all sibling blocks', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();
    await btn.click();
    await page.waitForTimeout(600); // 0.4s animation + buffer

    const parent = page.locator('[data-button="read-more-expand"]').first().locator('..');
    const blocks = parent.locator('[data-block="read-more-expand"]');
    const count = await blocks.count();

    for (let i = 0; i < count; i++) {
      const height = await blocks.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBeGreaterThan(0);
    }
  });

  test('button text changes to "Lees minder" after expanding', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();
    await btn.click();
    await page.waitForTimeout(600);
    await expect(btn).toContainText('Lees minder');
  });

  test('clicking button again collapses all blocks', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();

    // Expand
    await btn.click();
    await page.waitForTimeout(600);

    // Collapse
    await btn.click();
    await page.waitForTimeout(600);

    const parent = page.locator('[data-button="read-more-expand"]').first().locator('..');
    const blocks = parent.locator('[data-block="read-more-expand"]');
    const count = await blocks.count();

    for (let i = 0; i < count; i++) {
      const height = await blocks.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBe(0);
    }
  });

  test('button text changes back to "Lees meer" after collapsing', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();
    await btn.click();
    await page.waitForTimeout(600);
    await btn.click();
    await page.waitForTimeout(600);
    await expect(btn).toContainText('Lees meer');
  });

  test('parent wrapper has is-open class when expanded', async ({ page }) => {
    const btn = page.locator('[data-button="read-more-expand"]').first();
    const parent = btn.locator('..');

    await expect(parent).not.toHaveClass(/is-open/);
    await btn.click();
    await page.waitForTimeout(600);
    await expect(parent).toHaveClass(/is-open/);
    await btn.click();
    await page.waitForTimeout(600);
    await expect(parent).not.toHaveClass(/is-open/);
  });
});

test.describe(`${SLUG} — Reduced Motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('content is visible without animation when reduced motion is preferred', async ({ page }) => {
    await loadPage(page);
    const btn = page.locator('[data-button="read-more-expand"]').first();
    await btn.click();
    // With reduced motion, content should appear immediately
    await page.waitForTimeout(100);

    const parent = btn.locator('..');
    const blocks = parent.locator('[data-block="read-more-expand"]');
    const count = await blocks.count();

    for (let i = 0; i < count; i++) {
      const height = await blocks.nth(i).evaluate(el => el.offsetHeight);
      expect(height).toBeGreaterThan(0);
    }
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});
