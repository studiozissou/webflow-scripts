// Unit tests for the Oost llms.txt: correct email domain, the restaurant name line, the spekkoek order line, the current phone number, the 17:00–21:00 hours line, the Christmas and New Year 2026 line and the restored lunch lines.
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

test('does not claim all five national dishes are on the menu', () => {
  assert.doesNotMatch(SOURCE, /five of Indonesia's national dishes/);
  assert.doesNotMatch(SOURCE, /gado-gado/i);
});

test('does not claim half the menu is vegetarian', () => {
  assert.doesNotMatch(SOURCE, /half of it is vegetarian/i);
  assert.match(SOURCE, /large part of it is vegetarian/);
});

test('lists only the current phone number', () => {
  assert.doesNotMatch(SOURCE, /06-?48979760/);
  assert.match(SOURCE, /023-785 1562/);
});

test('puts the station a 15-minute walk away', () => {
  assert.match(SOURCE, /15 minutes' walk from Haarlem station/);
  assert.doesNotMatch(SOURCE, /10 minutes' walk/);
});

test('does not mention WhatsApp', () => {
  assert.doesNotMatch(SOURCE, /whatsapp/i);
});

test('gives the new hours: 17:00–21:00 every day except Tuesday', () => {
  assert.match(SOURCE, /^- Hours: 17:00–21:00 every day except Tuesday \(closed\)$/m);
  assert.doesNotMatch(SOURCE, /12:00|22:00/);
});

test('gives the Christmas and New Year 2026 line after the hours', () => {
  assert.match(
    SOURCE,
    /^- Hours: .*\n- Christmas and New Year 2026: Christmas deal of soto, rijsttafel and spekkoek, €34\.50 per person, orderable for one, vegetarian version at the same price\./m,
  );
  assert.match(SOURCE, /up to 20 Dec and collect on 23 or 24 Dec, 15:00–17:00/);
  assert.match(SOURCE, /up to 27 Dec and collect on 31 Dec, 15:00–17:00/);
  assert.match(SOURCE, /closed 24, 25 and 26 Dec, 31 Dec and 1 Jan \(24 and 31 Dec: pre-order pickup only\)/);
});

test('offers lunch catering again', () => {
  assert.match(SOURCE, /^- \[Catering\]\(https:\/\/www\.oosteten\.nl\/catering\): buffet, lunchboxes, borrel snacks/m);
  assert.match(SOURCE, /^- For 10\+ people in Haarlem and surroundings: birthdays, borrels, weddings, office lunches$/m);
  assert.match(
    SOURCE,
    /^- Lunchbox: nasi campur per person with four dishes, rice, egg, kroepoek and sambal, from €17\.50 pp; available from 11:30$/m,
  );
  assert.doesNotMatch(SOURCE, /11:30 AM/);
});
