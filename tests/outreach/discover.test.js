// Covers lookalike discovery: area lookup by postcode, the 4-week type x area rotation, chain, seen and no-website exclusion, the "likely needs help" pre-score, the per-run cap and the budget stop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ROTATION_DAYS, DEFAULT_LIMIT, areasForPostcodes, planQueries, isChain, preScore, selectCandidates, discover,
} from '../../tools/outreach/discover.js';
import { BudgetExceeded } from '../../tools/outreach/dataforseo.js';

const NOW = new Date('2026-11-12T07:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const itemsOf = (name) => fixture(name).tasks[0].result[0].items;

const AREAS = [
  { name: 'Centrum', postcodes: ['2511', '2512', '2513'] },
  { name: 'Zeeheldenkwartier', postcodes: ['2514'] },
  { name: 'Duinoord', postcodes: ['2518'] },
  { name: 'Scheveningen', postcodes: ['2586'] },
];

const loc = (domain, cid, over = {}) => ({ type: 'maps_search', rank_group: 1, domain, url: `https://${domain}/`, title: domain, cid, rating: { value: 4.5, votes_count: 30 }, is_claimed: true, total_photos: 40, ...over });

test('constants: 28-day rotation, ~20 per run', () => {
  assert.equal(ROTATION_DAYS, 28);
  assert.equal(DEFAULT_LIMIT, 20);
});

test('areasForPostcodes maps seed postcodes to neighbourhood names, once each, in areas.json order', () => {
  assert.deepEqual(areasForPostcodes(AREAS, ['2518 ZZ', '2511AA', '2512 BB', '9999XX', null]), ['Centrum', 'Duinoord']);
  assert.deepEqual(areasForPostcodes(AREAS, []), []);
});

test('planQueries crosses type x area, lowercased, skipping pairs queried in the last 28 days, oldest first', () => {
  const history = {
    'lunchroom centrum': daysAgo(3),
    'lunchroom duinoord': daysAgo(40),
    'wijnbar centrum': daysAgo(28),
  };
  const plan = planQueries({ types: ['Lunchroom', 'Wine bar'], areas: ['Centrum', 'Duinoord'], history, now: NOW, max: 10 });
  assert.deepEqual(plan.map((q) => q.query), ['wijnbar duinoord', 'lunchroom duinoord', 'wijnbar centrum']);
  assert.deepEqual(plan[0], { type: 'Wine bar', area: 'Duinoord', query: 'wijnbar duinoord' });
});

test('planQueries caps a run at a quarter of all pairs by default, or at max', () => {
  const types = ['Lunchroom', 'Wine bar', 'Barber shop'];
  const areas = ['Centrum', 'Duinoord', 'Scheveningen', 'Zeeheldenkwartier'];
  assert.equal(planQueries({ types, areas, history: {}, now: NOW }).length, 3);
  assert.equal(planQueries({ types, areas, history: {}, now: NOW, max: 5 }).length, 5);
  assert.equal(planQueries({ types: ['Lunchroom', 'Lunchroom'], areas: ['Centrum'], history: {}, now: NOW, max: 10 }).length, 1);
});

test('isChain: domain on chains.json, a name on chains.json, or 3+ locations in this run', () => {
  const chains = ['keten-koffie.test', 'bagelfictief'];
  assert.equal(isChain(loc('www.keten-koffie.test', '1'), { chains, counts: {} }), true);
  assert.equal(isChain(loc('bagelfictief.test', '1'), { chains, counts: {} }), true);
  assert.equal(isChain(loc('anders.test', '1', { title: 'BagelFictief Centrum' }), { chains, counts: {} }), true);
  assert.equal(isChain(loc('drie.test', '1'), { chains, counts: { 'drie.test': 3 } }), true);
  assert.equal(isChain(loc('twee.test', '1'), { chains, counts: { 'twee.test': 2 } }), false);
});

test('preScore ranks busy but thin profiles and builder subdomains higher', () => {
  const healthy = loc('gezond.test', '1', { rating: { value: 4.6, votes_count: 20 } });
  const busyThin = loc('druk.test', '2', { rating: { value: 4.4, votes_count: 180 }, is_claimed: false, total_photos: 6 });
  const builder = loc('bakker-fictief.wixsite.com', '3');
  assert.equal(preScore(healthy), 0);
  assert.ok(preScore(busyThin) > preScore(healthy));
  assert.ok(preScore(builder) > preScore(healthy));
});

test('selectCandidates drops items without a domain, chains, excluded domains, and duplicates', () => {
  const searches = [
    { type: 'Italian restaurant', area: 'Centrum', query: 'italian restaurant centrum', items: itemsOf('maps-serp') },
    { type: 'Ice cream shop', area: 'Centrum', query: 'ice cream shop centrum', items: itemsOf('maps-serp-multilocation') },
    { type: 'Coffee shop', area: 'Centrum', query: 'coffee shop centrum', items: [loc('keten.test', 'k1'), loc('keten.test', 'k2'), loc('www.keten.test', 'k3')] },
  ];
  const out = selectCandidates(searches, { chains: ['osteria-finta.test'], exclude: ['https://www.pasta-immaginaria.test/'], limit: 20 });
  const domains = out.map((c) => c.domain).sort();
  assert.deepEqual(domains, ['gelateria-inventata.test', 'ijs-elders.test', 'ristorante-irreale.test', 'trattoria-fittizia.test']);
  const ijs = out.find((c) => c.domain === 'ijs-elders.test');
  assert.deepEqual(
    { url: ijs.url, source: ijs.source, type: ijs.type, cid: ijs.cid, name: ijs.name, query: ijs.query, area: ijs.area },
    { url: 'https://ijs-elders.test/', source: 'lookalike', type: 'Ice cream shop', cid: '3000000000000000003', name: 'IJs Elders', query: 'ice cream shop centrum', area: 'Centrum' },
  );
  assert.equal(out.find((c) => c.domain === 'gelateria-inventata.test').name, "Gelateria Inventata's Centrum", 'title entities decoded');
});

test('selectCandidates keeps the top N by pre-score', () => {
  const items = [
    loc('a.test', '1'),
    loc('b.test', '2', { is_claimed: false, total_photos: 3, rating: { value: 4, votes_count: 200 } }),
    loc('c.test', '3', { total_photos: 5 }),
  ];
  const out = selectCandidates([{ type: 'Lunchroom', area: 'Centrum', query: 'lunchroom centrum', items }], { chains: [], exclude: [], limit: 2 });
  assert.deepEqual(out.map((c) => c.domain), ['b.test', 'c.test']);
});

function fakeClient(byKeyword, { failAfter = Infinity } = {}) {
  const calls = [];
  return {
    calls,
    async post(endpoint, tasks) {
      if (calls.length >= failAfter) throw new BudgetExceeded({ spent: 3, estimate: 0.002, limit: 3 });
      calls.push({ endpoint, tasks });
      const items = byKeyword[tasks[0].keyword] ?? [];
      return { status_code: 20000, cost: 0.002, tasks: [{ status_code: 20000, result: [{ items }] }] };
    },
  };
}

test('discover runs one Maps search per planned query and records each in history', async () => {
  const client = fakeClient({ 'lunchroom centrum': [loc('lunch-a.test', '1')], 'lunchroom duinoord': [loc('lunch-b.test', '2')] });
  const r = await discover({ client, types: ['Lunchroom'], areas: ['Centrum', 'Duinoord'], history: {}, chains: [], exclude: [], now: NOW, max: 2 });
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[0].endpoint, 'serp/google/maps/live/advanced');
  assert.deepEqual(client.calls[0].tasks, [{ keyword: 'lunchroom centrum', location_coordinate: '52.0705,4.3007,13z', language_code: 'nl', depth: 20 }]);
  assert.deepEqual(r.candidates.map((c) => c.domain).sort(), ['lunch-a.test', 'lunch-b.test']);
  assert.deepEqual(r.history, { 'lunchroom centrum': NOW.toISOString(), 'lunchroom duinoord': NOW.toISOString() });
  assert.equal(r.stopped, null);
});

