// Acceptance tests for sz-fixed-nav-task-list: the Team Zissou sticky nav with a Contact button and section-matched scheme, and the 15-item stepped task list in the Problem section; SZ_LOCAL_MODULE=1 injects the local modules before the CDN release.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_STAGING_URL || 'https://teamzissou.webflow.io').replace(/\/$/, '');
const LOCAL = Boolean(process.env.SZ_LOCAL_MODULE);
const MODULES = ['nav.js', 'task-list.js'].map((f) =>
  fileURLToPath(new URL(`../../projects/studio-zissou/${f}`, import.meta.url)),
);
const MODULE_URL = /studio-zissou\/(nav|task-list)\.js/;
const NAV = '[data-sz="nav"]';
const PANEL = `${NAV} .sz-nav_panel`;
const BUTTON = `${PANEL} a.sz-button`;
const WORDMARK = `${PANEL} .sz-nav_wordmark`;
const LIST = '[data-sz="task-list"]';
const ITEMS = `${LIST} > li`;
const PAGES = ['/', '/terms', '/privacy', '/404'];
const STEP_MS = 2500;

async function open(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (LOCAL) for (const path of MODULES) await page.addScriptTag({ path });
  await page.waitForTimeout(500);
}

async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(150);
}

async function toList(page) {
  await page.$eval(LIST, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(150);
}

async function visibleItems(page) {
  return page.$eval(LIST, (list) => {
    const box = list.getBoundingClientRect();
    return [...list.children]
      .filter((li) => {
        const r = li.getBoundingClientRect();
        const shown = getComputedStyle(li).display !== 'none' && Number(getComputedStyle(li).opacity) > 0.05;
        return shown && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .map((li) => ({ text: li.textContent.trim(), muted: li.classList.contains('is-muted') }));
  });
}

async function navGap(page, selector) {
  return page.evaluate(
    ({ nav, target }) =>
      document.querySelector(target).getBoundingClientRect().top -
      document.querySelector(nav).getBoundingClientRect().bottom,
    { nav: NAV, target: selector },
  );
}

test.describe('sz-fixed-nav-task-list task list', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
    await toList(page);
  });

  test('task list holds 15 items and shows 3 at rest', async ({ page }) => {
    await expect(page.locator(ITEMS)).toHaveCount(15);
    const texts = await page.locator(ITEMS).allTextContents();
    expect(texts.slice(0, 3).map((t) => t.trim())).toEqual([
      'Update Google Business Profile',
      'Get more reviews',
      'Sort out website bookings',
    ]);
    expect(await visibleItems(page)).toHaveLength(3);
  });

  test('task list moves one item down per step with a new item at the top', async ({ page }) => {
    const before = await visibleItems(page);
    await page.waitForTimeout(STEP_MS + 900);
    const after = await visibleItems(page);
    expect(after).toHaveLength(3);
    expect(after[1].text).toBe(before[0].text);
    expect(after[2].text).toBe(before[1].text);
    expect(before.map((i) => i.text)).not.toContain(after[0].text);
  });

  test('middle task is the only visible task that is not muted', async ({ page }) => {
    for (let i = 0; i < 2; i += 1) {
      const items = await visibleItems(page);
      expect(items.map((x) => x.muted)).toEqual([true, false, true]);
      await page.waitForTimeout(STEP_MS);
    }
  });

  test('task list returns to the first three after 15 steps', async ({ page }) => {
    test.setTimeout(90000);
    const start = (await visibleItems(page)).map((i) => i.text);
    await page.waitForTimeout(STEP_MS * 15 + 900);
    expect((await visibleItems(page)).map((i) => i.text)).toEqual(start);
  });

  test('task list keeps one height while it moves', async ({ page }) => {
    const heights = new Set();
    for (let i = 0; i < 40; i += 1) {
      heights.add(await page.$eval(LIST, (el) => el.offsetHeight));
      const shown =await page.$eval(LIST, (list) =>
        [...list.children].filter((li) => Number(getComputedStyle(li).opacity) > 0.05).length,
      );
      expect(shown).toBeLessThanOrEqual(4);
      await page.waitForTimeout(100);
    }
    expect(heights.size).toBe(1);
  });

  test('task list pauses on hover and when it is off screen', async ({ page }) => {
    await page.hover(LIST);
    const hovered = await visibleItems(page);
    await page.waitForTimeout(STEP_MS * 2 + 500);
    expect(await visibleItems(page)).toEqual(hovered);

    await page.mouse.move(0, 0);
    await scrollTo(page, 0);
    const offscreen = await page.locator(ITEMS).evaluateAll((els) => els.map((el) => el.style.transform));
    await page.waitForTimeout(STEP_MS * 2 + 500);
    expect(await page.locator(ITEMS).evaluateAll((els) => els.map((el) => el.style.transform))).toEqual(offscreen);
  });
});

