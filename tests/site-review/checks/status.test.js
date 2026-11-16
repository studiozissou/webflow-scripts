import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta } from '../../../tools/site-review/checks/status.js';
import { page, target, targets, assertValidRows, ids } from './_helpers.js';

describe('status check', () => {
  it('has the contract meta', () => {
    assert.deepEqual(meta.taxonomyIds, ['http-4xx', 'http-5xx']);
  });

  it('reports 4xx and 5xx fact records, including non_html ones', async () => {
    const facts = [
      page('/'), page('/retired', { status: 404 }), page('/file.pdf', { fetchState: 'non_html', status: 503 }),
      page('/reset', { fetchState: 'fetch_failed', status: 0 }), page('/private', { fetchState: 'blocked', status: 429 }),
    ];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map() }));
    assert.deepEqual(ids(rows), ['http-4xx /retired', 'http-5xx /file.pdf']);
    assert.equal(rows[0].evidence.status, 404);
    assert.equal(rows[0].evidence.value, 404);
  });

  it('reports internal link targets that are not fact records, once each', async () => {
    const linkTargets = targets(
      target('/missing', { status: 404 }),
      target('/down', { status: 503, fetchState: 'non_html' }),
      target('/retired', { status: 404, isFact: true }),
      target('https://other.org/gone', { status: 404 }),
      target('/timeout', { status: 0, fetchState: 'timeout' }),
    );
    const rows = assertValidRows(await check({ facts: [page('/retired', { status: 404 })], linkTargets }));
    assert.deepEqual(ids(rows), ['http-4xx /missing', 'http-4xx /retired', 'http-5xx /down']);
  });
});
