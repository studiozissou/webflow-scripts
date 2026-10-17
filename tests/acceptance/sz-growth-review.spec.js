// Acceptance tests for sz-growth-review: every page the weekly growth job changed in the last 28 days still meets the redesign's meta, schema, FAQ, link and locale rules, an autopilot-off week produced no change rows, and a sample of unchanged pages still passes; skipped until SZ_REDESIGN=1 and the experiment log exists.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_LIVE_URL || process.env.STAGING_URL || 'https://studiozissou.webflow.io').replace(/\/$/, '');
const LOG = resolve('projects/studio-zissou/.claude/experiments/log.md');
const BRAND = 'Studio Zissou';
const EN_ONLY = ['/for-agencies', '/services/webflow-development'];
const SAMPLE_UNCHANGED = ['/', '/services/website-care', '/locations/haarlem', '/nl', '/nl/diensten/website-onderhoud'];
const DAY = 24 * 60 * 60 * 1000;

test.skip(!process.env.SZ_REDESIGN, 'Set SZ_REDESIGN=1 once the redesigned pages are published');
test.skip(!existsSync(LOG), 'Skipped until projects/studio-zissou/.claude/experiments/log.md exists');

function parseLog() {
  const text = readFileSync(LOG, 'utf8');
  const rows = text
    .split('\n')
    .filter((line) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const changes = rows.filter((cells) => cells.length >= 8 && cells[1].startsWith('/'));
  const weeks = rows.filter((cells) => /^\d{4}-W\d{2}$/.test(cells[1] || ''));
  return { changes, weeks };
}

function recentPages() {
  const { changes } = parseLog();
  const cutoff = Date.now() - 28 * DAY;
  return [...new Set(changes.filter((c) => new Date(c[0]).getTime() >= cutoff).map((c) => c[1]))];
}

async function visit(page, path) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  return { response, errors };
}

async function meta(page) {
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    h1s: document.querySelectorAll('h1').length,
    lang: document.documentElement.lang,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    faqs: document.querySelectorAll('[data-sz="faq"] details, [itemtype*="Question"]').length,
    hashLinks: [...document.querySelectorAll('a[href="#"]')].length,
    hrefs: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
  }));
}

test.describe('sz-growth-review', () => {
  test('log-present-and-parseable', () => {
    const { changes, weeks } = parseLog();
    expect(weeks.length).toBeGreaterThan(0);
    for (const row of changes) {
      expect(['auto', 'review']).toContain(row[2]);
      expect(row[1]).toMatch(/^\//);
    }
  });

  test('autopilot-off-week-has-no-changes', () => {
    const { changes, weeks } = parseLog();
    const offWeeks = weeks.filter((w) => w.join(' ').includes('autopilot.off')).map((w) => w[0]);
    for (const date of offWeeks) {
      expect(changes.filter((c) => c[0] === date)).toHaveLength(0);
    }
  });

  for (const path of recentPages()) {
    test(`changed-page-rules ${path}`, async ({ page }) => {
      const { response, errors } = await visit(page, path);
      expect(response.status()).toBe(200);
      const m = await meta(page);
      expect(errors, 'changed-pages-no-console-errors').toHaveLength(0);
      expect(m.h1s, 'changed-pages-one-h1').toBe(1);
      expect(m.title.length, 'changed-pages-title-length-and-brand').toBeGreaterThanOrEqual(30);
      expect(m.title.length).toBeLessThanOrEqual(60);
      expect(m.title.endsWith(BRAND)).toBe(true);
      expect(m.description.length, 'changed-pages-description-length').toBeGreaterThanOrEqual(70);
      expect(m.description.length).toBeLessThanOrEqual(160);
      expect(m.jsonLd.length, 'changed-pages-jsonld-valid').toBeGreaterThan(0);
      for (const raw of m.jsonLd) {
        const parsed = JSON.parse(raw);
        const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        for (const node of nodes) expect(node['@type']).toBeTruthy();
      }
      if (m.faqs > 0) {
        expect(m.faqs, 'changed-pages-faq-count').toBeGreaterThanOrEqual(3);
        expect(m.faqs).toBeLessThanOrEqual(6);
      }
      expect(m.hashLinks, 'changed-pages-no-hash-links').toBe(0);
      if (path.startsWith('/nl')) {
        expect(m.lang, 'changed-nl-pages-locale-clean').toBe('nl');
        for (const href of m.hrefs) {
          expect(href.startsWith('/nl')).toBe(true);
          expect(EN_ONLY.some((p) => href === p || href.startsWith(`${p}/`))).toBe(false);
        }
      }
    });
  }

  for (const path of SAMPLE_UNCHANGED) {
    test(`unchanged-sample-pages-meta-rules ${path}`, async ({ page }) => {
      const { errors } = await visit(page, path);
      const m = await meta(page);
      expect(errors).toHaveLength(0);
      expect(m.h1s).toBe(1);
      expect(m.title.endsWith(BRAND)).toBe(true);
      expect(m.description.length).toBeGreaterThanOrEqual(70);
      expect(m.description.length).toBeLessThanOrEqual(160);
    });
  }
});
