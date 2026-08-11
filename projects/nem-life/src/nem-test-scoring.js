/* nem-test-scoring.js — pure scoring engine for the NEM Test Phase B component.
 *
 * Extracted from nem-test-phase-b.tsx so the scoring logic can be unit-tested with
 * `node --test` (the .tsx cannot be imported directly — it carries React/Webflow deps).
 * The component imports { calculateScores } from this file. No React/Webflow imports here.
 *
 * Tests: tests/nem/nem-test-scoring.test.js
 */

/* ─── Mechanism mapping (fixed, never changes regardless of prop values) ─── */
export const MECHANISM_MAP = {
  zelfafwijzing:       { questions: [0, 1, 6, 16], bodyQ: 16, situationalQ: 0 },
  emotioneleVerdoving: { questions: [2, 7, 12, 17], bodyQ: 12, situationalQ: 17 },
  valseMacht:          { questions: [3, 8, 13, 18], bodyQ: 13, situationalQ: 18 },
  angst:               { questions: [4, 9, 14, 19], bodyQ: 14, situationalQ: 19 },
  valseHoop:           { questions: [5, 10, 11, 15], bodyQ: 10, situationalQ: 15 },
};

export const MECHANISM_TO_KEY = {
  zelfafwijzing: "zelfafwijzing",
  emotioneleVerdoving: "emotionele-verdoving",
  valseMacht: "valse-macht",
  angst: "angst",
  valseHoop: "valse-hoop",
};

/* Canonical mechanism order. Dual conclusion keys are UNORDERED pairs written in
 * this order — the 15-key conclusion table contains e.g. `zelfafwijzing_angst`,
 * never the reverse. Derived from MECHANISM_MAP declaration order. */
export const MECHANISM_ORDER = Object.keys(MECHANISM_MAP);

/* Build the conclusion-text key.
 *
 * For a dual result the pair MUST be ordered canonically (MECHANISM_ORDER), not by
 * primary-then-secondary. The conclusion table only holds the 10 unordered pairs in
 * canonical order, so an ordered `${primary}_${secondary}` key misses the table for
 * roughly half of all dual outcomes (e.g. primary=angst, secondary=zelfafwijzing
 * would produce `angst_zelfafwijzing`, which does not exist → blank conclusion).
 * Canonicalising here guarantees the lookup always resolves, whichever mechanism
 * is dominant. Primary/secondary are still reported separately for the report focus. */
export function conclusionKeyFor(primary, secondary) {
  if (!secondary) return MECHANISM_TO_KEY[primary];
  const [first, second] = [primary, secondary].sort(
    (a, b) => MECHANISM_ORDER.indexOf(a) - MECHANISM_ORDER.indexOf(b),
  );
  return `${MECHANISM_TO_KEY[first]}_${MECHANISM_TO_KEY[second]}`;
}

/* ─── Scoring engine ─── */
export function calculateScores(answers) {
  const scores = {};
  for (const [mechanism, { questions }] of Object.entries(MECHANISM_MAP)) {
    scores[mechanism] = questions.reduce((sum, qi) => sum + (answers[qi] ?? 0), 0);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  let primary = sorted[0][0];
  let secondary = null;

  const topScore = sorted[0][1];
  const tied = sorted.filter(([, s]) => s === topScore);

  if (tied.length > 1) {
    // Equal highest score: the body + situational questions of the tied mechanisms
    // (least susceptible to socially-desirable answering) break the tie for primary.
    const withTiebreak = tied.map(([mech]) => {
      const { bodyQ, situationalQ } = MECHANISM_MAP[mech];
      return { mech, tiebreak: (answers[bodyQ] ?? 0) + (answers[situationalQ] ?? 0) };
    });
    withTiebreak.sort((a, b) => b.tiebreak - a.tiebreak);
    primary = withTiebreak[0].mech;

    const remaining = sorted.filter(([m]) => m !== primary);
    if (remaining.length > 0 && topScore - remaining[0][1] <= 3) {
      secondary = remaining[0][0];
    }
  } else if (sorted.length > 1 && sorted[0][1] - sorted[1][1] <= 3) {
    secondary = sorted[1][0];
  }

  return {
    scores,
    primary,
    secondary,
    conclusionKey: conclusionKeyFor(primary, secondary),
    totalScore: Object.values(scores).reduce((a, b) => a + b, 0),
  };
}
