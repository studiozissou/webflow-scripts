/**
 * Unit tests for the `Build HTML` Code node in the NEM Test `/verify` n8n workflow
 * (changeset: nem-intro-line-plumbing).
 *
 * The extraction trick from nem-report-parse.test.js, applied to a whole Code node:
 * the real jsCode is pulled out of the committed workflow snapshot and run against
 * fixtures, so the module under test and the node that runs live cannot drift.
 *
 * The properties under test are the intro line's:
 *   - a populated introLine renders as <p class="intro"> between the <h1> and the
 *     opening section (the greeting line was removed by nem-prompt-input-contract §7f —
 *     the prompt owns the first name now)
 *   - it goes through esc() — Christel's prose contains & and quotes
 *   - '', null, undefined and whitespace-only lines render NOTHING — no empty <p>,
 *     no stray margin. This is what lets the plumbing ship before the copy exists.
 *   - the five model sections are unchanged in every case
 *   - reportText is untouched: the intro line is fixed editorial copy, not model output
 *
 * Byte-identity between the changeset files and the snapshot is asserted in
 * tests/nem/nem-prompt-input-contract.test.js, which superseded this changeset's copies
 * of Build HTML and Normalize.
 *
 * Run: node --test tests/nem/nem-build-html.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(__dirname, "..", "..", "projects", "nem-life", ".claude", "backend");

const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-verify.workflow.json"), "utf8"));
const buildHtmlCode = snapshot.nodes.find((n) => n.name === "Build HTML").parameters.jsCode;

/** The five validated report sections, as Parse Report emits them. */
const report = {
  opening: "Je hebt de test ingevuld en dat vraagt eerlijkheid.",
  reaction: "Wanneer de spanning oploopt, trek je je terug.",
  origin: "Dit patroon ontstaat vaak vroeg.",
  cost: "Het kost je nabijheid.",
  closing: "Er is een weg terug naar jezelf.",
};

/** Profile row as Validate Token spreads it. Overridable per case. */
const profile = (overrides = {}) => ({
  token: "t-123",
  locale: "nl",
  firstName: "Sjoerd d'Anjou",
  ...overrides,
});

/**
 * Runs the node's real jsCode the way n8n does: `$` resolves upstream nodes,
 * `$json` is the incoming item. Returns the single output item's json.
 */
function runBuildHtml({ p = profile(), r = report } = {}) {
  const $ = (name) => {
    assert.equal(name, "Validate Token", `Build HTML referenced unexpected node: ${name}`);
    return { first: () => ({ json: p }) };
  };
  const fn = new Function("$", "$json", buildHtmlCode);
  const out = fn($, { report: r });
  assert.equal(out.length, 1);
  return out[0].json;
}

describe("a populated intro line", () => {
  const line = "Je herkent jezelf misschien in dit patroon.";
  const html = () => runBuildHtml({ p: profile({ introLine: line }) }).html;

  test("renders as <p class=\"intro\"> between the <h1> and the opening section", () => {
    const out = html();
    const intro = out.indexOf('<p class="intro">' + line + "</p>");
    const h1 = out.indexOf("</h1>");
    const opening = out.indexOf("<p>" + report.opening + "</p>");
    assert.ok(intro !== -1, "intro paragraph missing");
    assert.ok(h1 !== -1 && opening !== -1);
    assert.ok(h1 < intro && intro < opening, "intro must sit between the h1 and the opening");
  });

  test("has the .intro style so the paragraph is not unstyled prose", () => {
    assert.match(html(), /\.intro\{[^}]*italic[^}]*\}/);
  });

  test("is trimmed — surrounding whitespace does not reach the markup", () => {
    const out = runBuildHtml({ p: profile({ introLine: `  ${line}\n` }) }).html;
    assert.ok(out.includes('<p class="intro">' + line + "</p>"));
  });
});

describe("the intro line is escaped through esc()", () => {
  test("& < > become entities", () => {
    const out = runBuildHtml({
      p: profile({ introLine: "Angst & hoop, <soms> beide > vaak" }),
    }).html;
    assert.ok(out.includes('<p class="intro">Angst &amp; hoop, &lt;soms&gt; beide &gt; vaak</p>'));
  });

  test("quotes pass through as text without breaking the markup", () => {
    /* esc() handles the characters that are dangerous in text content (& < >); quotes
     * are only dangerous in attributes, and the line lands in element text. The
     * assertion is that they arrive intact and the paragraph structure survives. */
    const line = `Christel zegt: "je bent er bijna", 's avonds`;
    const out = runBuildHtml({ p: profile({ introLine: line }) }).html;
    assert.ok(out.includes('<p class="intro">' + line + "</p>"));
  });
});

describe("an absent intro line renders nothing — no empty <p>, no stray margin", () => {
  for (const [label, value] of [
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["whitespace-only", "   \n\t "],
  ]) {
    test(`introLine: ${label}`, () => {
      const p = profile();
      if (value !== undefined) p.introLine = value;
      const out = runBuildHtml({ p }).html;
      assert.ok(!out.includes('class="intro"'), "no intro paragraph may render");
      /* The h1 flows straight into the opening section — nothing in between. */
      assert.ok(out.includes("</h1><p>" + report.opening + "</p>"));
    });
  }
});

describe("everything else is unchanged in every case", () => {
  for (const [label, p] of [
    ["with an intro line", profile({ introLine: "Een vaste openingszin." })],
    ["without one", profile()],
  ]) {
    test(label, () => {
      const out = runBuildHtml({ p });

      // The five sections render, in Alex's order, escaped.
      let last = -1;
      for (const key of ["opening", "reaction", "origin", "cost", "closing"]) {
        const idx = out.html.indexOf("<p>" + report[key] + "</p>");
        assert.ok(idx !== -1, `section ${key} missing from the html`);
        assert.ok(idx > last, `section ${key} out of order`);
        last = idx;
      }

      /* No greeting line: the prompt puts the first name once, inside opening (§7f). */
      assert.ok(!out.html.includes("Beste "));

      /* reportText is the plain-text alternative built from the five model sections.
       * The intro line is fixed editorial copy, not model output — it stays out. */
      assert.equal(
        out.reportText,
        Object.values(report).join("\n\n"),
      );
      assert.ok(!out.reportText.includes("Een vaste openingszin."));

      // The profile fields ride along on the output item, as /verify's later nodes expect.
      assert.equal(out.token, "t-123");
      assert.equal(out.locale, "nl");
    });
  }
});

describe("the EN locale", () => {
  test("intro line sits between the EN heading and the opening section", () => {
    const out = runBuildHtml({
      p: profile({ locale: "en", introLine: "You may recognise yourself here." }),
    }).html;
    const h1 = out.indexOf("Your NEM Test report");
    const intro = out.indexOf('<p class="intro">You may recognise yourself here.</p>');
    const opening = out.indexOf("<p>" + report.opening + "</p>");
    assert.ok(h1 !== -1 && intro !== -1 && opening !== -1);
    assert.ok(h1 < intro && intro < opening);
    assert.ok(!out.includes("Dear "));
  });
});
