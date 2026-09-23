/* Drift check for the live n8n workflows.
 *
 * Alex and Will both edit the NEM workflows by hand in the n8n UI, so the snapshots in
 * this repo go stale without anyone noticing. On 2026-08-13 the prompt-escaping fix was
 * applied live; five days later every doc still read "PREPARED, NOT APPLIED" and the
 * committed /verify JSON was missing a whole node. n8n keeps no version history for these
 * workflows, so a stale snapshot is also a broken rollback point.
 *
 *   npm run check:nem-drift            report drift, exit 1 if any
 *   npm run check:nem-drift -- --write  re-sync the snapshots and LIVE-STATE.md
 *
 * This never auto-syncs. Drift has run in both directions — on 2026-08-18 the /submit
 * snapshot was stale in one node and ahead of live in two others — so overwriting one
 * side by default would destroy real work. --write is a deliberate act.
 *
 * Requires N8N_API_KEY, so it cannot run in plain CI.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const BACKEND = resolve(ROOT, "projects/nem-life/.claude/backend");

export const API_BASE = "https://reus.app.n8n.cloud/api/v1/workflows";

export const WORKFLOWS = [
  { key: "verify", id: "uKkMgMYoH5nOLoCR", label: "NEM Test — /verify", file: "nem-verify.workflow.json" },
  { key: "submit", id: "LDI1eWR35lwX6WLp", label: "NEM Test — /submit", file: "nem-submit.workflow.json" },
  { key: "publish", id: "Chvq0q5cx7cxe4zV", label: "NEM Test — Publish Prompt", file: "nem-publish-prompt.workflow.json" },
];

/* A workflow whose id is still a placeholder has not been imported into n8n yet, so
 * there is nothing live to compare against. The CLI says so rather than failing. */
export const isPendingImport = (wf) => String(wf.id).startsWith("REPLACE_");

/* What a snapshot is allowed to contain. Everything else n8n returns is server-side and
 * churns on its own: ids, timestamps, versionId, sharing, triggerCount.
 *
 * staticData is deliberately excluded even though it is workflow-scoped — /submit's rate
 * limiter writes per-IP hit timestamps into it, so including it would report drift after
 * any real user submits the form. */
export const SNAPSHOT_FIELDS = ["name", "nodes", "connections", "settings", "pinData"];

/* The identified-profile table. Anonymous completions must never land here — see the
 * "Completions are logged to their own table" invariant. */
export const PROFILES_TABLE = "ib5Yh0yEfNpDqeuU";

export function normaliseWorkflow(workflow) {
  const out = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (field in workflow) out[field] = workflow[field];
  }
  return out;
}

const byName = (workflow) =>
  new Map((workflow.nodes ?? []).map((node) => [node.name, node]));

/* n8n reorders nodes freely and moves them around the canvas, so compare by name and
 * ignore position. A node that only moved is not drift. */
const comparable = ({ parameters, type, typeVersion, disabled, credentials }) => ({
  parameters, type, typeVersion, disabled: disabled ?? false, credentials,
});

export function diffWorkflows(repo, live) {
  const r = byName(repo);
  const l = byName(live);
  const onlyInLive = [...l.keys()].filter((n) => !r.has(n)).sort();
  const onlyInRepo = [...r.keys()].filter((n) => !l.has(n)).sort();

  const changed = [];
  for (const name of [...r.keys()].filter((n) => l.has(n)).sort()) {
    const a = comparable(r.get(name));
    const b = comparable(l.get(name));
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed.push({ node: name, repo: a, live: b });
    }
  }

  const connectionsDiffer =
    JSON.stringify(repo.connections ?? {}) !== JSON.stringify(live.connections ?? {});

  return {
    onlyInLive,
    onlyInRepo,
    changed,
    connectionsDiffer,
    inSync:
      onlyInLive.length === 0 &&
      onlyInRepo.length === 0 &&
      changed.length === 0 &&
      !connectionsDiffer,
  };
}

export const hasDrift = (results) => results.some((r) => !r.inSync);

/* ---------------------------------------------------------------------------
 * Invariants — the facts the prose docs kept asserting by hand, and getting wrong.
 * Each is a named check so LIVE-STATE.md can say which ones actually hold today.
 * ------------------------------------------------------------------------- */

const find = (workflow, name) => (workflow.nodes ?? []).find((n) => n.name === name);

