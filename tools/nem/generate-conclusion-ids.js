#!/usr/bin/env node
/* Generate the 54-row conclusion ID sheet for NEM Test conclusion engine v2.
 *
 *   node tools/nem/generate-conclusion-ids.js
 *
 * Writes projects/nem-life/.claude/research/nem-conclusion-ids.csv, in the row order
 * of Alex's sheet (NEM_TEST_01_Default_texts) so the columns paste in line for line.
 * Alex's sheet is never written to directly — this produces a file to hand over.
 *
 * Rows are derived from the same functions the component calls at runtime, so the
 * sheet and the engine cannot drift.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { enumerateConclusionRows } from "../../projects/nem-life/src/nem-test-conclusion-ids.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(REPO_ROOT, "projects/nem-life/.claude/research/nem-conclusion-ids.csv");

const HEADER = ["gender", "type", "leading", "following", "key", "ID"];

/* Nothing generated here contains a comma or quote, but the sheet is handed to a
 * client — quote defensively so a future mechanism rename cannot corrupt the file. */
const cell = (value) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const rows = enumerateConclusionRows();

const csv = [
  HEADER.join(","),
  ...rows.map((r) => [r.gender, r.type, r.leading, r.following, r.key, r.id].map(cell).join(",")),
].join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${csv}\n`, "utf8");

console.log(`Wrote ${rows.length} rows to ${OUT}`);
