import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import {
  confirmFindings,
  createPlaywrightRenderer,
  jsonLdFromTexts,
  normaliseText,
  overlayFact,
  renderRelevantIds,
} from '../../tools/site-review/lib/render-confirm.js';
import { DEFAULT_CRAWL_CONFIG, DEFAULT_USER_AGENT } from '../../tools/site-review/config.js';
import { startGoldenServer } from './fixtures/golden/server.js';

const ORIGIN = 'https://example.com';
const sha = (value) => createHash('sha256').update(value).digest('hex');

const TAXONOMY = [
  { id: 'title-missing', label: 'Title missing', category: 'seo', severity: 'error', facts: ['title'], unit: 'page' },
  { id: 'title-too-short', label: 'Title too short', category: 'seo', severity: 'warning', facts: ['title'], unit: 'page' },
  { id: 'h1-missing', label: 'H1 missing', category: 'seo', severity: 'warning', facts: ['h1'], unit: 'page' },
  { id: 'canonical-missing', label: 'Canonical missing', category: 'seo', severity: 'warning', facts: ['canonicals'], unit: 'page' },
  { id: 'http-4xx', label: '4xx', category: 'seo', severity: 'error', facts: ['status'], unit: 'page', statusDerived: true },
];

const row = (taxonomyId, fact, value, selector) => ({
  taxonomyId,
  url: fact.url,
  urlKey: fact.urlKey,
  state: 'fail',
  evidence: { value, source: 'raw', status: fact.status, finalUrl: fact.finalUrl, selector, snippet: '', fetchedAt: fact.fetchedAt },
});

const okFacts = (facts) => facts.filter((fact) => fact.fetchState === 'ok');

const titles = {
  meta: { name: 'titles', taxonomyIds: ['title-missing', 'title-too-short'], tier: 1, crossPage: false, audit: true },
  calls: 0,
  async check({ facts }) {
    titles.calls += 1;
    const rows = [];
    for (const fact of okFacts(facts)) {
      if (!fact.title) rows.push(row('title-missing', fact, fact.title, 'head > title'));
      else if (fact.title.length < 10) rows.push(row('title-too-short', fact, fact.title, 'head > title'));
    }
    return rows;
  },
};

const headings = {
  meta: { name: 'headings', taxonomyIds: ['h1-missing'], tier: 1, crossPage: false, audit: true },
  async check({ facts }) {
    return okFacts(facts).filter((fact) => fact.h1.length === 0).map((fact) => row('h1-missing', fact, null, 'h1'));
  },
};

const canonical = {
  meta: { name: 'canonical', taxonomyIds: ['canonical-missing'], tier: 1, crossPage: false, audit: true },
  async check({ facts }) {
    return okFacts(facts)
      .filter((fact) => fact.canonicals.length === 0)
      .map((fact) => row('canonical-missing', fact, null, 'link[rel=canonical]'));
  },
};

const status = {
  meta: { name: 'status', taxonomyIds: ['http-4xx'], tier: 1, crossPage: false, audit: true },
  calls: 0,
  async check() {
    status.calls += 1;
    return [];
  },
};

const CHECKS = [titles, headings, canonical, status];

function fact(path, { wfPage = 'tpl', title = `A long enough title for ${path}`, h1 = ['Heading'], canonical: canon = true, fetchState = 'ok' } = {}) {
  const url = `${ORIGIN}${path}`;
  return {
    schemaVersion: 1,
    url,
    urlKey: url,
    finalUrl: url,
    status: 200,
    fetchState,
    fetchedAt: '2026-11-06T10:00:00.000Z',
    headers: { xRobotsTag: null },
    wfPage,
    title,
    metaDescription: 'A description',
    robotsMeta: null,
    canonicals: canon ? [{ href: url, url, key: url }] : [],
    hreflang: [],
    h1,
    jsonLd: { types: [], hashes: [], parseErrors: [] },
  };
}

const renderedFrom = (f, overrides = {}) => ({
  title: f.title,
  metaDescription: f.metaDescription,
  robotsMeta: f.robotsMeta,
  canonicals: f.canonicals.map(({ href, url }) => ({ href, url })),
  hreflang: [],
  h1: f.h1,
  jsonLd: { types: [], hashes: [], parseErrors: [] },
  renderedAt: '2026-11-06T10:05:00.000Z',
  ...overrides,
});

function toFinding(r, extra = {}) {
  const entry = TAXONOMY.find((e) => e.id === r.taxonomyId);
  return {
    id: `${r.taxonomyId}-${sha(`${r.taxonomyId}|${r.urlKey}|${r.targetKey ?? ''}`).slice(0, 12)}`,
    taxonomyId: r.taxonomyId,
    label: entry.label,
    category: entry.category,
    severity: entry.severity,
    scoreWeight: { error: 1, warning: 0.5, notice: 0 }[entry.severity],
    unit: entry.unit,
    state: r.state,
    ...(r.reason ? { reason: r.reason } : {}),
    url: r.url,
    urlKey: r.urlKey,
    evidence: r.evidence,
    renderChecked: false,
    transient: false,
    tags: [],
    excludedFromParity: false,
    ...extra,
  };
}

