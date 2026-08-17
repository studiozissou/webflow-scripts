/**
 * Unit tests for the `Generate Report` node's jsonBody expression in the
 * NEM Test `/verify` n8n workflow (slug: nem-report-prompt-escaping-and-token-limit).
 *
 * The node builds the Anthropic request body from an n8n expression of the form
 * `={{ JSON.stringify({ ... }) }}`. n8n evaluates the inner source as JavaScript,
 * so anything embedded as a *string literal* in that source is code, not data.
 *
 * These tests evaluate the real expression file the same way n8n does, against a
 * torture-test system prompt, and assert:
 *   - the fixed form (prompt read from a Set node) survives every character class
 *   - the old form (prompt inlined as a single-quoted literal) throws — the defect
 *   - max_tokens is 8000, not the live 1024
 *   - profile values are interpolated, not embedded
 *
 * Run: node --test tests/nem/nem-verify-report-body.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHANGESET_DIR = path.join(
  __dirname,
  '..',
  '..',
  'projects',
  'nem-life',
  '.claude',
  'backend',
  'changesets',
  'nem-report-prompt-escaping'
);

const EXPRESSION_FILE = path.join(CHANGESET_DIR, 'generate-report.jsonBody.txt');
const TORTURE_FILE = path.join(CHANGESET_DIR, 'torture-prompt.txt');
const NODE_FILE = path.join(CHANGESET_DIR, 'report-prompt.node.json');
const OPERATIONS_FILE = path.join(CHANGESET_DIR, 'partial-update.operations.json');

const torturePrompt = fs.readFileSync(TORTURE_FILE, 'utf8');

/** Profile fields as `Validate Token` emits them. Deliberately contains an apostrophe. */
const validateTokenOutput = {
  locale: 'nl',
  firstName: "Sjoerd d'Anjou",
  gender: 'man',
  ageCategory: '31-40',
  relationshipStatus: 'in-een-relatie',
  scoresJson: '{"valseHoop":14,"valseMacht":11,"zelfafwijzing":9,"angst":7,"emotioneleVerdoving":3}',
  primaryMechanism: 'valseHoop',
  secondaryMechanism: 'valseMacht',
  totalScore: 44,
};

/**
 * Mimics n8n's expression evaluation: strip the `={{ … }}` wrapper and run the
 * inner source as JavaScript with `$(nodeName)` bound to the upstream outputs.
 */
function evaluateN8nExpression(expression, nodeOutputs) {
  const trimmed = expression.trim();
  const match = trimmed.match(/^=\{\{([\s\S]*)\}\}$/);
  assert.ok(match, 'expression must be of the form ={{ … }}');
  const inner = match[1];

  const $ = (nodeName) => {
    if (!(nodeName in nodeOutputs)) {
      throw new Error(`expression referenced unknown node: ${nodeName}`);
    }
    return { first: () => ({ json: nodeOutputs[nodeName] }) };
  };

  // eslint-disable-next-line no-new-func
  return new Function('$', `return (${inner});`)($);
}

describe('nem /verify — Generate Report jsonBody', () => {
  const expression = fs.readFileSync(EXPRESSION_FILE, 'utf8');

  const nodeOutputs = {
    'Report Prompt': { systemPrompt: torturePrompt },
    'Validate Token': validateTokenOutput,
  };

  test('evaluates to a valid JSON string with the torture-test prompt installed', () => {
    const body = evaluateN8nExpression(expression, nodeOutputs);
    assert.strictEqual(typeof body, 'string');
    assert.doesNotThrow(() => JSON.parse(body));
  });

  test('system prompt survives byte-for-byte through JSON.stringify', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    assert.strictEqual(body.system, torturePrompt);
  });

  test('system prompt carries every character class that breaks the inlined form', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    assert.match(body.system, /Alex's prompt/, 'apostrophe');
    assert.match(body.system, /"'t is goed\."/, 'double quotes around an apostrophe');
    assert.match(body.system, /Backslash: \\ /, 'literal backslash');
    assert.match(body.system, /’/, 'curly quote');
    assert.match(body.system, /—/, 'em dash');
    assert.ok(body.system.includes('\n\n'), 'blank line');
  });

  test('max_tokens is 8000 — the live 1024 truncates a full report', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    assert.strictEqual(body.max_tokens, 8000);
  });

  test('targets claude-opus-4-8', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    assert.strictEqual(body.model, 'claude-opus-4-8');
  });

  test('profile values are interpolated, including a name containing an apostrophe', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    const content = body.messages[0].content;
    assert.strictEqual(body.messages[0].role, 'user');
    assert.match(content, /First name: Sjoerd d'Anjou/);
    assert.match(content, /Primary mechanism: valseHoop/);
    assert.match(content, /Secondary mechanism: valseMacht/);
    assert.match(content, /Total score: 44/);
    assert.match(content, /"valseHoop":14/);
  });

  test('locale nl asks for Dutch', () => {
    const body = JSON.parse(evaluateN8nExpression(expression, nodeOutputs));
    assert.match(body.messages[0].content, /Write the full report in Dutch/);
  });

  test('locale en asks for English', () => {
    const body = JSON.parse(
      evaluateN8nExpression(expression, {
        ...nodeOutputs,
        'Validate Token': { ...validateTokenOutput, locale: 'en' },
      })
    );
    assert.match(body.messages[0].content, /Write the full report in English/);
  });

  test('an absent secondary mechanism degrades to "none"', () => {
    const body = JSON.parse(
      evaluateN8nExpression(expression, {
        ...nodeOutputs,
        'Validate Token': { ...validateTokenOutput, secondaryMechanism: '' },
      })
    );
    assert.match(body.messages[0].content, /Secondary mechanism: none/);
  });

  test('reads profile fields via $(\'Validate Token\'), not bare $json', () => {
    // Inserting `Report Prompt` upstream rebinds $json inside Generate Report.
    // A surviving `$json.` reference would silently read the Set node's output.
    assert.doesNotMatch(expression, /\$json\./);
    assert.match(expression, /\$\('Validate Token'\)\.first\(\)\.json\./);
  });

  test('reads the system prompt from the Report Prompt node, not a literal', () => {
    assert.match(expression, /system:\s*\$\('Report Prompt'\)\.first\(\)\.json\.systemPrompt/);
  });
});