test('discover stops at the budget and keeps what it found', async () => {
  const client = fakeClient({ 'lunchroom centrum': [loc('lunch-a.test', '1')] }, { failAfter: 1 });
  const r = await discover({ client, types: ['Lunchroom'], areas: ['Centrum', 'Duinoord'], history: {}, chains: [], exclude: [], now: NOW, max: 2 });
  assert.deepEqual(r.candidates.map((c) => c.domain), ['lunch-a.test']);
  assert.deepEqual(Object.keys(r.history), ['lunchroom centrum']);
  assert.equal(r.stopped, 'budget');
});

test('discover does not mutate the history it was given', async () => {
  const history = Object.freeze({ 'lunchroom centrum': daysAgo(60) });
  const r = await discover({ client: fakeClient({}), types: ['Lunchroom'], areas: ['Centrum'], history, chains: [], exclude: [], now: NOW, max: 1 });
  assert.equal(history['lunchroom centrum'], daysAgo(60));
  assert.equal(r.history['lunchroom centrum'], NOW.toISOString());
});

test('planQueries searches with the Dutch term for mapped types and keeps the seed type on the row', () => {
  const plan = planQueries({ types: ['vet', 'bakery (check)', 'unmapped thing'], areas: ['Centrum'], now: NOW, max: 10 });
  assert.deepEqual(plan.map((p) => p.query).sort(), ['bakker centrum', 'dierenarts centrum', 'unmapped thing centrum']);
  assert.equal(plan.find((p) => p.query === 'dierenarts centrum').type, 'vet');
});
