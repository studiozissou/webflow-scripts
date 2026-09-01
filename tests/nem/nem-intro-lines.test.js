/* Unit tests for the report intro lines — spec § 5 of
 * nem-report-json-and-error-visibility.
 *
 * The one asymmetry against the conclusion texts, and the whole reason this file exists:
 * conclusion texts are looked up on key + gender, intro lines on KEY ALONE. Every guard
 * below defends that, or defends "25 lines, not 26".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  INTRO_LINE_KEYS,
  CONCLUSION_KEYS,
  introLineIdFor,
  enumerateIntroLineRows,
} from "../../projects/nem-life/src/nem-test-conclusion-ids.js";
import { readIntroRows, buildIntroLinesModule } from "../../tools/nem/build-conclusion-texts.js";

/* ─── Helpers ─── */

function writeCsv(body) {
  const dir = mkdtempSync(join(tmpdir(), "nem-intro-"));
  const path = join(dir, "nem-intro-lines.csv");
  writeFileSync(path, body, "utf8");
  return path;
}

const HEADER = "key,ID,intro (NL),intro (EN)\n";

/* ─── The 25 keys ─── */

test("there are exactly 25 intro-line keys, not 26", () => {
  assert.equal(INTRO_LINE_KEYS.length, 25);
});

test("both flat outcomes are excluded — they route to the contact link with no report", () => {
  assert.ok(!INTRO_LINE_KEYS.includes("flat-low"));
  assert.ok(!INTRO_LINE_KEYS.includes("flat-high"));
});

test("the keys are the 27 conclusion keys minus the two flat outcomes", () => {
  const expected = CONCLUSION_KEYS.filter((k) => k !== "flat-low" && k !== "flat-high");
  assert.deepEqual(INTRO_LINE_KEYS, expected);
});

test("5 single mechanisms and 20 directional duals", () => {
  const singles = INTRO_LINE_KEYS.filter((k) => !k.includes("_"));
  const duals = INTRO_LINE_KEYS.filter((k) => k.includes("_"));
  assert.equal(singles.length, 5);
  assert.equal(duals.length, 20);
});

test("duals are directional — both orderings of a pair are present and distinct", () => {
  assert.ok(INTRO_LINE_KEYS.includes("fear_self-rejection"));
  assert.ok(INTRO_LINE_KEYS.includes("self-rejection_fear"));
});

/* ─── Reading the CSV ─── */

test("reads key-only rows, keeping NL and EN separate", () => {
  const path = writeCsv(
    HEADER +
      'fear,01-FR,"Je durft het echt niet te doen, ook al weet je dat het kan","You do not dare, even though you know you can"\n',
  );
  const rows = readIntroRows(path);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, "fear");
  assert.equal(rows[0].nl, "Je durft het echt niet te doen, ook al weet je dat het kan");
  assert.equal(rows[0].en, "You do not dare, even though you know you can");
});

test("a gender column is rejected — intro lines are keyed on mechanism alone", () => {
  const path = writeCsv("gender,key,ID,intro (NL),intro (EN)\nfemale,fear,01F-FR,Iets,Something\n");
  assert.throws(() => readIntroRows(path), /gender/i);
});

test("a flat-outcome row is rejected rather than silently making it 26", () => {
  const path = writeCsv(HEADER + "flat-high,01-HIGH,Iets,Something\n");
  assert.throws(() => readIntroRows(path), /flat-high/);
});

test("a key the engine cannot produce is rejected", () => {
  const path = writeCsv(HEADER + "fear_fear,01-FR-FR,Iets,Something\n");
  assert.throws(() => readIntroRows(path), /fear_fear/);
});

/* ─── Generating the module ─── */

