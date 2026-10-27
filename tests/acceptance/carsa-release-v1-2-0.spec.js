// Acceptance tests for carsa-v1.2.0: every remaining inline page script moves into loader modules that stay inert until the page marker exists, page by page as each is listed in CARSA_V120_DONE, plus the FAQ schema, near, VDP draw-play and redirect fixes.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import { BASE, loadPage, collectErrors, unexpectedErrors, firstPath } from './helpers/carsa.js';

const V120_PATH_RE = /\/webflow\/v1\.[23]\.\d+\//;
const VDP_PATH = '/vehicles/used/bl73dmu';
const MISSING_VDP = '/vehicles/used/zz99zzz';
const SHARED = ['animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js'];

const ENTRIES = [
  { entry: '/used-cars', modules: ['valuation-links.js'] },
  { entry: '/', modules: ['animations.js', 'valuation-links.js', 'equal-height.js'] },
  { entry: '/used-cars/near/', modules: ['near.js', 'valuation-links.js'] },
  { entry: '/car-finance-calculator', modules: ['finance-calculator.js', 'equal-height.js'] },
  { entry: '/get-started', modules: ['get-started.js'] },
  { entry: '/faq', modules: ['faq.js', 'faq-schema.js', 'animations.js'] },
  { entry: '/car-finance', modules: ['faq-schema.js', 'animations.js'] },
  { entry: '/sell-car/part-exchange', modules: ['valuation-links.js', 'faq-schema.js', 'animations.js'] },
  { entry: '/sell-car/value-car', modules: ['valuation-links.js', 'faq-schema.js', 'animations.js'] },
  { entry: '/reserve', modules: ['equal-height.js', 'animations.js'] },
  { entry: '/about/reviews', modules: ['valuation-links.js', 'animations.js'] },
  { entry: '/used-cars/deals', modules: ['valuation-links.js'] },
  { entry: '/used-cars/make/', modules: ['valuation-links.js'] },
  { entry: '/used-cars/models/', modules: ['models-template.js', 'valuation-links.js'] },
  { entry: '/used-cars/fuel/', modules: ['fuel-template.js', 'valuation-links.js', 'animations.js'] },
  { entry: '/used-cars/promotions/', modules: ['promotions-template.js', 'animations.js'] },
  { entry: '/stores/', modules: ['equal-height.js', 'animations.js'] },
  { entry: '/sell-car/store/', modules: ['valuation-links.js', 'equal-height.js', 'animations.js'] },
  { entry: '/blog/', modules: ['animations.js'] },
  { entry: '/used-cars/models', modules: ['all-models.js', 'animations.js'] },
  { entry: '/blog', modules: ['blog.js', 'animations.js'] },
  { entry: '/contact', modules: ['animations.js'], done: 'sweep' },
  { entry: '/about/carsa', modules: ['animations.js'], done: 'sweep' },
  { entry: '/car-care/overview', modules: ['animations.js'], done: 'sweep' },
];

const CONFIG_BLOCKS = [
  { entry: '/used-cars/fuel/', key: '__CARSA_FUEL' },
  { entry: '/used-cars/models/', key: '__CARSA_MODELS' },
  { entry: '/used-cars/promotions/', key: '__CARSA_PROMO' },
];

const DONE = (process.env.CARSA_V120_DONE || '').split(',').map((s) => s.trim()).filter(Boolean);

function isDone(key) {
  return DONE.includes('all') || DONE.includes(key);
}

function moduleSel(name) {
  return `script[src*="/webflow/"][src$="/${name}"]`;
}

async function resolve(request, entry) {
  if (!entry.endsWith('/')) return entry;
  const path = await firstPath(request, entry);
  test.skip(!path, `no ${entry} item in sitemap`);
  return path;
}

async function strayInline(page) {
  return page.evaluate(() =>
    [...document.scripts]
      .filter((s) => !s.src && !s.type.includes('json') && !/__CARSA_|dataLayer|_vwo|gtm|jetboost/i.test(s.textContent))
      .map((s) => s.textContent.trim().slice(0, 60)),
  );
}

async function faqCounts(page) {
  return page.evaluate(() => {
    const list = document.querySelectorAll('#faq-schema-list [data-faq-question]').length;
    const ld = document.querySelector('script[data-faq-jsonld]');
    const schema = ld ? JSON.parse(ld.textContent).mainEntity.length : 0;
    return { list, schema };
  });
}

async function waitForFaqList(page) {
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll('#faq-schema-list [data-faq-question]').length;
      const w = (window.__faqWatch = window.__faqWatch || { n: -1, t: performance.now() });
      if (n !== w.n) Object.assign(w, { n, t: performance.now() });
      return n > 8 && performance.now() - w.t > 3000;
    },
    null,
    { timeout: 90_000, polling: 250 },
  );
  await page.waitForTimeout(2000);
}

