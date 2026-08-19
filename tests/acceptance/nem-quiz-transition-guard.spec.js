/**
 * Acceptance tests — nem-quiz-transition-guard
 *
 * Covers Part A of the spec: guarding the ~500ms question transition in the NEM Test
 * quiz component.
 *
 * Spec: projects/nem-life/.claude/specs/nem-quiz-transition-guard-and-intro-line-plumbing.md
 * Diagnosis: projects/nem-life/.claude/reports/nem-acceptance-failures-2026-08-19.md
 *
 * NOTE: these tests describe behaviour that does not exist on staging yet. They are
 * expected to FAIL until Part A ships — that is the point, they are the /build verify
 * loop, written first per the TDD rule in CLAUDE.md.
 *
 * Two defects are under test, and they are not the same thing:
 *
 *   1. RE-ENTRANCY. A second click inside the window runs selectAnswer again with the
 *      same currentStep. It overwrites the recorded answer AND schedules a second
 *      advance, so the quiz jumps N -> N+2 and the skipped question keeps null. That
 *      null flows into calculateScores and the completion beacon, so this is a data
 *      bug wearing a UX bug's clothes.
 *
 *   2. THE REMOUNT SEAM. The quiz wrapper is <div key={currentStep}>, so the subtree is
 *      replaced when the step changes. A click dispatched into the node being replaced
 *      lands on a detached handler and does nothing — the dead click a real user has to
 *      press twice.
 *
 * The fix for both is one guard, and `disabled` is what makes Playwright's actionability
 * check wait for the new node rather than clicking the doomed one.
 *
 * ── On the sampling technique ──────────────────────────────────────────────────
 * The window is ~500ms, which is too short to observe reliably with a polled
 * `expect(...).toBeDisabled()` — the first sample can land after the remount and read a
 * fresh, enabled node, which looks like a pass turning into a fail at random. So the
 * tests that need to see INSIDE the window dispatch the click and read the DOM in the
 * same page.evaluate, 60ms later. Deterministic, and it cannot straddle the boundary.
 *
 * The component renders into a shadow DOM. Playwright locators pierce it automatically;
 * page.evaluate does not, hence quizRoot() below.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

import {
  STAGING,
  TEST_PAGE_NL,
  TOTAL_QUESTIONS,
  QUIZ_TEST_TIMEOUT_MS,
  loadPage,
  questionHeading,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

dotenv.config({ path: '.env.test' });

const SLUG = 'nem-quiz-transition-guard';

/* Deliberately imported rather than redefined. The helper module is Part B, and this
 * import is what makes the ordering fail loudly instead of silently duplicating the
 * helpers a fourth time — which is exactly how C6 drifted out of sync last time. */
void STAGING;

/* Inside the ~500ms transition, comfortably clear of both edges. */
const MID_TRANSITION_MS = 60;

/* Longer than the full 200 + 300 fade plus the 400ms fade-in, so the quiz has settled. */
const SETTLED_MS = 1200;

test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

// ── Shadow-DOM helpers (page.evaluate does not pierce, locators do) ────────────

/** Serialised into the page: finds the shadow root that actually holds the quiz. */
const QUIZ_ROOT_FN = `
  () => {
    for (const host of document.querySelectorAll('code-island')) {
      const root = host.shadowRoot;
      if (root && root.querySelector('.nem-answers')) return root;
    }
    return null;
  }
`;

/**
 * Click one answer pill and read the state of every pill a beat later — both inside the
 * same evaluate, so the read cannot drift out of the transition window.
 *
 * Returns the pill states as seen mid-transition, plus the question text before and
 * after, so a single call can assert on both the guard and the advance.
 */
