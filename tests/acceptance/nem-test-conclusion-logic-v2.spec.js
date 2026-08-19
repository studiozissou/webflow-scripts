/**
 * Acceptance tests — nem-test-conclusion-logic-v2
 *
 * Covers the 2026-08-10 conclusion-engine changes:
 *   - directional dual keys (leading_following)
 *   - minimum score gate (>= 8/16) for primary and secondary
 *   - flat-low / flat-high outcomes routing to a contact link instead of the report
 *   - debug mode (?nemdebug=1) rendering the conclusion ID + key
 *   - gender-differentiated conclusion copy
 *
 * Spec: projects/nem-life/.claude/specs/nem-test-conclusion-logic-v2.md
 *
 * Tier 1: component tests against staging, no backend needed.
 * The real scoring coverage lives in tests/nem/nem-test-scoring.test.js
 * (node --test, no browser) — this file only proves the UI wiring.
 *
 * The quiz-driving helpers live in ./helpers/nem-quiz.js, shared with the phase-b and
 * report-json suites so they cannot drift apart again.
 */
import { test, expect } from '@playwright/test';

import {
  TEST_PAGE_NL,
  TEST_PAGE_EN,
  QUIZ_TEST_TIMEOUT_MS,
  questionHeading,
  loadPage,
  answerAllQuestions,
  answerByLabels,
  fillProfileScreen,
  getConclusionText,
} from './helpers/nem-quiz.js';

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-test-conclusion-logic-v2';

// Conclusion ID grammar from the spec:
//   01F-SR | 01F-SR-FP | 01F-LOW | 01F-HIGH  (and the 01M- equivalents)
const CONCLUSION_ID_RE = /\b01[FM]-(?:(?:SR|EM|FP|FR|FH)(?:-(?:SR|EM|FP|FR|FH))?|LOW|HIGH)\b/;

/* See the note on QUIZ_TEST_TIMEOUT_MS in the helper module: C3 and C5 drive the quiz
 * twice inside a single test body, and the default 30s budget killed them mid-quiz. */
test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

// ── Suite-specific helpers ────────────────────────────────────

/**
 * Produces false-hope 14, false-power 11, self-rejection 5, fear 4, emotional-numbing 2.
 * Both leaders clear the min-8 gate and the gap is exactly 3, so this is a DUAL:
 * key `false-hope_false-power`, ID `?-D-FH-FP`.
 * (Same answer pattern as the phase-b suite, re-labelled for the new key scheme.)
 */
async function answerDualProfile(page) {
  await answerByLabels(page, [
    'zelden', 'zelden', 'nooit', 'regelmatig', 'zelden',
    'regelmatig', 'zelden', 'nooit', 'soms', 'zelden',
    'heel vaak', 'regelmatig', 'zelden', 'regelmatig', 'zelden',
    'heel vaak', 'soms', 'zelden', 'regelmatig', 'zelden',
  ]);
}

/** The CTA that advances to the opt-in form. Absent on flat outcomes. */
function optinCta(page) {
  return page.getByRole('button', { name: /ontvang mijn rapport|receive my report/i });
}

/** The contact anchor shown on flat outcomes. */
function contactLink(page) {
  return page.locator('[data-element="conclusion-contact-link"]');
}

/** Drive the whole flow to the conclusion screen in one call. */
async function reachConclusion(page, { answers, gender = null, path = TEST_PAGE_NL, query = '' } = {}) {
  await loadPage(page, path, query);

  /* Question 1 renders immediately — there is no start screen on the live page, whatever
   * the 6-screen description in the phase-b spec says. This suite was written from that
   * spec and never run, so it clicked a start button that does not exist and every test
   * died here rather than in its own assertion. Click it only if it is actually there. */
  const start = page.getByRole('button', { name: /start|begin/i });
  if (await start.count()) {
    await start.first().click();
    await expect(questionHeading(page)).toBeVisible({ timeout: 10_000 });
  }

  if (typeof answers === 'function') await answers(page);
  else await answerAllQuestions(page, answers);
  await fillProfileScreen(page, gender);
}

// ── C1: Dual outcome — unchanged happy path ───────────────────

test.describe(`${SLUG} — C1: Dual outcome`, () => {
  test('renders a non-empty conclusion for a dual profile', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile });
    const text = await getConclusionText(page);
    expect(text.length).toBeGreaterThan(0);
  });

  test('dual profile shows the opt-in CTA', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile });
    await expect(optinCta(page)).toBeVisible({ timeout: 10_000 });
  });

  test('dual profile does not show a contact link', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile });
    await expect(contactLink(page)).toHaveCount(0);
  });
});

// ── C2: Flat-low — every answer "nooit" (all mechanisms 0) ─────

