/**
 * Acceptance tests — nem-test-phase-b
 *
 * Comprehensive tests for NEM TEST Phase B: landing page structure,
 * 20-question quiz flow, profile screen, scoring logic, pill button UX,
 * form validation, screen transitions, correction flow, i18n, and
 * responsive behaviour.
 *
 * 6-screen flow: start -> questions -> profile -> conclusion -> opt-in -> confirmation
 * (On the live page question 1 renders immediately — there is no start screen.)
 *
 * Tier 1: Component tests (run against staging, no backend needed)
 * Tier 3: E2E signup flow tests marked @e2e-email (require live n8n + MailerSend + Gmail)
 *
 * The quiz-driving helpers live in ./helpers/nem-quiz.js, shared with the
 * conclusion-logic and report-json suites so they cannot drift apart again. The fixed
 * sleeps this file used to carry (45 of them, ~15.6s of pure sleep per run-through) are
 * gone with them — every wait is now on the thing actually being waited for.
 */
import { test, expect } from '@playwright/test';

import {
  TEST_PAGE_EN,
  TOTAL_QUESTIONS,
  QUIZ_TEST_TIMEOUT_MS,
  ANSWER_LABELS_NL,
  ANSWER_LABELS_EN,
  waitForReady,
  loadPage,
  answerQuestion,
  answerAllQuestions,
  answerByIndices,
  fillProfileScreen,
  getConclusionText,
} from './helpers/nem-quiz.js';

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-test-phase-b';

// Mechanism -> question indices (1-based).
// Keys are English as of conclusion engine v2 — window.__nemTestScores publishes
// English keys, so Dutch keys here silently compared undefined.
const MECHANISM_MAP = {
  selfRejection: [1, 2, 7, 17],
  emotionalNumbing: [3, 8, 13, 18],
  falsePower: [4, 9, 14, 19],
  fear: [5, 10, 15, 20],
  falseHope: [6, 11, 12, 16],
};

/* ── Answer profiles (conclusion engine v2) ────────────────────
 *
 * Under v2, ANY uniform answer pattern is a flat outcome: all "soms" scores 8 across
 * the board → flat-high, all "zelden" → flat-low. Flat outcomes render a contact
 * anchor INSTEAD of the report CTA, so a uniformly-answered test can no longer reach
 * the opt-in, confirmation or report screens at all.
 *
 * Every test that needs the report path therefore answers a deliberately uneven
 * profile. Verified against the engine: false-hope 14, false-power 11, self-rejection 5,
 * fear 4, emotional-numbing 2 → DUAL false-hope_false-power (01?-FH-FP), skipsReport
 * false. 0-based question order → answer index. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];

/* See the note on QUIZ_TEST_TIMEOUT_MS in the helper module: a full run-through against
 * live staging deserves headroom the 30s config default does not give it. */
test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

// ── Suite-specific helpers ────────────────────────────────────

/** Answer all 20 questions with an uneven profile that reaches the report path.
 *
 * Defaults to DUAL_PROFILE (false-hope leading, false-power following). */
async function answerReportProfile(page, profile = DUAL_PROFILE, labels = ANSWER_LABELS_NL) {
  await answerByIndices(page, profile, labels);
}

// ── B1: Landing Page ──────────────────────────────────────────

test.describe(`${SLUG} — B1: Landing page`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  // Navbar logo/trust-anchor test removed — those page-level data-element hooks
  // are not part of the component and are not being added in the Designer.

  test('hero H1 contains test title', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
    // Title should reference "reageer" (Dutch for "react")
    const text = await h1.textContent();
    expect(text.toLowerCase()).toContain('reageer');
  });

  test('first question visible above the fold (desktop 1440)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    const quiz = page.locator('[data-element="quiz-module"]').first();
    if (await quiz.count()) {
      await expect(quiz).toBeInViewport({ timeout: 10_000 });
    }
  });

  // Minimal-footer test removed — the footer-minimal data-element hook is a
  // page-level element, not part of the component, and is not being added.

  test('disclaimer text visible below quiz', async ({ page }) => {
    const disclaimer = page.locator('[data-element="disclaimer"]');
    await expect(disclaimer).toBeVisible({ timeout: 10_000 });
    await expect(disclaimer).toContainText('geen psychologische diagnose');
  });

  test('question module wider than 640px on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);
    const quiz = page.locator('[data-element="quiz-module"]').first();
    if (await quiz.count()) {
      const box = await quiz.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(640);
      }
    }
  });
});

