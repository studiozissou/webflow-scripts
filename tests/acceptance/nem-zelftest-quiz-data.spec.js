/**
 * Acceptance tests — nem-zelftest-quiz-data
 *
 * Verifies that quiz-data.js correctly reads CMS collection list data
 * and exposes it on window.__quizData for the React quiz component.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-zelftest-quiz-data';
const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const QUIZ_PAGE = '/zelftest/test-slug'; // CMS template page — update slug once known
const HOME_PAGE = '/';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = QUIZ_PAGE) {
  await page.goto(`${STAGING}${path}`);
  await waitForReady(page);
  await page.waitForTimeout(2000); // allow init.js + modules to settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — DOM Elements`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('quiz data wrapper exists on zelftest page', async ({ page }) => {
    await expect(page.locator("[data-quiz='questions']")).toBeAttached();
  });

  test('results data wrapper exists on zelftest page', async ({ page }) => {
    await expect(page.locator("[data-quiz='results']")).toBeAttached();
  });
});

test.describe(`${SLUG} — Data Extraction`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('window.__quizData is populated', async ({ page }) => {
    const data = await page.evaluate(() => window.__quizData);
    expect(data).toBeTruthy();
    expect(data).toHaveProperty('questions');
    expect(data).toHaveProperty('results');
  });

  test('questions array has items', async ({ page }) => {
    const count = await page.evaluate(() => window.__quizData?.questions?.length || 0);
    expect(count).toBeGreaterThan(0);
  });

  test('results array has correct shape', async ({ page }) => {
    const results = await page.evaluate(() => window.__quizData?.results || []);
    expect(results.length).toBeGreaterThan(0);

    for (const r of results) {
      expect(r).toHaveProperty('min');
      expect(r).toHaveProperty('max');
      expect(r).toHaveProperty('heading');
      expect(r).toHaveProperty('body');
      expect(typeof r.min).toBe('number');
      expect(typeof r.max).toBe('number');
      expect(typeof r.heading).toBe('string');
      expect(typeof r.body).toBe('string');
    }
  });
});

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on zelftest page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe(`${SLUG} — Isolation`, () => {
  test('quiz-data does not run on non-quiz pages', async ({ page }) => {
    await loadPage(page, HOME_PAGE);
    const data = await page.evaluate(() => window.__quizData);
    expect(data).toBeUndefined();
  });
});
