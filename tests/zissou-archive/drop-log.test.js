import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildDropLogEntry,
} from '../../projects/zissou-archive/lib/price-drops.js';

// ─── buildDropLogEntry ────────────────────────────────────────────────

describe('buildDropLogEntry', () => {
  const base = {
    itemPageId: 'abc-123',
    itemName: 'Ralph Lauren Blazer',
    week: 3,
    previousPrice: 100,
    newPrice: 85,
    dropType: 'Scheduled',
    reason: 'Week 3 base drop (15%)',
  };

  it('formats title as "ItemName — Week N Drop"', () => {
    const entry = buildDropLogEntry(base);
    assert.equal(entry.title, 'Ralph Lauren Blazer — Week 3 Drop');
  });

  it('includes relation to inventory item', () => {
    const entry = buildDropLogEntry(base);
    assert.ok(entry.properties['Inventory Item']);
    const relation = entry.properties['Inventory Item'].relation;
    assert.equal(relation[0].id, 'abc-123');
  });

  it('includes previous and new price', () => {
    const entry = buildDropLogEntry(base);
    assert.equal(entry.properties['Previous Price'].number, 100);
    assert.equal(entry.properties['New Price'].number, 85);
  });

  it('includes drop type', () => {
    const entry = buildDropLogEntry(base);
    assert.equal(entry.properties['Drop Type'].select.name, 'Scheduled');
  });

  it('includes reason text', () => {
    const entry = buildDropLogEntry(base);
    const text = entry.properties['Reason'].rich_text[0].text.content;
    assert.ok(text.includes('Week 3'));
  });

  it('sets date to today', () => {
    const entry = buildDropLogEntry(base);
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(entry.properties['Date'].date.start.startsWith(today));
  });

  it('handles floor-hit drop type', () => {
    const entry = buildDropLogEntry({
      ...base,
      newPrice: 40,
      dropType: 'Floor Hit',
      reason: 'Price capped at floor (€40)',
    });
    assert.equal(entry.properties['Drop Type'].select.name, 'Floor Hit');
    assert.equal(entry.properties['New Price'].number, 40);
  });
});
