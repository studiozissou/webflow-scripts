/**
 * Unit tests for the `nem-verification-mailersend` changeset on the NEM Test `/submit`
 * n8n workflow (slug: nem-verification-email-mailersend).
 *
 * The verification email moves from a MailerLite group-join automation (7 s to ~3 min on
 * MailerLite's own queue) to a MailerSend template sent from inside the `/submit`
 * execution, ahead of `Respond OK`. These tests evaluate the changeset's real files the
 * way n8n does and assert:
 *   - the `Send Verification` body targets the right template per locale and carries the
 *     personalisation the template needs (`first_name`, `verify_url`)
 *   - profile fields are read from `Normalize`, never bare `$json` (a Set node now sits
 *     upstream and would rebind it)
 *   - the failure branch shapes the row `nem_report_failures` expects, and alerts
 *   - the operations payload is byte-identical to the tested files and wires the chain
 *     Store Profile → Mail Config → Send Verification → MailerLite → Respond OK
 *
 * Run: node --test tests/nem/nem-submit-verification-body.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BACKEND_DIR = path.join(__dirname, '..', '..', 'projects', 'nem-life', '.claude', 'backend');
const CHANGESET_DIR = path.join(BACKEND_DIR, 'changesets', 'nem-verification-mailersend');

const EXPRESSION_FILE = path.join(CHANGESET_DIR, 'send-verification.jsonBody.txt');
const MAIL_CONFIG_FILE = path.join(CHANGESET_DIR, 'mail-config.json');
const FAILED_CODE_FILE = path.join(CHANGESET_DIR, 'verification-failed.jsCode.js');
const OPERATIONS_FILE = path.join(CHANGESET_DIR, 'partial-update.operations.json');
const SNAPSHOT_FILE = path.join(BACKEND_DIR, 'nem-submit.workflow.json');

const SUBMIT_WORKFLOW_ID = 'LDI1eWR35lwX6WLp';
const MAILERSEND_CREDENTIAL_ID = '699carSHScI1ng0W';
const FAILURES_TABLE_ID = 'lzD76BzG472abwmA';
const PENDING_GROUP_ID = '192344920326931926';

/** Profile fields as `Normalize` emits them. Deliberately contains an apostrophe. */
const normalizeOutput = {
  token: 'verify-0f1e2d3c',
  email: 'sjoerd@example.com',
  firstName: "Sjoerd d'Anjou",
  locale: 'nl',
  conclusionId: '01F-FH-FP',
  verifyUrl: 'https://reus.app.n8n.cloud/webhook/nem-verify?token=verify-0f1e2d3c',
};

const mailConfigOutput = {
  verificationTemplateNl: 'tpl-nl-000',
  verificationTemplateEn: 'tpl-en-000',
  verificationSubjectNl: 'Nog één stap: bevestig je e-mailadres',
  verificationSubjectEn: 'One more step: confirm your email',
};

/** n8n's `$(nodeName)` accessor, bound to the given upstream outputs. */
const makeDollar = (nodeOutputs) => (nodeName) => {
  if (!(nodeName in nodeOutputs)) {
    throw new Error(`referenced unknown node: ${nodeName}`);
  }
  return { first: () => ({ json: nodeOutputs[nodeName] }) };
};

/**
 * Mimics n8n's expression evaluation: strip the `={{ … }}` wrapper and run the inner
 * source as JavaScript with `$(nodeName)` bound to the upstream outputs.
 */
function evaluateN8nExpression(expression, nodeOutputs) {
  const trimmed = expression.trim();
  const match = trimmed.match(/^=\{\{([\s\S]*)\}\}$/);
  assert.ok(match, 'expression must be of the form ={{ … }}');
  return new Function('$', `return (${match[1]});`)(makeDollar(nodeOutputs));
}

/** Runs a Code node's source the way n8n does: `$`, `$json` and `$execution` in scope. */
function runCodeNode(code, { nodeOutputs, json, executionId }) {
  return new Function('$', '$json', '$execution', code)(makeDollar(nodeOutputs), json, { id: executionId });
}

const send = (overrides = {}) =>
  JSON.parse(
    evaluateN8nExpression(fs.readFileSync(EXPRESSION_FILE, 'utf8'), {
      Normalize: { ...normalizeOutput, ...overrides.normalize },
      'Mail Config': { ...mailConfigOutput, ...overrides.mailConfig },
    })
  );

