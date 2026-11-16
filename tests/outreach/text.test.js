// Covers the shared text helpers: visible page text, site name, stop-word language guess and je/u register guess.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessLanguage, guessRegister, pageText, siteName } from '../../tools/outreach/text.js';

test('pageText drops script, style, template and comments, decodes entities and collapses space', () => {
  const html = '<html><head><style>p{}</style><script>var x = "geheim";</script></head><body><!-- nee --><template>t</template><p>Brood &amp;\n  spelen</p></body></html>';
  assert.equal(pageText(html), 'Brood & spelen');
  assert.equal(pageText(''), '');
  assert.equal(pageText(null), '');
});

test('siteName prefers og:site_name, else the first title segment', () => {
  assert.equal(siteName('<meta content="Osteria Finta" property="og:site_name"><title>Welkom</title>'), 'Osteria Finta');
  assert.equal(siteName('<title>Bar Verzonnen: wijn en hapjes</title>'), 'Bar Verzonnen');
  assert.equal(siteName('<title>Taart Fantasie · Den Haag</title>'), 'Taart Fantasie');
  assert.equal(siteName('<title>Koffie-Fictief</title>'), 'Koffie-Fictief');
  assert.equal(siteName(''), null);
});

test('guessLanguage counts Dutch and English stop words, null when unclear', () => {
  assert.equal(guessLanguage('Welkom bij de bakker. Het brood is vers en een feest van smaak.'), 'nl');
  assert.equal(guessLanguage('Welcome to the bakery. The bread is fresh and full of flavour.'), 'en');
  assert.equal(guessLanguage('Pizza Pasta Vino'), null);
  assert.equal(guessLanguage(''), null);
});

test('guessRegister picks u when u/uw outnumber je/jij, else je', () => {
  assert.equal(guessRegister('Wij heten u welkom. Reserveer uw tafel en u krijgt een drankje.'), 'u');
  assert.equal(guessRegister('Kom je langs? Jij bent welkom, je krijgt koffie.'), 'je');
  assert.equal(guessRegister('Geen aanspreekvorm hier.'), 'je');
});
