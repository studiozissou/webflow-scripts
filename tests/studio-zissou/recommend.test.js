// Unit tests for the Studio Zissou recommendation engine: tier table, scoring, signal mapping and per-run selection.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIERS,
  SIGNALS,
  tierFor,
  downgrade,
  applySkillTier,
  effortFor,
  impactFor,
  score,
  fromFindings,
  selectForRun,
} from '../../tools/studio-zissou/recommend.js';

const TODAY = '2026-11-16';
const CLI = fileURLToPath(new URL('../../tools/studio-zissou/recommend.js', import.meta.url));

const AUTO = ['meta-title', 'meta-description', 'alt', 'jsonld', 'faq', 'internal-link', 'revert', 'sitemap', 'noindex', 'freshness-date', 'review-count'];
const REVIEW = ['canonical', 'copy', 'h1', 'hero-copy', 'first-paragraph', 'price', 'cta-label', 'new-page', 'guide', 'slug', 'redirect', 'nav', 'footer', 'story-rotation', 'delete', 'disavow', 'form-field', 'file-name', 'audience-headline', 'body-refresh', 'nl-nonlocale', 'competitor-match'];
const REPORT = ['brand-share', 'cwv', 'backlinks', 'competitor', 'funnel', 'lead-quality', 'source-mix', 'time-to-convert', 'segment-gap', 'offline', 'seasonality', 'gbp', 'pricing-behaviour', 'form-leads', 'watch'];
const NEVER_AUTO = ['copy', 'h1', 'price', 'new-page', 'slug', 'nav', 'story-rotation', 'delete'];

const busy = { impressions: 800, sessions: 120 };

function typesFor(signal, extra = {}) {
  return fromFindings({ findings: [{ page: '/services/webflow', date: '2026-11-10', ...busy, ...signal }], today: TODAY, ...extra })
    .map((r) => `${r.type}:${r.tier}`);
}

describe('TIERS', () => {
  test('is frozen', () => {
    assert.ok(Object.isFrozen(TIERS));
    assert.throws(() => { 'use strict'; TIERS.copy = 'auto'; });
  });

  for (const type of AUTO) test(`${type} is auto`, () => assert.equal(tierFor(type), 'auto'));
  for (const type of REVIEW) test(`${type} is review`, () => assert.equal(tierFor(type), 'review'));
  for (const type of REPORT) test(`${type} is report`, () => assert.equal(tierFor(type), 'report'));

  test('has no types beyond the ADR-003 lists', () => {
    assert.deepEqual(Object.keys(TIERS).sort(), [...AUTO, ...REVIEW, ...REPORT].sort());
  });
});

describe('tierFor', () => {
  test('unknown type falls back to review', () => {
    assert.equal(tierFor('made-up'), 'review');
    assert.equal(tierFor(undefined), 'review');
    assert.equal(tierFor('__proto__'), 'review');
    assert.equal(tierFor('toString'), 'review');
  });

  test('risky types never resolve to auto through any path', () => {
    for (const type of NEVER_AUTO) {
      assert.notEqual(tierFor(type), 'auto', type);
      assert.notEqual(applySkillTier({ type, tier: 'review' }, 'auto').tier, 'auto', type);
      const mapped = fromFindings({
        findings: Object.keys(SIGNALS).map((t) => ({ type: t, page: '/x', ...busy, toxic: true, reviewCount: 4, step: 'form-start' })),
        today: TODAY,
      });
      for (const rec of mapped.filter((r) => r.type === type)) assert.notEqual(rec.tier, 'auto', type);
    }
  });
});

