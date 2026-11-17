import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/internal-links.js';
import { page, link, assertValidRows, ids } from './_helpers.js';

describe('internal-links check', () => {
  it('reports http internal links on https pages, nofollow internal links and links with no name', async () => {
    const facts = [page('/', {
      links: [
        link('http://example.com/about', { internal: true, hrefKey: 'http://example.com/about' }),
        link('/about', { rel: 'nofollow noopener' }),
        link('/services', { accessibleName: '' }),
        link('/services', { accessibleName: '' }),
        link('https://other.org/x', { rel: 'nofollow' }),
        link('https://other.org/y', { accessibleName: '' }),
      ],
    }), page('/about'), page('/services')];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map() }));
    assert.deepEqual(ids(rows).filter((id) => !id.startsWith('sitemap-orphan')), [
      'link-no-accessible-name / -> /services',
      'link-no-accessible-name / -> https://other.org/y',
      'links-to-http / -> http://example.com/about',
      'nofollow-internal-link / -> /about',
    ]);
  });

  it('reports sitemap pages no other page links to; self-links do not count', async () => {
    const facts = [
      page('/', { links: [link('/linked')] }), page('/linked', { links: [link('/')] }), page('/self', { links: [link('/self')] }),
      page('/gone', { status: 404 }),
    ];
    const rows = assertValidRows(await check({ facts, linkTargets: new Map() }));
    assert.deepEqual(ids(rows), ['sitemap-orphan /self']);
  });
});
