// Acceptance tests for the Carsa PostHog experiment runner and consent-gated snippet; a fake window.posthog makes variants deterministic.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { BASE, VIEWPORT_MOBILE, loadPage, collectErrors, unexpectedErrors } from './helpers/carsa.js';

dotenv.config({ path: '.env.test' });

const SRP = '/used-cars';
const FLAG = 'exp-srp-hide-view-car';
const BUTTON = '.car-card .button.is-view';
const HIDE_PAYLOAD = { ops: [{ selector: BUTTON, action: 'hide' }] };
const ACCEPT = '[fs-cc="allow"], [fs-consent-element="allow"], [fs-cc-checkbox="allow"]';

async function fakePosthog(context, flags) {
  await context.addInitScript((f) => {
    if (self !== top) return;
    const calls = { capture: [], personProps: [] };
    window.__phCalls = calls;
    window.posthog = {
      __loaded: true,
      featureFlags: { getFlags: () => Object.keys(f) },
      getFeatureFlag: (k) => (k in f ? f[k].variant : undefined),
      getFeatureFlagPayload: (k) => (k in f ? f[k].payload : undefined),
      onFeatureFlags: (cb) => { setTimeout(() => cb(Object.keys(f)), 0); return () => {}; },
      capture: (event, props) => calls.capture.push({ event, props }),
      setPersonPropertiesForFlags: (p) => calls.personProps.push(p),
    };
  }, flags);
}

