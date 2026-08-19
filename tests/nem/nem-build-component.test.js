/* Tests for the Webflow component bundler.
 *
 * Everything in Webflow runs inside a single custom code component, so the three-module
 * repo layout (component + scoring engine + conclusion IDs) cannot be pasted as-is:
 * relative imports do not resolve there.
 *
 * buildComponent() inlines the sibling modules into one pasteable file. The point of
 * generating it rather than hand-inlining is that the pasted artefact cannot drift from
 * the modules the unit tests actually cover.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildComponent, SRC_DIR } from "../../tools/nem/build-component.js";
import * as REAL_TEXTS from "../../projects/nem-life/src/nem-conclusion-texts.js";

const bundle = buildComponent();

const read = (name) => readFileSync(resolve(SRC_DIR, name), "utf8");

describe("the bundle is pasteable into Webflow", () => {
  test("no relative imports survive — they cannot resolve in Webflow", () => {
    assert.doesNotMatch(bundle, /^\s*import\s[^;]*from\s+["']\.\.?\//m);
  });

  test("no bare re-export statements survive either", () => {
    assert.doesNotMatch(bundle, /^\s*export\s+\{[^}]*\}\s+from\s+["']\.\.?\//m);
  });

  test("package imports are preserved — Webflow provides those", () => {
    assert.match(bundle, /import \{ declareComponent, useWebflowContext \} from "@webflow\/react";/);
    assert.match(bundle, /from "@webflow\/data-types";/);
    assert.match(bundle, /from "react";/);
  });

  test("every package import sits at the top, before any inlined code", () => {
    const lines = bundle.split("\n");
    const lastImport = lines.reduce(
      (acc, line, i) => (/^import\s/.test(line) ? i : acc),
      -1,
    );
    const firstDeclaration = lines.findIndex((line) =>
      /^(const|function|type|interface|declare) /.test(line),
    );
    assert.ok(lastImport >= 0, "expected package imports");
    assert.ok(
      firstDeclaration > lastImport,
      `declaration at ${firstDeclaration} precedes last import at ${lastImport}`,
    );
  });

  test("the component is still the default export", () => {
    assert.match(bundle, /export default declareComponent\(Quiz, \{/);
  });
});

describe("the inlined modules match their sources — no drift", () => {
  for (const module of ["nem-test-conclusion-ids.js", "nem-test-scoring.js"]) {
    test(`${module} contributes its declarations verbatim`, () => {
      const source = read(module);
      /* Every top-level declaration in the source must appear in the bundle with the
       * `export ` keyword stripped and nothing else altered. */
      const declarations = source
        .split("\n")
        .filter((line) => /^export (const|function) /.test(line))
        .map((line) => line.replace(/^export /, ""));

      assert.ok(declarations.length > 0, `no exported declarations found in ${module}`);
      for (const declaration of declarations) {
        assert.ok(
          bundle.includes(declaration),
          `bundle is missing "${declaration.slice(0, 60)}…" from ${module}`,
        );
      }
    });
  }

  test("the symbols the component actually calls are all defined in the bundle", () => {
    for (const symbol of ["calculateScores", "CONCLUSION_KEYS", "conclusionIdFor", "conclusionKeyFor"]) {
      assert.match(
        bundle,
        new RegExp(`(const|function) ${symbol}\\b`),
        `${symbol} is referenced but never declared in the bundle`,
      );
    }
  });

  test("dependency order holds: conclusion-ids is inlined before scoring uses it", () => {
    assert.ok(
      bundle.indexOf("function conclusionIdFor") < bundle.indexOf("function calculateScores"),
      "calculateScores appears before the functions it calls",
    );
  });

  test("no symbol is declared twice", () => {
    const declared = [...bundle.matchAll(/^(?:const|function) ([A-Za-z_$][\w$]*)/gm)].map(
      (m) => m[1],
    );
    const seen = new Set();
    const duplicates = declared.filter((name) => (seen.has(name) ? true : (seen.add(name), false)));
    assert.deepEqual(duplicates, [], `duplicate declarations: ${duplicates.join(", ")}`);
  });
});

describe("Christel's copy reaches the bundle intact", () => {
  test("the aliased imports are re-declared after inlining", () => {
    for (const [local, exported] of [
      ["REAL_NL_VROUW", "NL_VROUW"],
      ["REAL_NL_MAN", "NL_MAN"],
      ["REAL_EN_VROUW", "EN_VROUW"],
      ["REAL_EN_MAN", "EN_MAN"],
    ]) {
      assert.match(bundle, new RegExp(`const ${local} = ${exported};`));
      assert.match(bundle, new RegExp(`const ${exported} = \\{`));
    }
  });

  test("an alias is declared after the table it points at", () => {
    assert.ok(
      bundle.indexOf("const NL_VROUW = {") < bundle.indexOf("const REAL_NL_VROUW = NL_VROUW;"),
      "alias precedes the table it aliases",
    );
  });

  test("real Dutch copy is present, not just placeholders", () => {
    assert.match(bundle, /Op basis van je antwoorden springt er niets duidelijk uit/);
  });

  test("paragraph breaks survive into the bundle as escaped newlines", () => {
    assert.match(bundle, /hoofdrol\.\\n\\nDat kan verschillende dingen betekenen/);
  });

  test("the component splits paragraphs rather than rendering one block", () => {
    assert.match(bundle, /conclusionText\.split\(\/\\n\{2,\}\/\)/);
  });
});

