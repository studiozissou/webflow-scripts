/**
 * Unit tests for the §7 prompt input contract in the NEM Test n8n workflows
 * (changeset: nem-prompt-input-contract, spec: nem-report-json-and-error-visibility.md §7).
 *
 * Alex's system prompt reads three things from the user message that /verify never sent:
 * the intro line, the conclusion text the user already saw, and a gender spelled
 * `Female` / `Male`. It also assumes Dutch only, and that the first name appears once,
 * inside `opening`. These tests run the real node code out of the committed snapshots
 * — the same extraction trick as nem-build-html.test.js — and assert each gap is closed:
 *
 *   - Generate Report sends `Intro line:` and `Conclusion text:`, maps gender, and no
 *     longer sends `Total score:` (the prompt says the model does not calculate)
 *   - Build HTML no longer prints `Beste {firstName},` — the prompt owns the address
 *   - locale `en` is gated before Report Prompt: it lands in Log Failure with reason
 *     `unsupported-locale`, in the exact shape Log Failure and Alert Failure map
 *   - /submit carries `conclusionText` from the payload into the profile row
 *   - the changeset files are byte-identical to the snapshots they were cut from
 *
 * Run: node --test tests/nem/nem-prompt-input-contract.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(
  __dirname,
  '..',
  '..',
  'projects',
  'nem-life',
  '.claude',
  'backend',
);
const CHANGESET = path.join(BACKEND, 'changesets', 'nem-prompt-input-contract');

const verify = JSON.parse(
  readFileSync(path.join(BACKEND, 'nem-verify.workflow.json'), 'utf8'),
);
const submit = JSON.parse(
  readFileSync(path.join(BACKEND, 'nem-submit.workflow.json'), 'utf8'),
);

const node = (wf, name) => wf.nodes.find((n) => n.name === name);
const branch = (wf, name, i) =>
  ((wf.connections[name]?.main ?? [])[i] ?? []).map((c) => c.node);

const generateReportBody = node(verify, 'Generate Report').parameters.jsonBody;
const buildHtmlCode = node(verify, 'Build HTML').parameters.jsCode;
const normalizeCode = node(submit, 'Normalize').parameters.jsCode;

/** Profile row as Validate Token spreads it. Overridable per case. */
const profile = (overrides = {}) => ({
  token: 't-123',
  locale: 'nl',
  firstName: "Sjoerd d'Anjou",
  email: 'sjoerd@example.com',
  gender: 'vrouw',
  ageCategory: '41-50',
  relationshipStatus: 'in-een-relatie',
  scoresJson:
    '{"falseHope":14,"falsePower":11,"selfRejection":9,"fear":7,"emotionalNumbing":3}',
  primaryMechanism: 'falseHope',
  secondaryMechanism: 'selfRejection',
  totalScore: 44,
  conclusionId: '01F-FH-SR',
  introLine: 'Je hoopt dat het vanzelf goed komt & wacht af.',
  conclusionText:
    'Je blijft hopen, ook als de feiten iets anders zeggen.\n\nDat kost je.',
  ...overrides,
});

/** Mimics n8n: strip the `={{ … }}` wrapper and run the inner source with `$` bound. */
function evaluateExpression(expression, outputs) {
  const match = expression.trim().match(/^=\{\{([\s\S]*)\}\}$/);
  assert.ok(match, 'expression must be of the form ={{ … }}');
  const $ = (name) => {
    assert.ok(name in outputs, `expression referenced unknown node: ${name}`);
    return { first: () => ({ json: outputs[name] }) };
  };
  return new Function('$', `return (${match[1]});`)($);
}

function userMessage(p) {
  const body = JSON.parse(
    evaluateExpression(generateReportBody, {
      'Validate Token': p,
      'Report Prompt': { systemPrompt: 'SYSTEM' },
    }),
  );
  assert.equal(body.messages.length, 1);
  return body.messages[0].content;
}

describe('Generate Report — the user message carries what the prompt reads (7a, 7b)', () => {
  test('sends the intro line under an `Intro line:` label', () => {
    const msg = userMessage(profile());
    assert.ok(
      msg.includes('Intro line: Je hoopt dat het vanzelf goed komt & wacht af.'),
      msg,
    );
  });

  test('sends the conclusion text under a `Conclusion text:` label, paragraph breaks intact', () => {
    const msg = userMessage(profile());
    assert.ok(
      msg.includes(
        'Conclusion text: Je blijft hopen, ook als de feiten iets anders zeggen.\n\nDat kost je.',
      ),
      msg,
    );
  });

  test('an older row with neither field still produces a well-formed message', () => {
    const p = profile();
    delete p.introLine;
    delete p.conclusionText;
    const msg = userMessage(p);
    assert.ok(msg.includes('Intro line: '));
    assert.ok(msg.includes('Conclusion text: '));
    assert.ok(!msg.includes('undefined'), msg);
  });
});

