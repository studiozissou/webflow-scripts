import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/page-weight.js';
import { page, link, config, assertValidRows, ids } from './_helpers.js';

describe('page-weight check', () => {
  it('reports large HTML, too many links and uncompressed pages against the thresholds', async () => {
    const plain = page('/uncompressed');
    plain.headers = { ...plain.headers, contentEncoding: null };
    const facts = [
      page('/large', { bytes: 2_000_001 }),
      page('/many-links', { links: Array.from({ length: 3001 }, () => link('/about')) }),
      plain,
      page('/edge', { bytes: 2_000_000, links: Array.from({ length: 3000 }, () => link('/about')) }),
    ];
    const rows = assertValidRows(await check({ facts, config: config() }));
    assert.deepEqual(ids(rows), ['html-too-large /large', 'too-many-links /many-links', 'uncompressed-page /uncompressed']);
    assert.equal(rows.find((r) => r.taxonomyId === 'too-many-links').evidence.value, 3001);
    assert.equal(rows.find((r) => r.taxonomyId === 'uncompressed-page').evidence.selector, 'header:content-encoding');
  });
});
