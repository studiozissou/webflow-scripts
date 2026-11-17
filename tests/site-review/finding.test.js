import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createFinding, validateFinding, findingsFromRows, findingId, taxonomyEntry, indexTaxonomy, loadTaxonomy, clip,
} from '../../tools/site-review/lib/finding.js';

const ENTRY = {
  id: 'broken-internal-link', label: 'Broken internal link', category: 'seo', severity: 'error', check: 'broken-links',
  facts: ['links'], semrushId: 8, semrushLabel: 'Broken internal links', unit: 'link', priority: 1, statusDerived: true,
};

function row(overrides = {}) {
  return {
    taxonomyId: 'broken-internal-link', url: 'https://example.com/links', urlKey: 'https://example.com/links',
    target: 'https://example.com/missing', targetKey: 'https://example.com/missing', state: 'fail',
    evidence: {
      value: 404, source: 'raw', status: 404, finalUrl: 'https://example.com/missing', selector: 'a[href]',
      snippet: '<a href="/missing">Missing</a>', fetchedAt: '2026-11-06T10:00:00.000Z',
    },
    ...overrides,
  };
}

describe('finding', () => {
  it('finding: a fail without evidence is rejected; IDs do not change when the status changes', () => {
    const noEvidence = createFinding(row({ evidence: undefined }), ENTRY);
    assert.equal(validateFinding(noEvidence).valid, false);
    assert.ok(validateFinding(noEvidence).errors.includes('Missing evidence'));

    const a = createFinding(row(), ENTRY);
    const b = createFinding(row({ evidence: { ...row().evidence, status: 410, value: 410, snippet: 'other' } }), ENTRY);
    assert.equal(validateFinding(a).valid, true);
    assert.equal(a.id, b.id);
    assert.match(a.id, /^broken-internal-link-[0-9a-f]{12}$/);
  });

  it('rejects a fail missing any one evidence key, but accepts value null', () => {
    for (const keyName of ['value', 'source', 'status', 'finalUrl', 'selector', 'snippet', 'fetchedAt']) {
      const evidence = { ...row().evidence };
      delete evidence[keyName];
      const result = validateFinding(createFinding(row({ evidence }), ENTRY));
      assert.equal(result.valid, false, keyName);
      assert.ok(result.errors.includes(`Missing evidence.${keyName}`));
    }
    assert.equal(validateFinding(createFinding(row({ evidence: { ...row().evidence, value: null } }), ENTRY)).valid, true);
  });

  it('rejects a bad source and a snippet over 200 characters', () => {
    const badSource = createFinding(row({ evidence: { ...row().evidence, source: 'guess' } }), ENTRY);
    assert.equal(validateFinding(badSource).valid, false);
    const long = createFinding(row({ evidence: { ...row().evidence, snippet: 'x'.repeat(201) } }), ENTRY);
    assert.equal(validateFinding(long).valid, false);
    for (const source of ['raw', 'rendered', 'both']) {
      assert.equal(validateFinding(createFinding(row({ evidence: { ...row().evidence, source } }), ENTRY)).valid, true);
    }
  });

  it('requires a known reason on unknown findings', () => {
    const missing = createFinding(row({ state: 'unknown' }), ENTRY);
    assert.equal(validateFinding(missing).valid, false);
    const wrong = createFinding(row({ state: 'unknown', reason: 'flaky' }), ENTRY);
    assert.equal(validateFinding(wrong).valid, false);
    const ok = createFinding(row({ state: 'unknown', reason: 'blocked', evidence: undefined }), ENTRY);
    assert.equal(validateFinding(ok).valid, true);
    assert.equal(ok.reason, 'blocked');
  });

  it('rejects pass and other states', () => {
    assert.equal(validateFinding(createFinding(row({ state: 'pass' }), ENTRY)).valid, false);
  });

  it('builds the ID from taxonomyId, urlKey and targetKey only', () => {
    const expected = findingId('broken-internal-link', 'https://example.com/links', 'https://example.com/missing');
    assert.equal(createFinding(row(), ENTRY).id, expected);
    const other = createFinding(row({ targetKey: 'https://example.com/elsewhere' }), ENTRY);
    assert.notEqual(other.id, expected);
    const pageEntry = { ...ENTRY, id: 'title-missing', unit: 'page' };
    const pageRow = row({ taxonomyId: 'title-missing', target: undefined, targetKey: undefined });
    assert.equal(createFinding(pageRow, pageEntry).id, findingId('title-missing', 'https://example.com/links', ''));
  });

  it('copies taxonomy fields and sets the guard defaults', () => {
    const finding = createFinding(row(), ENTRY);
    assert.equal(finding.label, 'Broken internal link');
    assert.equal(finding.category, 'seo');
    assert.equal(finding.severity, 'error');
    assert.equal(finding.scoreWeight, 1);
    assert.equal(finding.unit, 'link');
    assert.equal(finding.target, 'https://example.com/missing');
    assert.equal(finding.renderChecked, false);
    assert.equal(finding.transient, false);
    assert.equal(finding.excludedFromParity, false);
    assert.deepEqual(finding.tags, []);
    assert.equal('check' in finding, false);
  });

  it('tags site-level entries and rows', () => {
    const entry = { ...ENTRY, id: 'llms-txt-missing', severity: 'notice', unit: 'page', siteLevel: true };
    assert.deepEqual(createFinding(row({ taxonomyId: 'llms-txt-missing' }), entry).tags, ['site-level']);
    assert.deepEqual(createFinding(row({ siteLevel: true }), ENTRY).tags, ['site-level']);
  });

  it('throws when the entry does not match the row', () => {
    assert.throws(() => createFinding(row(), undefined));
    assert.throws(() => createFinding(row(), { ...ENTRY, id: 'other' }));
  });

  it('defaults scoreWeight from severity unless the entry overrides it', () => {
    assert.equal(taxonomyEntry({ ...ENTRY, severity: 'warning' }).scoreWeight, 0.5);
    assert.equal(taxonomyEntry({ ...ENTRY, severity: 'notice' }).scoreWeight, 0);
    assert.equal(taxonomyEntry({ ...ENTRY, severity: 'warning', scoreWeight: 0 }).scoreWeight, 0);
  });

  it('findingsFromRows keeps valid rows, rejects bad ones with errors, and collapses repeated IDs', () => {
    const map = indexTaxonomy([ENTRY]);
    const { findings, rejected, duplicates } = findingsFromRows([
      row(), row(), row({ evidence: undefined }), row({ taxonomyId: 'nope' }),
    ], map);
    assert.equal(findings.length, 1);
    assert.equal(duplicates, 1);
    assert.equal(rejected.length, 2);
    assert.equal(rejected[0].row.taxonomyId, 'broken-internal-link');
    assert.ok(Array.isArray(rejected[0].errors));
    assert.match(rejected[1].errors[0], /Unknown taxonomyId/);
  });

  it('clip keeps snippets within 200 characters without splitting a surrogate pair', () => {
    assert.equal(clip('a'.repeat(300)).length, 200);
    assert.equal(clip(`${'a'.repeat(199)}😀`).length, 199);
    assert.equal(clip(null), '');
  });

  it('loadTaxonomy reads taxonomy.json with defaults applied', async () => {
    const entries = await loadTaxonomy();
    const pageFetch = entries.find((entry) => entry.id === 'page-fetch');
    assert.equal(pageFetch.scoreWeight, 0);
    assert.equal(entries.find((entry) => entry.id === 'http-4xx').scoreWeight, 1);
  });
});
