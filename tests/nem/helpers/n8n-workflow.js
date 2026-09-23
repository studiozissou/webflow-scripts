// Test-only: runs an n8n Code node's source the way n8n does, with $('Node') exposing .all() and .first() over the supplied items, and lists the nodes one output of a workflow node connects to.
import assert from "node:assert/strict";

export function runCodeNode(code, sources, { execution = { id: 77 }, label = "the Code node" } = {}) {
  const $ = (from) => {
    if (!(from in sources)) throw new Error(`node referenced ${from}, which the test did not supply`);
    const items = sources[from].map((json) => ({ json }));
    return { all: () => items, first: () => items[0] };
  };
  const result = new Function("$", "$execution", code)($, execution);
  assert.equal(result.length, 1, `${label} must emit exactly one item`);
  return result[0].json;
}

export function targetsOf(workflow, name, index) {
  return ((workflow.connections[name]?.main ?? [])[index] ?? []).map((c) => c.node);
}
