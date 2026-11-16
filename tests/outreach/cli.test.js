// Covers the outreach CLI end to end with every dependency injected: kill switch, run order, drafts only on qualifying verdicts, touch-only re-runs, protected rows, dry run, budget and payment stops, per-row failures, --limit, --discover and scan <url>.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OFFER, main, mapQueries, sortByImpact } from '../../tools/outreach/cli.js';
import { ESTIMATES, ENDPOINTS, PaymentRequired } from '../../tools/outreach/dataforseo.js';
import { NOW, daysAgo, fakeNotion } from './helpers.js';

const BAKERY = 'bakkerij-verzonnen.test';
const COFFEE = 'koffie-fictief.test';
const LOOKALIKE = 'taart-fantasie.test';
const RUN = '2026-11-12';

const SEEDS = {
  city: 'Den Haag',
  notion: { database: 'db-prospects-0001', dataSource: 'ds-prospects-0001' },
  seeds: [
    { domain: BAKERY, url: `https://${BAKERY}/`, type: 'bakery', love: 'the Saturday rye' },
    { domain: COFFEE, url: `https://${COFFEE}/`, type: 'coffee shop (check)', love: '' },
  ],
};

const AREAS = [{ name: 'Zeeheldenkwartier', postcodes: ['2518'] }];

function setup({ state, seeds = SEEDS, off = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'outreach-cli-'));
  const data = join(root, 'den-haag');
  mkdirSync(data);
  writeFileSync(join(data, 'seeds.json'), JSON.stringify(seeds));
  writeFileSync(join(data, 'areas.json'), JSON.stringify(AREAS));
  writeFileSync(join(data, 'chains.json'), JSON.stringify(['megabrood']));
  if (state) writeFileSync(join(data, 'state.json'), JSON.stringify(state));
  writeFileSync(join(root, 'prompt.md'), 'You write short emails.');
  if (off) writeFileSync(join(root, 'outreach.off'), '');
  return { root, data, prompt: join(root, 'prompt.md') };
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const domainOf = (url) => new URL(url).hostname;

const titleFor = (domain) => ({ [BAKERY]: 'Bakkerij Verzonnen', [COFFEE]: 'Koffie Fictief', [LOOKALIKE]: 'Taart Fantasie' }[domain] ?? domain);

function fakeFetchPage({ fail = [] } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const domain = domainOf(url);
    if (fail.includes(domain)) throw new Error(`Fetch failed for ${url}`);
    return { html: `<html lang="nl"><head><title>${titleFor(domain)} | Den Haag</title></head><body><h1>Vers uit de oven</h1></body></html>`, headers: {}, statusCode: 200, redirectChain: [], finalUrl: url };
  };
  fn.calls = calls;
  return fn;
}

function fakeScanSite({ throwFor = [] } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const domain = domainOf(url);
    if (throwFor.includes(domain)) throw new Error(`scan exploded for ${domain}`);
    return {
      url, finalUrl: url, reachable: true, parked: false, statusCode: 200, findings: [], errors: [], lab: null,
      platform: { builder: 'unknown', version: null, badge: false, eol: false, builderSubdomain: false, signals: [] },
      facts: {
        https: domain !== BAKERY, viewport: true, language: 'nl', title: titleFor(domain), siteName: titleFor(domain),
        email: domain === BAKERY ? `hallo@${BAKERY}` : null, phone: null, postcode: '2518AB', copyrightYear: 2026,
        hasHours: true, menu: { present: false, pdfOnly: false }, hasBooking: true, schemaTypes: ['Bakery'], hasLocalBusinessSchema: true,
      },
    };
  };
  fn.calls = calls;
  return fn;
}