test("emits NL_INTRO and EN_INTRO tables keyed on the conclusion key", () => {
  const path = writeCsv(HEADER + "fear,01-FR,Nederlandse regel,English line\n");
  const module = buildIntroLinesModule(path);
  assert.match(module, /export const NL_INTRO = \{/);
  assert.match(module, /export const EN_INTRO = \{/);
  assert.match(module, /"fear": "Nederlandse regel"/);
  assert.match(module, /"fear": "English line"/);
});

test("omits unwritten lines so the component placeholder shows through", () => {
  const path = writeCsv(HEADER + "fear,01-FR,,\nfalse-hope,01-FH,Geschreven,Written\n");
  const module = buildIntroLinesModule(path);
  assert.ok(!module.includes('"fear":'));
  assert.match(module, /"false-hope": "Geschreven"/);
});

test("whitespace-only copy counts as unwritten", () => {
  const path = writeCsv(HEADER + 'fear,01-FR,"   ","  "\n');
  const module = buildIntroLinesModule(path);
  assert.ok(!module.includes('"fear":'));
});

test("a missing CSV yields empty tables rather than failing the build", () => {
  const module = buildIntroLinesModule("/nonexistent/nem-intro-lines.csv");
  assert.match(module, /export const NL_INTRO = \{\};/);
  assert.match(module, /export const EN_INTRO = \{\};/);
  assert.match(module, /not been exported yet/i);
});

test("records coverage out of 25 in the generated header", () => {
  const path = writeCsv(HEADER + "fear,01-FR,Nederlandse regel,\n");
  const module = buildIntroLinesModule(path);
  assert.match(module, /1 of 25/);
});

test("the generated module is marked as generated", () => {
  const path = writeCsv(HEADER + "fear,01-FR,Regel,Line\n");
  assert.match(buildIntroLinesModule(path), /GENERATED FILE/);
});

/* ─── IDs and the sheet template ─── */

test("an intro-line ID carries no gender letter", () => {
  assert.equal(introLineIdFor({ primary: "fear", secondary: null }), "01-FR");
  assert.equal(introLineIdFor({ primary: "selfRejection", secondary: "falsePower" }), "01-SR-FP");
});

test("intro-line IDs are distinguishable from conclusion IDs at a glance", () => {
  for (const row of enumerateIntroLineRows()) {
    assert.doesNotMatch(row.id, /^01[FM]-/, `${row.id} looks like a gendered conclusion ID`);
  }
});

test("directional duals get distinct IDs", () => {
  assert.notEqual(
    introLineIdFor({ primary: "fear", secondary: "selfRejection" }),
    introLineIdFor({ primary: "selfRejection", secondary: "fear" }),
  );
});

test("the sheet template enumerates exactly the 25 intro-line keys, in order", () => {
  const rows = enumerateIntroLineRows();
  assert.equal(rows.length, 25);
  assert.deepEqual(
    rows.map((r) => r.key),
    INTRO_LINE_KEYS,
  );
});

test("every template ID is unique", () => {
  const ids = enumerateIntroLineRows().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the template's own rows survive a round trip through the reader", () => {
  const rows = enumerateIntroLineRows();
  const body = rows.map((r) => `${r.key},${r.id},Regel,Line`).join("\n");
  const path = writeCsv(HEADER + body + "\n");
  assert.equal(readIntroRows(path).length, 25);
});

/* ─── The shape the sheet actually arrives in ─── */

/* Christel filled the Intro lines tab with the conclusion tab's column names rather than
 * the template's, and without an ID column. The copy is correct and the keys are right, so
 * the reader accepts both spellings instead of making a re-export the price of a build. */

const SHEET_HEADER = "type,key,text (NL),text (EN)\n";

test('accepts "text (NL)" as the sheet spells it, not only "intro (NL)"', () => {
  const path = writeCsv(SHEET_HEADER + "single,fear,Nederlandse regel,English line\n");
  const rows = readIntroRows(path);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, "fear");
  assert.equal(rows[0].nl, "Nederlandse regel");
  assert.equal(rows[0].en, "English line");
});

test("an absent ID column is not fatal — nothing downstream reads it", () => {
  const path = writeCsv(SHEET_HEADER + "single,fear,Nederlandse regel,\n");
  assert.doesNotThrow(() => readIntroRows(path));
});

test("the sheet's own shape still rejects a flat outcome", () => {
  const path = writeCsv(SHEET_HEADER + "flat,flat-high,Iets,\n");
  assert.throws(() => readIntroRows(path), /flat-high/);
});

test("a missing text column is still an error, whichever spelling is used", () => {
  const path = writeCsv("type,key\nsingle,fear\n");
  assert.throws(() => readIntroRows(path), /intro \(NL\)/);
});

test("the real export carries all 25 Dutch lines", () => {
  const rows = readIntroRows();
  assert.equal(rows.length, 25);
  assert.equal(rows.filter((r) => r.nl.trim()).length, 25);
});
