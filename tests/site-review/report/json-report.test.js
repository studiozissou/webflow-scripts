import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateJsonReport } from '../../../tools/site-review/lib/report/json-report.js';
import { createFinding } from '../../../tools/site-review/lib/finding.js';

const findings = [
  createFinding({
    check: 'meta-tags',
    severity: 'critical',
    category: 'seo',
    title: 'Missing title',
    description: 'No title tag found.',
    url: 'https://example.com',
  }),
  createFinding({
    check: 'security-headers',
    severity: 'warning',
    category: 'security',
    title: 'Missing CSP',
    description: 'No Content-Security-Policy header.',
    url: 'https://example.com',
  }),
  createFinding({
    check: 'psi',
    severity: 'info',
    category: 'performance',
    title: 'Good LCP',
    description: 'LCP is within range.',
  }),
];

const results = {
  findings,
  summary: {
    total: 3,
    critical: 1,
    warning: 1,
    info: 1,
    byCategory: { seo: 1, security: 1, performance: 1 },
  },
  timing: {
    total: 1234,
    checks: { 'meta-tags': 200, 'security-headers': 150, psi: 884 },
  },
};

const meta = {
  url: 'https://example.com',
  tier: 1,
  pagesAudited: 5,
  checksRun: 3,
};

describe('generateJsonReport', () => {
  it('returns valid JSON string', () => {
    const json = generateJsonReport(results, meta);
    assert.doesNotThrow(() => JSON.parse(json));
  });

  it('has correct meta fields', () => {
    const report = JSON.parse(generateJsonReport(results, meta));
    assert.equal(report.meta.url, 'https://example.com');
    assert.equal(report.meta.tier, 1);
    assert.equal(report.meta.pagesAudited, 5);
    assert.equal(report.meta.checksRun, 3);
    assert.equal(report.meta.duration, 1234);
  });

  it('generatedAt is a valid ISO date string', () => {
    const report = JSON.parse(generateJsonReport(results, meta));
    const date = new Date(report.meta.generatedAt);
    assert.ok(!isNaN(date.getTime()), 'generatedAt should be a valid date');
    assert.ok(report.meta.generatedAt.includes('T'), 'should be ISO format');
  });

  it('summary matches input', () => {
    const report = JSON.parse(generateJsonReport(results, meta));
    assert.deepEqual(report.summary, results.summary);
  });

  it('findings array matches input', () => {
    const report = JSON.parse(generateJsonReport(results, meta));
    assert.equal(report.findings.length, 3);
    assert.equal(report.findings[0].check, 'meta-tags');
  });
});
