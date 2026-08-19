#!/usr/bin/env node
/* Generate the Intro lines tab for Alex's sheet NEM_TEST_01_Default_texts.
 *
 *   node tools/nem/generate-intro-line-ids.js
 *
 * Writes a 25-row CSV with the key, the ID and two empty copy columns. Paste it into a new
 * "Intro lines" tab; Christel fills `intro (NL)` and `intro (EN)`, then the tab is exported
 * back over projects/nem-life/.claude/research/nem-intro-lines.csv and picked up by
 * tools/nem/build-conclusion-texts.js.
 *
 * Same reasoning as generate-conclusion-ids.js: the rows come from the same functions the
 * component calls at runtime, so a line cannot be written against a key the engine cannot
 * produce — and nobody has to hand-count the twenty directional duals.
 *
 * 25 rows, not 26. Neither flat outcome appears, because both route to the contact link and
 * never produce a report to put a teaser on.
 *
 * Note the IDs have NO gender letter (`01-FR`, not `01F-FR`). Intro lines are keyed on the
 * mechanism alone — the one asymmetry against the conclusion texts.
 *
 * Output: projects/nem-life/.claude/research/nem-intro-lines-template.csv
 * Tests:  tests/nem/nem-conclusion-ids.test.js
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { enumerateIntroLineRows } from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(REPO_ROOT, "projects/nem-life/.claude/research/nem-intro-lines-template.csv");

/* Deliberately not the same column set as the conclusion tab. There is no gender column,
 * and its absence is load-bearing: a gendered export gives two rows per key, whichever
 * lands last wins, and half the copy disappears without a word. The generator refuses to
 * read such a file — see readIntroRows. */
const HEADER = ["type", "leading", "following", "key", "ID", "intro (NL)", "intro (EN)"];

/* Nothing generated here contains a comma or quote, but the sheet is handed to a
 * client — quote defensively so a future mechanism rename cannot corrupt the file. */
const cell = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const rows = enumerateIntroLineRows();

const csv = [
  HEADER.join(","),
  ...rows.map((r) => [r.type, r.leading, r.following, r.key, r.id, "", ""].map(cell).join(",")),
].join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${csv}\n`, "utf8");

console.log(`Wrote ${rows.length} rows to ${OUT}`);