test.describe('carsa-release-v1-2-0', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_V120, 'v1.2.0 not published yet; set CARSA_V120=1 once the footer tag points at v1.2.0');
  });

  for (const { entry, modules, done = entry } of ENTRIES) {
    test(`v120-loaded-once on ${entry}: each expected module loads once from a v1.2 folder`, async ({ page, request }) => {
      await loadPage(page, await resolve(request, entry));
      for (const name of modules) {
        const srcs = await page.$$eval(moduleSel(name), (els) => els.map((e) => e.src));
        expect(srcs, name).toHaveLength(1);
        expect(srcs[0]).toMatch(V120_PATH_RE);
      }
    });

    test(`v120-inert-before-marker on ${entry}: no marker, so no v1.2 module runs beside the inline copy`, async ({ page, request }) => {
      test.skip(isDone(done), `${entry} already swapped`);
      await loadPage(page, await resolve(request, entry));
      const state = await page.evaluate(() => ({ marker: typeof window.__CARSA_PAGE, ran: window.__CARSA_RAN || [] }));
      expect(state.marker).toBe('undefined');
      expect(state.ran).toEqual([]);
    });

    test(`v120-ran on ${entry}: marker set and every expected module ran`, async ({ page, request }) => {
      test.skip(!isDone(done), `${entry} not swapped yet; add ${done} to CARSA_V120_DONE once its body is published`);
      await loadPage(page, await resolve(request, entry));
      const state = await page.evaluate(() => ({ release: window.__CARSA_PAGE && window.__CARSA_PAGE.release, ran: window.__CARSA_RAN || [] }));
      expect(state.release).toBe('v1.2.0');
      expect(state.ran).toEqual(expect.arrayContaining(modules));
    });

    test(`v120-inline-removed on ${entry}: no inline scripts other than marker, config, JSON-LD and third-party tags`, async ({ page, request }) => {
      test.skip(!isDone(done), `${entry} not swapped yet`);
      await loadPage(page, await resolve(request, entry));
      expect(await strayInline(page)).toEqual([]);
    });

    test(`v120-no-errors on ${entry}: no unexpected page errors`, async ({ page, request }) => {
      const errors = collectErrors(page);
      await loadPage(page, await resolve(request, entry), 4000);
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }

  test('v120-shared-not-on-vdp: shared modules stay off /vehicles/*, which keeps its own draw-line', async ({ page }) => {
    await loadPage(page, VDP_PATH);
    for (const name of SHARED) expect(await page.locator(moduleSel(name)).count(), name).toBe(0);
  });

  test('vdp-draw-play: the VDP draw-line defines __svgDrawPlay for the radio CTA', async ({ page }) => {
    test.skip(!isDone('vdp'), 'footer not on v1.2.0 yet');
    await loadPage(page, VDP_PATH, 3000);
    const hooked = await page.evaluate(() => [...document.querySelectorAll('svg')].some((s) => typeof s.__svgDrawPlay === 'function'));
    expect(hooked).toBe(true);
  });

  test('vdp-404-redirect: a missing VDP lands on /used-cars and sets no toast flag', async ({ page }) => {
    test.skip(!isDone('/404'), '404 body not swapped yet');
    await page.goto(`${BASE}${MISSING_VDP}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/used-cars(\?|$)/, { timeout: 20_000 });
    expect(await page.evaluate(() => sessionStorage.getItem('from404Used'))).toBeNull();
  });

  test('car-redirect-lands: /car-redirect?vrm= lands on the lower-cased VDP', async ({ page }) => {
    test.skip(!isDone('/car-redirect'), '/car-redirect head not swapped yet');
    await page.goto(`${BASE}/car-redirect?vrm=BL73DMU`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/vehicles\/used\/bl73dmu/, { timeout: 20_000 });
  });

  test('near-no-filtered-error: a near page throws no "filtered is not defined"', async ({ page, request }) => {
    test.skip(!isDone('/used-cars/near/'), 'near not swapped yet');
    const errors = collectErrors(page);
    await loadPage(page, await resolve(request, '/used-cars/near/'), 4000);
    expect(errors.map((e) => e.message).filter((m) => /filtered is not defined/.test(m))).toEqual([]);
  });

  test('near-filter-not-submit: a native submit on the filter form is blocked by the moved head block', async ({ page, request }) => {
    test.skip(!isDone('/used-cars/near/'), 'near not swapped yet');
    await loadPage(page, await resolve(request, '/used-cars/near/'), 4000);
    const prevented = await page.evaluate(() => {
      const form = document.getElementById('wf-form-Filter-Vehicles');
      if (!form) return null;
      const e = new SubmitEvent('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });

  test('faq-schema-complete: /faq JSON-LD lists every rendered question', async ({ page }) => {
    test.skip(!isDone('/faq'), '/faq not swapped yet');
    await loadPage(page, '/faq');
    await waitForFaqList(page);
    const { list, schema } = await faqCounts(page);
    expect(schema).toBe(list);
  });

  test('faq-schema-complete-slow: the count still matches on a throttled connection', async ({ page }) => {
    test.skip(!isDone('/faq'), '/faq not swapped yet');
    test.setTimeout(150_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 20_000 });
    await loadPage(page, '/faq', 2000, { timeout: 90_000 });
    await waitForFaqList(page);
    const { list, schema } = await faqCounts(page);
    expect(schema).toBe(list);
  });

  for (const { entry, key } of CONFIG_BLOCKS) {
    test(`config-blocks-coerced on ${entry}: ${key} holds only strings`, async ({ page, request }) => {
      test.skip(!isDone(entry), `${entry} not swapped yet`);
      await loadPage(page, await resolve(request, entry));
      const values = await page.evaluate((k) => Object.values(window[k] || {}), key);
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(typeof v).toBe('string');
    });
  }
});
