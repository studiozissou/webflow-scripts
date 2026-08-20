/* Tests for the n8n workflow drift check.
 *
 * The problem this guards: Alex and Will both edit the n8n workflows by hand in the UI, so
 * the committed snapshots go stale silently. On 2026-08-13 the prompt-escaping fix was
 * applied live; five days later every doc in the repo still said "PREPARED, NOT APPLIED"
 * and nothing had noticed. Drift also runs the other way — the /submit snapshot was ahead
 * of live in two places — so this check reports and never auto-syncs.
 *
 * Everything network-facing lives in the CLI half of the module. These tests cover the
 * pure half: normalising, diffing, reporting and the generated LIVE-STATE.md.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WORKFLOWS,
  SNAPSHOT_FIELDS,
  normaliseWorkflow,
  diffWorkflows,
  hasDrift,
  formatReport,
  checkInvariants,
  buildLiveState,
} from "../../tools/nem/check-workflow-drift.js";

/* A minimal workflow shaped like the real thing. */
const wf = (nodes, connections = {}) => ({
  name: "NEM Test — /verify",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
});

const node = (name, parameters = {}, extra = {}) => ({
  name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [0, 0],
  parameters,
  ...extra,
});

describe("normaliseWorkflow — server metadata must not read as drift", () => {
  test("keeps only the workflow-defining fields", () => {
    const out = normaliseWorkflow({
      name: "w",
      nodes: [],
      connections: {},
      settings: {},
      staticData: null,
      pinData: {},
      id: "abc",
      createdAt: "2026-01-01",
      updatedAt: "2026-08-13",
      versionId: "v1",
      active: true,
      shared: [{ role: "owner" }],
      tags: [],
      triggerCount: 1,
    });
    assert.deepEqual(Object.keys(out).sort(), [...SNAPSHOT_FIELDS].sort());
  });

  test("two payloads differing only in server metadata normalise equal", () => {
    const base = { name: "w", nodes: [], connections: {}, settings: {} };
    const a = normaliseWorkflow({ ...base, updatedAt: "2026-08-13", versionId: "x" });
    const b = normaliseWorkflow({ ...base, updatedAt: "2026-08-18", versionId: "y" });
    assert.deepEqual(a, b);
  });

  test("staticData is excluded — the rate limiter mutates it on every submission", () => {
    /* /submit stores per-IP hit timestamps in staticData. Including it would make the
     * check cry drift after any real user submits. */
    assert.ok(!SNAPSHOT_FIELDS.includes("staticData"));
  });
});

