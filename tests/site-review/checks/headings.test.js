import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/headings.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('headings check', () => {
  it('reports missing and multiple H1s, and an H1 that repeats the title', async () => {
    const facts = [
      page('/none', { h1: [] }), page('/empty', { h1: [''] }), page('/two', { h1: ['First', 'Second'] }),
      page('/same', { title: 'The H1 repeats this title', h1: ['  the h1 repeats   this title '] }),
    ];
    const rows = assertValidRows(await check({ facts }));
    assert.deepEqual(ids(rows), ['h1-duplicates-title /same', 'h1-missing /none', 'h1-multiple /two']);
    assert.deepEqual(rows.find((r) => r.taxonomyId === 'h1-multiple').evidence.value, ['First', 'Second']);
  });

  it('skips records without parsed headings', async () => {
    assert.deepEqual(await check({ facts: [page('/x', { h1: null }), page('/y', { fetchState: 'non_html', h1: [] })] }), []);
  });
});
