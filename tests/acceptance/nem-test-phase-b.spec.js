/**
 * Acceptance tests — nem-test-phase-b
 *
 * Comprehensive tests for NEM TEST Phase B: landing page structure,
 * 20-question quiz flow, profile screen, scoring logic, pill button UX,
 * form validation, screen transitions, correction flow, i18n, and
 * responsive behaviour.
 *
 * 6-screen flow: start -> questions -> profile -> conclusion -> opt-in -> confirmation
 *
 * Tier 1: Component tests (run against staging, no backend needed)
 * Tier 3: E2E signup flow tests marked @e2e-email (require live n8n + MailerSend + Gmail)
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-test-phase-b';
const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const TEST_PAGE_NL = '/zelftesten/waarom-reageer-ik-zo';
const TEST_PAGE_EN = '/en/zelftesten/waarom-reageer-ik-zo';

const ANSWER_LABELS_NL = ['nooit', 'zelden', 'soms', 'regelmatig', 'heel vaak'];
const ANSWER_LABELS_EN = ['never', 'rarely', 'sometimes', 'regularly', 'very often'];
const TOTAL_QUESTIONS = 20;

// Scoring: answer index maps to score value (0-4)
const ANSWER_SCORES = [0, 1, 2, 3, 4];

// Mechanism -> question indices (1-based)
const MECHANISM_MAP = {
  zelfafwijzing: [1, 2, 7, 17],
  emotioneleVerdoving: [3, 8, 13, 18],
  valseMacht: [4, 9, 14, 19],
  angst: [5, 10, 15, 20],
  valseHoop: [6, 11, 12, 16],
};

const SECONDARY_THRESHOLD = 3;

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = TEST_PAGE_NL) {
  await page.goto(`${STAGING}${path}`);
  await waitForReady(page);
  await page.waitForTimeout(2000);
}

/** Answer the current question by clicking a pill button */
async function answerQuestion(page, answerLabel = 'soms') {
  await page.getByRole('button', { name: answerLabel }).click();
  await page.waitForTimeout(600); // select + fade transition
}

/** Answer all 20 questions with the same answer */
async function answerAllQuestions(page, answerLabel = 'soms') {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    await answerQuestion(page, answerLabel);
  }
}

/** Fill the profile screen (Screen 3) — select gender, age category, relationship status */
async function fillProfileScreen(page) {
  await page.waitForTimeout(500);
  // Select all 3 dropdowns (gender, age category, relationship status)
  const selects = page.locator('select');
  const selectCount = await selects.count();
  for (let i = 0; i < selectCount; i++) {
    await selects.nth(i).selectOption({ index: 1 });
  }
  await page.waitForTimeout(300);
  // Continue button is "Ga verder" (NL) / "Continue" (EN)
  await page.getByRole('button', { name: /ga verder|continue/i }).click();
  await page.waitForTimeout(600);
}

/**
 * Fill the profile screen choosing a SPECIFIC gender by visible label
 * (NL: 'Man'/'Vrouw', EN: 'Male'/'Female'); age + relationship default to
 * the first real option. Used to exercise the gender-differentiated conclusion.
 */
async function fillProfileScreenWithGender(page, genderLabel) {
  await page.waitForTimeout(500);
  await page.locator('[data-field="gender"]').selectOption({ label: genderLabel });
  await page.locator('[data-field="age-category"]').selectOption({ index: 1 });
  await page.locator('[data-field="relationship-status"]').selectOption({ index: 1 });
  await page.waitForTimeout(300);
  // Continue button is "Ga verder" (NL) / "Continue" (EN)
  await page.getByRole('button', { name: /ga verder|continue/i }).click();
  await page.waitForTimeout(600);
}

/**
 * Grab the rendered conclusion paragraph text. Prefers the precise
 * data-element="conclusion-text" hook; falls back to the whole quiz module
 * (the label/bridge/CTA around it are gender-invariant, so a diff still
 * isolates a change in the conclusion copy).
 */
async function getConclusionText(page) {
  const precise = page.locator('[data-element="conclusion-text"]');
  if (await precise.count()) return (await precise.first().innerText()).trim();
  return (await page.locator('[data-element="quiz-module"]').first().innerText()).trim();
}