const packItems = () => [
  { type: 'maps_search', rank_group: 1, domain: 'broodhuis-elders.test', url: 'https://broodhuis-elders.test/', title: 'Broodhuis Elders', cid: '222', rating: { value: 4.8, votes_count: 80 }, is_claimed: true, total_photos: 50 },
  { type: 'maps_search', rank_group: 7, domain: BAKERY, url: `https://${BAKERY}/`, title: 'Bakkerij Verzonnen', cid: '111', rating: { value: 4.4, votes_count: 30 }, is_claimed: true, total_photos: 30 },
  { type: 'maps_search', rank_group: 9, domain: LOOKALIKE, url: `https://${LOOKALIKE}/`, title: 'Taart Fantasie', cid: '333', rating: { value: 4.6, votes_count: 120 }, is_claimed: false, total_photos: 3 },
];

const infoFor = (cid) => ({
  type: 'google_business_info', title: cid === '111' ? 'Bakkerij Verzonnen' : 'Fictief Bedrijf', category: 'Bakery', additional_categories: null,
  cid, domain: cid === '111' ? BAKERY : LOOKALIKE, url: cid === '111' ? `https://${BAKERY}/` : `https://${LOOKALIKE}/`,
  is_claimed: false, rating: { value: 4.1, votes_count: 12 }, total_photos: 4, description: null, place_topics: { roggebrood: 9 },
  work_time: { work_hours: { timetable: null, current_status: 'open' } }, check_url: `https://maps.test/?cid=${cid}`,
});

const ok = (items) => ({ status_code: 20000, cost: 0, tasks: [{ status_code: 20000, result: [{ items }] }] });

function fakeDataForSeo({ fail = null, reviewsReady = true, getFail = null } = {}) {
  const calls = [];
  const posted = [];
  const factory = async ({ budget }) => ({
    budget,
    async post(endpoint, tasks) {
      calls.push({ endpoint, tasks });
      if (fail) throw fail;
      const cost = (ESTIMATES[endpoint] ?? 0) * tasks.length;
      budget.check(cost);
      budget.charge(cost);
      if (endpoint === ENDPOINTS.mapsLive) {
        const keyword = tasks[0].keyword;
        if (keyword.includes('Koffie Fictief')) return ok([]);
        return ok(packItems());
      }
      if (endpoint === ENDPOINTS.businessInfoLive) return ok([infoFor(tasks[0].keyword.replace('cid:', ''))]);
      if (endpoint === ENDPOINTS.reviewsTaskPost) {
        posted.push(...tasks.map((t) => t.cid));
        return { status_code: 20000, tasks: tasks.map((t) => ({ status_code: 20100, id: `task-${t.cid}`, data: { tag: t.cid } })) };
      }
      throw new Error(`unexpected post ${endpoint}`);
    },
    async get(endpoint) {
      calls.push({ endpoint });
      if (getFail) throw getFail;
      if (endpoint === ENDPOINTS.reviewsTasksReady) return { status_code: 20000, tasks: [{ status_code: 20000, result: reviewsReady ? posted.map((cid) => ({ id: `task-${cid}` })) : [] }] };
      return ok([{ timestamp: '2026-11-01 10:00:00 +00:00', owner_answer: null, review_text: 'Heerlijk roggebrood.' }]);
    },
  });
  factory.calls = calls;
  factory.posts = () => calls.filter((c) => c.tasks);
  return factory;
}

const DRAFT_TEXT = 'Subject: Een idee voor Bakkerij Verzonnen\n\nHoi team, ik kom graag bij jullie. Ik zag iets op de site. Geen interesse? Laat het gerust weten.\n\nWill, Studio Zissou';

function fakeAnthropic({ failOn = [] } = {}) {
  const calls = [];
  const factory = async () => ({
    messages: {
      create: async (args) => {
        calls.push(args);
        if (failOn.includes(calls.length)) throw new Error('Anthropic 529 overloaded');
        return { content: [{ type: 'text', text: DRAFT_TEXT }], usage: { input_tokens: 1000, output_tokens: 200 } };
      },
    },
  });
  factory.calls = calls;
  return factory;
}

