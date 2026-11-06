import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/llms-txt.js';
import { page, site, key, assertValidRows, ids } from './_helpers.js';

describe('llms-txt check', () => {
  it('reports a missing llms.txt once on the root and passes a 200', async () => {
    const missing = site({ llms: { url: key('/llms.txt'), status: 404, fetchState: 'ok' } });
    const rows = assertValidRows(await check({ facts: [page('/')], site: missing }));
    assert.deepEqual(ids(rows), ['llms-txt-missing /']);
    assert.equal(rows[0].evidence.finalUrl, key('/llms.txt'));
    assert.deepEqual(await check({ facts: [page('/')], site: site() }), []);
  });

  it('gives unknown when the fetch failed', async () => {
    const failed = site({ llms: { url: key('/llms.txt'), status: 0, fetchState: 'fetch_failed' } });
    assert.deepEqual(ids(assertValidRows(await check({ facts: [page('/')], site: failed }))), ['llms-txt-missing / (fetch_failed)']);
  });
});