async function waitForCards(page) {
  await page.locator('.car-card').first().waitFor({ state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(1000);
}

async function visibleButtons(page) {
  return page.$$eval(BUTTON, (els) => els.filter((el) => getComputedStyle(el).display !== 'none').length);
}

test.describe('carsa-ab-testing-posthog — consent gating (real snippet)', () => {
  test('srp-no-errors: /used-cars loads with no unexpected JS errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, SRP);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('snippet-gated-before-consent: no PostHog request or global before the banner is answered', async ({ page }) => {
    const hits = [];
    page.on('request', (r) => { if (/posthog\.com/.test(r.url())) hits.push(r.url()); });
    await loadPage(page, SRP, 4000);
    expect(hits).toEqual([]);
    expect(await page.evaluate(() => typeof window.posthog)).toBe('undefined');
  });

  test('snippet-loads-after-consent: accepting cookies loads PostHog from the EU host', async ({ page }) => {
    await loadPage(page, SRP);
    const req = page.waitForRequest((r) => /eu\.i\.posthog\.com/.test(r.url()), { timeout: 10_000 });
    await page.locator(ACCEPT).first().click();
    await req;
    await expect.poll(() => page.evaluate(() => !!(window.posthog && window.posthog.__loaded)), { timeout: 10_000 }).toBe(true);
  });
});

test.describe('carsa-ab-testing-posthog — runner (fake PostHog)', () => {
  test('runner-present: the runner exposes its debug surface on the homepage and SRP', async ({ page }) => {
    for (const path of ['/', SRP]) {
      await loadPage(page, path);
      expect(await page.evaluate(() => typeof (window.__CARSA_EXPERIMENTS || {}).version)).toBe('string');
    }
  });

  test('runner-noop-without-posthog: no attribute and no stylesheet when PostHog never loads', async ({ page }) => {
    await loadPage(page, SRP, 3000);
    const attrs = await page.evaluate(() => [...document.documentElement.attributes].map((a) => a.name).filter((n) => n.startsWith('data-exp-')));
    expect(attrs).toEqual([]);
    expect(await page.locator('#carsa-experiments').count()).toBe(0);
  });

  test('runner-hide-op-applies: the test variant hides every View car button', async ({ page, context }) => {
    await fakePosthog(context, { [FLAG]: { variant: 'test', payload: HIDE_PAYLOAD } });
    await loadPage(page, SRP);
    await waitForCards(page);
    expect(await page.locator(BUTTON).count()).toBeGreaterThan(0);
    expect(await visibleButtons(page)).toBe(0);
    expect(await page.getAttribute('html', 'data-exp-srp-hide-view-car')).toBe('test');
    expect(await page.locator('#carsa-experiments').textContent()).toContain('.is-view');
  });

  test('runner-hide-op-mobile: the hide op also applies at 375px', async ({ page, context }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await fakePosthog(context, { [FLAG]: { variant: 'test', payload: HIDE_PAYLOAD } });
    await loadPage(page, SRP);
    await waitForCards(page);
    expect(await visibleButtons(page)).toBe(0);
  });

  test('runner-control-noop: control keeps the buttons and adds no rule', async ({ page, context }) => {
    await fakePosthog(context, { [FLAG]: { variant: 'control', payload: {} } });
    await loadPage(page, SRP);
    await waitForCards(page);
    expect(await visibleButtons(page)).toBeGreaterThan(0);
    expect(await page.getAttribute('html', 'data-exp-srp-hide-view-car')).toBe('control');
    const css = (await page.locator('#carsa-experiments').count()) ? await page.locator('#carsa-experiments').textContent() : '';
    expect(css).not.toContain('.is-view');
  });

  test('runner-late-cards: cards injected after apply are hidden too', async ({ page, context }) => {
    await fakePosthog(context, { [FLAG]: { variant: 'test', payload: HIDE_PAYLOAD } });
    await loadPage(page, SRP);
    await waitForCards(page);
    await page.evaluate(() => {
      const card = document.querySelector('.car-card');
      card.parentElement.appendChild(card.cloneNode(true));
    });
    await page.waitForTimeout(500);
    expect(await visibleButtons(page)).toBe(0);
  });

  test('runner-ignores-bad-payload: invalid JSON is skipped without errors', async ({ page, context }) => {
    const errors = collectErrors(page);
    await fakePosthog(context, { [FLAG]: { variant: 'test', payload: '{not json' } });
    await loadPage(page, SRP);
    await waitForCards(page);
    expect(unexpectedErrors(errors)).toEqual([]);
    expect(await visibleButtons(page)).toBeGreaterThan(0);
  });

  test('runner-exposure-datalayer: one experiment_exposure push per flag', async ({ page, context }) => {
    await fakePosthog(context, { [FLAG]: { variant: 'test', payload: HIDE_PAYLOAD } });
    await loadPage(page, SRP);
    await waitForCards(page);
    const pushes = await page.evaluate((f) => (window.dataLayer || []).filter((e) => e && e.event === 'experiment_exposure' && e.exp_flag === f), FLAG);
    expect(pushes).toHaveLength(1);
    expect(pushes[0].exp_variant).toBe('test');
  });

  test('runner-card-click-capture: clicking a card sends card_click with the VDP href', async ({ page, context }) => {
    await fakePosthog(context, { [FLAG]: { variant: 'control', payload: {} } });
    await loadPage(page, SRP);
    await waitForCards(page);
    await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true));
    await page.evaluate(() => document.querySelector('.car-card a[href*="/vehicles/used/"], a.car-card[href*="/vehicles/used/"], .car-card').click());
    const calls = await page.evaluate(() => window.__phCalls.capture.filter((c) => c.event === 'card_click'));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].props.href).toContain('/vehicles/used/');
  });

  test('runner-preview-flag: ?exp-preview=1 sets the exp_preview person property', async ({ page, context }) => {
    await fakePosthog(context, {});
    await loadPage(page, `${SRP}?exp-preview=1`);
    const props = await page.evaluate(() => window.__phCalls.personProps);
    expect(props).toContainEqual(expect.objectContaining({ exp_preview: 'yes' }));
  });

  test('runner-non-exp-flags-ignored: flags without the exp- prefix are untouched', async ({ page, context }) => {
    await fakePosthog(context, { 'product-flag': { variant: 'test', payload: HIDE_PAYLOAD } });
    await loadPage(page, SRP);
    await waitForCards(page);
    expect(await page.getAttribute('html', 'data-exp-product-flag')).toBeNull();
    expect(await visibleButtons(page)).toBeGreaterThan(0);
  });
});
