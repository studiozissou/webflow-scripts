/**
 * Acceptance tests for carsa-service-migration
 *
 * Validates the migration of service.carsa.co.uk content to the main
 * carsa.co.uk site — hub page, location template, winter health check,
 * cross-sell sections, schema, and responsive behaviour.
 *
 * Spec: projects/carsa/.claude/specs/carsa-service-migration.md
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'carsa-service-migration';
const BASE = process.env.STAGING_URL || 'https://carsa-v2.webflow.io';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path) {
  await page.goto(`${BASE}${path}`);
  await waitForReady(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Hub Page (/mot-and-car-servicing) ─────────────────────────────────────

test.describe(`${SLUG} — Hub Page`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/mot-and-car-servicing');
  });

  test('hub page loads with H1', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeAttached();
    const text = await h1.textContent();
    expect(text.toLowerCase()).toContain('servicing');
  });

  test('4 service offer cards visible', async ({ page }) => {
    // Adjust selector to match actual card class used in Webflow build
    const cards = page.locator('[data-service-card], .service-card');
    await expect(cards).toHaveCount(4);
  });

  test('partnership callout visible', async ({ page }) => {
    const callout = page.locator('.is-hiq-partner, [data-partner-callout]');
    await expect(callout.first()).toBeVisible();
  });

  test('5 location cards with booking links', async ({ page }) => {
    const locationLinks = page.locator('a[href*="/mot-and-car-servicing/"]');
    const count = await locationLinks.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});

// ── Location Template (/mot-and-car-servicing/{slug}) ─────────────────────

test.describe(`${SLUG} — Location Template`, () => {
  const locations = ['halesowen', 'cannock', 'bolton', 'towcester', 'mountsorrel'];

  for (const loc of locations) {
    test(`location page loads: ${loc}`, async ({ page }) => {
      await loadPage(page, `/mot-and-car-servicing/${loc}`);
      const h1 = page.locator('h1');
      await expect(h1).toBeAttached();
    });
  }

  test('Acuity embed loads on location page', async ({ page }) => {
    await loadPage(page, '/mot-and-car-servicing/halesowen');
    const iframe = page.locator('iframe[src*="acuityscheduling.com"]');
    await expect(iframe).toBeAttached({ timeout: 10_000 });
  });
});

// ── Winter Health Check ───────────────────────────────────────

test.describe(`${SLUG} — Winter Health Check`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, '/mot-and-car-servicing/winter-health-check');
  });

  test('winter health check page loads', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeAttached();
    const text = await h1.textContent();
    expect(text.toLowerCase()).toContain('winter');
  });

  test('8 checklist items visible', async ({ page }) => {
    // Adjust selector to match actual checklist items in Webflow build
    const items = page.locator('[data-checklist-item], .checklist_item');
    await expect(items).toHaveCount(8);
  });
});

// ── Cross-sell Section ────────────────────────────────────────

test.describe(`${SLUG} — Cross-sell Section`, () => {
  test('cross-sell section on service-enabled store page', async ({ page }) => {
    await loadPage(page, '/stores/halesowen');
    const crossSell = page.locator('[data-service-crosssell], .service-crosssell');
    await expect(crossSell.first()).toBeVisible();
  });

  test('cross-sell section NOT on non-service store page', async ({ page }) => {
    await loadPage(page, '/stores/durham');
    const crossSell = page.locator('[data-service-crosssell], .service-crosssell');
    await expect(crossSell).toHaveCount(0);
  });
});

// ── Console Errors ────────────────────────────────────────────

test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on hub page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/mot-and-car-servicing');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on location page', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/mot-and-car-servicing/halesowen');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });

  test('no JS errors on winter health check', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/mot-and-car-servicing/winter-health-check');
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Schema ────────────────────────────────────────────────────

test.describe(`${SLUG} — Schema`, () => {
  test('JSON-LD Service schema on hub page', async ({ page }) => {
    await loadPage(page, '/mot-and-car-servicing');
    const schema = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent);
          if (data['@type'] === 'Service' || (Array.isArray(data['@graph']) && data['@graph'].some(n => n['@type'] === 'Service'))) {
            return true;
          }
        } catch (e) { /* skip malformed */ }
      }
      return false;
    });
    expect(schema).toBe(true);
  });

  test('JSON-LD AutoRepair schema on location page', async ({ page }) => {
    await loadPage(page, '/mot-and-car-servicing/halesowen');
    const schema = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent);
          if (data['@type'] === 'AutoRepair' || (Array.isArray(data['@graph']) && data['@graph'].some(n => n['@type'] === 'AutoRepair'))) {
            return true;
          }
        } catch (e) { /* skip malformed */ }
      }
      return false;
    });
    expect(schema).toBe(true);
  });
});

// ── Responsive ────────────────────────────────────────────────

test.describe(`${SLUG} — Responsive`, () => {
  test('hub page sections visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page, '/mot-and-car-servicing');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('Acuity embed fits at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page, '/mot-and-car-servicing/halesowen');
    const iframe = page.locator('iframe[src*="acuityscheduling.com"]');
    await expect(iframe).toBeAttached({ timeout: 10_000 });
    const box = await iframe.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });
});