const branch = (workflow, from, index) =>
  ((workflow.connections?.[from]?.main ?? [])[index] ?? []).map((c) => c.node);

const fanOut = (workflow, from) => branch(workflow, from, 0);

const reachableFrom = (workflow, starts) => {
  const seen = new Set();
  const queue = [...starts];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const out of workflow.connections?.[name]?.main ?? []) {
      for (const c of out ?? []) queue.push(c.node);
    }
  }
  return seen;
};

const sourcesOf = (workflow, target) =>
  Object.entries(workflow.connections ?? {}).flatMap(([from, outputs]) =>
    (outputs?.main ?? []).flatMap((out, index) =>
      ((out ?? []).some((c) => c.node === target) ? [{ from, index }] : [])),
  );

const filterConditions = (node) => node?.parameters?.filters?.conditions ?? [];
const isEq = (c) => (c.condition ?? "eq") === "eq";

const INVARIANTS = {
  verify: [
    {
      /* The prompt lives in nem_runtime_config, published from Alex's Notion page. The
       * table keeps every version; the newest active row is live. Both filters must hold at
       * once: n8n's Data Table default is "any condition", which would load every row. An
       * empty table must still emit an item, or the run stops silently with no alert. */
      label: "Runtime Config resolves the active nem_runtime_config row",
      check: (wf) => {
        const load = find(wf, "Load Runtime Config");
        const pick = find(wf, "Runtime Config");
        if (!load || !pick) return false;
        const conds = filterConditions(load);
        const code = pick.parameters?.jsCode ?? "";
        return load.type === "n8n-nodes-base.dataTable"
          && load.parameters?.operation === "get"
          && load.parameters?.matchType === "allConditions"
          && load.alwaysOutputData === true
          && conds.some((c) => c.keyName === "key" && isEq(c) && c.keyValue === "report_prompt")
          && conds.some((c) => c.keyName === "active" && c.condition === "isTrue")
          && fanOut(wf, "Load Runtime Config").includes("Runtime Config")
          && pick.type === "n8n-nodes-base.code"
          && code.includes("$('Load Runtime Config')")
          && code.includes("report_prompt")
          && /\.active\b/.test(code)
          && /\.version\b/.test(code);
      },
    },
    {
      label: "Generate Report sets max_tokens to 8000, not the truncating 1024",
      check: (wf) => /max_tokens:\s*8000/.test(find(wf, "Generate Report")?.parameters?.jsonBody ?? ""),
    },
    {
      label: "Generate Report reads the prompt from Runtime Config",
      check: (wf) => {
        const body = find(wf, "Generate Report")?.parameters?.jsonBody ?? "";
        return /\$\('Runtime Config'\)\.first\(\)\.json\.systemPrompt/.test(body)
          && !body.includes("$('Report Prompt')");
      },
    },
    {
      /* No active row means no prompt. Sending an empty system prompt would produce a report
       * nobody wrote; the run is logged and alerted like a bad model response instead. */
      label: "A missing active prompt is logged and alerted, never sent to Anthropic",
      check: (wf) => {
        if (find(wf, "Report Prompt")) return false;
        const gate = find(wf, "Prompt Loaded?");
        if (!gate || gate.type !== "n8n-nodes-base.if") return false;
        const tested = gate.parameters?.conditions?.conditions ?? [];
        if (!tested.some((c) => /\$json\.promptOk\b/.test(String(c.leftValue))
          && c.operator?.type === "boolean" && c.operator?.operation === "true")) return false;
        if (!fanOut(wf, "Runtime Config").includes("Prompt Loaded?")) return false;
        const onTrue = branch(wf, "Prompt Loaded?", 0);
        const onFalse = branch(wf, "Prompt Loaded?", 1);
        if (!onTrue.includes("Generate Report") || onTrue.includes("Missing Prompt")) return false;
        if (!onFalse.includes("Missing Prompt") || onFalse.includes("Generate Report")) return false;
        const into = sourcesOf(wf, "Generate Report");
        if (!into.every((s) => s.from === "Prompt Loaded?" && s.index === 0)) return false;
        return fanOut(wf, "Missing Prompt").includes("Log Failure");
      },
    },
    {
      label: "Valid? keeps Respond Confirmed on the fast path, ahead of the report chain",
      check: (wf) => {
        const targets = fanOut(wf, "Valid?");
        return targets.includes("Respond Confirmed") && targets.includes("Mark Consumed");
      },
    },
    {
      label: "Generate Report goes through Parse Report, not straight to Build HTML",
      check: (wf) => fanOut(wf, "Generate Report").includes("Parse Report"),
    },
    {
      /* The PDF is the published Webflow report template with its data-slots filled — the
       * design surface Alex edits, fetched per report, never an inline document that
       * drifts from the site. */
      label: "Build HTML fills the published Webflow template, fetched from TEMPLATE_URL",
      check: (wf) => {
        const code = find(wf, "Build HTML")?.parameters?.jsCode ?? "";
        return /TEMPLATE_URL = 'https:\/\/[^']+\/report-pdf-template'/.test(code)
          && code.includes("this.helpers.httpRequest")
          && !code.includes("<!doctype html>");
      },
    },
    {
      /* The intro line is the report's lead paragraph: into its slot through esc() (it is
       * Christel's prose, full of & and quotes), and when empty the whole block goes —
       * spacer and styled wrapper, not just the text. That last property is what lets the
       * plumbing ship before Alex's copy exists. */
      label: "Build HTML fills the intro-line slot escaped, and removes the block when empty",
      check: (wf) => {
        const code = find(wf, "Build HTML")?.parameters?.jsCode ?? "";
        return code.includes("fillText('intro-line', esc(introLine))")
          && code.includes("elementRe('data-slot-wrap', 'intro-line')");
      },
    },
    {
      /* Alex's prompt says the first name appears exactly once, at the start of opening.
       * A greeting line above the body would print it twice on every PDF. */
      label: "Build HTML does not greet — the prompt places the first name inside opening",
      check: (wf) => {
        const code = find(wf, "Build HTML")?.parameters?.jsCode ?? "";
        return code.length > 0 && !/\bconst greeting\b|\+\s*greeting\b/.test(code);
      },
    },
    {
      /* The prompt writes "in the same register as the intro line" and builds on the
       * conclusion text the user already saw. Neither reached the model until §7; drop
       * one again and it matches a register it was never shown. */
      label: "Generate Report sends the intro line",
      check: (wf) => (find(wf, "Generate Report")?.parameters?.jsonBody ?? "").includes("Intro line: "),
    },
    {
      label: "Generate Report sends the conclusion text",
      check: (wf) => (find(wf, "Generate Report")?.parameters?.jsonBody ?? "").includes("Conclusion text: "),
    },
    {
      label: "Generate Report does not send the total score — the prompt says the model does not calculate",
      check: (wf) => {
        const body = find(wf, "Generate Report")?.parameters?.jsonBody ?? "";
        return body.length > 0 && !/Total score/i.test(body);
      },
    },
    {
      /* The stored value stays vrouw / man — conclusionId derives from it. Only the user
       * message spells it the way the prompt does. */
      label: "Generate Report spells gender the prompt's way: Female / Male",
      check: (wf) => {
        const body = find(wf, "Generate Report")?.parameters?.jsonBody ?? "";
        return body.includes("'Female'") && body.includes("'Male'");
      },
    },
    {
      /* The prompt is Dutch-only: forbidden words, register and every text variant. An
       * en token must be logged and alerted like any other failure, and must never reach
       * Anthropic. The gate sits on the Valid? fast path, ahead of the prompt lookup. */
      label: "Unsupported locales are logged and alerted, never sent to Anthropic",
      check: (wf) => {
        if (!find(wf, "Locale Supported?")) return false;
        const promptPath = ["Load Runtime Config", "Report Prompt", "Generate Report"];
        const fast = fanOut(wf, "Valid?");
        if (!fast.includes("Locale Supported?") || fast.some((n) => promptPath.includes(n))) return false;
        const onTrue = branch(wf, "Locale Supported?", 0);
        const onFalse = branch(wf, "Locale Supported?", 1);
        if (!onTrue.includes("Load Runtime Config") || onTrue.includes("Unsupported Locale")) return false;
        if (onFalse.length === 0) return false;
        const reachesLog = (name) => name === "Log Failure" || fanOut(wf, name).includes("Log Failure");
        return onFalse.every((n) => !promptPath.includes(n) && reachesLog(n));
      },
    },
    {
      /* Two edits are needed at go-live: point the alert at Alex, and drop the [DEV] tag
       * from the subject. Making one and forgetting the other gives either a [DEV]-tagged
       * alert landing on the client, or an untagged test alert that reads as a real
       * production failure. Tie them so neither can happen alone. */
      label: "The alert's [DEV] subject tag agrees with who it is addressed to",
      check: (wf) => {
        const body = find(wf, "Alert Failure")?.parameters?.jsonBody ?? "";
        if (!body) return false;
        const toDeveloper = body.includes("will@teamzissou.io");
        const tagged = body.includes("[DEV]");
        return toDeveloper === tagged;
      },
    },
    {
      label: "The Valid Report? failure branch cannot reach Build HTML or Send Report",
      check: (wf) => {
        const onFailure = ((wf.connections?.["Valid Report?"]?.main ?? [])[1] ?? [])
          .map((c) => c.node);
        return (
          onFailure.length > 0 &&
          !onFailure.includes("Build HTML") &&
          !onFailure.includes("Send Report")
        );
      },
    },
  ],
  submit: [
    {
      label: "Store Profile targets a real data table, not a REPLACE_ placeholder",
      check: (wf) => {
        const id = find(wf, "Store Profile")?.parameters?.dataTableId?.value ?? "";
        return Boolean(id) && !String(id).startsWith("REPLACE_");
      },
    },
    {
      label: "Honeypot gate is present",
      check: (wf) => Boolean(find(wf, "Honeypot filled?")),
    },
    {
      label: "Per-IP rate limit is present",
      check: (wf) => Boolean(find(wf, "Rate limit")),
    },
    {
      /* The limiter sits before the Completion? branch, so without this guard the quiz's
       * completion ping spends a slot before the form is even shown: one honest run cost
       * two of the three, and a corrected resubmit within the hour was refused (2026-09-02). */
      label: "Rate limit ignores completion pings — they are logging, not submissions",
      check: (wf) =>
        /event\s*===\s*'completion'/.test(find(wf, "Rate limit")?.parameters?.jsCode ?? ""),
    },
    {
      label: "Verification mail goes out via MailerLite",
      check: (wf) =>
        /connect\.mailerlite\.com/.test(
          find(wf, "MailerLite: Send Verification")?.parameters?.url ?? "",
        ),
    },
    {
      /* MailerLite automations skip anyone not active, and an upsert without a status keeps
       * the old one — so a contact left unconfirmed by an earlier signup got no verification
       * email at all (Alex, 2026-09-16). Every submitter has ticked the required consent box. */
      label: "Verification upsert sets the subscriber active, so the automation sends",
      check: (wf) =>
        /status:\s*'active'/.test(find(wf, "MailerLite: Send Verification")?.parameters?.jsonBody ?? ""),
    },
    {
      label: "Verification upsert resubscribes contacts who once unsubscribed",
      check: (wf) =>
        /resubscribe:\s*true/.test(find(wf, "MailerLite: Send Verification")?.parameters?.jsonBody ?? ""),
    },
    {
      /* The v2 component has sent these three since 2026-08-17, but Normalize dropped them
       * for a day and nothing noticed — the payload arrived, was silently discarded, and
       * the failure log's conclusionId column was left permanently unfillable. */
      label: "Normalize keeps the v2 outcome, conclusionKey and conclusionId",
      check: (wf) => {
        const code = find(wf, "Normalize")?.parameters?.jsCode ?? "";
        return ["outcome", "conclusionKey", "conclusionId"].every((f) => code.includes(f));
      },
    },
    {
      label: "Store Profile persists the v2 conclusion fields and the event type",
      check: (wf) => {
        const mapped = find(wf, "Store Profile")?.parameters?.columns?.value ?? {};
        return ["outcome", "conclusionKey", "conclusionId", "event"].every((f) => f in mapped);
      },
    },
    {
      /* The intro line is fixed editorial copy the component selects client-side. It rides
       * the /submit payload into the profile row so /verify can render it — dropping it in
       * Normalize would silently blank every report's lead paragraph. */
      label: "Normalize keeps introLine",
      check: (wf) => {
        const code = find(wf, "Normalize")?.parameters?.jsCode ?? "";
        return code.includes("introLine");
      },
    },
    {
      label: "Store Profile persists introLine",
      check: (wf) => {
        const mapped = find(wf, "Store Profile")?.parameters?.columns?.value ?? {};
        return "introLine" in mapped;
      },
    },
    {
      /* The conclusion text the user read on screen. n8n holds no copy of the texts, so
       * this is the only route by which /verify can hand it to the prompt. */
      label: "Normalize keeps conclusionText",
      check: (wf) => {
        const code = find(wf, "Normalize")?.parameters?.jsCode ?? "";
        return code.includes("conclusionText");
      },
    },
    {
      label: "Store Profile persists conclusionText",
      check: (wf) => {
        const mapped = find(wf, "Store Profile")?.parameters?.columns?.value ?? {};
        return "conclusionText" in mapped;
      },
    },
    {
      /* Completions go to their own table so the token lookup in /verify can never pick an
       * anonymous row that has no email and leave a real user without their report. */
      label: "Completions are logged to their own table, not to nem_test_profiles",
      check: (wf) => {
        const id = find(wf, "Log Completion")?.parameters?.dataTableId?.value ?? "";
        return Boolean(id) && id !== PROFILES_TABLE;
      },
    },
    {
      /* "Anonymous" should be structural, not a promise. The completion row carries no
       * identifying field, and there is nowhere in that table to put one. */
      label: "The completion row carries no name, email or gender",
      check: (wf) => {
        const mapped = find(wf, "Log Completion")?.parameters?.columns?.value ?? {};
        return !["email", "firstName", "gender", "relationshipStatus", "ageCategory"]
          .some((f) => f in mapped);
      },
    },
    {
      label: "The completion path never triggers the verification email",
      check: (wf) => {
        const onCompletion = ((wf.connections?.["Completion?"]?.main ?? [])[0] ?? [])
          .map((c) => c.node);
        return (
          onCompletion.length > 0 &&
          !onCompletion.includes("MailerLite: Send Verification") &&
          !onCompletion.includes("Store Profile")
        );
      },
    },
  ],
  publish: [
    {
      /* The webhook URL alone is a secret anyone holding the URL could replay; the header
       * Notion's button sends is the second factor. */
      label: "Webhook accepts POST only, behind the Notion header secret",
      check: (wf) => {
        const n = find(wf, "Webhook");
        return n?.type === "n8n-nodes-base.webhook"
          && n.parameters?.httpMethod === "POST"
          && n.parameters?.authentication === "headerAuth"
          && Boolean(n.credentials?.httpHeaderAuth);
      },
    },
    {
      /* Without nested blocks every indented list item vanishes from the prompt. */
      label: "Fetch Notion Blocks fetches nested blocks with the Notion credential",
      check: (wf) => {
        const n = find(wf, "Fetch Notion Blocks");
        return n?.type === "n8n-nodes-base.notion"
          && n.parameters?.resource === "block"
          && n.parameters?.operation === "getAll"
          && n.parameters?.returnAll === true
          && n.parameters?.fetchNestedBlocks === true
          && n.parameters?.simplifyOutput === false
          && Boolean(n.credentials?.notionApi);
      },
    },
    {
      label: "Serialise carries the serialiser and the validator",
      check: (wf) => {
        const code = find(wf, "Serialise")?.parameters?.jsCode ?? "";
        return code.includes("function notionToPrompt") && code.includes("function validatePrompt");
      },
    },
    {
      label: "Only Valid? true reaches Insert Version, which writes the row as active",
      check: (wf) => {
        const n = find(wf, "Insert Version");
        const mapped = n?.parameters?.columns?.value ?? {};
        const into = sourcesOf(wf, "Insert Version");
        return n?.type === "n8n-nodes-base.dataTable"
          && (n.parameters?.operation ?? "insert") === "insert"
          && (mapped.active === true || mapped.active === "true")
          && ["key", "version", "text"].every((f) => f in mapped)
          && into.length > 0
          && into.every((s) => s.from === "Valid?" && s.index === 0);
      },
    },
    {
      /* Insert first, deactivate second: there is never a moment with no active row. Two
       * active rows for a moment is fine — /verify takes the highest version. */
      label: "Deactivate Previous runs after Insert Version, never instead of it",
      check: (wf) => {
        const into = sourcesOf(wf, "Deactivate Previous");
        return into.length > 0 && into.every((s) => s.from === "Insert Version");
      },
    },
    {
      /* n8n's Data Table default is "any condition": key OR version-below would deactivate
       * the row just inserted, and every report after it would fail. */
      label: "Deactivate Previous only touches older versions of the same key",
      check: (wf) => {
        const n = find(wf, "Deactivate Previous");
        const conds = filterConditions(n);
        return n?.type === "n8n-nodes-base.dataTable"
          && n.parameters?.operation === "update"
          && n.parameters?.matchType === "allConditions"
          && conds.length === 2
          && conds.some((c) => c.keyName === "key" && isEq(c))
          && conds.some((c) => c.keyName === "version" && c.condition === "lt")
          && n.parameters?.columns?.value?.active === false;
      },
    },
    {
      label: "Update Status Callout PATCHes the callout block on api.notion.com",
      check: (wf) => {
        const n = find(wf, "Update Status Callout");
        return n?.parameters?.method === "PATCH"
          && String(n.parameters?.url ?? "").includes("api.notion.com/v1/blocks/")
          && n.parameters?.nodeCredentialType === "notionApi"
          && Boolean(n.credentials?.notionApi);
      },
    },
    {
      /* A refusal must tell Alex why, and must never write a row /verify would pick up. */
      label: "A refused publish reaches the status callout and never Insert Version",
      check: (wf) => {
        const onFalse = branch(wf, "Valid?", 1);
        if (onFalse.length === 0) return false;
        const reached = reachableFrom(wf, onFalse);
        return reached.has("Update Status Callout")
          && !reached.has("Insert Version")
          && !reached.has("Deactivate Previous");
      },
    },
    {
      label: "Publishing never calls Anthropic",
      check: (wf) => (wf.nodes ?? []).length > 0 && !JSON.stringify(wf.nodes).includes("api.anthropic.com"),
    },
  ],
};

