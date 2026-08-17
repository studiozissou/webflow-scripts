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

import ts from "typescript";

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

/* Remove every comment from generated production code.
 *
 * Done with the TypeScript parser rather than a regex. The file contains Dutch prose
 * with slashes, regex literals like /\n{2,}/, and JSX — all of which a regex-based
 * stripper mistakes for comments, and corrupting a client's copy that way would be
 * silent. The parser knows the difference.
 *
 * The provenance header is added afterwards, so it survives. */
function stripComments(source) {
  const file = ts.createSourceFile("bundle.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const ranges = [];

  /* Walk down to individual TOKENS, not just nodes. A comment is leading trivia of the
   * next token, so token-level walking is what catches the two cases node-level misses:
   * a comment just before a closing brace (trivia of the `}` token, which no node owns),
   * and a JSX comment, which lives between the braces of a JsxExpression. */
  const collect = (node) => {
    const children = node.getChildren(file);

    if (children.length === 0) {
      /* Both directions are needed: TypeScript classifies a comment that follows code on
       * the SAME line as trailing trivia, and only a comment on its own line as leading.
       * Collecting just one kind leaves `doThing(); // note` untouched. */
      for (const range of [
        ...(ts.getLeadingCommentRanges(source, node.pos) ?? []),
        ...(ts.getTrailingCommentRanges(source, node.end) ?? []),
      ]) {
        ranges.push(range);
      }
      return;
    }

    /* `{/* … *\/}` parses as a JsxExpression with no expression. Stripping the comment
     * alone would leave a stray `{}`, so drop the whole container. */
    if (ts.isJsxExpression(node) && !node.expression) {
      ranges.push({ pos: node.getFullStart(), end: node.end });
      return;
    }

    for (const child of children) collect(child);
  };

  collect(file);

  /* De-duplicate: a comment between two nodes is both a trailing and a leading range. */
  const unique = [...new Map(ranges.map((r) => [`${r.pos}:${r.end}`, r])).values()].sort(
    (a, b) => b.pos - a.pos,
  );

  let out = source;
  for (const { pos, end } of unique) {
    out = out.slice(0, pos) + out.slice(end);
  }

  return out
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
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
    " * Regenerate with:  npm run build:nem   (regenerates, then typechecks)",
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

  const aliases = ALIASES.map(([local, exported]) => `const ${local} = ${exported};`).join("\n");

  const body = [
    imports.join("\n"),
    ...sections,
    aliases,
    bodyWithoutImports(component),
  ].join("\n\n");

  /* Comments are stripped from the body only. The header is prepended afterwards so the
   * generated file still says what it is and how to regenerate it — without that, the
   * first person to open it has no way to know it must not be edited by hand. */
  return `${header}\n\n${stripComments(body)}\n`;
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