const refuse = (name) => async () => { throw new Error(`${name} must not be called`); };

function deps(over = {}) {
  const out = [];
  const err = [];
  const notionClient = over.notionClient ?? fakeNotion();
  const d = {
    now: () => NOW,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    fetchPage: fakeFetchPage(),
    scanSite: fakeScanSite(),
    dataforseo: fakeDataForSeo(),
    notion: async () => notionClient,
    anthropic: fakeAnthropic(),
    sleep: async () => {},
    ...over,
  };
  d.out = () => out.join('');
  d.err = () => err.join('');
  d.notionClient = notionClient;
  return d;
}

const runArgs = (env, ...extra) => ['run', '--data', env.data, '--prompt', env.prompt, ...extra];

const created = (notion) => notion.callsTo('pages.create').map((c) => c.args);
const createdFor = (notion, domain) => created(notion).find((a) => a.properties.Domain.url === domain);

test('--help prints usage and exits 0', async () => {
  const d = deps();
  assert.equal(await main(['--help'], d), 0);
  assert.match(d.out(), /run/);
  assert.match(d.out(), /--dry-run/);
});

test('missing --data is a usage error (exit 2)', async () => {
  const d = deps();
  assert.equal(await main(['run'], d), 2);
  assert.match(d.err(), /--data/);
});

test('kill switch: outreach.off next to the data dir exits 0 and does nothing', async () => {
  const env = setup({ off: true });
  const d = deps({ dataforseo: refuse('dataforseo'), notion: refuse('notion'), fetchPage: refuse('fetchPage') });
  assert.equal(await main(runArgs(env), d), 0);
  assert.match(d.out() + d.err(), /outreach\.off/);
  assert.equal(existsSync(join(env.data, 'state.json')), false);
});

test('run scans every seed, drafts only qualifying rows, writes Notion, state and the run log', async () => {
  const env = setup();
  const d = deps();
  assert.equal(await main(runArgs(env), d), 0);

  const bakery = createdFor(d.notionClient, BAKERY);
  const coffee = createdFor(d.notionClient, COFFEE);
  assert.equal(bakery.parent.database_id, 'db-prospects-0001');
  assert.equal(bakery.properties.Verdict.select.name, 'new-site+management');
  assert.equal(bakery.properties.Source.select.name, 'seed');
  assert.ok(['ok', 'generic', 'needs-edit'].includes(bakery.properties.Draft.select.name));
  assert.ok(bakery.children.length > 0);
  assert.match(bakery.properties['GBP score'].rich_text[0].text.content, /^\d+\/\d+/);
  assert.match(bakery.properties.Issues.rich_text[0].text.content, /\[https\]/);
  assert.equal(bakery.properties.Contact.rich_text[0].text.content, `hallo@${BAKERY}`);
  assert.match(bakery.properties['Facts used'].rich_text[0].text.content, /the Saturday rye \(seeds\.json\)/);

  assert.equal(coffee.properties.Verdict.select.name, 'neither');
  assert.equal(coffee.properties.Draft.select.name, 'none');
  assert.equal(coffee.properties['GBP score'].rich_text[0].text.content, 'unmatched');
  assert.deepEqual(coffee.children, []);

  assert.equal(d.anthropic.calls.length >= 1, true);
  assert.ok(d.anthropic.calls.every((c) => c.messages[0].content.includes('Bakkerij Verzonnen')));

  const posts = d.dataforseo.posts();
  const rankSearches = posts.filter((p) => p.endpoint === ENDPOINTS.mapsLive && !p.tasks[0].keyword.endsWith(' Den Haag'));
  assert.deepEqual(rankSearches.map((p) => p.tasks[0].keyword), ['bakker den haag', 'bakker zeeheldenkwartier', 'bakker in de buurt']);
  assert.ok(rankSearches.every((p) => p.tasks[0].language_code === 'nl' && p.tasks[0].location_coordinate));
  assert.equal(posts.filter((p) => p.endpoint === ENDPOINTS.reviewsTaskPost).length, 1);

  const state = readJson(join(env.data, 'state.json'));
  assert.equal(state.prospects[BAKERY].verdict, 'new-site+management');
  assert.equal(state.prospects[BAKERY].cid, '111');
  assert.equal(state.prospects[COFFEE].status, 'New');

  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  assert.equal(log.counts.scanned, 2);
  assert.equal(log.counts.verdicts['new-site+management'], 1);
  assert.equal(log.counts.verdicts.neither, 1);
  assert.ok(log.cost.dataforseo > 0);
  assert.ok(log.cost.anthropic > 0);
  assert.equal(log.cost.total, log.cost.dataforseo + log.cost.anthropic);
  assert.equal(log.drafts.length, 1);
  assert.equal(log.drafts[0].opener, 'seed');
  assert.deepEqual(log.errors, []);
});

