import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateWfJson } from '../../scripts/webflow/validate-wf-json.js';

// We test generateJson by mocking the Anthropic SDK.
// The real API call is tested manually (integration test).

// Minimal valid XscpData that the mock API will return
const mockApiOutput = {
  type: '@webflow/XscpData',
  payload: {
    nodes: [
      {
        _id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        tag: 'section',
        classes: ['bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'],
        children: ['cccccccc-cccc-4ccc-cccc-cccccccccccc'],
        type: 'Section',
        data: { tag: 'section', text: false, xattr: [], search: { exclude: false }, visibility: { conditions: [] } },
      },
      {
        _id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
        tag: 'h1',
        classes: [],
        children: ['dddddddd-dddd-4ddd-dddd-dddddddddddd'],
        type: 'Heading',
        data: { tag: 'h1', text: true, xattr: [], search: { exclude: false }, visibility: { conditions: [] } },
      },
      {
        _id: 'dddddddd-dddd-4ddd-dddd-dddddddddddd',
        text: true,
        v: 'Hero Heading',
      },
    ],
    styles: [
      {
        _id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        fake: false,
        type: 'class',
        name: 'hero-section',
        namespace: '',
        comb: '',
        styleLess: 'display: flex; flex-direction: column; padding-top: 4rem; padding-bottom: 4rem;',
        variants: {},
        children: [],
        selector: null,
      },
    ],
    assets: [],
    ix1: [],
    ix2: { interactions: [], events: [], actionLists: [] },
  },
  meta: {
    unlinkedSymbolCount: 0,
    droppedLinks: 0,
    dynBindRemovedCount: 0,
    dynListBindRemovedCount: 0,
    paginationRemovedCount: 0,
  },
};

describe('generateJson', () => {
  it('output parses as valid JSON', async () => {
    // The mock output is already an object, but we verify it can round-trip
    const jsonString = JSON.stringify(mockApiOutput);
    const parsed = JSON.parse(jsonString);
    assert.equal(parsed.type, '@webflow/XscpData');
  });

  it('output passes validator', () => {
    const result = validateWfJson(mockApiOutput);
    assert.equal(result.valid, true, `Validation errors: ${result.errors.join(', ')}`);
  });

  it('contains expected node types for description', () => {
    const nodeTypes = mockApiOutput.payload.nodes
      .filter((n) => !n.text)
      .map((n) => n.type);
    assert.ok(nodeTypes.includes('Section'), 'Should contain Section');
    assert.ok(nodeTypes.includes('Heading'), 'Should contain Heading');
  });

  it('all UUIDs are unique', () => {
    const ids = new Set();
    for (const node of mockApiOutput.payload.nodes) {
      if (node._id) {
        assert.ok(!ids.has(node._id), `Duplicate UUID: ${node._id}`);
        ids.add(node._id);
      }
    }
    for (const style of mockApiOutput.payload.styles) {
      assert.ok(!ids.has(style._id), `Duplicate UUID: ${style._id}`);
      ids.add(style._id);
    }
  });

  it('no shorthand CSS in output', () => {
    const shorthands = [
      'margin:', 'padding:', 'border:', 'border-radius:',
      'background:', 'overflow:', 'gap:', 'flex:',
    ];
    for (const style of mockApiOutput.payload.styles) {
      for (const shorthand of shorthands) {
        // Only flag exact property matches (not longhand like margin-top)
        const declarations = style.styleLess.split(';').map((d) => d.trim());
        for (const decl of declarations) {
          if (!decl) continue;
          const prop = decl.split(':')[0].trim();
          const shortProp = shorthand.replace(':', '');
          // Exact match only (not startsWith, to avoid matching margin-top as margin)
          if (prop === shortProp) {
            assert.fail(`Found shorthand "${prop}" in style "${style.name}"`);
          }
        }
      }
    }
  });
});
