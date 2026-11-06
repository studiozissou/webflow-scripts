import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { reverifyFindings, reproduces } from '../../tools/site-review/lib/reverify.js';
import { startGoldenServer } from './fixtures/golden/server.js';

const TAXONOMY = [
  { id: 'broken-internal-link', severity: 'error', unit: 'link', statusDerived: true, facts: ['links'] },
  { id: 'http-4xx', severity: 'error', unit: 'page', statusDerived: true, facts: ['status'] },
  { id: 'temporary-redirect', severity: 'warning', unit: 'link', statusDerived: true, facts: ['links'] },
  { id: 'canonical-to-non-200', severity: 'error', unit: 'link', statusDerived: true, facts: ['canonicals'] },
  { id: 'title-missing', severity: 'error', unit: 'page', statusDerived: false, facts: ['title'] },
];

const finding = (taxonomyId, { url = 'https://example.com/links', target, status = 404, value = status, state = 'fail' } = {}) => ({
  id: `${taxonomyId}-${(target ?? url).length}`,
  taxonomyId,
  state,
  url,
  urlKey: url,
  ...(target ? { target, targetKey: target } : {}),
  evidence: { value, source: 'raw', status, finalUrl: target ?? url, selector: 'a[href]', snippet: '', fetchedAt: 'x' },
  renderChecked: false,
  transient: false,
  tags: [],
  excludedFromParity: false,
});

const result = (status, extra = {}) => ({ status, fetchState: 'ok', errorCode: null, redirectChain: [], ...extra });

describe('reverify', () => {
  it('reverify: a status fail that does not reproduce moves to transient, using fetchPage without keep-alive', async () => {
    const golden = await startGoldenServer();
    try {
      const target = `${golden.origin}/gone-then-back`;
      const first = await fetch(target);
      assert.equal(first.status, 404);
      const calls = [];
      const sleeps = [];
      const fetchPage = async (url, opts) => {
        calls.push({ url, opts });
        const res = await fetch(url, { redirect: 'manual' });
        return result(res.status);
      };
      const findings = [
        finding('broken-internal-link', { url: `${golden.origin}/links`, target }),
        finding('broken-internal-link', { url: `${golden.origin}/other`, target }),
        finding('broken-internal-link', { url: `${golden.origin}/links`, target: `${golden.origin}/missing-page` }),
        finding('title-missing', { url: `${golden.origin}/links`, status: 200, value: null }),
      ];
      const out = await reverifyFindings({ findings, taxonomy: TAXONOMY, fetchPage, sleep: async (ms) => sleeps.push(ms) });

      assert.deepEqual(sleeps, [2000]);
      assert.equal(calls.length, 2);
      for (const call of calls) assert.deepEqual(call.opts, { keepAlive: false, retries: 0, method: 'GET', readBody: false });
      assert.equal(golden.countOf('/gone-then-back'), 2);
      assert.equal(out.findings[0].transient, true);
      assert.deepEqual(out.findings[0].tags, ['transient']);
      assert.equal(out.findings[1].transient, true);
      assert.equal(out.findings[2].transient, false);
      assert.equal(out.findings[3], findings[3]);
      assert.equal(out.stats.transient, 2);
      assert.equal(out.stats.reproduced, 1);
    } finally {
      await golden.close();
    }
  });

  it('does not sleep or fetch when nothing is status-derived', async () => {
    let slept = false;
    const findings = [finding('title-missing', { status: 200 }), finding('http-4xx', { state: 'unknown' })];
    const out = await reverifyFindings({ findings, taxonomy: TAXONOMY, fetchPage: () => assert.fail('fetched'), sleep: async () => { slept = true; } });
    assert.equal(slept, false);
    assert.equal(out.findings, findings);
  });

  it('applies the class rules for 4xx, ENOTFOUND, redirects, non-200 targets and inconclusive refetches', () => {
    const page = finding('http-4xx', { status: 410 });
    assert.equal(reproduces(page, result(404)), true);
    assert.equal(reproduces(page, result(500)), true);
    assert.equal(reproduces(page, result(200)), false);
    assert.equal(reproduces(finding('http-4xx', { status: 0, value: null }), result(0, { errorCode: 'ENOTFOUND', fetchState: 'fetch_failed' })), true);
    assert.equal(reproduces(page, result(0, { fetchState: 'timeout' })), null);

    const temp = finding('temporary-redirect', { target: 'https://example.com/r', status: 302 });
    assert.equal(reproduces(temp, result(200, { redirectChain: [{ url: 'https://example.com/r', status: 302 }] })), true);
    assert.equal(reproduces(temp, result(200, { redirectChain: [{ url: 'https://example.com/r', status: 301 }] })), false);
    assert.equal(reproduces(temp, result(200)), false);

    const canon = finding('canonical-to-non-200', { target: 'https://example.com/c', status: 301 });
    assert.equal(reproduces(canon, result(200, { redirectChain: [{ url: 'https://example.com/c', status: 301 }] })), true);
    assert.equal(reproduces(canon, result(200)), false);
  });
});
