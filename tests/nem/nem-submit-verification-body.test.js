/**
 * Unit tests for the `Send Verification` node's jsonBody expression in the NEM Test
 * `/submit` n8n workflow (slug: nem-verification-email-mailersend).
 *
 * Written before the changeset exists (TDD): the expression file is read from the
 * changeset folder and evaluated the way n8n does, with `$json` bound to a normalised
 * submission. Until /build writes that file every test here fails on the missing read.
 *
 * Run: node --test tests/nem/nem-submit-verification-body.test.js
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
  'nem-verification-mailersend',
);

const EXPRESSION_FILE = path.join(CHANGESET_DIR, 'send-verification.jsonBody.txt');
const CONFIG_FILE = path.join(CHANGESET_DIR, 'mail-config.json');

const readConfig = () => JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const TEMPLATE_NL = () => readConfig().verificationTemplateNl;
const TEMPLATE_EN = () => readConfig().verificationTemplateEn;

/* The row Normalize hands to Store Profile, as the expression sees it in `$json`. */
const submission = (overrides = {}) => ({
  token: 'tok_abc123',
  email: 'anna@example.com',
  firstName: 'Anna',
  locale: 'nl',
  verifyUrl: 'https://reus.app.n8n.cloud/webhook/nem-verify?token=tok_abc123',
  ...overrides,
});

/* n8n evaluates `={{ <js> }}` as a JS expression with `$json` and `$('Node')` in scope. */
function evaluate(json) {
  const raw = fs.readFileSync(EXPRESSION_FILE, 'utf8').trim();
  const inner = raw.replace(/^=\{\{/, '').replace(/\}\}$/, '');
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const nodeLookup = (name) => {
    if (name === 'Mail Config') return { first: () => ({ json: config }) };
    throw new Error(`unexpected node reference ${name}`);
  };
  const fn = new Function('$json', '$', `return (${inner});`);
  return JSON.parse(fn(json, nodeLookup));
}

describe('Send Verification — request body (MailerSend template)', () => {
  test('sends from hallo@nemmatters.com as NEM Life to the submitted address and first name', () => {
    const body = evaluate(submission());
    assert.deepEqual(body.from, { email: 'hallo@nemmatters.com', name: 'NEM Life' });
    assert.deepEqual(body.to, [{ email: 'anna@example.com', name: 'Anna' }]);
  });

  test('uses the NL template for locale nl and the EN template for locale en', () => {
    assert.equal(evaluate(submission({ locale: 'nl' })).template_id, TEMPLATE_NL());
    assert.equal(evaluate(submission({ locale: 'en' })).template_id, TEMPLATE_EN());
  });

  test('an unknown locale falls back to NL', () => {
    assert.equal(evaluate(submission({ locale: 'de' })).template_id, TEMPLATE_NL());
  });

  test('personalises first_name and verify_url for the recipient, nothing else', () => {
    const body = evaluate(submission());
    assert.deepEqual(body.personalization, [
      {
        email: 'anna@example.com',
        data: {
          first_name: 'Anna',
          verify_url: 'https://reus.app.n8n.cloud/webhook/nem-verify?token=tok_abc123',
        },
      },
    ]);
  });

  test('subject and text are left to the template', () => {
    const body = evaluate(submission());
    assert.equal(body.subject, undefined);
    assert.equal(body.text, undefined);
    assert.equal(body.html, undefined);
  });

  test('values are interpolated, not embedded: a quote in the name survives', () => {
    const body = evaluate(submission({ firstName: 'D\'Arcy "Dee"' }));
    assert.equal(body.to[0].name, 'D\'Arcy "Dee"');
    assert.equal(body.personalization[0].data.first_name, 'D\'Arcy "Dee"');
  });
});

describe('Mail Config — template ids', () => {
  test('exposes both template ids under the names the expression reads', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    assert.equal(typeof config.verificationTemplateNl, 'string');
    assert.equal(typeof config.verificationTemplateEn, 'string');
    assert.notEqual(config.verificationTemplateNl, config.verificationTemplateEn);
  });
});
