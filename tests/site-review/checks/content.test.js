import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/content.js';
import { page, config, key, assertValidRows, ids } from './_helpers.js';

describe('content check', () => {
  it('reports pages sharing a textHash with at least 50 words, listing the others', async () => {
    const facts = [
      page('/copy-a', { textHash: 'same' }), page('/copy-b', { textHash: 'same' }),
      page('/thin-a', { textHash: 'tiny', wordCount: 49, textToHtmlRatio: 0.3 }), page('/thin-b', { textHash: 'tiny', wordCount: 49 }),
    ];
    const rows = assertValidRows(await check({ facts, config: config() }));
    const dupes = rows.filter((r) => r.taxonomyId === 'duplicate-content');
    assert.deepEqual(dupes.map((r) => r.urlKey), [key('/copy-a'), key('/copy-b')]);
    assert.deepEqual(dupes[0].evidence.related, [key('/copy-b')]);
  });

  it('reports low word count and low text to HTML against the thresholds', async () => {
    const facts = [page('/thin', { wordCount: 40 }), page('/heavy', { textToHtmlRatio: 0.02 }), page('/ok', { wordCount: 200, textToHtmlRatio: 0.1 })];
    const rows = assertValidRows(await check({ facts, config: config() }));
    assert.deepEqual(ids(rows), ['low-text-to-html /heavy', 'low-word-count /thin']);
  });
});