describe("diffWorkflows", () => {
  test("identical workflows are in sync", () => {
    const a = wf([node("Webhook")]);
    const d = diffWorkflows(a, structuredClone(a));
    assert.equal(d.inSync, true);
    assert.deepEqual(d.onlyInLive, []);
    assert.deepEqual(d.onlyInRepo, []);
    assert.deepEqual(d.changed, []);
  });

  test("a node added live is reported — this is the case that was missed", () => {
    const repo = wf([node("Generate Report")]);
    const live = wf([node("Generate Report"), node("Report Prompt")]);
    const d = diffWorkflows(repo, live);
    assert.equal(d.inSync, false);
    assert.deepEqual(d.onlyInLive, ["Report Prompt"]);
    assert.deepEqual(d.onlyInRepo, []);
  });

  test("a node only in the repo is reported separately from one only live", () => {
    const repo = wf([node("Ghost")]);
    const live = wf([node("Real")]);
    const d = diffWorkflows(repo, live);
    assert.deepEqual(d.onlyInRepo, ["Ghost"]);
    assert.deepEqual(d.onlyInLive, ["Real"]);
  });

  test("changed parameters are reported with both values", () => {
    const repo = wf([node("Store Profile", { operation: "insert" })]);
    const live = wf([node("Store Profile", { operation: "upsert" })]);
    const d = diffWorkflows(repo, live);
    assert.equal(d.inSync, false);
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].node, "Store Profile");
    assert.match(JSON.stringify(d.changed[0].repo), /insert/);
    assert.match(JSON.stringify(d.changed[0].live), /upsert/);
  });

  test("a node disabled live but enabled in the repo counts as drift", () => {
    const repo = wf([node("Send Report", {}, { disabled: false })]);
    const live = wf([node("Send Report", {}, { disabled: true })]);
    assert.equal(diffWorkflows(repo, live).inSync, false);
  });

  test("rewired connections count as drift even when every node matches", () => {
    const repo = wf([node("A"), node("B")], { A: { main: [[{ node: "B", index: 0 }]] } });
    const live = wf([node("A"), node("B")], { A: { main: [[]] } });
    const d = diffWorkflows(repo, live);
    assert.equal(d.connectionsDiffer, true);
    assert.equal(d.inSync, false);
  });

  test("node order is not drift — n8n reorders freely", () => {
    const repo = wf([node("A"), node("B")]);
    const live = wf([node("B"), node("A")]);
    assert.equal(diffWorkflows(repo, live).inSync, true);
  });

  test("server metadata on the live payload does not register as drift", () => {
    const repo = wf([node("A")]);
    const live = { ...wf([node("A")]), id: "x", updatedAt: "2026-08-18", active: true };
    assert.equal(diffWorkflows(repo, live).inSync, true);
  });
});

describe("hasDrift and the exit code", () => {
  test("false when every workflow is in sync", () => {
    assert.equal(hasDrift([{ inSync: true }, { inSync: true }]), false);
  });

  test("true when any single workflow drifts", () => {
    assert.equal(hasDrift([{ inSync: true }, { inSync: false }]), true);
  });
});

describe("formatReport", () => {
  const results = [
    { key: "verify", id: "uKkMgMYoH5nOLoCR", inSync: true, nodeCount: 15, onlyInLive: [], onlyInRepo: [], changed: [], connectionsDiffer: false },
    {
      key: "submit", id: "LDI1eWR35lwX6WLp", inSync: false, nodeCount: 10,
      onlyInLive: [], onlyInRepo: [], connectionsDiffer: false,
      changed: [{ node: "Store Profile", repo: { operation: "insert" }, live: { operation: "upsert" } }],
    },
  ];

  test("labels each workflow IN SYNC or DRIFT", () => {
    const out = formatReport(results);
    assert.match(out, /verify[\s\S]*IN SYNC/);
    assert.match(out, /submit[\s\S]*DRIFT/);
  });

  test("names the drifting node so the reader knows where to look", () => {
    assert.match(formatReport(results), /Store Profile/);
  });

  test("says which side is which — the fix direction is not obvious", () => {
    /* Drift ran both ways on 2026-08-18: /submit's snapshot was stale in one node and
     * ahead of live in two others. A report that does not label the sides invites
     * blindly overwriting the wrong one. */
    const out = formatReport(results);
    assert.match(out, /repo/);
    assert.match(out, /live/);
  });

  test("never tells the reader it fixed anything — this tool only reports", () => {
    assert.doesNotMatch(formatReport(results), /synced|updated|fixed|wrote/i);
  });

  test("shows the value that differs, not a truncated common prefix", () => {
    /* First cut printed JSON.stringify(parameters).slice(0, 220) for each side. Real nodes
     * share a long identical prefix, so both lines came out looking the same and the
     * reader learned nothing. Report the differing field. */
    const long = (op) => ({
      url: "https://connect.mailerlite.com/api/subscribers",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "Content-Type", value: "application/json" }] },
      operation: op,
    });
    const out = formatReport([{
      key: "submit", id: "x", inSync: false, nodeCount: 10,
      onlyInLive: [], onlyInRepo: [], connectionsDiffer: false,
      changed: [{ node: "Store Profile", repo: { parameters: long("insert") }, live: { parameters: long("upsert") } }],
    }]);
    assert.match(out, /insert/);
    assert.match(out, /upsert/);
    assert.doesNotMatch(out, /genericAuthType/,
      "identical fields should not be printed — they are noise");
  });

  test("names which parameter changed", () => {
    const out = formatReport([{
      key: "submit", id: "x", inSync: false, nodeCount: 10,
      onlyInLive: [], onlyInRepo: [], connectionsDiffer: false,
      changed: [{ node: "Store Profile", repo: { parameters: { operation: "insert" } }, live: { parameters: { operation: "upsert" } } }],
    }]);
    assert.match(out, /operation/);
  });
});

