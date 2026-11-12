// Acceptance tests for sz-contact-steps: the Team Zissou homepage contact form shows one step at a time with progress, Back, per-step validation, focus moves and sent/fail states; SZ_LOCAL_MODULE=1 injects the local module before the CDN release.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_STAGING_URL || 'https://teamzissou.webflow.io').replace(/\/$/, '');
const LOCAL = Boolean(process.env.SZ_LOCAL_MODULE);
const MODULE = fileURLToPath(new URL('../../projects/studio-zissou/contact-steps.js', import.meta.url));
const FORM_API = /webflow\.com\/api\/v1\/form\//;
const ROOT = '[data-sz="contact-steps"]';
const STEPS = `${ROOT} [data-sz-step]`;
const NEXT = `${ROOT} [data-sz-step]:not([hidden]) [data-sz="contact-next"]`;
const FOOTER = `${ROOT} .sz-contact_footer`;

const TURNSTILE = /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;
const TURNSTILE_STUB = 'window.turnstile={render:function(el,o){o&&o.callback&&o.callback("test");return "stub";},reset:function(){},remove:function(){},getResponse:function(){return "test";}};';

async function open(page) {
  await page.route(TURNSTILE, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: TURNSTILE_STUB }));
  await page.goto(`${BASE}/?utm_source=acceptance`, { waitUntil: 'networkidle' });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  if (LOCAL) await page.addScriptTag({ path: MODULE });
  await expect(page.locator(ROOT)).toHaveClass(/is-steps/, { timeout: 5000 });
}

async function visibleStep(page) {
  return page.locator(STEPS).evaluateAll((els) => els.findIndex((el) => !el.hidden) + 1);
}

async function toStep(page, n) {
  const fills = {
    1: () => page.fill('#contact-name', 'Acceptance Test'),
    3: () => page.fill('#contact-email', 'acceptance@example.com'),
    5: () => page.check('#need-unsure', { force: true }),
  };
  for (let s = 1; s < n; s += 1) {
    if (fills[s]) await fills[s]();
    await page.click(NEXT);
    await expect.poll(() => visibleStep(page)).toBe(s + 1);
  }
}

