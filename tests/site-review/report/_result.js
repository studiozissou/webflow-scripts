// Builds a small pipeline result for the report tests from real findings, so the reports are tested on the shape the runner produces.

import { createFinding } from '../../../tools/site-review/lib/finding.js';
import { computeHealth } from '../../../tools/site-review/lib/health.js';
import { collapseFindings } from '../../../tools/site-review/lib/collapse.js';
import { summarise } from '../../../tools/site-review/lib/runner.js';

const O = 'https://example.com';
const at = '2026-11-06T00:00:00.000Z';
const ev = (value, extra = {}) => ({ value, source: 'raw', status: 200, finalUrl: `${O}/a`, selector: 'head > title', snippet: '<title>x</title>', fetchedAt: at, ...extra });
const entry = (id, severity, unit = 'page', extra = {}) => ({ id, label: id.replace(/-/g, ' '), category: 'seo', severity, check: 'x', facts: ['title'], semrushId: null, unit, priority: 1, statusDerived: false, ...extra });

export const TAXONOMY = [
  entry('title-missing', 'error', 'page', { semrushId: 3 }),
  entry('broken-internal-link', 'error', 'link', { semrushId: 8 }),
  entry('title-too-short', 'warning', 'page', { semrushId: 101 }),
  entry('page-fetch', 'notice', 'page', { scoreWeight: 0, check: null }),
  entry('hsts-missing', 'notice', 'page', { semrushId: 999, check: null }),
];
const byId = new Map(TAXONOMY.map((e) => [e.id, e]));

export function buildResult() {
  const facts = ['/a', '/b', '/c'].map((p) => ({ url: `${O}${p}`, urlKey: `${O}${p}`, fetchState: 'ok', status: 200, redirectChain: [] }));
  facts.push({ url: `${O}/d.pdf`, urlKey: `${O}/d.pdf`, fetchState: 'non_html', status: 200, redirectChain: [] });
  const f = (id, url, extra = {}, row = {}) => ({ ...createFinding({ taxonomyId: id, url: `${O}${url}`, urlKey: `${O}${url}`, state: 'fail', evidence: ev(null), ...row }, byId.get(id)), ...extra });
  const findings = [
    f('title-missing', '/a'),
    f('broken-internal-link', '/a', {}, { target: `${O}/gone`, targetKey: `${O}/gone`, evidence: ev(404, { status: 404, selector: 'a[href]', snippet: '<a href="/gone">click here</a>' }) }),
    f('broken-internal-link', '/b', {}, { target: `${O}/gone`, targetKey: `${O}/gone`, evidence: ev(404, { status: 404, selector: 'a[href]', snippet: '<a href="/gone">click here</a>' }) }),
    f('title-too-short', '/c', { severity: 'notice', scoreWeight: 0, tags: ['fixed-after-load'], excludedFromParity: true }),
    f('broken-internal-link', '/c', { transient: true, tags: ['transient'] }, { target: `${O}/flaky`, targetKey: `${O}/flaky`, evidence: ev(503, { status: 503 }) }),
    createFinding({ taxonomyId: 'page-fetch', url: `${O}/d.pdf`, urlKey: `${O}/d.pdf`, state: 'unknown', reason: 'non_html', evidence: ev('non_html') }, byId.get('page-fetch')),
  ];
  return {
    schemaVersion: 1,
    url: `${O}/`,
    client: 'example',
    mode: 'audit',
    facts,
    stats: { templates: { none: 3 }, hosts: { 'example.com': { requests: 6 } } },
    findings,
    rejected: [{ row: { taxonomyId: 'title-missing', url: `${O}/b` }, errors: ['evidence.snippet missing'] }],
    failedChecks: [],
    checksRun: ['titles', 'broken-links'],
    checksSkipped: ['code-review'],
    renderStats: { rendered: 3, escalated: [] },
    reverifyStats: { refetched: 2 },
    sanity: { abort: null, banners: [{ code: 'low_coverage', message: '3 of 4 sitemap URLs fetched.' }], suspect: [], coverage: { sitemapUrls: 4, fetched: 3, ratio: 0.75 } },
    health: computeHealth({ facts, findings }),
    collapsed: collapseFindings({ findings, facts }),
    snapshot: null,
    diff: null,
    summary: summarise(findings),
    taxonomy: TAXONOMY,
    timing: { crawl: 10, checks: {} },
  };
}
