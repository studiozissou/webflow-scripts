// Acceptance tests for sz-legal-rich-text: the Team Zissou privacy body is one class-free Rich Text block with heading spacing from Layout variables, under a short hero built from the Home hero classes.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_STAGING_URL || 'https://teamzissou.webflow.io').replace(/\/$/, '');
const T0_PATH = process.env.SZ_LEGAL_T0 || '';
const T0 = T0_PATH && fs.existsSync(T0_PATH) ? JSON.parse(fs.readFileSync(T0_PATH, 'utf8')) : null;

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

async function open(page, path, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}

test.describe('sz-legal-rich-text', () => {
  test('privacy body is one rich text block with no classes inside', async ({ page }) => {
    await open(page, '/privacy', 1280);
    const rt = page.locator('section.section_legal .text-rich-text.w-richtext');
    await expect(rt).toHaveCount(1);
    expect(await rt.locator('[class]').count()).toBe(0);
    await expect(page.locator('.sz-legal_body')).toHaveCount(0);
  });

  test('privacy text and links match the baseline copy', async ({ page }) => {
    await open(page, '/privacy', 1280);
    const rt = page.locator('.text-rich-text');
    expect(T0, 'set SZ_LEGAL_T0 to the T0 baseline JSON').not.toBeNull();
    const text = collapse(await rt.innerText());
    expect(text).toBe(collapse(T0.text));
    const mailto = await rt.locator('a[href="mailto:will@teamzissou.io"]').count();
    expect(mailto).toBe(2);
  });

  for (const width of [1280, 390]) {
    test(`rich text h2 looks like heading-style-h3 at ${width}`, async ({ page }) => {
      await open(page, '/privacy', width);
      const result = await page.evaluate(() => {
        const keys = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color'];
        const ref = document.createElement('h2');
        ref.className = 'heading-style-h3';
        ref.textContent = 'Ref';
        document.querySelector('.text-rich-text').parentElement.appendChild(ref);
        const want = getComputedStyle(ref);
        const wantVals = Object.fromEntries(keys.map((k) => [k, want[k]]));
        const got = [...document.querySelectorAll('.text-rich-text h2')].map((h) => {
          const cs = getComputedStyle(h);
          return Object.fromEntries(keys.map((k) => [k, cs[k]]));
        });
        ref.remove();
        return { wantVals, got };
      });
      expect(result.got.length).toBeGreaterThan(0);
      for (const h of result.got) expect(h).toEqual(result.wantVals);
    });
  }

  test('rich text h2 has large space above and small space below', async ({ page }) => {
    await open(page, '/privacy', 1280);
    const margins = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--_layout---spacing--large);height:var(--_layout---spacing--small)';
      document.body.appendChild(probe);
      const large = probe.getBoundingClientRect().width;
      const small = probe.getBoundingClientRect().height;
      probe.remove();
      const rt = document.querySelector('.text-rich-text');
      const list = [...rt.querySelectorAll(':scope > h2')]
        .filter((h) => h !== rt.firstElementChild)
        .map((h) => ({ top: parseFloat(getComputedStyle(h).marginTop), bottom: parseFloat(getComputedStyle(h).marginBottom) }));
      return { large, small, list };
    });
    expect(margins.large).toBeCloseTo(48, 0);
    expect(margins.list.length).toBeGreaterThan(0);
    for (const m of margins.list) {
      expect(m.top).toBeCloseTo(margins.large, 0);
      expect(m.bottom).toBeCloseTo(margins.small, 0);
    }
  });

  test('first rich text child has no top margin', async ({ page }) => {
    await open(page, '/privacy', 1280);
    const edges = await page.evaluate(() => {
      const rt = document.querySelector('.text-rich-text');
      return {
        first: parseFloat(getComputedStyle(rt.firstElementChild).marginTop),
        last: parseFloat(getComputedStyle(rt.lastElementChild).marginBottom),
      };
    });
    expect(edges.first).toBe(0);
    expect(edges.last).toBe(0);
  });

  for (const [width, key] of [
    [1280, 'pGap1280'],
    [390, 'pGap390'],
  ]) {
    test(`privacy paragraph gap, body size and link colour match the baseline at ${width}`, async ({ page }) => {
      expect(T0, 'set SZ_LEGAL_T0 to the T0 baseline JSON').not.toBeNull();
      await open(page, '/privacy', width);
      const got = await page.evaluate(() => {
        const rt = document.querySelector('.text-rich-text');
        const kids = [...rt.children];
        const i = kids.findIndex((el, n) => el.tagName === 'P' && kids[n + 1] && kids[n + 1].tagName === 'P');
        const gap = i < 0 ? null : kids[i + 1].getBoundingClientRect().top - kids[i].getBoundingClientRect().bottom;
        const p = rt.querySelector('p');
        const a = rt.querySelector('a');
        return { gap, fontSize: getComputedStyle(p).fontSize, linkColor: a ? getComputedStyle(a).color : null };
      });
      expect(got.gap).not.toBeNull();
      expect(Math.abs(got.gap - T0[key])).toBeLessThanOrEqual(2);
      if (width === 1280) {
        expect(got.fontSize).toBe(T0.bodyFontSize);
        expect(got.linkColor).toBe(T0.linkColor);
      }
    });
  }

  test('legal section keeps its scheme and sits one section padding below the hero', async ({ page }) => {
    await open(page, '/privacy', 1280);
    const r = await page.evaluate(() => {
      const legal = document.querySelector('section.section_legal');
      const panel = document.querySelector('.sz-hero_panel.is-page');
      const first = document.querySelector('.text-rich-text').firstElementChild;
      return {
        scheme: legal.classList.contains('u-scheme-brunello-light'),
        gap: first.getBoundingClientRect().top - panel.getBoundingClientRect().bottom,
        root: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });
    expect(r.scheme).toBe(true);
    expect(r.gap).toBeCloseTo(8 * r.root, 0);
  });

  for (const width of [1280, 390]) {
    test(`privacy h1 sits in a short hero panel built from the home hero classes at ${width}`, async ({ page }) => {
      await open(page, '/privacy', width);
      await expect(page.locator('h1')).toHaveCount(1);
      const h1 = page.locator(
        'main > section.section_hero.u-scheme-brunello-dark:first-child > .padding-global > .container-large > .sz-hero_panel.is-page.padding-section-large > h1.sz-hero_heading.heading-style-h2',
      );
      await expect(h1).toHaveText('Privacy policy');
      const panel = await page.locator('.sz-hero_panel.is-page').evaluate((el) => {
        const cs = getComputedStyle(el);
        return { minHeight: cs.minHeight, textAlign: cs.textAlign, radius: cs.borderBottomLeftRadius, radiusR: cs.borderBottomRightRadius };
      });
      expect(['0px', 'auto']).toContain(panel.minHeight);
      expect(panel.textAlign).toBe('center');
      expect(parseFloat(panel.radius)).toBeGreaterThan(0);
      expect(panel.radiusR).toBe(panel.radius);
    });
  }

  for (const [width, rem] of [
    [1280, 46],
    [991, 36],
    [767, 28],
  ]) {
    test(`home hero keeps its height at ${width}`, async ({ page }) => {
      await open(page, '/', width);
      const { minHeight, rootPx } = await page.locator('.section_hero .sz-hero_panel').evaluate((el) => ({
        minHeight: parseFloat(getComputedStyle(el).minHeight),
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      }));
      expect(minHeight).toBeCloseTo(rem * rootPx, 0);
      await expect(page.locator('.sz-hero_panel.is-page')).toHaveCount(0);
    });
  }

  for (const width of [320, 390, 768, 1280]) {
    test(`privacy has no horizontal scroll at ${width}`, async ({ page }) => {
      await open(page, '/privacy', width);
      const ok = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(ok).toBe(true);
    });
  }

  for (const path of ['/privacy', '/']) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));
      await open(page, path, 1280);
      expect(errors).toEqual([]);
    });
  }
});
