// Phase 0 baseline for the remaining page scripts: FAQ and blog category lists, FAQ schema builders, models index dropdown, CMS template link builders (models, make, fuel, near, promotions, stores), the reservation widget, 404 and car-redirect flows, animation wrappers and a health sweep over every live page type.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import {
  BASE,
  PHASE1,
  RELEASE_PATH_RE,
  VIEWPORT_MOBILE,
  loadPage,
  collectErrors,
  unexpectedErrors,
  errorStacks,
  firstPath,
  sitemapPaths,
} from './helpers/carsa.js';

async function faqJsonLd(page, timeout = 16_000) {
  await page.locator('script[data-faq-jsonld]').waitFor({ state: 'attached', timeout });
  return page.$eval('script[data-faq-jsonld]', (s) => JSON.parse(s.textContent));
}

// ── FAQ, blog, models index ───────────────────────────────────

test.describe('carsa-code-migration — Pages: FAQ index', () => {
  test('faq-view-all-block-dead: /faq carries the view-all mover but neither #category-list nor #view-all exists', async ({ page }) => {
    await loadPage(page, '/faq');
    expect(await page.evaluate(() => [...document.scripts].filter((s) => !s.src && /#view-all/.test(s.textContent)).length)).toBe(1);
    expect(await page.locator('#category-list, #view-all').count()).toBe(0);
  });

  test('faq-schema-built: a FAQPage JSON-LD is injected once from the hidden render-all list', async ({ page }) => {
    await loadPage(page, '/faq');
    const data = await faqJsonLd(page);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.length).toBeGreaterThan(0);
    for (const q of data.mainEntity) {
      expect(q.name.length).toBeGreaterThan(0);
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
    const rendered = await page.locator('#faq-schema-list [data-faq-question]').count();
    expect(data.mainEntity.length).toBe(rendered);
    expect(await page.locator('script[data-faq-jsonld]').count()).toBe(1);
  });

  test('faq-deep-link: ?question_contain=<id> opens that question after load', async ({ page }) => {
    await loadPage(page, '/faq');
    const id = await page.evaluate(() => document.querySelector('[data-faq-item][id], .faq_item[id], [id][class*="faq"][class*="item"]')?.id || null);
    test.skip(!id, 'no FAQ accordion element with an id');
    const clicks = [];
    await page.exposeFunction('__phase0click', (i) => clicks.push(i));
    await page.addInitScript((target) => {
      document.addEventListener('click', (e) => { if (e.target.closest(`#${CSS.escape(target)}`)) window.__phase0click(target); }, true);
    }, id);
    await loadPage(page, `/faq?question_contain=${id}`, 2500);
    expect(clicks).toContain(id);
  });
});

test.describe('carsa-code-migration — Pages: blog and models index', () => {
  test('blog-view-all-first: #view-all is moved to the top of #category-list', async ({ page }) => {
    await loadPage(page, '/blog');
    expect(await page.locator('#category-list > *').first().getAttribute('id')).toBe('view-all');
  });

  test('models-index-dropdown-label: pressing an option writes its label into #select-text and clear resets it', async ({ page }) => {
    await loadPage(page, '/used-cars/models');
    const option = page.locator("[data-element='select']").first();
    test.skip((await option.count()) === 0, 'no dropdown options on this build');
    const expected = (await option.getAttribute('data-text')) || (await option.textContent()).trim();
    await option.dispatchEvent('pointerdown');
    expect((await page.locator('#select-text').textContent()).trim()).toBe(expected);
    const clear = page.locator("[fs-list-element='clear']").first();
    if (await clear.count()) {
      await clear.dispatchEvent('pointerdown');
      expect((await page.locator('#select-text').textContent()).trim()).toBe('Any make');
    }
  });

  test('models-index-results: the models list renders items', async ({ page }) => {
    await loadPage(page, '/used-cars/models');
    await expect(page.locator('#results-list [role="listitem"], #results-list .w-dyn-item').first()).toBeVisible({ timeout: 15_000 });
  });
});

// ── CMS templates ─────────────────────────────────────────────

test.describe('carsa-code-migration — Pages: models and make templates', () => {
  test('models-template-seo: meta description and #description are populated and canonical matches the URL', async ({ page, request }) => {
    const path = await firstPath(request, '/used-cars/models/');
    await loadPage(page, path);
    const desc = await page.getAttribute('meta[name="description"]', 'content');
    expect(desc.length).toBeGreaterThan(20);
    const el = page.locator('#description').first();
    if (await el.count()) expect((await el.textContent()).trim()).toBe(desc.trim());
    expect(await page.getAttribute('link[rel="canonical"]', 'href')).toBe(`https://www.carsa.co.uk${path}`);
  });

  test('models-template-faq-scrub: no FAQPage JSON-LD keeps an empty question, and CollectionPage only references a live FAQ', async ({ page, request }) => {
    const paths = await sitemapPaths(request, '/used-cars/models/', 3);
    for (const path of paths) {
      await loadPage(page, path, 500);
      const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean));
      const faq = blocks.find((b) => b['@type'] === 'FAQPage');
      if (faq) for (const q of faq.mainEntity) expect(q.name.trim() && q.acceptedAnswer.text.trim(), path).toBeTruthy();
      const graph = blocks.flatMap((b) => b['@graph'] || []);
      const refs = graph.filter((n) => n.mainEntity && String(n.mainEntity['@id'] || '').includes('#faq'));
      if (refs.length) expect(faq, `${path} references #faq without a FAQPage`).toBeTruthy();
    }
  });

  for (const prefix of ['/used-cars/models/', '/used-cars/make/']) {
    test(`widget-present on ${prefix}: the Carsa search widget script and stylesheet are loaded`, async ({ page, request }) => {
      const path = await firstPath(request, prefix);
      await loadPage(page, path);
      expect(await page.locator('script[src*="d2zblaqlrfk95e.cloudfront.net/carsa-search.js"]').count()).toBe(1);
      expect(await page.locator('link[href*="d2zblaqlrfk95e.cloudfront.net/carsa-search.css"]').count()).toBe(1);
    });
  }
});

test.describe('carsa-code-migration — Pages: fuel template', () => {
  test('fuel-search-similar: [data-button="search-similar"] filters the search page by this fuel type', async ({ page, request }) => {
    const path = await firstPath(request, '/used-cars/fuel/');
    await loadPage(page, path);
    const hrefs = await page.$$eval('[data-button="search-similar"]', (els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/used-cars?cars_fuel-type_equal=')).toBe(true);
      expect(href.split('=')[1].length).toBeGreaterThan(0);
    }
  });

  test('fuel-results-list: the fuel list renders items', async ({ page, request }) => {
    const path = await firstPath(request, '/used-cars/fuel/');
    await loadPage(page, path);
    await expect(page.locator('#results-list [role="listitem"], #results-list .w-dyn-item').first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('carsa-code-migration — Pages: near template', () => {
  let near;
  test.beforeEach(async ({ request }) => {
    near = near || (await firstPath(request, '/used-cars/near/'));
  });

  test('near-results-and-loader: the list renders and the loader is hidden after render', async ({ page }) => {
    await loadPage(page, near, 3000);
    await expect(page.locator('#results-list [role="listitem"], #results-list .w-dyn-item').first()).toBeVisible({ timeout: 15_000 });
    const loading = page.locator('.loading').first();
    if (await loading.count()) await expect(loading).toBeHidden();
  });

  test('near-filter-form-blocked: submitting the filter form never navigates or shows Webflow success state', async ({ page }) => {
    await loadPage(page, near, 3000);
    const before = page.url();
    await page.evaluate(() => document.getElementById('wf-form-Filter-Vehicles').requestSubmit());
    await page.waitForTimeout(800);
    expect(page.url()).toBe(before);
    await expect(page.locator('#wf-form-Filter-Vehicles').locator('..').locator('.w-form-done')).toBeHidden();
  });

  test('near-vrm-sanitiser: #vrm-search strips non-alphanumerics and upper-cases', async ({ page }) => {
    await loadPage(page, near, 3000);
    const input = page.locator('#vrm-search');
    await input.fill('ab12 c!d£e');
    expect(await input.inputValue()).toBe('AB12CDE');
  });

  test('near-mobile-filters-toggle: at 375px the filters link opens the panel and close hides it', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    await loadPage(page, near, 4000);
    const link = page.locator('#mobile-filters-link');
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.locator('.filters1_filters-wrapper')).toHaveClass(/is-visible/);
    await page.locator('#filters-mobile-close').click();
    await expect(page.locator('.filters1_filters-wrapper')).not.toHaveClass(/is-visible/);
  });

  test('near-make-model-dropdowns: the make dropdown is populated and enables the model dropdown', async ({ page }) => {
    await loadPage(page, near, 4000);
    const make = page.locator('select[name="make"]');
    await expect(make.locator('option')).not.toHaveCount(1, { timeout: 15_000 });
    const model = page.locator('select[name="model"]');
    expect(await model.isDisabled()).toBe(true);
    const first = await make.locator('option').nth(1).getAttribute('value');
    await make.selectOption(first);
    await page.waitForTimeout(300);
    expect(await model.isDisabled()).toBe(false);
    expect(await model.locator('option').count()).toBeGreaterThan(1);
  });

  test('near-promo-cards: promo cards from #promo-storage are inserted into the results list', async ({ page }) => {
    await loadPage(page, near, 4000);
    const stored = await page.locator('#promo-storage [data-element="promo-card"]').count();
    test.skip(stored === 0, 'no promo cards configured');
    await expect(page.locator('#results-list [data-element="promo-card"]').first()).toBeAttached({ timeout: 15_000 });
  });

  test('near-search-locations-block-dead: the block throws before it runs and its target button does not exist', async ({ page }) => {
    await loadPage(page, near, 3000);
    expect(await page.locator('[data-button="search-locations"]').count()).toBe(0);
  });

  test('near-known-error-only: the only JS error on a near page is the known search-locations bug', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, near, 3000);
    expect(unexpectedErrors(errors)).toEqual([]);
    expect(errors.map((e) => e.message).some((m) => /filtered is not defined/.test(m))).toBe(true);
  });
});

test.describe('carsa-code-migration — Pages: promotions, stores, blog post', () => {
  test('promo-search-offer-link: [data-button="search-offer"] deep-links the deals page filtered by this promotion', async ({ page, request }) => {
    const path = await firstPath(request, '/used-cars/promotions/');
    test.skip(!path, 'no promotions in sitemap');
    await loadPage(page, path);
    const hrefs = await page.$$eval('[data-button="search-offer"]', (els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=')).toBe(true);
      expect(decodeURIComponent(href.split('cars_promotion_equal=')[1]).length).toBeGreaterThan(0);
    }
  });

  for (const [label, prefix] of [['stores index', '/stores'], ['store template', '/stores/'], ['sell-car store', '/sell-car/store/']]) {
    test(`jetboost-loaded on ${label}: the Jetboost map script is requested once`, async ({ page, request }) => {
      const path = prefix.endsWith('/') ? await firstPath(request, prefix) : prefix;
      test.skip(!path, `no ${label} page`);
      const hits = [];
      page.on('request', (r) => r.url().includes('cdn.jetboost.io/jetboost.js') && hits.push(r.url()));
      await loadPage(page, path);
      expect(hits.length).toBe(1);
      expect(await page.evaluate(() => window.JETBOOST_SITE_ID)).toBe('cmd4nmdvh00500kwz9p572n6n');
    });
  }

  test('blog-post-health: a blog post loads without errors and its draw-shape wrapper is initialised', async ({ page, request }) => {
    const path = await firstPath(request, '/blog/');
    const errors = collectErrors(page);
    await loadPage(page, path);
    expect(unexpectedErrors(errors)).toEqual([]);
    const shapes = page.locator('[data-svg="draw-shape"] svg path, [data-svg="draw-shape"] svg circle').first();
    if (await shapes.count()) expect(await shapes.evaluate((el) => el.style.transform || el.getAttribute('style') || '')).not.toBe('');
  });
});

// ── Reserve widget, 404 and car-redirect flows ───────────────

test.describe('carsa-code-migration — Pages: reserve, 404, car-redirect', () => {
  for (const path of ['/car-finance', '/sell-car/part-exchange', '/sell-car/value-car']) {
    test(`faq-schema-mini on ${path}: a FAQPage JSON-LD is injected from #section-faq`, async ({ page }) => {
      await loadPage(page, path);
      const questions = await page.locator('#section-faq [data-faq-question]').count();
      test.skip(questions === 0, 'no FAQ markup inside #section-faq on this page');
      const data = await faqJsonLd(page, 8000);
      expect(data['@type']).toBe('FAQPage');
      expect(data.mainEntity.length).toBe(questions);
    });
  }

  test('reserve-faq-schema-dead: /reserve carries the FAQ schema block but has no FAQ markup, so nothing is injected', async ({ page }) => {
    await loadPage(page, '/reserve');
    expect(await page.locator('[data-faq-question]').count()).toBe(0);
    expect(await page.locator('script[data-faq-jsonld]').count()).toBe(0);
  });

  test('reserve-vrm-widget: the VRM input sanitises, rejects short input and opens the VDP for a valid one', async ({ page, context }) => {
    await loadPage(page, '/reserve');
    const input = page.locator('#crw-vrm-input');
    test.skip((await input.count()) === 0, 'no reservation widget on this build');
    await input.fill('ab12-cde');
    expect(await input.inputValue()).toBe('AB12CDE');
    await input.fill('A');
    await page.evaluate(() => window.crsaFindCar());
    await expect(page.locator('#crw-vrm-error')).toHaveClass(/crw-show/);
    await input.fill('AB12CDE');
    const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), input.press('Enter')]);
    expect(popup.url()).toBe('https://www.carsa.co.uk/vehicles/used/ab12cde');
    await popup.close();
  });

  test('vdp-404-redirects-to-search: an unknown VRM lands on /used-cars and the 404 flag is consumed', async ({ page }) => {
    await page.goto(`${BASE}/vehicles/used/zz99phase0`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/used-cars(\?|$)/, { timeout: 15_000 });
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => sessionStorage.getItem('from404Used'))).toBeNull();
  });

  test('vdp-404-toast: the redirect toast shows on /used-cars after a 404 redirect', async ({ page }) => {
    test.fail(true, 'live gap: #redirect-message no longer exists on /used-cars since the VSRP widget rebuild (it survives only on /used-cars/deals)');
    await page.goto(`${BASE}/vehicles/used/zz99phase0`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/used-cars(\?|$)/, { timeout: 15_000 });
    await expect(page.locator('#redirect-message')).toBeVisible({ timeout: 10_000 });
  });

  test('car-redirect: /car-redirect?vrm=X replaces the location with the lower-cased VDP URL', async ({ page, request }) => {
    const vdp = await firstPath(request, '/vehicles/used/');
    const vrm = vdp.split('/').pop().toUpperCase();
    await page.goto(`${BASE}/car-redirect?vrm=${vrm}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(`**/vehicles/used/${vrm.toLowerCase()}`, { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(`/vehicles/used/${vrm.toLowerCase()}`);
  });
});

// ── Animations (simple presence checks) ──────────────────────

test.describe('carsa-code-migration — Pages: animations', () => {
  test('draw-line-initialised: stroked paths inside [data-svg="draw-line"] get a dash array on load', async ({ page }) => {
    await loadPage(page, '/');
    const dashed = await page.$$eval('[data-svg="draw-line"] svg *', (els) => els.filter((e) => e.style.strokeDasharray).length);
    expect(dashed).toBeGreaterThan(0);
  });

  test('draw-shape-initialised: shapes inside [data-svg="draw-shape"] start hidden and animate in when scrolled to', async ({ page }) => {
    await loadPage(page, '/');
    const wrapper = page.locator('[data-svg="draw-shape"]').first();
    test.skip((await wrapper.count()) === 0, 'no draw-shape wrapper on the homepage');
    await wrapper.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3500);
    const opacity = await wrapper.locator('svg path, svg circle, svg rect').first().evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(1);
  });

  test('equal-height-cards: cards flagged data-card-height="equal" share one height', async ({ page }) => {
    await loadPage(page, '/');
    const heights = await page.$$eval('[data-card-height="equal"]', (els) => els.filter((e) => e.offsetParent).map((e) => e.offsetHeight));
    test.skip(heights.length < 2, 'fewer than two visible equal-height cards');
    expect(new Set(heights).size).toBe(1);
  });

  test('vdp-battery-animation-loaded: battery-animation.js is requested once on a VDP (from @main until Phase 1, then the release folder)', async ({ page, request }) => {
    const vdp = await firstPath(request, '/vehicles/used/');
    const hits = [];
    page.on('request', (r) => /\/battery-animation\.js(\?|$)/.test(r.url()) && hits.push(r.url()));
    await loadPage(page, vdp);
    expect(hits.length).toBe(1);
    if (PHASE1) {
      expect(hits[0]).toMatch(RELEASE_PATH_RE);
      expect(hits[0]).not.toContain('studiozissou/webflow-scripts');
    }
  });

  test('vdp-at-price-total-pinned: the AutoTrader price script loads once from a pinned URL (jsDelivr SHA until Phase 1, then the release folder)', async ({ page, request }) => {
    const vdp = await firstPath(request, '/vehicles/used/');
    await loadPage(page, vdp);
    const srcs = await page.$$eval('script[src*="at-price-total.js"]', (els) => els.map((e) => e.src));
    expect(srcs).toHaveLength(1);
    if (PHASE1) expect(srcs[0]).toMatch(RELEASE_PATH_RE);
    else expect(srcs[0]).toMatch(/webflow-scripts@[0-9a-f]{40}\/projects\/carsa\/at-price-total\.js$/);
  });
});

// ── Health sweep over every live page type ───────────────────

const STATIC_PAGES = [
  '/', '/used-cars', '/used-cars/deals', '/used-cars/models', '/car-finance-calculator', '/car-finance', '/get-started',
  '/sell-car/part-exchange', '/sell-car/value-car', '/faq', '/blog', '/contact', '/reserve', '/stores', '/500-deposit-on-us',
  '/about/carsa', '/about/careers', '/about/reviews', '/about/car-preparation', '/about/tiktok', '/about/gender-pay-gap-report-april-25',
  '/car-care/overview', '/car-care/car-extras', '/car-care/car-paint-interior-protection', '/car-care/carsacover',
  '/car-care/electric-vehicle-cover', '/car-care/cosmetic-maintenance-plan', '/car-care/drive-away-car-insurance',
  '/car-care/electric-vehicle-extended-warranty', '/car-care/extended-mechanical-warranty', '/car-care/mot-service-wolverhampton',
  '/car-care/podpoint', '/car-care/shine-protect-alloy-wheel-protection', '/car-care/williams-ceramic-paint-protection',
  '/mot-and-car-servicing', '/mot-and-car-servicing/store-locator', '/payments/payment-success', '/payments/payment-failure',
];

const TEMPLATE_PREFIXES = ['/vehicles/used/', '/used-cars/models/', '/used-cars/make/', '/used-cars/near/', '/used-cars/fuel/',
  '/used-cars/promotions/', '/sell-car/store/', '/stores/', '/blog/', '/terms/'];

test.describe('carsa-code-migration — Pages: health sweep', () => {
  for (const path of STATIC_PAGES) {
    test(`sweep ${path}: loads, no unexpected JS errors, global footer ran`, async ({ page }) => {
      const errors = collectErrors(page);
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      expect(res.status(), 'HTTP status').toBeLessThan(400);
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
      await page.waitForTimeout(1500);
      expect(unexpectedErrors(errors), errorStacks(errors)).toEqual([]);
      const year = page.locator('#year').first();
      if (await year.count()) await expect(year).toHaveText(String(new Date().getFullYear()));
    });
  }

  for (const prefix of TEMPLATE_PREFIXES) {
    test(`sweep template ${prefix}: first sitemap entry loads without unexpected JS errors`, async ({ page, request }) => {
      const path = await firstPath(request, prefix);
      test.skip(!path, `no ${prefix} entries in sitemap`);
      const errors = collectErrors(page);
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      expect(res.status(), 'HTTP status').toBeLessThan(400);
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
      await page.waitForTimeout(1500);
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }
});
