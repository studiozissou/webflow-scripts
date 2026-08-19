/* Tests for the report JSON validator.
 *
 * `Parse Report` is a gate on the live report path: anything it rejects means a user gets
 * nothing. So it has to be strict enough to catch a genuinely broken response and lenient
 * enough not to bin a usable one over formatting.
 *
 * The same source is unit-tested here and pasted into the n8n Code node, so the thing under
 * test is the thing that runs. There is deliberately no repair pass — re-asking the model to
 * fix its own JSON doubles latency and cost on the path that is already misbehaving, and the
 * failure rate is currently unknown. The log exists to find that out first.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  REPORT_KEYS,
  FAILURE_REASONS,
  extractText,
  parseReport,
} from "../../projects/nem-life/src/nem-report-parse.js";

/* An Anthropic Messages response, shaped like the live Generate Report output. */
const response = (text, stopReason = "end_turn") => ({
  model: "claude-opus-4-8",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text }],
  stop_reason: stopReason,
});

const validReport = {
  opening: "Je hebt de test ingevuld en dat vraagt eerlijkheid.",
  reaction: "Wanneer de spanning oploopt, trek je je terug.",
  origin: "Dit patroon ontstaat vaak vroeg.",
  cost: "Het kost je nabijheid.",
  closing: "Er is een weg terug naar jezelf.",
};

const valid = (overrides = {}) => response(JSON.stringify({ ...validReport, ...overrides }));

describe("the contract", () => {
  test("is exactly the five keys, in Alex's order", () => {
    assert.deepEqual(REPORT_KEYS, ["opening", "reaction", "origin", "cost", "closing"]);
  });

  test("failure reasons are the four the spec names", () => {
    assert.deepEqual(
      Object.values(FAILURE_REASONS).sort(),
      ["empty-value", "missing-key", "not-json", "truncated"],
    );
  });
});

describe("extractText", () => {
  test("pulls the text out of a well-formed response", () => {
    assert.equal(extractText(response("hello")), "hello");
  });

  test("returns null when content is empty — no text to parse", () => {
    assert.equal(extractText({ content: [] }), null);
  });

  test("returns null when the block is not a text block", () => {
    assert.equal(extractText({ content: [{ type: "tool_use", id: "x" }] }), null);
  });

  test("survives a response with no content field at all", () => {
    assert.equal(extractText({}), null);
    assert.equal(extractText(null), null);
  });

  test("concatenates multiple text blocks rather than dropping any", () => {
    /* Streaming or a long answer can arrive split. Taking only content[0] would silently
     * truncate the JSON and produce a confusing not-json failure. */
    const split = { content: [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }] };
    assert.equal(extractText(split), '{"a":1}');
  });
});

describe("a valid report passes", () => {
  test("returns the five fields", () => {
    const out = parseReport(valid());
    assert.equal(out.valid, true);
    assert.deepEqual(out.report, validReport);
  });

  test("extra keys are ignored, not rejected", () => {
    /* Rejecting a report that is otherwise complete because the model added a field would
     * send the user nothing over something harmless. */
    const out = parseReport(response(JSON.stringify({ ...validReport, extra: "ignored" })));
    assert.equal(out.valid, true);
    assert.deepEqual(Object.keys(out.report), REPORT_KEYS);
  });

  test("surrounding whitespace is tolerated", () => {
    assert.equal(parseReport(response(`\n\n  ${JSON.stringify(validReport)}  \n`)).valid, true);
  });

  test("a fenced code block is unwrapped rather than failed", () => {
    /* The prompt asks for bare JSON, but models wrap it in ``` often enough that binning
     * those responses would generate false failures — and an email to Alex for each. This
     * is tolerant parsing, not a repair pass: no second model call. */
    const fenced = "```json\n" + JSON.stringify(validReport) + "\n```";
    assert.equal(parseReport(response(fenced)).valid, true);
  });

  test("a bare ``` fence with no language works too", () => {
    const fenced = "```\n" + JSON.stringify(validReport) + "\n```";
    assert.equal(parseReport(response(fenced)).valid, true);
  });

  test("prose values containing quotes and newlines survive intact", () => {
    const tricky = { ...validReport, reaction: 'Hij zei: "\'t is goed."\n\nEn toen zweeg hij.' };
    const out = parseReport(response(JSON.stringify(tricky)));
    assert.equal(out.valid, true);
    assert.equal(out.report.reaction, tricky.reaction);
  });
});

