// Acceptance tests for oost-consent-ga-performance: GA4 stays off until analytics consent, the Consent Mode default is denied before ConsentPro, and the two hero fonts are preloaded and used; skipped until OOST_CONSENT=1.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://oosteten.webflow.io';
const GA = /googletagmanager\.com|google-analytics\.com|\/g\/collect/;
const COLLECT = /google-analytics\.com\/g\/collect/;
const GA_ID = 'G-6Y731MKYLH';
const FONTS = ['PPWriter-Thin.woff2', 'PPMuseum-Regular.woff2'];

test.skip(
  process.env.OOST_CONSENT !== '1',
  'set OOST_CONSENT=1 once the consent head code is on staging',
);

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

function collectGaRequests(page) {
  const urls = [];
  page.on('request', (req) => {
    if (GA.test(req.url())) urls.push(req.url());
  });
  return urls;
}

async function gaCookies(context) {
  return (await context.cookies()).filter((c) => c.name.startsWith('_ga'));
}

async function banner(page) {
  const accept = page.getByRole('button', { name: /^(Accepteren|Accept)$/ });
  await expect(accept).toBeVisible({ timeout: 10_000 });
  return {
    accept,
    deny: page.getByRole('button', { name: /^(Weigeren|Deny|Reject)$/ }),
  };
}

test.describe('oost-consent-ga-performance', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15_000);
  });

  test('no GA request and no _ga cookie before the visitor chooses', async ({
    page,
    context,
  }) => {
    const ga = collectGaRequests(page);
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await banner(page);
    await page.waitForTimeout(5_000);
    expect(ga).toEqual([]);
    expect(await gaCookies(context)).toEqual([]);
  });

  test('the GA tags are marked fs-consent analytics and never load as plain scripts', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const tags = await page.$$eval('script', (scripts) =>
      scripts
        .filter((s) => (s.src + s.textContent).includes('G-6Y731MKYLH'))
        .map((s) => ({
          type: s.getAttribute('type'),
          category: s.getAttribute('fs-consent-categories'),
          async: s.hasAttribute('async'),
        })),
    );
    expect(tags.length).toBe(2);
    for (const tag of tags) {
      expect(tag).toEqual({ type: 'fs-consent', category: 'analytics', async: false });
    }
  });

  test('the Consent Mode default is denied and comes before ConsentPro', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const order = await page.evaluate(() => {
      const scripts = [...document.head.querySelectorAll('script')];
      const def = scripts.findIndex((s) =>
        /gtag\('consent',\s*'default'/.test(s.textContent),
      );
      const cp = scripts.findIndex((s) => s.getAttribute('finsweet') === 'consentpro');
      const entry = (window.dataLayer || []).find(
        (e) => e && e[0] === 'consent' && e[1] === 'default',
      );
      return { def, cp, entry: entry ? Object.assign({}, entry[2]) : null };
    });
    expect(order.def).toBeGreaterThanOrEqual(0);
    expect(order.def).toBeLessThan(order.cp);
    expect(order.entry).toMatchObject({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });

  test('Accepteren loads gtag and sends a GA4 hit with analytics granted and ads denied', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const { accept } = await banner(page);
    const hit = page.waitForRequest(COLLECT, { timeout: 15_000 });
    await accept.click();
    const url = new URL((await hit).url());
    expect(url.searchParams.get('tid')).toBe(GA_ID);
    expect(url.searchParams.get('gcs')).toBe('G101');
  });

  test('Weigeren keeps GA off, including after a reload', async ({ page, context }) => {
    const ga = collectGaRequests(page);
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const { deny } = await banner(page);
    await deny.click();
    await page.waitForTimeout(3_000);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5_000);
    expect(ga).toEqual([]);
    expect(await gaCookies(context)).toEqual([]);
  });

  test('a returning visitor who accepted gets GA on load without the banner', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const { accept } = await banner(page);
    await accept.click();
    await page.waitForTimeout(2_000);
    const hit = page.waitForRequest(COLLECT, { timeout: 15_000 });
    await page.reload({ waitUntil: 'load' });
    await hit;
    await expect(
      page.getByRole('button', { name: /^(Accepteren|Accept)$/ }),
    ).toBeHidden();
  });

  test('the two hero fonts are preloaded with crossorigin and used', async ({ page }) => {
    const warnings = [];
    page.on('console', (msg) => {
      if (/preloaded using link preload but not used/i.test(msg.text()))
        warnings.push(msg.text());
    });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const preloads = await page.$$eval('link[rel="preload"][as="font"]', (links) =>
      links.map((l) => ({
        href: l.href,
        type: l.type,
        crossorigin: l.hasAttribute('crossorigin'),
      })),
    );
    for (const file of FONTS) {
      const link = preloads.find((p) => p.href.endsWith(file));
      expect(link, file).toBeTruthy();
      expect(link).toMatchObject({ type: 'font/woff2', crossorigin: true });
    }
    await page.waitForTimeout(4_000);
    expect(warnings).toEqual([]);
  });

  test('ConsentPro and the font host are preconnected', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const hosts = await page.$$eval('link[rel="preconnect"]', (links) =>
      links.map((l) => new URL(l.href).host),
    );
    expect(hosts).toContain('api.consentpro.com');
    expect(hosts).toContain('webflow-files-prod.global.ssl.fastly.net');
  });

  test('the cookie banner still sits above the Zenchef button on phones', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await banner(page);
    const iframe = page.locator('iframe[src^="https://bookings.zenchef.com"]');
    await expect(iframe).toHaveClass(/oost-zc-under-consent/, { timeout: 15_000 });
  });

  for (const path of ['/', '/en']) {
    test(`no page errors on ${path} before and after Accepteren`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
      const { accept } = await banner(page);
      await accept.click();
      await page.waitForTimeout(3_000);
      expect(errors).toEqual([]);
    });
  }
});
