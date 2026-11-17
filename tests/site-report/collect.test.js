// Tests for the collect step: pure helpers, null-with-log gaps, the MCP staging file and sample isolation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  monthRange,
  sumPerformance,
  summariseReviews,
  countFormSubmissions,
  collectGbp,
  fetchSearchConsole,
  buildMetrics,
  writeMetrics,
  readInputs,
  searchConsoleToken,
} from '../../tools/site-report/collect.js';
import { readGoalsFile } from '../../tools/site-report/schema.js';
import { FIXTURES, TOOLS, copyFixture, tempDir } from './helpers.js';

const NOW = new Date('2026-12-01T09:00:00Z');

test('month range: first and last day, leap years included', () => {
  assert.deepEqual(monthRange('2026-11'), { startDate: '2026-11-01', endDate: '2026-11-30' });
  assert.equal(monthRange('2028-02').endDate, '2028-02-29');
});

const series = (metric, values) => ({
  dailyMetric: metric,
  timeSeries: { datedValues: values.map((value, i) => ({ date: { year: 2026, month: 11, day: i + 1 }, ...(value === undefined ? {} : { value: String(value) }) })) },
});

test('performance: sums each daily metric and adds the three actions', () => {
  const response = [
    { dailyMetricTimeSeries: [series('CALL_CLICKS', [1, 2, undefined]), series('WEBSITE_CLICKS', [4]), series('BUSINESS_DIRECTION_REQUESTS', [5, 5]), series('BUSINESS_IMPRESSIONS_MOBILE_MAPS', [100])] },
  ];
  assert.deepEqual(sumPerformance(response), { calls: 3, websiteClicks: 4, directions: 10, actions: 17 });
});

test('reviews: total, average, new in the month, share answered', () => {
  const reviews = [
    { starRating: 'FIVE', createTime: '2026-11-03T10:00:00Z', reviewReply: { comment: 'Thanks' } },
    { starRating: 'FOUR', createTime: '2026-11-20T10:00:00Z' },
    { starRating: 'FIVE', createTime: '2026-09-02T10:00:00Z', reviewReply: { comment: 'Thanks' } },
    { starRating: 'THREE', createTime: '2026-08-02T10:00:00Z' },
  ];
  assert.deepEqual(summariseReviews(reviews, '2026-11'), { total: 4, average: 4.3, new: 2, answeredShare: 50 });
  assert.deepEqual(summariseReviews([], '2026-11'), { total: 0, average: null, new: 0, answeredShare: null });
});

test('forms: counts the month and leaves out spam', () => {
  const subs = [
    { submittedOn: '2026-11-02T10:00:00Z' },
    { submittedOn: '2026-11-15T10:00:00Z', isSpam: true },
    { dateSubmitted: '2026-11-30T23:00:00Z' },
    { submittedOn: '2026-10-31T10:00:00Z' },
  ];
  assert.equal(countFormSubmissions(subs, '2026-11'), 2);
});

test('gbp: sums performance and reviews over every location through injected reads', async () => {
  const calls = [];
  const reads = {
    getPerformance: async (_ctx, location, range) => {
      calls.push([location, range]);
      return [{ dailyMetricTimeSeries: [series('CALL_CLICKS', [2]), series('WEBSITE_CLICKS', [3]), series('BUSINESS_DIRECTION_REQUESTS', [1])] }];
    },
    resolveLocation: async (_ctx, location) => ({ v4Name: `accounts/1/${location}` }),
    listReviews: async () => [{ starRating: 'FIVE', createTime: '2026-11-03T10:00:00Z', reviewReply: {} }],
  };
  const out = await collectGbp({ ctx: {}, locations: ['locations/1', 'locations/2'], month: '2026-11', reads });
  assert.equal(out['gbp.calls'], 4);
  assert.equal(out['gbp.actions'], 12);
  assert.equal(out['gbp.reviews.total'], 2);
  assert.equal(out['gbp.reviews.new'], 2);
  assert.deepEqual(calls[0][1], { startDate: '2026-11-01', endDate: '2026-11-30' });
});

test('search console: posts the query through an injected fetch, returns null with no token', async () => {
  const seen = [];
  const fetchFn = async (url, init) => {
    seen.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ rows: [{ clicks: 120, impressions: 4000 }] }) };
  };
  const out = await fetchSearchConsole({ fetch: fetchFn, token: 't', siteUrl: 'https://example.com/', month: '2026-11', brandTerms: ['acme'] });
  assert.equal(out['searchConsole.clicks'], 120);
  assert.equal(out['searchConsole.nonBrandedClicks'], 120);
  assert.match(seen[0].url, /searchAnalytics\/query/);
  assert.equal(seen[0].init.headers.Authorization, 'Bearer t');
  assert.equal(await fetchSearchConsole({ fetch: fetchFn, token: null, siteUrl: 'https://example.com/', month: '2026-11' }), null);
  assert.equal(seen.length, 2);
});

