// Acceptance tests for carsa-v1.2.6: the last six inline blocks (nav and footer WhatsApp prefill, VDP store sentence, VDP cold-banner carousel, /reserve VRM finder, blog tooltip) run from loader modules and are gone from the page HTML.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import { BASE, loadPage, collectErrors, unexpectedErrors, sitemapPaths, firstPath } from './helpers/carsa.js';

const V126_PATH_RE = /\/webflow\/v1\.2\.(?:[6-9]|\d{2,})\//;
const WA = 'https://wa.me/442046322989?text=';
const GENERIC_WA = WA + encodeURIComponent('Hi, I have a question about a car on your website');
const COLD_SOURCES = ['autotrader.co.uk', 'google_vehicle_ads', 'chat', 'google', 'ebaymotorsgroup', 'theaa.com', 'carwow.co.uk', 'cargurus.co.uk'];
const MOVED = [
  { name: 'nav WhatsApp', re: /nav_open-whatsapp/ },
  { name: 'footer WhatsApp', re: /footer_open-whatsapp/ },
  { name: 'car-info', re: /carLocation/ },
  { name: 'cold banner', re: /cold-banner-carousel/ },
  { name: 'reserve VRM', re: /crw-vrm-input/ },
  { name: 'blog tooltip', re: /iconWrapperClass/ },
];

async function vdpInfo(request, path) {
  const html = await (await request.get(`${BASE}${path}`)).text();
  const pick = (key) => (html.match(new RegExp(`${key}: "([^"]*)"`)) || [])[1] || '';
  return {
    path,
    vrm: pick('vrm'),
    locationName: pick('locationName'),
    status: pick('status'),
    makeModelCount: (html.match(/data-count="make-model"/g) || []).length,
  };
}

let vdpCache = null;

async function vdps(request) {
  if (!vdpCache) {
    const paths = await sitemapPaths(request, '/vehicles/used/', 12);
    vdpCache = await Promise.all(paths.map((p) => vdpInfo(request, p)));
  }
  return vdpCache;
}

async function unsoldVdp(request, extra = () => true) {
  const found = (await vdps(request)).find((v) => v.vrm && !/sold/i.test(v.status) && extra(v));
  test.skip(!found, 'no matching VDP in the first 12 sitemap entries');
  return found;
}

async function inlineMatches(page) {
  return page.evaluate(
    (patterns) =>
      [...document.scripts]
        .filter((s) => !s.src)
        .flatMap((s) => patterns.filter(([, src]) => new RegExp(src).test(s.textContent)).map(([name]) => name)),
    MOVED.map(({ name, re }) => [name, re.source]),
  );
}

async function blogPost(request) {
  const path = (await sitemapPaths(request, '/blog/', 40)).find((p) => p !== '/blog/' && p !== '/blog');
  test.skip(!path, 'no blog post in sitemap');
  return path;
}