describe('Generate Report — gender is spelled the way the prompt spells it (7c)', () => {
  for (const [stored, expected] of [
    ['vrouw', 'Female'],
    ['female', 'Female'],
    ['man', 'Male'],
    ['male', 'Male'],
  ]) {
    test(`${stored} → Gender: ${expected}`, () => {
      const msg = userMessage(profile({ gender: stored }));
      assert.ok(msg.includes(`Gender: ${expected}`), msg);
      assert.ok(!msg.includes(`Gender: ${stored}`), msg);
    });
  }

  test('an unrecognised value passes through rather than vanishing', () => {
    const msg = userMessage(profile({ gender: 'anders' }));
    assert.ok(msg.includes('Gender: anders'), msg);
  });
});

describe('Generate Report — what it must no longer send (7e)', () => {
  test('no Total score line — the prompt says the model does not calculate', () => {
    const msg = userMessage(profile());
    assert.ok(!/Total score/i.test(msg), msg);
    assert.ok(!msg.includes('44'), 'the total leaked in some other form');
  });
});

describe('Generate Report — nothing else regressed', () => {
  test('still reads the system prompt from Report Prompt with max_tokens 8000', () => {
    const body = JSON.parse(
      evaluateExpression(generateReportBody, {
        'Validate Token': profile(),
        'Report Prompt': { systemPrompt: 'SYSTEM' },
      }),
    );
    assert.equal(body.system, 'SYSTEM');
    assert.equal(body.max_tokens, 8000);
  });

  test('profile fields are still interpolated, apostrophe included', () => {
    const msg = userMessage(profile());
    assert.ok(msg.includes("First name: Sjoerd d'Anjou"));
    assert.ok(msg.includes('Age category: 41-50'));
    assert.ok(msg.includes('Relationship status: in-een-relatie'));
    assert.ok(msg.includes('Primary mechanism: falseHope'));
    assert.ok(msg.includes('Secondary mechanism: selfRejection'));
  });

  test('an absent secondary mechanism still degrades to none', () => {
    const msg = userMessage(profile({ secondaryMechanism: '' }));
    assert.ok(msg.includes('Secondary mechanism: none'));
  });
});

describe('Build HTML — the prompt owns the first name (7f)', () => {
  const report = {
    opening: 'Sjoerd, je hebt de test ingevuld.',
    reaction: 'Je trekt je terug.',
    origin: 'Dit ontstaat vroeg.',
    cost: 'Het kost je nabijheid.',
    closing: 'Er is een weg terug.',
  };

  function run(p) {
    const $ = (name) => {
      assert.equal(name, 'Validate Token');
      return { first: () => ({ json: p }) };
    };
    return new Function('$', '$json', buildHtmlCode)($, { report })[0].json;
  }

  test('no `Beste …,` line — the name appears once, inside opening', () => {
    const out = run(profile()).html;
    assert.ok(!out.includes('Beste '), out);
    assert.ok(!out.includes('Dear '), out);
    assert.equal(
      out.split('Sjoerd').length - 1,
      1,
      'first name must appear exactly once',
    );
  });

  test('the intro line now sits between the <h1> and the opening section', () => {
    const out = run(profile()).html;
    const h1 = out.indexOf('</h1>');
    const intro = out.indexOf('<p class="intro">');
    const opening = out.indexOf('<p>' + report.opening + '</p>');
    assert.ok(h1 !== -1 && intro !== -1 && opening !== -1);
    assert.ok(h1 < intro && intro < opening);
  });

  test('without an intro line the <h1> flows straight into opening', () => {
    const out = run(profile({ introLine: '' })).html;
    assert.match(
      out,
      new RegExp(
        '</h1><p>' + report.opening.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</p>',
      ),
    );
  });
});

