/* Tests for the NEM Test scoring engine, v2.
 *
 * Spec: projects/nem-life/.claude/specs/nem-test-conclusion-logic-v2.md § 4
 *
 * v2 reverses the Phase B canonical-key decision: dual keys are now DIRECTIONAL, so
 * `fear_self-rejection` and `self-rejection_fear` are different texts. The blank-
 * conclusion risk the canonical fix guarded against is covered here by a completeness
 * test over all 27 keys instead of by key rewriting.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateScores,
  FLAT_SPREAD,
  MECHANISM_MAP,
  MIN_MECHANISM_SCORE,
  SECONDARY_GAP,
  TIEBREAK_ORDER,
} from "../../projects/nem-life/src/nem-test-scoring.js";

import { enumerateConclusionRows } from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

const MECHS = Object.keys(MECHANISM_MAP);

/* Spread a mechanism total (0–16) across its four questions, max 4 each. */
function spread(total) {
  const values = [0, 0, 0, 0];
  let remaining = total;
  for (let i = 0; i < 4; i += 1) {
    values[i] = Math.min(4, remaining);
    remaining -= values[i];
  }
  return values;
}

/* Build a 20-answer array that produces exactly the requested per-mechanism scores. */
function answersForScores(scores) {
  const answers = new Array(20).fill(0);
  for (const [mech, total] of Object.entries(scores)) {
    MECHANISM_MAP[mech].questions.forEach((qi, i) => {
      answers[qi] = spread(total)[i];
    });
  }
  return answers;
}

/* The spec's worked examples are written as (SR, EM, FP, FR, FH). */
function scoresFrom([selfRejection, emotionalNumbing, falsePower, fear, falseHope]) {
  return { selfRejection, emotionalNumbing, falsePower, fear, falseHope };
}

function evaluate(tuple, gender = "female") {
  return calculateScores(answersForScores(scoresFrom(tuple)), gender);
}

describe("constants match the spec", () => {
  it("thresholds are 8 / 3 / 3", () => {
    assert.equal(MIN_MECHANISM_SCORE, 8);
    assert.equal(SECONDARY_GAP, 3);
    assert.equal(FLAT_SPREAD, 3);
  });

  it("mechanism keys are English and question indices are unchanged from Phase B", () => {
    assert.deepEqual(MECHS, [
      "selfRejection",
      "emotionalNumbing",
      "falsePower",
      "fear",
      "falseHope",
    ]);
    assert.deepEqual(MECHANISM_MAP.selfRejection.questions, [0, 1, 6, 16]);
    assert.deepEqual(MECHANISM_MAP.emotionalNumbing.questions, [2, 7, 12, 17]);
    assert.deepEqual(MECHANISM_MAP.falsePower.questions, [3, 8, 13, 18]);
    assert.deepEqual(MECHANISM_MAP.fear.questions, [4, 9, 14, 19]);
    assert.deepEqual(MECHANISM_MAP.falseHope.questions, [5, 10, 11, 15]);
  });

  it("bodyQ and situationalQ survive — the report prompt still references them", () => {
    for (const mech of MECHS) {
      assert.equal(typeof MECHANISM_MAP[mech].bodyQ, "number");
      assert.equal(typeof MECHANISM_MAP[mech].situationalQ, "number");
    }
  });

  it("TIEBREAK_ORDER covers every mechanism exactly once", () => {
    assert.equal(TIEBREAK_ORDER.length, 5);
    assert.deepEqual([...TIEBREAK_ORDER].sort(), [...MECHS].sort());
  });
});

