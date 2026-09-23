/**
 * Publish Prompt: Alex presses a button on the Notion runtime page, n8n reads the page,
 * serialises and validates it, and writes a new active row to nem_runtime_config that
 * /verify reads for the next report. A refusal writes nothing and says why in the page's
 * status callout. These tests run the Code nodes' real source from the committed snapshot.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalisePrompt } from "../../tools/nem/notion-to-prompt.js";
import { MODULE_PATHS, buildSerialiseCode, moduleBody } from "../../tools/nem/build-publish-prompt.js";
import { SNAPSHOT_FIELDS } from "../../tools/nem/check-workflow-drift.js";
import { flattenBlocks, simplifyBlocks, segment } from "./helpers/prompt-to-notion-blocks.js";
import { runCodeNode, targetsOf } from "./helpers/n8n-workflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const BACKEND = path.join(ROOT, "projects", "nem-life", ".claude", "backend");
const CHANGESET = path.join(BACKEND, "changesets", "nem-publish-prompt-v1");

const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-publish-prompt.workflow.json"), "utf8"));
const nodeNamed = (name) => snapshot.nodes.find((n) => n.name === name);
const codeOf = (name) => nodeNamed(name).parameters.jsCode;
const out = (name, index) => targetsOf(snapshot, name, index);

const setNodeText = readFileSync(path.join(BACKEND, "changesets/nem-provisional-runtime-prompt/system-prompt.txt"), "utf8");
const fixture = JSON.parse(readFileSync(path.join(BACKEND, "fixtures", "notion-runtime-prompt.blocks.json"), "utf8"));
const pageBlocks = () => simplifyBlocks(flattenBlocks(structuredClone(fixture)));
const promptText = normalisePrompt(setNodeText);

const [notionSource, validateSource] = MODULE_PATHS.map((p) => readFileSync(path.join(ROOT, p), "utf8"));
const runNode = (name, sources) => runCodeNode(codeOf(name), sources, { label: name });

const serialise = ({ blocks = pageBlocks(), versions = [{}] } = {}) =>
  runNode("Serialise", {
    "Fetch Notion Blocks": blocks,
    "Load Prompt Versions": versions,
    Config: [{ pageId: "399c706b-69c0-80ea-b095-f89476b4fa21", key: "report_prompt" }],
  });

const row = (version, active, chars, key = "report_prompt") => ({ key, version, active, chars, headings: 23, text: "…" });

describe("the snapshot", () => {
  test("is a normalised workflow named NEM Test — Publish Prompt", () => {
    assert.equal(snapshot.name, "NEM Test — Publish Prompt");
    assert.deepEqual(Object.keys(snapshot).sort(), [...SNAPSHOT_FIELDS].sort());
    assert.deepEqual(snapshot.settings, { executionOrder: "v1" });
  });

  test("every connection points at a node that exists", () => {
    const names = new Set(snapshot.nodes.map((n) => n.name));
    for (const [from, { main }] of Object.entries(snapshot.connections)) {
      assert.ok(names.has(from), from);
      for (const c of main.flat()) assert.ok(names.has(c.node), `${from} → ${c.node}`);
    }
  });

  test("the chain runs Webhook → Config → Fetch Notion Blocks → Load Prompt Versions → Serialise → Valid?", () => {
    assert.deepEqual(out("Webhook", 0), ["Config"]);
    assert.deepEqual(out("Config", 0), ["Fetch Notion Blocks"]);
    assert.deepEqual(out("Fetch Notion Blocks", 0), ["Load Prompt Versions"]);
    assert.deepEqual(out("Load Prompt Versions", 0), ["Serialise"]);
    assert.deepEqual(out("Serialise", 0), ["Valid?"]);
  });

  test("Load Prompt Versions runs once however many blocks arrive, and emits on an empty table", () => {
    const n = nodeNamed("Load Prompt Versions");
    assert.equal(n.parameters.dataTableId.cachedResultName, "nem_runtime_config");
    assert.ok(!JSON.stringify(snapshot).includes("REPLACE_"), "a placeholder is left in the workflow");
    assert.equal(n.executeOnce, true);
    assert.equal(n.alwaysOutputData, true);
    assert.equal(n.parameters.filters.conditions[0].keyValue, "={{ $('Config').first().json.key }}");
  });

  test("Config points at Alex's production runtime page", () => {
    const values = Object.fromEntries(nodeNamed("Config").parameters.assignments.assignments.map((a) => [a.name, a.value]));
    assert.deepEqual(values, { pageId: "399c706b-69c0-80ea-b095-f89476b4fa21", key: "report_prompt" });
  });
});

describe("Serialise carries the tested modules verbatim", () => {
  test("notion-to-prompt.js", () => {
    assert.ok(codeOf("Serialise").includes(moduleBody(notionSource)));
  });

  test("validate-prompt.js", () => {
    assert.ok(codeOf("Serialise").includes(moduleBody(validateSource)));
  });

  test("the builder reproduces the node exactly", () => {
    assert.equal(codeOf("Serialise"), buildSerialiseCode(notionSource, validateSource));
  });

  test("serialise.jsCode.js is byte-identical to the node", () => {
    assert.equal(readFileSync(path.join(CHANGESET, "serialise.jsCode.js"), "utf8"), codeOf("Serialise") + "\n");
  });
});

describe("Serialise, run on the page", () => {
  test("the first publish of the real page is accepted as v1 and stores the normalised prompt", () => {
    const r = serialise();
    assert.deepEqual(r.reasons, []);
    assert.equal(r.ok, true);
    assert.equal(r.version, 1);
    assert.equal(r.previousVersion, null);
    assert.equal(r.text, promptText);
    assert.equal(r.chars, promptText.length);
    assert.equal(r.headings, 23);
    assert.equal(r.key, "report_prompt");
    assert.equal(r.executionId, "77");
    assert.equal(r.calloutId, fixture.find((b) => b.type === "callout").id);
    assert.ok(!Number.isNaN(Date.parse(r.publishedAt)));
  });

  test("the raw API shape works too, in case the Notion node stops simplifying", () => {
    assert.equal(serialise({ blocks: flattenBlocks(structuredClone(fixture)) }).text, promptText);
  });

  test("the next version follows the highest row, active or not", () => {
    const r = serialise({ versions: [row(3, true, promptText.length), row(5, false, 10), row(4, "false", 10)] });
    assert.equal(r.ok, true);
    assert.equal(r.version, 6);
    assert.equal(r.previousVersion, 3);
  });

  test("an active v3 of very different length still publishes, carrying the length warning", () => {
    const r = serialise({ versions: [row(2, false, 20000), row(3, true, 20000)] });
    assert.equal(r.ok, true);
    assert.deepEqual(r.reasons, []);
    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0], /20000/);
    assert.match(r.warnings[0], new RegExp(String(promptText.length)));
    assert.equal(r.previousVersion, 3);
  });

  test("a clean publish carries no warnings", () => {
    assert.deepEqual(serialise().warnings, []);
  });

  test("a serialiser error leaves the warnings list empty, not missing", () => {
    const blocks = [...structuredClone(fixture), { object: "block", id: "q1", type: "quote", has_children: false, quote: { rich_text: [] } }];
    assert.deepEqual(serialise({ blocks }).warnings, []);
  });

  test("with two active rows, the higher version is the one compared against", () => {
    const r = serialise({ versions: [row(3, true, 20000), row(4, true, promptText.length)] });
    assert.equal(r.ok, true);
    assert.equal(r.previousVersion, 4);
  });

  test("rows under another key are ignored", () => {
    const r = serialise({ versions: [row(9, true, 10, "other_setting")] });
    assert.equal(r.ok, true);
    assert.equal(r.version, 1);
    assert.equal(r.previousVersion, null);
  });

  test("a page without the status callout is refused", () => {
    const r = serialise({ blocks: pageBlocks().filter((b) => b.type !== "callout") });
    assert.equal(r.ok, false);
    assert.ok(r.reasons.includes("no status callout on the page"), r.reasons.join("; "));
    assert.equal(r.calloutId, null);
  });

  test("an unsupported block becomes a refusal, not a crash", () => {
    const blocks = pageBlocks();
    blocks.splice(5, 0, { object: "block", id: "q1", type: "quote", parent_id: "p", has_children: false, rich_text: [segment("x")] });
    const r = serialise({ blocks });
    assert.equal(r.ok, false);
    assert.deepEqual(r.reasons, ["Unsupported block type: quote"]);
    assert.equal(r.text, "");
  });

  test("a page that lost a section is refused, naming it", () => {
    const blocks = pageBlocks().filter((b) => !(b.type === "heading_3" && /False power/.test(b.rich_text[0].text.content)));
    const r = serialise({ blocks });
    assert.equal(r.ok, false);
    assert.match(r.reasons.join("; "), /### False power \(NL: Valse macht\)/);
  });
});

describe("the status callout messages", () => {
  const serialised = (extra) => ({
    ok: true, reasons: [], warnings: [], text: "…", chars: 66812, headings: 23, version: 7, previousVersion: 6,
    calloutId: "callout-1", key: "report_prompt", publishedAt: "2026-09-23T12:02:00.000Z", executionId: "77",
    ...extra,
  });

  test("published: version, Amsterdam time, grouped characters, headings and the previous version", () => {
    const r = runNode("Status: Published", { Serialise: [serialised()] });
    assert.deepEqual(r, {
      calloutId: "callout-1",
      icon: "🟢",
      message: "v7 live since 23 Sep 2026 14:02 (Europe/Amsterdam) — 66 812 characters, 23 headings. Previous: v6.",
    });
  });

  test("published in winter uses CET, and the first publish has no previous version", () => {
    const r = runNode("Status: Published", {
      Serialise: [serialised({ publishedAt: "2026-01-05T09:30:00.000Z", version: 1, previousVersion: null, chars: 812 })],
    });
    assert.equal(r.message, "v1 live since 5 Jan 2026 10:30 (Europe/Amsterdam) — 812 characters, 23 headings. Previous: none.");
  });

  test("published with a warning: yellow, and the warning follows the usual line", () => {
    const r = runNode("Status: Published", {
      Serialise: [serialised({ warnings: ["Length changed by 45.0% (36000 characters now, 66812 in the live version)"] })],
    });
    assert.equal(r.icon, "🟡");
    assert.equal(
      r.message,
      "v7 live since 23 Sep 2026 14:02 (Europe/Amsterdam) — 66 812 characters, 23 headings. Previous: v6. "
        + "Check: Length changed by 45.0% (36000 characters now, 66812 in the live version). "
        + "If that was not intended, restore the page from its history and publish again.",
    );
  });

  test("refused: every reason, and the live version left in place", () => {
    const r = runNode("Status: Refused", {
      Serialise: [serialised({ ok: false, reasons: ["Missing required headings: ## 1.3", "no status callout on the page"] })],
    });
    assert.deepEqual(r, {
      calloutId: "callout-1",
      icon: "🔴",
      message: "Publish refused 23 Sep 2026 14:02 — Missing required headings: ## 1.3; no status callout on the page. The live prompt is unchanged (v6).",
    });
  });

  test("refused before anything was ever published", () => {
    const r = runNode("Status: Refused", { Serialise: [serialised({ ok: false, reasons: ["x"], previousVersion: null })] });
    assert.match(r.message, /The live prompt is unchanged \(nothing published yet\)\.$/);
  });

  test("a message never exceeds Notion's 2000-character rich-text limit", () => {
    const r = runNode("Status: Refused", { Serialise: [serialised({ ok: false, reasons: ["y".repeat(3000)] })] });
    assert.equal(r.message.length, 2000);
  });

  test("Update Status Callout's body, evaluated, is a valid callout PATCH", () => {
    const expr = nodeNamed("Update Status Callout").parameters.jsonBody.replace(/^=\{\{\s*/, "").replace(/\s*\}\}$/, "");
    const $json = { calloutId: "c", icon: "🔴", message: 'He said "no" & left' };
    const body = JSON.parse(new Function("$json", `return ${expr};`)($json));
    assert.deepEqual(body, {
      callout: { rich_text: [{ type: "text", text: { content: 'He said "no" & left' } }], icon: { type: "emoji", emoji: "🔴" } },
    });
  });
});