// ── Screen 1 (Start — Q1) ────────────────────────────────────

test.describe(`${SLUG} — Screen 1 (Start)`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('progress shows "Vraag 1 van 20"', async ({ page }) => {
    await expect(page.getByText(/vraag 1 van 20/i)).toBeVisible({ timeout: 10_000 });
  });

  test('5 pill buttons visible with correct NL labels', async ({ page }) => {
    for (const label of ANSWER_LABELS_NL) {
      await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('reassurance line visible on Q1', async ({ page }) => {
    await expect(page.getByText('geen goed of fout')).toBeVisible({ timeout: 10_000 });
  });

  test('no back button on Q1', async ({ page }) => {
    const back = page.locator('[data-element="back-button"], button:has-text("←")');
    await expect(back).toHaveCount(0);
  });

  test('pill buttons stack vertically on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);

    const buttons = page.getByRole('button', { name: /nooit|zelden|soms|regelmatig|heel vaak/ });
    const count = await buttons.count();
    expect(count).toBe(5);

    // Check vertical stacking: each button has a unique Y position
    const yPositions = new Set();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) yPositions.add(Math.round(box.y));
    }
    expect(yPositions.size).toBe(5);
  });

  test('pill buttons display horizontally on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadPage(page);

    const buttons = page.getByRole('button', { name: /nooit|zelden|soms|regelmatig|heel vaak/ });
    const count = await buttons.count();
    expect(count).toBe(5);

    // Check horizontal layout: all buttons share a similar Y position
    const yPositions = new Set();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) yPositions.add(Math.round(box.y / 10)); // group by ~10px bands
    }
    expect(yPositions.size).toBe(1);
  });
});

// ── Screen 2 (Questions Q2-Q20) ──────────────────────────────

test.describe(`${SLUG} — Screen 2 (Questions)`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('answering Q1 advances to Q2 with back button', async ({ page }) => {
    await answerQuestion(page, 'soms');
    await expect(page.getByText(/vraag 2 van 20/i)).toBeVisible({ timeout: 5_000 });
    const back = page.locator('button:has-text("←"), [data-element="back-button"]');
    await expect(back.first()).toBeVisible();
  });

  test('reassurance line NOT visible on Q2+', async ({ page }) => {
    await answerQuestion(page, 'soms');
    await expect(page.getByText(/vraag 2 van 20/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('geen goed of fout')).not.toBeVisible();
  });

  test('back button pre-fills previous answer on Q1', async ({ page }) => {
    await answerQuestion(page, 'regelmatig');

    // Go back
    await page.locator('button:has-text("←"), [data-element="back-button"]').first().click();

    await expect(page.getByText(/vraag 1 van 20/i)).toBeVisible({ timeout: 5_000 });
    // "regelmatig" should have selected state
    const selectedPill = page.locator(
      'button:has-text("regelmatig")[class*="selected"], ' +
      'button:has-text("regelmatig")[aria-selected="true"], ' +
      'button:has-text("regelmatig")[data-selected="true"]'
    );
    await expect(selectedPill).toBeVisible();
  });

  test('back button pre-fills on deeper question (Q3 -> Q2)', async ({ page }) => {
    await answerQuestion(page, 'nooit');     // Q1
    await answerQuestion(page, 'heel vaak'); // Q2

    // Go back to Q2
    await page.locator('button:has-text("←"), [data-element="back-button"]').first().click();

    await expect(page.getByText(/vraag 2 van 20/i)).toBeVisible({ timeout: 5_000 });
    const selectedPill = page.locator(
      'button:has-text("heel vaak")[class*="selected"], ' +
      'button:has-text("heel vaak")[aria-selected="true"], ' +
      'button:has-text("heel vaak")[data-selected="true"]'
    );
    await expect(selectedPill).toBeVisible();
  });

  test('progress updates correctly through Q1-Q5', async ({ page }) => {
    for (let q = 1; q <= 5; q++) {
      await expect(page.getByText(new RegExp(`vraag ${q} van 20`, 'i'))).toBeVisible({ timeout: 5_000 });
      await answerQuestion(page, 'soms');
    }
    await expect(page.getByText(/vraag 6 van 20/i)).toBeVisible({ timeout: 5_000 });
  });

  test('all 20 questions are answerable (full run)', async ({ page }) => {
    for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
      await expect(page.getByText(new RegExp(`vraag ${q} van 20`, 'i'))).toBeVisible({ timeout: 5_000 });
      await answerQuestion(page, ANSWER_LABELS_NL[q % 5]); // rotate through answers
    }
    // Should now be on Screen 3 (profile) — no longer on a question screen
    await expect(page.getByText(/vraag 20 van 20/i)).not.toBeVisible({ timeout: 5_000 });
  });
});

