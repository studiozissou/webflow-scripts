/**
 * compare.test.js — Old vs new entity signal regression detection
 *
 * Pure functions: two scored pages in, a list of regressions out.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { comparePage, compareSite, summarise } from '../../tools/entity-audit/lib/compare.js';

/** Build a scored-page object with sensible defaults. */
function scored(overrides = {}) {
  return {
    url: 'https://example.com/x',
    status: 200,
    title: 'Tamsen Fadal | Author',
    description: 'Tamsen Fadal is a journalist.',
    h1s: ['Tamsen Fadal'],
    titleHasEntity: true,
    h1HasEntity: true,
    descriptionHasEntity: true,
    footerHasEntity: true,
    entityMentions: 5,
    factualStatements: ['Tamsen Fadal is a journalist.'],
    jsonLdTypes: ['Person'],
    brandedInternalAnchors: [{ href: '/book', text: 'Tamsen Fadal book' }],
    outboundProfiles: [{ platform: 'instagram', href: 'https://instagram.com/x' }],
    signalScore: 10,
    ...overrides,
  };
}

describe('comparePage', () => {
  test('reports no regressions when signals are unchanged', () => {
    const r = comparePage({ slug: '/', old: scored(), current: scored() });
    assert.deepEqual(r.regressions, []);
    assert.equal(r.status, 'ok');
  });

  test('detects entity name lost from the H1', () => {
    const r = comparePage({
      slug: '/about',
      old: scored({ h1s: ['Tamsen Fadal'], h1HasEntity: true }),
      current: scored({ h1s: ["Hi! I'm Tamsen"], h1HasEntity: false }),
    });
    const kinds = r.regressions.map((x) => x.kind);
    assert.ok(kinds.includes('h1-entity-lost'), `expected h1-entity-lost, got ${kinds}`);
    assert.equal(r.status, 'regressed');
  });

  test('detects entity name lost from the title', () => {
    const r = comparePage({
      slug: '/podcast',
      old: scored({ titleHasEntity: true }),
      current: scored({ title: 'The Show', titleHasEntity: false }),
    });
    assert.ok(r.regressions.some((x) => x.kind === 'title-entity-lost'));
  });

  test('detects entity name lost from the meta description', () => {
    const r = comparePage({
      old: scored({ descriptionHasEntity: true }),
      current: scored({ description: 'Real talk.', descriptionHasEntity: false }),
    });
    assert.ok(r.regressions.some((x) => x.kind === 'description-entity-lost'));
  });

  test('detects loss of factual "X is a ..." statements', () => {
    const r = comparePage({
      old: scored({ factualStatements: ['Tamsen Fadal is a journalist.'] }),
      current: scored({ factualStatements: [] }),
    });
    const hit = r.regressions.find((x) => x.kind === 'factual-statements-lost');
    assert.ok(hit);
    assert.equal(hit.oldValue, 1);
    assert.equal(hit.newValue, 0);
  });

  test('detects a material drop in body entity mentions', () => {
    const r = comparePage({
      old: scored({ entityMentions: 10 }),
      current: scored({ entityMentions: 2 }),
    });
    assert.ok(r.regressions.some((x) => x.kind === 'entity-mentions-dropped'));
  });

  test('ignores a trivial drop in body entity mentions', () => {
    const r = comparePage({
      old: scored({ entityMentions: 10 }),
      current: scored({ entityMentions: 9 }),
    });
    assert.ok(!r.regressions.some((x) => x.kind === 'entity-mentions-dropped'));
  });

  test('detects footer entity language lost', () => {
    const r = comparePage({
      old: scored({ footerHasEntity: true }),
      current: scored({ footerHasEntity: false }),
    });
    assert.ok(r.regressions.some((x) => x.kind === 'footer-entity-lost'));
  });

  test('detects JSON-LD types lost', () => {
    const r = comparePage({
      old: scored({ jsonLdTypes: ['Person', 'WebSite'] }),
      current: scored({ jsonLdTypes: ['WebSite'] }),
    });
    const hit = r.regressions.find((x) => x.kind === 'jsonld-types-lost');
    assert.ok(hit);
    assert.deepEqual(hit.detail, ['Person']);
  });

  test('detects branded internal anchors lost', () => {
    const r = comparePage({
      old: scored({ brandedInternalAnchors: [{ href: '/a', text: 'Tamsen Fadal a' }, { href: '/b', text: 'Tamsen Fadal b' }] }),
      current: scored({ brandedInternalAnchors: [] }),
    });
    assert.ok(r.regressions.some((x) => x.kind === 'branded-anchors-lost'));
  });

  test('detects outbound profile links lost', () => {
    const r = comparePage({
      old: scored({ outboundProfiles: [{ platform: 'wikipedia', href: 'w' }, { platform: 'instagram', href: 'i' }] }),
      current: scored({ outboundProfiles: [{ platform: 'instagram', href: 'i' }] }),
    });
    const hit = r.regressions.find((x) => x.kind === 'profile-links-lost');
    assert.ok(hit);
    assert.deepEqual(hit.detail, ['wikipedia']);
  });

  test('records improvements as gains, not regressions', () => {
    const r = comparePage({
      old: scored({ h1HasEntity: false, h1s: ["Hi! I'm Tamsen"] }),
      current: scored({ h1HasEntity: true, h1s: ['Tamsen Fadal'] }),
    });
    assert.deepEqual(r.regressions, []);
    assert.ok(r.gains.some((x) => x.kind === 'h1-entity-gained'));
    assert.equal(r.status, 'improved');
  });

  test('marks a page unmapped when the old page is missing', () => {
    const r = comparePage({ slug: '/new-page', old: null, current: scored() });
    assert.equal(r.status, 'new');
    assert.deepEqual(r.regressions, []);
  });

  test('marks a page dropped when the new page is missing', () => {
    const r = comparePage({ slug: '/gone', old: scored(), current: null });
    assert.equal(r.status, 'dropped');
  });

  test('assigns higher severity to h1 and title losses than anchor losses', () => {
    const h1 = comparePage({ old: scored(), current: scored({ h1HasEntity: false }) });
    const anchors = comparePage({ old: scored(), current: scored({ brandedInternalAnchors: [] }) });
    const sev = (r, kind) => r.regressions.find((x) => x.kind === kind).severity;
    assert.equal(sev(h1, 'h1-entity-lost'), 'high');
    assert.equal(sev(anchors, 'branded-anchors-lost'), 'low');
  });
});