describe('the locale gate (7d) — `en` never reaches Anthropic', () => {
  test('Locale Supported? sits on the Valid? fast path in place of Report Prompt', () => {
    const fanOut = branch(verify, 'Valid?', 0);
    assert.ok(fanOut.includes('Respond Confirmed'), 'the 302 must stay on the fast path');
    assert.ok(fanOut.includes('Mark Consumed'));
    assert.ok(fanOut.includes('Locale Supported?'));
    assert.ok(!fanOut.includes('Report Prompt'), 'Report Prompt must be behind the gate');
  });

  test('the gate compares $json.locale to nl', () => {
    const gate = node(verify, 'Locale Supported?');
    assert.ok(gate, 'Locale Supported? node missing');
    assert.equal(gate.type, 'n8n-nodes-base.if');
    const cond = gate.parameters.conditions.conditions[0];
    assert.equal(cond.leftValue, '={{ $json.locale }}');
    assert.equal(cond.rightValue, 'nl');
    assert.equal(cond.operator.type, 'string');
    assert.equal(cond.operator.operation, 'equals');
  });

  test('true → Report Prompt; false → Unsupported Locale → Log Failure', () => {
    assert.deepEqual(branch(verify, 'Locale Supported?', 0), ['Report Prompt']);
    assert.deepEqual(branch(verify, 'Locale Supported?', 1), ['Unsupported Locale']);
    assert.deepEqual(branch(verify, 'Unsupported Locale', 0), ['Log Failure']);
    assert.deepEqual(branch(verify, 'Log Failure', 0), ['Alert Failure']);
  });

  test('Unsupported Locale emits the exact record Log Failure and Alert Failure map', () => {
    const code = node(verify, 'Unsupported Locale').parameters.jsCode;
    const p = profile({ locale: 'en' });
    const $ = (name) => {
      assert.equal(name, 'Validate Token');
      return { first: () => ({ json: p }) };
    };
    const out = new Function('$', '$json', '$execution', code)($, p, { id: 77 });
    assert.equal(out.length, 1);
    const row = out[0].json;

    assert.equal(row.reason, 'unsupported-locale');
    assert.equal(typeof row.detail, 'string');
    assert.ok(row.detail.length > 0, 'detail must say what to do');
    assert.equal(row.rawResponse, '', 'no model was called, so there is no response');
    assert.equal(row.executionId, '77');
    assert.ok(
      !Number.isNaN(Date.parse(row.failedAt)),
      'failedAt must be an ISO timestamp',
    );
    assert.equal(row.parseValid, false);

    for (const f of ['token', 'firstName', 'email', 'locale', 'conclusionId']) {
      assert.equal(row[f], p[f], `Log Failure maps $json.${f}`);
    }
  });
});

describe('/submit — conclusionText rides the payload into the profile row (7b)', () => {
  function runNormalize(body) {
    const fn = new Function('$json', normalizeCode);
    return fn({ body, headers: {} })[0].json;
  }

  test('Normalize keeps conclusionText as a string', () => {
    const out = runNormalize({
      token: 't',
      conclusionText: 'Je blijft hopen.\n\nDat kost je.',
    });
    assert.equal(out.conclusionText, 'Je blijft hopen.\n\nDat kost je.');
  });

  test('a payload without it (the completion beacon) yields an empty string, not undefined', () => {
    const out = runNormalize({ token: 't', event: 'completion' });
    assert.equal(out.conclusionText, '');
  });

  test('Store Profile maps the column and carries its schema entry', () => {
    const cols = node(submit, 'Store Profile').parameters.columns;
    assert.equal(cols.value.conclusionText, '={{ $json.conclusionText }}');
    const schema = cols.schema.find((s) => s.id === 'conclusionText');
    assert.ok(schema, 'schema entry missing');
    assert.equal(schema.type, 'string');
  });
});

describe('the changeset files cannot drift from the snapshots', () => {
  const read = (f) => readFileSync(path.join(CHANGESET, f), 'utf8');

  test('generate-report.jsonBody.txt is byte-identical to the committed node', () => {
    assert.equal(read('generate-report.jsonBody.txt'), generateReportBody + '\n');
  });

  test('build-html.jsCode.js is byte-identical to the committed node', () => {
    assert.equal(read('build-html.jsCode.js'), buildHtmlCode + '\n');
  });

  test('unsupported-locale.jsCode.js is byte-identical to the committed node', () => {
    assert.equal(
      read('unsupported-locale.jsCode.js'),
      node(verify, 'Unsupported Locale').parameters.jsCode + '\n',
    );
  });

  test('normalize.jsCode.js is byte-identical to the committed node', () => {
    assert.equal(read('normalize.jsCode.js'), normalizeCode + '\n');
  });

  test('locale-supported.node.json matches the committed IF node', () => {
    const file = JSON.parse(read('locale-supported.node.json'));
    const live = node(verify, 'Locale Supported?');
    assert.deepEqual(file.parameters, live.parameters);
    assert.equal(file.type, live.type);
    assert.equal(file.typeVersion, live.typeVersion);
  });

  test('store-profile.columns.json carries the mapping and schema entries', () => {
    const file = JSON.parse(read('store-profile.columns.json'));
    const live = node(submit, 'Store Profile').parameters.columns;
    assert.equal(file.value.conclusionText, live.value.conclusionText);
    assert.deepEqual(
      file.schema[0],
      live.schema.find((s) => s.id === 'conclusionText'),
    );
  });

  test('the partial-update payload targets the live /verify workflow and adds both nodes', () => {
    const ops = JSON.parse(read('partial-update.operations.json'));
    assert.equal(ops.id, 'uKkMgMYoH5nOLoCR');
    const added = ops.operations
      .filter((o) => o.type === 'addNode')
      .map((o) => o.node.name);
    assert.deepEqual(added.sort(), ['Locale Supported?', 'Unsupported Locale']);
    const gr = ops.operations.find(
      (o) => o.type === 'updateNode' && o.nodeName === 'Generate Report',
    );
    assert.equal(gr.updates['parameters.jsonBody'], generateReportBody);
    const bh = ops.operations.find(
      (o) => o.type === 'updateNode' && o.nodeName === 'Build HTML',
    );
    assert.equal(bh.updates['parameters.jsCode'], buildHtmlCode);
  });
});
