// End-to-end golden test: runs the full site-review CLI against the local fixture site and compares findings.json with the hand-written expectations.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startGoldenServer } from './fixtures/golden/server.js';
import { main } from '../../tools/site-review/index.js';

const EXPECTED = JSON.parse(await readFile(new URL('./fixtures/golden/expected-findings.json', import.meta.url), 'utf8'));
const FORMULA = (pages, errorPages, warningPages) =>
  Math.min(100, Math.max(0, Math.round(100 * (1 - (errorPages + 0.5 * warningPages) / pages))));

process.env.GOOGLE_PSI_API_KEY = '';

async function runGolden({ variant = 'base', extra = [], render = true, ports = {} } = {}) {
  const server = await startGoldenServer({ variant, ...ports });
  const dir = await mkdtemp(join(tmpdir(), `golden-${variant}-`));
  const configPath = join(dir, 'crawl.config.json');
  await writeFile(
    configPath,
    JSON.stringify({
      url: server.url,
      canonicalHost: new URL(server.url).host,
      renderSample: 1,
      renderDrift: 0,
      renderSettleMs: 100,
      reverifyDelayMs: 100,
      externalCap: 50,
    }),
  );
  const out = join(dir, 'out');
  const argv = ['node', 'golden', '--url', server.url, '--config', configPath, '--mode', 'audit', '--render-sample', '1', '--render-drift', '0', '--out', out, ...(render ? [] : ['--no-render']), ...extra];
  let code;
  try {
    code = await main(argv);
  } finally {
    await server.close();
  }
  const read = async (name) => readFile(join(out, name), 'utf8').catch(() => null);
  const findingsText = await read('findings.json');
  const factsText = await read('facts.ndjson');
  return {
    code,
    server,
    dir,
    out,
    report: findingsText ? JSON.parse(findingsText) : null,
    markdown: await read('report.md'),
    facts: factsText ? factsText.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [],
  };
}

function relative(key, server) {
  if (key == null) return null;
  if (key.startsWith(server.origin)) return key.slice(server.origin.length) || '/';
  if (key.startsWith(server.externalOrigin)) return `{{external}}${key.slice(server.externalOrigin.length)}`;
  return key;
}

function comparable(finding, server) {
  return {
    taxonomyId: finding.taxonomyId,
    urlKey: relative(finding.urlKey, server),
    target: relative(finding.targetKey ?? null, server),
    state: finding.state,
    severity: finding.severity,
  };
}

const keyOf = (f) => [f.taxonomyId, f.urlKey, f.target ?? '', f.state, f.severity].join(' | ');
const ignored = (f) => EXPECTED.ignoreTaxonomyPrefixes.some((prefix) => f.taxonomyId.startsWith(prefix));