describe('downgrade and applySkillTier', () => {
  test('downgrade moves auto to review with a reason', () => {
    const out = downgrade({ type: 'alt', tier: 'auto' }, 'guard: foreign-unpublished');
    assert.equal(out.tier, 'review');
    assert.equal(out.downgraded, 'guard: foreign-unpublished');
  });

  test('downgrade leaves review and report items alone', () => {
    assert.equal(downgrade({ type: 'h1', tier: 'review' }, 'x').tier, 'review');
    assert.equal(downgrade({ type: 'cwv', tier: 'report' }, 'x').tier, 'report');
  });

  test('downgrade does not mutate the input', () => {
    const item = { type: 'alt', tier: 'auto' };
    downgrade(item, 'x');
    assert.equal(item.tier, 'auto');
  });

  test('skill may lower a tier', () => {
    assert.equal(applySkillTier({ type: 'alt', tier: 'auto' }, 'review').tier, 'review');
    assert.equal(applySkillTier({ type: 'h1', tier: 'review' }, 'report').tier, 'report');
  });

  test('skill cannot promote above tierFor', () => {
    assert.equal(applySkillTier({ type: 'h1', tier: 'review' }, 'auto').tier, 'review');
    assert.equal(applySkillTier({ type: 'cwv', tier: 'report' }, 'auto').tier, 'report');
    assert.equal(applySkillTier({ type: 'made-up', tier: 'review' }, 'auto').tier, 'review');
  });

  test('skill cannot undo a downgrade', () => {
    assert.equal(applySkillTier({ type: 'alt', tier: 'review', downgraded: 'x' }, 'auto').tier, 'review');
  });

  test('skill cannot set an invalid tier', () => {
    assert.equal(applySkillTier({ type: 'alt', tier: 'auto' }, 'publish').tier, 'auto');
  });
});

describe('effortFor', () => {
  test('cheap fixes are 1', () => {
    for (const type of ['meta-title', 'meta-description', 'alt', 'faq', 'internal-link', 'sitemap', 'freshness-date']) assert.equal(effortFor(type), 1, type);
  });
  test('h1 and first paragraph are 3', () => {
    assert.equal(effortFor('h1'), 3);
    assert.equal(effortFor('first-paragraph'), 3);
  });
  test('new guide or page is 5', () => {
    assert.equal(effortFor('guide'), 5);
    assert.equal(effortFor('new-page'), 5);
  });
  test('anything needing Will input is 5', () => {
    assert.equal(effortFor('alt', { needsInput: true }), 5);
    assert.equal(effortFor('price'), 5);
  });
  test('every TIERS type has an effort in 1 to 5', () => {
    for (const type of Object.keys(TIERS)) {
      const e = effortFor(type);
      assert.ok(Number.isInteger(e) && e >= 1 && e <= 5, type);
    }
  });
});

describe('impactFor and score', () => {
  test('stays within 1 to 5', () => {
    assert.equal(impactFor({}), 1);
    assert.equal(impactFor({ impressions: 1e6, sessions: 1e5, volume: 1e5, position: 12, page: '/pricing' }, { leadPages: ['/pricing'] }), 5);
  });
  test('more traffic scores higher', () => {
    assert.ok(impactFor({ impressions: 2000 }) > impactFor({ impressions: 60 }));
    assert.ok(impactFor({ sessions: 600 }) > impactFor({ sessions: 25 }));
  });
  test('head-term volume raises impact', () => {
    assert.ok(impactFor({ impressions: 60, volume: 1000 }) > impactFor({ impressions: 60 }));
  });
  test('position 11 to 15 scores higher than 40', () => {
    assert.ok(impactFor({ impressions: 60, position: 12 }) > impactFor({ impressions: 60, position: 40 }));
  });
  test('hub or lead page boosts impact', () => {
    const base = impactFor({ impressions: 60, page: '/x' });
    assert.equal(impactFor({ impressions: 60, page: '/x' }, { hubs: ['/x'] }), base + 1);
    assert.equal(impactFor({ impressions: 60, page: '/x' }, { leadPages: ['/x'] }), base + 1);
  });
  test('score is impact times six minus effort', () => {
    assert.equal(score(4, 1), 20);
    assert.equal(score(3, 3), 9);
    assert.equal(score(5, 5), 5);
  });
});

