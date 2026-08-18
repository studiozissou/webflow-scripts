/* nem-test-conclusion-ids.js — conclusion keys and IDs for the NEM Test (engine v2).
 *
 * One source of truth for three things that must never drift apart:
 *   1. the conclusion key the component looks up in the text tables
 *   2. the conclusion ID Alex and Christel quote when discussing a specific text
 *   3. the 54-row enumeration that generates their Google Sheet
 *
 * Because the sheet is generated from the same functions the component calls at
 * runtime, a text can never be written against a key the engine cannot produce.
 *
 * Spec: projects/nem-life/.claude/specs/nem-test-conclusion-logic-v2.md § 3
 * Tests: tests/nem/nem-conclusion-ids.test.js
 * Sheet: NEM_TEST_01_Default_texts (owner alex@nemlife.com)
 */

/* ─── Mechanisms ─── */

/* Sheet row order. This is the order Alex's sheet lists mechanisms in, and it drives
 * the row order of the generated ID column so the two paste together line for line.
 *
 * NOTE: this is NOT the tiebreak order. The spec's TIEBREAK_ORDER was inferred from
 * an earlier revision of the sheet and no longer matches it — see spec § 5. Keep the
 * two constants separate; they answer different questions. */
export const SHEET_ORDER = [
  "fear",
  "selfRejection",
  "falseHope",
  "falsePower",
  "emotionalNumbing",
];

/* Two letters throughout, deliberately: a single-letter code for fear would collide
 * with the `F` gender segment when read by eye. */
export const MECHANISM_CODE = {
  selfRejection: "SR",
  emotionalNumbing: "EM",
  falsePower: "FP",
  fear: "FR",
  falseHope: "FH",
};

export const MECHANISM_TO_KEY = {
  selfRejection: "self-rejection",
  emotionalNumbing: "emotional-numbing",
  falsePower: "false-power",
  fear: "fear",
  falseHope: "false-hope",
};

export const GENDER_CODE = { female: "F", male: "M" };

/* Flat outcomes have no mechanism — the whole point is that none stands out (low)
 * or none stands apart (high). Both skip the report and route to a contact link. */
export const FLAT_OUTCOME_CODE = { "flat-low": "LOW", "flat-high": "HIGH" };

/* The text-set number. Alex's current sheet is set 01 ("Default texts"); the prefix
 * leaves room for alternate sets later without renumbering anything. */
export const TEXT_SET = "01";

/* ─── Keys ─── */

/* Build the conclusion-text key from an outcome.
 *
 * Dual keys are DIRECTIONAL — `fear_self-rejection` and `self-rejection_fear` are
 * different texts. The Phase B canonical-ordering fix is deliberately reversed here:
 * it existed because the table only held 10 unordered pairs, and it now holds all 20.
 * The blank-conclusion risk that fix guarded against is covered instead by a
 * completeness test over all 27 keys in every text table. */
export function conclusionKeyFor({ outcome, primary, secondary }) {
  if (outcome === "flat-low" || outcome === "flat-high") return outcome;

  const leading = MECHANISM_TO_KEY[primary];
  if (!leading) throw new Error(`Unknown mechanism: ${primary}`);

  if (outcome === "single") return leading;

  const following = MECHANISM_TO_KEY[secondary];
  if (!following) throw new Error(`Unknown mechanism: ${secondary}`);

  return `${leading}_${following}`;
}

/* ─── IDs ─── */

/* Build the conclusion ID: `{SET}{GENDER}-{MECH}[-{MECH}]`, or `{SET}{GENDER}-LOW|HIGH`.
 *
 *   01F-FR          female, single, fear
 *   01F-SR-FP       female, dual, self-rejection leading, false-power following
 *   01F-FP-SR       female, dual, the reverse — a different text
 *   01M-LOW         male, flat-low
 *
 * Derived from the outcome rather than the sheet row position, so reordering the
 * sheet cannot silently remap an ID onto a different text. */
export function conclusionIdFor(gender, { outcome, primary, secondary }, textSet = TEXT_SET) {
  const genderCode = GENDER_CODE[gender];
  if (!genderCode) throw new Error(`Unknown gender: ${gender}`);

  const prefix = `${textSet}${genderCode}`;

  const flatCode = FLAT_OUTCOME_CODE[outcome];
  if (flatCode) return `${prefix}-${flatCode}`;

  const leading = MECHANISM_CODE[primary];
  if (!leading) throw new Error(`Unknown mechanism: ${primary}`);

  if (outcome === "single") return `${prefix}-${leading}`;

  const following = MECHANISM_CODE[secondary];
  if (!following) throw new Error(`Unknown mechanism: ${secondary}`);

  return `${prefix}-${leading}-${following}`;
}

/* The 27 conclusion keys, in sheet order. Identical for both genders — gender selects
 * which text table to read, not which keys exist.
 *
 * The component builds its text tables from this list rather than hand-listing keys, so
 * a table can never be missing an outcome the engine can produce. That is the guard
 * replacing Phase B's canonical key rewriting. */
export const CONCLUSION_KEYS = [
  "flat-low",
  "flat-high",
  ...SHEET_ORDER.map((mech) => MECHANISM_TO_KEY[mech]),
  ...SHEET_ORDER.flatMap((leading) =>
    SHEET_ORDER.filter((following) => following !== leading).map(
      (following) => `${MECHANISM_TO_KEY[leading]}_${MECHANISM_TO_KEY[following]}`,
    ),
  ),
];

/* ─── Sheet enumeration ─── */

/* Every conclusion row the engine can produce, in Alex's sheet order:
 * per gender — the two flat outcomes, the five singles, then the twenty duals
 * grouped by leading mechanism. 54 rows total. */
export function enumerateConclusionRows(textSet = TEXT_SET) {
  const rows = [];

  for (const gender of ["female", "male"]) {
    const row = (type, outcome, primary, secondary) => ({
      gender,
      type,
      leading: primary ? MECHANISM_TO_KEY[primary] : "",
      following: secondary ? MECHANISM_TO_KEY[secondary] : "",
      leadingMechanism: primary ?? null,
      followingMechanism: secondary ?? null,
      key: conclusionKeyFor({ outcome, primary, secondary }),
      id: conclusionIdFor(gender, { outcome, primary, secondary }, textSet),
    });

    rows.push(row("flat", "flat-low"));
    rows.push(row("flat", "flat-high"));

    for (const mech of SHEET_ORDER) rows.push(row("single", "single", mech));

    for (const leading of SHEET_ORDER) {
      for (const following of SHEET_ORDER) {
        if (leading === following) continue;
        rows.push(row("dual", "dual", leading, following));
      }
    }
  }

  return rows;
}
