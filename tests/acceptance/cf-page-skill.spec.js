/**
 * Acceptance tests for a page rebuilt by /cf-page: the staging duplicate must be a
 * Client First V3 page, noindexed, with at most 70% of the original's elements.
 *
 * Spec: .claude/specs/cf-page-skill.md
 * Skipped unless CF_PAGE_PATH is set (the duplicate's path on staging, e.g. /mtd-software-cf).
 * Run: CF_PAGE_PATH=/mtd-software-cf ORIGINAL_ELEMENTS=832 BASE_URL=https://getcoconut.webflow.io \
 *      npx playwright test tests/acceptance/cf-page-skill.spec.js
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE_URL = process.env.BASE_URL || process.env.STAGING_URL || 'https://getcoconut.webflow.io';
const PATH = process.env.CF_PAGE_PATH;
const ORIGINAL_ELEMENTS = Number(process.env.ORIGINAL_ELEMENTS || 0);
const KEPT_COMPONENT_SELECTOR = '[data-cf-keep], nav, footer, .breadcrumbs-section, .w-nav';
const LEGACY_CLASS_PATTERN = /(^|\s)(_25-|_26-|max-width-1248)/;

test.describe('cf-page-skill', () => {
  test.skip(!PATH, 'Set CF_PAGE_PATH to the staging path of a /cf-page duplicate');

  const pageErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.goto(`${BASE_URL}${PATH}`, { waitUntil: 'load', timeout: 45_000 });
    await page.waitForTimeout(1500);
  });

  test('duplicate page is noindex on staging', async ({ page }) => {
    const robots = await page.locator('meta[name="robots"]').first().getAttribute('content');
    expect(robots || '').toContain('noindex');
  });

  test('page-wrapper > main-wrapper shell present', async ({ page }) => {
    await expect(page.locator('body > .page-wrapper')).toHaveCount(1);
    await expect(page.locator('.page-wrapper > main.main-wrapper')).toHaveCount(1);
  });

  test('every section under main-wrapper has a section_ class and a container-* first child', async ({ page }) => {
    const offenders = await page.evaluate((keepSelector) => {
      const main = document.querySelector('main.main-wrapper');
      if (!main) return ['no main-wrapper'];
      return Array.from(main.children)
        .filter((el) => !el.matches(keepSelector) && !el.querySelector(keepSelector))
        .filter((el) => {
          const hasSectionClass = Array.from(el.classList).some((c) => c.startsWith('section_'));
          const first = el.firstElementChild;
          const containerFirst = first && Array.from(first.classList).some((c) => /^container-(large|medium|small)$/.test(c));
          return !(el.tagName === 'SECTION' && hasSectionClass && containerFirst);
        })
        .map((el) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`);
    }, KEPT_COMPONENT_SELECTOR);
    expect(offenders, `Non-V3 sections: ${offenders.join(', ')}`).toEqual([]);
  });

  test('no legacy _25-, _26- or max-width-1248 classes remain outside kept components', async ({ page }) => {
    const legacy = await page.evaluate(({ keepSelector, pattern }) => {
      const re = new RegExp(pattern);
      const main = document.querySelector('main.main-wrapper');
      if (!main) return ['no main-wrapper'];
      return Array.from(main.querySelectorAll('[class]'))
        .filter((el) => !el.closest(keepSelector))
        .map((el) => el.getAttribute('class'))
        .filter((cls) => re.test(cls))
        .slice(0, 20);
    }, { keepSelector: KEPT_COMPONENT_SELECTOR, pattern: LEGACY_CLASS_PATTERN.source });
    expect(legacy, `Legacy classes found: ${legacy.join(' | ')}`).toEqual([]);
  });

  test('element count is at most 70% of ORIGINAL_ELEMENTS', async ({ page }) => {
    test.skip(!ORIGINAL_ELEMENTS, 'Set ORIGINAL_ELEMENTS from the original page metrics');
    const count = await page.evaluate(() => document.body.querySelectorAll('*').length);
    expect(count).toBeLessThanOrEqual(Math.floor(ORIGINAL_ELEMENTS * 0.7));
  });

  test('exactly one h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('no console errors', async () => {
    expect(pageErrors).toEqual([]);
  });
});
