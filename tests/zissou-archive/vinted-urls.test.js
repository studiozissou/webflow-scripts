import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildSearchUrl, planRun } from '../../projects/zissou-archive/lib/vinted-urls.js';

const config = {
  domain: 'www.vinted.nl',
  defaultCatalog: [5],
  brands: {
    alpha: { id: 111, cap: 25, aliases: ['alpha'] },
    beta: { id: 222, cap: 25, aliases: ['beta'] },
    gamma: { id: 333, cap: 40, aliases: ['gamma'] },
  },
};

function params(url) {
  const parsed = new URL(url);
  return parsed.searchParams;
}

describe('buildSearchUrl', () => {
  it('builds a brand-band url with several brand_ids[], price_to and the men\'s catalog', () => {
    const url = buildSearchUrl(
      { id: 'band', kind: 'brand-band', brands: ['alpha', 'beta'], price_to: 30, flagRule: 'brand' },
      config,
    );
    assert.ok(url.startsWith('https://www.vinted.nl/catalog?'));
    assert.ok(url.includes('brand_ids[]=111&brand_ids[]=222'));
    const p = params(url);
    assert.deepEqual(p.getAll('brand_ids[]'), ['111', '222']);
    assert.deepEqual(p.getAll('catalog[]'), ['5']);
    assert.equal(p.get('price_to'), '30');
    assert.equal(p.get('currency'), 'EUR');
    assert.equal(p.get('order'), 'newest_first');
    assert.equal(p.get('search_text'), null);
  });

  it('scopes text searches to men\'s by default', () => {
    const url = buildSearchUrl(
      { id: 'p', kind: 'phrase', search_text: "phrase d'essai", price_to: 40, flagRule: 'cap' },
      config,
    );
    const p = params(url);
    assert.equal(p.get('search_text'), "phrase d'essai");
    assert.deepEqual(p.getAll('catalog[]'), ['5']);
    assert.deepEqual(p.getAll('brand_ids[]'), []);
  });

  it('scopes untagged searches to men\'s and keeps brand_ids[]=1', () => {
    const url = buildSearchUrl(
      { id: 'u', kind: 'brand-untagged', search_text: 'alpha', brand_ids: [1], price_to: 25, flagRule: 'cap' },
      config,
    );
    const p = params(url);
    assert.deepEqual(p.getAll('brand_ids[]'), ['1']);
    assert.deepEqual(p.getAll('catalog[]'), ['5']);
  });

  it('uses a search\'s own narrower catalog', () => {
    const url = buildSearchUrl({ id: 's', kind: 'sweep-30', catalog: [2051], price_to: 30, flagRule: 'brand' }, config);
    assert.deepEqual(params(url).getAll('catalog[]'), ['2051']);
  });

  it('falls back to the men\'s catalog when config has no defaultCatalog', () => {
    const url = buildSearchUrl({ id: 'x', search_text: 'coat' }, { brands: {} });
    assert.deepEqual(params(url).getAll('catalog[]'), ['5']);
    assert.ok(url.startsWith('https://www.vinted.nl/catalog?'));
  });

  it('throws on an unknown brand key', () => {
    assert.throws(() => buildSearchUrl({ id: 'b', brands: ['nope'] }, config), /nope/);
  });
});

describe('planRun', () => {
  const list = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}` }));

  it('returns the whole list when it fits', () => {
    const plan = planRun(list, 0, 30);
    assert.equal(plan.searches.length, 7);
    assert.equal(plan.nextCursor, 0);
  });

  it('truncates to maxFetches', () => {
    const plan = planRun(list, 0, 3);
    assert.deepEqual(plan.searches.map((s) => s.id), ['s0', 's1', 's2']);
    assert.equal(plan.nextCursor, 3);
  });

  it('covers the full list across runs within maxFetches', () => {
    const covered = new Set();
    let cursor = 0;
    for (let run = 0; run < 3; run++) {
      const plan = planRun(list, cursor, 3);
      assert.ok(plan.searches.length <= 3);
      plan.searches.forEach((s) => covered.add(s.id));
      cursor = plan.nextCursor;
    }
    assert.equal(covered.size, 7);
  });

  it('wraps around from the cursor', () => {
    const plan = planRun(list, 6, 3);
    assert.deepEqual(plan.searches.map((s) => s.id), ['s6', 's0', 's1']);
    assert.equal(plan.nextCursor, 2);
  });

  it('tolerates a bad cursor', () => {
    assert.equal(planRun(list, 'x', 3).searches[0].id, 's0');
    assert.equal(planRun(list, 99, 3).searches[0].id, list[99 % 7].id);
  });
});