test.describe('sz-contact-steps', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows only step 1 with progress 1 of 6 on load', async ({ page }) => {
    await expect(page.locator(STEPS)).toHaveCount(6);
    await expect(page.locator(`${STEPS}[hidden]`)).toHaveCount(5);
    expect(await visibleStep(page)).toBe(1);
    await expect(page.locator('[data-sz="contact-count"]')).toHaveText('1 of 6');
    await expect(page.locator('[data-sz="contact-segment"].is-active')).toHaveCount(1);
    await expect(page.locator('[data-sz="contact-back"]')).toBeHidden();
    await expect(page.locator(`${ROOT} form [type=submit]`)).toBeHidden();
  });

  test('blocks an empty name and keeps focus on it', async ({ page }) => {
    await page.click(NEXT);
    expect(await visibleStep(page)).toBe(1);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('contact-name');
    expect(await page.$eval('#contact-name', (el) => el.validity.valueMissing)).toBe(true);
  });

  test('Enter advances from name to business and moves focus', async ({ page }) => {
    await page.fill('#contact-name', 'Acceptance Test');
    await page.press('#contact-name', 'Enter');
    await expect.poll(() => visibleStep(page)).toBe(2);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('contact-business');
    await expect(page.locator('[data-sz="contact-segment"].is-active')).toHaveCount(2);
    await expect(page.locator('[data-sz="contact-count"]')).toHaveText('2 of 6');
  });

  test('blocks an invalid email and accepts a valid one', async ({ page }) => {
    await toStep(page, 3);
    await page.fill('#contact-email', 'abc');
    await page.click(NEXT);
    expect(await visibleStep(page)).toBe(3);
    await page.fill('#contact-email', 'a@b.co');
    await page.click(NEXT);
    await expect.poll(() => visibleStep(page)).toBe(4);
  });

  test('step 5 needs one chip and shows the need error', async ({ page }) => {
    await toStep(page, 5);
    await page.click(NEXT);
    expect(await visibleStep(page)).toBe(5);
    await expect(page.locator('[data-sz="contact-need-error"]')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('need-google');
    await page.check('#need-unsure', { force: true });
    await expect(page.locator('[data-sz="contact-need-error"]')).toBeHidden();
    await page.click(NEXT);
    await expect.poll(() => visibleStep(page)).toBe(6);
  });

  test('Back keeps values and hides on step 1', async ({ page }) => {
    await toStep(page, 4);
    await page.fill('#contact-website', 'https://example.com');
    await page.click(NEXT);
    await page.check('#need-care', { force: true });
    await page.click(NEXT);
    await expect.poll(() => visibleStep(page)).toBe(6);
    await page.click('[data-sz="contact-back"]');
    await page.click('[data-sz="contact-back"]');
    await expect.poll(() => visibleStep(page)).toBe(4);
    await expect(page.locator('#contact-website')).toHaveValue('https://example.com');
    for (let s = 4; s > 1; s -= 1) await page.click('[data-sz="contact-back"]');
    expect(await visibleStep(page)).toBe(1);
    await expect(page.locator('[data-sz="contact-back"]')).toBeHidden();
    await expect(page.locator('#contact-name')).toHaveValue('Acceptance Test');
  });

  test('submit shows only on step 6 with the brand text', async ({ page }) => {
    await toStep(page, 6);
    const submit = page.locator(`${ROOT} form [type=submit]`);
    await expect(submit).toBeVisible();
    await expect(submit).toHaveValue('Send it over');
    await expect(submit).toHaveAttribute('data-wait', 'Sending…');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('contact-message');
  });

  for (const width of [1440, 390]) {
    test(`footer stays still across steps at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const tops = [];
      const top = () => page.$eval(FOOTER, (el) => el.getBoundingClientRect().top + window.scrollY);
      for (let s = 1; s <= 6; s += 1) {
        if (s > 1) await open(page);
        await toStep(page, s);
        tops.push(await top());
      }
      const spread = Math.max(...tops) - Math.min(...tops);
      expect(spread).toBeLessThanOrEqual(1);
    });
  }

  test('mocked success focuses Got it and fills all six segments', async ({ page }) => {
    await page.route(FORM_API, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"msg":"ok"}' }));
    await toStep(page, 6);
    await page.click(`${ROOT} form [type=submit]`);
    await expect(page.locator(`${ROOT} .w-form-done`)).toBeVisible({ timeout: 10000 });
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-sz'))).toBe('contact-done');
    await expect(page.locator('[data-sz="contact-segment"].is-active')).toHaveCount(6);
  });

  test('mocked failure focuses the fail heading', async ({ page }) => {
    await page.route(FORM_API, (route) => route.fulfill({ status: 500, body: 'error' }));
    await toStep(page, 6);
    await page.click(`${ROOT} form [type=submit]`);
    await expect(page.locator(`${ROOT} .w-form-fail`)).toBeVisible({ timeout: 10000 });
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-sz'))).toBe('contact-fail');
    await expect(page.locator(`${ROOT} .w-form-fail [role="alert"]`)).toHaveCount(1);
  });

  test('page load does not move focus into the form', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    if (LOCAL) await page.addScriptTag({ path: MODULE });
    await expect(page.locator(ROOT)).toHaveClass(/is-steps/, { timeout: 5000 });
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  test('chips have unique names', async ({ page }) => {
    const names = await page.locator(`${ROOT} input[type=checkbox]`).evaluateAll((els) => els.map((el) => el.name));
    expect(names).toEqual(['need-google', 'need-website', 'need-bookings', 'need-care', 'need-unsure']);
  });

  test('attribution fields still injected', async ({ page }) => {
    await expect(page.locator(`${ROOT} form input[type=hidden][name="utm_source"]`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} form input[type=hidden][name="conversion_page"]`)).toHaveCount(1);
  });

  test('no serious axe violations in the contact section', async ({ page }) => {
    const results = await new AxeBuilder({ page }).include('#contact').analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(bad.map((v) => v.id)).toEqual([]);
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await open(page);
    await toStep(page, 6);
    expect(errors).toEqual([]);
  });
});

test.describe('sz-contact-steps reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion turns off the step fade', async ({ page }) => {
    await open(page);
    await page.fill('#contact-name', 'Acceptance Test');
    await page.click(NEXT);
    const animation = await page.$eval(`${STEPS}:not([hidden])`, (el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });
});

test.describe('sz-contact-steps without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('stacked fallback with JavaScript disabled', async ({ page }) => {
    await page.goto(`${BASE}/#contact`, { waitUntil: 'load' });
    await expect(page.locator(`${STEPS}:visible`)).toHaveCount(6);
    await expect(page.locator('[data-sz-steps-only]:visible')).toHaveCount(0);
    await expect(page.locator(`${ROOT} form [type=submit]`)).toBeVisible();
  });
});
