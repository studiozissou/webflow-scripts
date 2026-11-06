import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/redirects.js';
import { page, link, target, targets, site, config, key, assertValidRows, ids } from './_helpers.js';

const hop = (path, status) => ({ url: key(path), status });

describe('redirects check', () => {
  it('reports chains, temporary and permanent redirects on the linking page with first-hop status', async () => {
    const facts = [page('/'), page('/links', { links: [link('/redirect-a'), link('/moved'), link('/about')] })];
    const linkTargets = targets(
      target('/redirect-a', { redirectChain: [hop('/redirect-a', 302), hop('/redirect-b', 302)], finalUrl: key('/redirect-c') }),
      target('/moved', { redirectChain: [hop('/moved', 301)], finalUrl: key('/about') }),
      target('/about'),
    );
    const rows = assertValidRows(await check({ facts, linkTargets, site: site(), config: config() }));
    assert.deepEqual(ids(rows), [
      'permanent-redirect /links -> /moved',
      'redirect-chain /links -> /redirect-a',
      'temporary-redirect /links -> /redirect-a',
    ]);
    const chain = rows.find((r) => r.taxonomyId === 'redirect-chain');
    assert.equal(chain.evidence.status, 302);
    assert.equal(chain.evidence.finalUrl, key('/redirect-c'));
    assert.deepEqual(chain.evidence.value, [hop('/redirect-a', 302), hop('/redirect-b', 302)]);
    assert.equal(rows.find((r) => r.taxonomyId === 'permanent-redirect').evidence.status, 301);
  });

  it('reports a redirect loop as a chain', async () => {
    const facts = [page('/links', { links: [link('/loop')] })];
    const linkTargets = targets(target('/loop', { redirectChain: [hop('/loop', 301)], redirectLoop: true }));
    const rows = assertValidRows(await check({ facts, linkTargets, site: site(), config: config() }));
    assert.ok(ids(rows).includes('redirect-chain /links -> /loop'));
  });

  it('reports a sitemap record behind a chain on itself, without a target', async () => {
    const facts = [page('/old', { redirectChain: [hop('/old', 301), hop('/older', 301)] }), page('/short', { redirectChain: [hop('/short', 301)] })];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map(), site: site(), config: config() }));
    assert.deepEqual(ids(rows), ['redirect-chain /old']);
    assert.equal(rows[0].target, undefined);
    assert.equal(rows[0].evidence.status, 301);
  });

  it('records a temporary redirect on the root once at site level', async () => {
    const facts = [page('/', { redirectChain: [hop('/', 302)], finalUrl: key('/nl') }), page('/nl')];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map(), site: site(), config: config() }));
    assert.deepEqual(ids(rows), ['temporary-redirect /']);
    assert.equal(rows[0].siteLevel, true);
    assert.equal(rows[0].evidence.status, 302);
  });

  it('ignores external links and respects redirectChainMin', async () => {
    const facts = [page('/links', { links: [link('https://other.org/x'), link('/two')] })];
    const linkTargets = targets(
      target('https://other.org/x', { redirectChain: [{ url: 'https://other.org/x', status: 302 }] }),
      target('/two', { redirectChain: [hop('/two', 308), hop('/three', 308)] }),
    );
    const strict = config({ audit: { thresholds: { redirectChainMin: 3 } } });
    const rows = assertValidRows(await check({ facts, linkTargets, site: site(), config: strict }));
    assert.deepEqual(ids(rows), ['permanent-redirect /links -> /two']);
  });
});
