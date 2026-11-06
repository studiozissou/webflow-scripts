import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/broken-links.js';
import { page, link, target, targets, config, assertValidRows, ids } from './_helpers.js';

const EXT = 'https://other.org';

describe('broken-links check', () => {
  it('fails internal links to 4xx and 5xx targets and gives unknown for fetch_failed or timeout', async () => {
    const facts = [page('/links', {
      links: [link('/missing'), link('/missing'), link('/down'), link('/ok'), link('/reset'), link('/slow')],
    })];
    const linkTargets = targets(
      target('/missing', { status: 404 }), target('/down', { status: 503 }), target('/ok'),
      target('/reset', { status: 0, fetchState: 'fetch_failed', errorCode: 'ECONNRESET' }), target('/slow', { status: 0, fetchState: 'timeout' }),
    );
    const rows = assertValidRows(await check({ facts, linkTargets, config: config() }));
    assert.deepEqual(ids(rows), [
      'broken-internal-link /links -> /down',
      'broken-internal-link /links -> /missing',
      'broken-internal-link /links -> /reset (fetch_failed)',
      'broken-internal-link /links -> /slow (timeout)',
    ]);
    const missing = rows.find((r) => r.targetKey.endsWith('/missing'));
    assert.equal(missing.evidence.status, 404);
    assert.equal(missing.evidence.selector, 'a[href]');
    assert.equal(missing.target, 'https://example.com/missing');
  });

  it('treats external 403, 429, 999, blocked and capped targets as unknown, and ENOTFOUND as a fail', async () => {
    const urls = ['/gone', '/forbidden', '/rate', '/li', '/blocked', '/capped', '/dns', '/ok'].map((p) => `${EXT}${p}`);
    const facts = [page('/links', { links: urls.map((u) => link(u)) })];
    const linkTargets = targets(
      target(urls[0], { status: 404 }), target(urls[1], { status: 403 }), target(urls[2], { status: 429 }),
      target(urls[3], { status: 999 }), target(urls[4], { status: 0, fetchState: 'blocked' }),
      target(urls[5], { status: 0, fetchState: 'blocked', capExceeded: true }),
      target(urls[6], { status: 0, fetchState: 'fetch_failed', errorCode: 'ENOTFOUND' }), target(urls[7]),
    );
    const rows = assertValidRows(await check({ facts, linkTargets, config: config() }));
    const byTarget = Object.fromEntries(rows.map((r) => [r.targetKey.replace(EXT, ''), r.state === 'fail' ? 'fail' : r.reason]));
    assert.deepEqual(byTarget, {
      '/gone': 'fail', '/forbidden': 'blocked', '/rate': 'blocked', '/li': 'blocked', '/blocked': 'blocked',
      '/capped': 'cap_exceeded', '/dns': 'fail',
    });
    const dns = rows.find((r) => r.targetKey.endsWith('/dns'));
    assert.equal(dns.evidence.value, 'ENOTFOUND');
    assert.equal(dns.evidence.status, 0);
    assert.ok(rows.every((r) => r.taxonomyId === 'broken-external-link'));
  });

  it('checks external and internal images and ignores pages that are not 200 HTML', async () => {
    const facts = [
      page('/links', {
        images: [
          { src: `${EXT}/img.png`, srcKey: `${EXT}/img.png`, alt: 'x', width: 1, height: 1 },
          { src: '/local.png', srcKey: 'https://example.com/local.png', alt: 'x', width: 1, height: 1 },
        ],
      }),
      page('/retired', { status: 404, links: [link('/missing')] }),
    ];
    const linkTargets = targets(
      target(`${EXT}/img.png`, { status: 404 }), target('/local.png', { status: 404 }), target('/missing', { status: 404 }),
    );
    const rows = assertValidRows(await check({ facts, linkTargets, config: config() }));
    assert.deepEqual(ids(rows), ['broken-external-image /links -> https://other.org/img.png', 'broken-internal-image /links -> /local.png']);
  });

  it('gives unknown not_run for a link target the crawl never checked', async () => {
    const rows = assertValidRows(await check({ facts: [page('/links', { links: [link('/nowhere')] })], linkTargets: new Map(), config: config() }));
    assert.deepEqual(ids(rows), ['broken-internal-link /links -> /nowhere (not_run)']);
  });
});