describe('golden: full pipeline', () => {
  let run;
  let rendered;

  before(async () => {
    run = await runGolden();
    rendered = run.report && !run.report.render?.notRun;
  });

  after(async () => {
    if (run?.dir) await rm(run.dir, { recursive: true, force: true });
  });

  it('completes and writes every output file', () => {
    assert.equal(run.code, 0);
    assert.ok(run.report, 'findings.json written');
    assert.ok(run.markdown, 'report.md written');
    assert.ok(run.facts.length > 40, 'facts.ndjson streamed');
  });

  it('golden: full pipeline output equals expected-findings.json', (t) => {
    if (!rendered) return t.skip('Playwright could not launch; the expectations assume rendering');
    const actual = run.report.findings.filter((f) => !ignored(f)).map((f) => comparable(f, run.server));
    const actualKeys = new Set(actual.map(keyOf));
    const expectedKeys = new Set(EXPECTED.findings.map(keyOf));
    const missing = [...expectedKeys].filter((k) => !actualKeys.has(k));
    const extra = [...actualKeys].filter((k) => !expectedKeys.has(k));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
    assert.equal(actual.length, actualKeys.size, 'no duplicate findings on the comparison key');
  });

  it('golden: optional fields (source, transient, tags, renderChecked) match', (t) => {
    if (!rendered) return t.skip('Playwright could not launch');
    const byKey = new Map(run.report.findings.map((f) => [keyOf(comparable(f, run.server)), f]));
    const mismatches = [];
    for (const expected of EXPECTED.findings) {
      const actual = byKey.get(keyOf(expected));
      if (!actual) continue;
      if (expected.source && actual.evidence?.source !== expected.source) mismatches.push(`${keyOf(expected)} source ${actual.evidence?.source}`);
      if (expected.transient !== undefined && Boolean(actual.transient) !== expected.transient) mismatches.push(`${keyOf(expected)} transient ${actual.transient}`);
      if (expected.renderChecked !== undefined && actual.renderChecked !== expected.renderChecked) mismatches.push(`${keyOf(expected)} renderChecked ${actual.renderChecked}`);
      for (const tag of expected.tags ?? []) if (!actual.tags?.includes(tag)) mismatches.push(`${keyOf(expected)} missing tag ${tag}`);
    }
    assert.deepEqual(mismatches, []);
  });

  it('every fail carries complete evidence and unknowns carry a reason', () => {
    const problems = [];
    for (const f of run.report.findings) {
      if (f.state === 'fail') {
        for (const key of ['value', 'source', 'status', 'finalUrl', 'selector', 'snippet', 'fetchedAt']) {
          if (!(key in (f.evidence ?? {}))) problems.push(`${f.taxonomyId} ${f.urlKey} lacks evidence.${key}`);
        }
        if ((f.evidence?.snippet ?? '').length > 200) problems.push(`${f.taxonomyId} snippet over 200`);
      }
      if (f.state === 'unknown' && !f.reason) problems.push(`${f.taxonomyId} ${f.urlKey} unknown without reason`);
    }
    assert.deepEqual(problems, []);
    assert.deepEqual(run.report.toolBugs, []);
  });

  it('retry: the 503-once and 429-once pages end pass and honour Retry-After; a page failing twice is unknown fetch_failed', () => {
    const fact = (path) => run.facts.find((f) => f.urlKey === `${run.server.origin}${path}`);
    for (const path of ['/flaky-503', '/flaky-429']) {
      assert.equal(fact(path)?.status, 200, `${path} ends 200`);
      assert.equal(fact(path)?.fetchState, 'ok');
    }
    const hits = run.server.requests.filter((r) => r.host === 'site' && r.path === '/flaky-429').map((r) => r.at);
    assert.ok(hits.length >= 2 && hits[1] - hits[0] >= 900, `Retry-After honoured (gap ${hits[1] - hits[0]} ms)`);
    assert.equal(fact('/reset')?.fetchState, 'fetch_failed');
    const reset = run.report.findings.find((f) => f.taxonomyId === 'page-fetch' && f.urlKey.endsWith('/reset'));
    assert.equal(reset?.reason, 'fetch_failed');
  });

  it('fetch: sends the default browser user agent and the configured Accept-Language', () => {
    const page = run.server.requests.find((r) => r.host === 'site' && r.path === '/about');
    assert.match(page.headers['user-agent'], /^Mozilla\/5\.0 .*site-review/);
    assert.equal(page.headers['accept-language'], 'en-GB,en;q=0.9');
  });

  it('url key: the four variants of one page produce one fact record and no duplicate-title finding', () => {
    const about = run.facts.filter((f) => f.urlKey === `${run.server.origin}/about`);
    assert.equal(about.length, 1);
    assert.ok(!run.report.findings.some((f) => f.taxonomyId === 'title-duplicate' && f.urlKey.endsWith('/about')));
  });

  it('extractor cases: apostrophe, SVG title, empty H1, numeric entity and JSON-LD parse error', () => {
    const fact = (path) => run.facts.find((f) => f.urlKey === `${run.server.origin}${path}`);
    assert.match(fact('/apostrophe').metaDescription, /^Janco's practice .* past the apostrophe\.$/);
    assert.equal(fact('/svg-title').title, null);
    assert.deepEqual(fact('/empty-h1').h1, ['']);
    assert.equal(fact('/entity-title').title, 'Rolfing – structural integration in Amsterdam');
    assert.ok(!run.report.findings.some((f) => f.urlKey.endsWith('/entity-title') && f.state === 'fail'));
    const jsonld = run.report.findings.find((f) => f.taxonomyId === 'jsonld-parse-error');
    let message = '';
    try {
      JSON.parse('{"@context":"https://schema.org","@type":"Organization",}');
    } catch (err) {
      message = err.message;
    }
    assert.equal(jsonld?.evidence.value, message);
  });

  it('state matrix: the three-page template escalates with --render-sample 1', (t) => {
    if (!rendered) return t.skip('Playwright could not launch');
    assert.ok(run.report.render.escalated.some((e) => e.template === 'tpl-blog' && e.taxonomyId === 'h1-missing'));
    const blog = run.report.findings.filter((f) => f.taxonomyId === 'h1-missing' && f.urlKey.includes('/blog/'));
    assert.equal(blog.length, 3);
    assert.ok(blog.every((f) => f.renderChecked));
  });

  it('health: score equals the README formula on the golden site', () => {
    const { score, pages, errorPages, warningPages } = run.report.health;
    assert.equal(score, FORMULA(pages, errorPages, warningPages));
    const okPages = run.facts.filter((f) => f.fetchState === 'ok').length;
    assert.equal(pages, okPages);
    const weights = new Map();
    for (const f of run.report.findings) {
      if (f.state !== 'fail' || f.transient) continue;
      weights.set(f.urlKey, Math.max(weights.get(f.urlKey) ?? 0, f.scoreWeight));
    }
    const okKeys = new Set(run.facts.filter((f) => f.fetchState === 'ok').map((f) => f.urlKey));
    const classes = [...weights].filter(([key]) => okKeys.has(key)).map(([, w]) => w);
    assert.equal(errorPages, classes.filter((w) => w === 1).length);
    assert.equal(warningPages, classes.filter((w) => w === 0.5).length);
  });
});

describe('golden: bot wall', () => {
  it('with --user-agent curl/8 the identical-hash rule aborts with the bot-wall message', async () => {
    const run = await runGolden({ render: false, extra: ['--user-agent', 'curl/8', '--no-reverify'] });
    try {
      assert.equal(run.code, 2);
      assert.equal(run.report.sanity.abort.code, 'bot_wall');
      assert.match(run.markdown, /bot.?wall|interstitial/i);
    } finally {
      await rm(run.dir, { recursive: true, force: true });
    }
  });
});

describe('golden: collapse and snapshot diff', () => {
  it('collapse: the missing-description-everywhere fixture is one site-wide pattern and per-page counts are unchanged', async () => {
    const run = await runGolden({ variant: 'sitewide', render: false, extra: ['--no-reverify'] });
    try {
      assert.equal(run.code, 0);
      const pattern = run.report.findings.filter((f) => f.taxonomyId === 'description-missing' && f.state === 'fail');
      const okHtml = run.facts.filter((f) => f.fetchState === 'ok' && f.status === 200 && f.redirectChain.length === 0);
      assert.equal(pattern.length, okHtml.length);
      const sitewideLines = run.markdown.split('\n').filter((l) => l.startsWith('| description-missing |'));
      assert.equal(sitewideLines.length, 1);
      assert.ok(!/### .*`description-missing`/.test(run.markdown), 'not listed again under Findings');
      const snapshot = JSON.parse(await readFile(join(run.out, 'snapshot.json'), 'utf8'));
      assert.equal(snapshot.counts['description-missing'], pattern.length);
    } finally {
      await rm(run.dir, { recursive: true, force: true });
    }
  });

  it('snapshot: second run reports fixed, still open and new by finding ID', async () => {
    const base = await runGolden({ render: false });
    const ports = { port: base.server.port, externalPort: Number(new URL(base.server.externalOrigin).port) };
    const fixed = await runGolden({ variant: 'fixed', render: false, ports, extra: ['--compare', base.out] });
    try {
      assert.equal(fixed.code, 0);
      const diff = fixed.report.diff;
      const has = (list, id, target) => list.some((e) => e.taxonomyId === id && (e.targetKey ?? e.urlKey).endsWith(target));
      assert.ok(has(diff.fixed, 'broken-internal-link', '/missing-page'), 'broken link reported fixed');
      assert.ok(has(diff.new, 'broken-internal-link', '/new-missing'), 'new 404 reported new');
      assert.ok(has(diff.stillOpen, 'http-5xx', '/always-503'), 'unchanged 5xx still open');
      assert.ok(!has([...diff.fixed, ...diff.new, ...diff.stillOpen], 'broken-internal-link', '/gone-then-back'), 'transient findings stay out of the diff');
    } finally {
      await rm(base.dir, { recursive: true, force: true });
      await rm(fixed.dir, { recursive: true, force: true });
    }
  });
});
