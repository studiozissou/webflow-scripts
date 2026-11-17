import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/mixed-content.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('mixed-content check', () => {
  it('checks: http resources on an https page are mixed content', async () => {
    const resources = [
      { url: 'https://cdn.example.com/ok.js', kind: 'script' },
      { url: 'http://cdn.example.com/app.js', kind: 'script' },
      { url: 'http://cdn.example.com/a.png', kind: 'img' },
    ];
    const facts = [page('/mixed', { resources }), page('/clean', { resources: [resources[0]] })];
    const rows = assertValidRows(await check({ facts }));
    assert.deepEqual(ids(rows), ['mixed-content /mixed']);
    assert.equal(rows[0].evidence.value, 2);
    assert.equal(rows[0].evidence.snippet, '<script src="http://cdn.example.com/app.js">');
    assert.equal(rows[0].evidence.selector, 'script[src]');
  });

  it('ignores http pages', async () => {
    const url = 'http://example.com/plain';
    const facts = [page('/plain', { url, urlKey: url, finalUrl: url, resources: [{ url: 'http://x.org/a.js', kind: 'script' }] })];
    assert.deepEqual(await check({ facts }), []);
  });
});
