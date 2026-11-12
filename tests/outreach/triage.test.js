// Covers the pure triage rules: one case per new-site+management, management and skip rule, the strong-GBP neither rule, ties to the bigger verdict, unknown GBP points, and evidence on every reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../../tools/outreach/triage.js';
import { NOW, deepFreeze } from './helpers.js';

const URL_ = 'https://trattoria-fittizia.test/';

const finding = (check, title, severity = 'critical') => ({ id: `${check}-0000`, check, severity, category: 'seo', title, description: title, url: URL_ });

const FACTS = {
  https: true, viewport: true, language: 'nl', title: 'Trattoria Fittizia | Italiaans', siteName: 'Trattoria Fittizia',
  email: 'ciao@trattoria-fittizia.test', phone: '+31705550123', postcode: '2599ZZ', copyrightYear: 2026, hasHours: true,
  menu: { present: true, pdfOnly: false }, hasBooking: true, schemaTypes: ['Restaurant'], hasLocalBusinessSchema: true,
};

function prospect(over = {}) {
  const site = {
    url: URL_, finalUrl: URL_, reachable: true, parked: false, statusCode: 200, errors: [], lab: null, findings: [],
    platform: { builder: 'webflow', version: null, badge: false, eol: false, builderSubdomain: false, signals: [] },
    ...over.site,
    facts: { ...FACTS, ...over.facts },
  };
  const gbp = {
    matched: true, status: 'matched', cid: '1234567890123456789', name: 'Trattoria Fittizia', closed: null, needsChromeCheck: false,
    websiteUrl: 'https://www.trattoria-fittizia.test/',
    score: { points: 9, max: 12, unknown: 0, display: '9/12', checks: { nap: true, website: true } },
    ranks: [
      { role: 'main', query: 'italiaans restaurant den haag', position: 6 },
      { role: 'area', query: 'italiaans restaurant zeeheldenkwartier', position: 2 },
      { role: 'nearby', query: 'italiaans restaurant in de buurt', position: '>20' },
    ],
    ...over.gbp,
  };
  return deepFreeze({
    domain: 'trattoria-fittizia.test', url: URL_, source: 'seed', type: 'Italian restaurant', status: 'New', chain: false,
    ...over.top, site: over.site === null ? null : site, gbp: over.gbp === null ? null : gbp,
  });
}

const run = (p) => triage(p, { now: NOW });
const ids = (r) => r.reasons.map((x) => x.id).sort();
const lowGbp = { score: { points: 6, max: 12, unknown: 0, display: '6/12', checks: { nap: true, website: true } } };
const notTop3 = { ranks: [{ role: 'main', query: 'a', position: 14 }, { role: 'area', query: 'b', position: 4 }, { role: 'nearby', query: 'c', position: '>20' }] };

test('a healthy prospect is neither with no reasons', () => {
  assert.deepEqual(run(prospect()), { verdict: 'neither', reasons: [] });
});

for (const [name, over, id] of [
  ['no HTTPS', { facts: { https: false } }, 'no-https'],
  ['no mobile viewport', { facts: { viewport: false } }, 'no-viewport'],
  ['WordPress below 6', { site: { platform: { builder: 'wordpress', version: '5.8.3', badge: false, eol: true, builderSubdomain: false, signals: [] } } }, 'builder-eol'],
  ['lab LCP over 4 s', { site: { lab: { lcpMs: 4500, totalBytes: 1_000_000 } } }, 'slow-lcp'],
  ['page weight over 6 MB', { site: { lab: { lcpMs: 1200, totalBytes: 6_500_000 } } }, 'heavy-page'],
  ['two soft reasons: badge + PDF-only menu', { site: { platform: { builder: 'jimdo', version: null, badge: true, eol: false, builderSubdomain: true, signals: [] } }, facts: { menu: { present: true, pdfOnly: true }, hasBooking: false } }, 'builder-badge'],
  ['two soft reasons: stale + badge', { site: { platform: { builder: 'jimdo', version: null, badge: true, eol: false, builderSubdomain: true, signals: [] } }, facts: { copyrightYear: 2024, hasHours: false, menu: { present: false, pdfOnly: false } } }, 'stale-and-no-hours'],
  ['unreachable site', { site: { reachable: false } }, 'unreachable'],
  ['parked domain', { site: { parked: true } }, 'unreachable'],
]) {
  test(`new-site+management: ${name}`, () => {
    const r = run(prospect(over));
    assert.equal(r.verdict, 'new-site+management');
    assert.ok(ids(r).includes(id), `expected ${id}, got ${ids(r)}`);
  });
}

