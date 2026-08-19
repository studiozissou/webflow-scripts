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
 * NOTE: these tests describe behaviour that does not exist on staging yet.
 * They are expected to FAIL until the build ships. That is the point — they
 * are the /build verify loop, written first per the TDD rule in CLAUDE.md.
 *
 * Tier 1: component tests against staging, no backend needed.
 * The real scoring coverage lives in tests/nem/nem-test-scoring.test.js
 * (node --test, no browser) — this file only proves the UI wiring.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'nem-test-conclusion-logic-v2';
const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const TEST_PAGE_NL = '/zelftesten/waarom-reageer-ik-zo';
const TEST_PAGE_EN = '/en/zelftesten/waarom-reageer-ik-zo';

const TOTAL_QUESTIONS = 20;

// Conclusion ID grammar from the spec:
//   01F-SR | 01F-SR-FP | 01F-LOW | 01F-HIGH  (and the 01M- equivalents)
const CONCLUSION_ID_RE = /\b01[FM]-(?:(?:SR|EM|FP|FR|FH)(?:-(?:SR|EM|FP|FR|FH))?|LOW|HIGH)\b/;

/* The default 30s budget is not enough for this suite, and that — not any defect in the
 * component — is what the failures were.
 *
 * One run-through is twenty questions plus a page load plus the profile screen. C3 and C5
 * each drive that twice inside a single test body to compare two outcomes, so they were
 * asking for roughly double the budget they had and were killed mid-quiz, at "Vraag 18 van
 * 20". The fixed sleeps above are gone, which takes most of the cost out, but two full
 * run-throughs against a live staging site still deserve real headroom. */
test.beforeEach(() => {
  test.setTimeout(90_000);
});

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
}

/* The question heading. Also the readiness signal: it only exists once the code component
 * has hydrated, so waiting for it beats guessing at a fixed delay. */
function questionHeading(page) {
  return page.getByRole('heading', { level: 3 }).first();
}

async function loadPage(page, path = TEST_PAGE_NL, query = '') {
  await page.goto(`${STAGING}${path}${query}`);
  await waitForReady(page);
  /* Question 1 renders straight away on the live page. Waiting for it rather than sleeping
   * 2s saves that 2s on every single load, which is most of why this suite used to time
   * out — see the note on the per-test budget below. */
  await expect(questionHeading(page)).toBeVisible({ timeout: 20_000 });
}

/* What the current question reads as, or a sentinel once the quiz has moved past the last
 * one. The inner timeout is load-bearing: innerText() on a locator matching nothing waits
 * out its own default rather than throwing, so without a bound of its own it is still
 * waiting when a poll gives up, and the ordinary end of the quiz looks like a failure. */
async function readQuestion(page) {
  try {
    return (await questionHeading(page).innerText({ timeout: 1_000 })).trim();
  } catch {
    return '__left the question screen__';
  }
}

async function answerQuestion(page, answerLabel) {
  /* Wait for the question to actually change rather than sleeping through the fade.
   *
   * The old fixed 600ms was the single biggest cost in this suite: twenty questions is 12s
   * of pure sleep per run-through, and the tests that drive the quiz twice spent ~32s doing
   * nothing before the 30s budget killed them mid-quiz. That is what the "failures" were —
   * a timeout, not a defect. */
  const before = await readQuestion(page);
  const button = page.getByRole('button', { name: answerLabel, exact: true });

  /* ⚠️ COMPONENT BEHAVIOUR, not a test workaround: a click that lands during the fade
   * between questions is swallowed and the quiz does not advance. A real user hits this as
   * a dead click that needs pressing twice, so it is worth fixing in the component. The old
   * blind sleep hid it completely. One retry here keeps the suite honest about genuine
   * failures without reporting the fade as one — and it is safe, because it only fires when
   * the question demonstrably did not change. */
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
async function answerAllQuestions(page, answerLabel) {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    await answerQuestion(page, answerLabel);
  }
}

/**
 * Produces false-hope 14, false-power 11, self-rejection 5, fear 4, emotional-numbing 2.
 * Both leaders clear the min-8 gate and the gap is exactly 3, so this is a DUAL:
 * key `false-hope_false-power`, ID `?-D-FH-FP`.
 * (Same answer pattern as the phase-b suite, re-labelled for the new key scheme.)
 */
async function answerDualProfile(page) {
  const pattern = [
    'zelden', 'zelden', 'nooit', 'regelmatig', 'zelden',
    'regelmatig', 'zelden', 'nooit', 'soms', 'zelden',
    'heel vaak', 'regelmatig', 'zelden', 'regelmatig', 'zelden',
    'heel vaak', 'soms', 'zelden', 'regelmatig', 'zelden',
  ];
  for (const answer of pattern) await answerQuestion(page, answer);
}

async function fillProfileScreen(page, genderLabel = null) {
  const gender = page.locator('[data-field="gender"]');
  const age = page.locator('[data-field="age-category"]');
  const relationship = page.locator('[data-field="relationship-status"]');

  await expect(gender).toBeVisible({ timeout: 10_000 });

  if (genderLabel) await gender.selectOption({ label: genderLabel });
  else await gender.selectOption({ index: 1 });
  await age.selectOption({ index: 1 });
  await relationship.selectOption({ index: 1 });

  /* Continue validates all three fields, and a click that lands before React has committed
   * the last selection is rejected — the screen just stays put with an error, which looks
   * exactly like a click that never happened. That is what the old 300ms sleep was really
   * guarding, so assert the committed values rather than timing them. */
  for (const field of [gender, age, relationship]) {
    await expect(field).not.toHaveValue('');
  }

  await page.getByRole('button', { name: /ga verder|continue/i }).click();
  /* Leaving the profile screen is the signal that continue was accepted. Without this the
   * next assertion races the transition and reports a missing conclusion instead of a
   * rejected form. */
  await expect(gender).toBeHidden({ timeout: 10_000 });
}

async function getConclusionText(page) {
  const el = page.locator('[data-element="conclusion-text"]');
  await expect(el).toBeVisible({ timeout: 10_000 });
  return (await el.first().innerText()).trim();
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
    await page.waitForTimeout(600);
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