describe("the spec's ten worked examples", () => {
  const cases = [
    { tuple: [3, 0, 0, 0, 0], outcome: "flat-low", key: "flat-low" },
    { tuple: [7, 7, 7, 7, 7], outcome: "flat-low", key: "flat-low" },
    { tuple: [16, 16, 16, 16, 16], outcome: "flat-high", key: "flat-high" },
    { tuple: [14, 13, 12, 12, 11], outcome: "flat-high", key: "flat-high" },
    { tuple: [8, 8, 8, 8, 8], outcome: "flat-high", key: "flat-high" },
    {
      tuple: [14, 11, 4, 2, 1],
      outcome: "dual",
      key: "self-rejection_emotional-numbing",
    },
    { tuple: [14, 6, 4, 2, 1], outcome: "single", key: "self-rejection" },
    { tuple: [14, 10, 4, 2, 1], outcome: "single", key: "self-rejection" },
    { tuple: [9, 8, 3, 2, 1], outcome: "dual", key: "self-rejection_emotional-numbing" },
    {
      tuple: [16, 15, 14, 3, 2],
      outcome: "dual",
      key: "self-rejection_emotional-numbing",
    },
  ];

  for (const { tuple, outcome, key } of cases) {
    it(`${tuple.join(",")} → ${outcome} / ${key}`, () => {
      const result = evaluate(tuple);
      assert.equal(result.outcome, outcome);
      assert.equal(result.conclusionKey, key);
    });
  }
});

describe("boundary cases the spec calls out explicitly", () => {
  it("7,7,7,7,7 is flat-low, not flat-high — max is below the naming threshold", () => {
    const result = evaluate([7, 7, 7, 7, 7]);
    assert.equal(result.outcome, "flat-low");
  });

  it("8,8,8,8,8 is flat-high — everything clears the threshold, spread is 0", () => {
    assert.equal(evaluate([8, 8, 8, 8, 8]).outcome, "flat-high");
  });

  it("16,15,14,3,2 is not flat — flat means undifferentiated, not several high", () => {
    assert.equal(evaluate([16, 15, 14, 3, 2]).outcome, "dual");
  });

  it("a spread of exactly FLAT_SPREAD is flat-high; one more is not", () => {
    assert.equal(evaluate([14, 13, 12, 12, 11]).outcome, "flat-high");
    assert.equal(evaluate([15, 13, 12, 12, 11]).outcome, "dual");
  });

  it("a secondary exactly on the gap qualifies; one beyond does not", () => {
    assert.equal(evaluate([14, 11, 4, 2, 1]).outcome, "dual");
    assert.equal(evaluate([14, 10, 4, 2, 1]).outcome, "single");
  });

  it("a secondary exactly on the score floor qualifies; one below does not", () => {
    assert.equal(evaluate([9, 8, 3, 2, 1]).outcome, "dual");
    assert.equal(evaluate([9, 7, 3, 2, 1]).outcome, "single");
  });
});

describe("flat outcomes name no mechanism", () => {
  for (const tuple of [
    [3, 0, 0, 0, 0],
    [16, 16, 16, 16, 16],
  ]) {
    it(`${tuple.join(",")} reports null primary and secondary`, () => {
      const result = evaluate(tuple);
      assert.equal(result.primary, null);
      assert.equal(result.secondary, null);
    });
  }

  it("flat outcomes still report the full score breakdown for the report engine", () => {
    const result = evaluate([16, 16, 16, 16, 16]);
    assert.equal(result.totalScore, 80);
    assert.equal(Object.keys(result.scores).length, 5);
  });
});

describe("the minimum score gate", () => {
  it("a mechanism below the floor is never named as primary", () => {
    const result = evaluate([7, 2, 1, 0, 0]);
    assert.equal(result.outcome, "flat-low");
    assert.equal(result.primary, null);
  });

  it("a mechanism below the floor is never named as secondary, however close", () => {
    const result = evaluate([9, 7, 0, 0, 0]);
    assert.equal(result.outcome, "single");
    assert.equal(result.secondary, null);
  });
});

