import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderReport } from '../../projects/zissou-archive/lib/vinted-report.js';

function flag(overrides = {}) {
  return {
    id: 1,
    title: 'Synthetic coat',
    url: 'https://www.vinted.nl/items/1-synthetic-coat',
    price: 20,
    totalPrice: 21.7,
    currency: 'EUR',
    favourites: 4,
    thumbnail: 'https://images.example.test/1.webp',
    brand: 'Alderwick',
    size: 'L',
    condition: 'Goed',
    reason: 'Alderwick ≤ €25 cap',
    cap: 25,
    queryId: 'band',
    ...overrides,
  };
}

describe('renderReport', () => {
  it('renders a standalone html document with each flag', () => {
    const html = renderReport({
      flags: [flag()],
      health: [],
      runAt: '2026-11-05T10:00:00.000Z',
      verdictUrl: '/verdict',
    });
    assert.match(html, /^<!DOCTYPE html>/);
    assert.ok(html.includes('Synthetic coat'));
    assert.ok(html.includes('Alderwick ≤ €25 cap'));
    assert.ok(html.includes('€21.70'));
    assert.ok(html.includes('❤ 4'));
    assert.ok(html.includes('src="https://images.example.test/1.webp"'));
    assert.ok(html.includes('href="https://www.vinted.nl/items/1-synthetic-coat"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes('tabindex="0"'));
    assert.ok(html.includes('aria-live="polite"'));
    assert.ok(html.includes('"/verdict"'));
  });

  it('escapes html in every text field', () => {
    const html = renderReport({
      flags: [
        flag({
          title: '<img src=x onerror=alert(1)>',
          brand: 'A & B "quoted"',
          size: '<b>L</b>',
          condition: '</script><script>alert(2)</script>',
          reason: '"<x>" (en) under €40',
          url: 'https://www.vinted.nl/items/1?a="b"',
        }),
      ],
      health: ['<challenge> detected'],
      runAt: '2026-11-05T10:00:00.000Z',
      verdictUrl: '/verdict',
    });
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('A &amp; B &quot;quoted&quot;'));
    assert.ok(html.includes('&lt;challenge&gt; detected'));
    assert.ok(!html.includes('</script><script>alert(2)'));
    assert.ok(!html.includes('?a="b"'));
  });

  it('sorts cheapest relative to cap first', () => {
    const html = renderReport({
      flags: [
        flag({ id: 1, title: 'Half cap', price: 20, cap: 40 }),
        flag({ id: 2, title: 'Near cap', price: 24, cap: 25 }),
        flag({ id: 3, title: 'Tenth cap', price: 4, cap: 40 }),
      ],
      health: [],
      runAt: '2026-11-05T10:00:00.000Z',
      verdictUrl: '/verdict',
    });
    const order = ['Tenth cap', 'Half cap', 'Near cap'].map((t) => html.indexOf(t));
    assert.ok(order.every((i) => i > 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
  });

  it('shows a health banner when there are warnings', () => {
    const html = renderReport({
      flags: [],
      health: ['Cloudflare challenge on band-40: run stopped'],
      runAt: '2026-11-05T10:00:00.000Z',
      verdictUrl: null,
    });
    assert.ok(html.includes('Cloudflare challenge on band-40: run stopped'));
    assert.ok(html.includes('class="health"'));
    assert.ok(html.includes('No new flags'));
  });

  it('omits the health banner when healthy', () => {
    const html = renderReport({ flags: [flag()], health: [], runAt: 'now', verdictUrl: '/verdict' });
    assert.ok(!html.includes('class="health"'));
  });
});
