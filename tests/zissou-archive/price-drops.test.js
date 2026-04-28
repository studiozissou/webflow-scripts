import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calculateDrop,
  DROP_SCHEDULE,
} from '../../projects/zissou-archive/lib/price-drops.js';

// ─── DROP_SCHEDULE shape ──────────────────────────────────────────────

describe('DROP_SCHEDULE', () => {
  it('has entries for weeks 1–5', () => {
    for (let week = 1; week <= 5; week++) {
      assert.ok(DROP_SCHEDULE[week], `missing schedule for week ${week}`);
      assert.equal(typeof DROP_SCHEDULE[week].base, 'number');
      assert.equal(typeof DROP_SCHEDULE[week].aggressive, 'number');
    }
  });

  it('week 1 has 0% base drop', () => {
    assert.equal(DROP_SCHEDULE[1].base, 0);
  });

  it('drops increase over time', () => {
    assert.ok(DROP_SCHEDULE[3].base > DROP_SCHEDULE[2].base);
    assert.ok(DROP_SCHEDULE[4].base > DROP_SCHEDULE[3].base);
  });
});

// ─── calculateDrop ────────────────────────────────────────────────────

describe('calculateDrop', () => {
  const item = {
    suggestedPrice: 100,
    currentPrice: 100,
    floorPrice: 40,
    listedDate: null, // set per test
    dropSchedule: 'Active',
  };

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  it('returns no drop for week 1 (< 7 days listed)', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(3) });
    assert.equal(result.newPrice, 100);
    assert.equal(result.dropPercent, 0);
    assert.equal(result.week, 1);
    assert.equal(result.atFloor, false);
  });

  it('applies week 2 base drop (7–13 days)', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(10) });
    assert.equal(result.week, 2);
    assert.equal(result.dropPercent, DROP_SCHEDULE[2].base);
    assert.equal(result.newPrice, 90); // 100 * (1 - 10/100)
    assert.equal(result.atFloor, false);
  });

  it('applies week 3 base drop (14–20 days)', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(16) });
    assert.equal(result.week, 3);
    assert.equal(result.dropPercent, DROP_SCHEDULE[3].base);
    assert.equal(result.newPrice, 85); // 100 * (1 - 15/100)
  });

  it('applies week 4 base drop (21–27 days)', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(23) });
    assert.equal(result.week, 4);
    assert.equal(result.dropPercent, DROP_SCHEDULE[4].base);
    assert.equal(result.newPrice, 75); // 100 * (1 - 25/100)
  });

  it('applies week 5 base drop (28–34 days)', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(30) });
    assert.equal(result.week, 5);
    assert.equal(result.dropPercent, DROP_SCHEDULE[5].base);
    assert.equal(result.newPrice, 70); // 100 * (1 - 30/100)
  });

  it('caps at week 5 for items listed longer than 5 weeks', () => {
    const result = calculateDrop({ ...item, listedDate: daysAgo(50) });
    assert.equal(result.week, 5);
    assert.equal(result.dropPercent, DROP_SCHEDULE[5].base);
  });

  it('never drops below floor price', () => {
    const result = calculateDrop({
      ...item,
      suggestedPrice: 50,
      currentPrice: 50,
      floorPrice: 48,
      listedDate: daysAgo(23), // week 4 = 25% drop → 37.5, but floor is 48
    });
    assert.equal(result.newPrice, 48);
    assert.equal(result.atFloor, true);
  });

  it('sets atFloor when calculated price equals floor exactly', () => {
    const result = calculateDrop({
      ...item,
      suggestedPrice: 100,
      currentPrice: 100,
      floorPrice: 90,
      listedDate: daysAgo(10), // week 2 = 10% → 90 = floor
    });
    assert.equal(result.newPrice, 90);
    assert.equal(result.atFloor, true);
  });

  it('applies aggressive drop when mode is aggressive', () => {
    const result = calculateDrop({
      ...item,
      listedDate: daysAgo(10), // week 2
    }, { mode: 'aggressive' });
    assert.equal(result.dropPercent, DROP_SCHEDULE[2].aggressive);
    assert.equal(result.newPrice, 85); // 100 * (1 - 15/100)
  });

  it('calculates drop from suggestedPrice, not currentPrice', () => {
    const result = calculateDrop({
      ...item,
      suggestedPrice: 100,
      currentPrice: 80, // already dropped
      floorPrice: 40,
      listedDate: daysAgo(10), // week 2 = 10% of suggested
    });
    // Drop is from suggested (100), not current (80)
    assert.equal(result.newPrice, 90);
  });

  it('rounds prices to whole numbers', () => {
    const result = calculateDrop({
      ...item,
      suggestedPrice: 73,
      floorPrice: 30,
      listedDate: daysAgo(16), // week 3 = 15% → 73 * 0.85 = 62.05
    });
    assert.equal(result.newPrice, Math.round(73 * 0.85));
    assert.equal(result.newPrice % 1, 0);
  });

  it('skips items with paused drop schedule', () => {
    const result = calculateDrop({
      ...item,
      dropSchedule: 'Paused',
      listedDate: daysAgo(10),
    });
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'paused');
  });

  it('skips items with no listed date', () => {
    const result = calculateDrop({
      ...item,
      listedDate: null,
    });
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'no listed date');
  });
});
