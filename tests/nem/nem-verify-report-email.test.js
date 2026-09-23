/**
 * Unit tests for the `nem-report-email-template` changeset on the NEM Test `/verify`
 * workflow: the report email moves from a plain-text body to a branded MailerSend template,
 * with the PDF still attached.
 *
 * Evaluates the changeset's real files the way n8n does and asserts the body picks the
 * right template and subject per locale, personalises the greeting, keeps the attachment
 * byte for byte, and reads every field from a named node rather than bare `$json` (a Set
 * node now sits between Encode PDF and Send Report).
 *
 * Run: node --test tests/nem/nem-verify-report-email.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANGESET_DIR = path.join(
  __dirname, '..', '..', 'projects', 'nem-life', '.claude', 'backend', 'changesets', 'nem-report-email-template'
);

const EXPRESSION_FILE = path.join(CHANGESET_DIR, 'send-report.jsonBody.txt');
const MAIL_CONFIG_FILE = path.join(CHANGESET_DIR, 'report-mail-config.json');

const validateToken = { email: 'sjoerd@example.com', firstName: "Sjoerd d'Anjou", locale: 'nl' };
const encodePdf = { pdfBase64: 'JVBERi0xLjQKJcfsj6IK' };
const mailConfig = {
  reportTemplateNl: 'tpl-nl',
  reportTemplateEn: 'tpl-en',
  reportSubjectNl: 'Jouw NEM Test rapport',
  reportSubjectEn: 'Your NEM Test report',
};

const makeDollar = (outputs) => (name) => {
  if (!(name in outputs)) throw new Error(`referenced unknown node: ${name}`);
  return { first: () => ({ json: outputs[name] }) };
};

function evaluate(expression, outputs) {
  const match = expression.trim().match(/^=\{\{([\s\S]*)\}\}$/);
  assert.ok(match, 'expression must be of the form ={{ … }}');
  return new Function('$', `return (${match[1]});`)(makeDollar(outputs));
}

const send = (locale = 'nl') =>
  JSON.parse(
    evaluate(fs.readFileSync(EXPRESSION_FILE, 'utf8'), {
      'Validate Token': { ...validateToken, locale },
      'Encode PDF': encodePdf,
      'Report Mail Config': mailConfig,
    })
  );

describe('nem /verify — Send Report jsonBody', () => {
  const expression = fs.readFileSync(EXPRESSION_FILE, 'utf8');

  test('sends from hallo@nemmatters.com to the verified address', () => {
    const body = send();
    assert.deepStrictEqual(body.from, { email: 'hallo@nemmatters.com', name: 'NEM Life' });
    assert.deepStrictEqual(body.to, [{ email: 'sjoerd@example.com', name: "Sjoerd d'Anjou" }]);
  });

  test('picks the template and subject by locale, NL by default', () => {
    assert.strictEqual(send('nl').template_id, 'tpl-nl');
    assert.strictEqual(send('nl').subject, 'Jouw NEM Test rapport');
    assert.strictEqual(send('en').template_id, 'tpl-en');
    assert.strictEqual(send('en').subject, 'Your NEM Test report');
    assert.strictEqual(send('de').template_id, 'tpl-nl');
  });

  test('personalises first_name for the greeting', () => {
    const [p] = send().personalization;
    assert.strictEqual(p.email, 'sjoerd@example.com');
    assert.strictEqual(p.data.first_name, "Sjoerd d'Anjou");
  });

  test('keeps the PDF attachment byte for byte', () => {
    assert.deepStrictEqual(send().attachments, [
      { content: encodePdf.pdfBase64, filename: 'NEM-rapport.pdf', disposition: 'attachment' },
    ]);
  });

  test('the body lives in the template — no text or html in the request', () => {
    const body = send();
    assert.ok(!('text' in body) && !('html' in body));
  });

  test('reads every field from a named node, never bare $json', () => {
    assert.doesNotMatch(expression, /\$json\./);
    assert.match(expression, /\$\('Encode PDF'\)\.first\(\)\.json\.pdfBase64/);
  });
});

describe('nem /verify — Report Mail Config Set node', () => {
  const node = JSON.parse(fs.readFileSync(MAIL_CONFIG_FILE, 'utf8'));

  test('is a Set node on typeVersion 3.5 that passes the PDF through', () => {
    assert.strictEqual(node.name, 'Report Mail Config');
    assert.strictEqual(node.type, 'n8n-nodes-base.set');
    assert.strictEqual(node.typeVersion, 3.5);
    assert.strictEqual(node.parameters.includeOtherFields, true);
  });

  test('holds the real template ids and subjects as fixed values', () => {
    const values = Object.fromEntries(node.parameters.assignments.assignments.map((a) => [a.name, a.value]));
    assert.deepStrictEqual(values, {
      reportTemplateNl: 'neqvygmxz9zl0p7w',
      reportTemplateEn: 'z3m5jgrr7qogdpyo',
      reportSubjectNl: 'Jouw NEM Test rapport',
      reportSubjectEn: 'Your NEM Test report',
    });
  });
});

describe('nem /verify — the MailerSend report templates', () => {
  for (const locale of ['nl', 'en']) {
    const html = fs.readFileSync(path.join(CHANGESET_DIR, `report-template.${locale}.html`), 'utf8');

    test(`${locale}: greets with {{ first_name }} and carries no verify link`, () => {
      assert.ok(html.includes('{{ first_name }}'));
      assert.ok(!html.includes('verify_url'));
    });

    test(`${locale}: no link wraps a table, and the address cannot be auto-linked`, () => {
      assert.doesNotMatch(html, /<a\b[^>]*>\s*<table/i);
      assert.match(html, /Waterstraat&zwnj; 5/);
    });

    test(`${locale}: no placeholder survives, and the banner logo is the hosted PNG`, () => {
      assert.doesNotMatch(html, /REPLACE_/);
      assert.match(html, /<img src="https:\/\/cdn\.prod\.website-files\.com\/[^"]+\.png" alt="NEM Life"/);
    });
  }
});