describe('nem /submit — Send Verification jsonBody', () => {
  const expression = fs.readFileSync(EXPRESSION_FILE, 'utf8');

  test('evaluates to a valid JSON string', () => {
    const body = evaluateN8nExpression(expression, {
      Normalize: normalizeOutput,
      'Mail Config': mailConfigOutput,
    });
    assert.strictEqual(typeof body, 'string');
    assert.doesNotThrow(() => JSON.parse(body));
  });

  test('sends from hallo@nemmatters.com as NEM Life, like the report', () => {
    assert.deepStrictEqual(send().from, { email: 'hallo@nemmatters.com', name: 'NEM Life' });
  });

  test('addresses the submitter by email and first name', () => {
    assert.deepStrictEqual(send().to, [{ email: 'sjoerd@example.com', name: "Sjoerd d'Anjou" }]);
  });

  test('locale nl uses the NL template', () => {
    assert.strictEqual(send().template_id, 'tpl-nl-000');
  });

  test('locale en uses the EN template', () => {
    assert.strictEqual(send({ normalize: { locale: 'en' } }).template_id, 'tpl-en-000');
  });

  test('any other locale falls back to NL — the site default', () => {
    assert.strictEqual(send({ normalize: { locale: 'de' } }).template_id, 'tpl-nl-000');
  });

  test('personalises first_name and verify_url — the template greets and links with them', () => {
    const [p] = send().personalization;
    assert.strictEqual(p.email, 'sjoerd@example.com');
    assert.strictEqual(p.data.first_name, "Sjoerd d'Anjou");
    assert.strictEqual(p.data.verify_url, normalizeOutput.verifyUrl);
  });

  test('verify_url is passed through untouched — the token must survive byte for byte', () => {
    const url = 'https://reus.app.n8n.cloud/webhook/nem-verify?token=a%2Bb%3Dc';
    assert.strictEqual(send({ normalize: { verifyUrl: url } }).personalization[0].data.verify_url, url);
  });

  test('sends a subject — MailerSend 422s a template send without one (exec #338)', () => {
    assert.strictEqual(send().subject, 'Nog één stap: bevestig je e-mailadres');
    assert.strictEqual(send({ normalize: { locale: 'en' } }).subject, 'One more step: confirm your email');
  });

  test('text and html live in the template, not in the body', () => {
    const body = send();
    for (const key of ['text', 'html']) assert.ok(!(key in body), `unexpected ${key}`);
  });

  test('reads profile fields via $(\'Normalize\'), not bare $json', () => {
    // Mail Config (a Set node) now sits between Store Profile and this node, so a bare
    // `$json.` would read whatever it happens to pass through.
    assert.doesNotMatch(expression, /\$json\./);
    assert.match(expression, /\$\('Normalize'\)\.first\(\)\.json\./);
  });

  test('reads the template ids from Mail Config, not literals', () => {
    assert.match(expression, /\$\('Mail Config'\)\.first\(\)\.json\.verificationTemplateNl/);
    assert.match(expression, /\$\('Mail Config'\)\.first\(\)\.json\.verificationTemplateEn/);
  });
});

describe('nem /submit — Mail Config Set node', () => {
  const node = JSON.parse(fs.readFileSync(MAIL_CONFIG_FILE, 'utf8'));

  test('is a Set node on typeVersion 3.5 named Mail Config', () => {
    assert.strictEqual(node.name, 'Mail Config');
    assert.strictEqual(node.type, 'n8n-nodes-base.set');
    assert.strictEqual(node.typeVersion, 3.5);
  });

  test('holds the two template ids and two subjects as fixed string values', () => {
    const assignments = node.parameters.assignments.assignments;
    assert.deepStrictEqual(
      assignments.map((a) => a.name).sort(),
      ['verificationSubjectEn', 'verificationSubjectNl', 'verificationTemplateEn', 'verificationTemplateNl']
    );
    for (const a of assignments) {
      assert.strictEqual(a.type, 'string');
      assert.ok(!String(a.value).startsWith('='), `${a.name} must be a fixed value, not an expression`);
      assert.ok(String(a.value).length > 0, `${a.name} must not be empty`);
    }
  });

  test('passes the profile through — nothing downstream loses a field', () => {
    assert.strictEqual(node.parameters.includeOtherFields, true);
  });
});

