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

describe("the bundle carries a provenance header", () => {
  test("says it is generated and names the command that regenerates it", () => {
    assert.match(bundle, /GENERATED FILE/);
    assert.match(bundle, /tools\/nem\/build-component\.js/);
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
