// Unit tests for the URL-key normalisation rule in contracts.md.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { urlKey, hostOfKey, isInternalUrl } from '../../tools/site-review/lib/url-key.js';

const opts = { canonicalHost: 'www.example.com' };

describe('url-key: trailing slash, case, fragment, tracking parameters and host variants fold to one key', () => {
  const variants = [
    'https://www.example.com/about',
    'https://www.example.com/about/',
    'https://www.example.com/About',
    'https://WWW.EXAMPLE.COM/about#team',
    'https://example.com/about',
    'https://www.example.com/about?utm_source=news&utm_medium=email',
    'https://www.example.com/about?gclid=abc&fbclid=def&mc_cid=1&mc_eid=2',
    'https://www.example.com/about/index.html',
    'https://www.example.com/about/index',
    'https://www.example.com//about',
  ];

  for (const variant of variants) {
    it(`folds ${variant}`, () => {
      assert.equal(urlKey(variant, opts), 'https://www.example.com/about');
    });
  }

  it('keeps the root slash and folds /index to the root', () => {
    assert.equal(urlKey('https://example.com', opts), 'https://www.example.com/');
    assert.equal(urlKey('https://example.com/index', opts), 'https://www.example.com/');
    assert.equal(urlKey('https://example.com/index.html', opts), 'https://www.example.com/');
  });

  it('sorts the remaining query and keeps non-tracking parameters', () => {
    assert.equal(
      urlKey('https://www.example.com/search?q=b&page=2&utm_campaign=x', opts),
      'https://www.example.com/search?page=2&q=b',
    );
  });

  it('keeps the scheme distinct so http links stay visible', () => {
    assert.equal(urlKey('http://www.example.com/about', opts), 'http://www.example.com/about');
  });

  it('resolves relative hrefs against a base', () => {
    assert.equal(
      urlKey('../contact/', { base: 'https://example.com/nl/about', ...opts }),
      'https://www.example.com/contact',
    );
  });

  it('maps the apex to www and www to the apex, depending on the canonical host', () => {
    assert.equal(urlKey('https://www.example.com/a', { canonicalHost: 'example.com' }), 'https://example.com/a');
  });

  it('leaves other hosts alone and keeps ports', () => {
    assert.equal(urlKey('https://cdn.example.com/a/', opts), 'https://cdn.example.com/a');
    assert.equal(urlKey('http://127.0.0.1:4321/A/'), 'http://127.0.0.1:4321/a');
  });

  it('returns null for non-http and unparseable input', () => {
    assert.equal(urlKey('mailto:hi@example.com'), null);
    assert.equal(urlKey('javascript:void(0)'), null);
    assert.equal(urlKey('/relative-without-base'), null);
    assert.equal(urlKey(''), null);
    assert.equal(urlKey(undefined), null);
  });

  it('hostOfKey returns the host of a key', () => {
    assert.equal(hostOfKey('https://www.example.com/a'), 'www.example.com');
  });

  it('isInternalUrl treats www and apex as one site and honours includeHosts', () => {
    assert.ok(isInternalUrl('https://example.com/x', opts));
    assert.ok(isInternalUrl('/x', { base: 'https://www.example.com/', ...opts }));
    assert.ok(!isInternalUrl('https://shop.example.com/x', opts));
    assert.ok(isInternalUrl('https://shop.example.com/x', { ...opts, includeHosts: ['shop.example.com'] }));
    assert.ok(!isInternalUrl('mailto:a@example.com', opts));
  });
});