describe("tiebreak — fixed order, not body/situational questions", () => {
  /* The order is Christel's clinical one, and the authority for it is Alex's source
   * doc § 4 (v2, 2026-08-19), which he declared authoritative over every earlier
   * instruction. It reads:
   *
   *   False power → Fear → Self-rejection → False hope → Emotional numbing
   *
   * An earlier reading had self-rejection and emotional numbing leading, which
   * silently resolved any tie involving them to the wrong mechanism — wrong
   * conclusion text, wrong report. These tests pin the doc's order specifically,
   * not merely "some fixed order". */
  it("TIEBREAK_ORDER is the order in the source doc § 4", () => {
    assert.deepEqual(TIEBREAK_ORDER, [
      "falsePower",
      "fear",
      "selfRejection",
      "falseHope",
      "emotionalNumbing",
    ]);
  });

  it("an exact tie resolves by TIEBREAK_ORDER index", () => {
    /* selfRejection and emotionalNumbing tie; selfRejection is earlier. */
    const result = evaluate([12, 12, 0, 0, 0]);
    assert.equal(result.primary, "selfRejection");
  });

  it("the earlier mechanism in TIEBREAK_ORDER wins regardless of tuple position", () => {
    /* falsePower and fear tie; falsePower is earlier in TIEBREAK_ORDER. */
    const result = evaluate([0, 0, 12, 12, 0]);
    assert.equal(result.primary, "falsePower");
  });

  it("false power beats self-rejection on a tie — the doc's order, not the old one", () => {
    /* The clearest case where the two orders disagree: the superseded order put
     * selfRejection first, so this exact profile used to produce 01F-SR. */
    const result = evaluate([12, 0, 12, 0, 0]);
    assert.equal(result.primary, "falsePower");
    assert.equal(result.secondary, "selfRejection");
  });

  it("emotional numbing is last — it never leads a tie", () => {
    /* Superseded order had emotionalNumbing second, ahead of falsePower and fear. */
    assert.equal(evaluate([0, 12, 12, 0, 0]).primary, "falsePower");
    assert.equal(evaluate([0, 12, 0, 12, 0]).primary, "fear");
    assert.equal(evaluate([0, 12, 0, 0, 12]).primary, "falseHope");
  });

  it("source doc § 4 example 3: false power leads false hope on a 13-13 tie", () => {
    /* John, male: FP 13, FH 13, SR 8, EM 5, FR 4. The doc resolves this to
     * primary false power, secondary false hope → 01M-FP-FH. */
    const result = evaluate([8, 5, 13, 4, 13], "male");
    assert.equal(result.primary, "falsePower");
    assert.equal(result.secondary, "falseHope");
    assert.equal(result.conclusionKey, "false-power_false-hope");
    assert.equal(result.conclusionId, "01M-FP-FH");
  });

  it("tiebreaking is deterministic across repeated calls", () => {
    const answers = answersForScores(scoresFrom([12, 12, 12, 0, 0]));
    const first = calculateScores(answers, "female");
    const second = calculateScores(answers, "female");
    assert.equal(first.conclusionId, second.conclusionId);
  });
});

describe("directional dual keys", () => {
  it("swapping which mechanism leads produces a different key", () => {
    const srLeads = evaluate([14, 12, 0, 0, 0]);
    const emLeads = evaluate([12, 14, 0, 0, 0]);
    assert.equal(srLeads.conclusionKey, "self-rejection_emotional-numbing");
    assert.equal(emLeads.conclusionKey, "emotional-numbing_self-rejection");
    assert.notEqual(srLeads.conclusionKey, emLeads.conclusionKey);
  });

  it("swapping which mechanism leads produces a different ID", () => {
    assert.notEqual(
      evaluate([14, 12, 0, 0, 0]).conclusionId,
      evaluate([12, 14, 0, 0, 0]).conclusionId,
    );
  });
});

describe("conclusion IDs come from the shared module", () => {
  it("gender is reflected in the ID", () => {
    assert.equal(evaluate([14, 6, 0, 0, 0], "female").conclusionId, "01F-SR");
    assert.equal(evaluate([14, 6, 0, 0, 0], "male").conclusionId, "01M-SR");
  });

  it("flat outcomes carry an ID too, so debug mode can name them", () => {
    assert.equal(evaluate([3, 0, 0, 0, 0], "female").conclusionId, "01F-LOW");
    assert.equal(evaluate([16, 16, 16, 16, 16], "male").conclusionId, "01M-HIGH");
  });
});