describe("checkInvariants — the facts docs kept asserting by hand", () => {
  const verifyLive = wf([
    node("Report Prompt", {
      assignments: {
        assignments: [{
          name: "systemPrompt", type: "string",
          value: "TEST MODE. Return ONLY a valid JSON object.",
        }],
      },
    }, { type: "n8n-nodes-base.set", typeVersion: 3.5 }),
    node("Generate Report", { jsonBody: "={{ JSON.stringify({ max_tokens: 8000, system: $('Report Prompt').first().json.systemPrompt }) }}" }),
    node("Parse Report", { jsCode: "parseReport($json)" }),
    node("Valid Report?", {}, { type: "n8n-nodes-base.if" }),
    node("Build HTML", { jsCode: "const html = '<h1>' + heading + '</h1>' + (introLine ? '<p class=\"intro\">' + esc(introLine) + '</p>' : '') + '<p>' + greeting + ' ' + esc(p.firstName || '') + ',</p>';" }),
    node("Log Failure"),
    node("Alert Failure", { jsonBody: "={{ JSON.stringify({ to: [ { email: 'will@teamzissou.io' } ], subject: '[DEV] NEM Test - report generation failed' }) }}" }),
    node("Respond Confirmed"),
    node("Mark Consumed"),
  ], {
    "Valid?": { main: [[{ node: "Respond Confirmed" }, { node: "Mark Consumed" }, { node: "Report Prompt" }]] },
    "Generate Report": { main: [[{ node: "Parse Report" }]] },
    "Parse Report": { main: [[{ node: "Valid Report?" }]] },
    "Valid Report?": { main: [[{ node: "Build HTML" }], [{ node: "Log Failure" }]] },
  });

  test("passes on a live-shaped verify workflow", () => {
    const checks = checkInvariants("verify", verifyLive);
    assert.ok(checks.length > 0, "expected invariants for verify");
    const failed = checks.filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => c.label), []);
  });

  test("catches the escaping regression: systemPrompt stored as an expression", () => {
    const broken = structuredClone(verifyLive);
    const rp = broken.nodes.find((n) => n.name === "Report Prompt");
    rp.parameters.assignments.assignments[0].value = "={{ 'oops' }}";
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /fixed value/i.test(c.label)));
  });

  test("catches max_tokens being dropped back to the truncating value", () => {
    const broken = structuredClone(verifyLive);
    const gr = broken.nodes.find((n) => n.name === "Generate Report");
    gr.parameters.jsonBody = gr.parameters.jsonBody.replace("8000", "1024");
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /max_tokens/.test(c.label)));
  });

  test("catches the 302 being pushed behind the report chain", () => {
    /* If Respond Confirmed leaves the Valid? fan-out, the browser waits on a blank page
     * for the whole LLM + PDF round trip. */
    const broken = structuredClone(verifyLive);
    broken.connections["Valid?"].main[0] = [{ node: "Report Prompt" }];
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /fast path|Respond Confirmed/i.test(c.label)));
  });

  test("a missing Report Prompt node fails rather than throwing", () => {
    const broken = wf([node("Generate Report", { jsonBody: "max_tokens: 8000" })]);
    const checks = checkInvariants("verify", broken);
    assert.ok(checks.some((c) => !c.ok));
  });
});

