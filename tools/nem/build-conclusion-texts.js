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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { INTRO_LINE_KEYS } from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CSV = resolve(REPO_ROOT, "projects/nem-life/.claude/research/nem-conclusion-texts.csv");
const OUT = resolve(REPO_ROOT, "projects/nem-life/src/nem-conclusion-texts.js");

/* The intro lines live in a second tab of the same sheet, so they arrive as a second CSV
 * export rather than as more rows in the first. */
const INTRO_CSV = resolve(REPO_ROOT, "projects/nem-life/.claude/research/nem-intro-lines.csv");
const INTRO_OUT = resolve(REPO_ROOT, "projects/nem-life/src/nem-intro-lines.js");

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

/* ─── Intro lines (spec § 5) ─── */

/* The Intro lines tab, as objects.
 *
 * Deliberately stricter than readTextRows. The two mistakes this file exists to prevent
 * are both silent if you only warn about them:
 *
 *   - A gender column means the tab was built as a copy of the conclusion tab. Intro lines
 *     are keyed on the mechanism alone; a gendered export would give two rows per key and
 *     whichever landed last would win, invisibly halving the copy.
 *   - A flat-outcome row means someone implemented 26 lines. Flat outcomes get a contact
 *     link and no report, so there is no title page for a teaser to sit on.
 *
 * Both throw, so the contradiction reaches a human instead of the generated module. */
export function readIntroRows(csvPath = INTRO_CSV) {
  const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8"));

  if (header.some((name) => name.trim().toLowerCase() === "gender")) {
    throw new Error(
      "The Intro lines tab has a gender column. Intro lines are keyed on the mechanism " +
        "alone — that is the one asymmetry against the conclusion texts. Re-export the tab " +
        "with 25 key-only rows.",
    );
  }

  const index = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Intro lines CSV is missing the "${name}" column`);
    return i;
  };

  const cols = {
    key: index("key"),
    id: index("ID"),
    nl: index("intro (NL)"),
    en: index("intro (EN)"),
  };

  return rows
    .filter((row) => row.length > 1 && row[cols.key])
    .map((row) => {
      const key = row[cols.key].trim();

      if (!INTRO_LINE_KEYS.includes(key)) {
        const why =
          key === "flat-low" || key === "flat-high"
            ? `"${key}" gets a contact link and no report, so it has no intro line. There ` +
              "are 25 lines, not 26 — if the source doc says otherwise, the doc and the " +
              "flat-routing decision contradict each other. Flag it rather than implementing both."
            : `"${key}" is not a conclusion key the scoring engine can produce.`;
        throw new Error(`Intro lines CSV has an unusable key: ${why}`);
      }

      return { key, id: row[cols.id], nl: row[cols.nl] ?? "", en: row[cols.en] ?? "" };
    });
}

/* Same omit-the-unwritten rule as the conclusion texts: a missing line falls through to the
 * component's visible placeholder rather than rendering a blank teaser.
 *
 * A missing CSV is not an error. The Intro lines tab does not exist in Alex's sheet yet, and
 * failing here would block `npm run build:nem` on copy nobody has written — so the module is
 * generated empty and every key shows its placeholder until the export lands. */
export function buildIntroLinesModule(csvPath = INTRO_CSV) {
  const exported = existsSync(csvPath);
  const rows = exported ? readIntroRows(csvPath) : [];

  const table = (locale) =>
    rows.filter((row) => row[locale].trim()).map((row) => [row.key, row[locale]]);

  const written = rows.filter((r) => r.nl.trim() || r.en.trim()).length;

  const provenance = exported
    ? ` * Coverage at generation: ${written} of ${INTRO_LINE_KEYS.length} lines written.`
    : " * The Intro lines tab has not been exported yet, so both tables are empty and every\n" +
      " * key falls through to the component's placeholder. Drop the CSV in and re-run.";

  const header = [
    "/* ─────────────────────────────────────────────────────────────────────────────",
    " * GENERATED FILE — do not edit here.",
    " *",
    " * The report title-page intro lines, generated from",
    " *   projects/nem-life/.claude/research/nem-intro-lines.csv",
    " * which is a CSV export of the Intro lines tab of Alex's sheet NEM_TEST_01_Default_texts.",
    " *",
    " * Regenerate with:  node tools/nem/build-conclusion-texts.js",
    " *",
    " * Keyed on the conclusion key ALONE — no gender. That is the one asymmetry against",
    " * nem-conclusion-texts.js, which is looked up on key + gender. There are 25 keys: the",
    " * 5 single mechanisms and the 20 directional duals. Neither flat outcome has one,",
    " * because both route to the contact link and never produce a report.",
    " *",
    provenance,
    " * ───────────────────────────────────────────────────────────────────────────── */",
  ].join("\n");

  return [
    header,
    "",
    renderTable("NL_INTRO", table("nl")),
    "",
    renderTable("EN_INTRO", table("en")),
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

  writeFileSync(INTRO_OUT, buildIntroLinesModule(), "utf8");
  console.log(`Wrote ${INTRO_OUT}`);
  if (existsSync(INTRO_CSV)) {
    const introRows = readIntroRows();
    const introWritten = introRows.filter((r) => r.nl.trim() || r.en.trim()).length;
    console.log(`${introWritten} of ${INTRO_LINE_KEYS.length} intro lines written.`);
  } else {
    console.log(
      `No Intro lines export at ${INTRO_CSV} — every intro line falls through to its placeholder.`,
    );
  }
}
