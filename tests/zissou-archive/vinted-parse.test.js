import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseCatalogHtml,
  parseAccessibilityLabel,
  detectChallenge,
} from '../../projects/zissou-archive/lib/vinted-parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'vinted-catalog.html'), 'utf8');

function pushScript(payload) {
  return `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
}

describe('parseCatalogHtml', () => {
  const items = parseCatalogHtml(FIXTURE, { domain: 'www.vinted.nl' });

  it('parses all 96 fixture items', () => {
    assert.equal(items.length, 96);
  });

  it('extracts price, total, url, brand, size, condition', () => {
    const first = items[0];
    assert.equal(first.id, 900000000);
    assert.equal(first.title, 'Synthetic Wool overcoat 0');
    assert.equal(first.url, 'https://www.vinted.nl/items/900000000-synthetic-wool-overcoat-0');
    assert.equal(first.price, 5);
    assert.equal(first.totalPrice, 5.95);
    assert.equal(first.currency, 'EUR');
    assert.equal(first.favourites, 0);
    assert.equal(first.brand, 'alderwick');
    assert.equal(first.size, 'S');
    assert.equal(first.condition, 'Nieuw met prijskaartje');
    assert.equal(first.isPromoted, false);
    assert.equal(first.isBusiness, false);
    assert.match(first.thumbnail, /^https:\/\/images\.example\.test\//);
  });

  it('every item has a numeric price and absolute url', () => {
    for (const item of items) {
      assert.equal(typeof item.price, 'number');
      assert.ok(Number.isFinite(item.price));
      assert.equal(typeof item.totalPrice, 'number');
      assert.match(item.url, /^https:\/\/www\.vinted\.nl\/items\//);
      assert.ok(item.condition);
    }
  });

  it('keeps titles with commas and newlines intact', () => {
    assert.equal(items[3].title, 'Synthetic coat, navy, made in England');
    assert.equal(items[3].brand, 'Dunmere');
    assert.equal(items[3].size, 'XL');
    assert.equal(items[4].title, 'Synthetic quilted jacket\nyellow - size 40');
    assert.equal(items[4].brand, 'Elstow');
    assert.equal(items[4].size, 'EU 50');
    assert.equal(items[4].condition, 'Veelgebruikt');
  });

  it('flags promoted and business items', () => {
    assert.equal(items[10].isPromoted, true);
    assert.equal(items[20].isBusiness, true);
  });

  it('returns null brand for $undefined and null size when Maat is missing', () => {
    assert.equal(items[10].brand, null);
    assert.equal(items[95].brand, 'H&M');
    assert.equal(items[95].size, null);
    assert.equal(items[95].condition, 'Nieuw met prijskaartje');
    assert.ok(items.filter((i) => i.brand === null).length > 0);
    assert.ok(items.filter((i) => i.size === null).length > 0);
  });

  it('reads FENWYK\'S brand as written', () => {
    assert.ok(items.some((i) => i.brand === "FENWYK'S"));
  });

  it('concatenates several push chunks', () => {
    const payload = JSON.stringify({
      items: {
        items: [
          {
            id: 1,
            productItem: {
              id: 1,
              title: 'Split [item] "one"',
              url: '/items/1-x',
              favouriteCount: 3,
              price: { amount: '10.00', currencyCode: 'EUR' },
              totalItemPrice: { amount: '11.20', currencyCode: 'EUR' },
              isPromoted: false,
              thumbnailUrl: 'https://images.example.test/1.webp',
              user: { isBusiness: false },
              itemBox: {
                firstLine: 'Corrow',
                secondLine: 'L · Goed',
                accessibilityLabel: 'Split [item] "one", Merk: Corrow, Staat: Goed, Maat: L, 10.00 €, 11.20 €',
              },
            },
          },
          { id: 2, catalogTracking: {} },
        ],
      },
    });
    const cut = Math.floor(payload.length / 2);
    const html = pushScript('0:' + payload.slice(0, cut)) + pushScript(payload.slice(cut));
    const parsed = parseCatalogHtml(html, { domain: 'www.vinted.fr' });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].title, 'Split [item] "one"');
    assert.equal(parsed[0].url, 'https://www.vinted.fr/items/1-x');
    assert.equal(parsed[0].favourites, 3);
  });

  it('falls back to itemBox lines when the label has no fields', () => {
    const payload = JSON.stringify({
      items: {
        items: [
          {
            id: 7,
            productItem: {
              id: 7,
              title: 'Plain',
              url: '/items/7-plain',
              favouriteCount: 0,
              price: { amount: '12.00', currencyCode: 'EUR' },
              totalItemPrice: { amount: '13.30', currencyCode: 'EUR' },
              isPromoted: false,
              user: { isBusiness: false },
              itemBox: { firstLine: 'Brackley', secondLine: 'M · Goed', accessibilityLabel: '' },
            },
          },
        ],
      },
    });
    const [item] = parseCatalogHtml(pushScript(payload), { domain: 'www.vinted.nl' });
    assert.equal(item.brand, 'Brackley');
    assert.equal(item.size, 'M');
    assert.equal(item.condition, 'Goed');
  });

  it('returns [] for unparseable html', () => {
    assert.deepEqual(parseCatalogHtml('<html><body>nothing</body></html>', { domain: 'www.vinted.nl' }), []);
    assert.deepEqual(parseCatalogHtml('', { domain: 'www.vinted.nl' }), []);
    assert.deepEqual(parseCatalogHtml(pushScript('"items":{"items":[{"id":1,'), { domain: 'www.vinted.nl' }), []);
    assert.deepEqual(parseCatalogHtml(undefined, { domain: 'www.vinted.nl' }), []);
  });
});

describe('parseAccessibilityLabel', () => {
  const cases = [
    ['nl', 'Jas, Merk: Alderwick, Staat: Heel goed, Maat: L, 20.00 €, 21.70 €', 'Heel goed'],
    ['en', 'Jas, Brand: Alderwick, Condition: Very good, Size: L, 20.00 €, 21.70 €', 'Very good'],
    ['fr', 'Jas, Marque: Alderwick, État: Très bon état, Taille: L, 20.00 €, 21.70 €', 'Très bon état'],
    ['de', 'Jas, Marke: Alderwick, Zustand: Sehr gut, Größe: L, 20.00 €, 21.70 €', 'Sehr gut'],
    ['it', 'Jas, Brand: Alderwick, Condizioni: Ottime, Taglia: L, 20.00 €, 21.70 €', 'Ottime'],
    ['es', 'Jas, Marca: Alderwick, Estado: Muy bueno, Talla: L, 20.00 €, 21.70 €', 'Muy bueno'],
    ['pt', 'Jas, Marca: Alderwick, Estado: Muito bom, Tamanho: L, 20.00 €, 21.70 €', 'Muito bom'],
  ];

  for (const [locale, label, condition] of cases) {
    it(`parses ${locale.toUpperCase()} labels`, () => {
      assert.deepEqual(parseAccessibilityLabel(label, locale), {
        title: 'Jas',
        brand: 'Alderwick',
        condition,
        size: 'L',
        price: 20,
        total: 21.7,
      });
    });
  }

  it('falls back to any locale when keys do not match the given locale', () => {
    const parsed = parseAccessibilityLabel('Veste, Marque: Brackley, État: Bon état, 30.00 €, 32.20 €', 'nl');
    assert.equal(parsed.brand, 'Brackley');
    assert.equal(parsed.condition, 'Bon état');
    assert.equal(parsed.size, null);
  });

  it('parses from the end so titles keep commas and newlines', () => {
    const parsed = parseAccessibilityLabel('Coat, wool, Brand new\nsize L, Staat: Goed, 220.00 €, 231.70 €');
    assert.equal(parsed.title, 'Coat, wool, Brand new\nsize L');
    assert.equal(parsed.brand, null);
    assert.equal(parsed.size, null);
    assert.equal(parsed.condition, 'Goed');
    assert.equal(parsed.price, 220);
    assert.equal(parsed.total, 231.7);
  });

  it('handles thousands separators in amounts', () => {
    const parsed = parseAccessibilityLabel('Coat, Merk: Corrow, Staat: Goed, Maat: 52, 1,250.00 €, 1,312.95 €');
    assert.equal(parsed.size, '52');
    assert.equal(parsed.price, 1250);
    assert.equal(parsed.total, 1312.95);
  });

  it('returns nulls for an empty label', () => {
    assert.deepEqual(parseAccessibilityLabel(''), {
      title: '',
      brand: null,
      condition: null,
      size: null,
      price: null,
      total: null,
    });
  });
});

describe('detectChallenge', () => {
  it('detects the cf-mitigated header', () => {
    assert.equal(detectChallenge({ status: 403, headers: { 'cf-mitigated': 'challenge' }, body: '' }), true);
    assert.equal(detectChallenge({ status: 200, headers: { 'CF-Mitigated': 'challenge' }, body: '' }), true);
  });

  it('detects the challenge body markers', () => {
    assert.equal(detectChallenge({ status: 403, headers: {}, body: '<script>window._cf_chl_opt={}</script>' }), true);
    assert.equal(detectChallenge({ status: 200, headers: {}, body: 'window._cf_chl_opt = {}' }), true);
    assert.equal(
      detectChallenge({ status: 403, headers: {}, body: '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate"></script>' }),
      true,
    );
  });

  it('ignores the passive challenge-platform script on a normal catalog page', () => {
    assert.equal(
      detectChallenge({
        status: 200,
        headers: {},
        body: '<script>self.__next_f.push([1,"x"])</script><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>',
      }),
      false,
    );
  });

  it('passes a normal page', () => {
    assert.equal(detectChallenge({ status: 200, headers: { 'cf-mitigated': null }, body: FIXTURE }), false);
    assert.equal(detectChallenge({ status: 200 }), false);
  });
});