export function checkInvariants(key, workflow) {
  return (INVARIANTS[key] ?? []).map(({ label, check }) => {
    let ok;
    try {
      ok = Boolean(check(workflow));
    } catch {
      ok = false;
    }
    return { label, ok };
  });
}

/* ------------------------------------------------------------------------- */

export function formatReport(results) {
  const lines = [""];
  for (const r of results) {
    const status = r.inSync ? "IN SYNC" : "DRIFT";
    lines.push(`${r.key.padEnd(8)} (${r.id})  ${status}   ${r.nodeCount} nodes`);

    for (const name of r.onlyInLive) {
      lines.push(`    + ${name}  — present live, missing from the repo snapshot`);
    }
    for (const name of r.onlyInRepo) {
      lines.push(`    - ${name}  — in the repo snapshot, absent live`);
    }
    for (const c of r.changed) {
      lines.push(`    ~ ${c.node}`);
      for (const field of differingFields(c.repo, c.live)) {
        lines.push(...renderPair(field, pluck(c.repo, field), pluck(c.live, field)));
      }
    }
    if (r.connectionsDiffer) lines.push("    ~ connections differ");
  }
  lines.push("");
  if (hasDrift(results)) {
    lines.push("Drift found. Decide per node which side is right — it has gone both ways.");
    lines.push("Re-baseline with:  npm run check:nem-drift -- --write");
    lines.push("");
  }
  return lines.join("\n");
}