// ── Screen 3 (Profile) ───────────────────────────────────────

test.describe(`${SLUG} — Screen 3 (Profile)`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
  });

  test('"Nog even over jou" label visible after Q20', async ({ page }) => {
    await expect(
      page.getByText(/nog even over jou/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('3 dropdowns present (gender, age category, relationship status)', async ({ page }) => {
    // Gender dropdown
    await expect(
      page.locator('[data-field="gender"], [data-element="gender-select"]').or(page.getByLabel(/geslacht/i))
    ).toBeVisible({ timeout: 5_000 });
    // Age category dropdown
    await expect(
      page.locator('[data-field="age-category"], [data-element="age-category-select"]').or(page.getByLabel(/leeftijdscategorie/i))
    ).toBeVisible();
    // Relationship status dropdown
    await expect(
      page.locator('[data-field="relationship-status"], [data-element="relationship-select"]').or(page.getByLabel(/relatiestatus/i))
    ).toBeVisible();
  });

  test('validation: continue without selecting shows Dutch errors', async ({ page }) => {
    // Click "Ga verder" without selecting any dropdown
    await page.getByRole('button', { name: /ga verder/i }).click();

    await expect(page.getByText(/selecteer je geslacht/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/selecteer je leeftijdscategorie/i)).toBeVisible();
    await expect(page.getByText(/selecteer je relatiestatus/i)).toBeVisible();
  });

  test('"Ga verder" transitions to Screen 4 (Conclusion) after filling all dropdowns', async ({ page }) => {
    // Select all 3 dropdowns
    const selects = page.locator('select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      await selects.nth(i).selectOption({ index: 1 });
    }
    /* Continue rejects a click that lands before React commits the last selection —
     * assert the committed values rather than timing them (see fillProfileScreen). */
    for (let i = 0; i < selectCount; i++) {
      await expect(selects.nth(i)).not.toHaveValue('');
    }

    await page.getByRole('button', { name: /ga verder/i }).click();

    // Should now see conclusion text
    await expect(
      page.getByText(/jouw uitkomst/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── Screen 4 (Conclusion) ────────────────────────────────────

test.describe(`${SLUG} — Screen 4 (Conclusion)`, () => {
  test('conclusion text appears after profile screen (no loading state)', async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);

    // Conclusion should appear immediately — no loading spinner
    // "Jouw uitkomst" or similar conclusion label
    await expect(
      page.getByText(/jouw uitkomst/i)
    ).toBeVisible({ timeout: 3_000 }); // short timeout = no API wait
  });

  test('CTA button visible on conclusion screen', async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);

    await expect(
      page.getByRole('button', { name: /ontvang mijn rapport/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('bridge line visible on conclusion screen', async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);

    await expect(
      page.getByText(/persoonlijke rapport/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('CTA transitions to Screen 5 (opt-in form)', async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    // Should see form fields (voornaam or first name)
    await expect(
      page.getByPlaceholder(/voornaam|first name/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── Gender-differentiated conclusion ─────────────────────────

test.describe(`${SLUG} — Gender-differentiated conclusion`, () => {
  test('same answers produce different conclusion text for Man vs Vrouw (NL)', async ({ page }) => {
    test.setTimeout(120_000); // runs the full quiz flow twice (once per gender)
    // Man path
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Man');
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 5_000 });
    const manText = await getConclusionText(page);

    // Vrouw path — identical answers, only the gender selection differs
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Vrouw');
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 5_000 });
    const vrouwText = await getConclusionText(page);

    expect(manText.length).toBeGreaterThan(0);
    expect(vrouwText.length).toBeGreaterThan(0);
    // If the gender lookup were ignored, both paths would render identical copy.
    expect(manText).not.toBe(vrouwText);
  });

  test('EN male gender resolves a conclusion (male/female normalised to man/vrouw)', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await answerReportProfile(page, DUAL_PROFILE, ANSWER_LABELS_EN);
    await fillProfileScreen(page, 'Male');

    // Reaching the conclusion screen — assert via the gender-invariant bridge line
    // (the conclusion label copy varies: staging currently renders "Your outcome").
    await expect(page.getByText(/personal report goes deeper/i)).toBeVisible({ timeout: 5_000 });
    const text = await getConclusionText(page);
    // A missing normalisation (conclusions['male'] === undefined) renders nothing
    // or the literal string "undefined".
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).not.toContain('undefined');
  });
});

// ── Scoring Logic ─────────────────────────────────────────────

test.describe(`${SLUG} — Scoring logic`, () => {
  test('all-soms produces equal scores (2 per question, 8 per mechanism)', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms'); // score 2 each = 8 per mechanism
    await fillProfileScreen(page);

    // Check via window global if exposed, or verify conclusion text
    const scores = await page.evaluate(() => {
      // Component may expose scores on window for testing
      return window.__nemTestScores || null;
    });

    if (scores) {
      // All mechanisms should be 8 (4 questions x 2)
      for (const mechanism of Object.keys(MECHANISM_MAP)) {
        expect(scores[mechanism]).toBe(8);
      }
    }
    // If scores aren't exposed, just verify conclusion screen rendered
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 3_000 });
  });

  test('all-heel-vaak produces max scores (4 per question, 16 per mechanism)', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'heel vaak');
    await fillProfileScreen(page);

    const scores = await page.evaluate(() => window.__nemTestScores || null);
    if (scores) {
      for (const mechanism of Object.keys(MECHANISM_MAP)) {
        expect(scores[mechanism]).toBe(16);
      }
    }
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 3_000 });
  });

  test('all-nooit produces zero scores', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'nooit');
    await fillProfileScreen(page);

    const scores = await page.evaluate(() => window.__nemTestScores || null);
    if (scores) {
      for (const mechanism of Object.keys(MECHANISM_MAP)) {
        expect(scores[mechanism]).toBe(0);
      }
    }
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 3_000 });
  });
});

