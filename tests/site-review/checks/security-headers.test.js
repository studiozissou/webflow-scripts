import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta } from '../../../tools/site-review/checks/security-headers.js';
import { page, site, assertValidRows, ids } from './_helpers.js';

describe('security-headers check', () => {
  it('reads headers.security on the root record only', async () => {
    const root = page('/');
    root.headers = { ...root.headers, security: { ...root.headers.security, strictTransportSecurity: null, permissionsPolicy: null } };
    const other = page('/about');
    other.headers = { ...other.headers, security: {} };
    const rows = assertValidRows(await check({ facts: [root, other], site: site() }));
    assert.deepEqual(ids(rows), ['hsts-missing /', 'permissions-policy-missing /']);
    assert.equal(rows[0].evidence.selector, 'header:strict-transport-security');
  });

  it('passes a root with every header and lists six IDs', async () => {
    assert.deepEqual(await check({ facts: [page('/')], site: site() }), []);
    assert.equal(meta.taxonomyIds.length, 6);
  });

  it('returns nothing when the root was not fetched', async () => {
    assert.deepEqual(await check({ facts: [page('/', { fetchState: 'timeout' })], site: site() }), []);
  });
});
