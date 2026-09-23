/**
 * Acceptance tests — nem-verification-email-mailersend
 *
 * The verification email now goes out as a MailerSend template from inside the /submit
 * execution, ahead of Respond OK. So the confirmation screen appearing without an error
 * is the browser-side proof that MailerSend accepted the send, and the time to reach it
 * is the whole round-trip including that send.
 *
 * One real submission per run, to will+nem-ms-<timestamp>@teamzissou.io — the three tests
 * share it (serial, one page) rather than sending three emails. Gated on
 * NEM_SUBMIT_WEBHOOK_URL like the other suites that hit the live backend.
 *
 * Tier 3 (manual, see the spec): email in the inbox within 60 s, template rendering,
 * MailerLite silence, the failure path.
 */
import { test, expect } from '@playwright/test';

import {
  QUIZ_TEST_TIMEOUT_MS,
  loadPage,
  answerByIndices,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

const SLUG = 'nem-verification-email-mailersend';
const ROUND_TRIP_BUDGET_MS = 5_000;

/* An uneven profile that reaches the report path (see nem-test-phase-b.spec.js):
 * false-hope 14, false-power 11 → DUAL, skipsReport false. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];

/* Noise that is not ours: Webflow's own beacons and blocked third-party assets. */
const BENIGN = [/favicon/i, /net::ERR_BLOCKED_BY_CLIENT/i, /hotjar|gtm|googletagmanager|clarity/i];
const isBenign = (message) => BENIGN.some((re) => re.test(message));

const webhookUrl = process.env.NEM_SUBMIT_WEBHOOK_URL;

test.describe.configure({ mode: 'serial' });

test.describe(`${SLUG} — one real submission`, () => {
  test.skip(!webhookUrl, 'Requires NEM_SUBMIT_WEBHOOK_URL — sends one real verification email');

  /** @type {import('@playwright/test').Page} */
  let page;
  const errors = [];
  let roundTripMs = Number.NaN;
  let confirmationVisible = false;
  let genericErrorVisible = false;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
    page = await browser.newPage();
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });

    await loadPage(page);
    await answerByIndices(page, DUAL_PROFILE);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    await page.getByPlaceholder(/voornaam/i).fill('MailerSend Check');
    await page.getByPlaceholder(/e-mailadres/i).fill(`will+nem-ms-${Date.now()}@teamzissou.io`);
    await page.locator('input[type="checkbox"]').first().check();

    const submit = page.getByRole('button', { name: /ontvang mijn rapport/i });
    const confirmation = page.getByText(/nog één stap/i);
    const genericError = page.getByText(/er ging iets mis/i);

    const started = Date.now();
    await submit.click();
    await Promise.race([
      confirmation.waitFor({ state: 'visible', timeout: 15_000 }),
      genericError.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});
    roundTripMs = Date.now() - started;
    confirmationVisible = await confirmation.isVisible();
    genericErrorVisible = await genericError.isVisible();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('submit with a real address reaches the confirmation screen without an error', () => {
    expect(genericErrorVisible, 'status: error came back — MailerSend refused the send').toBe(false);
    expect(confirmationVisible).toBe(true);
  });

  test('submit round-trip stays under 5 seconds', () => {
    expect(roundTripMs).toBeLessThan(ROUND_TRIP_BUDGET_MS);
  });

  test('quiz page has no console errors after submit', () => {
    expect(errors).toEqual([]);
  });
});
