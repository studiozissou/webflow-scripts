/**
 * Acceptance tests — nem-validation-round-2
 *
 * Alex's last three blue items (1-2, 4-4, 4-5): one disclaimer per screen, below the card,
 * test copy on screens 1-4 and report copy on screens 5-6.
 * Spec: projects/nem-life/.claude/specs/nem-validation-round-2.md
 *
 * Written before the build (TDD): these FAIL on staging until the component is pasted and the
 * Designer copy is restored. The screen 6 test mocks the n8n webhook, so nothing is stored.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

import {
  TEST_PAGE_NL,
  QUIZ_TEST_TIMEOUT_MS,
  loadPage,
  answerByIndices,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

dotenv.config({ path: '.env.test' });

const SLUG = 'nem-validation-round-2';

const TEST_DISCLAIMER =
  'Deze test is geen psychologische diagnose. Het is een spiegel op basis van jouw antwoorden - puur bedoeld voor inzicht en bewustwording.';
const REPORT_DISCLAIMER =
  'Dit rapport is geen diagnose. Het is een spiegel op basis van jouw antwoorden - puur bedoeld voor inzicht en bewustwording.';
const DISCLAIMER_GREY = 'rgb(159, 156, 139)';

const module = (page) => page.locator('[data-element="quiz-module"]');
const pageDisclaimer = (page) => page.locator('[data-element="disclaimer"]');

/* Same dual profile as round 1 — all-"soms" scores flat and skips the report CTA. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];

async function reachOptin(page) {
  await loadPage(page);
  await answerByIndices(page, DUAL_PROFILE);
  await fillProfileScreen(page, 'Vrouw');
  await expect(page.locator('[data-element="conclusion-text"]')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();
  await expect(page.getByPlaceholder('Voornaam')).toBeVisible({ timeout: 10_000 });
}

async function expectSingleReportDisclaimer(page) {
  await expect(module(page).getByText('Dit rapport is geen diagnose', { exact: false })).toHaveCount(0);
  await expect(pageDisclaimer(page)).toHaveCount(1);
  await expect(pageDisclaimer(page)).toHaveText(REPORT_DISCLAIMER);
}

test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

test.describe(SLUG, () => {
  test('screen 1: page disclaimer shows the Notion test copy in the small grey style', async ({
    page,
  }) => {
    await loadPage(page);
    const el = pageDisclaimer(page);
    await expect(el).toHaveText(TEST_DISCLAIMER);
    const { fontSize, rootSize, color, align } = await el.evaluate((node) => {
      const s = getComputedStyle(node);
      return {
        fontSize: parseFloat(s.fontSize),
        rootSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
        color: s.color,
        align: s.textAlign,
      };
    });
    expect(fontSize).toBeCloseTo(rootSize * 0.875, 1);
    expect(color).toBe(DISCLAIMER_GREY);
    expect(align).toBe('center');
  });

  test('screen 5: no disclaimer inside the card; page disclaimer shows the report copy', async ({
    page,
  }) => {
    await reachOptin(page);
    await expectSingleReportDisclaimer(page);
  });

  test('screen 6: no disclaimer inside the card; page disclaimer shows the report copy, and still does after going back to opt-in', async ({
    page,
  }) => {
    await page.route('**/webhook/nem-submit', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"status":"ok"}',
      }),
    );
    await reachOptin(page);
    await page.getByPlaceholder('Voornaam').fill('Test');
    await page.getByPlaceholder('E-mailadres').fill('will+nem-round2@teamzissou.io');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();

    await expect(page.getByRole('heading', { name: 'Nog één stap' })).toBeVisible({
      timeout: 10_000,
    });
    await expectSingleReportDisclaimer(page);

    await page.getByRole('button', { name: 'Vul het opnieuw in.' }).click();
    await expect(page.getByPlaceholder('Voornaam')).toBeVisible({ timeout: 10_000 });
    await expectSingleReportDisclaimer(page);
  });

  test('reload after opt-in restores the test copy', async ({ page }) => {
    await reachOptin(page);
    await expect(pageDisclaimer(page)).toHaveText(REPORT_DISCLAIMER);
    await loadPage(page, TEST_PAGE_NL);
    await expect(pageDisclaimer(page)).toHaveText(TEST_DISCLAIMER);
  });

  test('quiz run to opt-in has no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await reachOptin(page);
    expect(errors).toEqual([]);
  });
});
