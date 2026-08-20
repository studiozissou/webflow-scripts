/**
 * Acceptance tests — nem-report-json-and-error-visibility
 *
 * Covers the two client-side halves of the spec:
 *   - every completed test fires an anonymous beacon once the questions are answered
 *   - the report intro line is selected client-side, on key alone (not gender)
 *
 * The JSON contract and the parse-failure alerting live in n8n and are covered by
 * tests/nem/nem-report-parse.test.js instead — Playwright cannot see inside a workflow.
 *
 * Spec: projects/nem-life/.claude/specs/nem-report-json-and-error-visibility.md
 * Tier 1 (Playwright, staging).
 *
 * The quiz-driving helpers live in ./helpers/nem-quiz.js, shared with the phase-b and
 * conclusion-logic suites so they cannot drift apart again. Beacon assertions await the
 * captured request rather than sleeping: the test proceeds the moment the POST lands and
 * fails loudly if it never does, instead of asserting on an empty capture after 2s.
 */
import { test, expect } from '@playwright/test';

import {
  TEST_PAGE_NL,
  QUIZ_TEST_TIMEOUT_MS,
  ANSWER_LABELS_NL,
  loadPage,
  answerAllQuestions,
  answerByIndices,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

const SLUG = 'nem-report-json-and-error-visibility';
const SUBMIT_WEBHOOK = /\/webhook\/nem-submit/;

/** An uneven profile that reaches the report path: false-hope leading, false-power following. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];

/* See the note on QUIZ_TEST_TIMEOUT_MS in the helper module: a full run-through against
 * live staging deserves headroom the 30s config default does not give it. */
test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

// ── Suite-specific helpers ────────────────────────────────────

/** Every uniform answer is a flat outcome under v2: all "soms" → flat-high. */
async function answerUniformly(page, label) {
  await answerAllQuestions(page, label);
}

async function answerReportProfile(page) {
  await answerByIndices(page, DUAL_PROFILE, ANSWER_LABELS_NL);
}

/** Capture the submit webhook payload without letting it reach the backend. */
async function captureSubmit(page) {
  const captured = [];
  await page.route(SUBMIT_WEBHOOK, async (route) => {
    try {
      captured.push(JSON.parse(route.request().postData() || '{}'));
    } catch {
      captured.push({ __unparseable: route.request().postData() });
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
  });
  return captured;
}

/** Wait for the nth beacon to land — the moment it does, not a fixed 2s later. */
async function expectCaptureCount(captured, count) {
  await expect.poll(() => captured.length, { timeout: 10_000 }).toBe(count);
}

// ── A: Every completion logs anonymously ──────────────────────

test.describe(`${SLUG} — A: Anonymous completion logging`, () => {
  test('the beacon fires on question 20, before the profile screen', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');

    /* Deliberately no fillProfileScreen: the whole point is that it fires before anyone
       can drop out, so waiting for the profile screen would hide a regression. */
    await expectCaptureCount(captured, 1);
    expect(captured[0].event).toBe('completion');
  });

  test('the completion payload carries the scores, outcome and key', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await expectCaptureCount(captured, 1);

    const payload = captured[0];
    expect(payload.outcome).toBe('flat-high');
    expect(payload.conclusionKey).toBe('flat-high');
    expect(payload.totalScore).toBe(40);
    for (const mechanism of ['selfRejection', 'emotionalNumbing', 'falsePower', 'fear', 'falseHope']) {
      expect(payload.scores[mechanism]).toBe(8);
    }
  });

  test('the completion payload carries nothing personal', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await expectCaptureCount(captured, 1);

    const payload = captured[0];
    expect(payload.firstName).toBeFalsy();
    expect(payload.email).toBeFalsy();
    expect(payload.nemMattersConsent).toBeFalsy();
  });

  test('no conclusionId yet — gender is not known at question 20', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await expectCaptureCount(captured, 1);

    expect(captured[0].conclusionId).toBeFalsy();
    expect(captured[0].gender).toBeFalsy();
  });

  test('a non-flat outcome logs too — this is not a flat-only beacon', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerReportProfile(page);
    await expectCaptureCount(captured, 1);

    expect(captured[0].event).toBe('completion');
    expect(captured[0].outcome).toBe('dual');
    expect(captured[0].conclusionKey).toBe('false-hope_false-power');
  });

  test('flat-low logs with its own outcome', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'nooit');
    await expectCaptureCount(captured, 1);

    expect(captured[0].outcome).toBe('flat-low');
  });

  test('opting in writes a second row against the same token', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Vrouw');
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    /* fill() auto-waits for the opt-in form to render — no sleep needed between the CTA
       click and the first field. */
    await page.getByPlaceholder(/voornaam/i).fill('Testpersoon');
    await page.getByPlaceholder(/e-?mail/i).fill('test@example.com');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await expectCaptureCount(captured, 2);

    const [completion, submission] = captured;
    expect(completion.event).toBe('completion');
    expect(submission.event).toBe('submission');
    expect(submission.token).toBe(completion.token);
    expect(submission.email).toBe('test@example.com');
  });

  test('a flat outcome produces the completion row and no second row', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page, 'Vrouw');

    /* The completion beacon must have landed; the conclusion screen rendering is the
       moment any wrongly-fired second row would have been sent, so assert the count
       only after the contact link is visible. */
    await expectCaptureCount(captured, 1);
    await expect(page.locator('[data-element="conclusion-contact-link"]')).toBeVisible({ timeout: 10_000 });
    expect(captured.length).toBe(1);
    await expect(page.getByPlaceholder(/voornaam|e-?mail/i)).toHaveCount(0);
  });
});

// ── B: Intro lines ────────────────────────────────────────────

test.describe(`${SLUG} — B: Intro line selection`, () => {
  test('a dual outcome resolves an intro line', async ({ page }) => {
    await loadPage(page, TEST_PAGE_NL, '?nemdebug=1');
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Vrouw');

    const intro = page.locator('[data-element="report-intro-line"]');
    await expect(intro).toBeVisible({ timeout: 10_000 });
    expect((await intro.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('the intro line ignores gender — same key, same line', async ({ page, context }) => {
    await loadPage(page, TEST_PAGE_NL);
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Vrouw');
    const vrouw = (await page.locator('[data-element="report-intro-line"]').innerText()).trim();

    const second = await context.newPage();
    await loadPage(second, TEST_PAGE_NL);
    await answerReportProfile(second);
    await fillProfileScreen(second, 'Man');
    const man = (await second.locator('[data-element="report-intro-line"]').innerText()).trim();

    expect(vrouw).toBe(man);
  });

  test('flat outcomes have no intro line — they get no report', async ({ page }) => {
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page, 'Vrouw');

    await expect(page.locator('[data-element="report-intro-line"]')).toHaveCount(0);
  });
});

// ── C: General ────────────────────────────────────────────────

test.describe(`${SLUG} — C: General`, () => {
  test('no console errors through a full run', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page, 'Vrouw');
    /* The beacon landing is the last async thing the flow does — once it is in, any
       console error it could have caused has been emitted. */
    await expectCaptureCount(captured, 1);

    expect(errors).toEqual([]);
  });

  test('the beacon does not block the contact link from rendering', async ({ page }) => {
    /* The submit is fire-and-forget: a slow or failing backend must not leave the user
       staring at a conclusion with no way onward. */
    await page.route(SUBMIT_WEBHOOK, async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.abort();
    });
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page, 'Vrouw');

    await expect(page.locator('[data-element="conclusion-contact-link"]')).toBeVisible({ timeout: 5_000 });
  });
});
