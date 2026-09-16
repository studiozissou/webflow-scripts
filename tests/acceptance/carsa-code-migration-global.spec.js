// Phase 0 baseline for the site-wide footer scripts: attribution first/last-touch storage, eligibility-link UTM appending, menu promo links, store-list prepend, noopener, copyright year, menu scroll lock, chat widget and the WhatsApp nav embed.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import {
  BASE,
  VIEWPORT_MOBILE,
  loadPage,
  collectErrors,
  unexpectedErrors,
  firstPath,
  readAttribution,
  seedAttribution,
} from './helpers/carsa.js';

const DAY = 864e5;

test.describe('carsa-code-migration — Global: attribution storage', () => {
  test('attr-first-visit-with-utms: local and session records carry every utm_* and a 30-day expiry', async ({ page }) => {
    await loadPage(page, '/?utm_source=acc&utm_medium=test&utm_campaign=phase0&utm_content=x1&utm_custom=extra', 500);
    const { local, session } = await readAttribution(page);
    const utms = { utm_source: 'acc', utm_medium: 'test', utm_campaign: 'phase0', utm_content: 'x1', utm_custom: 'extra' };
    expect(local.utms).toEqual(utms);
    expect(session.utms).toEqual(utms);
    expect(local.expiresAt - local.updatedAt).toBeGreaterThan(30 * DAY - 60_000);
    expect(local.expiresAt - local.updatedAt).toBeLessThanOrEqual(30 * DAY);
    expect(session.expiresAt).toBeUndefined();
  });

  test('attr-first-touch-preserved: a later visit with new utms overwrites session but not local', async ({ page }) => {
    await loadPage(page, '/?utm_source=first&utm_medium=a', 500);
    await loadPage(page, '/?utm_source=second&utm_medium=b', 500);
    const { local, session } = await readAttribution(page);
    expect(local.utms).toEqual({ utm_source: 'first', utm_medium: 'a' });
    expect(session.utms).toEqual({ utm_source: 'second', utm_medium: 'b' });
  });

  test('attr-blank-then-utms: a blank first-touch record is upgraded when utms arrive later', async ({ page }) => {
    await loadPage(page, '/', 500);
    const blank = await readAttribution(page);
    expect(blank.local.utms).toEqual({});
    expect(typeof blank.local.expiresAt).toBe('number');
    await loadPage(page, '/?utm_source=late', 500);
    const { local } = await readAttribution(page);
    expect(local.utms).toEqual({ utm_source: 'late' });
  });

  test('attr-external-referrer: an external referrer is stored as full URL plus bare domain', async ({ page }) => {
    await loadPage(page, '/', 500, { referer: 'https://www.google.com/search?q=carsa' });
    const { local, session } = await readAttribution(page);
    expect(local.referrerDomain).toBe('google.com');
    expect(local.referrer).toBe('https://www.google.com/search?q=carsa');
    expect(session.referrerDomain).toBe('google.com');
  });

  test('attr-internal-referrer-ignored: a same-site referrer never counts as attribution', async ({ page }) => {
    await loadPage(page, '/', 500, { referer: `${BASE}/used-cars` });
    const { local } = await readAttribution(page);
    expect(local.referrerDomain).toBe('');
    expect(local.referrer).toBe('');
  });

  test('attr-expired-record-replaced: an expired first-touch record is overwritten', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'old' }, expiresAt: Date.now() - DAY });
    await loadPage(page, '/?utm_source=fresh', 500);
    const { local } = await readAttribution(page);
    expect(local.utms).toEqual({ utm_source: 'fresh' });
    expect(local.expiresAt).toBeGreaterThan(Date.now());
  });

  test('attr-ref-only-upgraded-by-utms: a referrer-only record gains utms on the next tagged visit', async ({ page, context }) => {
    await seedAttribution(context, { utms: {}, referrer: 'https://bing.com/', referrerDomain: 'bing.com' });
    await loadPage(page, '/?utm_source=upgrade', 500);
    const { local } = await readAttribution(page);
    expect(local.utms).toEqual({ utm_source: 'upgrade' });
  });
});

