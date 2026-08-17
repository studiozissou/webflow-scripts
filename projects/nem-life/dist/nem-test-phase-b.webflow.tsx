/* ─────────────────────────────────────────────────────────────────────────────
 * GENERATED FILE — do not edit here. Paste this whole file into the Webflow
 * custom code component.
 *
 * Regenerate with:  node tools/nem/build-component.js
 *
 * Built from, and edit instead:
 *   projects/nem-life/src/nem-test-phase-b.tsx
 *   projects/nem-life/src/nem-test-conclusion-ids.js
 *   projects/nem-life/src/nem-test-scoring.js
 *
 * The modules are inlined because everything in Webflow runs inside one component,
 * so relative imports cannot resolve. They stay separate in the repo because the
 * unit tests cannot import a .tsx.
 * ───────────────────────────────────────────────────────────────────────────── */

import { declareComponent, useWebflowContext } from "@webflow/react";
import { props as propTypes } from "@webflow/data-types";
import { useState, useMemo, useCallback, useEffect } from "react";

/* ═══ inlined from nem-test-conclusion-ids.js ════════════════════════════════ */

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
const SHEET_ORDER = [
  "fear",
  "selfRejection",
  "falseHope",
  "falsePower",
  "emotionalNumbing",
];

/* Two letters throughout, deliberately: a single-letter code for fear would collide
 * with the `F` gender segment when read by eye. */
const MECHANISM_CODE = {
  selfRejection: "SR",
  emotionalNumbing: "EM",
  falsePower: "FP",
  fear: "FR",
  falseHope: "FH",
};

const MECHANISM_TO_KEY = {
  selfRejection: "self-rejection",
  emotionalNumbing: "emotional-numbing",
  falsePower: "false-power",
  fear: "fear",
  falseHope: "false-hope",
};

const GENDER_CODE = { female: "F", male: "M" };

/* Flat outcomes have no mechanism — the whole point is that none stands out (low)
 * or none stands apart (high). Both skip the report and route to a contact link. */
const FLAT_OUTCOME_CODE = { "flat-low": "LOW", "flat-high": "HIGH" };

/* The text-set number. Alex's current sheet is set 01 ("Default texts"); the prefix
 * leaves room for alternate sets later without renumbering anything. */
const TEXT_SET = "01";

/* ─── Keys ─── */

/* Build the conclusion-text key from an outcome.
 *
 * Dual keys are DIRECTIONAL — `fear_self-rejection` and `self-rejection_fear` are
 * different texts. The Phase B canonical-ordering fix is deliberately reversed here:
 * it existed because the table only held 10 unordered pairs, and it now holds all 20.
 * The blank-conclusion risk that fix guarded against is covered instead by a
 * completeness test over all 27 keys in every text table. */
