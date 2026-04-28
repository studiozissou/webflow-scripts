import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildScanMessage,
  parseScanResponse,
  mapToNotionProperties,
} from '../../projects/zissou-archive/lib/scanner.js';

// ─── fixtures ─────────────────────────────────────────────────────────

const VALID_CLAUDE_RESPONSE = {
  title: 'Ralph Lauren Polo — Navy Wool Blazer — Size 40R',
  price: {
    amount: 65,
    currency: 'EUR',
    justification: 'Comparable RL blazers sell for 50-80 on Vinted depending on condition.',
    original_retail: 350,
    original_retail_estimated: true,
    floor_price: 35,
  },
  full_text: 'A well-made navy blazer from Ralph Lauren Polo line.\n\nKey details:\n- Fabric: Wool blend, mid-weight\n- Cut & fit: Regular fit\n- Construction: Half-lined, two-button\n- Colour & pattern: Navy\n- Versatility: Three seasons\n\nCondition: 8/10\nMinor wear at cuffs.\n\nOriginal retail: ~€350 (estimated)\n\nMeasurements (flat, cm):\n- Chest: 52\n- Shoulders: 45\n- Length: 74\n- Sleeve: 63\n\nStyling notes:\nPairs well with chinos or dark denim.\n\n—\nFrom a trusted seller.\n\nKeywords: Ralph Lauren, blazer, wool, navy, smart casual',
  parsed_fields: {
    intro: 'A well-made navy blazer from Ralph Lauren Polo line.',
    fabric: 'Wool blend, mid-weight',
    cut_and_fit: 'Regular fit',
    construction: 'Half-lined, two-button',
    colour_and_pattern: 'Navy',
    notable_features: null,
    versatility: 'Three seasons',
    condition_rating: 8,
    condition_notes: 'Minor wear at cuffs.',
    original_retail_text: 'Original retail: ~€350 (estimated)',
    measurements: { chest: 52, shoulders: 45, length: 74, sleeve: 63, waist: null, inseam: null, rise: null },
    styling_notes: 'Pairs well with chinos or dark denim.',
  },
  vinted_condition: 'Very good',
  category: 'Men > Jackets > Blazers',
  brand: 'Ralph Lauren',
  size: '40R',
  colour: 'Navy',
  keywords: ['Ralph Lauren', 'blazer', 'wool', 'navy', 'smart casual'],
  photo_observations: [
    { photo_index: 0, observations: 'Front view, navy blazer on hanger', inferences: 'Two-button, notch lapel', confidence: 'high' },
  ],
  questions_for_seller: [],
};

const RESPONSE_WITH_QUESTIONS = {
  ...VALID_CLAUDE_RESPONSE,
  questions_for_seller: [
    'Can you confirm the size from the label?',
    'Any alterations done?',
  ],
};

// ─── buildScanMessage ─────────────────────────────────────────────────

describe('buildScanMessage', () => {
  it('returns a well-formed messages array with photo blocks', () => {
    const photos = [
      { url: 'https://example.com/photo1.jpg' },
      { url: 'https://example.com/photo2.jpg' },
    ];
    const notes = 'Ralph Lauren blazer, size 40R, bought at charity shop';

    const message = buildScanMessage(photos, notes);

    assert.equal(message.role, 'user');
    assert.ok(Array.isArray(message.content));

    // Should have image blocks for each photo + a text block
    const imageBlocks = message.content.filter((b) => b.type === 'image');
    const textBlocks = message.content.filter((b) => b.type === 'text');

    assert.equal(imageBlocks.length, 2);
    assert.equal(textBlocks.length, 1);

    // Image blocks should use URL source
    assert.equal(imageBlocks[0].source.type, 'url');
    assert.equal(imageBlocks[0].source.url, 'https://example.com/photo1.jpg');

    // Text block should include notes
    assert.ok(textBlocks[0].text.includes(notes));
    // Text block should request JSON
    assert.ok(textBlocks[0].text.toLowerCase().includes('json'));
  });

  it('handles empty notes', () => {
    const message = buildScanMessage([{ url: 'https://example.com/photo.jpg' }], '');
    const textBlock = message.content.find((b) => b.type === 'text');
    assert.ok(textBlock);
  });

  it('handles single photo', () => {
    const message = buildScanMessage([{ url: 'https://example.com/photo.jpg' }], 'test');
    const imageBlocks = message.content.filter((b) => b.type === 'image');
    assert.equal(imageBlocks.length, 1);
  });
});

// ─── parseScanResponse ────────────────────────────────────────────────