test('re-run inside 30 days only touches Run: no fetch, no API spend', async () => {
  const entry = (domain) => ({ domain, source: 'seed', cid: null, verdict: 'neither', status: 'New', lastScanned: daysAgo(3), run: '2026-11-09' });
  const env = setup({ state: { prospects: { [BAKERY]: entry(BAKERY), [COFFEE]: entry(COFFEE) } } });
  const notionClient = fakeNotion({ pages: [{ id: 'page-1', properties: { Status: { status: { name: 'New' } } } }] });
  const d = deps({ notionClient });
  assert.equal(await main(runArgs(env), d), 0);
  assert.equal(d.fetchPage.calls.length, 0);
  assert.equal(d.dataforseo.calls.length, 0);
  assert.equal(d.anthropic.calls.length, 0);
  const updates = notionClient.callsTo('pages.update');
  assert.equal(updates.length, 2);
  assert.ok(updates.every((u) => Object.keys(u.args.properties).join() === 'Run'));
  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  assert.equal(log.counts.touched, 2);
  assert.equal(log.cost.total, 0);
});

test('a row Will moved past New in Notion is not scanned or re-drafted', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const notionClient = fakeNotion({ pages: [{ id: 'page-1', properties: { Status: { status: { name: 'Contacted' } } } }] });
  const d = deps({ notionClient });
  assert.equal(await main(runArgs(env), d), 0);
  assert.equal(d.fetchPage.calls.length, 0);
  assert.equal(d.anthropic.calls.length, 0);
  assert.equal(notionClient.callsTo('pages.create').length, 0);
  assert.deepEqual(Object.keys(notionClient.callsTo('pages.update')[0].args.properties), ['Run']);
  assert.equal(readJson(join(env.data, 'state.json')).prospects[BAKERY].status, 'Contacted');
});

test('--dry-run: no Notion, no Anthropic, no files; prints a table', async () => {
  const env = setup();
  const d = deps({ notion: refuse('notion'), anthropic: refuse('anthropic') });
  assert.equal(await main([...runArgs(env), '--dry-run'], d), 0);
  const out = d.out();
  assert.match(out, new RegExp(`${BAKERY}\\s+new-site\\+management\\s+no-https`));
  assert.match(out, new RegExp(`${COFFEE}\\s+neither`));
  assert.match(out, /unmatched/);
  assert.equal(existsSync(join(env.data, 'state.json')), false);
  assert.equal(existsSync(join(env.data, 'runs')), false);
});

test('--dry-run does not need --prompt', async () => {
  const env = setup();
  const d = deps({ notion: refuse('notion'), anthropic: refuse('anthropic') });
  assert.equal(await main(['run', '--data', env.data, '--dry-run'], d), 0);
});

test('budget exhausted: stops API work, writes what was done, exits non-zero', async () => {
  const env = setup();
  const d = deps();
  const code = await main([...runArgs(env), '--budget', '0.003'], d);
  assert.equal(code, 1);
  assert.match(d.err(), /budget/i);
  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  assert.equal(log.stopped, 'budget');
  assert.ok(log.cost.total <= 0.003 + 1e-9);
  assert.equal(d.anthropic.calls.length, 0);
});