const BADGE = { platform: { builder: 'jimdo', version: null, badge: true, eol: false, builderSubdomain: true, signals: [] } };

test('one soft new-site reason alone is not new-site+management', () => {
  for (const over of [
    { site: BADGE },
    { facts: { copyrightYear: 2024, hasHours: false, menu: { present: false, pdfOnly: false } } },
    { facts: { menu: { present: true, pdfOnly: true }, hasBooking: false } },
  ]) assert.notEqual(run(prospect(over)).verdict, 'new-site+management');
});

test('one soft reason plus one management reason is management', () => {
  const findings = [finding('meta-tags', 'Missing <title> tag')];
  const r = run(prospect({ site: { ...BADGE, findings } }));
  assert.equal(r.verdict, 'management');
  assert.deepEqual(ids(r), ['builder-badge', 'missing-title']);
});

test('no-schema is listed but does not count towards management', () => {
  const r = run(prospect({ facts: { hasLocalBusinessSchema: false, schemaTypes: [] }, site: { findings: [finding('broken-links', 'Broken link (404): https://trattoria-fittizia.test/oud')] } }));
  assert.equal(r.verdict, 'neither');
  assert.deepEqual(ids(r), ['broken-links', 'no-schema']);
});

test('new-site rules do not fire just below their thresholds', () => {
  assert.equal(run(prospect({ site: { lab: { lcpMs: 4000, totalBytes: 5_500_000 } } })).verdict, 'neither');
  assert.equal(run(prospect({ facts: { copyrightYear: 2025, hasHours: false, menu: { present: false, pdfOnly: false } } })).verdict, 'neither');
  assert.equal(run(prospect({ facts: { copyrightYear: 2024, hasHours: true, menu: { present: false, pdfOnly: false } } })).verdict, 'neither');
  assert.equal(run(prospect({ facts: { menu: { present: true, pdfOnly: true }, hasBooking: true } })).verdict, 'neither');
});

test('no PSI key means no lab data and the speed rules are skipped, never guessed', () => {
  const r = run(prospect({ site: { lab: null } }));
  assert.equal(r.reasons.some((x) => ['slow-lcp', 'heavy-page'].includes(x.id)), false);
});

for (const [name, a, b, expected] of [
  ['missing title + missing description', { site: { findings: [finding('meta-tags', 'Missing <title> tag'), finding('meta-tags', 'Missing meta description')] } }, {}, ['missing-description', 'missing-title']],
  ['missing title + broken homepage links', { site: { findings: [finding('meta-tags', 'Missing <title> tag'), finding('broken-links', 'Broken link (404): https://trattoria-fittizia.test/oud')] } }, {}, ['broken-links', 'missing-title']],
  ['GBP below 8/12 + not top 3 anywhere', { gbp: { ...lowGbp, ...notTop3 } }, {}, ['gbp-low-score', 'not-top3']],
  ['NAP mismatch + no website on GBP', { gbp: { websiteUrl: null, score: { points: 9, max: 12, unknown: 0, display: '9/12', checks: { nap: false, website: false } } } }, {}, ['gbp-no-website', 'nap-mismatch']],
]) {
  test(`management: ${name}`, () => {
    const r = run(prospect({ ...a, ...b }));
    assert.equal(r.verdict, 'management');
    assert.deepEqual(ids(r), expected);
  });
}

test('one management reason alone is neither', () => {
  assert.equal(run(prospect({ facts: { hasLocalBusinessSchema: false } })).verdict, 'neither');
});

test('only missing title and description count from meta-tags', () => {
  const findings = [finding('meta-tags', 'Missing meta description'), finding('meta-tags', 'Missing canonical link', 'warning'), finding('meta-tags', 'Title too short', 'warning'), finding('meta-tags', 'Missing og:image', 'info')];
  const r = run(prospect({ site: { findings } }));
  assert.equal(r.verdict, 'neither');
  assert.deepEqual(ids(r), ['missing-description']);
});