async function rawFindings(facts) {
  const rows = [];
  for (const mod of [titles, headings, canonical]) rows.push(...(await mod.check({ facts })));
  return rows.map((r) => toFinding(r));
}

function fakeRenderer(facts, overrides = {}) {
  const byUrl = new Map(facts.map((f) => [f.url, f]));
  const calls = [];
  return {
    calls,
    async renderPage(url) {
      calls.push(url);
      const f = byUrl.get(url);
      const extra = typeof overrides === 'function' ? overrides(f) : overrides[new URL(url).pathname];
      return renderedFrom(f, extra ?? {});
    },
  };
}

const configWith = (crawl) => ({ crawl: { ...DEFAULT_CRAWL_CONFIG, renderDrift: 0, ...crawl } });

const lowest = (keys, n, hashOf = sha) => [...keys].sort((a, b) => (hashOf(a) < hashOf(b) ? -1 : 1)).slice(0, n);

async function run({ facts, findings, config, renderer, now = '2026-11-15T00:00:00.000Z' }) {
  return confirmFindings({
    findings: findings ?? (await rawFindings(facts)),
    facts,
    linkTargets: new Map(),
    site: { root: { url: `${ORIGIN}/`, urlKey: `${ORIGIN}/` } },
    checks: CHECKS,
    taxonomy: TAXONOMY,
    config,
    renderPage: renderer.renderPage,
    log: { warn() {}, info() {} },
    now: () => new Date(now),
  });
}

