// Unit tests for the runner's check stage: module selection, not_run and page-fetch unknown rows, rejected rows and render-relevant module filtering.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { runChecks, selectChecks, renderRelevantModules, summarise, loadCheckModules, loadTaxonomy } from '../../tools/site-review/lib/runner.js';
import { createLogger } from '../../tools/site-review/lib/logger.js';
import { loadConfig } from '../../tools/site-review/config.js';

const ROOT = 'https://example.com/';
const log = createLogger(false);
const config = { ...loadConfig(), crawl: { ...loadConfig().crawl, canonicalHost: 'example.com' } };

const taxonomy = [
  { id: 'title-missing', label: 'Title missing', category: 'seo', severity: 'error', check: 'titles', facts: ['title'], semrushId: 3, unit: 'page', priority: 1, statusDerived: false },
  { id: 'sec-thing', label: 'Header', category: 'security', severity: 'notice', check: 'security', facts: ['headers'], semrushId: null, unit: 'page', priority: 2, statusDerived: false },
  { id: 'model-thing', label: 'Model', category: 'seo', severity: 'notice', check: 'model', facts: [], semrushId: null, unit: 'page', priority: 2, statusDerived: false },
  { id: 'page-fetch', label: 'Page fetch', category: 'seo', severity: 'notice', scoreWeight: 0, check: null, facts: ['fetchState'], semrushId: null, unit: 'page', priority: 1, statusDerived: false },
];

const evidence = (value) => ({ value, source: 'raw', status: 200, finalUrl: ROOT, selector: 'head > title', snippet: '', fetchedAt: '2026-11-06T00:00:00.000Z' });

const facts = [
  { url: ROOT, urlKey: 'https://example.com/', finalUrl: ROOT, status: 200, fetchState: 'ok', title: null, fetchedAt: '2026-11-06T00:00:00.000Z' },
  { url: 'https://example.com/x.pdf', urlKey: 'https://example.com/x.pdf', finalUrl: 'https://example.com/x.pdf', status: 200, fetchState: 'non_html', fetchedAt: '2026-11-06T00:00:00.000Z' },
];
const site = { root: { url: ROOT, urlKey: 'https://example.com/' } };

const titles = {
  meta: { name: 'titles', taxonomyIds: ['title-missing'], tier: 1, crossPage: false, audit: true },
  async check({ facts: input }) {
    return input.filter((f) => f.fetchState === 'ok' && !f.title).map((f) => ({ taxonomyId: 'title-missing', url: f.url, urlKey: f.urlKey, state: 'fail', evidence: evidence(null) }));
  },
};
const throwing = {
  meta: { name: 'security', taxonomyIds: ['sec-thing'], tier: 1, crossPage: false, audit: true },
  async check() {
    throw new Error('boom');
  },
};
const model = {
  meta: { name: 'model', taxonomyIds: ['model-thing'], tier: 1, crossPage: false, audit: false },
  async check() {
    return [];
  },
};
const broken = {
  meta: { name: 'broken', taxonomyIds: ['title-missing'], tier: 1, crossPage: false, audit: true },
  async check() {
    return [{ taxonomyId: 'title-missing', url: ROOT, urlKey: 'https://example.com/', state: 'fail', evidence: { value: null } }];
  },
};

describe('runner: runChecks', () => {
  it('turns rows into findings with taxonomy severity', async () => {
    const out = await runChecks({ facts, linkTargets: new Map(), site, modules: [titles], taxonomy, config, log });
    const f = out.findings.find((x) => x.taxonomyId === 'title-missing');
    assert.equal(f.severity, 'error');
    assert.equal(f.state, 'fail');
    assert.ok(f.id.startsWith('title-missing-'));
  });

  it('emits one page-fetch unknown per record that is not ok', async () => {
    const out = await runChecks({ facts, linkTargets: new Map(), site, modules: [], taxonomy, config, log });
    const unknown = out.findings.filter((x) => x.taxonomyId === 'page-fetch');
    assert.equal(unknown.length, 1);
    assert.equal(unknown[0].reason, 'non_html');
    assert.equal(unknown[0].state, 'unknown');
  });

  it('a check that throws reports not_run for each of its IDs, never zero issues', async () => {
    const out = await runChecks({ facts, linkTargets: new Map(), site, modules: [throwing], taxonomy, config, log: { ...log, error() {} } });
    const row = out.findings.find((x) => x.taxonomyId === 'sec-thing');
    assert.equal(row.state, 'unknown');
    assert.equal(row.reason, 'not_run');
    assert.equal(out.failedChecks[0].name, 'security');
  });

  it('skips audit: false modules in audit mode and reports them not_run', async () => {
    const out = await runChecks({ facts, linkTargets: new Map(), site, modules: [model], taxonomy, config, log, mode: 'audit' });
    assert.deepEqual(out.skipped, ['model']);
    assert.equal(out.findings.find((x) => x.taxonomyId === 'model-thing').reason, 'not_run');
    const quick = await runChecks({ facts, linkTargets: new Map(), site, modules: [model], taxonomy, config, log, mode: 'quick' });
    assert.deepEqual(quick.ran, ['model']);
  });

  it('rejects a fail without full evidence as a tool bug', async () => {
    const out = await runChecks({ facts, linkTargets: new Map(), site, modules: [broken], taxonomy, config, log });
    assert.equal(out.findings.filter((x) => x.taxonomyId === 'title-missing').length, 0);
    assert.equal(out.rejected.length, 1);
    assert.ok(out.rejected[0].errors.length > 0);
  });
});

describe('runner: selection helpers', () => {
  it('selectChecks honours skip and tier', () => {
    const { run, skipped } = selectChecks([titles, throwing], { mode: 'audit', skip: ['security'] });
    assert.deepEqual(run.map((m) => m.meta.name), ['titles']);
    assert.deepEqual(skipped.map((m) => m.meta.name), ['security']);
  });

  it('renderRelevantModules keeps only modules with a rendered-field taxonomy entry', () => {
    const out = renderRelevantModules([titles, throwing, model], ['titles', 'security', 'model'], taxonomy);
    assert.deepEqual(out.map((m) => m.meta.name), ['titles']);
  });

  it('summarise counts live fails by severity and keeps unknown, transient and fixed-after-load apart', () => {
    const s = summarise([
      { state: 'fail', severity: 'error' },
      { state: 'fail', severity: 'warning', transient: true },
      { state: 'fail', severity: 'notice', tags: ['fixed-after-load'] },
      { state: 'unknown', severity: 'notice' },
    ]);
    assert.deepEqual([s.total, s.error, s.warning, s.notice, s.transient, s.unknown, s.fixedAfterLoad], [1, 1, 0, 0, 1, 1, 1]);
  });
});

describe('runner: the shipped modules and taxonomy agree', () => {
  it('every module ID is in taxonomy.json and code-review is audit: false', async () => {
    const [modules, entries] = await Promise.all([loadCheckModules(), loadTaxonomy()]);
    const ids = new Set(entries.map((e) => e.id));
    const missing = modules.flatMap((m) => m.meta.taxonomyIds.filter((id) => !ids.has(id)).map((id) => `${m.meta.name}:${id}`));
    assert.deepEqual(missing, []);
    assert.equal(modules.find((m) => m.meta.name === 'code-review')?.meta.audit, false);
    assert.ok(ids.has('page-fetch'));
  });
});