test.describe('sz-fixed-nav-task-list reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('task list does not move with reduced motion', async ({ page }) => {
    await open(page);
    await toList(page);
    await page.waitForTimeout(8000);
    expect((await visibleItems(page)).map((i) => i.text)).toEqual([
      'Update Google Business Profile',
      'Get more reviews',
      'Sort out website bookings',
    ]);
    const duration = await page.$eval(PANEL, (el) => getComputedStyle(el).transitionDuration);
    expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
  });
});

test.describe('sz-fixed-nav-task-list without the modules', () => {
  test('task list shows the first three items when the module is blocked', async ({ page }) => {
    await page.route(MODULE_URL, (route) => route.abort());
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await expect(page.locator(`${ITEMS}:visible`)).toHaveCount(3);
    await expect(page.locator(`${ITEMS}:nth-child(n+4):visible`)).toHaveCount(0);
  });

  test('nav keeps its own scheme when the module is blocked', async ({ page }) => {
    await page.route(MODULE_URL, (route) => route.abort());
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await scrollTo(page, 3000);
    await expect(page.locator(NAV)).toHaveClass(/u-scheme-brunello-dark/);
    expect(await page.$eval(NAV, (el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
    await expect(page.locator(BUTTON)).toHaveAttribute('href', /#contact$/);
  });
});

test.describe('sz-fixed-nav-task-list nav', () => {
  test('nav stays at the top of the viewport on home, terms, privacy and 404', async ({ page }) => {
    for (const path of PAGES) {
      await open(page, path);
      expect(await page.$eval(NAV, (el) => getComputedStyle(el).position)).toBe('sticky');
      const end = await page.evaluate(() => document.documentElement.scrollHeight);
      for (const y of [0, 800, 3000, end]) {
        await scrollTo(page, y);
        const top = await page.$eval(NAV, (el) => el.getBoundingClientRect().top);
        expect(Math.abs(top), `${path} at ${y}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('nav shows the wordmark and the Contact button and keeps the link lists hidden', async ({ page }) => {
    await open(page);
    await expect(page.locator(WORDMARK)).toBeVisible();
    await expect(page.locator(BUTTON)).toHaveCount(1);
    await expect(page.locator(BUTTON)).toHaveText('Contact');
    await expect(page.locator(BUTTON)).toHaveAttribute('href', /#contact$/);
    await expect(page.locator(`${NAV} .sz-nav_list:visible`)).toHaveCount(0);
    const height = await page.$eval(BUTTON, (el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  });

  test('Contact button lands the contact section below the nav from home and from terms', async ({ page }) => {
    await open(page);
    await page.click(BUTTON);
    await page.waitForTimeout(1500);
    expect(Math.abs(await navGap(page, '#contact'))).toBeLessThanOrEqual(2);

    await open(page, '/terms');
    await Promise.all([page.waitForURL(/\/#contact$/), page.click(BUTTON)]);
    await page.waitForLoadState('networkidle');
    if (LOCAL) for (const path of MODULES) await page.addScriptTag({ path });
    await page.waitForTimeout(1500);
    expect(Math.abs(await navGap(page, '#contact'))).toBeLessThanOrEqual(2);
  });

  test('in-page anchors land below the nav', async ({ page }) => {
    await open(page);
    for (const id of ['#work', '#pricing', '#about', '#agencies', '#faq']) {
      await page.$eval(id, (el) => el.scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(200);
      expect(Math.abs(await navGap(page, id)), id).toBeLessThanOrEqual(2);
    }
  });

  test('Webflow anchor scroll handler is removed after load', async ({ page }) => {
    await open(page);
    const namespaces = await page.evaluate(() =>
      ((window.jQuery && window.jQuery._data(document, 'events')?.click) || []).map((h) => h.namespace),
    );
    expect(namespaces).not.toContain('wf-scroll');
  });

  test('nav takes the scheme of the section below it and covers the gutters', async ({ page }) => {
    await open(page);
    const sections = await page.$$eval('main > section, footer[data-sz="footer"]', (els) =>
      els.map((el) => ({
        sel: `[data-sz="${el.dataset.sz}"]`,
        scheme: [...el.classList].find((c) => c.startsWith('u-scheme-')),
      })),
    );
    for (const { sel, scheme } of sections) {
      await page.evaluate(
        ({ nav, sel }) => {
          const navH = document.querySelector(nav).getBoundingClientRect().height;
          const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top - navH + 8, behavior: 'instant' });
        },
        { nav: NAV, sel },
      );
      await page.waitForTimeout(400);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if ((await page.evaluate(() => scrollY)) >= max - 1) continue;
      await expect(page.locator(NAV), sel).toHaveClass(new RegExp(scheme));
      const [navBg, panelBg, sectionBg] = await page.evaluate(
        ({ nav, panel, sel }) =>
          [nav, panel, sel].map((s) =>
            getComputedStyle(document.querySelector(s)).getPropertyValue('--_color-schemes---scheme--background').trim(),
          ),
        { nav: NAV, panel: PANEL, sel },
      );
      expect(navBg, sel).toBe(sectionBg);
      expect(panelBg, sel).toBe(sectionBg);
      const hits = await page.$eval(NAV, (el) => {
        const r = el.getBoundingClientRect();
        const y = r.top + r.height / 2;
        return [r.left + r.width / 2, 8].map((x) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(hit && hit.closest('[data-sz="nav"]'));
        });
      });
      expect(hits, `${sel} covers the nav centre and gutter`).toEqual([true, true]);
    }
  });

  test('wordmark colour changes between a dark and a light section', async ({ page }) => {
    await open(page);
    const colour = () => page.$eval(WORDMARK, (el) => getComputedStyle(el).color);
    await scrollTo(page, 0);
    await page.waitForTimeout(400);
    const overHero = await colour();
    await page.$eval('[data-sz="problem"]', (el) => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(400);
    expect(await colour()).not.toBe(overHero);
  });

  for (const width of [320, 390, 768, 1280]) {
    test(`wordmark and button do not overlap at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const [a, b] = await Promise.all([
        page.$eval(WORDMARK, (el) => el.getBoundingClientRect().toJSON()),
        page.$eval(BUTTON, (el) => el.getBoundingClientRect().toJSON()),
      ]);
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
});

test.describe('sz-fixed-nav-task-list release', () => {
  test('loader pins v1.2.0 and loads four modules', async ({ page }) => {
    test.skip(LOCAL, 'checks the released loader only');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => window.SZ && window.SZ.version)).toBe('1.2.0');
    expect(await page.evaluate(() => window.SZ.modules)).toEqual(['global.js', 'contact-steps.js', 'nav.js', 'task-list.js']);
  });

  for (const path of PAGES) {
    test(`no console errors and no serious axe violations on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));
      await open(page, path);
      await scrollTo(page, 2000);
      await page.waitForTimeout(STEP_MS);
      const results = await new AxeBuilder({ page }).include(NAV).analyze();
      const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(bad.map((v) => v.id)).toEqual([]);
      expect(errors.filter((e) => !/404/.test(e) || path !== '/404')).toEqual([]);
    });
  }
});
