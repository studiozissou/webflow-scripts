import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  parseCritique,
  cleanPrice,
  nextProbe,
  critiquePrice,
  applyPriceCritique,
  buildCriticMessage,
} from '../../projects/zissou-archive/lib/price-critic.js';

const reply = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });

function buyerWithThreshold(threshold, ceiling = threshold - 1) {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (req) => {
        const price = Number(req.messages[0].content.at(-1).text.match(/Asking price: €(\d+(?:\.\d+)?)/)[1]);
        calls.push(price);
        const verdict = price >= threshold ? 'overpriced' : price >= threshold - 10 ? 'top_of_fair' : 'fair';
        return reply({ verdict, ceiling, reasoning: 'r', objections: ['slight cuff wear'] });
      },
    },
  };
}

const LISTING = { title: 'Barbour Bedale', fullText: 'desc', conditionRating: 8, vintedCondition: 'Very good', originalRetail: 350, retailEstimated: false };

describe('parseCritique', () => {
  it('parses plain and fenced JSON', () => {
    const plain = parseCritique(reply({ verdict: 'fair', ceiling: 90, reasoning: 'ok', objections: [] }));
    assert.equal(plain.ceiling, 90);
    const fenced = parseCritique({ content: [{ type: 'text', text: '```json\n{"verdict":"overpriced","ceiling":70}\n```' }] });
    assert.equal(fenced.verdict, 'overpriced');
    assert.deepEqual(fenced.objections, []);
  });

  it('rejects unknown verdicts and bad ceilings', () => {
    assert.throws(() => parseCritique(reply({ verdict: 'meh', ceiling: 50 })), /unknown verdict/);
    assert.throws(() => parseCritique(reply({ verdict: 'fair', ceiling: 'lots' })), /ceiling/);
    assert.throws(() => parseCritique({ content: [] }), /no text/);
  });
});

describe('cleanPrice', () => {
  it('rounds down within bands', () => {
    assert.equal(cleanPrice(27.9), 27);
    assert.equal(cleanPrice(119), 115);
    assert.equal(cleanPrice(150), 150);
    assert.equal(cleanPrice(199), 190);
    assert.equal(cleanPrice(0), 0);
  });
});

describe('nextProbe', () => {
  it('raises lo on acceptable verdict and probes the ceiling', () => {
    const s = nextProbe({ lo: null, hi: null }, 60, { verdict: 'fair', ceiling: 90 });
    assert.equal(s.lo, 60);
    assert.equal(s.probe, 90);
  });

  it('lowers hi on overpriced and bisects when ceiling is outside the bracket', () => {
    const s = nextProbe({ lo: 60, hi: null }, 100, { verdict: 'overpriced', ceiling: 55 });
    assert.equal(s.hi, 100);
    assert.equal(s.probe, 80);
  });

  it('steps up 25% when the buyer ceiling is not above the price and there is no hi', () => {
    const s = nextProbe({ lo: null, hi: null }, 80, { verdict: 'bargain', ceiling: 70 });
    assert.equal(s.probe, 100);
  });
});

describe('critiquePrice', () => {
  it('climbs to just under the overpriced threshold', async () => {
    const client = buyerWithThreshold(120, 140);
    const { price, rounds } = await critiquePrice(client, { photos: [], listing: LISTING, startPrice: 65 }, { model: 'm', maxRounds: 6, step: 5 });
    assert.ok(price < 120, `price ${price} should be under 120`);
    assert.ok(price >= 110, `price ${price} should be near the top`);
    assert.ok(rounds.length <= 6);
  });

  it('never returns a price the buyer called overpriced', async () => {
    for (const threshold of [37, 88, 121, 260]) {
      const client = buyerWithThreshold(threshold, threshold * 1.4);
      const { price, rounds } = await critiquePrice(client, { photos: [], listing: LISTING, startPrice: 50 }, { model: 'm', maxRounds: 4, step: 5 });
      const overpriced = rounds.filter((r) => r.verdict === 'overpriced').map((r) => r.price);
      assert.ok(price < threshold, `threshold ${threshold}: got ${price}`);
      overpriced.forEach((p) => assert.ok(price < p));
    }
  });

  it('drops below the start when every probe is overpriced', async () => {
    const client = buyerWithThreshold(40, 38);
    const { price } = await critiquePrice(client, { photos: [], listing: LISTING, startPrice: 80 }, { model: 'm', maxRounds: 4, step: 5 });
    assert.ok(price > 0 && price < 40, `got ${price}`);
  });
});

describe('applyPriceCritique', () => {
  const scan = () => ({
    title: 'Barbour Bedale',
    full_text: 'desc',
    vinted_condition: 'Very good',
    parsed_fields: { condition_rating: 8 },
    price: { amount: 60, floor_price: 30, original_retail: 350, original_retail_estimated: false, price_audit: 'Comps: 70-110' },
  });

  it('updates price, scales floor and appends the critique to the audit', async () => {
    const data = await applyPriceCritique(buyerWithThreshold(120, 140), scan(), [], { model: 'm', maxRounds: 5, step: 5 });
    assert.ok(data.price.amount > 60 && data.price.amount < 120);
    assert.ok(data.price.floor_price > 30 && data.price.floor_price <= data.price.amount);
    assert.match(data.price.price_audit, /^Comps: 70-110\n\nBuyer critique:\n1\. €60: fair/);
  });

  it('keeps the original price when the critic fails', async () => {
    const client = { messages: { create: async () => { throw new Error('boom'); } } };
    const data = await applyPriceCritique(client, scan(), [], { model: 'm' });
    assert.equal(data.price.amount, 60);
    assert.equal(data.price.floor_price, 30);
  });
});

describe('buildCriticMessage', () => {
  it('shows the buyer the photos, listing and asking price', () => {
    const msg = buildCriticMessage([{ url: 'https://x/1.jpg' }], LISTING, 95);
    assert.equal(msg.content[0].type, 'image');
    assert.match(msg.content.at(-1).text, /Asking price: €95/);
    assert.match(msg.content.at(-1).text, /Original retail: €350/);
  });
});