describe("truncated — checked before parsing, because the reason is more useful", () => {
  test("stop_reason max_tokens is truncated, not not-json", () => {
    /* Truncated JSON also fails to parse, but "unexpected end of input" tells you nothing
     * about what to change. This says: raise max_tokens or shorten the prompt. */
    const cut = response('{"opening":"Je hebt de test inge', "max_tokens");
    const out = parseReport(cut);
    assert.equal(out.valid, false);
    assert.equal(out.reason, FAILURE_REASONS.TRUNCATED);
  });

  test("max_tokens wins even when the JSON happens to be complete", () => {
    /* Landing exactly on the limit with valid JSON means content was still cut short —
     * the closing section is likely missing prose even if the shape is right. */
    const out = parseReport({ ...valid(), stop_reason: "max_tokens" });
    assert.equal(out.valid, false);
    assert.equal(out.reason, FAILURE_REASONS.TRUNCATED);
  });
});

describe("not-json", () => {
  test("prose instead of JSON", () => {
    /* This is exactly what the live TEST MODE stub returned before this slice. */
    const out = parseReport(response("TESTRAPPORT / TEST REPORT\n\nDit is een test."));
    assert.equal(out.valid, false);
    assert.equal(out.reason, FAILURE_REASONS.NOT_JSON);
  });

  test("an empty response", () => {
    assert.equal(parseReport(response("")).reason, FAILURE_REASONS.NOT_JSON);
  });

  test("no text block at all", () => {
    assert.equal(parseReport({ content: [], stop_reason: "end_turn" }).reason, FAILURE_REASONS.NOT_JSON);
  });

  test("valid JSON that is an array, not an object", () => {
    assert.equal(parseReport(response("[1,2,3]")).reason, FAILURE_REASONS.NOT_JSON);
  });

  test("valid JSON that is a bare string", () => {
    assert.equal(parseReport(response('"just a string"')).reason, FAILURE_REASONS.NOT_JSON);
  });

  test("valid JSON that is null", () => {
    /* typeof null === "object" — the classic way this check gets written wrong. */
    assert.equal(parseReport(response("null")).reason, FAILURE_REASONS.NOT_JSON);
  });

  test("valid JSON that is a number", () => {
    assert.equal(parseReport(response("42")).reason, FAILURE_REASONS.NOT_JSON);
  });
});

describe("missing-key", () => {
  test("one key absent", () => {
    const { closing, ...rest } = validReport;
    const out = parseReport(response(JSON.stringify(rest)));
    assert.equal(out.reason, FAILURE_REASONS.MISSING_KEY);
  });

  test("names which keys are missing, so the log is actionable", () => {
    const out = parseReport(response(JSON.stringify({ opening: "x" })));
    assert.match(out.detail, /reaction/);
    assert.match(out.detail, /closing/);
    assert.doesNotMatch(out.detail, /opening/);
  });

  test("an empty object reports missing rather than empty", () => {
    /* Nothing is present, so "missing" is the true story; "empty-value" would imply the
     * key arrived and the prose did not. */
    assert.equal(parseReport(response("{}")).reason, FAILURE_REASONS.MISSING_KEY);
  });
});

describe("empty-value", () => {
  test("an empty string", () => {
    assert.equal(parseReport(valid({ origin: "" })).reason, FAILURE_REASONS.EMPTY_VALUE);
  });

  test("whitespace only — visually empty in the PDF", () => {
    assert.equal(parseReport(valid({ origin: "   \n\t " })).reason, FAILURE_REASONS.EMPTY_VALUE);
  });

  test("a non-string value", () => {
    assert.equal(parseReport(valid({ cost: 42 })).reason, FAILURE_REASONS.EMPTY_VALUE);
  });

  test("null", () => {
    assert.equal(parseReport(valid({ cost: null })).reason, FAILURE_REASONS.EMPTY_VALUE);
  });

  test("names the offending key", () => {
    assert.match(parseReport(valid({ cost: "" })).detail, /cost/);
  });
});