describe('nem /submit — Verification Failed code node', () => {
  const code = fs.readFileSync(FAILED_CODE_FILE, 'utf8');
  const errorItem = {
    error: { message: 'Request failed with status code 422', description: 'The template_id field is invalid.' },
  };

  const run = (json = errorItem) =>
    runCodeNode(code, { nodeOutputs: { Normalize: normalizeOutput }, json, executionId: 4242 })[0].json;

  test('emits the row shape Log Failure in /verify already writes', () => {
    const row = run();
    for (const key of ['token', 'email', 'firstName', 'locale', 'conclusionId', 'reason', 'detail', 'rawResponse', 'executionId', 'failedAt']) {
      assert.ok(key in row, `missing ${key}`);
    }
  });

  test('reason is verification_send — distinguishable from report failures in the same table', () => {
    assert.strictEqual(run().reason, 'verification_send');
  });

  test('keeps the profile from Normalize, not from the error item', () => {
    const row = run();
    assert.strictEqual(row.email, normalizeOutput.email);
    assert.strictEqual(row.firstName, normalizeOutput.firstName);
    assert.strictEqual(row.token, normalizeOutput.token);
    assert.strictEqual(row.conclusionId, normalizeOutput.conclusionId);
  });

  test('detail names the MailerSend error so the alert is readable', () => {
    assert.match(run().detail, /422/);
  });

  test('rawResponse is the serialised error, capped at 2000 characters', () => {
    const long = { error: { message: 'x'.repeat(5000) } };
    assert.strictEqual(run(long).rawResponse.length, 2000);
    assert.match(run().rawResponse, /template_id/);
  });

  test('executionId is a string and failedAt is an ISO timestamp', () => {
    const row = run();
    assert.strictEqual(row.executionId, '4242');
    assert.doesNotThrow(() => new Date(row.failedAt).toISOString());
  });

  test('survives an error item with no error object at all', () => {
    const row = run({});
    assert.strictEqual(row.reason, 'verification_send');
    assert.strictEqual(typeof row.detail, 'string');
  });
});