const summarise = (value) => {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  const flat = String(s).replace(/\n/g, "\\n");
  return flat.length > 200 ? `${flat.slice(0, 200)}…` : flat;
};

const ABSENT = Symbol("absent");

/* Flatten to dot-paths so the report can name the one field that moved rather than
 * dumping two near-identical parameter blobs and leaving the reader to spot the
 * difference by eye. */
function flatten(value, prefix = "", out = new Map()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.set(prefix, value);
  }
  return out;
}

export function differingFields(repo, live) {
  const a = flatten(repo);
  const b = flatten(live);
  const paths = new Set([...a.keys(), ...b.keys()]);
  return [...paths]
    .filter((p) => JSON.stringify(a.has(p) ? a.get(p) : null) !== JSON.stringify(b.has(p) ? b.get(p) : null))
    .sort();
}

export function pluck(value, path) {
  return path.split(".").reduce(
    (acc, key) => (acc && typeof acc === "object" && key in acc ? acc[key] : ABSENT),
    value,
  );
}

/* Code nodes hold hundreds of lines in one string, so a truncated value shows only the
 * shared prefix. Narrow to the line that actually moved. */
function firstDifferingLine(a, b) {
  const la = String(a).split("\n");
  const lb = String(b).split("\n");
  const i = Array.from({ length: Math.max(la.length, lb.length) }, (_, n) => n)
    .find((n) => la[n] !== lb[n]);
  return i === undefined ? [a, b] : [la[i] ?? "(no line)", lb[i] ?? "(no line)"];
}

