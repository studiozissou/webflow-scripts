/**
 * Acceptance tests — nem-verification-email-mailersend
 *
 * The verification email is sent transactionally via MailerSend from inside `/submit`, before
 * the webhook responds. So a submit that reaches the confirmation screen without an error is
 * proof the send was accepted — no inbox access needed. Inbox timing (≤ 60 s) stays a manual
 * Tier 3 check until the Gmail e2e tier is configured.
 *
 * Spec: projects/nem-life/.claude/specs/nem-verification-email-mailersend.md
 *
 * Each run sends ONE real email to a plus-alias of Will's inbox and stores one row in the
 * profiles Data Table. Do not point this at production.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

import {
  QUIZ_TEST_TIMEOUT_MS,
  loadPage,
  answerAllQuestions,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

dotenv.config({ path: '.env.test' });

const SLUG = 'nem-verification-email-mailersend';
const SUBMIT_BUDGET_MS = 5_000;
const testAddress = () => `will+nem-ms-${Date.now()}@teamzissou.io`;

async function reachOptin(page) {
  await loadPage(page);
  await answerAllQuestions(page, 'soms');
  await fillProfileScreen(page, 'Vrouw');
  await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();
  await expect(page.getByPlaceholder('Voornaam')).toBeVisible({ timeout: 10_000 });
}

async function submit(page, email) {
  await page.getByPlaceholder('Voornaam').fill('Playwright');
  await page.getByPlaceholder('E-mailadres').fill(email);
  await page.getByRole('checkbox').check();
  const started = Date.now();
  await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();
  return started;
}

test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

test.describe(SLUG, () => {
  test('submit with a real address reaches the confirmation screen without an error', async ({
    page,
  }) => {
    const responses = [];
    page.on('response', async (res) => {
      if (res.url().includes('/webhook/nem-submit')) {
        responses.push(await res.json().catch(() => ({})));
      }
    });
    await reachOptin(page);
    await submit(page, testAddress());
    await expect(page.getByRole('heading', { name: 'Nog één stap' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Er ging iets mis')).toHaveCount(0);
    const submission = responses.find((r) => r.status && r.status !== 'ok');
    expect(submission, 'every /submit response should be status ok').toBeUndefined();
  });

  test('submit round-trip stays under 5 seconds', async ({ page }) => {
    await reachOptin(page);
    const started = await submit(page, testAddress());
    await expect(page.getByRole('heading', { name: 'Nog één stap' })).toBeVisible({
      timeout: SUBMIT_BUDGET_MS,
    });
    expect(Date.now() - started).toBeLessThan(SUBMIT_BUDGET_MS);
  });

  test('quiz page has no console errors after submit', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await reachOptin(page);
    await submit(page, testAddress());
    await expect(page.getByRole('heading', { name: 'Nog één stap' })).toBeVisible({
      timeout: 10_000,
    });
    expect(errors).toEqual([]);
  });
});