// ── Screen 5 (Opt-in Form) ───────────────────────────────────

test.describe(`${SLUG} — Screen 5 (Opt-in form)`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await expect(page.getByPlaceholder(/voornaam/i)).toBeVisible({ timeout: 5_000 });
  });

  test('form fields present: voornaam, email, consent checkbox', async ({ page }) => {
    await expect(page.getByPlaceholder(/voornaam/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/e-mailadres/i)).toBeVisible();
  });

  test('NEM Matters consent checkbox visible', async ({ page }) => {
    // Target the checkbox by role — its accessible name is the consent label.
    // (getByText on the Webflow label/input structure matches zero elements.)
    await expect(
      page.getByRole('checkbox', { name: /NEM Matters/i })
    ).toBeVisible();
  });

  test('submit button disabled without consent checkbox', async ({ page }) => {
    const btn = page.getByRole('button', { name: /ontvang mijn rapport/i });
    // Button should be disabled or visually greyed out
    const isDisabled = await btn.isDisabled().catch(() => false);
    const hasDisabledClass = await btn.evaluate(
      el => el.classList.contains('disabled') || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
    );
    expect(isDisabled || hasDisabledClass).toBeTruthy();
  });

  test('submit button enables after consent checkbox ticked', async ({ page }) => {
    // Tick checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();

    const btn = page.getByRole('button', { name: /ontvang mijn rapport/i });
    await expect(btn).toBeEnabled({ timeout: 5_000 });
  });

  test('inline validation: empty voornaam shows Dutch error on blur', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/voornaam/i);
    await nameInput.focus();
    await nameInput.blur();

    await expect(page.getByText('Vul je voornaam in')).toBeVisible({ timeout: 5_000 });
  });

  test('inline validation: empty email shows Dutch error on blur', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    await emailInput.focus();
    await emailInput.blur();

    await expect(page.getByText('Vul je e-mailadres in')).toBeVisible({ timeout: 5_000 });
  });

  test('inline validation: invalid email format shows error on blur', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    await emailInput.fill('not-an-email');
    await emailInput.blur();

    await expect(page.getByText('Voer een geldig e-mailadres in')).toBeVisible({ timeout: 5_000 });
  });

  test('inline validation: error clears when field corrected', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    // Trigger error
    await emailInput.fill('bad');
    await emailInput.blur();
    await expect(page.getByText('Voer een geldig e-mailadres in')).toBeVisible({ timeout: 5_000 });

    // Fix it
    await emailInput.fill('anna@example.com');
    await emailInput.blur();
    await expect(page.getByText('Voer een geldig e-mailadres in')).not.toBeVisible();
  });

  test('relieve line visible below submit button', async ({ page }) => {
    await expect(page.getByText(/geen spam/i)).toBeVisible();
  });

  // The disclaimer is NOT rendered inside the component — it lives once on the
  // landing page below the module (the component copy was removed to avoid a
  // duplicate). No component-level disclaimer assertion here.
});

