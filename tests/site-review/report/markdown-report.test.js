import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateMarkdownReport } from '../../../tools/site-review/lib/report/markdown-report.js';
import { createFinding } from '../../../tools/site-review/lib/finding.js';

const findings = [
  createFinding({
    check: 'meta-tags',
    severity: 'critical',
    category: 'seo',
    title: 'Missing title',
    description: 'No title tag found.',
    url: 'https://example.com/about',
    recommendation: 'Add a <title> tag.',
  }),
  createFinding({
    check: 'security-headers',
    severity: 'warning',
    category: 'security',
    title: 'Missing CSP',
    description: 'No Content-Security-Policy header.',
    url: 'https://example.com',
    element: 'HTTP headers',
    actual: 'not set',
    expected: 'Content-Security-Policy header present',
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
    total: 12345,
    checks: { 'meta-tags': 200, 'security-headers': 150, psi: 884 },
  },
};

const meta = {
  url: 'https://example.com',
  tier: 1,
  pagesAudited: 5,
  checksRun: 3,
};

describe('generateMarkdownReport', () => {
  it('contains site review heading with domain', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('# Site Review: example.com'));
  });

  it('contains summary table with severity counts', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('| Critical |'));
    assert.ok(md.includes('| Warning |'));
    assert.ok(md.includes('| Info |'));
    assert.ok(md.includes('| **Total** |'));
  });

  it('groups findings by severity with headings', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('## Critical Issues'));
    assert.ok(md.includes('## Warnings'));
    assert.ok(md.includes('## Informational'));
  });

  it('includes finding details', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('Missing title'));
    assert.ok(md.includes('No title tag found.'));
    assert.ok(md.includes('https://example.com/about'));
  });

  it('includes optional fields when present', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('Add a <title> tag.'));
    assert.ok(md.includes('HTTP headers'));
  });

  it('includes meta table with duration', () => {
    const md = generateMarkdownReport(results, meta);
    assert.ok(md.includes('12.3s'));
    assert.ok(md.includes('| Tier |'));
    assert.ok(md.includes('| Pages Audited |'));
  });

  it('omits severity sections with no findings', () => {
    const onlyCritical = {
      findings: [findings[0]],
      summary: { total: 1, critical: 1, warning: 0, info: 0, byCategory: { seo: 1 } },
      timing: { total: 100, checks: { 'meta-tags': 100 } },
    };
    const md = generateMarkdownReport(onlyCritical, meta);
    assert.ok(md.includes('## Critical Issues'));
    assert.ok(!md.includes('## Warnings'));
    assert.ok(!md.includes('## Informational'));
  });
});
