/* The /submit webhook can now answer { status: "error" } when the verification email is
 * refused by MailerSend. Before this the component only knew "rate_limited" and a thrown
 * fetch, so an error body with a 200 status landed the user on the confirmation screen
 * with no email on its way. This pins the component's side of the contract. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildComponent, SRC_DIR } from "../../tools/nem/build-component.js";

const source = readFileSync(resolve(SRC_DIR, "nem-test-phase-b.tsx"), "utf8");
const bundle = buildComponent();
const dist = readFileSync(resolve(SRC_DIR, "../dist/nem-test-phase-b.webflow.tsx"), "utf8");

describe("the component honours every /submit response status", () => {
  test("rate_limited still shows the rate-limit message", () => {
    assert.match(source, /data\.status === "rate_limited"/);
    assert.match(source, /generic: t\.errors\.rateLimited/);
  });

  test("error shows the generic message and stays on the opt-in screen", () => {
    const handler = source.slice(source.indexOf('data.status === "rate_limited"'));
    const errorBranch = handler.match(/if \(data\.status === "error"\) \{([\s\S]*?return;)\s*\}/);
    assert.ok(errorBranch, 'expected an if (data.status === "error") branch after rate_limited');
    assert.match(errorBranch[1], /generic: t\.errors\.generic/);
    assert.match(errorBranch[1], /setSubmitting\(false\)/);
    assert.match(errorBranch[1], /return;/);
  });

  test("the error branch sits before the phase flips to confirmation", () => {
    const handler = source.slice(source.indexOf('data.status === "rate_limited"'));
    assert.ok(handler.indexOf('data.status === "error"') < handler.indexOf('setPhase("confirmation")'));
  });

  test("the pasteable bundle carries the same branch", () => {
    assert.match(bundle, /data\.status === "error"/);
  });

  test("the committed dist file is the current bundle", () => {
    assert.strictEqual(dist, bundle);
  });
});
