import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/sitemap-hygiene.js';
import { check as internalLinks } from '../../../tools/site-review/checks/internal-links.js';
import { page, link, site, key, assertValidRows, ids } from './_helpers.js';

describe('sitemap-hygiene check', () => {
  it('checks: a noindex page in the sitemap fails sitemap-hygiene; a sitemap page nobody links to is orphaned', async () => {
    const facts = [
      page('/', { inSitemap: true, links: [link('/'), link('/noindex')] }),
      page('/noindex', { robotsMeta: 'noindex, follow', links: [link('/')] }),
      page('/orphan', { links: [link('/orphan'), link('/')] }),
      page('/off-sitemap', { inSitemap: false, robotsMeta: 'noindex' }),
    ];
    const hygiene = assertValidRows(await check({ facts, site: site() }));
    assert.deepEqual(ids(hygiene), ['sitemap-noindex /noindex']);
    assert.equal(hygiene[0].evidence.value, 'noindex, follow');
    const links = assertValidRows(await internalLinks({ facts, linkTargets: new Map() }));
    assert.deepEqual(ids(links).filter((id) => id.startsWith('sitemap-orphan')), ['sitemap-orphan /orphan']);
  });

  it('reports sitemap records that are not a clean 200 with the first status seen', async () => {
    const facts = [
      page('/retired', { status: 404 }),
      page('/old-page', { redirectChain: [{ url: key('/old-page'), status: 301 }], finalUrl: key('/about') }),
      page('/file.pdf', { fetchState: 'non_html' }),
      page('/reset', { fetchState: 'fetch_failed', status: 0 }),
      page('/linked-only', { inSitemap: false, status: 404 }),
    ];
    const rows = assertValidRows(await check({ facts, site: site() }));
    assert.deepEqual(ids(rows), ['sitemap-incorrect-page /old-page', 'sitemap-incorrect-page /retired']);
    assert.equal(rows.find((r) => r.urlKey.endsWith('/old-page')).evidence.status, 301);
    assert.equal(rows.find((r) => r.urlKey.endsWith('/retired')).evidence.status, 404);
  });

  it('reports a missing or invalid sitemap once at site level', async () => {
    const facts = [page('/')];
    const missing = site({ sitemaps: [{ url: key('/sitemap.xml'), status: 404, fetchState: 'ok', kind: null, valid: false, error: null, urlCount: 0 }] });
    assert.deepEqual(ids(assertValidRows(await check({ facts, site: missing }))), ['sitemap-missing /']);
    assert.deepEqual(ids(assertValidRows(await check({ facts, site: site({ sitemaps: [] }) }))), ['sitemap-missing /']);
    const invalid = site({ sitemaps: [{ url: key('/sitemap.xml'), status: 200, fetchState: 'ok', kind: null, valid: false, error: 'no urlset', urlCount: 0 }] });
    const rows = assertValidRows(await check({ facts, site: invalid }));
    assert.deepEqual(ids(rows), ['sitemap-invalid /']);
    assert.match(rows[0].evidence.snippet, /no urlset/);
  });

  it('gives unknown when the sitemap fetch timed out', async () => {
    const timedOut = site({ sitemaps: [{ url: key('/sitemap.xml'), status: 0, fetchState: 'timeout', kind: null, valid: false, error: null, urlCount: 0 }] });
    assert.deepEqual(ids(assertValidRows(await check({ facts: [page('/')], site: timedOut }))), ['sitemap-missing / (timeout)']);
  });
});