// ── Screen 6 (Confirmation) ──────────────────────────────────

test.describe(`${SLUG} — Screen 6 (Confirmation)`, () => {
  /**
   * These tests require the submit webhook to be live.
   * Skip if NEM_SUBMIT_WEBHOOK_URL is not set.
   */
  const webhookUrl = process.env.NEM_SUBMIT_WEBHOOK_URL;

  // Helper: fill and submit form to reach Screen 6
  async function reachScreen6(page) {
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    // Fill form (simplified: just name + email + consent). fill() auto-waits for the
    // opt-in form to render.
    await page.getByPlaceholder(/voornaam/i).fill('TestUser');
    await page.getByPlaceholder(/e-mailadres/i).fill('test@example.com');
    await page.locator('input[type="checkbox"]').first().check();

    /* The submit button only enables once consent is committed, and click() waits for
     * enabled — no sleep needed between the check and the click. */
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
  }

  (webhookUrl ? test : test.skip)('Screen 6 shows "Nog een stap" label', async ({ page }) => {
    await reachScreen6(page);
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });
  });

  (webhookUrl ? test : test.skip)('correction link returns to Screen 5 with name pre-filled', async ({ page }) => {
    await reachScreen6(page);
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });

    await page.getByText(/vul het opnieuw in/i).click();

    // Voornaam should be pre-filled
    const nameInput = page.getByPlaceholder(/voornaam/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    expect(await nameInput.inputValue()).toBe('TestUser');

    // Email should be cleared
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    expect(await emailInput.inputValue()).toBe('');
  });

  (webhookUrl ? test : test.skip)('correction resubmit works', async ({ page }) => {
    await reachScreen6(page);
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });

    await page.getByText(/vul het opnieuw in/i).click();

    // Fill corrected email
    await page.getByPlaceholder(/e-mailadres/i).fill('corrected@example.com');
    await page.locator('input[type="checkbox"]').first().check();

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    // Should be back on Screen 6
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ── i18n (English locale) ─────────────────────────────────────

test.describe(`${SLUG} — i18n (English)`, () => {
  test('EN page shows English progress text', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await expect(page.getByText(/question 1 of 20/i)).toBeVisible({ timeout: 10_000 });
  });

  test('EN page shows English answer labels', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    for (const label of ANSWER_LABELS_EN) {
      await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('EN page shows English reassurance text', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await expect(page.getByText(/no right or wrong/i)).toBeVisible({ timeout: 10_000 });
  });

  test('EN profile screen shows "A little about you" label', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await answerReportProfile(page, DUAL_PROFILE, ANSWER_LABELS_EN);

    await expect(page.getByText(/a little about you/i)).toBeVisible({ timeout: 5_000 });
  });

  test('EN form validation shows English error messages for name and email', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await answerReportProfile(page, DUAL_PROFILE, ANSWER_LABELS_EN);
    // Fill profile screen (EN uses same dropdown structure)
    await fillProfileScreen(page);
    // NOTE: staging's EN `ctaButtonText` prop is currently un-localised and shows
    // the Dutch "Ontvang mijn rapport" — tolerate it so we can still verify the
    // (code-driven) English error strings below. Localise the prop in the Webflow
    // EN locale to drop the Dutch fallback here.
    await page.getByRole('button', { name: /receive my report|get my report|ontvang mijn rapport/i }).click();

    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill('bad');
    await emailInput.blur();

    await expect(page.getByText(/enter a valid email/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── E2E Signup Flow (MailerSend API) ──────────────────────────

test.describe(`${SLUG} — E2E: MailerSend API check`, () => {
  const mailerSendKey = process.env.MAILERSEND_API_KEY;
  const webhookUrl = process.env.NEM_SUBMIT_WEBHOOK_URL;

  test.skip(!mailerSendKey || !webhookUrl, 'Requires MAILERSEND_API_KEY and NEM_SUBMIT_WEBHOOK_URL');

  test('@e2e-email verification email sent via MailerSend', async ({ page }) => {
    const testEmail = `will+nem-test-${Date.now()}@teamzzissou.io`;

    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    // Fill form with test email (simplified: name + email + consent)
    await page.getByPlaceholder(/voornaam/i).fill('E2E Test');
    await page.getByPlaceholder(/e-mailadres/i).fill(testEmail);
    await page.locator('input[type="checkbox"]').first().check();

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    // The submit reaching the backend is what starts the send; the confirmation screen
    // is the client-side signal that it did.
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });

    // Poll MailerSend activity API for up to 30 seconds. The interval waits on an
    // external API, not the page — a plain timer, deliberately not a page-clock sleep.
    let emailFound = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch('https://api.mailersend.com/v1/activity', {
        headers: { Authorization: `Bearer ${mailerSendKey}` },
      });
      const data = await response.json();
      const match = data.data?.find(
        (item) => item.email?.recipients?.[0]?.email === testEmail
      );
      if (match) {
        emailFound = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 3_000));
    }

    expect(emailFound).toBeTruthy();
  });
});