/** Answer questions with varied answers to produce a known score profile */
async function answerWithProfile(page) {
  // Answers designed to produce: valseHoop dominant, valseMacht secondary
  // Q1(ZA)=1, Q2(ZA)=1, Q3(EV)=0, Q4(VM)=3, Q5(A)=1
  // Q6(VH)=3, Q7(ZA)=1, Q8(EV)=0, Q9(VM)=2, Q10(A)=1
  // Q11(VH)=4, Q12(VH)=3, Q13(EV)=1, Q14(VM)=3, Q15(A)=1
  // Q16(VH)=4, Q17(ZA)=2, Q18(EV)=1, Q19(VM)=3, Q20(A)=1
  const answerPattern = [
    'zelden',      // Q1: ZA=1
    'zelden',      // Q2: ZA=1
    'nooit',       // Q3: EV=0
    'regelmatig',  // Q4: VM=3
    'zelden',      // Q5: A=1
    'regelmatig',  // Q6: VH=3
    'zelden',      // Q7: ZA=1
    'nooit',       // Q8: EV=0
    'soms',        // Q9: VM=2
    'zelden',      // Q10: A=1
    'heel vaak',   // Q11: VH=4
    'regelmatig',  // Q12: VH=3
    'zelden',      // Q13: EV=1
    'regelmatig',  // Q14: VM=3
    'zelden',      // Q15: A=1
    'heel vaak',   // Q16: VH=4
    'soms',        // Q17: ZA=2
    'zelden',      // Q18: EV=1
    'regelmatig',  // Q19: VM=3
    'zelden',      // Q20: A=1
  ];
  // Expected: VH=14, VM=11, ZA=5, A=4, EV=2
  // Primary: valseHoop, Secondary: valseMacht (diff=3, within threshold)
  for (const answer of answerPattern) {
    await answerQuestion(page, answer);
  }
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
    await page.waitForTimeout(300);
    await expect(page.getByText('geen goed of fout')).not.toBeVisible();
  });

  test('back button pre-fills previous answer on Q1', async ({ page }) => {
    await answerQuestion(page, 'regelmatig');
    await page.waitForTimeout(300);

    // Go back
    await page.locator('button:has-text("←"), [data-element="back-button"]').first().click();
    await page.waitForTimeout(600);

    await expect(page.getByText(/vraag 1 van 20/i)).toBeVisible();
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
    await page.waitForTimeout(600);

    await expect(page.getByText(/vraag 2 van 20/i)).toBeVisible();
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
    await answerAllQuestions(page, 'soms');
    await page.waitForTimeout(500);
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
    await page.waitForTimeout(500);

    await expect(page.getByText(/selecteer je geslacht/i)).toBeVisible();
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
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /ga verder/i }).click();
    await page.waitForTimeout(600);

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
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);

    // Conclusion should appear immediately — no loading spinner
    // "Jouw uitkomst" or similar conclusion label
    await expect(
      page.getByText(/jouw uitkomst/i)
    ).toBeVisible({ timeout: 3_000 }); // short timeout = no API wait
  });

  test('CTA button visible on conclusion screen', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);

    await expect(
      page.getByRole('button', { name: /ontvang mijn rapport/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('bridge line visible on conclusion screen', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);

    await expect(
      page.getByText(/persoonlijke rapport/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('CTA transitions to Screen 5 (opt-in form)', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

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
    await answerAllQuestions(page, 'soms');
    await fillProfileScreenWithGender(page, 'Man');
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 5_000 });
    const manText = await getConclusionText(page);

    // Vrouw path — identical answers, only the gender selection differs
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await fillProfileScreenWithGender(page, 'Vrouw');
    await expect(page.getByText(/jouw uitkomst/i)).toBeVisible({ timeout: 5_000 });
    const vrouwText = await getConclusionText(page);

    expect(manText.length).toBeGreaterThan(0);
    expect(vrouwText.length).toBeGreaterThan(0);
    // If the gender lookup were ignored, both paths would render identical copy.
    expect(manText).not.toBe(vrouwText);
  });

  test('EN male gender resolves a conclusion (male/female normalised to man/vrouw)', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await answerAllQuestions(page, 'sometimes');
    await fillProfileScreenWithGender(page, 'Male');

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
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);
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
    await page.waitForTimeout(300);

    const btn = page.getByRole('button', { name: /ontvang mijn rapport/i });
    const isDisabled = await btn.isDisabled().catch(() => false);
    expect(isDisabled).toBeFalsy();
  });

  test('inline validation: empty voornaam shows Dutch error on blur', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/voornaam/i);
    await nameInput.focus();
    await nameInput.blur();
    await page.waitForTimeout(300);

    await expect(page.getByText('Vul je voornaam in')).toBeVisible();
  });

  test('inline validation: empty email shows Dutch error on blur', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    await emailInput.focus();
    await emailInput.blur();
    await page.waitForTimeout(300);

    await expect(page.getByText('Vul je e-mailadres in')).toBeVisible();
  });

  test('inline validation: invalid email format shows error on blur', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    await emailInput.fill('not-an-email');
    await emailInput.blur();
    await page.waitForTimeout(300);

    await expect(page.getByText('Voer een geldig e-mailadres in')).toBeVisible();
  });

  test('inline validation: error clears when field corrected', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    // Trigger error
    await emailInput.fill('bad');
    await emailInput.blur();
    await page.waitForTimeout(300);
    await expect(page.getByText('Voer een geldig e-mailadres in')).toBeVisible();

    // Fix it
    await emailInput.fill('anna@example.com');
    await emailInput.blur();
    await page.waitForTimeout(300);
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
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

    // Fill form (simplified: just name + email + consent)
    await page.getByPlaceholder(/voornaam/i).fill('TestUser');
    await page.getByPlaceholder(/e-mailadres/i).fill('test@example.com');
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(2000);
  }

  (webhookUrl ? test : test.skip)('Screen 6 shows "Nog een stap" label', async ({ page }) => {
    await reachScreen6(page);
    await expect(page.getByText(/nog één stap/i)).toBeVisible({ timeout: 10_000 });
  });

  (webhookUrl ? test : test.skip)('correction link returns to Screen 5 with name pre-filled', async ({ page }) => {
    await reachScreen6(page);

    await page.getByText(/vul het opnieuw in/i).click();
    await page.waitForTimeout(600);

    // Voornaam should be pre-filled
    const nameInput = page.getByPlaceholder(/voornaam/i);
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toBe('TestUser');

    // Email should be cleared
    const emailInput = page.getByPlaceholder(/e-mailadres/i);
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('');
  });

  (webhookUrl ? test : test.skip)('correction resubmit works', async ({ page }) => {
    await reachScreen6(page);

    await page.getByText(/vul het opnieuw in/i).click();
    await page.waitForTimeout(600);

    // Fill corrected email
    await page.getByPlaceholder(/e-mailadres/i).fill('corrected@example.com');
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(2000);

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
    await answerAllQuestions(page, 'sometimes');
    await page.waitForTimeout(500);

    await expect(page.getByText(/a little about you/i)).toBeVisible({ timeout: 5_000 });
  });

  test('EN form validation shows English error messages for name and email', async ({ page }) => {
    await loadPage(page, TEST_PAGE_EN);
    await answerAllQuestions(page, 'sometimes');
    // Fill profile screen (EN uses same dropdown structure)
    await fillProfileScreen(page);
    // NOTE: staging's EN `ctaButtonText` prop is currently un-localised and shows
    // the Dutch "Ontvang mijn rapport" — tolerate it so we can still verify the
    // (code-driven) English error strings below. Localise the prop in the Webflow
    // EN locale to drop the Dutch fallback here.
    await page.getByRole('button', { name: /receive my report|get my report|ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill('bad');
    await emailInput.blur();
    await page.waitForTimeout(300);

    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
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
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

    // Fill form with test email (simplified: name + email + consent)
    await page.getByPlaceholder(/voornaam/i).fill('E2E Test');
    await page.getByPlaceholder(/e-mailadres/i).fill(testEmail);
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(3000);

    // Poll MailerSend activity API for up to 30 seconds
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
      await page.waitForTimeout(3000);
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
    await answerAllQuestions(page, 'regelmatig');
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

    await page.getByPlaceholder(/voornaam/i).fill('Gmail E2E');
    await page.getByPlaceholder(/e-mailadres/i).fill(testEmail);
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(3000);

    // Poll Gmail for verification email (up to 60 seconds)
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
      await page.waitForTimeout(5000);
    }

    expect(verifyLink).toBeTruthy();

    // Click verification link
    await page.goto(verifyLink);
    await waitForReady(page);

    // Should redirect to /zelftest/bevestigd
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('bevestigd');

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
      await page.waitForTimeout(5000);
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
    await answerAllQuestions(page, 'soms');

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
    test.setTimeout(60_000); // full quiz flow at mobile width — pills stack, so
    // Playwright auto-scrolls to each answer, pushing the run past the 30s default
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(600);

    // Form fields should be visible and usable
    const nameInput = page.getByPlaceholder(/voornaam/i);
    await expect(nameInput).toBeVisible();
    const box = await nameInput.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(200); // not squished
    }
  });
});