describe("comments are stripped from production code", () => {
  /* Everything below the provenance header should be code. The header is the only
   * comment that survives, because without it nobody knows the file is generated. */
  const body = bundle.slice(bundle.indexOf("*/") + 2);

  test("no block comments survive in the body", () => {
    assert.doesNotMatch(body, /\/\*/);
  });

  test("no line comments survive in the body", () => {
    assert.doesNotMatch(body, /(^|[^:"'`\\])\/\/(?![^\n]*["'`])/m);
  });

  test("the provenance header itself is kept", () => {
    assert.match(bundle, /GENERATED FILE/);
    assert.ok(bundle.indexOf("GENERATED FILE") < bundle.indexOf("import "));
  });

  test("regex literals are not mistaken for comments", () => {
    /* /\n{2,}/ and the email pattern both contain slashes a naive stripper would eat. */
    assert.match(body, /conclusionText\.split\(\/\\n\{2,\}\/\)/);
    assert.match(body, /\[\^\\s@\]\+@\[\^\\s@\]\+/);
  });

  test("Christel's copy survives byte for byte", () => {
    for (const key of Object.keys(REAL_TEXTS.NL_VROUW)) {
      assert.ok(
        bundle.includes(JSON.stringify(REAL_TEXTS.NL_VROUW[key])),
        `conclusion text for "${key}" was altered by comment stripping`,
      );
    }
  });

  test("all 27 texts are present, not just some", () => {
    assert.equal(Object.keys(REAL_TEXTS.NL_VROUW).length, 27);
  });

  test("Dutch prose containing slashes is untouched", () => {
    /* "(ver)oordelen" and similar bracket/slash constructions appear in her copy. */
    assert.match(bundle, /\(ver\)oordelen/);
  });

  test("stripping actually removed something — the test is not vacuous", () => {
    const withComments = readFileSync(resolve(SRC_DIR, "nem-test-scoring.js"), "utf8");
    assert.match(withComments, /Fixed tiebreak order/);
    assert.doesNotMatch(bundle, /Fixed tiebreak order/);
  });
});

describe("the anonymous completion beacon reaches the bundle", () => {
  test("it fires and is tagged as a completion, not a submission", () => {
    assert.match(bundle, /event: "completion"/);
  });

  test("it is sent on answering the last question, not at opt-in", () => {
    /* Flat outcomes never reach the opt-in screen, and anyone who finishes the questions
     * then abandons the form would otherwise be invisible. */
    assert.match(bundle, /sendCompletionBeacon\(updatedAnswers\)/);
  });

  test("it carries no personal data — none of it exists at question 20", () => {
    const beacon = bundle.slice(
      bundle.indexOf("const sendCompletionBeacon"),
      bundle.indexOf("const selectAnswer"),
    );
    assert.ok(beacon.length > 0, "beacon not found in the bundle");
    for (const field of ["firstName", "email", "gender", "nemMattersConsent", "ageCategory"]) {
      assert.doesNotMatch(beacon, new RegExp(`\\b${field}\\b`), `beacon leaks ${field}`);
    }
  });

  test("it does not send conclusionId — the gender it needs is not known yet", () => {
    /* Sending one would mean inventing the F/M segment. conclusionKey plus the gender on
     * the identified row reconstructs it later. */
    const beacon = bundle.slice(
      bundle.indexOf("const sendCompletionBeacon"),
      bundle.indexOf("const selectAnswer"),
    );
    assert.match(beacon, /conclusionKey/);
    assert.doesNotMatch(beacon, /conclusionId/);
  });

  test("it is fire-and-forget — a slow webhook must not stall the quiz", () => {
    const beacon = bundle.slice(
      bundle.indexOf("const sendCompletionBeacon"),
      bundle.indexOf("const selectAnswer"),
    );
    assert.doesNotMatch(beacon, /await fetch/, "awaiting would block the conclusion screen");
    assert.match(beacon, /catch/);
    assert.match(beacon, /keepalive: true/);
  });
});

describe("the bundle carries a provenance header", () => {
  test("says it is generated and names the command that regenerates it", () => {
    assert.match(bundle, /GENERATED FILE/);
    /* `npm run build:nem`, not the bare node command — the script also regenerates the
     * texts module and runs the typecheck, and someone following the header must get all
     * three or they will paste a file Webflow rejects. */
    assert.match(bundle, /npm run build:nem/);
  });

  test("names the source modules so the reader knows where to edit", () => {
    assert.match(bundle, /nem-test-conclusion-ids\.js/);
    assert.match(bundle, /nem-test-scoring\.js/);
    assert.match(bundle, /nem-test-phase-b\.tsx/);
  });
});

describe("the build is deterministic", () => {
  test("two runs produce identical output", () => {
    assert.equal(buildComponent(), buildComponent());
  });
});
