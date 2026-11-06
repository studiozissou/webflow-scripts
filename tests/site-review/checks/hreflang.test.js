import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/hreflang.js';
import { page, target, targets, key, assertValidRows, ids } from './_helpers.js';

const alt = (lang, path) => ({ lang, href: key(path), url: key(path), key: key(path) });

describe('hreflang check', () => {
  it('checks: hreflang without a return link fails on the page that lacks it', async () => {
    const facts = [
      page('/en', { hreflang: [alt('en', '/en'), alt('nl', '/nl'), alt('de', '/de')] }),
      page('/nl', { hreflang: [alt('nl', '/nl')] }),
    ];
    const linkTargets = targets(target('/de', { status: 404, kinds: ['hreflang'] }));
    const rows = assertValidRows(await check({ facts, linkTargets }));
    assert.deepEqual(ids(rows), ['hreflang-no-return /nl -> /en', 'hreflang-non-200 /en -> /de']);
    const noReturn = rows.find((r) => r.taxonomyId === 'hreflang-no-return');
    assert.deepEqual(noReturn.evidence.related, [key('/en')]);
    assert.equal(rows.find((r) => r.taxonomyId === 'hreflang-non-200').evidence.value, 404);
  });

  it('passes reciprocal alternates and reports redirecting ones', async () => {
    const facts = [
      page('/en', { hreflang: [alt('en', '/en'), alt('nl', '/nl'), alt('fr', '/fr')] }),
      page('/nl', { hreflang: [alt('nl', '/nl'), alt('en', '/en')] }),
    ];
    const linkTargets = targets(target('/fr', { redirectChain: [{ url: key('/fr'), status: 301 }], finalUrl: key('/fr/') }));
    const rows = assertValidRows(await check({ facts, linkTargets }));
    assert.deepEqual(ids(rows), ['hreflang-non-200 /en -> /fr']);
    assert.equal(rows[0].evidence.status, 301);
  });
});
