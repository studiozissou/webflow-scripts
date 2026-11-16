import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/document.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('document check', () => {
  it('reports a missing viewport, doctype and charset', async () => {
    const facts = [page('/bare-document', { viewport: null, doctype: null, charset: null }), page('/fine')];
    const rows = assertValidRows(await check({ facts }));
    assert.deepEqual(ids(rows), ['charset-missing /bare-document', 'doctype-missing /bare-document', 'viewport-missing /bare-document']);
    assert.ok(rows.every((r) => r.evidence.value === null && r.evidence.snippet === ''));
  });

  it('only reads 200 HTML records', async () => {
    assert.deepEqual(await check({ facts: [page('/gone', { status: 404, viewport: null })] }), []);
  });
});