async function clickAndSampleMidTransition(page, pillIndex, waitMs = MID_TRANSITION_MS) {
  return page.evaluate(
    async ([rootFnSrc, index, delay]) => {
      const root = new Function('return ' + rootFnSrc)()();
      if (!root) throw new Error('quiz shadow root not found');

      const pills = () => Array.from(root.querySelectorAll('.nem-answers button'));
      const counter = () =>
        (root.querySelector('[aria-live="polite"]')?.textContent || '').trim();
      const backButton = () => root.querySelector('[data-element="back-button"]');

      const before = counter();
      pills()[index].click();
      await new Promise((r) => setTimeout(r, delay));

      return {
        before,
        during: counter(),
        pillsDisabled: pills().map((b) => b.disabled),
        backDisabled: backButton() ? backButton().disabled : null,
        selectedOpacity: (() => {
          const sel = pills().find((b) => b.getAttribute('aria-selected') === 'true');
          return sel ? getComputedStyle(sel).opacity : null;
        })(),
        selectedBackground: (() => {
          const sel = pills().find((b) => b.getAttribute('aria-selected') === 'true');
          return sel ? getComputedStyle(sel).backgroundColor : null;
        })(),
      };
    },
    [QUIZ_ROOT_FN, pillIndex, waitMs],
  );
}

/**
 * Dispatch two clicks `gapMs` apart, both inside the transition window, then let the
 * quiz settle. This is the re-entrancy case: the second click must be ignored outright.
 */
async function doubleClickInsideWindow(page, firstIndex, secondIndex, gapMs = 80) {
  return page.evaluate(
    async ([rootFnSrc, a, b, gap]) => {
      const root = new Function('return ' + rootFnSrc)()();
      const pills = () => Array.from(root.querySelectorAll('.nem-answers button'));
      const counter = () =>
        (root.querySelector('[aria-live="polite"]')?.textContent || '').trim();

      const before = counter();
      pills()[a].click();
      await new Promise((r) => setTimeout(r, gap));
      /* Fires into the pill as it stands mid-transition. Once guarded this is a no-op:
       * the browser does not dispatch click on a disabled button at all. */
      pills()[b].click();
      return { before };
    },
    [QUIZ_ROOT_FN, firstIndex, secondIndex, gapMs],
  );
}