test('Cloudflare cdn-cgi paths and bare host roots (preconnect hints) are not broken links', () => {
  const noise = [
    { ...finding('broken-links', 'Broken link (404)'), element: 'https://trattoria-fittizia.test/cdn-cgi/l/email-protection' },
    { ...finding('broken-links', 'Broken link (404)'), element: 'https://assets.builder-cdn.test/' },
    { ...finding('broken-links', 'Broken link (404)'), element: 'https://trattoria-fittizia.test/cdn-cgi/scripts/abc/cloudflare-static/email-decode.min.js' },
  ];
  assert.equal(ids(run(prospect({ site: { findings: noise } }))).includes('broken-links'), false);
  const real = [...noise, { ...finding('broken-links', 'Broken link (404)'), element: 'https://trattoria-fittizia.test/menu-oud' }];
  const r = run(prospect({ site: { findings: real } }));
  const reasonRow = r.reasons.find((x) => x.id === 'broken-links');
  assert.deepEqual(reasonRow.evidence.value, ['https://trattoria-fittizia.test/menu-oud']);
});

test('broken-link timeouts (info) do not count as broken links', () => {
  const findings = [finding('broken-links', 'Timeout checking: https://ergens.test/', 'info')];
  const r = run(prospect({ site: { findings }, facts: { hasLocalBusinessSchema: false } }));
  assert.equal(r.verdict, 'neither');
});

test('GBP below 8 only counts when the unknown points could not lift it to 8', () => {
  const unknownTwo = { score: { points: 7, max: 10, unknown: 2, display: '7/10 (2 unknown)', checks: { nap: true, website: true, recentReview: 'unknown', replyRatio: 'unknown' } } };
  const r = run(prospect({ gbp: { ...unknownTwo, ...notTop3 } }));
  assert.equal(r.reasons.some((x) => x.id === 'gbp-low-score'), false);
  assert.equal(r.verdict, 'neither');
  const sure = { score: { points: 5, max: 10, unknown: 2, display: '5/10 (2 unknown)', checks: { nap: true, website: true } } };
  assert.equal(run(prospect({ gbp: { ...sure, ...notTop3 } })).verdict, 'management');
});

test('gbp-low-score counts unknown points as half', () => {
  const score = (points, unknown) => ({ score: { points, max: 12 - unknown, unknown, display: `${points}/${12 - unknown}`, checks: { nap: true, website: true } } });
  const low = (p, u) => run(prospect({ gbp: score(p, u) })).reasons.some((x) => x.id === 'gbp-low-score');
  assert.equal(low(6, 2), true);
  assert.equal(low(7, 2), false);
  assert.equal(low(6, 4), false);
  assert.equal(low(7, 1), true);
});

test('not-top3 needs outside top 3 for the area search AND outside top 10 for the main search', () => {
  const ranks = (main, area) => ({ ranks: [{ role: 'main', query: 'm', position: main }, { role: 'area', query: 'a', position: area }, { role: 'nearby', query: 'n', position: '>20' }] });
  const fires = (main, area) => run(prospect({ gbp: ranks(main, area) })).reasons.some((x) => x.id === 'not-top3');
  assert.equal(fires(11, 4), true);
  assert.equal(fires('>20', '>20'), true);
  assert.equal(fires(8, 5), false);
  assert.equal(fires(15, 2), false);
});

test('unknown NAP is not a mismatch', () => {
  const g = { websiteUrl: null, score: { points: 9, max: 12, unknown: 1, display: '9/11 (1 unknown)', checks: { nap: 'unknown', website: false } } };
  assert.deepEqual(ids(run(prospect({ gbp: g }))), ['gbp-no-website']);
});

test('unmatched GBP adds no GBP, NAP, website or rank reasons', () => {
  const unmatched = { matched: false, status: 'unmatched', cid: null, name: null, websiteUrl: null, needsChromeCheck: true, ranks: [], score: { points: 0, max: 0, unknown: 12, display: 'unmatched', checks: {} } };
  const r = run(prospect({ gbp: unmatched }));
  assert.equal(r.verdict, 'neither');
  assert.deepEqual(r.reasons, []);
});

