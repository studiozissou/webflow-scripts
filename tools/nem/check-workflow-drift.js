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
];

/* What a snapshot is allowed to contain. Everything else n8n returns is server-side and
 * churns on its own: ids, timestamps, versionId, sharing, triggerCount.
 *
 * staticData is deliberately excluded even though it is workflow-scoped — /submit's rate
 * limiter writes per-IP hit timestamps into it, so including it would report drift after
 * any real user submits the form. */
export const SNAPSHOT_FIELDS = ["name", "nodes", "connections", "settings", "pinData"];

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

const fanOut = (workflow, from) =>
  ((workflow.connections?.[from]?.main ?? [])[0] ?? []).map((c) => c.node);

const INVARIANTS = {
  verify: [
    {
      label: "Report Prompt is a Set node on typeVersion 3.5",
      check: (wf) => {
        const n = find(wf, "Report Prompt");
        return Boolean(n) && n.type === "n8n-nodes-base.set" && Number(n.typeVersion) === 3.5;
      },
    },
    {
      label: "Report Prompt stores systemPrompt as a fixed value, not an expression",
      check: (wf) => {
        const n = find(wf, "Report Prompt");
        const a = n?.parameters?.assignments?.assignments?.[0];
        return Boolean(a) && a.name === "systemPrompt" && !String(a.value).startsWith("=");
      },
    },
    {
      label: "Generate Report sets max_tokens to 8000, not the truncating 1024",
      check: (wf) => /max_tokens:\s*8000/.test(find(wf, "Generate Report")?.parameters?.jsonBody ?? ""),
    },
    {
      label: "Generate Report reads the prompt from the Report Prompt node",
      check: (wf) =>
        /\$\('Report Prompt'\)/.test(find(wf, "Generate Report")?.parameters?.jsonBody ?? ""),
    },
    {
      label: "Valid? keeps Respond Confirmed on the fast path, ahead of the report chain",
      check: (wf) => {
        const targets = fanOut(wf, "Valid?");
        return targets.includes("Respond Confirmed") && targets.includes("Mark Consumed");
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
      label: "Verification mail goes out via MailerLite",
      check: (wf) =>
        /connect\.mailerlite\.com/.test(
          find(wf, "MailerLite: Send Verification")?.parameters?.url ?? "",
        ),
    },
  ],
};

export function checkInvariants(key, workflow) {
  return (INVARIANTS[key] ?? []).map(({ label, check }) => {
    let ok = false;
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