describe("wiring and nodes", () => {
  test("the webhook takes a POST behind header auth", () => {
    const n = nodeNamed("Webhook");
    assert.equal(n.parameters.httpMethod, "POST");
    assert.equal(n.parameters.authentication, "headerAuth");
    assert.equal(n.parameters.responseMode, "onReceived");
    assert.match(n.parameters.path, /^nem-publish-prompt\/[0-9a-f]{32}$/, "the path carries a 32-hex secret segment");
    assert.equal(n.credentials.httpHeaderAuth.name, "Notion Publish Secret");
  });

  test("Fetch Notion Blocks reads every nested block of the configured page", () => {
    const p = nodeNamed("Fetch Notion Blocks").parameters;
    assert.deepEqual(
      { resource: p.resource, operation: p.operation, returnAll: p.returnAll, fetchNestedBlocks: p.fetchNestedBlocks, simplifyOutput: p.simplifyOutput, blockId: p.blockId.value },
      { resource: "block", operation: "getAll", returnAll: true, fetchNestedBlocks: true, simplifyOutput: false, blockId: "={{ $json.pageId }}" },
    );
    assert.equal(nodeNamed("Fetch Notion Blocks").credentials.notionApi.id, "eSRkYZp4IhWJBH9h");
  });

  test("Insert Version maps every column, active true", () => {
    const value = nodeNamed("Insert Version").parameters.columns.value;
    assert.deepEqual(Object.keys(value).sort(), ["active", "chars", "headings", "key", "publishedAt", "text", "version"]);
    assert.equal(value.active, true);
    assert.equal(value.text, "={{ $json.text }}");
  });

  test("Valid? true inserts, then deactivates, then reports", () => {
    assert.deepEqual(out("Valid?", 0), ["Insert Version"]);
    assert.deepEqual(out("Insert Version", 0), ["Deactivate Previous"]);
    assert.deepEqual(out("Deactivate Previous", 0), ["Status: Published"]);
  });

  test("Deactivate Previous only touches older rows of the same key, and still emits when there are none", () => {
    const n = nodeNamed("Deactivate Previous");
    assert.equal(n.parameters.matchType, "allConditions");
    assert.equal(n.alwaysOutputData, true);
    assert.deepEqual(n.parameters.columns.value, { active: false });
  });

  test("both status nodes feed Update Status Callout", () => {
    assert.deepEqual(out("Status: Published", 0), ["Update Status Callout"]);
    assert.deepEqual(out("Status: Refused", 0), ["Update Status Callout"]);
  });

  test("the refusal branch never reaches Insert Version", () => {
    assert.deepEqual(out("Valid?", 1), ["Status: Refused"]);
    const seen = new Set();
    const queue = out("Valid?", 1);
    while (queue.length) {
      const n = queue.shift();
      if (seen.has(n)) continue;
      seen.add(n);
      queue.push(...(snapshot.connections[n]?.main ?? []).flat().map((c) => c.node));
    }
    assert.ok(!seen.has("Insert Version"));
    assert.ok(!seen.has("Deactivate Previous"));
    assert.ok(seen.has("Update Status Callout"));
  });

  test("Update Status Callout PATCHes a Notion block with the Notion credential", () => {
    const n = nodeNamed("Update Status Callout");
    assert.equal(n.parameters.method, "PATCH");
    assert.equal(n.parameters.url, "=https://api.notion.com/v1/blocks/{{ $json.calloutId }}");
    assert.equal(n.parameters.nodeCredentialType, "notionApi");
    assert.equal(n.credentials.notionApi.id, "eSRkYZp4IhWJBH9h");
    assert.deepEqual(n.parameters.headerParameters.parameters, [{ name: "Notion-Version", value: "2022-06-28" }]);
  });

  test("no node calls api.anthropic.com", () => {
    assert.ok(!JSON.stringify(snapshot.nodes).includes("api.anthropic.com"));
  });
});
