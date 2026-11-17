import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check as titles } from '../../../tools/site-review/checks/titles.js';
import { check as descriptions } from '../../../tools/site-review/checks/descriptions.js';
import { page, config, key, assertValidRows, ids } from './_helpers.js';

const SHARED = 'Shared title used by two different pages';

describe('titles check', () => {
  it('checks: duplicate titles and descriptions are cross-page findings listing every URL', async () => {
    const facts = [
      page('/a', { title: SHARED, metaDescription: 'Same description' }),
      page('/b', { title: SHARED, metaDescription: 'Same description' }),
      page('/c', { title: SHARED, metaDescription: 'Same description' }),
      page('/d'),
      page('/redirected', { title: SHARED, redirectChain: [{ url: key('/redirected'), status: 301 }] }),
      page('/gone', { title: SHARED, status: 404 }),
    ];
    const titleRows = assertValidRows(await titles({ facts, config: config() }));
    const descRows = assertValidRows(await descriptions({ facts, config: config() }));
    for (const [rows, id] of [[titleRows, 'title-duplicate'], [descRows, 'description-duplicate']]) {
      const dupes = rows.filter((r) => r.taxonomyId === id);
      assert.deepEqual(dupes.map((r) => r.urlKey), [key('/a'), key('/b'), key('/c')]);
      assert.deepEqual(dupes[0].evidence.related, [key('/b'), key('/c')]);
      assert.deepEqual(dupes[2].evidence.related, [key('/a'), key('/b')]);
    }
    assert.equal(titleRows[0].evidence.selector, 'head > title');
  });

  it('reports missing, too long and too short titles against the thresholds', async () => {
    const facts = [
      page('/none', { title: null }), page('/empty', { title: '' }), page('/short', { title: 'Short' }),
      page('/long', { title: 'x'.repeat(71) }), page('/edge', { title: 'x'.repeat(70) }), page('/min', { title: 'x'.repeat(30) }),
    ];
    const rows = assertValidRows(await titles({ facts, config: config() }));
    assert.deepEqual(ids(rows), ['title-missing /empty', 'title-missing /none', 'title-too-long /long', 'title-too-short /short']);
    assert.equal(rows.find((r) => r.urlKey === key('/none')).evidence.snippet, '');
    assert.equal(rows.find((r) => r.urlKey === key('/empty')).evidence.snippet, '<title></title>');
    assert.equal(rows.find((r) => r.urlKey === key('/short')).evidence.value, 5);
  });

  it('counts characters, not UTF-16 units, and skips non-ok records', async () => {
    const facts = [page('/emoji', { title: '😀'.repeat(35) }), page('/failed', { fetchState: 'fetch_failed', title: null })];
    assert.deepEqual(await titles({ facts, config: config() }), []);
  });
});