function conclusionKeyFor({ outcome, primary, secondary }) {
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
function conclusionIdFor(gender, { outcome, primary, secondary }, textSet = TEXT_SET) {
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
const CONCLUSION_KEYS = [
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
function enumerateConclusionRows(textSet = TEXT_SET) {
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

/* ═══ inlined from nem-test-scoring.js ═══════════════════════════════════════ */

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

/* ─── Mechanism mapping ───
 *
 * Question indices are unchanged from Phase B — only the object keys moved from Dutch
 * to English (v2 item 5). The Dutch mechanism *names* remain in the user-facing NL copy;
 * this is a code-identifier change only.
 *
 * `bodyQ` and `situationalQ` are no longer used for tiebreaking (see TIEBREAK_ORDER) but
 * stay because the report prompt still references them, and they may return as a
 * second-level rule. */
const MECHANISM_MAP = {
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
const TIEBREAK_ORDER = [
  "selfRejection",
  "emotionalNumbing",
  "falsePower",
  "fear",
  "falseHope",
];

/* ─── Thresholds ─── */

/* Out of 16 — the average of answering "soms" throughout. Below this, a mechanism is
 * not distinctive enough to name at all, as primary or secondary. */
const MIN_MECHANISM_SCORE = 8;

/* A secondary must sit within this many points of the primary to be named. */
const SECONDARY_GAP = 3;

/* max - min. At or below this, with every mechanism above the floor, the profile is
 * undifferentiated rather than led by anything. */
const FLAT_SPREAD = 3;

/* ─── Scoring engine ─── */

/* Score the answers and resolve which conclusion text to render.
 *
 * `gender` is "female" | "male" — it only affects the conclusion ID, but it is required
 * rather than defaulted so a caller that forgets it fails loudly instead of silently
 * labelling everyone female.
 *
 * Evaluation order matters: flat-low is checked before flat-high, so 7,7,7,7,7 is
 * flat-low (nothing clears the floor) rather than flat-high (nothing stands apart). */
function calculateScores(answers, gender) {
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

/* ═══ nem-test-phase-b.tsx ══════════════════════════════════════════ */

declare global {
  interface Window {
    __nemTestScores?: {
      selfRejection: number;
      emotionalNumbing: number;
      falsePower: number;
      fear: number;
      falseHope: number;
    };
  }
}

/* ─── Scoring engine ───
 * Lives in ./nem-test-scoring.js (mechanism mapping, thresholds, flat detection,
 * fixed-order tiebreak) so it can be unit-tested with `node --test`
 * (tests/nem/nem-test-scoring.test.js). Conclusion keys and IDs live alongside it in
 * ./nem-test-conclusion-ids.js, which also generates Alex's text sheet.
 *
 * ⚠️ DO NOT paste this file into Webflow. Everything in Webflow runs inside one custom
 * code component, so the relative imports below cannot resolve there. Run
 * `npm run build:nem` and paste projects/nem-life/dist/nem-test-phase-b.webflow.tsx,
 * which has the sibling modules inlined. Edit here; never edit the generated file. */

/* ─── Gender normalisation ───
 * The Designer collects Dutch values; the engine and the text sheet speak English. */
const GENDER_TO_TABLE: Record<string, "man" | "vrouw"> = {
  man: "man",
  vrouw: "vrouw",
  male: "man",
  female: "vrouw",
};

const GENDER_TO_ENGINE: Record<string, "male" | "female"> = {
  man: "male",
  vrouw: "female",
  male: "male",
  female: "female",
};

/* ─── Analytics stubs ─── */
const EVENTS = {
  TEST_COMPLETED: "nem_test_completed",
  REPORT_REQUESTED: "nem_report_requested",
};

/* ─── Debug mode ───
 * `?nemdebug=1` renders the conclusion ID, key and scores above the conclusion text, so
 * Alex and Christel can confirm which variant fired without Designer access, and
 * Playwright can assert on it. Replaces the unused `const DEBUG = false`. */
function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nemdebug") === "1";
}

/* ─── Locale detection ─── */
function getLocale(): "nl" | "en" {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/en/")) return "en";
    if (document.documentElement.lang?.startsWith("en")) return "en";
  }
  return "nl";
}

/* ─── Translations ─── */
interface SelectOption {
  value: string;
  label: string;
}

interface GenderedConclusions {
  man: Record<string, string>;
  vrouw: Record<string, string>;
}

interface Translations {
  answers: string[];
  questions: string[];
  progress: (n: number, total: number) => string;
  back: string;
  reassurance: string;
  profileLabel: string;
  profileContinueButton: string;
  conclusionLabel: string;
  bridgeLine: string;
  /* Shown instead of the report CTA on flat-low and flat-high outcomes. */
  flatBridgeLine: string;
  contactUrl: string;
  contactLinkLabel: string;
  optinLabel: string;
  optinIntro: string;
  firstNamePlaceholder: string;
  emailPlaceholder: string;
  relationshipLabel: string;
  relationshipOptions: SelectOption[];
  genderLabel: string;
  genderOptions: SelectOption[];
  ageCategoryLabel: string;
  ageCategoryOptions: SelectOption[];
  consentLabel: string;
  relieveLine: string;
  disclaimer: string;
  submitButtonText: string;
  submittingText: string;
  errors: {
    firstNameEmpty: string;
    emailEmpty: string;
    emailInvalid: string;
    relationshipEmpty: string;
    genderEmpty: string;
    ageCategoryEmpty: string;
    consentRequired: string;
    rateLimited: string;
    generic: string;
  };
  confirmationLabel: string;
  confirmationMain: string;
  confirmationSecondary: string;
  noEmailReceived: string;
  wrongEmail: string;
  wrongEmailLink: string;
  conclusions: GenderedConclusions;
}

/* ─── Conclusion text tables ───
 *
 * Built from CONCLUSION_KEYS rather than hand-listed, so a table can never be missing an
 * outcome the engine can produce. That completeness guarantee is what replaced Phase B's
 * canonical key rewriting — see the v2 spec § 2.
 *
 * Christel's copy goes in the REAL_* overlays. Anything not yet written falls through to
 * a visible placeholder, so a missing text reads as "not written yet" in QA rather than
 * as a blank screen in production. */

type ConclusionTable = Record<string, string>;

function placeholderTable(marker: string, note: string): ConclusionTable {
  return Object.fromEntries(CONCLUSION_KEYS.map((key) => [key, `[${marker}] ${key} — ${note}`]));
}

/* Christel's finished texts. Empty tables are expected: as of 2026-08-17 only the female
 * Dutch column is written (27 of 108), and it has deliberately NOT been loaded here yet.
 * The Drive read path flattens in-cell paragraph breaks to spaces, so pasting from it
 * would silently destroy her paragraphing. Load from a faithful CSV export
 * (File → Download → CSV on NEM_TEST_01_Default_texts), not from a copy-paste. */
const REAL_NL_VROUW: ConclusionTable = {};
const REAL_NL_MAN: ConclusionTable = {};
const REAL_EN_VROUW: ConclusionTable = {};
const REAL_EN_MAN: ConclusionTable = {};

const NL_CONCLUSIONS_MAN: ConclusionTable = {
  ...placeholderTable("DUMMY man", "tekst volgt."),
  ...REAL_NL_MAN,
};

const NL_CONCLUSIONS_VROUW: ConclusionTable = {
  ...placeholderTable("DUMMY vrouw", "tekst volgt."),
  ...REAL_NL_VROUW,
};

const EN_CONCLUSIONS_MAN: ConclusionTable = {
  ...placeholderTable("DUMMY man", "text to follow."),
  ...REAL_EN_MAN,
};

const EN_CONCLUSIONS_VROUW: ConclusionTable = {
  ...placeholderTable("DUMMY vrouw", "text to follow."),
  ...REAL_EN_VROUW,
};

const translations: Record<"nl" | "en", Translations> = {
  nl: {
    answers: ["nooit", "zelden", "soms", "regelmatig", "heel vaak"],
    questions: [
      "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed.",
      "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt.",
      "Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is.",
      "Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen.",
      "Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen.",
      "Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken.",
      "Als ik moe of overweldigd ben, zegt iets in mij: \"Ik kan dit niet aan.\"",
      "Mijn standaardreactie als er iets gebeurt is: \"Maakt niet uit, het komt wel goed.\"",
      "Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin.",
      "Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan.",
      "Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden.",
      "Ik denk vaak: \"Als ik dit nou maar goed doe, dan komt het wel goed.\"",
      "In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven.",
      "Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen.",
      "In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil.",
      "Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden.",
      "Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar.",
      "Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak.",
      "Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat.",
      "Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt.",
    ],
    progress: (n, total) => `Vraag ${n} van ${total}`,
    back: "← Terug",
    reassurance: "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
    profileLabel: "Nog even over jou",
    profileContinueButton: "Ga verder",
    conclusionLabel: "Jouw uitkomst",
    bridgeLine:
      "Wil je begrijpen waar dit vandaan komt en wat het jou kost? Je persoonlijke rapport gaat daar dieper op in.",
    flatBridgeLine:
      "Een persoonlijk rapport past hier niet — dat wordt opgebouwd rond één duidelijke reactie. Een gesprek past wel.",
    contactUrl: "/contact",
    contactLinkLabel: "Neem contact met ons op",
    optinLabel: "Waar sturen we jouw rapport naartoe?",
    optinIntro:
      "Vul hieronder je gegevens in. Je ontvangt het binnen enkele minuten in je inbox.",
    firstNamePlaceholder: "Voornaam",
    emailPlaceholder: "E-mailadres",
    relationshipLabel: "Je relatiestatus",
    relationshipOptions: [
      { value: "", label: "Selecteer..." },
      { value: "alleenstaand", label: "Alleenstaand" },
      { value: "in-een-relatie", label: "In een relatie" },
      { value: "gescheiden", label: "Gescheiden" },
      { value: "anders", label: "Anders" },
    ],
    genderLabel: "Geslacht",
    genderOptions: [
      { value: "", label: "Selecteer..." },
      { value: "man", label: "Man" },
      { value: "vrouw", label: "Vrouw" },
    ],
    ageCategoryLabel: "Leeftijdscategorie",
    ageCategoryOptions: [
      { value: "", label: "Selecteer..." },
      { value: "18-30", label: "18-30" },
      { value: "31-40", label: "31-40" },
      { value: "41-50", label: "41-50" },
      { value: "51-60", label: "51-60" },
      { value: "60+", label: "60+" },
    ],
    consentLabel:
      "Je wordt toegevoegd aan NEM Matters - de nieuwsbrief van NEM Life. Je kunt je altijd afmelden.",
    relieveLine: "Geen spam & je gegevens blijven veilig. Natuurlijk.",
    disclaimer:
      "Dit rapport is geen psychologische diagnose. Het is een spiegel op basis van jouw antwoorden - bedoeld als beginpunt voor reflectie, niet als eindoordeel.",
    submitButtonText: "Ontvang mijn rapport",
    submittingText: "Verzenden...",
    errors: {
      firstNameEmpty: "Vul je voornaam in",
      emailEmpty: "Vul je e-mailadres in",
      emailInvalid: "Voer een geldig e-mailadres in",
      relationshipEmpty: "Selecteer je relatiestatus",
      genderEmpty: "Selecteer je geslacht",
      ageCategoryEmpty: "Selecteer je leeftijdscategorie",
      consentRequired: "Bevestig je aanmelding voor NEM Matters",
      rateLimited: "Probeer het later opnieuw",
      generic: "Er ging iets mis. Probeer het opnieuw.",
    },
    confirmationLabel: "Nog één stap",
    confirmationMain:
      "Je antwoorden zijn opgeslagen. Zodra je je e-mailadres bevestigt, stellen we jouw persoonlijke rapport samen en sturen we het naar je inbox.",
    confirmationSecondary:
      "Controleer je inbox - je ontvangt direct een mail van NEM Life. Klik op de bevestigingslink daarin en je rapport is onderweg.",
    noEmailReceived: "Geen mail ontvangen? Controleer je spamfolder.",
    wrongEmail: "Verkeerd e-mailadres opgegeven?",
    wrongEmailLink: "Vul het opnieuw in.",
    conclusions: {
      man: NL_CONCLUSIONS_MAN,
      vrouw: NL_CONCLUSIONS_VROUW,
    },
  },
  en: {
    answers: ["never", "rarely", "sometimes", "regularly", "very often"],
    questions: [
      "After a conversation that didn't go well, I keep replaying what I did wrong for hours or days.",
      "When something goes wrong in a relationship or at work, I'm the first to think it's my fault.",
      "I postpone decisions or things I actually want to do longer than makes sense.",
      "I catch myself judging how others do things harshly.",
      "I avoid situations that create tension, even when I actually want to participate.",
      "I keep trying to control something or someone, even when I know it won't work.",
      "When I'm tired or overwhelmed, something inside me says: \"I can't handle this.\"",
      "My default reaction when something happens is: \"Doesn't matter, it'll be fine.\"",
      "When someone does something that affects me, I quickly experience it as a personal attack and react strongly.",
      "With something new or unknown, my mind immediately goes to what could go wrong.",
      "I feel a drive in my body — rushed, high, I can't sit still when something still needs to be resolved.",
      "I often think: \"If I just do this right, everything will be fine.\"",
      "In situations that should affect me, I barely notice anything in my body — as if I'm watching my own life from a distance.",
      "The moment I feel attacked, I feel my body tense up — my jaw, my shoulders, my fists, as if I need to defend myself immediately.",
      "In tense situations, I feel my body recoil — a cramping, the feeling that I want to get away.",
      "When the atmosphere threatens to shift, I try extra hard and adjust to keep things good.",
      "When something goes wrong, I feel myself sinking — my energy disappears and everything becomes heavy.",
      "When others around me react strongly to an emotional event, I often remain flat inside.",
      "When someone close doesn't do what I want, I feel irritation or anger that won't go away.",
      "When I need to do something that's good for me but scares me, I often choose what feels safe.",
    ],
    progress: (n, total) => `Question ${n} of ${total}`,
    back: "← Back",
    reassurance: "Choose what feels most like you — there's no right or wrong answer.",
    profileLabel: "A little about you",
    profileContinueButton: "Continue",
    conclusionLabel: "Your outcome",
    bridgeLine:
      "Want to understand where this comes from and what it costs you? Your personal report goes deeper.",
    flatBridgeLine:
      "A personal report does not fit here — it is built around one clear response. A conversation does.",
    contactUrl: "/en/contact",
    contactLinkLabel: "Get in touch",
    optinLabel: "Where should we send your report?",
    optinIntro:
      "Fill in your details below. You'll receive it in your inbox within minutes.",
    firstNamePlaceholder: "First name",
    emailPlaceholder: "Email address",
    relationshipLabel: "Relationship status",
    relationshipOptions: [
      { value: "", label: "Select..." },
      { value: "alleenstaand", label: "Single" },
      { value: "in-een-relatie", label: "In a relationship" },
      { value: "gescheiden", label: "Divorced" },
      { value: "anders", label: "Other" },
    ],
    genderLabel: "Gender",
    genderOptions: [
      { value: "", label: "Select..." },
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
    ageCategoryLabel: "Age category",
    ageCategoryOptions: [
      { value: "", label: "Select..." },
      { value: "18-30", label: "18-30" },
      { value: "31-40", label: "31-40" },
      { value: "41-50", label: "41-50" },
      { value: "51-60", label: "51-60" },
      { value: "60+", label: "60+" },
    ],
    consentLabel:
      "You'll be added to NEM Matters — the NEM Life newsletter. You can unsubscribe at any time.",
    relieveLine: "No spam & your data stays safe. Of course.",
    disclaimer:
      "This report is not a psychological diagnosis. It's a mirror based on your answers — meant as a starting point for reflection, not a final verdict.",
    submitButtonText: "Get my report",
    submittingText: "Submitting...",
    errors: {
      firstNameEmpty: "Enter your first name",
      emailEmpty: "Enter your email address",
      emailInvalid: "Enter a valid email address",
      relationshipEmpty: "Select your relationship status",
      genderEmpty: "Select your gender",
      ageCategoryEmpty: "Select your age category",
      consentRequired: "Confirm your NEM Matters subscription",
      rateLimited: "Please try again later",
      generic: "Something went wrong. Please try again.",
    },
    confirmationLabel: "One more step",
    confirmationMain:
      "Your answers have been saved. Once you confirm your email address, we'll compile your personal report and send it to your inbox.",
    confirmationSecondary:
      "Check your inbox — you'll receive an email from NEM Life right away. Click the confirmation link and your report is on its way.",
    noEmailReceived: "No email received? Check your spam folder.",
    wrongEmail: "Entered the wrong email?",
    wrongEmailLink: "Fill it in again.",
    conclusions: {
      man: EN_CONCLUSIONS_MAN,
      vrouw: EN_CONCLUSIONS_VROUW,
    },
  },
};

/* ─── Fonts ─── */
const fontLink = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Lato:wght@400;700&display=swap');`;

/* ─── Shared styles ─── */
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 8,
  borderWidth: "1.5px",
  borderStyle: "solid",
  borderColor: "var(--_token---accent-light-grey, #ecebe8)",
  backgroundColor: "white",
  fontFamily: "'Lato', sans-serif",
  fontSize: "var(--_typography---paragraph--standard, 1rem)",
  color: "var(--_token---text-main, #292828)",
  outline: "none",
  boxSizing: "border-box" as const,
};

const fieldErrorStyle: React.CSSProperties = {
  ...fieldStyle,
  borderColor: "#e53e3e",
};

const selectFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239f9c8b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: "40px",
};

const selectFieldErrorStyle: React.CSSProperties = {
  ...selectFieldStyle,
  borderColor: "#e53e3e",
};

const focusRing = "0 0 0 2px var(--_token---accent-main, #fafa7d)";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: "var(--_typography---paragraph--small, 0.875rem)",
  fontWeight: 600,
  color: "var(--_token---text-olive, #706d56)",
  marginBottom: 6,
};

const pillButtonStyle: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: "1rem",
  padding: "16px 32px",
  background: "var(--_token---accent-main, #fafa7d)",
  color: "var(--_token---text-main, #292828)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  transition: "all 0.15s ease",
  width: "100%",
};

/* ─── Component ─── */
function Quiz({
  submitWebhookUrl,
  reassuranceText,
  ctaButtonText,
  contactUrl,
  contactLinkLabel,
  question1, question2, question3, question4, question5,
  question6, question7, question8, question9, question10,
  question11, question12, question13, question14, question15,
  question16, question17, question18, question19, question20,
}: {
  submitWebhookUrl: string;
  reassuranceText: string;
  ctaButtonText: string;
  contactUrl: string;
  contactLinkLabel: string;
  question1: string; question2: string; question3: string; question4: string; question5: string;
  question6: string; question7: string; question8: string; question9: string; question10: string;
  question11: string; question12: string; question13: string; question14: string; question15: string;
  question16: string; question17: string; question18: string; question19: string; question20: string;
}) {
  const { interactive } = useWebflowContext();
  const locale = getLocale();
  const t = translations[locale];

  // Webflow code-component props are NOT localizable — a prop holds one value
  // across every locale (its Dutch default). So the Designer props are honoured
  // only on the primary NL locale; every other locale uses the code translations.
  const questions = useMemo(
    () => [
      question1, question2, question3, question4, question5,
      question6, question7, question8, question9, question10,
      question11, question12, question13, question14, question15,
      question16, question17, question18, question19, question20,
    ].map((propText, i) => (locale === "nl" ? propText || t.questions[i] : t.questions[i])),
    [locale, question1, question2, question3, question4, question5,
     question6, question7, question8, question9, question10,
     question11, question12, question13, question14, question15,
     question16, question17, question18, question19, question20, t.questions]
  );

  // Same rule for the two marketing-copy props (reassurance line + CTA label):
  // prop override on NL, code translation elsewhere.
  const reassurance = locale === "nl" ? (reassuranceText || t.reassurance) : t.reassurance;
  const ctaLabel = (locale === "nl" ? ctaButtonText : "") || t.submitButtonText;

  /* ─── Reduced-motion detection ───
     Note: the answer-pill responsive layout (row on desktop, column on mobile)
     is handled purely in CSS via the `.nem-answers` media query below — NOT a
     JS `isMobile` flag. Webflow server-renders the component with `window`
     undefined, so a JS breakpoint check is stale on a direct mobile load and
     the pills stayed in the desktop row. CSS media queries are immune to that. */
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  /* ─── State ─── */
  const [phase, setPhase] = useState<"quiz" | "profile" | "conclusion" | "optin" | "confirmation">(
    !interactive ? "conclusion" : "quiz"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(20).fill(null));
  const [animating, setAnimating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [gender, setGender] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [nemMattersConsent, setNemMattersConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState(() => crypto.randomUUID());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [debugMode] = useState(isDebugMode);

  /* ─── Answer selection ─── */
  const selectAnswer = useCallback(
    (answerIndex: number) => {
      const updatedAnswers = answers.map((a, i) => (i === currentStep ? answerIndex : a));
      setAnswers(updatedAnswers);

      const fadeDelay = prefersReducedMotion ? 0 : 200;
      const fadeDuration = prefersReducedMotion ? 0 : 300;

      setTimeout(() => {
        setAnimating(true);
        setTimeout(() => {
          if (currentStep < 19) {
            setCurrentStep((s) => s + 1);
          } else {
            /* Scoring is NOT computed here. v2 conclusion IDs are gender-scoped, and
             * gender is collected on the profile screen that comes next — so the result
             * is derived (see `result` below) once both answers and gender exist. */
            setPhase("profile"); // → profile screen, then conclusion
          }
          setAnimating(false);
        }, fadeDuration);
      }, fadeDelay);
    },
    [answers, currentStep, prefersReducedMotion]
  );

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  /* ─── Profile continue handler ─── */
  /* ─── Derived: the conclusion outcome ───
   *
   * Computed from answers + gender rather than stored, so it cannot go stale if either
   * changes. Gender is only known after the profile screen, which is why this is not
   * resolved when the last question is answered.
   *
   * Declared above handleSubmit deliberately: that callback closes over `result` and
   * lists it as a dependency, so the binding must exist first.
   *
   * Falls back to "male" for the engine when gender is not yet set. The outcome is only
   * ever read after the profile screen has validated gender, so the fallback keeps the
   * hook total and unconditional rather than labelling anyone. */
  const result = useMemo(
    () => calculateScores(answers, GENDER_TO_ENGINE[gender] || "male"),
    [answers, gender]
  );

  const handleProfileContinue = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!gender) errors.gender = t.errors.genderEmpty;
    if (!ageCategory) errors.ageCategory = t.errors.ageCategoryEmpty;
    if (!relationshipStatus) errors.relationshipStatus = t.errors.relationshipEmpty;

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, gender: "", ageCategory: "", relationshipStatus: "" }));
    setPhase("conclusion");
  }, [gender, ageCategory, relationshipStatus, t.errors]);

  /* ─── Form submission (opt-in: name + email + consent only) ─── */
  const handleSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t.errors.firstNameEmpty;
    if (!email.trim()) {
      errors.email = t.errors.emailEmpty;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t.errors.emailInvalid;
    }
    if (!nemMattersConsent) errors.consent = t.errors.consentRequired;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Honeypot check
    if (honeypot) {
      setPhase("confirmation");
      return;
    }

    setSubmitting(true);

    const payload = {
      token,
      locale,
      firstName: firstName.trim(),
      email: email.trim(),
      relationshipStatus,
      gender,
      ageCategory,
      honeypot: "",
      scores: {
        selfRejection: result.scores.selfRejection,
        emotionalNumbing: result.scores.emotionalNumbing,
        falsePower: result.scores.falsePower,
        fear: result.scores.fear,
        falseHope: result.scores.falseHope,
      },
      primaryMechanism: result.primary,
      secondaryMechanism: result.secondary,
      /* v2: the report engine sees exactly the outcome the user saw, so a report can
       * never be written against a different conclusion than the one on screen. */
      outcome: result.outcome,
      conclusionKey: result.conclusionKey,
      conclusionId: result.conclusionId,
      totalScore: result.totalScore,
      nemMattersConsent,
      timestamp: new Date().toISOString(),
    };

    if (submitWebhookUrl) {
      try {
        const res = await fetch(submitWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.status === "rate_limited") {
          setFieldErrors({ generic: t.errors.rateLimited });
          setSubmitting(false);
          return;
        }
      } catch {
        setFieldErrors({ generic: t.errors.generic });
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setPhase("confirmation");
    // window.dataLayer?.push({ event: EVENTS.REPORT_REQUESTED, locale });
  }, [firstName, email, nemMattersConsent, honeypot, result, token, locale, submitWebhookUrl, t.errors, relationshipStatus, gender, ageCategory]);

  /* ─── Go back to optin (from confirmation, for wrong email) ─── */
  const goBackToOptin = useCallback(() => {
    setEmail("");
    setToken(crypto.randomUUID());
    setNemMattersConsent(false);
    setFieldErrors({});
    setSubmitting(false);
    setPhase("optin");
  }, []);

  const genderKey = GENDER_TO_TABLE[gender] || "man";
  const conclusionText =
    t.conclusions[genderKey as keyof GenderedConclusions]?.[result.conclusionKey] || "";

  /* Flat outcomes route to a contact link instead of the opt-in: the report is built
   * around one clear mechanism, which is precisely what a flat profile lacks. */
  const isFlatOutcome = result.skipsReport;

  /* Same pattern as ctaLabel: the Designer prop is honoured on NL only, because Webflow
   * code-component props are not localizable. EN falls back to the code translation. */
  const contactHref = (locale === "nl" ? contactUrl : "") || t.contactUrl;
  const contactLabel = (locale === "nl" ? contactLinkLabel : "") || t.contactLinkLabel;

  /* Publish scores for page-level analytics. In an effect, not in render — assigning to
   * window during render is a side effect and would fire on every re-render. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__nemTestScores = {
      selfRejection: result.scores.selfRejection,
      emotionalNumbing: result.scores.emotionalNumbing,
      falsePower: result.scores.falsePower,
      fear: result.scores.fear,
      falseHope: result.scores.falseHope,
    };
  }, [result]);

  return (
    <div
      data-element="quiz-module"
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "var(--_gaps---content-half, 1.5rem)",
        fontFamily: "'Lato', sans-serif",
        color: "var(--_token---text-main, #292828)",
        backgroundColor: "var(--_token---bg-main, white)",
        borderRadius: "0.625rem",
        boxShadow: "0 2px 12px rgba(41, 40, 40, 0.06), 0 1px 4px rgba(41, 40, 40, 0.03)",
      }}
      className="w-full"
    >
      <style>{fontLink}</style>
      <style>{`
        .quiz-fade-in { animation: quizFadeIn 0.4s ease-out forwards; }
        .quiz-fade-out { animation: quizFadeOut 0.3s ease-in forwards; }
        .quiz-slide-up { animation: quizSlideUp 0.5s ease-out forwards; }
        .quiz-scale-in { animation: quizScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes quizFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes quizFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-12px); } }
        @keyframes quizSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes quizScaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .quiz-fade-in, .quiz-fade-out, .quiz-slide-up, .quiz-scale-in { animation: none; }
        }
        .nem-answers { display: flex; gap: 12px; flex-wrap: nowrap; }
        @media (max-width: 768px) {
          .nem-answers { flex-direction: column; }
          .nem-answers > button { width: 100%; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════
          QUIZ — Q1–Q20
      ═══════════════════════════════════════════ */}
      {phase === "quiz" && (
        <div
          key={currentStep}
          className={animating ? "quiz-fade-out" : "quiz-fade-in"}
        >
          {/* Step indicator */}
          <div
            className="flex items-center justify-between mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span
              aria-live="polite"
              style={{
                fontSize: "var(--_typography---paragraph--small, 0.875rem)",
                fontWeight: 600,
                color: "var(--_token---accent-grey, #9f9c8b)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.progress(currentStep + 1, 20)}
            </span>
            {currentStep > 0 && (
              <button
                data-element="back-button"
                onClick={goBack}
                aria-label={t.back}
                style={{
                  fontSize: "var(--_typography---paragraph--small, 0.875rem)",
                  fontWeight: 500,
                  color: "var(--_token---text-olive, #706d56)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                ←
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 8,
              background: "rgba(0,0,0,0.1)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((currentStep + 1) / 20) * 100}%`,
                background: "var(--_token---text-olive, #706d56)",
                borderRadius: 4,
                transition: prefersReducedMotion ? "none" : "width 0.4s ease",
              }}
            />
          </div>

          {/* Question */}
          <h3
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: "var(--_typography---paragraph--big, 1.25rem)",
              lineHeight: 1.3,
              color: "var(--_token---text-main, #292828)",
              margin: "0 0 12px 0",
              textAlign: "left",
            }}
          >
            {questions[currentStep]}
          </h3>

          {/* Reassurance text — only on Q1 */}
          {currentStep === 0 && reassurance && (
            <p
              style={{
                color: "var(--_token---text-olive)",
                fontSize: 14,
                lineHeight: 1.5,
                margin: "0 0 28px 0",
                fontStyle: "italic",
              }}
            >
              {reassurance}
            </p>
          )}
          {currentStep > 0 && <div style={{ marginBottom: 28 }} />}

          {/* Answer pill buttons — layout via .nem-answers CSS (row desktop / column mobile) */}
          <div className="nem-answers">
            {t.answers.map((label, i) => {
              const isSelected = answers[currentStep] === i;
              return (
                <button
                  key={i}
                  aria-selected={isSelected}
                  onClick={() => selectAnswer(i)}
                  style={{
                    borderRadius: 999,
                    padding: "12px 24px",
                    borderWidth: "1.5px",
                    borderStyle: "solid",
                    borderColor: isSelected
                      ? "var(--_token---accent-main, #fafa7d)"
                      : "var(--_token---accent-light-grey, #ecebe8)",
                    backgroundColor: isSelected
                      ? "var(--_token---accent-main, #fafa7d)"
                      : "white",
                    color: "var(--_token---text-main, #292828)",
                    cursor: "pointer",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "var(--_typography---paragraph--standard, 1rem)",
                    transition: prefersReducedMotion ? "none" : "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "var(--_token---accent-main, #fafa7d)";
                      e.currentTarget.style.backgroundColor =
                        "color-mix(in srgb, var(--_token---accent-main, #fafa7d) 20%, white)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "var(--_token---accent-light-grey, #ecebe8)";
                      e.currentTarget.style.backgroundColor = "white";
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PROFILE — Gender, Age, Relationship
      ═══════════════════════════════════════════ */}
      {phase === "profile" && (
        <div className="quiz-fade-in flex flex-col gap-6">
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 24,
              lineHeight: 1.2,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
            className="max-[480px]:text-[20px]"
          >
            {t.profileLabel}
          </h2>

          <div className="flex flex-col gap-4">
            {/* Gender */}
            <div>
              <label htmlFor="nem-gender" style={labelStyle}>
                {t.genderLabel}
              </label>
              <select
                id="nem-gender"
                data-field="gender"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (fieldErrors.gender) setFieldErrors((p) => ({ ...p, gender: "" }));
                }}
                onBlur={() => {
                  if (!gender) setFieldErrors((p) => ({ ...p, gender: t.errors.genderEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.gender}
                aria-describedby={fieldErrors.gender ? "error-gender" : undefined}
                style={{
                  ...(fieldErrors.gender ? selectFieldErrorStyle : selectFieldStyle),
                  color: gender ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.gender && (
                <div id="error-gender" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.gender}
                </div>
              )}
            </div>

            {/* Age category */}
            <div>
              <label htmlFor="nem-age" style={labelStyle}>
                {t.ageCategoryLabel}
              </label>
              <select
                id="nem-age"
                data-field="age-category"
                value={ageCategory}
                onChange={(e) => {
                  setAgeCategory(e.target.value);
                  if (fieldErrors.ageCategory) setFieldErrors((p) => ({ ...p, ageCategory: "" }));
                }}
                onBlur={() => {
                  if (!ageCategory) setFieldErrors((p) => ({ ...p, ageCategory: t.errors.ageCategoryEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.ageCategory}
                aria-describedby={fieldErrors.ageCategory ? "error-ageCategory" : undefined}
                style={{
                  ...(fieldErrors.ageCategory ? selectFieldErrorStyle : selectFieldStyle),
                  color: ageCategory ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.ageCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.ageCategory && (
                <div id="error-ageCategory" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.ageCategory}
                </div>
              )}
            </div>

            {/* Relationship status */}
            <div>
              <label htmlFor="nem-relationship" style={labelStyle}>
                {t.relationshipLabel}
              </label>
              <select
                id="nem-relationship"
                data-field="relationship-status"
                value={relationshipStatus}
                onChange={(e) => {
                  setRelationshipStatus(e.target.value);
                  if (fieldErrors.relationshipStatus) setFieldErrors((p) => ({ ...p, relationshipStatus: "" }));
                }}
                onBlur={() => {
                  if (!relationshipStatus) setFieldErrors((p) => ({ ...p, relationshipStatus: t.errors.relationshipEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.relationshipStatus}
                aria-describedby={fieldErrors.relationshipStatus ? "error-relationship" : undefined}
                style={{
                  ...(fieldErrors.relationshipStatus ? selectFieldErrorStyle : selectFieldStyle),
                  color: relationshipStatus ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.relationshipOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.relationshipStatus && (
                <div id="error-relationship" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.relationshipStatus}
                </div>
              )}
            </div>

            {/* Continue button */}
            <button
              onClick={handleProfileContinue}
              style={pillButtonStyle}
              onMouseEnter={(e) => {
                if (!prefersReducedMotion) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {t.profileContinueButton}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CONCLUSION
      ═══════════════════════════════════════════ */}
      {phase === "conclusion" && (
        <div className="quiz-slide-up flex flex-col gap-6">
          {/* Label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--_token---text-olive, #706d56)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t.conclusionLabel}
          </span>

          {/* Debug badge (?nemdebug=1). QA scaffolding, not content — absent from the DOM
              entirely when off, so it can never leak to a real user via CSS. */}
          {debugMode && (
            <code
              data-element="conclusion-debug"
              aria-hidden="true"
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
                padding: "0.5rem 0.75rem",
                background: "#f4f3ef",
                border: "1px solid #d8d5c8",
                borderRadius: 4,
                color: "#292828",
                wordBreak: "break-word",
              }}
            >
              {result.conclusionId} · {result.conclusionKey} ·{" "}
              {["selfRejection", "emotionalNumbing", "falsePower", "fear", "falseHope"]
                .map((m) => `${m} ${result.scores[m as keyof typeof result.scores]}`)
                .join(" ")}{" "}
              · {result.outcome}
            </code>
          )}

          {/* Conclusion text (gender-differentiated) */}
          <p
            data-element="conclusion-text"
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {conclusionText}
          </p>

          {/* Bridge line — flat outcomes get a different one, because there is no report
              to bridge to. */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {isFlatOutcome ? t.flatBridgeLine : t.bridgeLine}
          </p>

          {/* Flat outcomes route to contact and stop here: no opt-in, no report. The
              report is built around one clear mechanism, which is what these lack.
              A plain anchor, deliberately — an embedded form is a future nice-to-have. */}
          {isFlatOutcome ? (
            <a
              data-element="conclusion-contact-link"
              href={contactHref}
              style={{
                ...pillButtonStyle,
                display: "inline-block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              {contactLabel}
            </a>
          ) : (
            <button
              onClick={() => setPhase("optin")}
              style={pillButtonStyle}
              onMouseEnter={(e) => {
                if (!prefersReducedMotion) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          OPT-IN FORM (name + email + consent only)
      ═══════════════════════════════════════════ */}
      {phase === "optin" && (
        <div className="quiz-fade-in flex flex-col gap-6">
          <div>
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                fontSize: 24,
                lineHeight: 1.2,
                color: "var(--_token---text-main, #292828)",
                margin: "0 0 4px 0",
              }}
              className="max-[480px]:text-[20px]"
            >
              {t.optinLabel}
            </h2>
            <p
              style={{
                color: "var(--_token---text-olive, #706d56)",
                fontSize: 15,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {t.optinIntro}
            </p>
          </div>

          {/* Generic error */}
          {fieldErrors.generic && (
            <div aria-live="polite" style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
              {fieldErrors.generic}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* First name */}
            <div>
              <input
                type="text"
                placeholder={t.firstNamePlaceholder}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: "" }));
                }}
                onBlur={() => {
                  if (!firstName.trim()) setFieldErrors((p) => ({ ...p, firstName: t.errors.firstNameEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? "error-firstName" : undefined}
                style={fieldErrors.firstName ? fieldErrorStyle : fieldStyle}
              />
              {fieldErrors.firstName && (
                <div id="error-firstName" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.firstName}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                }}
                onBlur={() => {
                  if (!email.trim()) {
                    setFieldErrors((p) => ({ ...p, email: t.errors.emailEmpty }));
                  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setFieldErrors((p) => ({ ...p, email: t.errors.emailInvalid }));
                  }
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "error-email" : undefined}
                style={fieldErrors.email ? fieldErrorStyle : fieldStyle}
              />
              {fieldErrors.email && (
                <div id="error-email" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* Honeypot */}
            <div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
              <input
                type="text"
                data-field="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Consent checkbox */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={nemMattersConsent}
                  onChange={(e) => {
                    setNemMattersConsent(e.target.checked);
                    if (fieldErrors.consent) setFieldErrors((p) => ({ ...p, consent: "" }));
                  }}
                  style={{
                    marginTop: 3,
                    accentColor: "var(--_token---text-olive, #706d56)",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--_token---text-olive, #706d56)" }}>
                  {t.consentLabel}
                </span>
              </label>
              {fieldErrors.consent && (
                <div style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.consent}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              disabled={!nemMattersConsent || submitting}
              onClick={handleSubmit}
              style={{
                ...pillButtonStyle,
                backgroundColor: nemMattersConsent
                  ? "var(--_token---accent-main, #fafa7d)"
                  : "var(--_token---accent-light-grey, #ecebe8)",
                cursor: nemMattersConsent && !submitting ? "pointer" : "not-allowed",
                opacity: submitting ? 0.6 : 1,
                transition: prefersReducedMotion ? "none" : "all 0.15s ease",
                pointerEvents: submitting ? "none" : "auto",
              }}
            >
              {submitting ? "..." : ctaLabel}
            </button>

            {/* Relieve line */}
            <p style={{ fontSize: "0.875rem", color: "var(--_token---text-olive, #706d56)", textAlign: "center", margin: 0 }}>
              {t.relieveLine}
            </p>

            {/* Disclaimer intentionally omitted here — it already appears once on
                the landing page below the module; rendering it again produced a
                visible duplicate. `t.disclaimer` is kept for potential future use. */}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CONFIRMATION
      ═══════════════════════════════════════════ */}
      {phase === "confirmation" && (
        <div className="quiz-scale-in flex flex-col gap-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
          {/* Label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--_token---text-olive, #706d56)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t.confirmationLabel}
          </span>

          {/* Main text */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {t.confirmationMain}
          </p>

          {/* Secondary text */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {t.confirmationSecondary}
          </p>

          {/* No email received */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--_token---accent-grey, #9f9c8b)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t.noEmailReceived}
          </p>

          {/* Wrong email correction */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--_token---accent-grey, #9f9c8b)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t.wrongEmail}{" "}
            <button
              onClick={goBackToOptin}
              style={{
                background: "none",
                border: "none",
                color: "var(--_token---text-main, #292828)",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontSize: "0.875rem",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              {t.wrongEmailLink}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default declareComponent(Quiz, {
  name: "NEM Test Phase B",
  description:
    "NEM emotional pattern quiz: 20 questions → profile → gender-differentiated conclusion → opt-in → confirmation.",
  group: "Interactive",
  props: {
    submitWebhookUrl: propTypes.Text({
      name: "Submit Webhook URL",
      defaultValue: "https://reus.app.n8n.cloud/webhook/nem-submit",
    }),
    reassuranceText: propTypes.Text({
      name: "Reassurance Text",
      defaultValue:
        "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
    }),
    ctaButtonText: propTypes.Text({
      name: "CTA Button Text",
      defaultValue: "Ontvang mijn rapport",
    }),
    /* Flat-low and flat-high outcomes route here instead of to the report.
       ⚠️ Verify both URLs against the live site — they are assumed, not confirmed. */
    contactUrl: propTypes.Text({
      name: "Contact URL (flat outcomes)",
      defaultValue: "/contact",
    }),
    contactLinkLabel: propTypes.Text({
      name: "Contact Link Label (flat outcomes)",
      defaultValue: "Neem contact met ons op",
    }),
    question1: propTypes.Text({ name: "Question 1", defaultValue: "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed." }),
    question2: propTypes.Text({ name: "Question 2", defaultValue: "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt." }),
    question3: propTypes.Text({ name: "Question 3", defaultValue: "Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is." }),
    question4: propTypes.Text({ name: "Question 4", defaultValue: "Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen." }),
    question5: propTypes.Text({ name: "Question 5", defaultValue: "Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen." }),
    question6: propTypes.Text({ name: "Question 6", defaultValue: "Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken." }),
    question7: propTypes.Text({ name: "Question 7", defaultValue: "Als ik moe of overweldigd ben, zegt iets in mij: \"Ik kan dit niet aan.\"" }),
    question8: propTypes.Text({ name: "Question 8", defaultValue: "Mijn standaardreactie als er iets gebeurt is: \"Maakt niet uit, het komt wel goed.\"" }),
    question9: propTypes.Text({ name: "Question 9", defaultValue: "Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin." }),
    question10: propTypes.Text({ name: "Question 10", defaultValue: "Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan." }),
    question11: propTypes.Text({ name: "Question 11", defaultValue: "Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden." }),
    question12: propTypes.Text({ name: "Question 12", defaultValue: "Ik denk vaak: \"Als ik dit nou maar goed doe, dan komt het wel goed.\"" }),
    question13: propTypes.Text({ name: "Question 13", defaultValue: "In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven." }),
    question14: propTypes.Text({ name: "Question 14", defaultValue: "Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen." }),
    question15: propTypes.Text({ name: "Question 15", defaultValue: "In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil." }),
    question16: propTypes.Text({ name: "Question 16", defaultValue: "Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden." }),
    question17: propTypes.Text({ name: "Question 17", defaultValue: "Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar." }),
    question18: propTypes.Text({ name: "Question 18", defaultValue: "Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak." }),
    question19: propTypes.Text({ name: "Question 19", defaultValue: "Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat." }),
    question20: propTypes.Text({ name: "Question 20", defaultValue: "Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt." }),
  },
});
