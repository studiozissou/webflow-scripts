// Checks the template launch config and llms.txt skeleton are usable as copied: valid JSON launch-guard can read, and placeholders written as TODO- so launch-guard flags them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeConfig } from '../../tools/webflow/launch-guard.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'projects', '_template');

test('launch.config.json is valid and launch-guard reads its domain, locale and dev-switch attribute', () => {
  const config = normalizeConfig(JSON.parse(readFileSync(join(DIR, 'launch.config.json'), 'utf8')));
  assert.equal(config.domain, 'example.com');
  assert.equal(config.locales.length, 1);
  assert.equal(config.allowLocalAttr, 'data-allow-local');
});

test('llms.txt marks every missing owner input as TODO-, never a dummy value', () => {
  const text = readFileSync(join(DIR, 'llms.txt'), 'utf8');
  assert.match(text, /^# TODO-/);
  assert.doesNotMatch(text, /\d{6,}|example\.com|lorem/i);
});