describe('fromFindings signal table', () => {
  const rows = [
    ['low-ctr', {}, ['meta-title:auto', 'meta-description:auto']],
    ['cannibalisation', {}, ['internal-link:auto', 'canonical:review']],
    ['question-query', { query: 'how long does it take' }, ['faq:auto']],
    ['position-drop', {}, ['h1:review', 'first-paragraph:review']],
    ['entered-top20', {}, ['internal-link:auto']],
    ['high-bounce', {}, ['hero-copy:review']],
    ['conversion-gap', {}, ['price:review', 'cta-label:review']],
    ['rotation-due', {}, ['story-rotation:review']],
    ['jsonld-missing', {}, ['jsonld:auto']],
    ['alt-missing', {}, ['alt:auto']],
    ['metric-fell', {}, ['revert:auto']],
    ['index-issue', { issue: 'sitemap-not-indexed' }, ['sitemap:auto']],
    ['index-issue', { issue: 'thin' }, ['noindex:auto', 'copy:review']],
    ['index-issue', { issue: 'canonical' }, ['canonical:review']],
    ['index-issue', { issue: 'soft-404' }, ['copy:review']],
    ['striking-distance', {}, ['meta-title:auto', 'internal-link:auto', 'h1:review', 'first-paragraph:review']],
    ['intent-mismatch', {}, ['guide:review']],
    ['brand-share', {}, ['brand-share:report']],
    ['cwv-regression', {}, ['cwv:report']],
    ['content-decay', {}, ['freshness-date:auto', 'faq:review', 'meta-description:auto', 'body-refresh:review']],
    ['media-no-clicks', {}, ['alt:auto', 'file-name:review']],
    ['backlinks', {}, ['backlinks:report']],
    ['backlinks', { toxic: true }, ['backlinks:report', 'disavow:review']],
    ['competitor-move', {}, ['competitor:report', 'competitor-match:review']],
    ['gbp', {}, ['gbp:report']],
    ['gbp', { reviewCount: 12 }, ['gbp:report', 'review-count:auto']],
    ['aeo-not-citable', {}, ['freshness-date:auto', 'faq:review', 'copy:review']],
    ['funnel-leak', { step: 'cta_click' }, ['funnel:report', 'cta-label:review']],
    ['funnel-leak', { step: 'form-start' }, ['funnel:report', 'form-field:review']],
    ['form-leads', {}, ['form-leads:report']],
    ['lead-quality', {}, ['lead-quality:report']],
    ['source-mix', {}, ['source-mix:report']],
    ['time-to-convert', {}, ['time-to-convert:report']],
    ['segment-gap', {}, ['segment-gap:report']],
    ['field-abandonment', {}, ['form-field:review']],
    ['pricing-behaviour', {}, ['pricing-behaviour:report', 'price:review']],
    ['audience-gap', {}, ['audience-headline:review']],
    ['offline', {}, ['offline:report']],
    ['seasonality', {}, ['seasonality:report']],
  ];

  for (const [type, extra, expected] of rows) {
    test(`${type} ${JSON.stringify(extra)} -> ${expected.join(', ')}`, () => {
      assert.deepEqual(typesFor({ type, ...extra }), expected);
    });
  }

  test('every SIGNALS key is covered by a row above', () => {
    const covered = new Set(rows.map(([t]) => t));
    for (const key of Object.keys(SIGNALS)) assert.ok(covered.has(key), key);
  });

  test('unknown signal becomes a report-tier watch item', () => {
    assert.deepEqual(typesFor({ type: 'something-new' }), ['watch:report']);
  });

  test('semrush and posthog inputs are merged, as arrays or { signals }', () => {
    const recs = fromFindings({
      findings: [],
      semrush: { signals: [{ type: 'entered-top20', page: '/a', impressions: 100 }] },
      posthog: [{ type: 'rotation-due', page: '/', sessions: 40 }],
      today: TODAY,
    });
    assert.deepEqual(recs.map((r) => [r.type, r.source]), [['internal-link', 'semrush'], ['story-rotation', 'posthog']]);
  });

  test('NL page auto items that are not 1:1 locale fields drop to review', () => {
    const recs = fromFindings({ findings: [{ type: 'entered-top20', page: '/nl/diensten', ...busy }], today: TODAY });
    assert.equal(recs[0].tier, 'review');
    assert.equal(recs[0].downgraded, 'nl-nonlocale');
    const meta = fromFindings({ findings: [{ type: 'low-ctr', page: '/nl/diensten', ...busy }], today: TODAY });
    assert.equal(meta[0].tier, 'auto');
  });
});

