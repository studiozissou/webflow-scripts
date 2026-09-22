// TDD acceptance tests — pre-implementation.
// Expected to FAIL until datasheet-unlock.js is tagged and its script tag is added to the
// InnoTrans page custom code and published. Seeds localStorage instead of submitting forms,
// so no junk Webflow form entries are created.
//
// Spec: projects/the-signalling-company/.claude/specs/tsc-datasheet-unlock.md

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';
const PAGE = STAGING_URL.replace(/\/$/, '') + '/innotrans-brochure-datasheets';
const KEY = 'tsc-datasheets-unlocked';
const TRIGGER = '[data-link="datasheet-modal"]';
const IX_SETTLE = 750;

test.describe('tsc-datasheet-unlock', () => {
  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.goto(PAGE, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
  });

  test.describe('locked (fresh visitor)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(PAGE, { waitUntil: 'networkidle' });
      await page.evaluate((k) => localStorage.removeItem(k), KEY);
      await page.reload({ waitUntil: 'networkidle' });
    });

    test('locked by default: link href is # and click opens popup', async ({ page }) => {
      const first = page.locator(TRIGGER).first();
      await expect(first).toHaveAttribute('href', '#');
      await expect(first).not.toHaveAttribute('data-unlocked', /.*/);
      await expect(first).toHaveAttribute('data-pdf', /\.pdf$/i);
      await first.click();
      await page.waitForTimeout(IX_SETTLE);
      await expect(page.locator('[data-modal="datasheet-wrapper"]:visible')).toHaveCount(1);
    });
  });

  test.describe('unlocked (stored flag)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(PAGE, { waitUntil: 'networkidle' });
      await page.evaluate((k) => localStorage.setItem(k, '1'), KEY);
      await page.reload({ waitUntil: 'networkidle' });
    });

    test('unlocked from stored flag: links get PDF href, target _blank, data-unlocked', async ({ page }) => {
      const links = page.locator(TRIGGER);
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute('href', /\.pdf$/i);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('data-unlocked', /.*/);
      }
    });

    test('unlocked link click opens PDF in new tab and popup stays hidden', async ({ page, context }) => {
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.locator(TRIGGER).first().click(),
      ]);
      expect(popup.url()).toMatch(/\.pdf$/i);
      await page.waitForTimeout(IX_SETTLE);
      await expect(page.locator('[data-modal="datasheet-wrapper"]:visible')).toHaveCount(0);
    });

    test('every trigger resolves a .pdf URL (link href set in Webflow)', async ({ page }) => {
      const hrefs = await page.locator(TRIGGER).evaluateAll((els) => els.map((a) => a.getAttribute('href')));
      expect(hrefs.every((h) => /\.pdf$/i.test(h))).toBe(true);
    });
  });
});
