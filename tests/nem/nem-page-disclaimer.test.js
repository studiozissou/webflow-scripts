/* Unit tests for the page disclaimer swap — spec nem-validation-round-2. */
import { test } from "node:test";
import assert from "node:assert/strict";

import { REPORT_PHASES, syncPageDisclaimer } from "../../projects/nem-life/src/nem-page-disclaimer.js";

const TEST_COPY =
  "Deze test is geen psychologische diagnose. Het is een spiegel op basis van jouw antwoorden - puur bedoeld voor inzicht en bewustwording.";
const REPORT_COPY =
  "Dit rapport is geen diagnose. Het is een spiegel op basis van jouw antwoorden - puur bedoeld voor inzicht en bewustwording.";

function fakeDoc(initialText = TEST_COPY) {
  const el = { textContent: initialText, dataset: {} };
  const selectors = [];
  return {
    el,
    selectors,
    querySelector(selector) {
      selectors.push(selector);
      return selector === '[data-element="disclaimer"]' ? el : null;
    },
  };
}

test("the report phases are optin and confirmation", () => {
  assert.deepEqual(REPORT_PHASES, ["optin", "confirmation"]);
});

test("a missing element returns null and does not throw", () => {
  const doc = { querySelector: () => null };
  assert.doesNotThrow(() => syncPageDisclaimer(doc, "optin", REPORT_COPY));
  assert.equal(syncPageDisclaimer(doc, "optin", REPORT_COPY), null);
});

test("it looks the element up by its data-element attribute", () => {
  const doc = fakeDoc();
  syncPageDisclaimer(doc, "quiz", REPORT_COPY);
  assert.deepEqual(doc.selectors, ['[data-element="disclaimer"]']);
});

test("the first call caches the Designer text in dataset.testCopy", () => {
  const doc = fakeDoc();
  syncPageDisclaimer(doc, "optin", REPORT_COPY);
  assert.equal(doc.el.dataset.testCopy, TEST_COPY);
});

test("the cache is not overwritten by later calls", () => {
  const doc = fakeDoc();
  syncPageDisclaimer(doc, "optin", REPORT_COPY);
  syncPageDisclaimer(doc, "confirmation", REPORT_COPY);
  assert.equal(doc.el.dataset.testCopy, TEST_COPY);
});

for (const phase of ["optin", "confirmation"]) {
  test(`report copy is set on ${phase} and returned`, () => {
    const doc = fakeDoc();
    assert.equal(syncPageDisclaimer(doc, phase, REPORT_COPY), REPORT_COPY);
    assert.equal(doc.el.textContent, REPORT_COPY);
  });
}

for (const phase of ["quiz", "profile", "conclusion"]) {
  test(`test copy is untouched on ${phase} from a fresh load`, () => {
    const doc = fakeDoc();
    assert.equal(syncPageDisclaimer(doc, phase, REPORT_COPY), TEST_COPY);
    assert.equal(doc.el.textContent, TEST_COPY);
  });

  test(`test copy is restored on ${phase} after a report phase`, () => {
    const doc = fakeDoc();
    syncPageDisclaimer(doc, "optin", REPORT_COPY);
    assert.equal(syncPageDisclaimer(doc, phase, REPORT_COPY), TEST_COPY);
    assert.equal(doc.el.textContent, TEST_COPY);
  });
}

test("going back from confirmation to optin keeps the report copy", () => {
  const doc = fakeDoc();
  syncPageDisclaimer(doc, "optin", REPORT_COPY);
  syncPageDisclaimer(doc, "confirmation", REPORT_COPY);
  syncPageDisclaimer(doc, "optin", REPORT_COPY);
  assert.equal(doc.el.textContent, REPORT_COPY);
});
