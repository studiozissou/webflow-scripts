/**
 * The /submit rate limiter (3 hits per IP per rolling hour) sat in front of the
 * Completion? branch, so the quiz's completion ping — sent before the form is even shown —
 * spent one of the three slots. One honest run of the test cost two, and a user who
 * corrected their email and resubmitted within the hour was told "Probeer het later
 * opnieuw" (2026-09-02, seven rejected attempts in a row). Completion pings are logging,
 * not submissions: they are neither counted nor blocked.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, "..", "..", "projects", "nem-life", ".claude", "backend");
const CHANGESET = path.join(BACKEND, "changesets", "nem-rate-limit-completions");
const snapshot = JSON.parse(readFileSync(path.join(BACKEND, "nem-submit.workflow.json"), "utf8"));
const rateLimitCode = snapshot.nodes.find((n) => n.name === "Rate limit").parameters.jsCode;

/* Runs the node the way n8n does: $json is the incoming item, static data is a plain
 * object that persists across calls within one test. */
const runner = () => {
  const store = {};
  const fn = new Function("$json", "$getWorkflowStaticData", rateLimitCode);
  return {
    store,
    run: (json) => fn(json, () => store)[0].json,
  };
};

const submission = (ip = "1.2.3.4") => ({ ip, event: "submission", email: "a@b.c" });
const completion = (ip = "1.2.3.4") => ({ ip, event: "completion" });

/* 50 while the test is in testing (2026-09-02); the go-live checklist drops it to 3. The
 * honeypot and the email verification are the real abuse guards. */
const MAX_PER_HOUR = 50;

describe("Rate limit — submissions", () => {
  test(`${MAX_PER_HOUR} submissions from one IP pass, the next is limited`, () => {
    const { run } = runner();
    for (let i = 0; i < MAX_PER_HOUR; i++) assert.equal(run(submission()).rateLimited, false, `hit ${i + 1}`);
    assert.equal(run(submission()).rateLimited, true);
  });

  test("another IP has its own window", () => {
    const { run } = runner();
    for (let i = 0; i < MAX_PER_HOUR; i++) run(submission("1.1.1.1"));
    assert.equal(run(submission("2.2.2.2")).rateLimited, false);
  });

  test("a rejected submission does not extend the window", () => {
    const { run, store } = runner();
    for (let i = 0; i < MAX_PER_HOUR + 2; i++) run(submission());
    assert.equal(store.hits["1.2.3.4"].length, MAX_PER_HOUR);
  });
});

describe("Rate limit — completion pings", () => {
  test("a completion ping is never rate limited", () => {
    const { run } = runner();
    for (let i = 0; i < MAX_PER_HOUR; i++) run(submission());
    assert.equal(run(completion()).rateLimited, false);
  });

  test("a completion ping does not spend a slot", () => {
    const { run, store } = runner();
    run(completion());
    run(completion());
    assert.equal(store.hits?.["1.2.3.4"]?.length ?? 0, 0);
    for (let i = 0; i < MAX_PER_HOUR; i++) assert.equal(run(submission()).rateLimited, false, `hit ${i + 1}`);
    assert.equal(run(submission()).rateLimited, true);
  });

  test("the rest of the item passes through untouched", () => {
    const { run } = runner();
    const out = run({ ...completion(), token: "t", conclusionKey: "k" });
    assert.equal(out.token, "t");
    assert.equal(out.conclusionKey, "k");
    assert.equal(out.event, "completion");
  });
});

describe("the changeset file cannot drift from the snapshot", () => {
  test("rate-limit.jsCode.js is byte-identical to the committed node", () => {
    const file = readFileSync(path.join(CHANGESET, "rate-limit.jsCode.js"), "utf8");
    assert.equal(file, rateLimitCode + "\n");
  });
});
