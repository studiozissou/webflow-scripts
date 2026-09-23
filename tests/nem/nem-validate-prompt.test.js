/**
 * The validator is the last thing between Alex's Notion page and every report /verify
 * writes. It refuses a publish that lost a section, changed length wildly (a half paste),
 * grew a new "[NO VARIANT YET" gap, or stopped asking for JSON — Parse Report would then
 * reject every report. Alex reads the reasons in the page's status callout, so they must
 * name the problem.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validatePrompt } from "../../tools/nem/validate-prompt.js";
import { normalisePrompt } from "../../tools/nem/notion-to-prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, "..", "..", "projects", "nem-life", ".claude", "backend");
const prompt = normalisePrompt(
  readFileSync(path.join(BACKEND, "changesets", "nem-provisional-runtime-prompt", "system-prompt.txt"), "utf8"),
);

const KNOWN_GAP = "Male, age 50+ years: [NO VARIANT YET";

/* A small prompt that carries every required heading and nothing else. */
const minimal = [
  "# Introduction",
  "Return a JSON object.",
  "# Layer 1 - Editorial frameworks",
  ...["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"].map((n) => `## ${n} - Section`),
  "# Layer 2 - NEM Method protection mechanisms",
  "## 2.1 - Origin",
  "## 2.2 - Protection mechanisms",
  "### Fear (NL: Angst)",
  "### Self-rejection (NL: Zelfafwijzing)",
  "### False hope (NL: Valse hoop)",
  "### False power (NL: Valse macht)",
  "### Emotional numbing (NL: Emotionele verdoving)",
  `${KNOWN_GAP} — fragment]`,
  "## 2.3 - Common profile sequences",
  "",
].join("\n");

const drop = (text, line) => text.split("\n").filter((l) => l !== line).join("\n");

describe("the real prompt passes", () => {
  test("against itself as the active version", () => {
    const out = validatePrompt(prompt, { activeChars: prompt.length });
    assert.deepEqual(out.reasons, []);
    assert.equal(out.ok, true);
    assert.equal(out.chars, prompt.length);
    assert.equal(out.headings, 23);
  });

  test("with no active version at all (the first publish)", () => {
    assert.equal(validatePrompt(prompt).ok, true);
  });

  test("the minimal fixture passes too", () => {
    assert.deepEqual(validatePrompt(minimal).reasons, []);
  });
});