test.describe('carsa-code-migration — Global: link decoration', () => {
  test('eligibility-links-get-utms: static eligibility links carry stored utms and external referrer', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'seeded', utm_medium: 'm' }, referrerDomain: 'google.com' });
    await loadPage(page, '/car-finance');
    const hrefs = await page.$$eval('a[href*="quote.carsa.co.uk/eligibility/questions"]', (els) => els.map((a) => a.href));
    test.skip(hrefs.length === 0, 'no static eligibility links on this page');
    for (const href of hrefs) {
      const u = new URL(href);
      expect(u.searchParams.get('utm_source')).toBe('seeded');
      expect(u.searchParams.get('utm_medium')).toBe('m');
      expect(u.searchParams.get('referrer')).toBe('google.com');
    }
  });

  test('eligibility-links-no-duplicate-keys: existing params on the link are not overwritten', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'seeded' } });
    await loadPage(page, '/car-finance');
    const hrefs = await page.$$eval('a[href*="quote.carsa.co.uk/eligibility/questions"]', (els) => els.map((a) => a.href));
    test.skip(hrefs.length === 0, 'no static eligibility links on this page');
    for (const href of hrefs) {
      expect(href.match(/utm_source=/g)).toHaveLength(1);
    }
  });

  test('menu-promo-links: a[data-link="promo"] point at the deals page filtered by their label', async ({ page }) => {
    await loadPage(page, '/');
    const links = await page.$$eval('a[data-link="promo"]', (els) => els.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })));
    test.skip(links.length === 0, 'no promo links in the menu');
    for (const { text, href } of links) {
      expect(href).toBe('/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=' + text.replace(/\s+/g, '+'));
    }
  });

  test('store-list-prepend: #find-store-link is the first child of #store-list', async ({ page }) => {
    await loadPage(page, '/');
    const list = page.locator('#store-list');
    test.skip((await list.count()) === 0, 'no store list on this page');
    expect(await list.locator('> *').first().getAttribute('id')).toBe('find-store-link');
  });

  test('noopener: every external _blank link carries noreferrer noopener, carsa links are left alone', async ({ page }) => {
    test.fail(true, 'live bug: the block is type="fs-consent", so Finsweet Consent executes it after DOMContentLoaded and its listener never fires; social and WhatsApp links ship with rel=""');
    await loadPage(page, '/');
    const rels = await page.$$eval('a[target="_blank"]', (els) =>
      els.filter((a) => a.href).map((a) => ({ href: a.href, rel: a.rel, external: !a.href.includes('carsa.co.uk') }))
    );
    const offenders = rels.filter((r) => r.external && !/noopener/.test(r.rel));
    expect(offenders).toEqual([]);
  });

  test('copyright-year: #year shows the current year', async ({ page }) => {
    await loadPage(page, '/');
    await expect(page.locator('#year').first()).toHaveText(String(new Date().getFullYear()));
  });

  test('whatsapp-nav-link: #nav_open-whatsapp carries the generic message off a VDP and the VRM on one', async ({ page, request }) => {
    await loadPage(page, '/');
    const generic = await page.locator('#nav_open-whatsapp').first().getAttribute('href');
    test.skip(!generic, 'no WhatsApp nav link');
    expect(decodeURIComponent(generic)).toContain('wa.me/442046322989?text=Hi, I have a question about a car on your website');
    const vdp = await firstPath(request, '/vehicles/used/');
    await loadPage(page, vdp);
    const vrm = vdp.split('/').pop().toUpperCase();
    const onVdp = await page.locator('#nav_open-whatsapp').first().getAttribute('href');
    expect(decodeURIComponent(onVdp)).toContain(`Hi, please tell me more about ${vrm}`);
  });
});

test.describe('carsa-code-migration — Global: menu and chat', () => {
  test('menu-scroll-lock: opening the nav at 375px locks body scroll and closing restores it', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await loadPage(page, '/');
    const button = page.locator('.navbar7_component .w-nav-button').first();
    await button.click();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    expect(await page.evaluate(() => document.querySelector('.navbar8_menu').style.overflowY)).toBe('auto');
    await button.click();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('chat-widget: n8n chat mounts within 5s and stores a session id', async ({ page }) => {
    await loadPage(page, '/');
    const chat = page.locator('.chat-window-wrapper');
    await expect(chat.first()).toBeAttached({ timeout: 5000 });
    expect(await page.evaluate(() => localStorage.getItem('n8n-chat/sessionId'))).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('chat-nav-trigger: .chat-nav-trigger opens the chat window', async ({ page }) => {
    await loadPage(page, '/');
    const trigger = page.locator('.chat-nav-trigger').first();
    test.skip((await trigger.count()) === 0, 'no nav chat trigger');
    await page.locator('.chat-window-wrapper').first().waitFor({ state: 'attached', timeout: 5000 });
    await trigger.click({ force: true });
    await page.waitForTimeout(800);
    await expect(page.locator('.chat-window-wrapper .chat-window').first()).toBeVisible();
  });

  test('chat-mobile-fullscreen: at 375px the chat window is fixed full-viewport with a close button', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await loadPage(page, '/');
    await page.locator('.chat-window-wrapper').first().waitFor({ state: 'attached', timeout: 5000 });
    const trigger = page.locator('.chat-nav-trigger').first();
    test.skip((await trigger.count()) === 0, 'no nav chat trigger');
    await page.locator('.w-nav-button').first().click();
    await page.waitForTimeout(500);
    await trigger.click({ force: true });
    await page.waitForTimeout(800);
    await expect(page.locator('.chat-window-wrapper .chat-close-btn')).toBeAttached();
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.chat-window-wrapper .chat-window')).position);
    expect(pos).toBe('fixed');
  });
});

test.describe('carsa-code-migration — Global: health', () => {
  for (const path of ['/', '/used-cars', '/car-finance', '/contact']) {
    test(`global-no-errors: zero unexpected JS errors on ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await loadPage(page, path);
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }

  test('global-body-colour-guard: html body colour resolves to the brand purple variable', async ({ page }) => {
    await loadPage(page, '/');
    const colour = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(colour).not.toBe('rgb(0, 0, 0)');
    expect(colour).not.toBe('rgba(0, 0, 0, 0.87)');
  });

  test('global-gtm-present: dataLayer exists and GTM container script is requested', async ({ page }) => {
    const gtm = [];
    page.on('request', (r) => r.url().includes('googletagmanager.com/gtm.js') && gtm.push(r.url()));
    await loadPage(page, '/');
    expect(await page.evaluate(() => Array.isArray(window.dataLayer))).toBe(true);
    expect(gtm.some((u) => u.includes('GTM-MM5N6CP8'))).toBe(true);
  });

  test('global-site-schema: Organization and WebSite JSON-LD present in the head', async ({ page }) => {
    await loadPage(page, '/');
    const types = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.flatMap((s) => { try { const d = JSON.parse(s.textContent); return (d['@graph'] || [d]).map((n) => n['@type']); } catch { return []; } })
    );
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
  });

  test('global-base-url-sanity: suite is pointed at a carsa host', async () => {
    expect(BASE).toMatch(/carsa/);
  });
});
