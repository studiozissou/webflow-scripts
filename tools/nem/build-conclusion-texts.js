#!/usr/bin/env node
/* Turn Christel's conclusion copy into a module the component can import.
 *
 *   node tools/nem/build-conclusion-texts.js
 *
 * Source: projects/nem-life/.claude/research/nem-conclusion-texts.csv, exported from
 * Alex's sheet NEM_TEST_01_Default_texts (File → Download → CSV, or the Drive API with
 * exportMimeType text/csv).
 *
 * ⚠️ The copy must arrive as a CSV export, never as copy-paste or a rendered read. Those
 * paths flatten in-cell paragraph breaks into spaces, which silently destroys Christel's
 * paragraphing — her flat-low text is three paragraphs and would arrive as one.
 *
 * Output: projects/nem-life/src/nem-conclusion-texts.js
 * Tests:  tests/nem/nem-conclusion-texts.test.js
 *
 * To refresh when Christel writes more: re-export the sheet over the CSV, re-run this,
 * then `npm run build:nem` to regenerate the pasteable component.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CSV = resolve(REPO_ROOT, "projects/nem-life/.claude/research/nem-conclusion-texts.csv");
const OUT = resolve(REPO_ROOT, "projects/nem-life/src/nem-conclusion-texts.js");

/* Minimal RFC 4180 parser. Written out rather than pulled in because the repo has no
 * build step and one dependency for one file is not worth it — and because the embedded
 * newlines are exactly the case a naive split() gets wrong. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // doubled quote is a literal quote
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char; // newlines inside quotes are content, not row breaks
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  /* A trailing newline leaves nothing to flush; anything else is a final row. */
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/* The sheet's rows as objects. Column order is fixed by the generated ID sheet. */
export function readTextRows(csvPath = CSV) {
  const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8"));

  const index = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`CSV is missing the "${name}" column`);
    return i;
  };

  const cols = {
    gender: index("gender"),
    key: index("key"),
    id: index("ID"),
    nl: index("text (NL)"),
    en: index("text (EN)"),
  };

  return rows
    .filter((row) => row.length > 1 && row[cols.key])
    .map((row) => ({
      gender: row[cols.gender],
      key: row[cols.key],
      id: row[cols.id],
      nl: row[cols.nl] ?? "",
      en: row[cols.en] ?? "",
    }));
}

/* Render one table, omitting anything unwritten so the component's placeholder shows
 * through instead of a blank conclusion. */
function renderTable(name, entries) {
  const body = entries
    .map(([key, text]) => `  ${JSON.stringify(key)}: ${JSON.stringify(text)},`)
    .join("\n");
  return `export const ${name} = {${body ? `\n${body}\n` : ""}};`;
}

export function buildTextsModule(csvPath = CSV) {
  const rows = readTextRows(csvPath);

  const table = (gender, locale) =>
    rows
      .filter((row) => row.gender === gender && row[locale].trim())
      .map((row) => [row.key, row[locale]]);

  const written = rows.filter((r) => r.nl.trim() || r.en.trim()).length;

  const header = [
    "/* ─────────────────────────────────────────────────────────────────────────────",
    " * GENERATED FILE — do not edit here.",
    " *",
    " * Christel's conclusion copy, generated from",
    " *   projects/nem-life/.claude/research/nem-conclusion-texts.csv",
    " * which is a CSV export of Alex's sheet NEM_TEST_01_Default_texts.",
    " *",
    " * Regenerate with:  node tools/nem/build-conclusion-texts.js",
    " *",
    " * Keys are conclusion keys, so these tables are looked up directly by whatever",
    " * calculateScores() returns. Unwritten texts are omitted rather than emitted",
    " * empty, so the component's visible placeholder shows through instead of a blank.",
    " *",
    ` * Coverage at generation: ${written} of 108 texts written.`,
    " * ───────────────────────────────────────────────────────────────────────────── */",
  ].join("\n");

  return [
    header,
    "",
    renderTable("NL_VROUW", table("female", "nl")),
    "",
    renderTable("NL_MAN", table("male", "nl")),
    "",
    renderTable("EN_VROUW", table("female", "en")),
    "",
    renderTable("EN_MAN", table("male", "en")),
    "",
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const module = buildTextsModule();
  writeFileSync(OUT, module, "utf8");
  const rows = readTextRows();
  const written = rows.filter((r) => r.nl.trim() || r.en.trim()).length;
  console.log(`Wrote ${OUT}`);
  console.log(`${written} of 108 texts written; the rest fall through to placeholders.`);
}