describe("required headings", () => {
  test("a missing mechanism is named", () => {
    const out = validatePrompt(drop(minimal, "### False power (NL: Valse macht)"));
    assert.equal(out.ok, false);
    assert.match(out.reasons.join("\n"), /### False power \(NL: Valse macht\)/);
  });

  test("every missing heading is named in one reason", () => {
    const text = drop(drop(drop(minimal, "# Introduction"), "## 1.3 - Section"), "## 2.3 - Common profile sequences");
    const out = validatePrompt(text);
    const missing = out.reasons.find((r) => /heading/i.test(r));
    assert.ok(missing, out.reasons.join("\n"));
    for (const h of ["# Introduction", "## 1.3", "## 2.3"]) assert.ok(missing.includes(h), `${h} not named: ${missing}`);
  });

  test("a heading must be a line of its own, not text that mentions it", () => {
    const text = drop(minimal, "# Layer 2 - NEM Method protection mechanisms") + "See # Layer 2 below.\n";
    assert.match(validatePrompt(text).reasons.join("\n"), /# Layer 2/);
  });

  test("a mechanism heading must be exact — a renamed one does not count", () => {
    const text = minimal.replace("### Fear (NL: Angst)", "### Fear (NL: Bang)");
    assert.match(validatePrompt(text).reasons.join("\n"), /### Fear \(NL: Angst\)/);
  });

  test("## 1.1 needs its space, so ## 1.10 is not ## 1.1", () => {
    const text = minimal.replace("## 1.1 - Section", "## 1.10 - Section");
    assert.match(validatePrompt(text).reasons.join("\n"), /## 1\.1\b/);
  });
});

describe("length against the active version", () => {
  test("more than 30% shorter is refused, with both numbers and the percentage", () => {
    const text = prompt.slice(0, Math.floor(prompt.length * 0.6));
    const out = validatePrompt(text + "\n" + minimal, { activeChars: prompt.length });
    const reason = out.reasons.find((r) => /%/.test(r));
    assert.ok(reason, out.reasons.join("\n"));
    assert.ok(reason.includes(String(prompt.length)), reason);
    assert.ok(reason.includes(String(out.chars)), reason);
  });

  test("more than 30% longer is refused", () => {
    const out = validatePrompt(minimal, { activeChars: Math.floor(minimal.length / 1.5) });
    assert.equal(out.ok, false);
    assert.ok(out.reasons.some((r) => /%/.test(r)));
  });

  test("exactly 30% is allowed", () => {
    const text = minimal + "x".repeat(1300 - minimal.length);
    assert.equal(validatePrompt(text, { activeChars: 1000 }).ok, true);
    assert.equal(validatePrompt(text + "x", { activeChars: 1000 }).ok, false);
  });

  test("no active length means no length check", () => {
    for (const activeChars of [undefined, null, 0, -5, NaN, "66000"]) {
      assert.equal(validatePrompt(minimal, { activeChars }).ok, true, String(activeChars));
    }
  });
});

describe("[NO VARIANT YET markers", () => {
  test("the one known gap under Emotional numbing is allowed", () => {
    assert.equal(validatePrompt(minimal).ok, true);
    assert.equal((prompt.match(/\[NO VARIANT YET/g) ?? []).length, 1);
  });

  test("a new marker anywhere else is refused, quoting the line", () => {
    const text = minimal.replace("## 2.1 - Origin", "## 2.1 - Origin\nFemale: [NO VARIANT YET — still to write]");
    const out = validatePrompt(text);
    assert.equal(out.ok, false);
    assert.match(out.reasons.join("\n"), /Female: \[NO VARIANT YET — still to write\]/);
  });

  test("the known line moved under another heading is refused", () => {
    const text = drop(minimal, `${KNOWN_GAP} — fragment]`).replace("### Fear (NL: Angst)", `### Fear (NL: Angst)\n${KNOWN_GAP} — fragment]`);
    assert.equal(validatePrompt(text).ok, false);
  });

  test("the known line duplicated is refused", () => {
    const text = minimal.replace(`${KNOWN_GAP} — fragment]`, `${KNOWN_GAP} — fragment]\n${KNOWN_GAP} — again]`);
    const out = validatePrompt(text);
    assert.equal(out.ok, false);
    assert.match(out.reasons.join("\n"), /again/);
  });

  test("a second marker on the known line is refused", () => {
    const text = minimal.replace(`${KNOWN_GAP} — fragment]`, `${KNOWN_GAP} — fragment] [NO VARIANT YET`);
    assert.equal(validatePrompt(text).ok, false);
  });

  test("the quote is capped at 80 characters", () => {
    const long = "Female: [NO VARIANT YET " + "x".repeat(200);
    const out = validatePrompt(minimal.replace("## 2.1 - Origin", `## 2.1 - Origin\n${long}`));
    const reason = out.reasons.find((r) => r.includes("NO VARIANT"));
    assert.ok(reason.includes(long.slice(0, 80)));
    assert.ok(!reason.includes(long.slice(0, 81)));
  });

  test("filling in the known gap is fine", () => {
    assert.equal(validatePrompt(drop(minimal, `${KNOWN_GAP} — fragment]`)).ok, true);
  });
});

describe("JSON and emptiness", () => {
  test("a prompt that no longer mentions JSON is refused", () => {
    const out = validatePrompt(minimal.replace("Return a JSON object.", "Write a warm report."));
    assert.equal(out.ok, false);
    assert.match(out.reasons.join("\n"), /JSON/);
  });

  test("an empty page is refused with one plain reason", () => {
    for (const text of ["", "\n", "   \n\n", undefined, null]) {
      const out = validatePrompt(text);
      assert.equal(out.ok, false);
      assert.equal(out.reasons.length, 1);
      assert.match(out.reasons[0], /empty/i);
    }
  });
});

describe("reasons accumulate", () => {
  test("every broken rule is reported at once, so Alex fixes them in one pass", () => {
    const text = drop(minimal, "# Introduction").replace("Return a JSON object.", "Write.")
      + "Female: [NO VARIANT YET]\n";
    const out = validatePrompt(text, { activeChars: text.length * 3 });
    assert.equal(out.ok, false);
    assert.equal(out.reasons.length, 4, out.reasons.join("\n"));
  });

  test("chars and headings are reported on refusal too", () => {
    const out = validatePrompt("# Only\nno\n");
    assert.equal(out.chars, 10);
    assert.equal(out.headings, 1);
  });
});
