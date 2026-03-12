import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { runChecks } from '../../tools/site-review/lib/runner.js';
import { createFinding } from '../../tools/site-review/lib/finding.js';
import { createLogger } from '../../tools/site-review/lib/logger.js';
import { loadConfig } from '../../tools/site-review/config.js';

// --- Mock check modules ---

const mockParallelA = {
  meta: { name: 'parallel-a', label: 'Parallel A', category: 'seo', tier: 1, parallel: true },
  async check() {
    return [
      createFinding({
        check: 'parallel-a',
        severity: 'critical',
        category: 'seo',
        title: 'Missing title',
        description: 'No title tag found.',
        url: 'https://example.com',
      }),
    ];
  },
};

const mockParallelB = {
  meta: { name: 'parallel-b', label: 'Parallel B', category: 'security', tier: 1, parallel: true },
  async check() {
    return [
      createFinding({
        check: 'parallel-b',
        severity: 'warning',
        category: 'security',
        title: 'Missing CSP',
        description: 'No Content-Security-Policy header.',
        url: 'https://example.com',
      }),
    ];
  },
};

const mockSequential = {
  meta: { name: 'sequential-a', label: 'Sequential A', category: 'performance', tier: 1, parallel: false },
  async check() {
    return [
      createFinding({
        check: 'sequential-a',
        severity: 'info',
        category: 'performance',
        title: 'Good LCP',
        description: 'LCP is within acceptable range.',
      }),
    ];
  },
};

const mockTier2 = {
  meta: { name: 'tier2-check', label: 'Tier 2 Check', category: 'seo', tier: 2, parallel: true },
  async check() {
    return [
      createFinding({
        check: 'tier2-check',
        severity: 'warning',
        category: 'seo',
        title: 'Tier 2 issue',
        description: 'Only found at tier 2.',
      }),
    ];
  },
};

const allMocks = [mockParallelA, mockParallelB, mockSequential, mockTier2];

function baseOpts(overrides = {}) {
  return {
    url: 'https://example.com',
    pages: ['https://example.com', 'https://example.com/about'],
    tier: 1,
    concurrency: 5,
    skip: [],
    config: loadConfig(),
    log: createLogger(false),
    checks: [mockParallelA, mockParallelB, mockSequential],
    ...overrides,
  };
}

describe('runChecks', () => {
  it('collects findings from all checks', async () => {
    const result = await runChecks(baseOpts());
    assert.equal(result.findings.length, 3);
  });

  it('returns correct summary counts', async () => {
    const result = await runChecks(baseOpts());
    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.critical, 1);
    assert.equal(result.summary.warning, 1);
    assert.equal(result.summary.info, 1);
  });

  it('returns correct byCategory counts', async () => {
    const result = await runChecks(baseOpts());
    assert.equal(result.summary.byCategory.seo, 1);
    assert.equal(result.summary.byCategory.security, 1);
    assert.equal(result.summary.byCategory.performance, 1);
  });

  it('filters out checks not matching tier', async () => {
    const result = await runChecks(baseOpts({ checks: allMocks, tier: 1 }));
    // tier2-check should be excluded
    assert.equal(result.findings.length, 3);
    assert.ok(!result.findings.some((f) => f.check === 'tier2-check'));
  });

  it('includes tier 2 checks when tier is 2', async () => {
    const result = await runChecks(baseOpts({ checks: allMocks, tier: 2 }));
    assert.equal(result.findings.length, 4);
    assert.ok(result.findings.some((f) => f.check === 'tier2-check'));
  });

  it('respects skip filter', async () => {
    const result = await runChecks(baseOpts({ skip: ['parallel-a'] }));
    assert.equal(result.findings.length, 2);
    assert.ok(!result.findings.some((f) => f.check === 'parallel-a'));
  });

  it('records timing for each check and total', async () => {
    const result = await runChecks(baseOpts());
    assert.ok(typeof result.timing.total === 'number');
    assert.ok(result.timing.total >= 0);
    assert.ok(typeof result.timing.checks['parallel-a'] === 'number');
    assert.ok(typeof result.timing.checks['parallel-b'] === 'number');
    assert.ok(typeof result.timing.checks['sequential-a'] === 'number');
  });

  it('parallel checks all complete', async () => {
    const result = await runChecks(baseOpts());
    const checkNames = result.findings.map((f) => f.check);
    assert.ok(checkNames.includes('parallel-a'));
    assert.ok(checkNames.includes('parallel-b'));
  });

  it('handles check that returns empty findings', async () => {
    const emptyCheck = {
      meta: { name: 'empty-check', label: 'Empty', category: 'seo', tier: 1, parallel: true },
      async check() { return []; },
    };
    const result = await runChecks(baseOpts({ checks: [emptyCheck] }));
    assert.equal(result.findings.length, 0);
    assert.equal(result.summary.total, 0);
  });

  it('handles check that throws an error gracefully', async () => {
    const errorCheck = {
      meta: { name: 'error-check', label: 'Error', category: 'seo', tier: 1, parallel: true },
      async check() { throw new Error('Check failed'); },
    };
    const result = await runChecks(baseOpts({ checks: [errorCheck] }));
    // Should still return a result, not throw
    assert.ok(Array.isArray(result.findings));
  });
});
