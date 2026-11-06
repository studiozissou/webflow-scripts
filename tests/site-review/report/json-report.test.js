// Tests findings.json: every uncollapsed finding, health, coverage, tool bugs and parity.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildJsonReport, generateJsonReport } from '../../../tools/site-review/lib/report/json-report.js';
import { buildParity, withinTolerance } from '../../../tools/site-review/lib/report/parity.js';
import { buildResult, TAXONOMY } from './_result.js';

describe('json report', () => {
  const result = buildResult();

  it('is valid JSON with meta, coverage, health and every uncollapsed finding', () => {
    const report = JSON.parse(generateJsonReport(result, { generatedAt: new Date('2026-11-06T00:00:00Z') }));
    assert.equal(report.meta.generatedAt, '2026-11-06T00:00:00.000Z');
    assert.equal(report.meta.client, 'example');
    assert.equal(report.findings.length, result.findings.length);
    assert.equal(report.coverage.ratio, 0.75);
    assert.equal(report.health.score, result.health.score);
    assert.equal(report.toolBugs.length, 1);
  });

  it('parity counts exclude transient, unknown and fixed-after-load findings and give reasons', () => {
    const parity = buildParity({ findings: result.findings, taxonomy: TAXONOMY, semrushCounts: { date: '2026-11-01', counts: { 3: 1, 8: 9, 101: 1, 999: 4 } } });
    const row = (id) => parity.rows.find((r) => r.taxonomyId === id);
    assert.equal(row('title-missing').ours, 1);
    assert.equal(row('title-missing').withinTolerance, true);
    assert.equal(row('broken-internal-link').ours, 2);
    assert.equal(row('broken-internal-link').withinTolerance, false);
    assert.match(row('broken-internal-link').reasons.join(), /reason needed/);
    assert.equal(row('title-too-short').ours, 0);
    assert.match(row('title-too-short').reasons.join(), /fixed after load/);
    assert.equal(row('hsts-missing').ours, null);
    assert.match(row('hsts-missing').reasons.join(), /not covered/);
    assert.equal(buildJsonReport(result, { parity }).parity.rows.length, parity.rows.length);
  });

  it('withinTolerance uses max(10%, ±2)', () => {
    assert.ok(withinTolerance(30, 32));
    assert.ok(withinTolerance(100, 110));
    assert.ok(!withinTolerance(100, 112));
    assert.ok(!withinTolerance(1, 4));
  });

  it('parity is null without a counts file', () => {
    assert.equal(buildParity({ findings: [], taxonomy: TAXONOMY, semrushCounts: null }), null);
  });
});