describe('render-confirm', () => {
  it('derives render relevance from taxonomy facts and RENDERED_FIELDS', () => {
    assert.deepEqual([...renderRelevantIds(TAXONOMY)].sort(), ['canonical-missing', 'h1-missing', 'title-missing', 'title-too-short']);
  });

  it('render-confirm: samples 20 per template deterministically and up to 20 flagged pages per template and check', async () => {
    const a = Array.from({ length: 30 }, (_, i) => fact(`/a/${i}`, { wfPage: 'tpl-a' }));
    const b = Array.from({ length: 5 }, (_, i) => fact(`/b/${i}`, { wfPage: 'tpl-b' }));
    const facts = [...a, ...b];

    const first = fakeRenderer(facts);
    const result = await run({ facts, config: configWith({ renderSample: 20 }), renderer: first });
    const expected = [...lowest(a.map((f) => f.urlKey), 20), ...b.map((f) => f.urlKey)].sort();
    assert.deepEqual([...first.calls].sort(), expected);
    assert.equal(result.stats.sampled, 25);
    assert.equal(result.rendered.size, 25);

    const second = fakeRenderer(facts);
    await run({ facts, config: configWith({ renderSample: 20 }), renderer: second });
    assert.deepEqual([...second.calls].sort(), [...first.calls].sort());

    const c = Array.from({ length: 40 }, (_, i) => fact(`/c/${i}`, { wfPage: 'tpl-c', title: i < 25 ? 'Short' : undefined }));
    const flaggedRun = fakeRenderer(c);
    const flagged = await run({ facts: c, config: configWith({ renderSample: 2, renderFlagged: 20 }), renderer: flaggedRun });
    const failing = c.slice(0, 25).map((f) => f.urlKey);
    const expectedFlagged = new Set([...lowest(c.map((f) => f.urlKey), 2), ...lowest(failing, 20)]);
    assert.deepEqual([...flaggedRun.calls].sort(), [...expectedFlagged].sort());
    assert.equal(flagged.stats.escalated.length, 0);
    const confirmed = flagged.findings.filter((f) => f.taxonomyId === 'title-too-short' && f.renderChecked);
    assert.equal(confirmed.length, expectedFlagged.size - [...expectedFlagged].filter((k) => !failing.includes(k)).length);
    assert.ok(confirmed.every((f) => f.evidence.source === 'both'));
    assert.equal(flagged.findings.filter((f) => f.taxonomyId === 'title-too-short' && !f.renderChecked).length, 25 - confirmed.length);
  });

  it('adds drift pages seeded by the run month, outside the stable sample', async () => {
    const facts = Array.from({ length: 30 }, (_, i) => fact(`/d/${i}`, { wfPage: 'tpl-d' }));
    const keys = facts.map((f) => f.urlKey);
    const sample = new Set(lowest(keys, 5));
    const config = configWith({ renderSample: 5, renderDrift: 3 });
    const nov = fakeRenderer(facts);
    const result = await run({ facts, config, renderer: nov, now: '2026-11-20T00:00:00.000Z' });
    const driftKeys = (month) => lowest(keys.filter((k) => !sample.has(k)), 3, (k) => sha(`${k}${month}`));
    assert.deepEqual([...nov.calls].sort(), [...sample, ...driftKeys('2026-11')].sort());
    assert.equal(result.stats.drift, 3);
    const dec = fakeRenderer(facts);
    await run({ facts, config, renderer: dec, now: '2026-12-02T00:00:00.000Z' });
    assert.deepEqual([...dec.calls].sort(), [...sample, ...driftKeys('2026-12')].sort());
  });

  it('render-confirm: the state matrix gives fixed-after-load, rendered-only fail, and renderChecked false past the cap', async () => {
    const facts = [
      fact('/fixed', { wfPage: 'a-fixed', title: 'Hi' }),
      fact('/rendered-only', { wfPage: 'b-rendered' }),
      fact('/both', { wfPage: 'c-both', h1: [] }),
      fact('/capped', { wfPage: 'd-capped', title: null }),
    ];
    const findings = await rawFindings(facts);
    const unknownRow = { ...row('h1-missing', facts[0], null, 'h1'), state: 'unknown', reason: 'truncated' };
    const statusRow = row('http-4xx', facts[2], 404, 'status');
    findings.push(toFinding(unknownRow), toFinding(statusRow));
    const renderer = fakeRenderer(facts, {
      '/fixed': { title: 'A title rewritten by script after the page loads' },
      '/rendered-only': { canonicals: [] },
    });
    const { findings: out, stats } = await run({ facts, findings, config: configWith({ renderSample: 1, renderMax: 3 }), renderer });

    assert.equal(renderer.calls.length, 3);
    assert.equal(stats.capExceeded, true);
    const find = (id, path) => out.filter((f) => f.taxonomyId === id && f.urlKey === `${ORIGIN}${path}`);

    const [fixed] = find('title-too-short', '/fixed');
    assert.equal(fixed.state, 'fail');
    assert.equal(fixed.severity, 'notice');
    assert.equal(fixed.scoreWeight, 0);
    assert.deepEqual(fixed.tags, ['fixed-after-load']);
    assert.equal(fixed.evidence.source, 'raw');
    assert.equal(fixed.excludedFromParity, true);
    assert.equal(fixed.renderChecked, true);

    const [renderedOnly] = find('canonical-missing', '/rendered-only');
    assert.equal(renderedOnly.state, 'fail');
    assert.equal(renderedOnly.evidence.source, 'rendered');
    assert.equal(renderedOnly.renderChecked, true);
    assert.equal(renderedOnly.severity, 'warning');
    assert.match(renderedOnly.id, /^canonical-missing-[0-9a-f]{12}$/);

    const [both] = find('h1-missing', '/both');
    assert.equal(both.evidence.source, 'both');
    assert.equal(both.renderChecked, true);
    assert.equal(find('http-4xx', '/both')[0].renderChecked, true);

    const [unknown] = find('h1-missing', '/fixed');
    assert.equal(unknown.state, 'unknown');
    assert.equal(unknown.renderChecked, false);

    const [capped] = find('title-missing', '/capped');
    assert.equal(capped.renderChecked, false);
    assert.equal(capped.severity, 'error');
    assert.equal(capped.evidence.source, 'raw');
    assert.equal(status.calls, 0);
  });

  it('render-confirm: a disagreement in a one-page sample escalates the template for that check', async () => {
    const blog = ['one', 'two', 'three'].map((slug) => fact(`/blog/${slug}`, { wfPage: 'tpl-blog' }));
    const other = ['x', 'y', 'z'].map((slug) => fact(`/other/${slug}`, { wfPage: 'tpl-other' }));
    const facts = [...blog, ...other];
    const renderer = fakeRenderer(facts, (f) => (f.wfPage === 'tpl-blog' ? { h1: [] } : {}));
    const { findings, stats } = await run({ facts, config: configWith({ renderSample: 1 }), renderer });

    assert.deepEqual(stats.escalated, [{ template: 'tpl-blog', taxonomyId: 'h1-missing' }]);
    assert.equal(renderer.calls.filter((u) => u.includes('/blog/')).length, 3);
    assert.equal(renderer.calls.filter((u) => u.includes('/other/')).length, 1);
    const h1 = findings.filter((f) => f.taxonomyId === 'h1-missing');
    assert.equal(h1.length, 3);
    assert.ok(h1.every((f) => f.renderChecked && f.evidence.source === 'rendered' && f.state === 'fail'));
  });

  it('escalation stays within renderMax and reports the cap', async () => {
    const blog = Array.from({ length: 6 }, (_, i) => fact(`/blog/${i}`, { wfPage: 'tpl-blog' }));
    const renderer = fakeRenderer(blog, () => ({ h1: [] }));
    const { stats, findings } = await run({ facts: blog, config: configWith({ renderSample: 1, renderMax: 4 }), renderer });
    assert.equal(renderer.calls.length, 4);
    assert.equal(stats.capExceeded, true);
    assert.equal(findings.filter((f) => f.taxonomyId === 'h1-missing').length, 4);
  });

  it('keeps every finding unchanged with stats.notRun when the renderer cannot launch', async () => {
    const facts = [fact('/a', { title: 'Hi' })];
    const findings = await rawFindings(facts);
    const result = await run({
      facts,
      findings,
      config: configWith({}),
      renderer: { renderPage: async () => ({ error: 'playwright_unavailable', notRun: true }) },
    });
    assert.equal(result.stats.notRun, true);
    assert.deepEqual(result.findings, findings);
    assert.equal(result.rendered.size, 0);
  });

  it('normalises entities, whitespace, JSON-LD types and canonical keys before comparing', async () => {
    const f = fact('/entity', { title: 'Rolfing – structural integration in Amsterdam' });
    f.jsonLd = { types: ['WebPage', 'Organization'], hashes: ['abc'], parseErrors: [] };
    const rendered = renderedFrom(f, {
      title: '  Rolfing &#8211;   structural integration in Amsterdam ',
      canonicals: [{ href: `${ORIGIN}/Entity/`, url: `${ORIGIN}/Entity/` }],
      jsonLd: { types: ['Organization', 'WebPage'], hashes: ['other-hash-format'], parseErrors: [] },
    });
    const overlaid = overlayFact(f, rendered, { canonicalHost: 'example.com' });
    assert.equal(overlaid.title, f.title);
    assert.equal(overlaid.canonicals, f.canonicals);
    assert.equal(overlaid.jsonLd, f.jsonLd);
    assert.equal(normaliseText('a&nbsp;&amp;\n b'), 'a & b');
    const removed = overlayFact(f, renderedFrom(f, { canonicals: [{ href: '/relative', url: `${ORIGIN}/relative` }] }));
    assert.deepEqual(removed.canonicals, [{ href: '/relative', url: `${ORIGIN}/relative`, key: `${ORIGIN}/relative` }]);
  });

  it('reads JSON-LD parse errors with the same parser message as JSON.parse', () => {
    const broken = '{"@context":"https://schema.org","@type":"Organization",}';
    let message;
    try {
      JSON.parse(broken);
    } catch (error) {
      message = error.message;
    }
    const out = jsonLdFromTexts([broken, '{"@graph":[{"@type":"WebPage"},{"@type":["Thing","Place"]}]}']);
    assert.deepEqual(out.parseErrors, [{ message, snippet: broken }]);
    assert.deepEqual(out.types.sort(), ['Place', 'Thing', 'WebPage']);
    assert.equal(out.hashes.length, 2);
  });

  it('renders the golden script pages with Playwright (head-scoped, crawl user agent, media blocked)', async (t) => {
    const golden = await startGoldenServer();
    const executablePath = process.env.SR_CHROMIUM_PATH;
    const renderer = createPlaywrightRenderer({
      settleMs: 100,
      acceptLanguage: 'nl-NL,nl;q=0.9',
      launchOptions: executablePath ? { executablePath } : {},
    });
    try {
      const title = await renderer.renderPage(`${golden.origin}/script-title`);
      if (title.notRun) {
        t.skip(`Playwright cannot launch: ${title.error}`);
        return;
      }
      assert.equal(title.error, undefined);
      assert.equal(title.title, 'A title rewritten by script after the page loads');
      assert.ok(title.renderedAt);

      const canon = await renderer.renderPage(`${golden.origin}/script-canonical`);
      assert.deepEqual(canon.canonicals, []);
      assert.equal(canon.title, 'Canonical removed by script after the page loads');
      assert.equal(canon.h1.length, 1);

      const svg = await renderer.renderPage(`${golden.origin}/svg-title`);
      assert.equal(svg.title, null);

      const links = await renderer.renderPage(`${golden.origin}/links`);
      assert.equal(links.error, undefined);
      assert.equal(golden.requests.some((r) => r.path.startsWith('/images/')), false);

      const missing = await renderer.renderPage(`${golden.origin}/no-such-page`);
      assert.equal(missing.error, 'render_status_404');
      const moved = await renderer.renderPage(`${golden.origin}/moved`);
      assert.equal(moved.error, 'render_redirected');

      const page = golden.requests.find((r) => r.path === '/script-title');
      assert.equal(page.headers['user-agent'], DEFAULT_USER_AGENT);
      assert.equal(page.headers['accept-language'], 'nl-NL,nl;q=0.9');
    } finally {
      await renderer.close();
      await golden.close();
    }
  });
});