describe("checkInvariants — the report JSON gate", () => {
  /* Parse Report decides whether a user gets a report at all. The wiring that matters is
   * that the failure branch cannot reach Send Report — a hand-edit reconnecting those
   * would silently start posting half-built PDFs. */
  const gated = wf([
    node("Report Prompt", {
      assignments: {
        assignments: [{
          name: "systemPrompt", type: "string",
          value: "Return ONLY a valid JSON object with keys opening, reaction, origin, cost, closing.",
        }],
      },
    }, { type: "n8n-nodes-base.set", typeVersion: 3.5 }),
    node("Generate Report", { jsonBody: "={{ JSON.stringify({ max_tokens: 8000, system: $('Report Prompt').first().json.systemPrompt }) }}" }),
    node("Parse Report", { jsCode: "parseReport($json)" }),
    node("Valid Report?", {}, { type: "n8n-nodes-base.if" }),
    node("Build HTML", { jsCode: "const html = '<h1>' + heading + '</h1>' + (introLine ? '<p class=\"intro\">' + esc(introLine) + '</p>' : '') + '<p>' + greeting + ' ' + esc(p.firstName || '') + ',</p>';" }),
    node("Log Failure"),
    node("Alert Failure", { jsonBody: "={{ JSON.stringify({ to: [ { email: 'will@teamzissou.io' } ], subject: '[DEV] NEM Test - report generation failed' }) }}" }),
    node("Respond Confirmed"), node("Mark Consumed"),
  ], {
    "Valid?": { main: [[{ node: "Respond Confirmed" }, { node: "Mark Consumed" }, { node: "Report Prompt" }]] },
    "Generate Report": { main: [[{ node: "Parse Report" }]] },
    "Parse Report": { main: [[{ node: "Valid Report?" }]] },
    "Valid Report?": { main: [[{ node: "Build HTML" }], [{ node: "Log Failure" }]] },
    "Log Failure": { main: [[{ node: "Alert Failure" }]] },
  });

  test("passes on the gated workflow", () => {
    const failed = checkInvariants("verify", gated).filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => c.label), []);
  });

  test("catches Generate Report wired straight to Build HTML, bypassing the gate", () => {
    const broken = structuredClone(gated);
    broken.connections["Generate Report"] = { main: [[{ node: "Build HTML" }]] };
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /Parse Report/i.test(c.label)));
  });

  test("catches the failure branch being wired to Build HTML", () => {
    /* Both outputs reaching Build HTML would send a PDF built from a rejected response. */
    const broken = structuredClone(gated);
    broken.connections["Valid Report?"].main[1] = [{ node: "Build HTML" }];
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /failure branch/i.test(c.label)));
  });

  test("catches the [DEV] tag and the alert recipient disagreeing", () => {
    /* Alerts go to Will during development and must go to Alex at go-live, and the subject
     * carries a [DEV] tag so a test can never be mistaken for a production failure. Those
     * are two edits, which means one can be made and the other forgotten — a [DEV]-tagged
     * alert reaching the client, or worse, an untagged test alert. Tie them together. */
    const alerting = (to, subjectTag) => wf(
      [node("Alert Failure", {
        jsonBody: `={{ JSON.stringify({ to: [ { email: '${to}' } ], subject: '${subjectTag}NEM Test - report generation failed' }) }}`,
      })],
    );

    const devConsistent = checkInvariants("verify", alerting("will@teamzissou.io", "[DEV] "));
    assert.ok(
      !devConsistent.find((c) => /\[DEV\]/.test(c.label) && !c.ok),
      "dev recipient with a [DEV] tag should be consistent",
    );

    const liveConsistent = checkInvariants("verify", alerting("alex@nemlife.com", ""));
    assert.ok(
      !liveConsistent.find((c) => /\[DEV\]/.test(c.label) && !c.ok),
      "client recipient with no tag should be consistent",
    );

    const untaggedDev = checkInvariants("verify", alerting("will@teamzissou.io", ""));
    assert.ok(
      untaggedDev.some((c) => /\[DEV\]/.test(c.label) && !c.ok),
      "a dev recipient without the tag must fail",
    );

    const taggedClient = checkInvariants("verify", alerting("alex@nemlife.com", "[DEV] "));
    assert.ok(
      taggedClient.some((c) => /\[DEV\]/.test(c.label) && !c.ok),
      "a [DEV]-tagged alert going to the client must fail",
    );
  });

  test("catches a prompt that stops demanding JSON", () => {
    /* Applies to Alex's real prompt too, not just the stub — if it does not ask for JSON,
     * every report fails validation. */
    const broken = structuredClone(gated);
    const rp = broken.nodes.find((n) => n.name === "Report Prompt");
    rp.parameters.assignments.assignments[0].value = "Write a warm two-page report.";
    const failed = checkInvariants("verify", broken).filter((c) => !c.ok);
    assert.ok(failed.some((c) => /JSON/i.test(c.label)));
  });
});

