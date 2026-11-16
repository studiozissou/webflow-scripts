// Covers fact collection for drafts: the seed love note wins, site heuristics with source URLs, GBP topics and review snippets, lookalike openers and the generic fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalise, siteFacts, gbpFacts } from '../../tools/outreach/personalise.js';

const HOME = 'https://bakkerij-verzonnen.test/';
const ABOUT = 'https://bakkerij-verzonnen.test/over-ons';
const GBP = 'https://www.google.com/maps?cid=1111111111111111111';

const HOME_HTML = `<html><head><title>Bakkerij Verzonnen</title><script>var x = "eigenaar Fake";</script></head>
<body><h1>Elke ochtend vers uit de houtoven</h1><p>Wij zijn bekend om onze zuurdesem krentenbollen.</p></body></html>`;
const ABOUT_HTML = `<html><body><p>Bakkerij Verzonnen bestaat sinds 1987. Eigenaar Marloes bakt nog elke dag mee.</p></body></html>`;

const INFO = { check_url: GBP, place_topics: { croissants: 30, koffie: 12, terras: 4, taart: 2 } };
const REVIEWS = [
  { review_text: 'De croissants zijn de beste van de buurt. Ook de koffie is top.' },
  { review_text: '' },
  { review_text: 'Vriendelijk personeel en een mooi terras.' },
];

const seed = (over = {}) => ({ name: 'Bakkerij Verzonnen', domain: 'bakkerij-verzonnen.test', source: 'seed', ...over });

test('siteFacts finds owner, founding year, signature product and own phrasing, each with its page URL', () => {
  const facts = [...siteFacts(HOME_HTML, HOME), ...siteFacts(ABOUT_HTML, ABOUT)];
  const by = (kind) => facts.find((f) => f.kind === kind);
  assert.deepEqual(by('owner'), { kind: 'owner', value: 'Marloes', source: ABOUT });
  assert.deepEqual(by('founded'), { kind: 'founded', value: '1987', source: ABOUT });
  assert.deepEqual(by('signature'), { kind: 'signature', value: 'zuurdesem krentenbollen', source: HOME });
  assert.deepEqual(by('phrase'), { kind: 'phrase', value: 'Elke ochtend vers uit de houtoven', source: HOME });
});

test('siteFacts reads English pages too', () => {
  const facts = siteFacts('<body><p>Founded by Priya in 2011, we are famous for our cardamom buns!</p></body>', HOME);
  assert.deepEqual(facts.map((f) => [f.kind, f.value]), [['owner', 'Priya'], ['founded', '2011'], ['signature', 'cardamom buns']]);
});

test('siteFacts ignores script text and returns nothing for a bare page', () => {
  assert.deepEqual(siteFacts('<html><head><script>eigenaar Fake sinds 1999</script></head><body></body></html>', HOME), []);
});

test('gbpFacts takes the top 3 place topics and short review snippets, sourced to the GBP URL', () => {
  const facts = gbpFacts(INFO, REVIEWS);
  assert.deepEqual(facts.filter((f) => f.kind === 'review-theme').map((f) => f.value), ['croissants', 'koffie', 'terras']);
  const snippets = facts.filter((f) => f.kind === 'review');
  assert.equal(snippets.length, 2);
  assert.equal(snippets[0].value, 'De croissants zijn de beste van de buurt.');
  assert.ok(facts.every((f) => f.source === GBP));
});

test('gbpFacts copes with missing info and reviews', () => {
  assert.deepEqual(gbpFacts(null, null), []);
});

test('a seed love note comes first and the opener is seed', () => {
  const r = personalise({ row: seed({ love: 'the Saturday sourdough class' }), pages: [{ url: HOME, html: HOME_HTML }], info: INFO, reviews: REVIEWS });
  assert.equal(r.opener, 'seed');
  assert.equal(r.draftKind, 'personal');
  assert.deepEqual(r.facts[0], { kind: 'love', value: 'the Saturday sourdough class', source: 'seeds.json' });
  assert.equal(r.ownerName, null);
});

test('the owner name is exposed for the greeting', () => {
  const r = personalise({ row: seed(), pages: [{ url: ABOUT, html: ABOUT_HTML }] });
  assert.equal(r.ownerName, 'Marloes');
});

test('a lookalike never gets a love fact or a seed opener', () => {
  const r = personalise({ row: seed({ source: 'lookalike', love: 'should not be used' }), pages: [{ url: HOME, html: HOME_HTML }], info: INFO, reviews: REVIEWS });
  assert.equal(r.opener, 'lookalike');
  assert.equal(r.facts.some((f) => f.kind === 'love'), false);
  assert.ok(r.facts.length > 0);
});

test('no facts gives draftKind generic', () => {
  const r = personalise({ row: seed({ source: 'lookalike' }), pages: [{ url: HOME, html: '<html><body></body></html>' }] });
  assert.deepEqual(r.facts, []);
  assert.equal(r.draftKind, 'generic');
  assert.equal(r.opener, 'lookalike');
});

test('the same fact on two pages is kept once', () => {
  const r = personalise({ row: seed(), pages: [{ url: ABOUT, html: ABOUT_HTML }, { url: `${ABOUT}?x`, html: ABOUT_HTML }] });
  assert.equal(r.facts.filter((f) => f.kind === 'owner').length, 1);
});