describe('parseScanResponse', () => {
  it('parses valid JSON response from Claude', () => {
    const mockResponse = {
      content: [{ type: 'text', text: JSON.stringify(VALID_CLAUDE_RESPONSE) }],
    };

    const result = parseScanResponse(mockResponse);
    assert.equal(result.title, VALID_CLAUDE_RESPONSE.title);
    assert.equal(result.price.amount, 65);
    assert.deepEqual(result.keywords, VALID_CLAUDE_RESPONSE.keywords);
  });

  it('handles JSON wrapped in markdown code fence', () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: '```json\n' + JSON.stringify(VALID_CLAUDE_RESPONSE) + '\n```',
      }],
    };

    const result = parseScanResponse(mockResponse);
    assert.equal(result.title, VALID_CLAUDE_RESPONSE.title);
  });

  it('throws on invalid JSON', () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'This is not JSON' }],
    };

    assert.throws(() => parseScanResponse(mockResponse), /parse/i);
  });

  it('throws on empty response', () => {
    const mockResponse = { content: [] };
    assert.throws(() => parseScanResponse(mockResponse));
  });

  it('validates full_text is within 2000 char limit', () => {
    const oversized = {
      ...VALID_CLAUDE_RESPONSE,
      full_text: 'x'.repeat(2001),
    };
    const mockResponse = {
      content: [{ type: 'text', text: JSON.stringify(oversized) }],
    };

    assert.throws(() => parseScanResponse(mockResponse), /2000/);
  });

  it('validates title is within 100 char limit', () => {
    const oversized = {
      ...VALID_CLAUDE_RESPONSE,
      title: 'x'.repeat(101),
    };
    const mockResponse = {
      content: [{ type: 'text', text: JSON.stringify(oversized) }],
    };

    assert.throws(() => parseScanResponse(mockResponse), /100/);
  });

  it('detects questions_for_seller as needs-info signal', () => {
    const mockResponse = {
      content: [{ type: 'text', text: JSON.stringify(RESPONSE_WITH_QUESTIONS) }],
    };

    const result = parseScanResponse(mockResponse);
    assert.ok(result.questions_for_seller.length > 0);
    assert.equal(result.needsInfo, true);
  });

  it('marks complete items as ready', () => {
    const mockResponse = {
      content: [{ type: 'text', text: JSON.stringify(VALID_CLAUDE_RESPONSE) }],
    };

    const result = parseScanResponse(mockResponse);
    assert.equal(result.questions_for_seller.length, 0);
    assert.equal(result.needsInfo, false);
  });
});

// ─── mapToNotionProperties ────────────────────────────────────────────

describe('mapToNotionProperties', () => {
  it('maps all required fields to Notion property format', () => {
    const props = mapToNotionProperties(VALID_CLAUDE_RESPONSE);

    // Name (page title) property
    assert.ok(props['Name']);
    assert.equal(props['Name'].title[0].text.content, VALID_CLAUDE_RESPONSE.title);

    // Title (rich text) property
    assert.ok(props['Title']);
    assert.equal(props['Title'].rich_text[0].text.content, VALID_CLAUDE_RESPONSE.title);

    // Number properties
    assert.equal(props['Suggested Price'].number, 65);
    assert.equal(props['Current Price'].number, 65);
    assert.equal(props['Floor Price'].number, 35);
    assert.equal(props['Original Retail'].number, 350);
    assert.equal(props['Condition Rating'].number, 8);

    // Checkbox
    assert.equal(props['Retail Estimated'].checkbox, true);

    // Select properties
    assert.equal(props['Condition'].select.name, 'Very good');
    assert.equal(props['Brand'].select.name, 'Ralph Lauren');
    assert.equal(props['Category'].select.name, 'Men > Jackets > Blazers');
    assert.equal(props['Size'].select.name, '40R');
    assert.equal(props['Colour'].multi_select[0].name, 'Navy');

    // Multi-select (keywords)
    assert.ok(Array.isArray(props['Keywords'].multi_select));
    assert.equal(props['Keywords'].multi_select.length, 5);
    assert.equal(props['Keywords'].multi_select[0].name, 'Ralph Lauren');

    // Rich text properties
    assert.ok(props['Full Description'].rich_text[0].text.content);
    assert.ok(props['Price Justification'].rich_text[0].text.content);
  });

  it('handles null brand gracefully', () => {
    const data = { ...VALID_CLAUDE_RESPONSE, brand: null };
    const props = mapToNotionProperties(data);
    // Should either omit or set to null
    assert.ok(!props['Brand'] || props['Brand'].select === null);
  });

  it('handles null size gracefully', () => {
    const data = { ...VALID_CLAUDE_RESPONSE, size: null };
    const props = mapToNotionProperties(data);
    assert.ok(!props['Size'] || props['Size'].select === null);
  });

  it('sets Current Price equal to Suggested Price on initial scan', () => {
    const props = mapToNotionProperties(VALID_CLAUDE_RESPONSE);
    assert.equal(props['Current Price'].number, props['Suggested Price'].number);
  });

  it('includes photo observations as rich text', () => {
    const props = mapToNotionProperties(VALID_CLAUDE_RESPONSE);
    assert.ok(props['Photo Observations']);
    const text = props['Photo Observations'].rich_text[0].text.content;
    assert.ok(text.includes('Front view'));
  });

  it('includes questions when present', () => {
    const props = mapToNotionProperties(RESPONSE_WITH_QUESTIONS);
    assert.ok(props['Questions']);
    const text = props['Questions'].rich_text[0].text.content;
    assert.ok(text.includes('confirm the size'));
  });

  it('sets Scan Date to current ISO date', () => {
    const props = mapToNotionProperties(VALID_CLAUDE_RESPONSE);
    assert.ok(props['Scan Date']);
    assert.ok(props['Scan Date'].date.start);
    // Should be today's date
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(props['Scan Date'].date.start.startsWith(today));
  });
});