describe('fromFindings thresholds and fields', () => {
  test('under 20 sessions and under 50 impressions becomes watch with no change', () => {
    const recs = fromFindings({ findings: [{ type: 'low-ctr', page: '/a', impressions: 30, sessions: 5 }], today: TODAY });
    assert.equal(recs.length, 1);
    assert.equal(recs[0].type, 'watch');
    assert.equal(recs[0].tier, 'report');
    assert.equal(recs[0].signal, 'low-ctr');
    assert.equal(recs[0].after, null);
  });

  test('50 impressions alone is enough', () => {
    assert.deepEqual(typesFor({ type: 'question-query', query: 'what is webflow', impressions: 50, sessions: undefined }), ['faq:auto']);
  });

  test('20 sessions alone is enough', () => {
    assert.deepEqual(typesFor({ type: 'high-bounce', impressions: undefined, sessions: 20 }), ['hero-copy:review']);
  });

  test('signals without traffic numbers are not watched', () => {
    const recs = fromFindings({ findings: [{ type: 'alt-missing', page: '/a' }], today: TODAY });
    assert.equal(recs[0].type, 'alt');
  });

  test('each recommendation carries the required fields', () => {
    const [rec] = fromFindings({
      findings: [{ type: 'question-query', page: '/pricing', query: 'webflow kosten', impressions: 300, position: 12, date: '2026-11-09', before: null }],
      today: TODAY,
      leadPages: ['/pricing'],
    });
    for (const key of ['id', 'page', 'tier', 'impact', 'effort', 'score', 'selected', 'type', 'before', 'after', 'metric', 'threshold', 'reviewAt', 'signalDate']) {
      assert.ok(key in rec, key);
    }
    assert.equal(rec.reviewAt, '2026-12-14');
    assert.equal(rec.selected, false);
    assert.equal(rec.after, null);
    assert.equal(rec.signalDate, '2026-11-09');
    assert.equal(rec.score, rec.impact * (6 - rec.effort));
    assert.equal(typeof rec.metric, 'string');
    assert.equal(typeof rec.threshold, 'number');
  });

  test('ids are stable across runs and unique within one', () => {
    const findings = [{ type: 'low-ctr', page: '/a', ...busy }, { type: 'question-query', page: '/a', query: 'q1', ...busy }, { type: 'question-query', page: '/a', query: 'q2', ...busy }];
    const a = fromFindings({ findings, today: TODAY }).map((r) => r.id);
    const b = fromFindings({ findings, today: TODAY }).map((r) => r.id);
    assert.deepEqual(a, b);
    assert.equal(new Set(a).size, a.length);
  });

  test('report items have score 0 and no review date', () => {
    const [rec] = fromFindings({ findings: [{ type: 'cwv-regression', page: '/a' }], today: TODAY });
    assert.equal(rec.score, 0);
    assert.equal(rec.reviewAt, null);
  });

  test('missing signal date falls back to today', () => {
    const [rec] = fromFindings({ findings: [{ type: 'alt-missing', page: '/a' }], today: TODAY });
    assert.equal(rec.signalDate, TODAY);
  });
});

function rec(id, page, tier, scoreValue, extra = {}) {
  return { id, page, tier, type: tier === 'auto' ? 'alt' : 'h1', score: scoreValue, effort: 1, signalDate: '2026-11-10', selected: false, ...extra };
}

