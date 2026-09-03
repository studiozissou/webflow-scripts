/**
 * Unit tests for the `Build HTML` Code node in the NEM Test `/verify` n8n workflow
 * (changeset: nem-report-webflow-template).
 *
 * The extraction trick from nem-report-parse.test.js, applied to a whole Code node:
 * the real jsCode is pulled out of the committed workflow snapshot and run against
 * fixtures, so the module under test and the node that runs live cannot drift.
 *
 * Build HTML no longer writes its own document. It fetches the published Webflow report
 * template (the design surface Alex edits), fills every `data-slot`, and hands PDFShift a
 * self-contained page. The fixture is the published page as it was captured; the
 * properties under test:
 *   - every dynamic slot is filled: first-name, date, intro-line, the five sections
 *   - a section becomes one <p> per blank-line-separated paragraph, carrying the class
 *     of the placeholder paragraph, so the Designer's paragraph styling survives
 *   - model prose goes through esc() — Christel's prose contains & and quotes
 *   - an empty intro line removes its whole block (the `data-slot-wrap` elements), not
 *     just the text — no empty rule, no stray spacer
 *   - the export is PDF-safe: no <script>, no lazy images, print rules and embedded
 *     fonts injected, fixed slots (logo, labels, disclaimer, site-url) untouched
 *   - a template missing a required slot throws rather than shipping placeholder copy
 *   - reportText is untouched: the plain-text alternative is model output only
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
const CHANGESET = path.join(BACKEND, "changesets", "nem-report-webflow-template");

const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-verify.workflow.json"), "utf8"));
const buildHtmlCode = snapshot.nodes.find((n) => n.name === "Build HTML").parameters.jsCode;

const TEMPLATE = readFileSync(path.join(__dirname, "fixtures", "report-pdf-template.html"), "utf8");

/** The five validated report sections, as Parse Report emits them. */
const report = {
  opening: "Anna, je hebt de test ingevuld en dat vraagt eerlijkheid.",
  reaction: "Wanneer de spanning oploopt, trek je je terug.\n\nDaarna volgt de tweede laag.",
  origin: "Dit patroon ontstaat vaak vroeg.",
  cost: "Het kost je nabijheid.",
  closing: "Wat geleerd is, staat niet vast.",
};

/** Profile row as Validate Token spreads it. Overridable per case. */
const profile = (overrides = {}) => ({
  token: "t-123",
  locale: "nl",
  firstName: "Sjoerd d'Anjou",
  introLine: "Ik doe eigenlijk altijd mijn best - toch voel ik me nooit goed genoeg",
  ...overrides,
});

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * Runs the node's real jsCode the way n8n does: `$` resolves upstream nodes, `$json` is
 * the incoming item, `this.helpers.httpRequest` fetches the template. Returns the single
 * output item's json plus the requests the node made.
 */
async function runBuildHtml({ p = profile(), r = report, template = TEMPLATE } = {}) {
  const $ = (name) => {
    assert.equal(name, "Validate Token", `Build HTML referenced unexpected node: ${name}`);
    return { first: () => ({ json: p }) };
  };
  const requests = [];
  const ctx = {
    helpers: {
      httpRequest: async (opts) => {
        requests.push(opts);
        return template;
      },
    },
  };
  const fn = new AsyncFunction("$", "$json", buildHtmlCode);
  const out = await fn.call(ctx, $, { report: r });
  assert.equal(out.length, 1);
  return { ...out[0].json, requests };
}

const slot = (html, name) => {
  const m = html.match(new RegExp(`<(\\w+)\\b[^>]*data-slot="${name}"[^>]*>([\\s\\S]*?)</\\1>`));
  return m ? m[2] : null;
};

describe("the changeset file cannot drift from the snapshot", () => {
  test("build-html.jsCode.js is byte-identical to the committed node", () => {
    const file = readFileSync(path.join(CHANGESET, "build-html.jsCode.js"), "utf8");
    assert.equal(file, buildHtmlCode + "\n");
  });
});