test('strong GBP (10+/12, top 3 for 2+ searches) with one site issue is neither', () => {
  const strong = { score: { points: 11, max: 12, unknown: 0, display: '11/12', checks: { nap: true, website: true } }, ranks: [{ query: 'a', position: 1 }, { query: 'b', position: 3 }, { query: 'c', position: 8 }] };
  assert.equal(run(prospect({ gbp: strong, facts: { hasLocalBusinessSchema: false } })).verdict, 'neither');
});

test('ties go to the bigger verdict: strong GBP does not cancel 2 management reasons', () => {
  const strong = { score: { points: 11, max: 12, unknown: 0, display: '11/12', checks: { nap: true, website: true } }, ranks: [{ query: 'a', position: 1 }, { query: 'b', position: 3 }, { query: 'c', position: 8 }] };
  const findings = [finding('meta-tags', 'Missing <title> tag'), finding('meta-tags', 'Missing meta description')];
  assert.equal(run(prospect({ gbp: strong, site: { findings } })).verdict, 'management');
});

test('new-site and management reasons together give new-site+management with all reasons', () => {
  const r = run(prospect({ facts: { https: false, hasLocalBusinessSchema: false }, gbp: lowGbp }));
  assert.equal(r.verdict, 'new-site+management');
  assert.deepEqual(ids(r), ['gbp-low-score', 'no-https', 'no-schema']);
});

for (const [name, over, id] of [
  ['chain', { top: { chain: true }, facts: { https: false } }, 'chain'],
  ['permanently closed', { gbp: { closed: 'permanently' }, facts: { https: false } }, 'closed'],
  ['temporarily closed', { gbp: { closed: 'temporarily' } }, 'closed'],
  ['Do not contact', { top: { status: 'Do not contact' }, facts: { https: false } }, 'do-not-contact'],
  ['unreachable site and no GBP', { site: { reachable: false }, gbp: { matched: false, status: 'unmatched', ranks: [], websiteUrl: null, score: { points: 0, max: 0, unknown: 12, display: 'unmatched', checks: {} } } }, 'no-site-no-gbp'],
  ['parked site and no GBP', { site: { parked: true }, gbp: { matched: false, status: 'unmatched', ranks: [], websiteUrl: null, score: { points: 0, max: 0, unknown: 12, display: 'unmatched', checks: {} } } }, 'no-site-no-gbp'],
  ['no website and no GBP', { site: null, gbp: { matched: false, status: 'unmatched', ranks: [], websiteUrl: null, score: { points: 0, max: 0, unknown: 12, display: 'unmatched', checks: {} } } }, 'no-site-no-gbp'],
]) {
  test(`skip: ${name}`, () => {
    const r = run(prospect(over));
    assert.equal(r.verdict, 'skip');
    assert.deepEqual(ids(r), [id]);
  });
}

test('every reason carries evidence with url, value and check id', () => {
  const r = run(prospect({
    facts: { https: false, viewport: false, hasLocalBusinessSchema: false, copyrightYear: 2020, hasHours: false, menu: { present: false, pdfOnly: false } },
    site: { lab: { lcpMs: 6100, totalBytes: 9_000_000 }, findings: [finding('meta-tags', 'Missing <title> tag'), finding('broken-links', 'Broken link (404): https://trattoria-fittizia.test/x')] },
    gbp: { ...lowGbp, ...notTop3, websiteUrl: null },
  }));
  assert.ok(r.reasons.length >= 8);
  for (const reason of r.reasons) {
    assert.equal(typeof reason.id, 'string');
    assert.ok(reason.evidence, `${reason.id} has evidence`);
    assert.equal(typeof reason.evidence.check, 'string', `${reason.id} check id`);
    assert.ok(reason.evidence.check.length > 0);
    assert.ok('url' in reason.evidence && 'value' in reason.evidence, `${reason.id} url and value`);
  }
  const lcp = r.reasons.find((x) => x.id === 'slow-lcp');
  assert.deepEqual(lcp.evidence, { url: URL_, value: 6100, check: 'psi' });
  const title = r.reasons.find((x) => x.id === 'missing-title');
  assert.equal(title.evidence.check, 'meta-tags');
});

test('triage does not mutate its input', () => {
  const p = prospect({ facts: { https: false } });
  assert.doesNotThrow(() => run(p));
});
