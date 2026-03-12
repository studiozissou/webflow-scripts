import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createFinding, validateFinding } from '../../tools/site-review/lib/finding.js';
import { SEVERITIES, CATEGORIES } from '../../tools/site-review/config.js';

describe('createFinding', () => {
  const validInput = {
    check: 'meta-tags',
    severity: 'critical',
    category: 'seo',
    title: 'Missing meta description',
    description: 'The page has no meta description tag.',
    url: 'https://example.com',
  };

  it('returns an object with all required fields', () => {
    const f = createFinding(validInput);
    assert.equal(f.check, 'meta-tags');
    assert.equal(f.severity, 'critical');
    assert.equal(f.category, 'seo');
    assert.equal(f.title, 'Missing meta description');
    assert.equal(f.description, 'The page has no meta description tag.');
    assert.equal(f.url, 'https://example.com');
  });

  it('generates a deterministic id from check + title + url', () => {
    const a = createFinding(validInput);
    const b = createFinding(validInput);
    assert.equal(a.id, b.id);
    assert.ok(a.id.startsWith('meta-tags-'));
  });

  it('generates different ids for different inputs', () => {
    const a = createFinding(validInput);
    const b = createFinding({ ...validInput, title: 'Different title' });
    assert.notEqual(a.id, b.id);
  });

  it('handles missing optional url in hash gracefully', () => {
    const f = createFinding({
      check: 'psi',
      severity: 'warning',
      category: 'performance',
      title: 'Slow LCP',
      description: 'LCP exceeds threshold.',
    });
    assert.ok(f.id.startsWith('psi-'));
    assert.equal(f.url, undefined);
  });

  it('passes through optional fields', () => {
    const f = createFinding({
      ...validInput,
      element: 'head > meta[name="description"]',
      actual: null,
      expected: 'A description between 70 and 160 chars',
      recommendation: 'Add a meta description tag.',
      meta: { charCount: 0 },
    });
    assert.equal(f.element, 'head > meta[name="description"]');
    assert.equal(f.actual, null);
    assert.equal(f.expected, 'A description between 70 and 160 chars');
    assert.equal(f.recommendation, 'Add a meta description tag.');
    assert.deepEqual(f.meta, { charCount: 0 });
  });

  it('throws on missing required field: check', () => {
    assert.throws(
      () => createFinding({ ...validInput, check: undefined }),
      { message: /check is required/ },
    );
  });

  it('throws on missing required field: severity', () => {
    assert.throws(
      () => createFinding({ ...validInput, severity: undefined }),
      { message: /severity is required/ },
    );
  });

  it('throws on missing required field: category', () => {
    assert.throws(
      () => createFinding({ ...validInput, category: undefined }),
      { message: /category is required/ },
    );
  });

  it('throws on missing required field: title', () => {
    assert.throws(
      () => createFinding({ ...validInput, title: undefined }),
      { message: /title is required/ },
    );
  });

  it('throws on missing required field: description', () => {
    assert.throws(
      () => createFinding({ ...validInput, description: undefined }),
      { message: /description is required/ },
    );
  });

  it('throws on invalid severity value', () => {
    assert.throws(
      () => createFinding({ ...validInput, severity: 'urgent' }),
      { message: /Invalid severity/ },
    );
  });

  it('throws on invalid category value', () => {
    assert.throws(
      () => createFinding({ ...validInput, category: 'design' }),
      { message: /Invalid category/ },
    );
  });
});

describe('validateFinding', () => {
  it('returns { valid: true } for a well-formed finding', () => {
    const f = createFinding({
      check: 'psi',
      severity: 'warning',
      category: 'performance',
      title: 'High CLS',
      description: 'CLS score exceeds threshold.',
    });
    const result = validateFinding(f);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns errors for missing fields on a raw object', () => {
    const result = validateFinding({ id: 'test-abc', check: 'psi' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some((e) => /severity/.test(e)));
    assert.ok(result.errors.some((e) => /category/.test(e)));
    assert.ok(result.errors.some((e) => /title/.test(e)));
    assert.ok(result.errors.some((e) => /description/.test(e)));
  });

  it('returns error for invalid severity on raw object', () => {
    const result = validateFinding({
      id: 'x-1',
      check: 'psi',
      severity: 'urgent',
      category: 'performance',
      title: 'Test',
      description: 'Test desc',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /severity/.test(e)));
  });

  it('returns error for invalid category on raw object', () => {
    const result = validateFinding({
      id: 'x-1',
      check: 'psi',
      severity: 'info',
      category: 'design',
      title: 'Test',
      description: 'Test desc',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /category/.test(e)));
  });
});

describe('SEVERITIES and CATEGORIES', () => {
  it('SEVERITIES is frozen and contains expected values', () => {
    assert.ok(Object.isFrozen(SEVERITIES));
    assert.ok(SEVERITIES.includes('critical'));
    assert.ok(SEVERITIES.includes('warning'));
    assert.ok(SEVERITIES.includes('info'));
  });

  it('CATEGORIES is frozen and contains expected values', () => {
    assert.ok(Object.isFrozen(CATEGORIES));
    assert.ok(CATEGORIES.includes('performance'));
    assert.ok(CATEGORIES.includes('seo'));
    assert.ok(CATEGORIES.includes('accessibility'));
    assert.ok(CATEGORIES.includes('security'));
    assert.ok(CATEGORIES.includes('code-quality'));
  });
});