describe("the template is fetched from the published Webflow page", () => {
  test("one GET to the report template URL, as text", async () => {
    const { requests } = await runBuildHtml();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "GET");
    assert.match(requests[0].url, /^https:\/\/[^/]+\/report-pdf-template$/);
    assert.equal(requests[0].json, false);
  });
});

describe("the cover slots", () => {
  test("first-name carries the escaped first name", async () => {
    const { html } = await runBuildHtml({ p: profile({ firstName: "Sjoerd <d'Anjou> & co" }) });
    assert.equal(slot(html, "first-name"), "Sjoerd &lt;d'Anjou&gt; &amp; co");
  });

  test("date is today in Dutch long form", async () => {
    const { html } = await runBuildHtml();
    const today = new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Amsterdam",
    }).format(new Date());
    assert.equal(slot(html, "date"), today);
    assert.match(today, /^\d{1,2} [a-z]+ \d{4}$/);
  });

  test("intro-line carries the escaped, trimmed intro line", async () => {
    const line = "Angst & hoop, <soms> beide";
    const { html } = await runBuildHtml({ p: profile({ introLine: `  ${line}\n` }) });
    assert.equal(slot(html, "intro-line"), "Angst &amp; hoop, &lt;soms&gt; beide");
    assert.ok(html.includes('data-slot-wrap="intro-line"'), "the intro block stays when the line is set");
  });
});

describe("an absent intro line removes the whole block — no empty rule, no stray spacer", () => {
  for (const [label, value] of [
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["whitespace-only", "   \n\t "],
  ]) {
    test(`introLine: ${label}`, async () => {
      const p = profile();
      delete p.introLine;
      if (value !== undefined) p.introLine = value;
      const { html } = await runBuildHtml({ p });
      assert.ok(!html.includes('data-slot="intro-line"'), "no intro slot may remain");
      assert.ok(!html.includes('data-slot-wrap="intro-line"'), "no intro wrapper or spacer may remain");
      assert.ok(!html.includes("hero_subheading-wrap"), "the styled wrapper is gone, not emptied");
    });
  }
});

describe("the five sections", () => {
  test("render in order as paragraphs carrying the placeholder's class, escaped", async () => {
    const { html } = await runBuildHtml({
      r: { ...report, origin: "Vroeg & <vaak>." },
    });
    let last = -1;
    for (const key of ["opening", "reaction", "origin", "cost", "closing"]) {
      const idx = html.indexOf(`data-slot="${key}"`);
      assert.ok(idx !== -1, `section ${key} missing`);
      assert.ok(idx > last, `section ${key} out of order`);
      last = idx;
    }
    assert.ok(html.includes('<p class="text-size-medium">Vroeg &amp; &lt;vaak&gt;.</p>'));
    assert.ok(!html.includes("Lorem ipsum"), "placeholder copy must not survive");
  });

  test("a blank line in the prose becomes a new paragraph, a single newline a <br>", async () => {
    const { html } = await runBuildHtml({
      r: { ...report, reaction: "Eerste alinea.\nzelfde alinea.\n\nTweede alinea." },
    });
    const body = slot(html, "reaction");
    assert.equal(
      body,
      '<p class="text-size-medium">Eerste alinea.<br>zelfde alinea.</p><p class="text-size-medium">Tweede alinea.</p>',
    );
  });

  test("the section slot lives on a wrapper div, so sibling paragraphs can be spaced", async () => {
    const { html } = await runBuildHtml();
    assert.match(html, /<div data-slot="reaction"><p class="text-size-medium">/);
    assert.match(html, /div\[data-slot\]\s*>\s*p\s*\+\s*p\s*\{[^}]*margin-top/);
  });
});

