// Unit tests for the Oost llms.txt: correct email domain, the restaurant name line, the spekkoek order line and the current phone number.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'oost', 'llms.txt'),
  'utf8',
);

test('uses the oosteten.nl email domain', () => {
  assert.doesNotMatch(SOURCE, /oosteeten/);
  assert.match(SOURCE, /info@oosteten\.nl/);
});

test('names the business as Restaurant Oost in the contact block', () => {
  const contact = SOURCE.split('## Contact')[1];
  assert.match(contact, /^- Name: Restaurant Oost/m);
});

test('says spekkoek can be ordered', () => {
  assert.match(SOURCE, /^- Spekkoek to order \(spekkoek bestellen\)/m);
});

test('lists only the current phone number', () => {
  assert.doesNotMatch(SOURCE, /06-?48979760/);
  assert.match(SOURCE, /023-785 1562/);
});