function renderPair(field, repoValue, liveValue) {
  const r = repoValue === ABSENT ? "(absent)" : repoValue;
  const l = liveValue === ABSENT ? "(absent)" : liveValue;
  if (typeof r === "string" && typeof l === "string" && (r.length > 160 || l.length > 160)) {
    const [dr, dl] = firstDifferingLine(r, l);
    return [
      `        ${field}  (first differing line)`,
      `          repo  ${summarise(dr)}`,
      `          live  ${summarise(dl)}`,
    ];
  }
  return [`        ${field}`, `          repo  ${summarise(r)}`, `          live  ${summarise(l)}`];
}

export function buildLiveState(entries, generatedAt) {
  const lines = [
    "# NEM Life — live n8n state",
    "",
    `**Generated ${generatedAt}** by \`npm run check:nem-drift\`.`,
    "",
    "**Do not hand-edit this file.** It is written from the live n8n API and is the one",
    "place in this repo allowed to assert what the workflows currently do. Prose docs that",
    "need a live fact should link here rather than restating it — restating is how the",
    "2026-08-13 hand-edit stayed invisible for five days.",
    "",
  ];

  for (const e of entries) {
    lines.push(`## ${e.name}`);
    lines.push("");
    lines.push(`- n8n id: \`${e.id}\``);
    lines.push(`- active: ${e.active ? "yes" : "no"}`);
    lines.push(`- nodes: ${e.nodeCount}`);
    lines.push(`- last changed in n8n: ${e.updatedAt}`);
    lines.push(`- committed snapshot: ${e.inSync ? "matches live" : "**DRIFTED from live**"}`);
    lines.push("");
    lines.push("| Invariant | State |");
    lines.push("|---|---|");
    for (const inv of e.invariants) {
      lines.push(`| ${inv.label} | ${inv.ok ? "holds" : "**FAIL**"} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* --- CLI ----------------------------------------------------------------- */

async function fetchWorkflow(id, key) {
  const res = await fetch(`${API_BASE}/${id}`, { headers: { "X-N8N-API-KEY": key } });
  if (!res.ok) throw new Error(`n8n API ${res.status} for workflow ${id}`);
  return res.json();
}

async function main() {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    process.stderr.write("N8N_API_KEY is not set — this check cannot run without it.\n");
    process.exit(2);
  }
  const write = process.argv.includes("--write");

  const results = [];
  const entries = [];

  for (const wf of WORKFLOWS) {
    if (isPendingImport(wf)) {
      process.stdout.write(`${wf.key.padEnd(8)} skipped — not imported yet (${wf.file})\n`);
      continue;
    }
    const live = await fetchWorkflow(wf.id, apiKey);
    const path = resolve(BACKEND, wf.file);
    const repo = JSON.parse(readFileSync(path, "utf8"));

    const diff = diffWorkflows(normaliseWorkflow(repo), normaliseWorkflow(live));
    results.push({ key: wf.key, id: wf.id, nodeCount: live.nodes.length, ...diff });

    if (write) {
      writeFileSync(path, `${JSON.stringify(normaliseWorkflow(live), null, 2)}\n`, "utf8");
    }

    entries.push({
      key: wf.key,
      id: wf.id,
      name: wf.label,
      active: live.active,
      updatedAt: live.updatedAt,
      nodeCount: live.nodes.length,
      inSync: write ? true : diff.inSync,
      invariants: checkInvariants(wf.key, live),
    });
  }

  process.stdout.write(formatReport(results));

  if (write) {
    writeFileSync(
      resolve(BACKEND, "LIVE-STATE.md"),
      buildLiveState(entries, new Date().toISOString()),
      "utf8",
    );
    process.stdout.write("Snapshots and LIVE-STATE.md re-baselined from live.\n\n");
    return;
  }

  const failing = entries.flatMap((e) => e.invariants.filter((i) => !i.ok).map((i) => `${e.key}: ${i.label}`));
  if (failing.length) {
    process.stdout.write(`Invariants failing:\n  ${failing.join("\n  ")}\n\n`);
  }
  if (hasDrift(results) || failing.length) process.exit(1);
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
