/* Tests for the NEM Test conclusion ID scheme (conclusion engine v2).
 *
 * The IDs are derived from the same code that builds conclusion keys, so Alex's
 * sheet and the component cannot drift. Spec:
 * projects/nem-life/.claude/specs/nem-test-conclusion-logic-v2.md § 3.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MECHANISM_CODE,
  MECHANISM_TO_KEY,
  SHEET_ORDER,
  TEXT_SET,
  conclusionIdFor,
  conclusionKeyFor,
  enumerateConclusionRows,
} from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

describe("conclusionIdFor — combined format", () => {
  test("flat outcomes carry the set, gender and outcome only", () => {
    assert.equal(conclusionIdFor("female", { outcome: "flat-low" }), "01F-LOW");
    assert.equal(conclusionIdFor("female", { outcome: "flat-high" }), "01F-HIGH");
    assert.equal(conclusionIdFor("male", { outcome: "flat-low" }), "01M-LOW");
    assert.equal(conclusionIdFor("male", { outcome: "flat-high" }), "01M-HIGH");
  });

  test("single outcomes name the one mechanism", () => {
    assert.equal(
      conclusionIdFor("female", { outcome: "single", primary: "selfRejection" }),
      "01F-SR",
    );
    assert.equal(
      conclusionIdFor("male", { outcome: "single", primary: "fear" }),
      "01M-FR",
    );
  });

  test("dual outcomes are directional — leading then following", () => {
    assert.equal(
      conclusionIdFor("female", {
        outcome: "dual",
        primary: "selfRejection",
        secondary: "falsePower",
      }),
      "01F-SR-FP",
    );
    assert.equal(
      conclusionIdFor("female", {
        outcome: "dual",
        primary: "falsePower",
        secondary: "selfRejection",
      }),
      "01F-FP-SR",
    );
  });

  test("reversing a dual produces a different ID — the whole point of v2", () => {
    const forward = conclusionIdFor("male", {
      outcome: "dual",
      primary: "fear",
      secondary: "emotionalNumbing",
    });
    const reverse = conclusionIdFor("male", {
      outcome: "dual",
      primary: "emotionalNumbing",
      secondary: "fear",
    });
    assert.notEqual(forward, reverse);
    assert.equal(forward, "01M-FR-EM");
    assert.equal(reverse, "01M-EM-FR");
  });

  test("the text set is a parameter, not a hardcoded literal", () => {
    assert.equal(
      conclusionIdFor("female", { outcome: "single", primary: "fear" }, "02"),
      "02F-FR",
    );
  });

  test("an unknown gender or mechanism throws rather than emitting a broken ID", () => {
    assert.throws(() => conclusionIdFor("other", { outcome: "flat-low" }));
    assert.throws(() =>
      conclusionIdFor("female", { outcome: "single", primary: "notAMechanism" }),
    );
  });
});

describe("conclusionKeyFor — directional, English", () => {
  test("single and flat keys", () => {
    assert.equal(conclusionKeyFor({ outcome: "single", primary: "fear" }), "fear");
    assert.equal(conclusionKeyFor({ outcome: "flat-low" }), "flat-low");
    assert.equal(conclusionKeyFor({ outcome: "flat-high" }), "flat-high");
  });

  test("dual keys do NOT canonicalise — both directions survive", () => {
    assert.equal(
      conclusionKeyFor({
        outcome: "dual",
        primary: "fear",
        secondary: "selfRejection",
      }),
      "fear_self-rejection",
    );
    assert.equal(
      conclusionKeyFor({
        outcome: "dual",
        primary: "selfRejection",
        secondary: "fear",
      }),
      "self-rejection_fear",
    );
  });
});

describe("enumerateConclusionRows — the 54-row sheet", () => {
  const rows = enumerateConclusionRows();

  test("produces exactly 54 rows: 2 genders x (2 flat + 5 single + 20 dual)", () => {
    assert.equal(rows.length, 54);
    assert.equal(rows.filter((r) => r.gender === "female").length, 27);
    assert.equal(rows.filter((r) => r.gender === "male").length, 27);
    assert.equal(rows.filter((r) => r.type === "dual").length, 40);
    assert.equal(rows.filter((r) => r.type === "single").length, 10);
    assert.equal(rows.filter((r) => r.type === "flat").length, 4);
  });

  test("every ID is unique", () => {
    const ids = rows.map((r) => r.id);
    assert.equal(new Set(ids).size, 54);
  });

  test("no dual pairs a mechanism with itself", () => {
    for (const row of rows.filter((r) => r.type === "dual")) {
      assert.notEqual(row.leading, row.following);
    }
  });

  test("row order matches Alex's sheet: females first, flats, singles, then duals", () => {
    assert.deepEqual(
      rows.slice(0, 7).map((r) => r.key),
      [
        "flat-low",
        "flat-high",
        "fear",
        "self-rejection",
        "false-hope",
        "false-power",
        "emotional-numbing",
      ],
    );
    assert.equal(rows[7].key, "fear_self-rejection");
    assert.equal(rows[26].key, "emotional-numbing_false-power");
    assert.equal(rows[27].gender, "male");
  });

  test("IDs agree with conclusionIdFor for every row — one source of truth", () => {
    for (const row of rows) {
      const outcome = row.type === "flat" ? row.key : row.type;
      assert.equal(
        row.id,
        conclusionIdFor(row.gender, {
          outcome,
          primary: row.leadingMechanism,
          secondary: row.followingMechanism,
        }),
        `ID mismatch on ${row.key} (${row.gender})`,
      );
    }
  });

  test("keys agree with conclusionKeyFor for every row", () => {
    for (const row of rows) {
      const outcome = row.type === "flat" ? row.key : row.type;
      assert.equal(
        row.key,
        conclusionKeyFor({
          outcome,
          primary: row.leadingMechanism,
          secondary: row.followingMechanism,
        }),
      );
    }
  });

  test("every mechanism in the sheet order has a two-letter code", () => {
    assert.equal(SHEET_ORDER.length, 5);
    for (const mech of SHEET_ORDER) {
      assert.match(MECHANISM_CODE[mech], /^[A-Z]{2}$/);
      assert.ok(MECHANISM_TO_KEY[mech]);
    }
  });

  test("no mechanism code collides with a gender letter on its own", () => {
    const codes = Object.values(MECHANISM_CODE);
    assert.equal(new Set(codes).size, 5);
    for (const code of codes) assert.notEqual(code.length, 1);
  });

  test("the default text set is 01, matching Alex's sheet name", () => {
    assert.equal(TEXT_SET, "01");
    for (const row of rows) assert.ok(row.id.startsWith("01"));
  });
});