/** Reads "Vraag N van 20" and returns N, or null off the question screen. */
async function questionNumber(page) {
  const raw = await page.evaluate(
    ([rootFnSrc]) => {
      const root = new Function('return ' + rootFnSrc)()();
      if (!root) return null;
      return (root.querySelector('[aria-live="polite"]')?.textContent || '').trim();
    },
    [QUIZ_ROOT_FN],
  );
  const m = raw && raw.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Every pill's disabled flag, right now. */
async function pillsDisabled(page) {
  return page.evaluate(
    ([rootFnSrc]) => {
      const root = new Function('return ' + rootFnSrc)()();
      return Array.from(root.querySelectorAll('.nem-answers button')).map(
        (b) => b.disabled,
      );
    },
    [QUIZ_ROOT_FN],
  );
}

/** Which pill is recorded as chosen for the question currently on screen. */
async function selectedPillLabel(page) {
  return page.evaluate(
    ([rootFnSrc]) => {
      const root = new Function('return ' + rootFnSrc)()();
      const sel = Array.from(root.querySelectorAll('.nem-answers button')).find(
        (b) => b.getAttribute('aria-selected') === 'true',
      );
      return sel ? sel.textContent.trim() : null;
    },
    [QUIZ_ROOT_FN],
  );
}

/**
 * One click, one advance, no retry — the whole point of Part A.
 *
 * Deliberately NOT the shared answerQuestion helper: that one still carries the retry
 * until task B4, and a retry would mask exactly the defect this file exists to prove is
 * gone. If this ever needs a second attempt, the guard did not work.
 */
async function answerOnceStrictly(page, label) {
  const before = await questionNumber(page);
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect.poll(() => questionNumber(page), { timeout: 5_000 }).not.toBe(before);
}

// ── Tests ─────────────────────────────────────────────────────

test.describe(`${SLUG} — the guard`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, TEST_PAGE_NL);
  });

  test('answer pills are disabled while the question transition is in flight', async ({
    page,
  }) => {
    const sample = await clickAndSampleMidTransition(page, 2);

    expect(sample.pillsDisabled).toHaveLength(5);
    expect(sample.pillsDisabled.every(Boolean)).toBe(true);
    /* Still on the same question mid-transition — proves the sample really was taken
     * inside the window and not after the remount. */
    expect(sample.during).toBe(sample.before);
  });

  test('the back button is disabled while the transition is in flight', async ({
    page,
  }) => {
    /* The back button only renders from question 2 onward. */
    await answerOnceStrictly(page, 'soms');
    await page.waitForTimeout(SETTLED_MS);

    const sample = await clickAndSampleMidTransition(page, 2);
    expect(sample.backDisabled).toBe(true);
  });

  test('pills re-enable as soon as the next question renders', async ({ page }) => {
    await answerOnceStrictly(page, 'soms');
    await expect
      .poll(() => pillsDisabled(page), { timeout: 5_000 })
      .toEqual([false, false, false, false, false]);
  });

  test('the selected pill stays visually selected while disabled', async ({ page }) => {
    const sample = await clickAndSampleMidTransition(page, 4);

    /* The selected pill is the user's only confirmation that the click registered. It
     * must not grey out for half a second just because it is inert. */
    expect(sample.selectedOpacity).toBe('1');
    expect(sample.selectedBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(sample.selectedBackground).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe(`${SLUG} — re-entrancy`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, TEST_PAGE_NL);
  });

  test('a second click during the fade does not skip a question', async ({ page }) => {
    const start = await questionNumber(page);
    expect(start).toBe(1);

    await doubleClickInsideWindow(page, 0, 4);
    await page.waitForTimeout(SETTLED_MS);

    /* Exactly one advance. Unguarded, the second click schedules its own chain and the
     * quiz lands on 3 with question 2 never answered. */
    expect(await questionNumber(page)).toBe(2);
  });

  test('a second click during the fade does not overwrite the recorded answer', async ({
    page,
  }) => {
    /* Pill 0 is "nooit" (score 0), pill 4 is "heel vaak" (score 4) — as far apart as the
     * scale allows, so a silent overwrite would be unmissable in the conclusion. */
    await doubleClickInsideWindow(page, 0, 4);
    await page.waitForTimeout(SETTLED_MS);

    await page.locator('[data-element="back-button"]').click();
    await expect(questionHeading(page)).toBeVisible({ timeout: 10_000 });

    expect(await questionNumber(page)).toBe(1);
    expect(await selectedPillLabel(page)).toBe('nooit');
  });

  test('twenty single clicks advance twenty questions with no retry', async ({
    page,
  }) => {
    for (let i = 0; i < TOTAL_QUESTIONS - 1; i += 1) {
      await answerOnceStrictly(page, 'soms');
    }
    expect(await questionNumber(page)).toBe(TOTAL_QUESTIONS);

    /* The twentieth answer leaves the question screen entirely, for the profile screen. */
    await page.getByRole('button', { name: 'soms', exact: true }).click();
    await expect(page.locator('[data-field="gender"]')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe(`${SLUG} — reduced motion`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('the quiz advances normally under prefers-reduced-motion', async ({ page }) => {
    await loadPage(page, TEST_PAGE_NL);

    /* Both delays collapse to 0, so the lock is held for about two macrotasks. The risk
     * being checked is the opposite of the one above: that the guard latches and leaves
     * the pills permanently inert. */
    for (let i = 0; i < 3; i += 1) {
      await answerOnceStrictly(page, 'soms');
    }
    expect(await questionNumber(page)).toBe(4);
    expect((await pillsDisabled(page)).every((d) => d === false)).toBe(true);
  });
});

test.describe(`${SLUG} — general`, () => {
  test('no console errors through a full run', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await loadPage(page, TEST_PAGE_NL);
    for (let i = 0; i < TOTAL_QUESTIONS; i += 1) {
      const before = await questionNumber(page);
      await page.getByRole('button', { name: 'soms', exact: true }).click();
      if (i < TOTAL_QUESTIONS - 1) {
        await expect
          .poll(() => questionNumber(page), { timeout: 5_000 })
          .not.toBe(before);
      }
    }
    await fillProfileScreen(page);

    /* The timer chain is cleared on unmount now, so the React warning about setting
     * state on an unmounted component must not appear either. */
    expect(errors.filter((e) => /unmounted/i.test(e))).toEqual([]);
    expect(errors).toEqual([]);
  });
});