describe('selectForRun', () => {
  test('picks top 3 auto and top 2 review by score', () => {
    const recs = [
      rec('a1', '/1', 'auto', 20), rec('a2', '/2', 'auto', 15), rec('a3', '/3', 'auto', 10), rec('a4', '/4', 'auto', 5),
      rec('r1', '/5', 'review', 12), rec('r2', '/6', 'review', 9), rec('r3', '/7', 'review', 3),
      rec('x1', '/8', 'report', 0, { type: 'cwv' }),
    ];
    const out = selectForRun(recs);
    assert.deepEqual(out.filter((r) => r.selected).map((r) => r.id).sort(), ['a1', 'a2', 'a3', 'r1', 'r2']);
    assert.equal(out.length, recs.length);
    assert.equal(out.find((r) => r.id === 'x1').selected, false);
  });

  test('backlog is ranked by score', () => {
    const out = selectForRun([rec('a', '/1', 'auto', 2), rec('b', '/2', 'auto', 9), rec('c', '/3', 'review', 5)]);
    assert.deepEqual(out.map((r) => r.id), ['b', 'c', 'a']);
    assert.deepEqual(out.map((r) => r.rank), [1, 2, 3]);
  });

  test('more than 3 tied auto items go to the older signals', () => {
    const recs = [
      rec('new', '/1', 'auto', 20, { signalDate: '2026-11-14' }),
      rec('old', '/2', 'auto', 20, { signalDate: '2026-10-01' }),
      rec('mid', '/3', 'auto', 20, { signalDate: '2026-11-01' }),
      rec('older', '/4', 'auto', 20, { signalDate: '2026-10-15' }),
      rec('newest', '/5', 'auto', 20, { signalDate: '2026-11-15' }),
    ];
    const picked = selectForRun(recs).filter((r) => r.selected).map((r) => r.id);
    assert.deepEqual(picked, ['old', 'older', 'mid']);
  });

  test('one change per page per run', () => {
    const out = selectForRun([rec('a', '/1', 'auto', 20), rec('b', '/1', 'auto', 18), rec('c', '/1', 'review', 15), rec('d', '/2', 'auto', 1)]);
    assert.deepEqual(out.filter((r) => r.selected).map((r) => r.id), ['a', 'd']);
  });

  test('skips recently changed pages and pages with active experiments', () => {
    const out = selectForRun([rec('a', '/1', 'auto', 20), rec('b', '/2', 'auto', 18), rec('c', '/3', 'auto', 1)], {
      recentlyChanged: ['/1'],
      activeExperiments: [{ page: '/2' }],
    });
    assert.deepEqual(out.filter((r) => r.selected).map((r) => r.id), ['c']);
    assert.equal(out.find((r) => r.id === 'a').blocked, 'page-changed-recently');
    assert.equal(out.find((r) => r.id === 'b').blocked, 'active-experiment');
  });

  test('parked effort-5 review items are not re-proposed', () => {
    const out = selectForRun([rec('g', '/1', 'review', 25, { effort: 5 }), rec('h', '/2', 'review', 4)], { parked: ['g'] });
    assert.deepEqual(out.filter((r) => r.selected).map((r) => r.id), ['h']);
    assert.equal(out.find((r) => r.id === 'g').parked, true);
  });

  test('parked only applies to effort-5 review items', () => {
    const out = selectForRun([rec('g', '/1', 'review', 25, { effort: 3 })], { parked: ['g'] });
    assert.equal(out[0].selected, true);
  });

  test('auto target cannot exceed the guard cap of 5', () => {
    const recs = Array.from({ length: 8 }, (_, i) => rec(`a${i}`, `/${i}`, 'auto', 10));
    assert.equal(selectForRun(recs, { autoTarget: 8 }).filter((r) => r.selected).length, 5);
  });

  test('does not mutate the input', () => {
    const recs = [rec('a', '/1', 'auto', 20)];
    selectForRun(recs);
    assert.equal(recs[0].selected, false);
  });
});

describe('CLI', () => {
  test('--tiers prints the table', () => {
    const out = JSON.parse(execFileSync(process.execPath, [CLI, '--tiers'], { encoding: 'utf8' }));
    assert.deepEqual(out, { ...TIERS });
  });

  test('--report writes recommendations JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sz-rec-'));
    const report = join(dir, 'week.json');
    const semrush = join(dir, 'semrush.json');
    const posthog = join(dir, 'posthog.json');
    const out = join(dir, 'out.json');
    writeFileSync(report, JSON.stringify({ week: '2026-W47', findings: [{ type: 'low-ctr', page: '/a', impressions: 400 }] }));
    writeFileSync(semrush, JSON.stringify([{ type: 'position-drop', page: '/b', impressions: 400 }]));
    writeFileSync(posthog, JSON.stringify({ signals: [{ type: 'high-bounce', page: '/c', sessions: 40 }] }));
    execFileSync(process.execPath, [CLI, '--report', report, '--semrush', semrush, '--posthog', posthog, '--out', out]);
    const data = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(data.week, '2026-W47');
    assert.deepEqual(data.recommendations.map((r) => r.type).sort(), ['first-paragraph', 'h1', 'hero-copy', 'meta-description', 'meta-title']);
    assert.ok(data.recommendations.some((r) => r.selected));
  });

  test('missing --report exits non-zero', () => {
    assert.throws(() => execFileSync(process.execPath, [CLI], { stdio: 'pipe' }));
  });
});

