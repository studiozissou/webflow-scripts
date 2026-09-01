/**
 * Acceptance tests — Coconut: remove the "!" from the brand name
 *
 * Spec: projects/coconut/.claude/specs/remove-brand-exclamation-mark.md
 * Target: staging while building; switch BASE_URL to www.getcoconut.com after go-live
 *
 * Run: npx playwright test tests/acceptance/coconut-remove-brand-exclamation-mark.spec.js
 *
 * Two of these tests are deliberate REGRESSION GUARDS that assert "!Coconut" is still
 * present. They protect decisions D1 (asset filenames untouched) and D3 (FCA disclosure
 * untouched). If they fail, the sweep went further than it was scoped to.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://getcoconut.webflow.io';
const SLUG = 'coconut-remove-brand-exclamation-mark';

const BANG = '!Coconut';

const PAGES = [
  { path: '/', name: 'homepage' },
  { path: '/pricing', name: 'pricing' },
  { path: '/legal/terms', name: 'terms' },
  { path: '/knowledge-hub/set-up-books-sole-trader', name: 'knowledge hub article' },
];

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
}

async function loadPage(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(1000);
}

/** Visible text only — excludes attributes, URLs and script contents. */
async function visibleText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function jsonLdBlocks(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (s) => s.textContent || ''
    )
  );
}

/** Strips every "https://..." string value so asset URLs don't trip content assertions. */
function stripUrlValues(jsonText) {
  return jsonText.replace(/"https?:\/\/[^"]*"/g, '""');
}

// ── Visible copy is clean ─────────────────────────────────────

test.describe(`${SLUG} — visible copy`, () => {
  for (const { path, name } of PAGES) {
    test(`${name}: no exclamation-prefixed brand in visible body text`, async ({ page }) => {
      await loadPage(page, path);
      const text = await visibleText(page);

      // The FCA disclaimer is deliberately out of scope (D3), so remove it before asserting.
      const withoutDisclaimer = text
        .split('\n')
        .filter((line) => !line.includes('trading names of'))
        .join('\n');

      expect(withoutDisclaimer, `"${BANG}" still visible on ${path}`).not.toContain(BANG);
    });

    test(`${name}: page title has no exclamation-prefixed brand`, async ({ page }) => {
      await loadPage(page, path);
      const title = await page.title();
      expect(title).not.toContain(BANG);
      expect(title.toLowerCase()).toContain('coconut');
    });
  }
});

// ── Shared components ─────────────────────────────────────────

test.describe(`${SLUG} — shared nav and footer`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/');
  });

  test('nav and footer render "Coconut news"', async ({ page }) => {
    const links = page.getByText('Coconut news', { exact: false });
    await expect(links.first()).toBeVisible();

    const all = await links.allTextContents();
    expect(all.length, 'expected at least one "Coconut news" link').toBeGreaterThan(0);
    for (const t of all) {
      expect(t).not.toContain(BANG);
    }
  });

  test('footer copyright reads "Coconut. All rights reserved."', async ({ page }) => {
    const text = await visibleText(page);
    expect(text).toContain('Coconut. All rights reserved.');
    expect(text).not.toContain('!Coconut. All rights reserved.');
  });

  test('footer signup heading is clean', async ({ page }) => {
    const text = await visibleText(page);
    expect(text).toContain('Coconut: the accounting');
    expect(text).not.toContain('!Coconut: the accounting');
  });
});

// ── Regression guards — these assert "!Coconut" IS still present ──

test.describe(`${SLUG} — scope guards`, () => {
  test('GUARD D3: FCA disclaimer is left untouched', async ({ page }) => {
    await loadPage(page, '/');
    const text = await visibleText(page);

    const line = text.split('\n').find((l) => l.includes('trading names of'));
    expect(line, 'FCA disclaimer sentence not found in footer').toBeTruthy();
    expect(
      line,
      'FCA disclaimer was modified — it is explicitly out of scope pending sign-off (D3)'
    ).toContain(`${BANG} are trading names`);
  });

  test('GUARD D1: logo asset URLs still use the original filename', async ({ page }) => {
    await loadPage(page, '/');
    const srcs = await page.evaluate(() =>
      Array.from(document.images).map((i) => i.getAttribute('src') || '')
    );
    const logoRefs = srcs.filter((s) => s.includes('_2025_logo'));
    expect(logoRefs.length, 'no logo image found to check').toBeGreaterThan(0);
    expect(
      logoRefs.some((s) => s.includes('!Coconut_2025_logo')),
      'logo asset filename was rewritten — assets are out of scope (D1)'
    ).toBeTruthy();
  });

  test('GUARD D6: Organization alternateName is retained', async ({ page }) => {
    await loadPage(page, '/');
    const blocks = await jsonLdBlocks(page);
    const org = blocks.find((b) => b.includes('"Organization"') && b.includes('alternateName'));
    expect(org, 'Organization JSON-LD block not found').toBeTruthy();
    expect(
      org,
      'alternateName was removed — D6 says retain it as a legacy alias'
    ).toContain('"alternateName": "!Coconut"');
  });
});

// ── Structured data ───────────────────────────────────────────

test.describe(`${SLUG} — JSON-LD`, () => {
  for (const { path, name } of PAGES) {
    test(`${name}: JSON-LD parses and brand names are clean`, async ({ page }) => {
      await loadPage(page, path);
      const blocks = await jsonLdBlocks(page);

      for (const raw of blocks) {
        expect(() => JSON.parse(raw), `invalid JSON-LD on ${path}`).not.toThrow();

        const parsed = JSON.parse(raw);
        // alternateName is a deliberate exception (D6); URL values are out of scope (D1).
        const scrubbed = stripUrlValues(JSON.stringify(parsed)).replace(
          /"alternateName":\s*"!Coconut"/g,
          ''
        );
        expect(scrubbed, `"${BANG}" left in JSON-LD values on ${path}`).not.toContain(BANG);
      }
    });
  }
});

// ── Assets and console health ─────────────────────────────────

test.describe(`${SLUG} — no collateral damage`, () => {
  for (const { path, name } of PAGES) {
    test(`${name}: all images load`, async ({ page }) => {
      const failed = [];
      page.on('response', (res) => {
        if (res.request().resourceType() === 'image' && res.status() >= 400) {
          failed.push(`${res.status()} ${res.url()}`);
        }
      });

      await loadPage(page, path);
      await page.waitForTimeout(1500);

      expect(failed, `broken images on ${path}:\n${failed.join('\n')}`).toHaveLength(0);
    });

    test(`${name}: no console errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await loadPage(page, path);
      await page.waitForTimeout(1000);

      expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toHaveLength(0);
    });
  }
});
