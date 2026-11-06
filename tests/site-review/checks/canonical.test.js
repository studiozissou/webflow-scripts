import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/canonical.js';
import { page, target, targets, key, assertValidRows, ids } from './_helpers.js';

const canon = (href, path = href) => ({ href, url: key(path), key: key(path) });

describe('canonical check', () => {
  it('checks: a canonical pointing at a redirect or 404 fails with the target status as value', async () => {
    const facts = [
      page('/to-redirect', { canonicals: [canon(key('/redirect-a'), '/redirect-a')] }),
      page('/to-404', { canonicals: [canon(key('/gone'), '/gone')] }),
      page('/to-fact', { canonicals: [canon(key('/about'), '/about')] }),
      page('/about'),
    ];
    const linkTargets = targets(
      target('/redirect-a', { redirectChain: [{ url: key('/redirect-a'), status: 302 }], finalUrl: key('/redirect-c'), kinds: ['canonical'] }),
      target('/gone', { status: 404, kinds: ['canonical'] }),
    );
    const rows = assertValidRows(await check({ facts, linkTargets }));
    assert.deepEqual(ids(rows), ['canonical-to-non-200 /to-404 -> /gone', 'canonical-to-non-200 /to-redirect -> /redirect-a']);
    const redirect = rows.find((r) => r.targetKey.endsWith('/redirect-a'));
    assert.equal(redirect.evidence.value, 302);
    assert.equal(redirect.evidence.status, 302);
    assert.equal(rows.find((r) => r.targetKey.endsWith('/gone')).evidence.value, 404);
  });

  it('checks: multiple canonicals fail; a relative canonical fails', async () => {
    const facts = [
      page('/multi', { canonicals: [canon(key('/multi'), '/multi'), canon(key('/about'), '/about')] }),
      page('/same-twice', { canonicals: [canon(key('/same-twice'), '/same-twice'), canon(key('/same-twice'), '/same-twice')] }),
      page('/relative', { canonicals: [canon('/relative')] }),
      page('/about'),
    ];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map() }));
    assert.deepEqual(ids(rows), ['canonical-multiple /multi', 'canonical-not-absolute /relative']);
    assert.equal(rows.find((r) => r.taxonomyId === 'canonical-not-absolute').evidence.value, '/relative');
  });

  it('reports a page without a canonical and gives unknown for an unreachable target', async () => {
    const facts = [page('/none', { canonicals: [] }), page('/unreachable', { canonicals: [canon(key('/reset'), '/reset')] })];
    const linkTargets = targets(target('/reset', { status: 0, fetchState: 'fetch_failed' }));
    const rows = assertValidRows(await check({ facts, linkTargets }));
    assert.deepEqual(ids(rows), ['canonical-missing /none', 'canonical-to-non-200 /unreachable -> /reset (fetch_failed)']);
  });
});
