/**
 * The provisional runtime prompt is Alex's 2026-08-31 capture with the editorial matter
 * stripped, by his own rule: header, corrections, change log, related documents, the
 * italic "function of this block" notes and the "Frequentie" lines never reach the API.
 * Everything clinical and every writing rule survives untouched.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuntimePrompt, CAPTURE_PATH, OUTPUT_PATH } from "../../tools/nem/build-runtime-prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const capture = readFileSync(path.join(ROOT, CAPTURE_PATH), "utf8");
const prompt = buildRuntimePrompt(capture);

describe("buildRuntimePrompt strips the editorial matter", () => {
  test("starts at the Introduction, so the capture header, corrections and change log are gone", () => {
    assert.ok(prompt.startsWith("# Introduction\n"));
    assert.doesNotMatch(prompt, /Corrections applied here/);
    assert.doesNotMatch(prompt, /^Change log:/m);
    assert.doesNotMatch(prompt, /^Related documents:/m);
    assert.doesNotMatch(prompt, /^Last update:/m);
    assert.doesNotMatch(prompt, /pasted by Will/);
  });

  test("drops every Frequentie line", () => {
    assert.doesNotMatch(prompt, /Frequentie \(redactioneel/);
  });

  test("drops the italic function-of-this-block notes", () => {
    assert.doesNotMatch(prompt, /^\*Function of this block:/m);
  });

  test("never leaves three blank lines in a row where something was removed", () => {
    assert.doesNotMatch(prompt, /\n{4,}/);
  });
});

describe("buildRuntimePrompt keeps the prompt itself intact", () => {
  test("the JSON contract Parse Report depends on is still there", () => {
    assert.match(prompt, /Return a single JSON object with exactly these five keys/);
    for (const k of ["opening", "reaction", "origin", "cost", "closing"]) {
      assert.match(prompt, new RegExp("`" + k + "`"));
    }
    assert.match(prompt, /Return nothing outside the JSON object/);
  });

  test("both layers and all five mechanisms survive", () => {
    assert.match(prompt, /^# Layer 1 - Editorial frameworks/m);
    assert.match(prompt, /^# Layer 2 - NEM Method protection mechanisms/m);
    for (const h of ["Fear", "Self-rejection", "False hope", "False power", "Emotional numbing"]) {
      assert.match(prompt, new RegExp("^### " + h + " \\(NL:", "m"));
    }
    assert.match(prompt, /^## 2\.3 - Common profile sequences/m);
  });

  test("the italic block labels are structure, not notes, and stay", () => {
    assert.match(prompt, /^\*Thought \(NL: Gedachte\)\*/m);
    assert.match(prompt, /^\*Behaviour \(NL: Gedrag\)\*/m);
  });

  test("the clinical prose is byte-for-byte the capture's", () => {
    const sample = "Je herkent bij jezelf dat je niet veel lijkt te voelen.";
    assert.ok(capture.includes(sample));
    assert.ok(prompt.includes(sample));
  });
});

describe("the changeset file cannot drift from the builder", () => {
  test("system-prompt.txt is byte-identical to the build output", () => {
    const file = readFileSync(path.join(ROOT, OUTPUT_PATH), "utf8");
    assert.equal(file, prompt);
  });
});
