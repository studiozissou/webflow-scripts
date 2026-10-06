// Acceptance tests for oost-lighthouse-performance: Zenchef loads after page load or on Reserveer intent, never auto-opens, opens from every Reserveer button, and the loader no longer blocks rendering; skipped until OOST_PERF=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://oosteten.webflow.io';
const ZENCHEF = /zenchef\.com|awswaf\.com/;
const TRIGGER = '[data-zc-action="open"], [data-formitable="open"]';
const NAV_TRIGGER = `nav ${TRIGGER.split(', ').join(', nav ')}`;
const HERO_TRIGGER = `.hero_content ${TRIGGER.split(', ').join(', .hero_content ')}`;
const WIDGET_IFRAME = 'iframe[src*="bookings.zenchef.com"]';

test.skip(process.env.OOST_PERF !== '1', 'set OOST_PERF=1 once lazy Zenchef is on staging');

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function widgetOpen(page) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].some((f) => {
      const r = f.getBoundingClientRect();
      const s = getComputedStyle(f);
      return r.width > 200 && r.height > 300 && s.visibility !== 'hidden' && s.display !== 'none';
    });
  }, WIDGET_IFRAME);
}

test.describe('oost-lighthouse-performance', () => {
  test('no Zenchef request before load event + 1.5s', async ({ page }) => {
    const early = [];
    let loadedAt = null;
    page.on('request', (req) => {
      if (ZENCHEF.test(req.url()) && (loadedAt === null || Date.now() < loadedAt + 1500))
        early.push(req.url());
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    loadedAt = Date.now();
    await page.waitForTimeout(1400);
    expect(early).toEqual([]);
  });

  test('widget does not open by itself within 6s', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    expect(await widgetOpen(page)).toBe(false);
  });

  test('zc-widget-config has no data-open attribute', async ({ page }) => {
    await page.goto(BASE + '/');
    const config = page.locator('.zc-widget-config');
    await expect(config).toHaveCount(1);
    expect(await config.getAttribute('data-open')).toBeNull();
  });

  test('nav Reserveer opens the Zenchef widget on an early tap', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.locator(NAV_TRIGGER).first().click();
    await expect.poll(() => widgetOpen(page), { timeout: 10_000 }).toBe(true);
  });

  test('hero Reserveer opens the widget after the idle preload', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.locator(HERO_TRIGGER).first().click();
    await expect.poll(() => widgetOpen(page), { timeout: 4000 }).toBe(true);
  });

  test('SDK script is injected exactly once', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    const trigger = page.locator(TRIGGER).first();
    await trigger.hover();
    await trigger.focus();
    await page.waitForTimeout(4000);
    expect(await page.locator('script#zenchef-sdk').count()).toBe(1);
  });

  test('Reserveer does not add #reserveer to the URL', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.locator(TRIGGER).first().click();
    await page.waitForTimeout(1000);
    expect(new URL(page.url()).hash).not.toBe('#reserveer');
  });

  test('EN home: Reserveer opens the widget', async ({ page }) => {
    await page.goto(BASE + '/en/', { waitUntil: 'load' });
    await page.locator(TRIGGER).first().click();
    await expect.poll(() => widgetOpen(page), { timeout: 10_000 }).toBe(true);
  });

  test('init.js tag is deferred and no lenis.css stylesheet is requested', async ({ page }) => {
    const css = [];
    page.on('request', (req) => {
      if (req.url().includes('lenis') && req.url().endsWith('.css')) css.push(req.url());
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    const deferred = await page
      .locator('script[src*="/projects/oost/init.js"]')
      .evaluate((el) => el.defer);
    expect(deferred).toBe(true);
    expect(css).toEqual([]);
  });

  test('mobile CLS stays under 0.1 for 6s after load', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.1);
  });

  for (const path of ['/', '/en/']) {
    test(`no page errors on ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(BASE + path, { waitUntil: 'load' });
      await page.waitForTimeout(4000);
      expect(errors).toEqual([]);
    });
  }
});