test('metrics: each value has value, source and pulledAt; a figure with no source is null and logged', () => {
  const { data } = readGoalsFile(join(FIXTURES, 'small', 'goals.json'));
  const result = buildMetrics({
    month: '2026-11',
    goals: data,
    collected: { 'gbp.calls': { value: 15, source: 'Google Business Profile API' } },
    mcp: { pulledAt: '2026-12-01T08:00:00Z', figures: { 'forms.submissions': { value: 26, source: 'Webflow form submissions (Webflow MCP)' } } },
    now: NOW,
  });
  assert.deepEqual(result.metrics.figures['gbp.calls'], { value: 15, source: 'Google Business Profile API', pulledAt: NOW.toISOString() });
  assert.deepEqual(result.metrics.figures['forms.submissions'], { value: 26, source: 'Webflow form submissions (Webflow MCP)', pulledAt: '2026-12-01T08:00:00Z' });
  assert.equal(result.metrics.figures['searchConsole.nonBrandedClicks'], null);
  assert.ok(result.log.some((l) => l.includes('searchConsole.nonBrandedClicks')));
  assert.ok(result.log.some((l) => l.includes('gbp.websiteClicks')));
  for (const fig of Object.values(result.metrics.figures)) {
    if (fig) assert.ok(fig.source && fig.pulledAt);
  }
});

test('metrics: a figure that arrives without a source is refused, never guessed', () => {
  const { data } = readGoalsFile(join(FIXTURES, 'small', 'goals.json'));
  const result = buildMetrics({
    month: '2026-11',
    goals: data,
    collected: {},
    mcp: { figures: { 'forms.submissions': { value: 26 } } },
    now: NOW,
  });
  assert.equal(result.metrics.figures['forms.submissions'], null);
  assert.ok(result.log.some((l) => /forms\.submissions.*no source/i.test(l)));
});

test('sample isolation: writeMetrics refuses any metrics file in sample mode', () => {
  const dir = tempDir();
  assert.throws(() => writeMetrics(join(dir, 'metrics-2026-11.json'), { month: '2026-11', figures: {} }, { sample: true }), /sample/i);
  assert.deepEqual(readdirSync(dir), []);
  writeMetrics(join(dir, 'metrics-2026-11.json'), { month: '2026-11', figures: {} }, { sample: false });
  assert.deepEqual(readdirSync(dir), ['metrics-2026-11.json']);
});

const cli = (args, env = {}) =>
  spawnSync(process.execPath, [join(TOOLS, 'collect.js'), ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });

test('sample isolation: the CLI with --sample exits 1 and writes no metrics file', () => {
  const projects = copyFixture('small');
  const before = readdirSync(join(projects, 'small')).sort();
  const r = cli(['--client', 'small', '--month', '2026-12', '--projects', projects, '--sample']);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /sample/i);
  assert.deepEqual(readdirSync(join(projects, 'small')).sort(), before);
  assert.equal(existsSync(join(projects, 'small', 'metrics-2026-12.json')), false);
});