test.describe('carsa-release-v1-2-6', () => {
  test.beforeEach(() => {
    test.skip(!process.env.CARSA_V126, 'v1.2.6 not published yet; set CARSA_V126=1 once the footer tag points at v1.2.6 and the embeds are removed');
  });

  test('v126-loader: init.js and route modules load from a v1.2.6+ folder', async ({ page, request }) => {
    await loadPage(page, '/reserve');
    const srcs = await page.$$eval('script[src*="/webflow/"]', (els) => els.map((e) => e.src));
    expect(srcs.find((s) => s.endsWith('/init.js'))).toMatch(V126_PATH_RE);
    expect(srcs.filter((s) => s.endsWith('/reserve.js'))).toHaveLength(1);
    await loadPage(page, await blogPost(request));
    const blog = await page.$$eval('script[src*="/webflow/"]', (els) => els.map((e) => e.src));
    expect(blog.filter((s) => s.endsWith('/blog-post.js'))).toHaveLength(1);
    expect(blog.filter((s) => s.endsWith('/blog.js'))).toHaveLength(0);
  });

  test('v126-inline-gone: none of the six moved blocks remain inline on /, a VDP, /reserve or a blog post', async ({ page, request }) => {
    const vdp = await unsoldVdp(request);
    for (const path of ['/', vdp.path, '/reserve', await blogPost(request)]) {
      await loadPage(page, path);
      expect(await inlineMatches(page), path).toEqual([]);
    }
  });

  test('v126-nav-wa-generic: off the VDP the nav WhatsApp link carries the generic message', async ({ page }) => {
    await loadPage(page, '/');
    await expect(page.locator('#nav_open-whatsapp')).toHaveAttribute('href', GENERIC_WA);
  });

  test('v126-nav-wa-vrm: on a VDP the nav WhatsApp link names the car', async ({ page, request }) => {
    const vdp = await unsoldVdp(request);
    await loadPage(page, vdp.path);
    await expect(page.locator('#nav_open-whatsapp')).toHaveAttribute('href', WA + encodeURIComponent(`Hi, please tell me more about ${vdp.vrm.toUpperCase()}`));
  });

  test('v126-footer-wa-vrm: on a VDP the footer WhatsApp link names the car', async ({ page, request }) => {
    const vdp = await unsoldVdp(request);
    await loadPage(page, vdp.path);
    await expect(page.locator('#footer_open-whatsapp')).toHaveAttribute('href', WA + encodeURIComponent(`Hi, please tell me more about ${vdp.vrm.toUpperCase()}`));
  });

  test('v126-car-info: the store sentence names the location and never reads "our  store"', async ({ page, request }) => {
    const vdp = await unsoldVdp(request, (v) => v.locationName && v.locationName !== 'Storage');
    await loadPage(page, vdp.path);
    const text = await page.locator('#car-info').textContent();
    expect(text).toContain(`This car's currently in our ${vdp.locationName.trim()} store.`);
    expect(text).toContain('We can move the vehicle to any of our 10 stores nationwide.');
  });

  test('v126-car-info-empty: a car with no location gets the generic first sentence', async ({ page, request }) => {
    const vdp = await unsoldVdp(request, (v) => !v.locationName.trim());
    await loadPage(page, vdp.path);
    const text = await page.locator('#car-info').textContent();
    expect(text).toMatch(/^This car is fully inspected and ready to view\. We can move the vehicle/);
    expect(text).not.toContain('our  store');
  });

  test('v126-cold-banner-off: without a listed utm_source the banner stays hidden and the USP strip shows', async ({ page, request }) => {
    const vdp = await unsoldVdp(request, (v) => v.makeModelCount >= 3);
    await loadPage(page, vdp.path);
    await expect(page.locator('.section_vdp-cold-banner')).toBeHidden();
    await expect(page.locator('section.section_usp-carousel')).toBeVisible();
  });

  for (const source of [COLD_SOURCES[0], 'AutoTrader.co.uk']) {
    test(`v126-cold-banner-on (${source}): a listed source shows the banner after the USP strip, hides the strip and starts Swiper`, async ({ page, request }) => {
      const vdp = await unsoldVdp(request, (v) => v.makeModelCount >= 3);
      const errors = collectErrors(page);
      await loadPage(page, `${vdp.path}?utm_source=${encodeURIComponent(source)}`, 4000);
      const state = await page.evaluate(() => {
        const banner = document.querySelector('.section_vdp-cold-banner');
        const usp = document.querySelector('section.section_usp-carousel');
        return {
          display: banner && getComputedStyle(banner).display,
          afterUsp: !!(usp && usp.nextElementSibling === banner),
          uspHidden: usp && getComputedStyle(usp).display === 'none',
          swiper: !!(document.querySelector('#cold-banner-carousel') || {}).swiper,
          swipers: document.querySelectorAll('#cold-banner-carousel.swiper-initialized').length,
        };
      });
      expect(state).toEqual({ display: 'flex', afterUsp: true, uspHidden: true, swiper: true, swipers: 1 });
      expect(unexpectedErrors(errors)).toEqual([]);
    });
  }

  test('v126-cold-banner-unlisted: an unlisted source keeps the banner hidden', async ({ page, request }) => {
    const vdp = await unsoldVdp(request, (v) => v.makeModelCount >= 3);
    await loadPage(page, `${vdp.path}?utm_source=facebook`);
    await expect(page.locator('.section_vdp-cold-banner')).toBeHidden();
  });

  test('v126-reserve-format: the VRM field uppercases and strips non-alphanumerics as you type', async ({ page }) => {
    await loadPage(page, '/reserve');
    await page.locator('#crw-vrm-input').pressSequentially('ab12 c-de');
    await expect(page.locator('#crw-vrm-input')).toHaveValue('AB12CDE');
  });

  test('v126-reserve-short: under two characters shows the error and opens nothing', async ({ page, context }) => {
    await loadPage(page, '/reserve');
    let popups = 0;
    context.on('page', () => popups++);
    await page.locator('#crw-vrm-input').fill('A');
    await page.locator('.crw-btn').click();
    await expect(page.locator('#crw-vrm-error')).toHaveClass(/crw-show/);
    await page.waitForTimeout(500);
    expect(popups).toBe(0);
  });

  for (const how of ['button', 'Enter']) {
    test(`v126-reserve-open (${how}): a valid VRM opens its VDP in one new tab`, async ({ page, context }) => {
      await loadPage(page, '/reserve');
      await context.route('**/vehicles/used/ab12cde', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
      const opened = [];
      context.on('page', (p) => opened.push(p));
      await page.locator('#crw-vrm-input').pressSequentially('ab12cde');
      const popup = page.waitForEvent('popup');
      if (how === 'button') await page.locator('.crw-btn').click();
      else await page.locator('#crw-vrm-input').press('Enter');
      expect((await popup).url()).toBe('https://www.carsa.co.uk/vehicles/used/ab12cde');
      await page.waitForTimeout(500);
      expect(opened).toHaveLength(1);
    });
  }

  test('v126-blog-tooltip: hovering a tooltip icon positions its tooltip', async ({ page, request }) => {
    await loadPage(page, await blogPost(request));
    const icon = page.locator('.tooltip1_element-wrapper').first();
    test.skip(!(await icon.count()), 'post has no tooltip');
    await expect(icon).toHaveAttribute('data-relume-tooltip-setup', '1');
    await icon.locator('..').hover();
    await page.waitForTimeout(200);
    const transform = await icon.locator('xpath=..').locator('.tooltip1_tooltip-wrapper').first().evaluate((el) => el.style.transform);
    expect(transform).toMatch(/^translate[XY]\(/);
  });

  test('v126-no-errors: no unexpected page errors on /, a VDP, /reserve and a blog post', async ({ page, request }) => {
    const errors = collectErrors(page);
    const vdp = await firstPath(request, '/vehicles/used/');
    for (const path of ['/', vdp, '/reserve', await blogPost(request)]) await loadPage(page, path, 3000);
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});
