/* nem-test-scoring.js — pure scoring engine for the NEM Test Phase B component (v2).
 *
 * Extracted from nem-test-phase-b.tsx so the scoring logic can be unit-tested with
 * `node --test` (the .tsx cannot be imported directly — it carries React/Webflow deps).
 * The component imports { calculateScores } from this file. No React/Webflow imports here.
 *
 * Conclusion keys and IDs live in ./nem-test-conclusion-ids.js, which also generates
 * Alex's text sheet — so a text can never be written against a key this engine cannot
 * produce, and vice versa.
 *
 * Spec:  projects/nem-life/.claude/specs/nem-test-conclusion-logic-v2.md § 4
 * Tests: tests/nem/nem-test-scoring.test.js
 */

import { conclusionIdFor, conclusionKeyFor } from "./nem-test-conclusion-ids.js";

/* ─── Mechanism mapping ───
 *
 * Question indices are unchanged from Phase B — only the object keys moved from Dutch
 * to English (v2 item 5). The Dutch mechanism *names* remain in the user-facing NL copy;
 * this is a code-identifier change only.
 *
 * `bodyQ` and `situationalQ` are no longer used for tiebreaking (see TIEBREAK_ORDER) but
 * stay because the report prompt still references them, and they may return as a
 * second-level rule. */
export const MECHANISM_MAP = {
  selfRejection:    { questions: [0, 1, 6, 16], bodyQ: 16, situationalQ: 0 },
  emotionalNumbing: { questions: [2, 7, 12, 17], bodyQ: 12, situationalQ: 17 },
  falsePower:       { questions: [3, 8, 13, 18], bodyQ: 13, situationalQ: 18 },
  fear:             { questions: [4, 9, 14, 19], bodyQ: 14, situationalQ: 19 },
  falseHope:        { questions: [5, 10, 11, 15], bodyQ: 10, situationalQ: 15 },
};

/* Fixed tiebreak order, replacing Phase B's body + situational tiebreak.
 *
 * This is Christel's clinical order (confirmed by Will, 2026-08-17), which is also
 * MECHANISM_MAP declaration order. It is NOT derived from Alex's sheet row order —
 * that sheet reads fear → self-rejection → false-hope → false-power → emotional-numbing,
 * and an earlier draft of the spec wrongly cited it as the justification.
 *
 * Not to be confused with SHEET_ORDER in nem-test-conclusion-ids.js, which drives the
 * row order of the generated text sheet and nothing else. The two answer different
 * questions and must not be merged. */
export const TIEBREAK_ORDER = [
  "selfRejection",
  "emotionalNumbing",
  "falsePower",
  "fear",
  "falseHope",
];

/* ─── Thresholds ─── */

/* Out of 16 — the average of answering "soms" throughout. Below this, a mechanism is
 * not distinctive enough to name at all, as primary or secondary. */
export const MIN_MECHANISM_SCORE = 8;

/* A secondary must sit within this many points of the primary to be named. */
export const SECONDARY_GAP = 3;

/* max - min. At or below this, with every mechanism above the floor, the profile is
 * undifferentiated rather than led by anything. */
export const FLAT_SPREAD = 3;

/* ─── Scoring engine ─── */

/* Score the answers and resolve which conclusion text to render.
 *
 * `gender` is "female" | "male" — it only affects the conclusion ID, but it is required
 * rather than defaulted so a caller that forgets it fails loudly instead of silently
 * labelling everyone female.
 *
 * Evaluation order matters: flat-low is checked before flat-high, so 7,7,7,7,7 is
 * flat-low (nothing clears the floor) rather than flat-high (nothing stands apart). */
export function calculateScores(answers, gender) {
  const scores = {};
  for (const [mechanism, { questions }] of Object.entries(MECHANISM_MAP)) {
    scores[mechanism] = questions.reduce((sum, qi) => sum + (answers?.[qi] ?? 0), 0);
  }

  /* Sort by score descending, ties broken by fixed order rather than by whatever
   * order Object.entries happened to produce. */
  const sorted = Object.entries(scores).sort(
    (a, b) => b[1] - a[1] || TIEBREAK_ORDER.indexOf(a[0]) - TIEBREAK_ORDER.indexOf(b[0]),
  );

  const max = sorted[0][1];
  const min = sorted[sorted.length - 1][1];

  let outcome;
  let primary = null;
  let secondary = null;

  if (max < MIN_MECHANISM_SCORE) {
    outcome = "flat-low";
  } else if (min >= MIN_MECHANISM_SCORE && max - min <= FLAT_SPREAD) {
    outcome = "flat-high";
  } else {
    primary = sorted[0][0];

    const [candidate, candidateScore] = sorted[1];
    if (candidateScore >= MIN_MECHANISM_SCORE && max - candidateScore <= SECONDARY_GAP) {
      secondary = candidate;
    }

    outcome = secondary ? "dual" : "single";
  }

  return {
    scores,
    primary,
    secondary,
    outcome,
    conclusionKey: conclusionKeyFor({ outcome, primary, secondary }),
    conclusionId: conclusionIdFor(gender, { outcome, primary, secondary }),
    /* Flat outcomes route to a contact link instead of the opt-in and report — the
     * report is built around one clear mechanism, which is exactly what is absent. */
    skipsReport: outcome === "flat-low" || outcome === "flat-high",
    totalScore: Object.values(scores).reduce((a, b) => a + b, 0),
  };
}
