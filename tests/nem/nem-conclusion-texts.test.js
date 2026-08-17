/* Tests for the conclusion-text generator.
 *
 * Christel's copy lives in Alex's sheet. It reaches the component by CSV export, parsed
 * here into a module — never by copy-paste, which flattens her paragraph breaks into
 * spaces. These tests pin the parsing (quoted fields, embedded newlines, doubled quotes)
 * and assert the paragraphs actually survive.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildTextsModule,
  parseCsv,
  readTextRows,
} from "../../tools/nem/build-conclusion-texts.js";
import { CONCLUSION_KEYS } from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

describe("parseCsv", () => {
  test("splits plain rows", () => {
    assert.deepEqual(parseCsv("a,b\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("keeps newlines inside a quoted field — the whole point", () => {
    const rows = parseCsv('a,b\n"one\n\ntwo",3');
    assert.equal(rows[1][0], "one\n\ntwo");
    assert.equal(rows[1][1], "3");
  });

  test("unescapes doubled quotes", () => {
    assert.equal(parseCsv('a\n"he said ""hi"""')[1][0], 'he said "hi"');
  });

  test("keeps commas inside quoted fields", () => {
    assert.equal(parseCsv('a\n"one, two"')[1][0], "one, two");
  });

  test("preserves empty trailing fields", () => {
    assert.deepEqual(parseCsv("a,b,c\n1,,")[1], ["1", "", ""]);
  });

  test("handles CRLF line endings, which is what Sheets exports", () => {
    assert.deepEqual(parseCsv("a,b\r\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("readTextRows — the exported sheet", () => {
  const rows = readTextRows();

  test("reads all 54 rows", () => {
    assert.equal(rows.length, 54);
  });

  test("every row's key is one the engine can produce", () => {
    const valid = new Set(CONCLUSION_KEYS);
    for (const row of rows) {
      assert.ok(valid.has(row.key), `sheet key "${row.key}" is not a valid conclusion key`);
    }
  });

  test("female Dutch is complete — all 27 written", () => {
    const written = rows.filter((r) => r.gender === "female" && r.nl.trim());
    assert.equal(written.length, 27);
  });

  test("the other three columns are still empty, as expected on 2026-08-17", () => {
    assert.equal(rows.filter((r) => r.gender === "male" && r.nl.trim()).length, 0);
    assert.equal(rows.filter((r) => r.en.trim()).length, 0);
  });
});

describe("paragraph breaks survive the round trip", () => {
  const rows = readTextRows();
  const byKey = Object.fromEntries(
    rows.filter((r) => r.gender === "female").map((r) => [r.key, r.nl]),
  );

  test("flat-low keeps its three paragraphs", () => {
    assert.equal(byKey["flat-low"].split("\n\n").length, 3);
  });

  test("flat-high keeps its three paragraphs", () => {
    assert.equal(byKey["flat-high"].split("\n\n").length, 3);
  });

  test("no text has had its breaks collapsed into double spaces", () => {
    /* The failure mode this guards: reading the sheet through a renderer turns "\n\n"
     * into "  ". If that ever happens again, flat-low arrives as one paragraph. */
    assert.doesNotMatch(byKey["flat-low"], /hoofdrol\.  Dat kan/);
    assert.match(byKey["flat-low"], /hoofdrol\.\n\nDat kan/);
  });
});

describe("buildTextsModule", () => {
  const module = buildTextsModule();

  test("exports the four gender/locale tables", () => {
    for (const name of ["NL_VROUW", "NL_MAN", "EN_VROUW", "EN_MAN"]) {
      assert.match(module, new RegExp(`export const ${name} = \\{`));
    }
  });

  test("only includes texts that are actually written", () => {
    /* 27 female Dutch entries and nothing else, so an unwritten text falls through to
     * the component's visible placeholder rather than rendering as blank. */
    const entries = [...module.matchAll(/^ {2}"[^"]+":/gm)];
    assert.equal(entries.length, 27);
  });

  test("newlines are escaped as \\n, not emitted raw into the string literal", () => {
    assert.match(module, /\\n\\n/);
  });

  test("is valid JavaScript that round-trips the paragraphs", async () => {
    const { writeFileSync } = await import("node:fs");
    const tmp = `${process.env.TMPDIR || "/tmp"}/nem-texts-${process.pid}.mjs`;
    writeFileSync(tmp, module);
    const loaded = await import(tmp);
    assert.equal(Object.keys(loaded.NL_VROUW).length, 27);
    assert.equal(loaded.NL_VROUW["flat-low"].split("\n\n").length, 3);
    assert.equal(Object.keys(loaded.NL_MAN).length, 0);
  });

  test("carries a provenance header naming the CSV and the command", () => {
    assert.match(module, /GENERATED FILE/);
    assert.match(module, /nem-conclusion-texts\.csv/);
    assert.match(module, /build-conclusion-texts\.js/);
  });

  test("is deterministic", () => {
    assert.equal(buildTextsModule(), buildTextsModule());
  });
});