describe('nem /verify — the defect this replaces', () => {
  test('inlining the prompt as a single-quoted literal throws on an apostrophe', () => {
    // Reconstructs the shape of the live node: the system prompt pasted between
    // single quotes inside the JS source. This is what happens the moment Alex's
    // real prompt lands. The failure is silent in production — the browser already
    // has its 302 from Respond Confirmed.
    const inlined =
      "={{ JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1024, system: '" +
      torturePrompt +
      "', messages: [] }) }}";

    assert.throws(
      () => evaluateN8nExpression(inlined, {}),
      SyntaxError,
      'expected an unterminated string literal'
    );
  });
});

describe('nem /verify — the apply payload matches what was tested', () => {
  // The operations file is what actually gets sent to n8n. Everything above tests
  // generate-report.jsonBody.txt and report-prompt.node.json. If those three drift,
  // the thing applied to production is not the thing that was verified.
  const ops = JSON.parse(fs.readFileSync(OPERATIONS_FILE, 'utf8'));
  const expression = fs.readFileSync(EXPRESSION_FILE, 'utf8').trim();
  const node = JSON.parse(fs.readFileSync(NODE_FILE, 'utf8'));

  const updateOp = ops.operations.find(
    (op) => op.type === 'updateNode' && op.nodeName === 'Generate Report'
  );
  const addOp = ops.operations.find(
    (op) => op.type === 'addNode' && op.node?.name === 'Report Prompt'
  );

  test('targets the live /verify workflow', () => {
    assert.strictEqual(ops.id, 'uKkMgMYoH5nOLoCR');
  });

  test('jsonBody in the payload is byte-identical to the tested expression', () => {
    assert.ok(updateOp, 'expected an updateNode op for Generate Report');
    assert.strictEqual(updateOp.updates['parameters.jsonBody'], expression);
  });

  test('the Set node in the payload is identical to the tested node', () => {
    assert.ok(addOp, 'expected an addNode op for Report Prompt');
    assert.deepStrictEqual(addOp.node.parameters, node.parameters);
    assert.strictEqual(addOp.node.typeVersion, node.typeVersion);
  });

  test('keeps Respond Confirmed and Mark Consumed off the rewire', () => {
    // Rewiring either onto the Report Prompt chain makes the 302 wait ~10-20s
    // for report generation. Users would sit on a blank page.
    const touched = ops.operations
      .filter((op) => op.type.endsWith('Connection'))
      .flatMap((op) => [op.from, op.to, op.source, op.target]);
    assert.ok(!touched.includes('Respond Confirmed'));
    assert.ok(!touched.includes('Mark Consumed'));
  });

  test('rewires the Valid? true branch explicitly', () => {
    // sourceIndex on an IF node silently routes everything to the true branch.
    const rewire = ops.operations.find((op) => op.type === 'rewireConnection');
    assert.strictEqual(rewire.source, 'Valid?');
    assert.strictEqual(rewire.branch, 'true');
    assert.strictEqual(rewire.from, 'Generate Report');
    assert.strictEqual(rewire.to, 'Report Prompt');
  });
});

describe('nem /verify — Report Prompt Set node', () => {
  const node = JSON.parse(fs.readFileSync(NODE_FILE, 'utf8'));

  test('is a Set node on typeVersion 3.5', () => {
    assert.strictEqual(node.type, 'n8n-nodes-base.set');
    assert.strictEqual(node.typeVersion, 3.5);
  });

  test('uses the v3.5 assignments shape, not the legacy `fields` shape', () => {
    assert.ok(Array.isArray(node.parameters.assignments.assignments));
    assert.strictEqual(node.parameters.fields, undefined);
  });

  test('stores systemPrompt as a fixed value — the whole point of the fix', () => {
    const [assignment] = node.parameters.assignments.assignments;
    assert.strictEqual(assignment.name, 'systemPrompt');
    assert.strictEqual(assignment.type, 'string');
    // A leading `=` re-enters the JavaScript evaluator and undoes the fix.
    assert.ok(
      !assignment.value.startsWith('='),
      'systemPrompt must not be an expression (no leading `=`)'
    );
  });

  test('passes the profile fields through to Generate Report', () => {
    assert.strictEqual(node.parameters.includeOtherFields, true);
  });
});
