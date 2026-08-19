/**
 * Shared helpers for the NEM Test quiz acceptance suites.
 *
 * Lifted from the corrected nem-test-conclusion-logic-v2.spec.js (2026-08-19) so the
 * three quiz suites stop carrying private, drifting copies. The comments explaining
 * WHY a wait is shaped the way it is moved here with the code — they are the record of
 * two wrong turns and are worth more than the code they sit above.
 *
 * Spec: projects/nem-life/.claude/specs/nem-quiz-transition-guard-and-intro-line-plumbing.md
 * Diagnosis: projects/nem-life/.claude/reports/nem-acceptance-failures-2026-08-19.md
 */
import { expect } from '@playwright/test';
import dotenv from 'dotenv';

/* Loaded here, not in the specs: STAGING is read at module-import time, and ES imports
 * hoist above any dotenv.config() call in the importing spec. */
dotenv.config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
export const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
export const TEST_PAGE_NL = '/zelftesten/waarom-reageer-ik-zo';
export const TEST_PAGE_EN = '/en/zelftesten/waarom-reageer-ik-zo';
export const TOTAL_QUESTIONS = 20;

/* The config default of 30s is not enough for a quiz suite, and that — not any defect in
 * the component — is what the 2026-08-19 "failures" were. One run-through is twenty
 * questions plus a page load plus the profile screen, and the tests that compare two
 * outcomes drive that twice inside a single test body. The fixed sleeps are gone, which
 * takes most of the cost out, but two full run-throughs against a live staging site
 * still deserve real headroom. Do NOT raise the global config default instead — the
 * non-quiz suites should keep failing fast. */
export const QUIZ_TEST_TIMEOUT_MS = 90_000;

export const ANSWER_LABELS_NL = ['nooit', 'zelden', 'soms', 'regelmatig', 'heel vaak'];
export const ANSWER_LABELS_EN = ['never', 'rarely', 'sometimes', 'regularly', 'very often'];

// ── Helpers ───────────────────────────────────────────────────

export async function waitForReady(page) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
}

/* The question heading. Also the readiness signal: it only exists once the code component
 * has hydrated, so waiting for it beats guessing at a fixed delay. */
export function questionHeading(page) {
  return page.getByRole('heading', { level: 3 }).first();
}

/* What the current question reads as, or a sentinel once the quiz has moved past the last
 * one. The inner timeout is load-bearing: innerText() on a locator matching nothing waits
 * out its own default rather than throwing, so without a bound of its own it is still
 * waiting when a poll gives up, and the ordinary end of the quiz looks like a failure. */
export async function readQuestion(page) {
  try {
    return (await questionHeading(page).innerText({ timeout: 1_000 })).trim();
  } catch {
    return '__left the question screen__';
  }
}

export async function loadPage(page, path = TEST_PAGE_NL, query = '') {
  await page.goto(`${STAGING}${path}${query}`);
  await waitForReady(page);
  /* Question 1 renders straight away on the live page — there is no start screen,
   * whatever the 6-screen description in the phase-b spec says. Waiting for the heading
   * rather than sleeping 2s saves that 2s on every single load, which is most of why
   * these suites used to time out. */
  await expect(questionHeading(page)).toBeVisible({ timeout: 20_000 });
}

/* Wait for the question to actually change rather than sleeping through the fade.
 *
 * The old fixed 600ms was the single biggest cost in these suites: twenty questions is
 * 12s of pure sleep per run-through, and the tests that drive the quiz twice spent ~32s
 * doing nothing before the 30s budget killed them mid-quiz. That is what the "failures"
 * were — a timeout, not a defect.
 *
 * ⚠️ COMPONENT BEHAVIOUR, not a test workaround: a click that lands during the fade
 * between questions is swallowed and the quiz does not advance. A real user hits this as
 * a dead click that needs pressing twice, so it is worth fixing in the component. The old
 * blind sleep hid it completely. One retry here keeps the suite honest about genuine
 * failures without reporting the fade as one — and it is safe, because it only fires when
 * the question demonstrably did not change. Deleted once Part A of the transition-guard
 * spec ships: the retry disappearing without new flakiness is the proof the guard works. */
export async function answerQuestion(page, answerLabel) {
  const before = await readQuestion(page);
  const button = page.getByRole('button', { name: answerLabel, exact: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await button.click();
    try {
      await expect.poll(() => readQuestion(page), { timeout: 5_000 }).not.toBe(before);
      return;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

/** Answer all 20 questions with the same label — used for the flat profiles. */
export async function answerAllQuestions(page, answerLabel) {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    await answerQuestion(page, answerLabel);
  }
}

/** Answer the whole quiz from an array of label strings (conclusion-logic style). */
export async function answerByLabels(page, labels) {
  for (const label of labels) {
    await answerQuestion(page, label);
  }
}

/** Answer the whole quiz from an array of answer indices (phase-b DUAL_PROFILE style). */
export async function answerByIndices(page, indices, labels = ANSWER_LABELS_NL) {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    await answerQuestion(page, labels[indices[i]]);
  }
}

/**
 * Fill the profile screen — gender, age category, relationship status — and continue.
 * Pass a visible gender label (NL: 'Man'/'Vrouw', EN: 'Male'/'Female') to exercise the
 * gender-differentiated conclusion; null takes the first real option.
 */
export async function fillProfileScreen(page, genderLabel = null) {
  const gender = page.locator('[data-field="gender"]');
  const age = page.locator('[data-field="age-category"]');
  const relationship = page.locator('[data-field="relationship-status"]');

  await expect(gender).toBeVisible({ timeout: 10_000 });

  if (genderLabel) await gender.selectOption({ label: genderLabel });
  else await gender.selectOption({ index: 1 });
  await age.selectOption({ index: 1 });
  await relationship.selectOption({ index: 1 });

  /* Continue validates all three fields, and a click that lands before React has
   * committed the last selection is rejected — the screen just stays put with an error,
   * which looks exactly like a click that never happened. That is what the old 300ms
   * sleep was really guarding, so assert the committed values rather than timing them. */
  for (const field of [gender, age, relationship]) {
    await expect(field).not.toHaveValue('');
  }

  await page.getByRole('button', { name: /ga verder|continue/i }).click();
  /* Leaving the profile screen is the signal that continue was accepted. Without this
   * the next assertion races the transition and reports a missing conclusion instead of
   * a rejected form. */
  await expect(gender).toBeHidden({ timeout: 10_000 });
}

export async function getConclusionText(page) {
  const el = page.locator('[data-element="conclusion-text"]');
  await expect(el).toBeVisible({ timeout: 10_000 });
  return (await el.first().innerText()).trim();
}