test('PaymentRequired stops the run with a clear message and a non-zero exit', async () => {
  const env = setup();
  const d = deps({ dataforseo: fakeDataForSeo({ fail: new PaymentRequired('DataForSEO: payment required (HTTP 402)') }) });
  assert.equal(await main(runArgs(env), d), 1);
  assert.match(d.err(), /payment/i);
  assert.equal(readJson(join(env.data, 'runs', `${RUN}.json`)).stopped, 'payment');
});

test('one failing row does not stop the run', async () => {
  const env = setup();
  const d = deps({ scanSite: fakeScanSite({ throwFor: [BAKERY] }) });
  assert.equal(await main(runArgs(env), d), 0);
  assert.ok(createdFor(d.notionClient, COFFEE));
  assert.equal(createdFor(d.notionClient, BAKERY), undefined);
  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  assert.equal(log.errors.length, 1);
  assert.equal(log.errors[0].domain, BAKERY);
  assert.equal(readJson(join(env.data, 'state.json')).prospects[BAKERY], undefined);
});

test('a failed Notion write leaves the row out of state so the next run retries it', async () => {
  const env = setup();
  const notionClient = fakeNotion();
  const create = notionClient.pages.create;
  notionClient.pages.create = async (args) => {
    if (args.properties.Domain.url === BAKERY) throw new Error('Notion 502');
    return create(args);
  };
  const d = deps({ notionClient });
  assert.equal(await main(runArgs(env), d), 0);
  const state = readJson(join(env.data, 'state.json'));
  assert.equal(state.prospects[BAKERY], undefined);
  assert.ok(state.prospects[COFFEE]);
});

test('--limit N scans at most N rows', async () => {
  const env = setup();
  const d = deps();
  assert.equal(await main([...runArgs(env), '--limit', '1'], d), 0);
  assert.equal(d.scanSite.calls.length, 1);
});

test('--discover adds lookalikes with a lookalike opener, excluding seeds', async () => {
  const env = setup();
  const d = deps();
  assert.equal(await main([...runArgs(env), '--discover'], d), 0);
  const look = createdFor(d.notionClient, LOOKALIKE);
  assert.ok(look);
  assert.equal(look.properties.Source.select.name, 'lookalike');
  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  const drafts = Object.fromEntries(log.drafts.map((x) => [x.domain, x.opener]));
  if (drafts[LOOKALIKE]) assert.equal(drafts[LOOKALIKE], 'lookalike');
  assert.equal(drafts[BAKERY], 'seed');
  assert.equal(created(d.notionClient).filter((a) => a.properties.Domain.url === BAKERY).length, 1);
  assert.ok(Object.keys(readJson(join(env.data, 'state.json')).discoverHistory).length > 0);
});

test('scan <url> prints one prospect as JSON and writes nothing', async () => {
  const d = deps({ notion: refuse('notion'), anthropic: refuse('anthropic') });
  assert.equal(await main(['scan', `https://${BAKERY}/`], d), 0);
  const result = JSON.parse(d.out());
  assert.equal(result.domain, BAKERY);
  assert.equal(result.verdict, 'new-site+management');
  assert.ok(Array.isArray(result.reasons));
});

test('mapQueries: Dutch term for main, area and "in de buurt", type cleaned, unmapped types used as-is', () => {
  assert.deepEqual(mapQueries('Vet (check)', 'Zeeheldenkwartier'), ['dierenarts den haag', 'dierenarts zeeheldenkwartier', 'dierenarts in de buurt']);
  assert.deepEqual(mapQueries('bakery', null), ['bakker den haag', 'bakker centrum den haag', 'bakker in de buurt']);
  assert.deepEqual(mapQueries('kite shop', null), ['kite shop den haag', 'kite shop centrum den haag', 'kite shop in de buurt']);
  assert.deepEqual(mapQueries('', 'Centrum'), []);
});

