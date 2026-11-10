import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normaliseBrand, matchTarget } from '../../projects/zissou-archive/lib/deal-filter.js';

const config = {
  brands: {
    alderwick: { id: 1, cap: 25, aliases: ['alderwick', 'alderwik'] },
    fenwyks: { id: 2, cap: 25, aliases: ['fenwyks', 'fenwyks menswear'] },
    brackley: { id: 3, cap: 40, aliases: ['brackley'] },
  },
};

function item(overrides = {}) {
  return { id: 1, title: 'Coat', brand: 'Alderwick', price: 20, isPromoted: false, isBusiness: false, ...overrides };
}

const band = { id: 'band', kind: 'brand-band', brands: ['alderwick', 'fenwyks'], price_to: 30, flagRule: 'brand' };
const sweep = { id: 'sweep', kind: 'sweep-30', catalog: [2051], price_to: 30, flagRule: 'brand' };
const phrase = { id: 'p', kind: 'phrase', lang: 'en', search_text: 'test phrase', price_to: 40, flagRule: 'cap' };

describe('normaliseBrand', () => {
  it('lowercases, strips accents and apostrophes, collapses whitespace', () => {
    assert.equal(normaliseBrand("FENWYK'S"), 'fenwyks');
    assert.equal(normaliseBrand('Fenwyk’s  Menswear'), 'fenwyks menswear');
    assert.equal(normaliseBrand('Fenwyk´s'), 'fenwyks');
    assert.equal(normaliseBrand('Fenwyk`s'), 'fenwyks');
    assert.equal(normaliseBrand('  Hermès '), 'hermes');
    assert.equal(normaliseBrand(null), '');
  });
});

describe('matchTarget', () => {
  it('flags a target brand under its cap', () => {
    const match = matchTarget(item(), band, config);
    assert.deepEqual(match, { reason: 'Alderwick ≤ €25 cap', cap: 25, brandKey: 'alderwick' });
  });

  it('flags at exactly the cap', () => {
    assert.ok(matchTarget(item({ price: 25 }), band, config));
  });

  it('ignores a target brand over its cap', () => {
    assert.equal(matchTarget(item({ price: 28 }), band, config), null);
  });

  it('matches aliases and prefixes followed by a space', () => {
    assert.equal(matchTarget(item({ brand: "FENWYK'S" }), band, config).brandKey, 'fenwyks');
    assert.equal(matchTarget(item({ brand: 'Alderwick London' }), band, config).brandKey, 'alderwick');
    assert.equal(matchTarget(item({ brand: 'Alderwickow' }), band, config), null);
  });

  it('rejects padded non-target brands in brand-band results', () => {
    assert.equal(matchTarget(item({ brand: 'Zara', price: 5 }), band, config), null);
    assert.equal(matchTarget(item({ brand: 'Brackley', price: 5 }), band, config), null);
    assert.equal(matchTarget(item({ brand: null, price: 5 }), band, config), null);
  });

  it('checks every target brand on non-band brand searches', () => {
    assert.equal(matchTarget(item({ brand: 'Brackley', price: 35 }), sweep, config).brandKey, 'brackley');
  });

  it('ignores promoted and business items', () => {
    assert.equal(matchTarget(item({ isPromoted: true }), band, config), null);
    assert.equal(matchTarget(item({ isBusiness: true }), band, config), null);
    assert.equal(matchTarget(item({ isPromoted: true, price: 1 }), phrase, config), null);
  });

  it('cap rule flags any item under the search price_to', () => {
    const match = matchTarget(item({ brand: 'Zara', price: 39 }), phrase, config);
    assert.deepEqual(match, { reason: '"test phrase" (en) under €40', cap: 40 });
    assert.equal(matchTarget(item({ price: 41 }), phrase, config), null);
  });

  it('cap rule without a language omits it from the reason', () => {
    const material = { id: 'm', kind: 'material', search_text: 'test fibre', price_to: 35, flagRule: 'cap' };
    assert.equal(matchTarget(item({ price: 30 }), material, config).reason, '"test fibre" under €35');
  });

  it('none rule never flags', () => {
    assert.equal(matchTarget(item({ price: 1 }), { ...phrase, flagRule: 'none' }, config), null);
  });

  it('ignores items without a numeric price', () => {
    assert.equal(matchTarget(item({ price: null }), phrase, config), null);
  });
});

describe('matchTarget exclusions', () => {
  const excl = {
    ...config,
    excludeBrands: ['quickwear', 'bargain & co'],
    junkTitleWords: ['replica', 'chinamist', 'betruger', 'dupe'],
  };
  const material = { id: 'm', kind: 'material', search_text: 'fine cloth', price_to: 40, flagRule: 'cap', excludeBrands: ['fine cloth'] };

  it('never flags a globally excluded brand on cap searches', () => {
    assert.equal(matchTarget(item({ brand: 'QuickWear' }), phrase, excl), null);
    assert.equal(matchTarget(item({ brand: 'Quickwear Man' }), phrase, excl), null);
    assert.equal(matchTarget(item({ brand: 'Bargain & Co' }), phrase, excl), null);
  });

  it('still flags a brand that only shares a prefix with an excluded brand', () => {
    assert.ok(matchTarget(item({ brand: 'Quickwearing' }), phrase, excl));
  });

  it('applies per-search excludeBrands on top of the global list', () => {
    assert.equal(matchTarget(item({ brand: 'Fine Cloth' }), material, excl), null);
    assert.ok(matchTarget(item({ brand: 'Fine Cloth' }), phrase, excl));
    assert.ok(matchTarget(item({ brand: 'Other Maker' }), material, excl));
  });

  it('drops items whose title contains a junk word, whole word and accent-insensitive', () => {
    assert.equal(matchTarget(item({ title: 'Wool coat REPLICA' }), phrase, excl), null);
    assert.equal(matchTarget(item({ title: 'Billigster Chinamist von Betrügerbanden!!' }), phrase, excl), null);
    assert.equal(matchTarget(item({ title: 'Betrüger coat' }), phrase, excl), null);
    assert.ok(matchTarget(item({ title: 'Replicated pattern coat' }), phrase, excl));
  });

  it('applies exclusions to brand-rule searches too', () => {
    assert.equal(matchTarget(item({ title: 'Alderwick dupe jacket' }), band, excl), null);
  });

  it('flags as before when no exclusion lists are configured', () => {
    assert.ok(matchTarget(item({ brand: 'QuickWear' }), phrase, config));
  });
});
