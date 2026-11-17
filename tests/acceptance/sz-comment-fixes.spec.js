// Acceptance tests for sz-comment-fixes: the 13 Designer comment fixes on the Team Zissou staging homepage (spacers gone, body-text sizes, hidden nav links, centred ticker, ticks, Who column and SVG portrait) without publishing the custom domains.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_STAGING_URL || 'https://teamzissou.webflow.io').replace(/\/$/, '');
const PAGES = ['/', '/terms', '/privacy', '/404'];
const CUSTOM_DOMAINS = ['https://teamzissou.io/', 'https://www.teamzissou.io/'];

const BODY_TEXT = [
  '.sz-problem_list-title',
  '.section_problem .sz-dot-list_item',
  '.sz-button',
  '.sz-footer_link',
  '.sz-footer_title',
  '.sz-stat_note',
  '.sz-faq_answer p',
  '.sz-leader_row > p',
  '.sz-price-list_aside p',
  '.sz-price-list_takeover p',
  '.sz-cta-band_content p',
  '.sz-ticker_marquee .sz-dot-list_item',
  '.sz-who_body p',
];

const SMALL_PRINT = ['.sz-case-study_caption .text-size-small', '.sz-footer_bottom p', '.sz-contact_heading'];

async function fontSizes(page, selectors) {
  return page.evaluate((list) => {
    const out = {};
    for (const sel of list) {
      const els = [...document.querySelectorAll(sel)];
      out[sel] = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
    }
    return out;
  }, selectors);
}

test.describe('sz-comment-fixes', () => {
  test('no spacer divs on home, terms, privacy and 404', async ({ request }) => {
    for (const path of PAGES) {
      const res = await request.get(`${BASE}${path}`);
      const html = await res.text();
      expect(html.match(/class="spacer-/g) || [], `${path} spacers`).toHaveLength(0);
    }
  });

  for (const [width, px] of [
    [1280, 24],
    [390, 20],
  ]) {
    test(`body copy is ${px}px at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const sizes = await fontSizes(page, BODY_TEXT);
      for (const [sel, list] of Object.entries(sizes)) {
        expect(list.length, `${sel} present`).toBeGreaterThan(0);
        for (const size of list) expect(size, sel).toBeCloseTo(px, 0);
      }
    });
  }

  test('small print stays smaller than body text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const sizes = await fontSizes(page, SMALL_PRINT);
    for (const [sel, list] of Object.entries(sizes)) {
      expect(list.length, `${sel} present`).toBeGreaterThan(0);
      for (const size of list) expect(size, sel).toBeLessThan(24);
    }
  });

  test('nav links are hidden and the wordmark stays visible', async ({ page }) => {
    for (const width of [390, 991, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const lists = page.locator('.section_nav .sz-nav_list');
      const count = await lists.count();
      for (let i = 0; i < count; i += 1) await expect(lists.nth(i)).toBeHidden();
      await expect(page.locator('.sz-nav_wordmark')).toBeVisible();
    }
  });

  test('ticker heading and body are centred', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      const h2 = document.querySelector('.section_ticker h2');
      const body = document.querySelector('.sz-ticker_body');
      const container = body.closest('.container-large').getBoundingClientRect();
      const box = body.getBoundingClientRect();
      return {
        h2: getComputedStyle(h2).textAlign,
        body: getComputedStyle(body).textAlign,
        offset: Math.abs(box.left - container.left - (container.right - box.right)),
      };
    });
    expect(result.h2).toBe('center');
    expect(result.body).toBe('center');
    expect(result.offset).toBeLessThan(2);
  });

  test('your-part dots carry a tick', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const dots = page.locator('.sz-split_card .sz-dot-list_dot.is-tick');
    await expect(dots).toHaveCount(4);
    const mask = await dots.first().evaluate((el) => {
      const s = getComputedStyle(el, '::before');
      return s.webkitMaskImage || s.maskImage;
    });
    expect(mask).toContain('url(');
  });

  test('marquee dots are solid and carry a tick', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const dots = page.locator('.sz-ticker_marquee .sz-dot-list_dot');
    await expect(dots).toHaveCount(12);
    await expect(page.locator('.sz-ticker_marquee .sz-dot-list_dot.is-hollow')).toHaveCount(0);
    await expect(page.locator('.sz-ticker_marquee .sz-dot-list_dot.is-tick')).toHaveCount(12);
  });

  test('who content spans three columns between 992 and 1439', async ({ page }) => {
    const span = async (width) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      return page.evaluate(() => {
        const grid = document.querySelector('.sz-who_layout').getBoundingClientRect().width;
        const col = document.querySelector('.sz-who_content').getBoundingClientRect().width;
        return col / grid;
      });
    };
    expect(await span(1280)).toBeGreaterThan(0.45);
    expect(await span(1440)).toBeLessThan(0.4);
  });

  test('who portrait is an svg', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const img = page.locator('.sz-who_portrait');
    await expect(img).toHaveAttribute('src', /\.svg(\?|$)/);
    await expect(img).toHaveAttribute('alt', /.+/);
  });

  test('no console errors on the four pages', async ({ page }) => {
    for (const path of PAGES) {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      expect(errors, path).toEqual([]);
      page.removeAllListeners('console');
    }
  });

  test('custom domains are still unpublished', async ({ request }) => {
    for (const url of CUSTOM_DOMAINS) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status(), url).toBe(404);
    }
  });
});