test('the CLI writes metrics-YYYY-MM.json from the MCP file and logs every gap', () => {
  const projects = copyFixture('small');
  const mcp = join(tempDir(), 'mcp.json');
  writeFileSync(mcp, JSON.stringify({ pulledAt: '2026-12-01T08:00:00Z', figures: { 'forms.submissions': { value: 30, source: 'Webflow form submissions (Webflow MCP)' } } }));
  const r = cli(['--client', 'small', '--month', '2026-12', '--projects', projects, '--mcp', mcp]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const written = JSON.parse(readFileSync(join(projects, 'small', 'metrics-2026-12.json'), 'utf8'));
  assert.equal(written.month, '2026-12');
  assert.equal(written.figures['forms.submissions'].value, 30);
  assert.equal(written.figures['searchConsole.nonBrandedClicks'], null);
  assert.match(r.stderr, /searchConsole\.nonBrandedClicks/);
  assert.match(r.stderr, /gbp/i);
});

test('the CLI exits 2 on bad arguments or an invalid goals file', () => {
  assert.equal(cli(['--client', 'small']).status, 2);
  const projects = tempDir();
  assert.equal(cli(['--client', 'nobody', '--month', '2026-12', '--projects', projects]).status, 2);
});

const MANUAL = { value: 42, source: 'Reservation system export', pulledAt: '2026-12-02T10:00:00Z' };
const NO_CREDS = { GBP_CLIENT_ID: '', GBP_CLIENT_SECRET: '', GBP_REFRESH_TOKEN: '', SEARCH_CONSOLE_TOKEN: '' };

test('inputs: reads manual figures and keeps value, source and pulledAt', () => {
  const projects = copyFixture('small');
  const dir = join(projects, 'small');
  writeFileSync(join(dir, 'inputs-2026-11.json'), JSON.stringify({ month: '2026-11', figures: { 'manual.reservations': MANUAL } }));
  const result = readInputs(dir, '2026-11');
  assert.deepEqual(result.figures['manual.reservations'], MANUAL);
  assert.deepEqual(result.log, []);
});

test('inputs: a missing file gives null and a log line, never a guess', () => {
  const dir = join(copyFixture('small'), 'small');
  const result = readInputs(dir, '2026-11');
  assert.equal(result.figures, null);
  assert.equal(result.log.length, 1);
  assert.match(result.log[0], /inputs-2026-11\.json/);
});

test('inputs: an unreadable file gives null and a log line', () => {
  const dir = join(copyFixture('small'), 'small');
  writeFileSync(join(dir, 'inputs-2026-11.json'), '{ not json');
  const result = readInputs(dir, '2026-11');
  assert.equal(result.figures, null);
  assert.match(result.log[0], /inputs-2026-11\.json/);
});

test('metrics: manual figures land in the metrics file, and a missing inputs file adds none', () => {
  const { data } = readGoalsFile(join(FIXTURES, 'small', 'goals.json'));
  const withInputs = buildMetrics({ month: '2026-11', goals: data, inputs: { 'manual.reservations': MANUAL }, now: NOW });
  assert.deepEqual(withInputs.metrics.figures['manual.reservations'], MANUAL);
  const without = buildMetrics({ month: '2026-11', goals: data, inputs: null, now: NOW });
  assert.equal(without.metrics.figures['manual.reservations'], undefined);
});

test('metrics: a manual figure with no source is null, and an API figure beats a manual one', () => {
  const { data } = readGoalsFile(join(FIXTURES, 'small', 'goals.json'));
  const result = buildMetrics({
    month: '2026-11',
    goals: data,
    collected: { 'gbp.calls': { value: 15, source: 'Google Business Profile API' } },
    inputs: { 'gbp.calls': { value: 99, source: 'typed by hand', pulledAt: '2026-12-02T10:00:00Z' }, 'manual.x': { value: 5 } },
    now: NOW,
  });
  assert.equal(result.metrics.figures['gbp.calls'].value, 15);
  assert.equal(result.metrics.figures['manual.x'], null);
  assert.ok(result.log.some((l) => /manual\.x.*no source/i.test(l)));
});

test('inputs: the collect CLI reads inputs-YYYY-MM.json from the reports folder', () => {
  const projects = copyFixture('small');
  const dir = join(projects, 'small');
  writeFileSync(join(dir, 'inputs-2026-12.json'), JSON.stringify({ figures: { 'manual.reservations': MANUAL } }));
  const result = spawnSync('node', [join(TOOLS, 'collect.js'), '--client', 'small', '--month', '2026-12', '--projects', projects], { encoding: 'utf8', env: { ...process.env, ...NO_CREDS } });
  assert.equal(result.status, 0, result.stderr);
  const metrics = JSON.parse(readFileSync(join(dir, 'metrics-2026-12.json'), 'utf8'));
  assert.deepEqual(metrics.figures['manual.reservations'], MANUAL);
});

test('inputs: the collect CLI logs a missing inputs file and still writes the metrics file', () => {
  const projects = copyFixture('small');
  const result = spawnSync('node', [join(TOOLS, 'collect.js'), '--client', 'small', '--month', '2026-12', '--projects', projects], { encoding: 'utf8', env: { ...process.env, ...NO_CREDS } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /inputs-2026-12\.json/);
  assert.ok(existsSync(join(projects, 'small', 'metrics-2026-12.json')));
});

test('search console token: the gbp token provider supplies it, an explicit token wins, and no credentials give null', async () => {
  const asked = [];
  const createProvider = (creds) => {
    asked.push(creds);
    return async () => 'from-provider';
  };
  const creds = { GBP_CLIENT_ID: 'id', GBP_CLIENT_SECRET: 'secret', GBP_REFRESH_TOKEN: 'refresh' };
  assert.equal(await searchConsoleToken({ env: creds, createProvider }), 'from-provider');
  assert.deepEqual(asked[0], { clientId: 'id', clientSecret: 'secret', refreshToken: 'refresh' });
  assert.equal(await searchConsoleToken({ env: { ...creds, SEARCH_CONSOLE_TOKEN: 'explicit' }, createProvider }), 'explicit');
  assert.equal(asked.length, 1);
  assert.equal(await searchConsoleToken({ env: {}, createProvider }), null);
});
