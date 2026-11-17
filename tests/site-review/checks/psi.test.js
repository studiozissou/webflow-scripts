import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { check, meta } from '../../../tools/site-review/checks/psi.js';
import { page, site, config, assertValidRows, ids } from './_helpers.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/psi-response.json', import.meta.url), 'utf8'));
const silent = { log() {}, warn() {}, error() {} };

describe('psi check', () => {
  it('gives unknown not_run rows for every psi ID when no key is configured', async () => {
    const rows = assertValidRows(await check({ facts: [page('/')], site: site(), config: config(), log: silent }));
    assert.deepEqual(ids(rows), ['psi-cls / (not_run)', 'psi-inp / (not_run)', 'psi-lcp / (not_run)']);
    assert.ok(meta.taxonomyIds.every((id) => id.startsWith('psi-')));
  });

  it('reports field metrics above the thresholds with the PSI JSON field as the value', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));
      return { ok: true, json: async () => fixture };
    };
    const cfg = config({ googlePsiApiKey: 'test-key', psiDelayMs: 0 });
    const rows = assertValidRows(await check({ facts: [page('/')], site: site(), config: cfg, log: silent, fetchImpl }));
    assert.deepEqual(ids(rows), ['psi-lcp /']);
    assert.equal(rows[0].evidence.value, 4500);
    assert.equal(rows[0].evidence.selector, 'loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile');
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => url.includes('pagespeedonline') && url.includes('key=test-key')));
  });

  it('gives unknown fetch_failed when the API fails for a page', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500 });
    const cfg = config({ googlePsiApiKey: 'k', psiDelayMs: 0 });
    const rows = assertValidRows(await check({ facts: [page('/')], site: site(), config: cfg, log: silent, fetchImpl }));
    assert.ok(rows.every((r) => r.state === 'unknown' && r.reason === 'fetch_failed'));
    assert.equal(rows.length, 3);
  });
});