describe("failures carry what the log needs", () => {
  test("every failure has a reason and a detail string", () => {
    const failures = [
      response("nope"),
      response(JSON.stringify({ opening: "x" })),
      valid({ cost: "" }),
      response("{", "max_tokens"),
    ].map(parseReport);

    for (const f of failures) {
      assert.equal(f.valid, false);
      assert.ok(Object.values(FAILURE_REASONS).includes(f.reason), `bad reason: ${f.reason}`);
      assert.equal(typeof f.detail, "string");
      assert.ok(f.detail.length > 0);
    }
  });

  test("the raw response is carried through for diagnosis", () => {
    const out = parseReport(response("not json at all"));
    assert.match(out.raw, /not json at all/);
  });

  test("raw is capped so one bad response cannot blow up the Data Table row", () => {
    const out = parseReport(response("x".repeat(9000)));
    assert.ok(out.raw.length <= 2000, `raw was ${out.raw.length} chars`);
  });

  test("a valid report carries no failure fields", () => {
    const out = parseReport(valid());
    assert.equal(out.reason, undefined);
  });
});

describe("the pasted n8n node runs the same logic as this module", () => {
  /* The validator necessarily exists twice: once here, once inside the Parse Report Code
   * node, because n8n cannot import from the repo. Two copies drift — that is the whole
   * reason the workflow drift check exists — so rather than eyeballing them, extract the
   * node's real source from the committed snapshot and run it against the same fixtures.
   * If someone edits the node in the n8n UI and not the module, this fails. */
  const snapshot = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, "../../projects/nem-life/.claude/backend/nem-verify.workflow.json"),
      "utf8",
    ),
  );
  const parseNode = snapshot.nodes.find((n) => n.name === "Parse Report");

  test("the Parse Report node exists in the committed snapshot", () => {
    assert.ok(parseNode, "no Parse Report node — has the gate been removed from live?");
  });

  /* Everything above the n8n-specific tail is portable JS. */
  const source = parseNode.parameters.jsCode.split("const result = parseReport(")[0];
  const nodeParseReport = new Function(`${source}\nreturn parseReport;`)();

  const cases = [
    ["a valid report", valid(), { valid: true }],
    ["prose", response("TESTRAPPORT / TEST REPORT"), { reason: FAILURE_REASONS.NOT_JSON }],
    ["an array", response("[1,2]"), { reason: FAILURE_REASONS.NOT_JSON }],
    ["null", response("null"), { reason: FAILURE_REASONS.NOT_JSON }],
    ["a missing key", response(JSON.stringify({ opening: "x" })), { reason: FAILURE_REASONS.MISSING_KEY }],
    ["an empty value", valid({ cost: "  " }), { reason: FAILURE_REASONS.EMPTY_VALUE }],
    ["a truncated response", response("{", "max_tokens"), { reason: FAILURE_REASONS.TRUNCATED }],
    ["a fenced block", response("```json\n" + JSON.stringify(validReport) + "\n```"), { valid: true }],
  ];

  for (const [label, input, expected] of cases) {
    test(`agrees with the module on ${label}`, () => {
      const mine = parseReport(input);
      const theirs = nodeParseReport(input);
      assert.equal(theirs.valid, mine.valid, "valid flag differs");
      assert.equal(theirs.reason, mine.reason, "reason differs");
      if (expected.valid) assert.deepEqual(theirs.report, mine.report);
      else assert.equal(theirs.reason, expected.reason);
    });
  }
});

describe("it never throws — a crash in the gate is worse than a rejection", () => {
  test("on undefined, null and junk input", () => {
    for (const input of [undefined, null, 0, "", [], { content: null }, { content: [{}] }]) {
      const out = parseReport(input);
      assert.equal(out.valid, false, `expected invalid for ${JSON.stringify(input)}`);
      assert.ok(out.reason, "expected a reason");
    }
  });
});
