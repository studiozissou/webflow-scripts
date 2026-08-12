import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScores,
  conclusionKeyFor,
  MECHANISM_MAP,
  MECHANISM_ORDER,
} from '../../projects/nem-life/src/nem-test-scoring.js';

/* The 15 conclusion keys Alex scoped: 5 singles + 10 UNORDERED pairs, each pair
 * written once in canonical (declaration) order. Any conclusionKey the engine
 * produces MUST be one of these, or the lookup renders a blank conclusion. */
const SINGLE_KEYS = ['zelfafwijzing', 'emotionele-verdoving', 'valse-macht', 'angst', 'valse-hoop'];
const DUAL_KEYS = [
  'zelfafwijzing_emotionele-verdoving',
  'zelfafwijzing_valse-macht',
  'zelfafwijzing_angst',
  'zelfafwijzing_valse-hoop',
  'emotionele-verdoving_valse-macht',
  'emotionele-verdoving_angst',
  'emotionele-verdoving_valse-hoop',
  'valse-macht_angst',
  'valse-macht_valse-hoop',
  'angst_valse-hoop',
];
const VALID_KEYS = new Set([...SINGLE_KEYS, ...DUAL_KEYS]);
const MECHS = Object.keys(MECHANISM_MAP);

/* Build a 20-answer array from a { mechanism: [4 values] } spec. */
function answersFrom(spec) {
  const a = new Array(20).fill(0);
  for (const [mech, vals] of Object.entries(spec)) {
    MECHANISM_MAP[mech].questions.forEach((qi, i) => { a[qi] = vals[i]; });
  }
  return a;
}

describe('conclusionKeyFor — canonical, order-independent keys', () => {
  it('every ordered (primary, secondary) pair yields a key in the 15-key table', () => {
    for (const primary of MECHS) {
      for (const secondary of MECHS) {
        if (primary === secondary) continue;
        const key = conclusionKeyFor(primary, secondary);
        assert.ok(
          VALID_KEYS.has(key),
          `pair (${primary}, ${secondary}) produced "${key}", which is not one of the 15 valid keys`,
        );
      }
    }
  });

  it('is order-independent: primary/secondary swap gives the same key', () => {
    for (const a of MECHS) {
      for (const b of MECHS) {
        if (a === b) continue;
        assert.equal(conclusionKeyFor(a, b), conclusionKeyFor(b, a));
      }
    }
  });

  it('regression: primary=angst, secondary=zelfafwijzing → "zelfafwijzing_angst" (not the inverted key)', () => {
    assert.equal(conclusionKeyFor('angst', 'zelfafwijzing'), 'zelfafwijzing_angst');
  });

  it('single mechanism returns the bare key', () => {
    assert.equal(conclusionKeyFor('valseHoop', null), 'valse-hoop');
  });

  it('canonical order matches MECHANISM_MAP declaration order', () => {
    assert.deepEqual(MECHANISM_ORDER, MECHS);
  });
});

describe('calculateScores', () => {
  it('spec example profile → primary valseHoop, secondary valseMacht, total 44', () => {
    const answers = answersFrom({
      zelfafwijzing: [2, 2, 2, 3],       // Q1,Q2,Q7,Q17 = 9
      emotioneleVerdoving: [1, 0, 1, 1], // Q3,Q8,Q13,Q18 = 3
      valseMacht: [3, 2, 3, 3],          // Q4,Q9,Q14,Q19 = 11
      angst: [2, 2, 1, 2],               // Q5,Q10,Q15,Q20 = 7
      valseHoop: [3, 4, 3, 4],           // Q6,Q11,Q12,Q16 = 14
    });
    const r = calculateScores(answers);
    assert.equal(r.primary, 'valseHoop');
    assert.equal(r.secondary, 'valseMacht');   // 11 is within 3 of 14
    assert.equal(r.conclusionKey, 'valse-macht_valse-hoop');
    assert.equal(r.totalScore, 44);
  });

  it('tie on top score (angst 12 / valseHoop 12) is broken by body + situational questions', () => {
    // valseHoop body+situational = 4+3 = 7 beats angst body+situational = 2+2 = 4
    const answers = answersFrom({
      angst: [4, 4, 2, 2],      // Q5,Q10,Q15(body),Q20(sit): 12, tiebreak = 2+2 = 4
      valseHoop: [4, 4, 1, 3],  // Q6,Q11(body),Q12,Q16(sit): 12, tiebreak = 4+3 = 7
    });
    const r = calculateScores(answers);
    assert.equal(r.primary, 'valseHoop');            // higher body+situational
    assert.equal(r.secondary, 'angst');              // co-tied, within 3
    assert.equal(r.conclusionKey, 'angst_valse-hoop'); // canonical, valid
    assert.ok(VALID_KEYS.has(r.conclusionKey));
  });

  it('gap of 4+ omits the secondary (single key)', () => {
    const answers = answersFrom({
      valseHoop: [4, 4, 3, 3],   // 14
      valseMacht: [3, 3, 2, 2],  // 10 — exactly 4 behind → omitted
    });
    const r = calculateScores(answers);
    assert.equal(r.primary, 'valseHoop');
    assert.equal(r.secondary, null);
    assert.equal(r.conclusionKey, 'valse-hoop');
  });
});
