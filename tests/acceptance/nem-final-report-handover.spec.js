/**
 * Acceptance tests — nem-final-report-handover
 *
 * Covers the Webflow half of Alex's 24 Sep requests: the vAlex design is published at the
 * slug the n8n PDF builder fetches, it still carries every slot that builder requires, and
 * its contact line points at a page that exists instead of the never-live /nl/contact.
 *
 * The PDF filename lives in n8n and is covered by tests/nem/nem-verify-report-email.test.js.
 *
 * Spec: projects/nem-life/.claude/specs/nem-final-report-handover.md
 * Tier 1 (Playwright, staging). Expected to fail until T4 + T5 ship.
 */
import { test, expect } from '@playwright/test';

import { STAGING } from './helpers/nem-quiz.js';

const SLUG = 'nem-final-report-handover';
const TEMPLATE_PATH = '/report-pdf-template';
const OLD_VALEX_PATH = '/report-pdf-template-valex';
const LIVE_CONTACT = 'https://www.nemlife.com/contact';

/** Slots Build HTML throws on when missing (nem-verify.workflow.json, Build HTML node). */
const REQUIRED_SLOTS = ['first-name', 'date', 'opening', 'reaction', 'origin', 'cost', 'closing', 'intro-line'];

test.describe(SLUG, () => {
  const consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    const response = await page.goto(`${STAGING}${TEMPLATE_PATH}`, { waitUntil: 'load', timeout: 30_000 });
    expect(response.status()).toBe(200);
  });

  test('report template exposes every slot the PDF builder requires', async ({ page }) => {
    for (const slot of REQUIRED_SLOTS) {
      await expect(page.locator(`[data-slot="${slot}"]`), `missing data-slot="${slot}"`).toHaveCount(1);
    }
  });

  test('report template keeps at least one intro-line wrapper', async ({ page }) => {
    expect(await page.locator('[data-slot-wrap="intro-line"]').count()).toBeGreaterThan(0);
  });

  test('report template has no /nl/ links', async ({ page }) => {
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.filter((h) => /\/nl(\/|$)/.test(h))).toEqual([]);
  });

  test('report template contact link points at the live contact page', async ({ page }) => {
    await expect(page.locator(`a[href="${LIVE_CONTACT}"]`)).toHaveCount(1);
  });

  test('live contact page resolves', async ({ request }) => {
    const response = await request.get(LIVE_CONTACT);
    expect(response.status()).toBe(200);
  });

  test('report template loads with no console errors', async ({ page }) => {
    await page.waitForTimeout(1000);
    expect(consoleErrors).toEqual([]);
  });

  test('old vAlex slug is no longer the template (slug swap done)', async ({ request }) => {
    const response = await request.get(`${STAGING}${OLD_VALEX_PATH}`);
    expect(response.status()).toBe(404);
  });
});
