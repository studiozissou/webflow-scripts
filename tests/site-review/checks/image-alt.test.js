import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/image-alt.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('image-alt check', () => {
  it('reports images without alt once per target; empty alt is decorative and passes', async () => {
    const images = [
      { src: '/images/photo.png', srcKey: 'https://example.com/images/photo.png', alt: null, width: 10, height: 10 },
      { src: '/images/photo.png', srcKey: 'https://example.com/images/photo.png', alt: null, width: 10, height: 10 },
      { src: '/images/deco.png', srcKey: 'https://example.com/images/deco.png', alt: '', width: 10, height: 10 },
      { src: '/images/named.png', srcKey: 'https://example.com/images/named.png', alt: 'Named', width: 10, height: 10 },
    ];
    const rows = assertValidRows(await check({ facts: [page('/links', { images })], linkTargets: new Map() }));
    assert.deepEqual(ids(rows), ['image-missing-alt /links -> /images/photo.png']);
    assert.equal(rows[0].target, 'https://example.com/images/photo.png');
    assert.equal(rows[0].evidence.snippet, '<img src="/images/photo.png">');
  });
});