describe("buildLiveState — the generated status file", () => {
  const entries = [{
    key: "verify",
    id: "uKkMgMYoH5nOLoCR",
    name: "NEM Test — /verify",
    active: true,
    updatedAt: "2026-08-13T15:03:50.643Z",
    nodeCount: 15,
    inSync: true,
    invariants: [{ label: "Report Prompt stores systemPrompt as a fixed value", ok: true }],
  }];

  test("carries a generated-at timestamp", () => {
    assert.match(buildLiveState(entries, "2026-08-18T10:42:00.000Z"), /2026-08-18T10:42/);
  });

  test("tells the reader not to hand-edit it, and how to regenerate", () => {
    const out = buildLiveState(entries, "2026-08-18T10:42:00.000Z");
    assert.match(out, /do not (hand-)?edit/i);
    assert.match(out, /npm run check:nem-drift/);
  });

  test("records each workflow's live updatedAt — the drift tell", () => {
    /* The 13 Aug hand-edit was invisible in the repo but stamped on the workflow. */
    assert.match(buildLiveState(entries, "2026-08-18T00:00:00.000Z"), /2026-08-13/);
  });

  test("reports invariant results, not just node counts", () => {
    assert.match(buildLiveState(entries, "2026-08-18T00:00:00.000Z"), /fixed value/);
  });

  test("a failing invariant is visible, not buried", () => {
    const failing = structuredClone(entries);
    failing[0].invariants[0].ok = false;
    const out = buildLiveState(failing, "2026-08-18T00:00:00.000Z");
    assert.match(out, /FAIL/);
  });
});

describe("the real committed snapshots hold the facts the docs claim", () => {
  const ROOT = resolve(import.meta.dirname, "../..");
  const load = (f) =>
    JSON.parse(readFileSync(resolve(ROOT, "projects/nem-life/.claude/backend", f), "utf8"));

  test("both workflows are registered for checking", () => {
    assert.deepEqual(WORKFLOWS.map((w) => w.key).sort(), ["submit", "verify"]);
    for (const w of WORKFLOWS) assert.match(w.id, /^[A-Za-z0-9]{16}$/);
  });

  test("the committed /verify snapshot satisfies every invariant", () => {
    const failed = checkInvariants("verify", load("nem-verify.workflow.json")).filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => c.label), []);
  });

  test("the committed /submit snapshot satisfies every invariant", () => {
    const failed = checkInvariants("submit", load("nem-submit.workflow.json")).filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => c.label), []);
  });

  test("snapshots carry no server metadata — they are normalised on write", () => {
    for (const f of ["nem-verify.workflow.json", "nem-submit.workflow.json"]) {
      const snap = load(f);
      for (const k of ["id", "createdAt", "updatedAt", "versionId", "shared", "active"]) {
        assert.ok(!(k in snap), `${f} still carries server field "${k}"`);
      }
    }
  });
});