test('sortByImpact puts not-top3, no-viewport, speed, no-https, pdf menu first', () => {
  const ids = ['no-schema', 'no-https', 'missing-title', 'heavy-page', 'not-top3', 'pdf-menu-no-booking', 'no-viewport', 'slow-lcp'];
  assert.deepEqual(sortByImpact(ids.map((id) => ({ id }))).map((i) => i.id), ['not-top3', 'no-viewport', 'heavy-page', 'slow-lcp', 'no-https', 'pdf-menu-no-booking', 'no-schema', 'missing-title']);
});

test('OFFER is free only, in both languages, with no price', () => {
  assert.equal(OFFER.en, 'a free 15-minute chat or a short free write-up');
  assert.equal(OFFER.nl, '15 minuten praten of een korte gratis blik op papier');
});

const newPage = () => ({ id: 'page-1', properties: { Status: { status: { name: 'New' } } } });

test('a qualifying New row whose draft fails keeps its old subject, Draft and body', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const notionClient = fakeNotion({ pages: [newPage()], children: { 'page-1': [[{ id: 'old-draft' }]] } });
  const d = deps({ notionClient, anthropic: fakeAnthropic({ failOn: [1] }) });
  assert.equal(await main(runArgs(env), d), 0);
  const [update] = notionClient.callsTo('pages.update');
  assert.equal(update.args.properties.Verdict.select.name, 'new-site+management');
  assert.equal('Email subject' in update.args.properties, false);
  assert.equal('Draft' in update.args.properties, false);
  assert.equal(notionClient.callsTo('blocks.delete').length, 0);
  assert.equal(readJson(join(env.data, 'state.json')).prospects[BAKERY], undefined);
});

test('a qualifying New row with no draft attempt (budget stop) keeps its old draft', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const notionClient = fakeNotion({ pages: [newPage()], children: { 'page-1': [[{ id: 'old-draft' }]] } });
  const d = deps({ notionClient });
  await main([...runArgs(env), '--budget', '0.05'], d);
  assert.equal(d.anthropic.calls.length, 0);
  const update = notionClient.callsTo('pages.update').find((u) => u.args.properties.Verdict);
  assert.ok(update);
  assert.equal('Draft' in update.args.properties, false);
  assert.equal(notionClient.callsTo('blocks.delete').length, 0);
});

test('a row that no longer qualifies has its old draft cleared', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[1]] } });
  const notionClient = fakeNotion({ pages: [newPage()], children: { 'page-1': [[{ id: 'old-draft' }]] } });
  const d = deps({ notionClient });
  assert.equal(await main(runArgs(env), d), 0);
  const [update] = notionClient.callsTo('pages.update');
  assert.equal(update.args.properties.Verdict.select.name, 'neither');
  assert.equal(update.args.properties.Draft.select.name, 'none');
  assert.deepEqual(notionClient.callsTo('blocks.delete').map((c) => c.args.block_id), ['old-draft']);
});

test('a draft whose second attempt throws is still charged for the first', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const bad = 'Subject: \n\nHoi team. Geen interesse? Laat het weten.';
  const calls = [];
  const anthropic = async () => ({ messages: { create: async (args) => { calls.push(args); if (calls.length === 2) throw new Error('timeout'); return { content: [{ type: 'text', text: bad }], usage: { input_tokens: 1000, output_tokens: 200 } }; } } });
  const d = deps({ anthropic });
  assert.equal(await main(runArgs(env), d), 0);
  const log = readJson(join(env.data, 'runs', `${RUN}.json`));
  assert.ok(log.cost.anthropic > 0);
  assert.ok(log.errors.some((e) => e.stage === 'draft'));
});

