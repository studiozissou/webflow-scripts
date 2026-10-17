// Acceptance tests for sz-posthog-experiments: cookieless PostHog on every page, story and locale tagging, CTA, section and lead events, and the shared experiment runner driven by a fake window.posthog; skipped until SZ_REDESIGN=1 and SZ_POSTHOG=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.STAGING_URL || 'https://studiozissou.webflow.io').replace(/\/$/, '');
const STORY = '[data-sz-story]';
const FRAME_START = '[data-sz="frame-start"]';
const CTA = '[data-sz-cta]';
const FLAG = 'exp-home-story';

test.skip(!process.env.SZ_REDESIGN || !process.env.SZ_POSTHOG, 'Set SZ_REDESIGN=1 and SZ_POSTHOG=1 once PostHog and the story slot are on staging');

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function fakePosthog(page, flags = {}) {
  await page.route(/posthog\.com/, (route) => route.abort());
  await page.addInitScript((f) => {
    if (self !== top) return;
    const calls = { capture: [], register: [], getFeatureFlag: [], personProps: [] };
    window.__phCalls = calls;
    const fake = {
      __loaded: true,
      featureFlags: { getFlags: () => Object.keys(f) },
      getFeatureFlag: (k) => {
        calls.getFeatureFlag.push(k);
        return k in f ? f[k].variant : undefined;
      },
      getFeatureFlagPayload: (k) => (k in f ? f[k].payload : undefined),
      onFeatureFlags: (cb) => {
        setTimeout(() => cb(Object.keys(f)), 0);
        return () => {};
      },
      capture: (event, props) => calls.capture.push({ event, props }),
      register: (props) => calls.register.push(props),
      setPersonPropertiesForFlags: (props) => calls.personProps.push(props),
    };
    Object.defineProperty(window, 'posthog', { get: () => fake, set: () => {}, configurable: true });
  }, flags);
}

async function captured(page, event) {
  return page.evaluate((e) => window.__phCalls.capture.filter((c) => c.event === e), event);
}

async function addSecondStory(page) {
  await page.evaluate((sel) => {
    const first = document.querySelector(sel);
    first.setAttribute('data-sz-story', 'd');
    const clone = first.cloneNode(true);
    clone.setAttribute('data-sz-story', 'c');
    clone.style.display = 'none';
    first.after(clone);
  }, STORY);
}

const SWAP_PAYLOAD = {
  ops: [
    { selector: '[data-sz-story="c"]', action: 'show' },
    { selector: '[data-sz-story="d"]', action: 'hide' },
  ],
};

test.describe('sz-posthog-experiments — snippet', () => {
  test('home-no-errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    expect(errors).toEqual([]);
  });

  test('posthog-loads-cookieless', async ({ page }) => {
    const hit = page.waitForRequest(/eu\.i\.posthog\.com/, { timeout: 15000 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await hit;
    await expect.poll(() => page.evaluate(() => window.posthog && window.posthog.__loaded === true)).toBe(true);
  });

  test('no-posthog-storage', async ({ page, context }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(8000);
    const cookies = await context.cookies();
    expect(cookies.filter((c) => c.name.startsWith('ph_'))).toEqual([]);
    const keys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
    expect(keys.filter((k) => k.startsWith('ph_'))).toEqual([]);
  });

  test('story-visible-without-flags', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await expect(page.locator(STORY).first()).toBeVisible({ timeout: 1000 });
    const attrs = await page.evaluate(() => document.documentElement.getAttributeNames().filter((n) => n.startsWith('data-exp-')));
    expect(attrs).toEqual([]);
  });
});

test.describe('sz-posthog-experiments — runner', () => {
  test('runner-present', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await expect.poll(() => page.evaluate(() => typeof window.__EXPERIMENTS?.version)).toBe('string');
  });

  test('runner-noop-without-posthog', async ({ page }) => {
    await page.route(/posthog\.com/, (route) => route.abort());
    const errors = trackErrors(page);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    expect(await page.locator('#experiments').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('runner-show-op-swaps-story', async ({ page }) => {
    await fakePosthog(page, { [FLAG]: { variant: 'test', payload: SWAP_PAYLOAD } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await addSecondStory(page);
    await expect(page.locator('[data-sz-story="c"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-sz-story="d"]')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-exp-home-story', 'test');
    expect(await page.locator('#experiments').count()).toBe(1);
  });

  test('runner-control-noop', async ({ page }) => {
    await fakePosthog(page, { [FLAG]: { variant: 'control', payload: {} } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await expect(page.locator('html')).toHaveAttribute('data-exp-home-story', 'control', { timeout: 5000 });
    await expect(page.locator(STORY).first()).toBeVisible();
    const css = await page.evaluate(() => document.getElementById('experiments')?.textContent || '');
    expect(css).not.toContain('data-exp-home-story="control"');
  });

  test('runner-ignores-bad-payload', async ({ page }) => {
    await fakePosthog(page, { [FLAG]: { variant: 'test', payload: '{not json' } });
    const errors = trackErrors(page);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    await expect(page.locator(STORY).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('runner-non-exp-flags-ignored', async ({ page }) => {
    await fakePosthog(page, { 'product-flag': { variant: 'test', payload: { ops: [{ selector: STORY, action: 'hide' }] } } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    await expect(page.locator(STORY).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-exp-flag'))).toBe(false);
  });

  test('runner-exposure-recorded', async ({ page }) => {
    await fakePosthog(page, { [FLAG]: { variant: 'test', payload: SWAP_PAYLOAD } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await expect.poll(() => page.evaluate((k) => window.__phCalls.getFeatureFlag.includes(k), FLAG)).toBe(true);
    const exposures = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === 'experiment_exposure'));
    expect(exposures).toHaveLength(1);
    expect(exposures[0]).toMatchObject({ exp_flag: FLAG, exp_variant: 'test' });
  });

  test('runner-preview-flag', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/?exp-preview=1`, { waitUntil: 'networkidle', timeout: 45000 });
    await expect.poll(() => page.evaluate(() => window.__phCalls.personProps)).toContainEqual({ exp_preview: 'yes' });
  });
});

test.describe('sz-posthog-experiments — tracking', () => {
  test('tracking-registers-story-and-locale', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    const key = await page.locator(STORY).first().getAttribute('data-sz-story');
    await expect.poll(() => page.evaluate(() => window.__phCalls.register)).toContainEqual(expect.objectContaining({ story: key, locale: 'en' }));
  });

  test('tracking-cta-click', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate((sel) => {
      const cta = document.querySelector(sel);
      cta.addEventListener('click', (e) => e.preventDefault(), { once: true });
      cta.click();
    }, CTA);
    await expect.poll(async () => (await captured(page, 'cta_click')).length).toBe(1);
  });

  test('tracking-section-reached-once', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.locator(FRAME_START).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(FRAME_START).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await captured(page, 'story_section_reached')).length).toBe(1);
  });

  test('tracking-lead-submitted', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(() => {
      const done = document.querySelector('.w-form-done');
      done.style.display = 'block';
      done.previousElementSibling && (done.previousElementSibling.style.display = 'none');
    });
    await expect.poll(async () => (await captured(page, 'lead_submitted')).length).toBe(1);
  });

  test('nl-home-registers-nl-locale', async ({ page }) => {
    await fakePosthog(page, {});
    await page.goto(`${BASE}/nl`, { waitUntil: 'networkidle', timeout: 45000 });
    await expect.poll(() => page.evaluate(() => window.__phCalls.register)).toContainEqual(expect.objectContaining({ locale: 'nl' }));
  });
});