describe("completeness — no reachable outcome renders a blank conclusion", () => {
  const validKeys = new Set(enumerateConclusionRows().map((r) => r.key));
  const validIds = new Set(enumerateConclusionRows().map((r) => r.id));

  it("every ordered mechanism pair produces a key in the 27-key table", () => {
    for (const primary of MECHS) {
      for (const secondary of MECHS) {
        if (primary === secondary) continue;
        const scores = Object.fromEntries(MECHS.map((m) => [m, 0]));
        scores[primary] = 14;
        scores[secondary] = 12;
        const { conclusionKey } = calculateScores(answersForScores(scores), "female");
        assert.ok(
          validKeys.has(conclusionKey),
          `(${primary}, ${secondary}) produced "${conclusionKey}", not in the table`,
        );
      }
    }
  });

  it("every single mechanism produces a key in the table", () => {
    for (const mech of MECHS) {
      const scores = Object.fromEntries(MECHS.map((m) => [m, 0]));
      scores[mech] = 14;
      const { conclusionKey } = calculateScores(answersForScores(scores), "female");
      assert.ok(validKeys.has(conclusionKey), `${mech} produced "${conclusionKey}"`);
    }
  });

  it("a wide sweep of score combinations never escapes the table", () => {
    const steps = [0, 4, 7, 8, 11, 14, 16];
    let checked = 0;
    for (const a of steps) {
      for (const b of steps) {
        for (const c of steps) {
          const scores = scoresFrom([a, b, c, a, b]);
          const result = calculateScores(answersForScores(scores), "male");
          assert.ok(
            validKeys.has(result.conclusionKey),
            `scores ${JSON.stringify(scores)} produced "${result.conclusionKey}"`,
          );
          assert.ok(validIds.has(result.conclusionId));
          checked += 1;
        }
      }
    }
    assert.equal(checked, steps.length ** 3);
  });
});

describe("the payload handed to the report engine", () => {
  it("carries outcome, conclusionKey and conclusionId alongside the scores", () => {
    const result = evaluate([14, 11, 4, 2, 1]);
    assert.equal(result.outcome, "dual");
    assert.equal(result.conclusionKey, "self-rejection_emotional-numbing");
    assert.equal(result.conclusionId, "01F-SR-EM");
    assert.equal(result.primary, "selfRejection");
    assert.equal(result.secondary, "emotionalNumbing");
    assert.equal(result.totalScore, 32);
  });

  it("outcome is always one of the four documented values", () => {
    const allowed = new Set(["single", "dual", "flat-low", "flat-high"]);
    for (const tuple of [
      [3, 0, 0, 0, 0],
      [16, 16, 16, 16, 16],
      [14, 6, 0, 0, 0],
      [14, 12, 0, 0, 0],
    ]) {
      assert.ok(allowed.has(evaluate(tuple).outcome));
    }
  });

  it("skipsReport is true for flat outcomes and false otherwise", () => {
    assert.equal(evaluate([3, 0, 0, 0, 0]).skipsReport, true);
    assert.equal(evaluate([16, 16, 16, 16, 16]).skipsReport, true);
    assert.equal(evaluate([14, 6, 0, 0, 0]).skipsReport, false);
    assert.equal(evaluate([14, 12, 0, 0, 0]).skipsReport, false);
  });

  it("an unknown gender throws rather than emitting a broken ID", () => {
    assert.throws(() => calculateScores(answersForScores(scoresFrom([14, 6, 0, 0, 0])), "other"));
  });
});

describe("scoring arithmetic", () => {
  it("sums each mechanism's four questions", () => {
    const answers = new Array(20).fill(0);
    MECHANISM_MAP.fear.questions.forEach((qi) => {
      answers[qi] = 3;
    });
    const { scores } = calculateScores(answers, "female");
    assert.equal(scores.fear, 12);
    assert.equal(scores.selfRejection, 0);
  });

  it("treats missing answers as zero rather than NaN", () => {
    const { scores, totalScore } = calculateScores([], "female");
    assert.equal(totalScore, 0);
    for (const mech of MECHS) assert.equal(scores[mech], 0);
  });

  it("an all-zero test is flat-low, not a crash", () => {
    assert.equal(calculateScores(new Array(20).fill(0), "female").outcome, "flat-low");
  });
});