describe('integration with report.js and the log', () => {
  test('pages from Search Console URLs become site paths', () => {
    const recs = fromFindings({
      findings: [
        { type: 'low-ctr', page: 'https://studiozissou.io/nl/prijzen/', ...busy },
        { type: 'low-ctr', page: 'https://studiozissou.io', ...busy },
      ],
      today: TODAY,
    });
    assert.deepEqual([...new Set(recs.map((r) => r.page))], ['/nl/prijzen', '/']);
  });

  test('an NL page given as a full URL is still treated as NL', () => {
    const recs = fromFindings({ findings: [{ type: 'striking-distance', page: 'https://studiozissou.io/nl/prijzen', ...busy }], today: TODAY });
    assert.equal(recs.find((r) => r.type === 'meta-title').tier, 'auto');
    assert.equal(recs.find((r) => r.type === 'internal-link').tier, 'review');
  });

  test('a cannibalisation item names the losing page and links to the winner', () => {
    const recs = fromFindings({
      findings: [{
        type: 'cannibalisation',
        query: 'webflow developer',
        winner: 'https://studiozissou.io/services/webflow-development',
        pages: [
          { page: 'https://studiozissou.io/services/webflow-development', impressions: 400, position: 6 },
          { page: 'https://studiozissou.io/for-agencies', impressions: 200, position: 14 },
        ],
        impressions: 600,
      }],
      today: TODAY,
    });
    const link = recs.find((r) => r.type === 'internal-link');
    assert.equal(link.page, '/for-agencies');
    assert.equal(link.target, '/services/webflow-development');
    assert.ok(recs.every((r) => r.page !== null));
  });

  test('an FAQ with no source query is review, not auto', () => {
    const recs = fromFindings({ findings: [{ type: 'content-decay', page: '/work', clicks: 20, priorClicks: 60, impressions: 900 }], today: TODAY });
    const faq = recs.find((r) => r.type === 'faq');
    assert.equal(faq.tier, 'review');
    assert.equal(faq.downgraded, 'faq-needs-query');
    assert.equal(recs.find((r) => r.type === 'freshness-date').tier, 'auto');
    const asked = fromFindings({ findings: [{ type: 'question-query', page: '/work', query: 'how long does a webflow site take', ...busy }], today: TODAY });
    assert.equal(asked.find((r) => r.type === 'faq').tier, 'auto');
  });

  test('index findings from report.js reach the auto sitemap and noindex paths', async () => {
    const { buildFindings } = await import('../../tools/studio-zissou/report.js');
    const findings = buildFindings({
      index: [
        { url: 'https://studiozissou.io/work', verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' },
        { url: 'https://studiozissou.io/about', verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' },
      ],
    });
    const types = fromFindings({ findings, today: TODAY }).filter((r) => r.tier === 'auto').map((r) => `${r.page}:${r.type}`);
    assert.ok(types.includes('/work:sitemap'));
    assert.ok(types.includes('/about:noindex'));
  });

  test('--log excludes pages changed in the last 28 days; --active excludes experiment pages', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-log-'));
    const report = join(dir, 'week.json');
    writeFileSync(report, JSON.stringify({
      week: '2026-W46',
      today: TODAY,
      findings: [
        { type: 'low-ctr', page: 'https://studiozissou.io/pricing', ...busy },
        { type: 'low-ctr', page: 'https://studiozissou.io/work', ...busy },
        { type: 'low-ctr', page: 'https://studiozissou.io/about', ...busy },
      ],
    }));
    const log = join(dir, 'log.md');
    writeFileSync(log, [
      '## Weeks', '', '| date | week | mode | autopilot | sessions | leads | clicks | impressions | changes | note |', '|---|---|---|---|---|---|---|---|---|---|', '',
      '## Changes', '', '| date | page | tier | type | before | after | commit | metric | threshold | review | status | id |', '|---|---|---|---|---|---|---|---|---|---|---|---|',
      '| 2026-11-02 | /pricing | auto | meta-title | a | b | abc | ctr | -20% | 2026-11-30 | open | x1 |',
      '| 2026-09-01 | /work | auto | meta-title | a | b | abc | ctr | -20% | 2026-09-29 | kept | x2 |',
      '',
    ].join('\n'));
    const out = join(dir, 'recs.json');
    execFileSync(process.execPath, [CLI, '--report', report, '--log', log, '--active', '/about', '--out', out]);
    const recs = JSON.parse(readFileSync(out, 'utf8')).recommendations;
    const selectedPages = new Set(recs.filter((r) => r.selected).map((r) => r.page));
    assert.ok(!selectedPages.has('/pricing'));
    assert.ok(!selectedPages.has('/about'));
    assert.ok(selectedPages.has('/work'));
    assert.equal(recs.find((r) => r.page === '/pricing' && r.blocked).blocked, 'page-changed-recently');
  });
});