test('the draft budget check uses a $0.10 estimate', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const d = deps();
  await main([...runArgs(env), '--budget', '0.09'], d);
  assert.equal(d.anthropic.calls.length, 0);
});

test('reviews that never finish leave the row out of state so it is retried', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const d = deps({ dataforseo: fakeDataForSeo({ reviewsReady: false }) });
  assert.equal(await main(runArgs(env), d), 0);
  assert.ok(createdFor(d.notionClient, BAKERY));
  assert.equal(readJson(join(env.data, 'state.json')).prospects[BAKERY], undefined);
});

test('a reviews polling error does not stop the run', async () => {
  const env = setup();
  const d = deps({ dataforseo: fakeDataForSeo({ getFail: new Error('DataForSEO: HTTP 500') }) });
  assert.equal(await main(runArgs(env), d), 0);
  assert.ok(createdFor(d.notionClient, BAKERY));
  assert.ok(createdFor(d.notionClient, COFFEE));
});

test('state is written after each completed row', async () => {
  const env = setup();
  const notionClient = fakeNotion();
  const create = notionClient.pages.create;
  let seen = null;
  notionClient.pages.create = async (args) => {
    if (args.properties.Domain.url === COFFEE) seen = JSON.parse(readFileSync(join(env.data, 'state.json'), 'utf8'));
    return create(args);
  };
  assert.equal(await main(runArgs(env), deps({ notionClient })), 0);
  assert.ok(seen?.prospects[BAKERY]);
});

test('state is still written when the run fails late', async () => {
  const env = setup();
  let n = 0;
  const d = deps({ now: () => { n += 1; if (n > 1) throw new Error('clock broke'); return NOW; } });
  assert.equal(await main(runArgs(env), d), 1);
  assert.ok(readJson(join(env.data, 'state.json')).prospects[BAKERY]);
});

test('--discover N caps lookalikes at N, 0 turns discovery off', async () => {
  const one = setup();
  const d1 = deps();
  assert.equal(await main([...runArgs(one), '--discover', '1'], d1), 0);
  assert.equal(created(d1.notionClient).filter((a) => a.properties.Source.select.name === 'lookalike').length, 1);
  const off = setup();
  const d0 = deps();
  assert.equal(await main([...runArgs(off), '--discover', '0'], d0), 0);
  assert.equal(created(d0.notionClient).filter((a) => a.properties.Source.select.name === 'lookalike').length, 0);
  const bad = setup();
  assert.equal(await main([...runArgs(bad), '--discover', 'lots'], deps()), 2);
});

test('the draft input has register, a free offer with no price, and issues in plain words', async () => {
  const env = setup({ seeds: { ...SEEDS, seeds: [SEEDS.seeds[0]] } });
  const d = deps();
  assert.equal(await main(runArgs(env), d), 0);
  const msg = d.anthropic.calls[0].messages[0].content;
  assert.match(msg, /^register: je$/m);
  assert.match(msg, /^offer: 15 minuten praten of een korte gratis blik op papier$/m);
  assert.doesNotMatch(msg, /€|\$|euro|100/i);
  assert.match(msg, /Not secure/);
  assert.match(msg, /^potential: /m);
});

test('--dry-run also prints one JSON line per row with issues, evidence, gbp score and ranks', async () => {
  const env = setup();
  const d = deps({ notion: refuse('notion'), anthropic: refuse('anthropic') });
  assert.equal(await main([...runArgs(env), '--dry-run'], d), 0);
  const rows = d.out().split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
  assert.equal(rows.length, 2);
  const bakery = rows.find((r) => r.domain === BAKERY);
  assert.equal(bakery.verdict, 'new-site+management');
  assert.ok(bakery.issues.length > 0 && bakery.issues.every((i) => i.id && i.evidence));
  assert.match(bakery.gbpScore, /^\d+\/\d+/);
  assert.equal(bakery.ranks.length, 3);
  assert.equal(existsSync(join(env.data, 'state.json')), false);
});

