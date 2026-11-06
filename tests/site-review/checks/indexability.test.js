import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/indexability.js';
import { page, site, key, assertValidRows, ids } from './_helpers.js';

const clean = () => ({ groups: [], sitemaps: [], errors: [] });

describe('indexability check', () => {
  it('reports a robots.txt that does not answer 200 once at site level', async () => {
    const robots = { url: key('/robots.txt'), status: 404, fetchState: 'ok', text: null, sitemapUrls: [] };
    const rows = assertValidRows(await check({ facts: [page('/')], site: site({ robots }), parseRobots: clean }));
    assert.deepEqual(ids(rows), ['robots-txt-missing /']);
    assert.equal(rows[0].evidence.value, 404);
  });

  it('gives unknown when robots.txt could not be fetched', async () => {
    const robots = { url: key('/robots.txt'), status: 0, fetchState: 'timeout', text: null, sitemapUrls: [] };
    const rows = assertValidRows(await check({ facts: [page('/')], site: site({ robots }), parseRobots: clean }));
    assert.deepEqual(ids(rows), ['robots-txt-missing / (timeout)']);
  });

  it('reports parser errors as robots-txt-invalid and passes a clean file', async () => {
    const parseRobots = (text) => ({ groups: [], sitemaps: [], errors: text.includes('Disalow') ? [{ line: 2, message: 'unknown directive "Disalow"' }] : [] });
    const broken = site({ robots: { url: key('/robots.txt'), status: 200, fetchState: 'ok', text: 'User-agent: *\nDisalow: /x\n', sitemapUrls: [] } });
    const rows = assertValidRows(await check({ facts: [page('/')], site: broken, parseRobots }));
    assert.deepEqual(ids(rows), ['robots-txt-invalid /']);
    assert.deepEqual(rows[0].evidence.value, ['line 2: unknown directive "Disalow"']);
    assert.deepEqual(await check({ facts: [page('/')], site: site(), parseRobots }), []);
  });
});
