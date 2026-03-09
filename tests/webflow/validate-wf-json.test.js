import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateWfJson } from '../../scripts/webflow/validate-wf-json.js';

// --- Fixtures ---

const validMinimal = {
  type: '@webflow/XscpData',
  payload: {
    nodes: [
      {
        _id: 'c5189161-bbea-6043-8252-2345d0b3022f',
        tag: 'div',
        classes: [],
        children: [],
        type: 'Block',
        data: { tag: 'div', text: false },
      },
    ],
    styles: [],
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

const validWithStyle = {
  type: '@webflow/XscpData',
  payload: {
    nodes: [
      {
        _id: 'a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1',
        tag: 'section',
        classes: ['b2b2b2b2-b2b2-4b2b-b2b2-b2b2b2b2b2b2'],
        children: [],
        type: 'Section',
        data: { tag: 'section', text: false },
      },
    ],
    styles: [
      {
        _id: 'b2b2b2b2-b2b2-4b2b-b2b2-b2b2b2b2b2b2',
        fake: false,
        type: 'class',
        name: 'hero-section',
        namespace: '',
        comb: '',
        styleLess: 'display: flex; flex-direction: column;',
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

const validNested = {
  type: '@webflow/XscpData',
  payload: {
    nodes: [
      {
        _id: 'parent-001-0001-4001-8001-000000000001',
        tag: 'section',
        classes: [],
        children: ['child1-001-0001-4001-8001-000000000002'],
        type: 'Section',
        data: { tag: 'section', text: false },
      },
      {
        _id: 'child1-001-0001-4001-8001-000000000002',
        tag: 'h1',
        classes: [],
        children: ['text01-001-0001-4001-8001-000000000003'],
        type: 'Heading',
        data: { tag: 'h1', text: true },
      },
      {
        _id: 'text01-001-0001-4001-8001-000000000003',
        text: true,
        v: 'Hello World',
      },
    ],
    styles: [],
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

// Helper to deep clone
const clone = (obj) => JSON.parse(JSON.stringify(obj));

// --- Tests ---

describe('validateWfJson', () => {
  describe('valid payloads', () => {
    it('passes for valid minimal JSON', () => {
      const result = validateWfJson(validMinimal);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it('passes for valid JSON with a style', () => {
      const result = validateWfJson(validWithStyle);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it('passes for valid nested structure', () => {
      const result = validateWfJson(validNested);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it('passes longhand CSS', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess =
        'margin-top: 10px; margin-right: 0; margin-bottom: 10px; margin-left: 0;';
      const result = validateWfJson(data);
      assert.equal(result.valid, true);
    });
  });

  describe('type checks', () => {
    it('fails for missing type', () => {
      const data = clone(validMinimal);
      delete data.type;
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('type')));
    });

    it('fails for wrong type value', () => {
      const data = clone(validMinimal);
      data.type = '@webflow/SomethingElse';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });
  });

  describe('nodes array', () => {
    it('fails for empty nodes array', () => {
      const data = clone(validMinimal);
      data.payload.nodes = [];
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('nodes')));
    });

    it('fails for missing nodes', () => {
      const data = clone(validMinimal);
      delete data.payload.nodes;
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });
  });

  describe('orphan child UUID', () => {
    it('fails when child UUID references non-existent node', () => {
      const data = clone(validMinimal);
      data.payload.nodes[0].children = ['non-existent-uuid-0000-0000-000000000000'];
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('non-existent-uuid')));
    });
  });

  describe('orphan class UUID', () => {
    it('fails when class UUID has no matching style', () => {
      const data = clone(validMinimal);
      data.payload.nodes[0].classes = ['deadbeef-dead-4ead-beef-deadbeefbeef'];
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('deadbeef')));
    });

    it('passes when class UUID has a matching style entry', () => {
      const data = clone(validMinimal);
      const utilityStyleId = 'cf000000-0000-4000-8000-000000000001';
      data.payload.nodes[0].classes = [utilityStyleId];
      // Add the style with a Client First utility name but mark it as referencing
      // an existing project class (no styleLess needed)
      data.payload.styles = [
        {
          _id: utilityStyleId,
          fake: false,
          type: 'class',
          name: 'padding-global',
          namespace: '',
          comb: '',
          styleLess: '',
          variants: {},
          children: [],
          selector: null,
        },
      ];
      const result = validateWfJson(data);
      assert.equal(result.valid, true);
    });
  });

  describe('shorthand CSS detection', () => {
    it('fails for shorthand margin in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'margin: 10px;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('shorthand') || e.includes('margin')));
    });

    it('fails for shorthand padding in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'padding: 1rem 2rem;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand border in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'border: 1px solid #000;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand border-radius in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'border-radius: 8px;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand background in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'background: #fff url(bg.png) no-repeat;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand overflow in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'overflow: hidden;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand gap in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'gap: 1rem;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails for shorthand flex in styleLess', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'flex: 1 1 auto;';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('passes margin-top (not shorthand)', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'margin-top: 10px;';
      const result = validateWfJson(data);
      assert.equal(result.valid, true);
    });

    it('passes background-color (not shorthand)', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'background-color: #fff;';
      const result = validateWfJson(data);
      assert.equal(result.valid, true);
    });

    it('detects shorthand in variants too', () => {
      const data = clone(validWithStyle);
      data.payload.styles[0].styleLess = 'display: flex;';
      data.payload.styles[0].variants = {
        medium: { styleLess: 'padding: 1rem;' },
      };
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('medium')));
    });
  });

  describe('unknown node type', () => {
    it('fails for unknown type', () => {
      const data = clone(validMinimal);
      data.payload.nodes[0].type = 'FancyWidget';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('FancyWidget')));
    });

    it('passes text nodes (no type field)', () => {
      const result = validateWfJson(validNested);
      assert.equal(result.valid, true);
    });
  });

  describe('duplicate UUIDs', () => {
    it('fails when two nodes share the same _id', () => {
      const data = clone(validMinimal);
      data.payload.nodes.push({
        _id: data.payload.nodes[0]._id,
        tag: 'p',
        classes: [],
        children: [],
        type: 'Paragraph',
        data: { tag: 'p', text: true },
      });
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Duplicate')));
    });

    it('fails when node and style share the same _id', () => {
      const data = clone(validWithStyle);
      data.payload.nodes[0]._id = data.payload.styles[0]._id;
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Duplicate')));
    });
  });

  describe('payload structure', () => {
    it('fails when styles is not an array', () => {
      const data = clone(validMinimal);
      data.payload.styles = 'not an array';
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails when assets is not an array', () => {
      const data = clone(validMinimal);
      data.payload.assets = {};
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });

    it('fails when ix2 is missing', () => {
      const data = clone(validMinimal);
      delete data.payload.ix2;
      const result = validateWfJson(data);
      assert.equal(result.valid, false);
    });
  });
});