describe('nem /submit — the apply payload matches what was tested', () => {
  const ops = JSON.parse(fs.readFileSync(OPERATIONS_FILE, 'utf8'));
  const expression = fs.readFileSync(EXPRESSION_FILE, 'utf8').trim();
  const mailConfig = JSON.parse(fs.readFileSync(MAIL_CONFIG_FILE, 'utf8'));
  const failedCode = fs.readFileSync(FAILED_CODE_FILE, 'utf8');

  const added = (name) => ops.operations.find((op) => op.type === 'addNode' && op.node?.name === name)?.node;
  const connections = ops.operations.filter((op) => op.type === 'addConnection');
  const hasConnection = (source, target, sourceIndex = 0) =>
    connections.some((c) => c.source === source && c.target === target && (c.sourceIndex ?? 0) === sourceIndex);

  test('targets the live /submit workflow', () => {
    assert.strictEqual(ops.id, SUBMIT_WORKFLOW_ID);
  });

  test('Send Verification jsonBody is byte-identical to the tested expression', () => {
    assert.strictEqual(added('Send Verification')?.parameters.jsonBody, expression);
  });

  test('Send Verification posts to MailerSend with the MailerSend credential', () => {
    const node = added('Send Verification');
    assert.strictEqual(node.parameters.url, 'https://api.mailersend.com/v1/email');
    assert.strictEqual(node.parameters.method, 'POST');
    assert.strictEqual(node.credentials.httpHeaderAuth.id, MAILERSEND_CREDENTIAL_ID);
  });

  test('Send Verification retries 3 × 5 s, then routes to its error output', () => {
    const node = added('Send Verification');
    assert.strictEqual(node.retryOnFail, true);
    assert.strictEqual(node.maxTries, 3);
    assert.strictEqual(node.waitBetweenTries, 5000);
    assert.strictEqual(node.onError, 'continueErrorOutput');
  });

  test('Mail Config in the payload is identical to the tested node', () => {
    const node = added('Mail Config');
    assert.deepStrictEqual(node.parameters, mailConfig.parameters);
    assert.strictEqual(node.typeVersion, mailConfig.typeVersion);
  });

  test('Verification Failed jsCode is byte-identical to the tested code', () => {
    assert.strictEqual(added('Verification Failed')?.parameters.jsCode, failedCode);
  });

  test('Log Send Failure writes to nem_report_failures with the same columns as /verify', () => {
    const node = added('Log Send Failure');
    assert.strictEqual(node.parameters.dataTableId.value, FAILURES_TABLE_ID);
    assert.deepStrictEqual(
      Object.keys(node.parameters.columns.value).sort(),
      ['conclusionId', 'email', 'executionId', 'firstName', 'locale', 'rawResponse', 'reason', 'timestamp', 'token']
    );
  });

  test('Alert Failure goes to Will, tagged [DEV], and never blocks the response', () => {
    const node = added('Alert Failure');
    assert.match(node.parameters.jsonBody, /will@teamzissou\.io/);
    assert.match(node.parameters.jsonBody, /\[DEV\]/);
    assert.strictEqual(node.credentials.httpHeaderAuth.id, MAILERSEND_CREDENTIAL_ID);
    assert.strictEqual(node.onError, 'continueRegularOutput');
  });

  test('Respond Error answers { status: "error" } — the component shows errors.generic', () => {
    assert.match(added('Respond Error')?.parameters.responseBody, /"status":\s*"error"/);
  });

  test('renames the MailerLite node and rebinds its body to Normalize', () => {
    const rename = ops.operations.find(
      (op) => op.type === 'updateNode' && op.nodeName === 'MailerLite: Send Verification'
    );
    assert.ok(rename, 'expected an updateNode op for the MailerLite node');
    assert.strictEqual(rename.updates.name, 'MailerLite: Pending group');
    const body = rename.updates['parameters.jsonBody'];
    assert.doesNotMatch(body, /\$json\./);
    assert.match(body, /\$\('Normalize'\)\.first\(\)\.json\.email/);
    assert.match(body, /status:\s*'active'/);
    assert.match(body, /resubscribe:\s*true/);
    assert.match(body, new RegExp(PENDING_GROUP_ID));
    assert.strictEqual(rename.updates.onError, 'continueRegularOutput');
  });

  test('wires Store Profile → Mail Config → Send Verification → MailerLite → Respond OK', () => {
    const rewire = ops.operations.find((op) => op.type === 'rewireConnection' && op.source === 'Store Profile');
    assert.ok(rewire, 'expected Store Profile to be rewired');
    assert.strictEqual(rewire.from, 'MailerLite: Pending group');
    assert.strictEqual(rewire.to, 'Mail Config');
    assert.ok(hasConnection('Mail Config', 'Send Verification'));
    assert.ok(hasConnection('Send Verification', 'MailerLite: Pending group', 0));
  });

  test('wires the error output to the failure chain, ending in Respond Error', () => {
    assert.ok(hasConnection('Send Verification', 'Verification Failed', 1));
    assert.ok(hasConnection('Verification Failed', 'Log Send Failure'));
    assert.ok(hasConnection('Log Send Failure', 'Alert Failure'));
    assert.ok(hasConnection('Alert Failure', 'Respond Error'));
  });

  test('leaves the honeypot, rate-limit and completion paths untouched', () => {
    const touched = ops.operations
      .flatMap((op) => [op.nodeName, op.node?.name, op.source, op.target, op.from, op.to])
      .filter(Boolean);
    const untouchable = [
      'Honeypot filled?', 'Respond OK (honeypot)', 'Rate limit', 'Rate limited?', 'Respond Rate Limited',
      'Completion?', 'Log Completion', 'Respond OK (completion)', 'Normalize', 'Webhook',
    ];
    for (const name of untouchable) {
      assert.ok(!touched.includes(name), `${name} must not be touched`);
    }
  });
});

describe('nem /submit — the committed snapshot carries the same code as the changeset', () => {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const find = (name) => snapshot.nodes.find((n) => n.name === name);

  test('Send Verification jsonBody matches the expression file', () => {
    assert.strictEqual(
      find('Send Verification')?.parameters.jsonBody,
      fs.readFileSync(EXPRESSION_FILE, 'utf8').trim()
    );
  });

  test('Verification Failed jsCode matches the code file', () => {
    assert.strictEqual(find('Verification Failed')?.parameters.jsCode, fs.readFileSync(FAILED_CODE_FILE, 'utf8'));
  });

  test('the old MailerLite: Send Verification node is gone', () => {
    assert.strictEqual(find('MailerLite: Send Verification'), undefined);
    assert.ok(find('MailerLite: Pending group'));
  });
});
