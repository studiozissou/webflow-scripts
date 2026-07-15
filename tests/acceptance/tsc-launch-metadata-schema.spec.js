import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

// All 11 RailOS Apps item pages — must each have a unique, non-empty, on-brand title.
const APP_SLUGS = [
  'etcs-app', 'tbl1-app', 'pzb-app', 'kvb-app', 'istm-app', 'tcms-app',
  'djr-app', 'tru-app', 'lru-app', 'wstm-app', 'toba-app',
];

// Exact worked examples from the spec (WS-A A2).
const APP_EXACT = [
  {
    url: '/railos-apps/etcs-app',
    title: 'ETCS App: Software-Defined Train Protection | TSC',
    description:
      "TSC's ETCS app is certified onboard train protection, software-defined on RailOS and combinable with iSTM and wSTM for multi-country Class B. See the app.",
  },
  {
    url: '/railos-apps/tbl1-app',
    title: 'TBL1+ App: Belgian Class B ATP on RailOS | TSC',
    description:
      'TBL1+ is TSC\'s software-defined Belgian Class B ATP, in service on the Lineas HLD77 fleet since 2025 — available in ++ and NG variants. See the app.',
  },
];

// Pages sampled for schema-type presence: [path, expected @type].
const SCHEMA_PAGES = [
  ['/', 'Organization'],
  ['/', 'WebSite'],
  ['/products/etcs', 'Product'],
  ['/services/maintenance', 'Service'],
  ['/news/worlds-first-software-defined-etcs-certified', 'NewsArticle'],
  ['/railos-apps/etcs-app', 'SoftwareApplication'],
  ['/faq', 'FAQPage'],
  ['/leadership', 'Person'],
];

const ALL_SAMPLED = [
  '/', '/products/etcs', '/services/maintenance', '/faq', '/leadership',
  '/railos-apps/etcs-app', '/news/worlds-first-software-defined-etcs-certified',
];

const metaContent = (page, name) =>
  page.locator(`meta[name="${name}"]`).getAttribute('content');

// Collect every JSON-LD block on the page, flattened (@graph expanded), as objects.
async function readJsonLd(page) {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const nodes = [];
  for (const txt of raw) {
    let parsed;
    try { parsed = JSON.parse(txt); } catch { continue; }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const it of items) {
      if (it && it['@graph'] && Array.isArray(it['@graph'])) nodes.push(...it['@graph']);
      else nodes.push(it);
    }
  }
  return { raw, nodes };
}

const typeMatches = (node, wanted) => {
  const t = node && node['@type'];
  return Array.isArray(t) ? t.includes(wanted) : t === wanted;
};

test.describe('TSC launch metadata + schema', () => {

  // ── WS-A: RailOS Apps metadata ────────────────────────────────
  test.describe('RailOS Apps metadata', () => {
    test('all 11 app pages have distinct, valid, on-brand titles + descriptions', async ({ page }) => {
      const titles = new Set();
      for (const slug of APP_SLUGS) {
        await page.goto(`${STAGING_URL}/railos-apps/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const title = (await page.title()).trim();
        const desc = ((await metaContent(page, 'description')) || '').trim();

        expect(title, `${slug} title non-empty`).not.toEqual('');
        expect(title, `${slug} title not bare brand`).not.toEqual('The Signalling Company');
        expect(title.length, `${slug} title <= 65`).toBeLessThanOrEqual(65);
        expect(desc.length, `${slug} desc 50-160`).toBeGreaterThanOrEqual(50);
        expect(desc.length, `${slug} desc 50-160`).toBeLessThanOrEqual(160);

        expect(titles.has(title), `${slug} title is unique`).toBe(false);
        titles.add(title);
      }
    });

    for (const item of APP_EXACT) {
      test(`exact metadata — ${item.url}`, async ({ page }) => {
        await page.goto(`${STAGING_URL}${item.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        expect((await page.title()).trim()).toBe(item.title);
        expect(((await metaContent(page, 'description')) || '').trim()).toBe(item.description);
      });
    }
  });

  // ── WS-B: JSON-LD schema ──────────────────────────────────────
  test.describe('JSON-LD schema', () => {
    test('every sampled page has parseable JSON-LD with a schema.org @context', async ({ page }) => {
      for (const path of ALL_SAMPLED) {
        await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const { raw, nodes } = await readJsonLd(page);
        expect(raw.length, `${path} has >=1 ld+json block`).toBeGreaterThan(0);
        // At least one block parsed into a node
        expect(nodes.length, `${path} parseable JSON-LD`).toBeGreaterThan(0);
        const ctxOk = nodes.some((n) => JSON.stringify(n['@context'] || '').includes('schema.org'));
        expect(ctxOk, `${path} has schema.org @context`).toBe(true);
      }
    });

    for (const [path, wantedType] of SCHEMA_PAGES) {
      test(`${path} exposes ${wantedType}`, async ({ page }) => {
        await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const { nodes } = await readJsonLd(page);
        const found = nodes.some((n) => typeMatches(n, wantedType));
        expect(found, `${path} should contain @type ${wantedType}`).toBe(true);
      });
    }

    test('Organization schema omits disputed facts (no numberOfEmployees/founder)', async ({ page }) => {
      await page.goto(`${STAGING_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const { nodes } = await readJsonLd(page);
      const org = nodes.find((n) => typeMatches(n, 'Organization'));
      expect(org, 'Organization node present').toBeTruthy();
      expect(org.numberOfEmployees, 'no numberOfEmployees').toBeUndefined();
      expect(org.founder, 'no founder').toBeUndefined();
    });
  });

  // ── No console errors across sampled pages ────────────────────
  for (const path of ALL_SAMPLED) {
    test(`no console errors — ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      expect(errors, `console errors on ${path}: ${errors.join(' | ')}`).toHaveLength(0);
    });
  }
});
