import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/descriptions.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('descriptions check', () => {
  it('reports null and empty descriptions as missing', async () => {
    const facts = [page('/none', { metaDescription: null }), page('/empty', { metaDescription: '' }), page('/fine')];
    const rows = assertValidRows(await check({ facts }));
    assert.deepEqual(ids(rows), ['description-missing /empty', 'description-missing /none']);
    assert.equal(rows.find((r) => r.urlKey.endsWith('/empty')).evidence.value, '');
  });

  it('reads a description with an apostrophe as distinct text', async () => {
    const facts = [page('/a', { metaDescription: "Janco's practice in Amsterdam" }), page('/b', { metaDescription: 'Janco' })];
    assert.deepEqual(await check({ facts }), []);
  });
});
