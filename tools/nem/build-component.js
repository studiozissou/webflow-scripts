#!/usr/bin/env node
/* Build the single-file NEM Test component for pasting into Webflow.
 *
 *   node tools/nem/build-component.js
 *
 * Everything in Webflow runs inside ONE custom code component, so the repo's three-module
 * layout cannot be pasted as-is — `import … from "./nem-test-scoring.js"` does not resolve
 * there. This inlines the sibling modules into a single file.
 *
 * The split is worth keeping despite that: the scoring engine and the conclusion ID scheme
 * are covered by 82 unit tests that cannot run against a .tsx (it carries React and Webflow
 * imports). Generating the pasteable file from those same modules is what stops the pasted
 * artefact drifting away from the code the tests actually cover — which is exactly what
 * hand-inlining before each paste would cause.
 *
 * Output: projects/nem-life/dist/nem-test-phase-b.webflow.tsx
 * Tests:  tests/nem/nem-build-component.test.js
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const SRC_DIR = resolve(REPO_ROOT, "projects/nem-life/src");
const OUT = resolve(REPO_ROOT, "projects/nem-life/dist/nem-test-phase-b.webflow.tsx");

const COMPONENT = "nem-test-phase-b.tsx";

/* Dependency order: conclusion-ids defines what scoring calls, scoring defines what the
 * component calls. Inlined in this order so nothing is referenced before it is declared.
 * nem-conclusion-texts.js is itself generated — run build-conclusion-texts.js first if
 * Christel's copy has changed. */
const MODULES = [
  "nem-test-conclusion-ids.js",
  "nem-test-scoring.js",
  "nem-conclusion-texts.js",
];

/* The component imports the text tables under different local names. Aliased imports are
 * stripped along with the rest, so the aliases are re-declared here after inlining. */
const ALIASES = [
  ["REAL_NL_VROUW", "NL_VROUW"],
  ["REAL_NL_MAN", "NL_MAN"],
  ["REAL_EN_VROUW", "EN_VROUW"],
  ["REAL_EN_MAN", "EN_MAN"],
];

const read = (name) => readFileSync(resolve(SRC_DIR, name), "utf8");

/* Strip a module down to its declarations: drop relative imports (the symbols they name
 * are inlined alongside) and the `export` keyword (there is nothing to export from a
 * single file). Package imports are hoisted separately by the caller. */
function inlineModule(source) {
  return source
    .replace(/^import\s[^;]*from\s+["']\.\.?\/[^"']*["'];?\s*$/gm, "")
    .replace(/^export\s+(const|function|class|let|var)\s/gm, "$1 ")
    .trim();
}

/* Collect the package (non-relative) imports from a source file, in order. */
function packageImports(source) {
  return [...source.matchAll(/^import\s[^;]*from\s+["'][^.][^"']*["'];?$/gm)].map((m) => m[0]);
}

/* Everything that is not a package import and not a relative import. */
function bodyWithoutImports(source) {
  return source
    .replace(/^import\s[^;]*from\s+["'][^"']*["'];?\s*$/gm, "")
    .trim();
}

export function buildComponent() {
  const component = read(COMPONENT);
  const modules = MODULES.map((name) => ({ name, source: read(name) }));

  /* Package imports come from the component only — the sibling modules deliberately carry
   * no React or Webflow dependencies, which is what makes them unit-testable. */
  const imports = packageImports(component);

  const header = [
    "/* ─────────────────────────────────────────────────────────────────────────────",
    " * GENERATED FILE — do not edit here. Paste this whole file into the Webflow",
    " * custom code component.",
    " *",
    " * Regenerate with:  node tools/nem/build-component.js",
    " *",
    " * Built from, and edit instead:",
    ` *   projects/nem-life/src/${COMPONENT}`,
    ...MODULES.map((name) => ` *   projects/nem-life/src/${name}`),
    " *",
    " * The modules are inlined because everything in Webflow runs inside one component,",
    " * so relative imports cannot resolve. They stay separate in the repo because the",
    " * unit tests cannot import a .tsx.",
    " * ───────────────────────────────────────────────────────────────────────────── */",
  ].join("\n");

  const sections = modules.map(
    ({ name, source }) =>
      [
        `/* ═══ inlined from ${name} ${"═".repeat(Math.max(0, 58 - name.length))} */`,
        inlineModule(source),
      ].join("\n\n"),
  );

  const aliases = [
    "/* ═══ import aliases, re-declared after inlining ═══════════════════════ */",
    ...ALIASES.map(([local, exported]) => `const ${local} = ${exported};`),
  ].join("\n");

  return [
    header,
    imports.join("\n"),
    ...sections,
    aliases,
    `/* ═══ ${COMPONENT} ${"═".repeat(Math.max(0, 62 - COMPONENT.length))} */`,
    bodyWithoutImports(component),
  ].join("\n\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/* Run directly (not when imported by the tests). */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundle = buildComponent();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, bundle, "utf8");
  const lines = bundle.split("\n").length;
  console.log(`Wrote ${lines} lines to ${OUT}`);
  console.log("Paste this file into the Webflow custom code component.");
}