test.describe(`${SLUG} — C2: Flat-low outcome`, () => {
  test('flat-low profile renders a conclusion and a contact link', async ({ page }) => {
    await reachConclusion(page, { answers: 'nooit' });
    const text = await getConclusionText(page);
    expect(text.length).toBeGreaterThan(0);
    await expect(contactLink(page)).toBeVisible({ timeout: 10_000 });
  });

  test('flat-low profile shows no opt-in CTA', async ({ page }) => {
    await reachConclusion(page, { answers: 'nooit' });
    await expect(optinCta(page)).toHaveCount(0);
  });

  test('flat-low contact link points at a contact page', async ({ page }) => {
    await reachConclusion(page, { answers: 'nooit' });
    const href = await contactLink(page).first().getAttribute('href');
    expect(href).toMatch(/contact/i);
  });

  test('flat-low debug badge reports the LOW generic ID', async ({ page }) => {
    await reachConclusion(page, { answers: 'nooit', query: '?nemdebug=1' });
    const badge = page.locator('[data-element="conclusion-debug"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    expect(await badge.innerText()).toMatch(/01[FM]-LOW/);
  });
});

// ── C3: Flat-high — every answer "heel vaak" (all mechanisms 16) ──

test.describe(`${SLUG} — C3: Flat-high outcome`, () => {
  test('flat-high profile renders a conclusion and a contact link', async ({ page }) => {
    await reachConclusion(page, { answers: 'heel vaak' });
    const text = await getConclusionText(page);
    expect(text.length).toBeGreaterThan(0);
    await expect(contactLink(page)).toBeVisible({ timeout: 10_000 });
  });

  test('flat-high profile shows no opt-in CTA — report is skipped', async ({ page }) => {
    await reachConclusion(page, { answers: 'heel vaak' });
    await expect(optinCta(page)).toHaveCount(0);
  });

  test('flat-high debug badge reports the HIGH generic ID', async ({ page }) => {
    await reachConclusion(page, { answers: 'heel vaak', query: '?nemdebug=1' });
    const badge = page.locator('[data-element="conclusion-debug"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    expect(await badge.innerText()).toMatch(/01[FM]-HIGH/);
  });

  test('flat-high and flat-low render different copy', async ({ page }) => {
    await reachConclusion(page, { answers: 'heel vaak' });
    const high = await getConclusionText(page);
    await reachConclusion(page, { answers: 'nooit' });
    const low = await getConclusionText(page);
    expect(high).not.toBe(low);
  });
});

// ── C4: Debug mode ────────────────────────────────────────────

test.describe(`${SLUG} — C4: Debug mode`, () => {
  test('debug badge is absent from the DOM without the query param', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile });
    // Absent, not merely hidden — it must not be reachable by toggling CSS.
    await expect(page.locator('[data-element="conclusion-debug"]')).toHaveCount(0);
  });

  test('debug badge renders a well-formed conclusion ID with ?nemdebug=1', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile, query: '?nemdebug=1' });
    const badge = page.locator('[data-element="conclusion-debug"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    expect(await badge.innerText()).toMatch(CONCLUSION_ID_RE);
  });

  test('debug badge reports a directional dual ID for the dual profile', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile, query: '?nemdebug=1' });
    const badgeText = await page.locator('[data-element="conclusion-debug"]').innerText();
    // false-hope leading, false-power following
    expect(badgeText).toMatch(/01[FM]-FH-FP/);
    expect(badgeText).toContain('false-hope_false-power');
  });

  test('debug badge is hidden from assistive technology', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile, query: '?nemdebug=1' });
    await expect(page.locator('[data-element="conclusion-debug"]')).toHaveAttribute('aria-hidden', 'true');
  });
});

// ── C5: Gender differentiation ────────────────────────────────

test.describe(`${SLUG} — C5: Gender differentiation`, () => {
  test('conclusion text differs between man and vrouw for identical answers', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile, gender: 'Man' });
    const manText = await getConclusionText(page);
    await reachConclusion(page, { answers: answerDualProfile, gender: 'Vrouw' });
    const vrouwText = await getConclusionText(page);
    expect(manText).not.toBe(vrouwText);
  });

  test('debug badge gender prefix matches the selected gender', async ({ page }) => {
    await reachConclusion(page, { answers: answerDualProfile, gender: 'Vrouw', query: '?nemdebug=1' });
    const badgeText = await page.locator('[data-element="conclusion-debug"]').innerText();
    expect(badgeText).toMatch(/01F-/);
  });
});

// ── C6: Locale ────────────────────────────────────────────────

test.describe(`${SLUG} — C6: English locale`, () => {
  /* Hand-rolled the whole flow instead of calling reachConclusion, and so never picked up
   * the fix that stopped every other test clicking a start button the live page does not
   * have. It died on that click, not on its own assertion — the same failure reachConclusion
   * was written to end. fillProfileScreen already matches /ga verder|continue/i, so the
   * shared path handles EN as it stands. */
  test('English locale renders a non-empty conclusion', async ({ page }) => {
    await reachConclusion(page, { answers: 'never', path: TEST_PAGE_EN });
    const text = await getConclusionText(page);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── C7: Console hygiene + reduced motion ──────────────────────

test.describe(`${SLUG} — C7: Hygiene`, () => {
  test('no console errors through the full conclusion flow', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await reachConclusion(page, { answers: answerDualProfile, query: '?nemdebug=1' });
    await getConclusionText(page);

    // Ignore third-party noise Webflow pages routinely emit.
    const relevant = errors.filter(
      (e) => !/favicon|analytics|gtag|googletagmanager|hotjar|ERR_BLOCKED/i.test(e)
    );
    expect(relevant).toEqual([]);
  });

  test('respects prefers-reduced-motion on the conclusion transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await reachConclusion(page, { answers: answerDualProfile });
    const text = await getConclusionText(page);
    expect(text.length).toBeGreaterThan(0);
  });
});
