/**
 * /verify stops holding the prompt in a Set node and reads the newest active row of
 * nem_runtime_config instead, which Alex publishes from Notion. The change ships as a
 * changeset: a plan in n8n's partial-update vocabulary and the proposed workflow it
 * produces. The proposed workflow must satisfy every /verify invariant, and the new Code
 * nodes are run here from their changeset files.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkInvariants } from "../../tools/nem/check-workflow-drift.js";
import {
  PROMPT_READ_BEFORE,
  PROMPT_READ_AFTER,
  buildGenerateReportBody,
  buildPlan,
  applyPlan,
} from "../../tools/nem/build-verify-runtime-config.js";
import { runCodeNode, targetsOf } from "./helpers/n8n-workflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, "..", "..", "projects", "nem-life", ".claude", "backend");
const CHANGESET = path.join(BACKEND, "changesets", "nem-verify-runtime-config");
const read = (f) => readFileSync(path.join(CHANGESET, f), "utf8");

const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-verify.workflow.json"), "utf8"));
const proposed = JSON.parse(read("proposed.nem-verify.workflow.json"));
const plan = JSON.parse(read("apply-plan.json"));
const find = (wf, name) => wf.nodes.find((n) => n.name === name);
const applied = !find(snapshot, "Report Prompt");

const runCode = (code, sources) => runCodeNode(code, sources, { execution: { id: 91 } });

const profile = { token: "t-1", firstName: "Anna", email: "a@b.c", locale: "nl", gender: "vrouw", conclusionId: "c-1" };
const row = (version, active, text = `prompt v${version} — return JSON`) => ({ key: "report_prompt", version, active, text, chars: text.length });

describe("the proposed /verify workflow", () => {
  test("satisfies every /verify invariant in the drift check", () => {
    const failed = checkInvariants("verify", proposed).filter((c) => !c.ok).map((c) => c.label);
    assert.deepEqual(failed, []);
  });

  test("has no Report Prompt node, and the four new ones", () => {
    assert.equal(find(proposed, "Report Prompt"), undefined);
    for (const name of ["Load Runtime Config", "Runtime Config", "Prompt Loaded?", "Missing Prompt"]) {
      assert.ok(find(proposed, name), name);
    }
    assert.equal(proposed.nodes.length, snapshot.nodes.length + (applied ? 0 : 3));
  });

  test("is wired Locale Supported? → Load Runtime Config → Runtime Config → Prompt Loaded? → Generate Report | Missing Prompt → Log Failure", () => {
    assert.deepEqual(targetsOf(proposed, "Locale Supported?", 0), ["Load Runtime Config"]);
    assert.deepEqual(targetsOf(proposed, "Locale Supported?", 1), ["Unsupported Locale"]);
    assert.deepEqual(targetsOf(proposed, "Load Runtime Config", 0), ["Runtime Config"]);
    assert.deepEqual(targetsOf(proposed, "Runtime Config", 0), ["Prompt Loaded?"]);
    assert.deepEqual(targetsOf(proposed, "Prompt Loaded?", 0), ["Generate Report"]);
    assert.deepEqual(targetsOf(proposed, "Prompt Loaded?", 1), ["Missing Prompt"]);
    assert.deepEqual(targetsOf(proposed, "Missing Prompt", 0), ["Log Failure"]);
    assert.ok(!("Report Prompt" in proposed.connections));
  });

  test("Generate Report's body still carries the §7 contract", () => {
    const body = find(proposed, "Generate Report").parameters.jsonBody;
    assert.ok(body.startsWith("={{"));
    assert.ok(body.includes("Intro line: "));
    assert.ok(body.includes("Conclusion text: "));
    assert.ok(body.includes("'Female'") && body.includes("'Male'"));
    assert.doesNotMatch(body, /Total score/i);
    assert.ok(body.includes(PROMPT_READ_AFTER));
    assert.ok(!body.includes("$('Report Prompt')"));
  });

  test("the lookup matches all conditions and emits an item on an empty table", () => {
    const n = find(proposed, "Load Runtime Config");
    assert.equal(n.parameters.matchType, "allConditions");
    assert.equal(n.alwaysOutputData, true);
    assert.equal(n.parameters.dataTableId.cachedResultName, "nem_runtime_config");
  });
});

describe("the changeset files are in step with the builder", { skip: applied && "applied — the builder is history now" }, () => {
  const inputs = {
    runtimeConfigCode: read("runtime-config.jsCode.js").trimEnd(),
    missingPromptCode: read("missing-prompt.jsCode.js").trimEnd(),
    generateReportBody: read("generate-report.jsonBody.txt").trimEnd(),
  };

  test("generate-report.jsonBody.txt is the live body with only the prompt source swapped", () => {
    const live = find(snapshot, "Generate Report").parameters.jsonBody;
    assert.equal(live.split(PROMPT_READ_BEFORE).length, 2, "live body reads Report Prompt exactly once");
    assert.equal(inputs.generateReportBody, live.replace(PROMPT_READ_BEFORE, PROMPT_READ_AFTER));
    assert.equal(buildGenerateReportBody(live), inputs.generateReportBody);
  });

  test("apply-plan.json is what the builder produces from the files", () => {
    assert.deepEqual(plan, buildPlan(inputs));
  });

  test("proposed.nem-verify.workflow.json is the snapshot with the plan applied", () => {
    assert.deepEqual(proposed, applyPlan(snapshot, plan));
  });

  test("the plan starts by removing Report Prompt, and every other node is untouched", () => {
    assert.deepEqual(plan.operations[0], { type: "removeNode", nodeName: "Report Prompt" });
    const touched = new Set(["Report Prompt", "Generate Report", "Load Runtime Config", "Runtime Config", "Prompt Loaded?", "Missing Prompt"]);
    for (const n of snapshot.nodes.filter((x) => !touched.has(x.name))) {
      assert.deepEqual(find(proposed, n.name), n, `${n.name} changed`);
    }
  });

  test("the plan's code is byte-identical to the changeset files", () => {
    const code = (name) => plan.operations.find((o) => o.type === "addNode" && o.node.name === name).node.parameters.jsCode;
    assert.equal(code("Runtime Config"), inputs.runtimeConfigCode);
    assert.equal(code("Missing Prompt"), inputs.missingPromptCode);
  });
});

describe("Runtime Config, run from its changeset file", () => {
  const code = read("runtime-config.jsCode.js");
  const run = (rows) => runCode(code, { "Validate Token": [profile], "Load Runtime Config": rows });

  test("picks the highest active version", () => {
    const r = run([row(3, true), row(5, false), row(4, true), row(2, "true")]);
    assert.equal(r.promptOk, true);
    assert.equal(r.promptVersion, 4);
    assert.equal(r.systemPrompt, "prompt v4 — return JSON");
  });

  test("accepts active stored as the string 'true'", () => {
    assert.equal(run([row(7, "true")]).promptVersion, 7);
  });

  test("passes the profile through for Generate Report and the failure log", () => {
    const r = run([row(1, true)]);
    for (const [k, v] of Object.entries(profile)) assert.equal(r[k], v);
  });

  test("an empty table (n8n's single empty item) reports promptOk: false", () => {
    const r = run([{}]);
    assert.equal(r.promptOk, false);
    assert.equal(r.systemPrompt, "");
  });

  test("only inactive rows, other keys, or an empty text all report promptOk: false", () => {
    assert.equal(run([row(3, false)]).promptOk, false);
    assert.equal(run([{ ...row(3, true), key: "other" }]).promptOk, false);
    assert.equal(run([row(3, true, "   ")]).promptOk, false);
  });
});

describe("Missing Prompt, run from its changeset file", () => {
  const unsupported = find(snapshot, "Unsupported Locale").parameters.jsCode;
  const missing = read("missing-prompt.jsCode.js");
  const sources = { "Validate Token": [profile] };

  test("emits exactly the keys Unsupported Locale emits, so Log Failure and Alert Failure need no change", () => {
    assert.deepEqual(Object.keys(runCode(missing, sources)).sort(), Object.keys(runCode(unsupported, sources)).sort());
  });

  test("names the failure no-active-prompt and says no model call was made", () => {
    const r = runCode(missing, sources);
    assert.equal(r.parseValid, false);
    assert.equal(r.report, null);
    assert.equal(r.reason, "no-active-prompt");
    assert.equal(r.detail, "nem_runtime_config has no active report_prompt row - publish one from the Notion runtime page. No model call was made.");
    assert.equal(r.rawResponse, "");
    assert.equal(r.executionId, "91");
    assert.ok(!Number.isNaN(Date.parse(r.failedAt)));
  });

  test("the proposed node holds the file's code", () => {
    assert.equal(find(proposed, "Missing Prompt").parameters.jsCode, missing.trimEnd());
    assert.equal(find(proposed, "Runtime Config").parameters.jsCode, read("runtime-config.jsCode.js").trimEnd());
  });
});
