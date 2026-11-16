import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { runSanity } from '../../tools/site-review/lib/sanity.js';

const ORIGIN = 'https://example.com';
const fact = (path, { status = 200, htmlHash = `hash-${path}`, fetchState = 'ok' } = {}) => ({
  url: `${ORIGIN}${path}`,
  urlKey: `${ORIGIN}${path}`,
  status,
  fetchState,
  htmlHash,
});
const siteOf = (paths) => ({ rows: paths.map((path) => ({ url: `${ORIGIN}${path}`, urlKey: `${ORIGIN}${path}` })) });
const fail = (taxonomyId, i, extra = {}) => ({ id: `${taxonomyId}-${i}`, taxonomyId, state: 'fail', urlKey: `${ORIGIN}/${i}`, transient: false, excludedFromParity: false, ...extra });

describe('sanity', () => {
  it('sanity: one htmlHash on 90% of 200-status pages aborts with the bot-wall message; identical 404 pages do not; coverage under 95% banners', () => {
    const wall = [
      ...Array.from({ length: 9 }, (_, i) => fact(`/w${i}`, { htmlHash: 'deadbeefdeadbeef' })),
      fact('/real'),
    ];
    const walled = runSanity({ facts: wall, findings: [], site: siteOf(wall.map((f) => new URL(f.url).pathname)) });
    assert.equal(walled.abort.code, 'bot_wall');
    assert.match(walled.abort.message, /deadbeefdeadbeef/);
    assert.match(walled.abort.message, /90%/);
    assert.match(walled.abort.message, /user agent/);

    const sold = [
      ...Array.from({ length: 50 }, (_, i) => fact(`/sold${i}`, { status: 404, htmlHash: 'same404same404ab' })),
      ...Array.from({ length: 10 }, (_, i) => fact(`/live${i}`)),
    ];
    const paths = sold.map((f) => new URL(f.url).pathname);
    const ok = runSanity({ facts: sold, findings: [], site: siteOf(paths) });
    assert.equal(ok.abort, null);
    assert.deepEqual(ok.banners, []);
    assert.deepEqual(ok.coverage, { sitemapUrls: 60, fetched: 60, ratio: 1 });

    const low = runSanity({ facts: sold, findings: [], site: siteOf([...paths, '/a', '/b', '/c', '/d']) });
    assert.equal(low.coverage.fetched, 60);
    assert.equal(low.coverage.sitemapUrls, 64);
    assert.equal(low.banners[0].code, 'low_coverage');
    assert.match(low.banners[0].message, /60 of 64/);
  });

  it('needs ten 200-status pages before the bot-wall rule applies', () => {
    const facts = Array.from({ length: 9 }, (_, i) => fact(`/w${i}`, { htmlHash: 'same' }));
    assert.equal(runSanity({ facts, findings: [], site: siteOf([]) }).abort, null);
  });

  it('aborts with no_pages when nothing was fetched ok, and counts non_html rows as covered', () => {
    const facts = [fact('/a', { fetchState: 'fetch_failed', htmlHash: null }), fact('/doc.pdf', { fetchState: 'non_html', htmlHash: null })];
    const out = runSanity({ facts, findings: [], site: siteOf(['/a', '/doc.pdf']) });
    assert.equal(out.abort.code, 'no_pages');
    assert.equal(out.coverage.fetched, 1);
  });

  it('flags a count over 20 and over five times the previous snapshot as suspect, ignoring transient fails', () => {
    const findings = [
      ...Array.from({ length: 26 }, (_, i) => fail('title-missing', i)),
      ...Array.from({ length: 30 }, (_, i) => fail('h1-missing', i)),
      ...Array.from({ length: 30 }, (_, i) => fail('http-4xx', i, { transient: i > 0 })),
      ...Array.from({ length: 25 }, (_, i) => fail('canonical-missing', i)),
    ];
    const previousSnapshot = { counts: { 'title-missing': 5, 'h1-missing': 6, 'http-4xx': 0 } };
    const out = runSanity({ facts: [fact('/x')], findings, site: siteOf(['/x']), previousSnapshot });
    assert.deepEqual(out.suspect, [
      { taxonomyId: 'canonical-missing', count: 25, previous: 0 },
      { taxonomyId: 'title-missing', count: 26, previous: 5 },
    ]);
    assert.deepEqual(runSanity({ facts: [fact('/x')], findings, site: siteOf(['/x']) }).suspect, []);
  });
});