describe('compareSite', () => {
  test('compares every mapped pair and returns one result per pair', () => {
    const pairs = [
      { slug: '/', old: scored(), current: scored({ h1HasEntity: false }) },
      { slug: '/about', old: scored(), current: scored() },
    ];
    const results = compareSite(pairs);
    assert.equal(results.length, 2);
    assert.equal(results[0].status, 'regressed');
    assert.equal(results[1].status, 'ok');
  });
});

describe('summarise', () => {
  test('tallies pages and regressions by severity', () => {
    const results = compareSite([
      { slug: '/', old: scored(), current: scored({ h1HasEntity: false }) },
      { slug: '/a', old: scored(), current: scored({ brandedInternalAnchors: [] }) },
      { slug: '/b', old: scored(), current: scored() },
    ]);
    const s = summarise(results);
    assert.equal(s.pagesCompared, 3);
    assert.equal(s.pagesRegressed, 2);
    assert.equal(s.bySeverity.high, 1);
    assert.equal(s.bySeverity.low, 1);
  });

  test('groups regressions by kind for prioritisation', () => {
    const results = compareSite([
      { slug: '/', old: scored(), current: scored({ h1HasEntity: false }) },
      { slug: '/a', old: scored(), current: scored({ h1HasEntity: false }) },
    ]);
    const s = summarise(results);
    assert.equal(s.byKind['h1-entity-lost'], 2);
  });
});