describe("the export is PDF-safe", () => {
  test("no <script> survives — the WebFont loader, jQuery and init.js are all gone", async () => {
    const { html } = await runBuildHtml();
    assert.ok(!/<script\b/i.test(html), "script tag found in the export");
  });

  test("images load eagerly — PDFShift does not scroll", async () => {
    const { html } = await runBuildHtml();
    assert.ok(!/loading="lazy"/.test(html));
  });

  test("the brand fonts are embedded through a render-blocking stylesheet", async () => {
    const { html } = await runBuildHtml();
    assert.match(html, /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/studiozissou\/webflow-scripts@[0-9a-f]{7,40}\/projects\/nem-life\/src\/report-fonts\.css">/);
  });

  test("print rules: A4 page, closing and footer blocks do not split, headings stay with their text, no orphan lines, backgrounds print", async () => {
    const { html } = await runBuildHtml();
    assert.match(html, /@page\s*\{[^}]*size:\s*A4/);
    assert.match(html, /@page\s*:first\s*\{[^}]*margin-top:\s*0\b/);
  });

  test("the olive header bleeds past every page edge and the page never overflows sideways", async () => {
    /* The bleed is 800px wide on a 794px page: the 3px overflow made Chrome shrink the page
     * to fit, and the sub-pixel scale left hairlines at the top and right (2026-09-02). */
    const { html } = await runBuildHtml();
    assert.match(html, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/);
    assert.match(html, /\.report_header \.report_bg-olive\s*\{[^}]*top:\s*-2px[^}]*left:\s*-50vw[^}]*right:\s*-50vw/);
    assert.match(html, /\.block-conclusion\s*\{[^}]*break-inside:\s*avoid/);
    assert.match(html, /\.report_block\.is-disclaimer[^{]*\{[^}]*break-inside:\s*avoid/);
    assert.match(html, /h2,\s*h2 \+ div\s*\{[^}]*break-after:\s*avoid/);
    assert.match(html, /p\s*\{[^}]*orphans:\s*3;\s*widows:\s*3/);
    assert.match(html, /print-color-adjust:\s*exact/);
  });

  test("fixed slots are untouched: logo, labels, disclaimer, site-url", async () => {
    const { html } = await runBuildHtml();
    assert.ok(html.includes('data-slot="logo"'));
    assert.equal(slot(html, "label-opening"), "Wat je herkent");
    assert.equal(slot(html, "label-closing"), "Wat nu");
    assert.match(slot(html, "disclaimer"), /^Dit rapport is geen psychologische diagnose\./);
    assert.equal(slot(html, "site-url"), "nemmatters.com");
  });
});

describe("a template that lost a slot fails loudly", () => {
  for (const name of ["first-name", "date", "intro-line", "opening", "reaction", "origin", "cost", "closing"]) {
    test(`missing data-slot="${name}" throws naming the slot`, async () => {
      const broken = TEMPLATE.replace(`data-slot="${name}"`, 'data-slot="gone"');
      await assert.rejects(runBuildHtml({ template: broken }), new RegExp(`data-slot="${name}"`));
    });
  }

  test("a missing intro wrapper throws too — an empty line could not be removed cleanly", async () => {
    const broken = TEMPLATE.replaceAll('data-slot-wrap="intro-line"', "");
    await assert.rejects(runBuildHtml({ template: broken, p: profile({ introLine: "" }) }), /data-slot-wrap="intro-line"/);
  });
});

describe("everything else on the output item", () => {
  test("reportText is the plain-text alternative built from the five sections only", async () => {
    const out = await runBuildHtml();
    assert.equal(out.reportText, Object.values(report).join("\n\n"));
    assert.ok(!out.reportText.includes(profile().introLine));
  });

  test("the profile fields ride along, as /verify's later nodes expect", async () => {
    const out = await runBuildHtml();
    assert.equal(out.token, "t-123");
    assert.equal(out.locale, "nl");
    assert.equal(out.firstName, "Sjoerd d'Anjou");
  });
});
