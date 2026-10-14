// TDD acceptance test — pre-implementation.
// Expected to FAIL until the Chichester District Council partner page exists on
// the Snugg Webflow site and the cookie banner gains a reject button.
//
// Spec: ~/webflow-internal/projects/snugg/.claude/specs/snugg-chichesterdc-partner-page.md
//
// Runs against the published site or the webflow.io staging domain. Override:
//   SNUGG_URL=https://snugg.webflow.io SNUGG_SLUG=chichesterdc npx playwright test \
//     --config=tests/acceptance/playwright.config.js snugg-chichesterdc

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SNUGG_URL = (process.env.SNUGG_URL || 'https://www.snugg.com').replace(/\/$/, '');
const SLUG = process.env.SNUGG_SLUG || 'chichesterdc';
const PAGE_URL = `${SNUGG_URL}/${SLUG}`;
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

// Third-party noise we do not own (Webflow, GTM, Meta pixel, Turnstile).
const KNOWN_ERRORS = [/googletagmanager/i, /facebook/i, /turnstile/i, /slick/i];

test.describe('snugg-chichesterdc-partner-page', () => {
  /** @type {string[]} */
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const res = await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `${PAGE_URL} should exist`).toBeLessThan(400);
    await page.waitForTimeout(1500);
  });

  test('page loads without console errors from our code', async () => {
    const own = errors.filter((e) => !KNOWN_ERRORS.some((re) => re.test(e)));
    expect(own, `errors: ${own.join(' | ')}`).toHaveLength(0);
  });

  test('header shows the Snugg + council lockup and no navigation links', async ({ page }) => {
    const header = page.locator('[data-partner-header], .navbar').first();
    await expect(header).toBeVisible();
    await expect(header.locator('img').first()).toBeVisible();
    await expect(header.locator('img[alt*="Chichester" i]').first()).toBeAttached();
    await expect(header.locator('a[href]:not([href^="#"])')).toHaveCount(0);
  });

  test('hero carries the council intro line, headline and localised copy', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/smarter home energy improvements/i);
    await expect(page.getByText(/57,000 homes/i).first()).toBeVisible();
    await expect(page.getByText(/trusted local installers in Chichester/i).first()).toBeVisible();
  });

  test('postcode form posts to the Snugg app with UTM fields and the slug as utm_source', async ({ page }) => {
    const form = page.locator('form.postcode-form').first();
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute('action', /^https:\/\/app\.snugg\.com\//);
    await expect(form).toHaveAttribute('method', /get/i);
    await expect(form.locator('input[name="postcode"]')).toBeVisible();
    await expect(form.locator('input[name="postcode"]')).toHaveAttribute('required', '');
    for (const name of UTM_FIELDS) {
      await expect(form.locator(`input[type="hidden"][name="${name}"]`)).toHaveCount(1);
    }
    await expect(form.locator('input[name="utm_source"]')).toHaveValue(SLUG);
    await expect(form.locator('input[type="submit"], button[type="submit"]').first()).toHaveValue(/get started/i);
  });

  test('UTM params in the URL override the slug default', async ({ page }) => {
    await page.goto(`${PAGE_URL}?utm_source=leaflet&utm_medium=print&utm_campaign=cdc-launch`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1500);
    const form = page.locator('form.postcode-form').first();
    await expect(form.locator('input[name="utm_source"]')).toHaveValue('leaflet');
    await expect(form.locator('input[name="utm_medium"]')).toHaveValue('print');
    await expect(form.locator('input[name="utm_campaign"]')).toHaveValue('cdc-launch');
  });

  test('terms of use line links to the terms page', async ({ page }) => {
    const terms = page.locator('a[href*="terms-of-use"]').first();
    await expect(terms).toBeVisible();
    await expect(page.getByText(/read and agree to the/i).first()).toBeVisible();
  });

  test('"How Snugg can help" band shows four steps', async ({ page }) => {
    const band = page.locator('[data-steps-band], .section_how-it-works, section:has(.step-icon)').first();
    await expect(band).toBeVisible();
    await expect(band.locator('.step-icon, [data-step]')).toHaveCount(4);
  });

  test('no links lead back to the main Snugg site or footer', async ({ page }) => {
    await expect(page.locator('footer, .footer')).toHaveCount(0);
    const offPage = page.locator('a[href="/"], a[href="https://www.snugg.com/"], a[href="https://snugg.com/"]');
    await expect(offPage).toHaveCount(0);
  });

  test('cookie banner offers a reject non-essential button', async ({ page }) => {
    await page.context().clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const reject = page.locator('[fs-cc="deny"]').first();
    await expect(reject).toBeAttached();
    await expect(reject).toContainText(/reject/i);
    await expect(page.locator('[fs-cc="allow"]').first()).toBeAttached();
  });

  test('mobile layout keeps the form usable at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const body = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(body, 'no horizontal overflow').toBeLessThanOrEqual(375);
    const input = page.locator('form.postcode-form input[name="postcode"]').first();
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(120);
  });

  test('axe-core: no critical or serious violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .exclude('[fs-cc="banner"]')
      .analyze();
    const bad = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact || ''));
    expect(bad.map((v) => `${v.id}: ${v.nodes.length}`), 'serious a11y violations').toHaveLength(0);
  });
});