// ── E2E Signup Flow (Gmail API) ───────────────────────────────

test.describe(`${SLUG} — E2E: Gmail inbox check`, () => {
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const webhookUrl = process.env.NEM_SUBMIT_WEBHOOK_URL;

  test.skip(
    !gmailClientId || !gmailRefreshToken || !webhookUrl,
    'Requires Gmail API credentials and NEM_SUBMIT_WEBHOOK_URL'
  );

  test('@e2e-email full flow: submit -> Gmail verification email -> click verify link', async ({ page }) => {
    const { google } = await import('googleapis');
    const testEmail = `will+nem-e2e-${Date.now()}@teamzzissou.io`;

    // Set up Gmail API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: gmailRefreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Submit quiz + profile + form
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    await page.getByPlaceholder(/voornaam/i).fill('Gmail E2E');
    await page.getByPlaceholder(/e-mailadres/i).fill(testEmail);
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });

    // Poll Gmail for verification email (up to 60 seconds). Plain timers between
    // attempts — the wait is on an external inbox, not the page.
    let verifyLink = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: `to:${testEmail} newer_than:2m`,
        maxResults: 5,
      });

      if (res.data.messages?.length) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: res.data.messages[0].id,
          format: 'full',
        });

        // Extract verification link from email body
        const body = Buffer.from(
          msg.data.payload?.body?.data ||
          msg.data.payload?.parts?.[0]?.body?.data || '',
          'base64'
        ).toString('utf-8');

        const linkMatch = body.match(/https?:\/\/[^\s"<]+verify[^\s"<]*/i);
        if (linkMatch) {
          verifyLink = linkMatch[0];
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }

    expect(verifyLink).toBeTruthy();

    // Click verification link
    await page.goto(verifyLink);
    await waitForReady(page);

    // Should redirect to /zelftest/bevestigd
    await expect(page).toHaveURL(/bevestigd/, { timeout: 10_000 });

    // Poll Gmail for report delivery email (up to 90 seconds)
    let reportReceived = false;
    for (let attempt = 0; attempt < 18; attempt++) {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: `to:${testEmail} has:attachment newer_than:5m`,
        maxResults: 5,
      });
      if (res.data.messages?.length) {
        reportReceived = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }

    expect(reportReceived).toBeTruthy();
  });
});

// ── General ───────────────────────────────────────────────────

test.describe(`${SLUG} — General`, () => {
  test('no console errors on landing page (NL)', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loadPage(page);

    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('third-party') && !e.includes('ERR_BLOCKED')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('no console errors during full quiz flow', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loadPage(page);
    await answerReportProfile(page);

    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('third-party') && !e.includes('ERR_BLOCKED')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('prefers-reduced-motion respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadPage(page);
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
    // Answer a question to verify transitions still work without animation
    await answerQuestion(page, 'soms');
    await expect(page.getByText(/vraag 2 van 20/i)).toBeVisible({ timeout: 5_000 });
  });

  test('mobile responsive: form fields usable at 375px', async ({ page }) => {
    // Full quiz flow at mobile width — pills stack, so Playwright auto-scrolls to each
    // answer. Covered by the suite-wide QUIZ_TEST_TIMEOUT_MS budget.
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();

    // Form fields should be visible and usable
    const nameInput = page.getByPlaceholder(/voornaam/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    const box = await nameInput.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(200); // not squished
    }
  });
});
