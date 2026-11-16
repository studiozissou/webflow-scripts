// Covers resolving a seed domain to its Google profile: site name from og:site_name or the title, the Maps query, domain-only matching, the postcode tie-break between several locations, and unmatched results.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS_DEFAULTS, buildQuery, pickMatch, resolve } from '../../tools/outreach/resolve.js';
import { siteName } from '../../tools/outreach/text.js';
import { BudgetExceeded } from '../../tools/outreach/dataforseo.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const itemsOf = (name) => fixture(name).tasks[0].result[0].items;

function fakeClient(body) {
  const calls = [];
  return {
    calls,
    async post(endpoint, tasks) {
      calls.push({ endpoint, tasks });
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

const page = (head) => `<!doctype html><html><head>${head}</head><body><p>Verzinstraat 12, 2599 ZZ Den Haag</p></body></html>`;

test('siteName prefers og:site_name, in either attribute order', () => {
  assert.equal(siteName(page('<title>Home | Iets Anders</title><meta property="og:site_name" content="Trattoria Fittizia">')), 'Trattoria Fittizia');
  assert.equal(siteName(page("<meta content='Osteria Finta' property='og:site_name'><title>Welkom</title>")), 'Osteria Finta');
});

test('siteName takes the first title segment before | - – — :', () => {
  assert.equal(siteName(page('<title>Trattoria Fittizia | Italiaans in Den Haag</title>')), 'Trattoria Fittizia');
  assert.equal(siteName(page('<title>Bar Verzonnen - Home</title>')), 'Bar Verzonnen');
  assert.equal(siteName(page('<title>Bar Verzonnen – Home</title>')), 'Bar Verzonnen');
  assert.equal(siteName(page('<title>Bar Verzonnen — Home</title>')), 'Bar Verzonnen');
  assert.equal(siteName(page('<title>Bar Verzonnen: wijn en hapjes</title>')), 'Bar Verzonnen');
  assert.equal(siteName(page('<title>\n  Koffie-Fictief  \n</title>')), 'Koffie-Fictief');
});

test('siteName decodes entities and returns null with no usable name', () => {
  assert.equal(siteName(page('<title>Gelateria Inventata&#x27;s | IJs</title>')), "Gelateria Inventata's");
  assert.equal(siteName(page('<meta property="og:site_name" content="Brood &amp; Spelen">')), 'Brood & Spelen');
  assert.equal(siteName(page('<title>   </title>')), null);
  assert.equal(siteName(page('')), null);
  assert.equal(siteName(null), null);
});

test('buildQuery is "<name> Den Haag" and the Maps task uses the Den Haag coordinate, nl, depth 20', () => {
  assert.equal(buildQuery('Trattoria Fittizia'), 'Trattoria Fittizia Den Haag');
  assert.deepEqual(MAPS_DEFAULTS, { location_coordinate: '52.0705,4.3007,13z', language_code: 'nl', depth: 20 });
});

test('pickMatch accepts only items whose domain equals the seed after stripping scheme, www. and path', () => {
  const items = itemsOf('maps-serp');
  assert.equal(pickMatch(items, 'https://osteria-finta.test/menu').cid, '2000000000000000002');
  assert.equal(pickMatch(items, 'www.pasta-immaginaria.test').cid, '2000000000000000001');
  assert.equal(pickMatch(items, 'immaginaria.test'), null);
  assert.equal(pickMatch(items, 'pasta-immaginaria.test.evil.test'), null);
  assert.equal(pickMatch(items, 'senza-sito.test'), null);
});

test('pickMatch with several matches prefers the site postcode, else the best-ranked match', () => {
  const items = itemsOf('maps-serp-multilocation');
  assert.equal(pickMatch(items, 'gelateria-inventata.test', '2518 ZZ').cid, '3000000000000000002');
  assert.equal(pickMatch(items, 'gelateria-inventata.test', '2511ZZ').cid, '3000000000000000001');
  assert.equal(pickMatch(items, 'gelateria-inventata.test', '9999AA').cid, '3000000000000000001');
  assert.equal(pickMatch(items, 'gelateria-inventata.test').cid, '3000000000000000001');
  const serp = itemsOf('maps-serp');
  assert.equal(pickMatch(serp, 'trattoria-fittizia.test', '2586 ZZ').cid, '1234567890123456790', 'falls back to the address when address_info is absent');
});

test('resolve queries Maps once and returns the match', async () => {
  const client = fakeClient(fixture('maps-serp'));
  const html = page('<title>Trattoria Fittizia | Italiaans</title>');
  const r = await resolve({ client, url: 'https://www.trattoria-fittizia.test/', html });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].endpoint, 'serp/google/maps/live/advanced');
  assert.deepEqual(client.calls[0].tasks, [{ keyword: 'Trattoria Fittizia Den Haag', ...MAPS_DEFAULTS }]);
  assert.equal(r.matched, true);
  assert.equal(r.cid, '1234567890123456789', 'postcode 2599 ZZ from the page picks the main location');
  assert.equal(r.item.title, 'Trattoria Fittizia');
  assert.equal(r.query, 'Trattoria Fittizia Den Haag');
});

test('resolve uses an explicit postcode over the page text', async () => {
  const r = await resolve({ client: fakeClient(fixture('maps-serp')), url: 'https://trattoria-fittizia.test/', html: page('<title>Trattoria Fittizia</title>'), postcode: '2586ZZ' });
  assert.equal(r.cid, '1234567890123456790');
});

test('resolve returns unmatched when no item has the seed domain', async () => {
  const r = await resolve({ client: fakeClient(fixture('maps-serp')), url: 'https://onbekend.test/', html: page('<title>Onbekend</title>') });
  assert.equal(r.matched, false);
  assert.equal(r.status, 'unmatched');
});

test('resolve with no site name makes no call and is unmatched', async () => {
  const client = fakeClient(fixture('maps-serp'));
  const r = await resolve({ client, url: 'https://naamloos.test/', html: page('') });
  assert.equal(client.calls.length, 0);
  assert.equal(r.matched, false);
  assert.equal(r.status, 'unmatched');
});

test('resolve lets budget errors through to the caller', async () => {
  await assert.rejects(resolve({ client: fakeClient(new BudgetExceeded({ spent: 3, estimate: 0.002, limit: 3 })), url: 'https://x.test/', html: page('<title>X</title>') }), BudgetExceeded);
});
