// Unit tests for the Studio Zissou publish guard, one failing fixture per reason code plus an all-clear fixture.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canAutoPublish, MAX_AUTO, MIN_DAYS_BETWEEN } from '../../tools/studio-zissou/publish-guard.js';

const TODAY = '2026-11-16';

function clear() {
  return {
    site: { lastUpdated: '2026-11-09T08:00:00Z', lastPublished: '2026-11-09T08:05:00Z' },
    log: {
      changes: [
        { id: 'old', page: '/pricing', tier: 'auto', status: 'closed', date: '2026-09-01' },
        { id: 'r1', page: '/about', tier: 'review', status: 'approved', date: '2026-11-02' },
      ],
      activeExperiments: ['/'],
    },
    readBacks: [{ field: 'seoTitle', expected: 'A', actual: 'A' }],
    lint: { localeGuard: 0, linkLintContent: 0, linkLintSite: 0 },
    queue: [
      { id: 'q1', page: '/pricing', tier: 'auto' },
      { id: 'q2', page: '/services/webflow', tier: 'auto' },
    ],
    today: TODAY,
  };
}

function only(input, reason) {
  const result = canAutoPublish(input);
  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons, [reason]);
}

describe('constants', () => {
  test('MAX_AUTO is 5 and MIN_DAYS_BETWEEN is 28', () => {
    assert.equal(MAX_AUTO, 5);
    assert.equal(MIN_DAYS_BETWEEN, 28);
  });
});

describe('canAutoPublish', () => {
  test('all-clear fixture passes with no reasons', () => {
    assert.deepEqual(canAutoPublish(clear()), { ok: true, reasons: [] });
  });

  test('foreign-unpublished when lastUpdated is after lastPublished', () => {
    const input = clear();
    input.site.lastUpdated = '2026-11-10T09:00:00Z';
    only(input, 'foreign-unpublished');
  });

  test('foreign-unpublished when site timestamps are missing', () => {
    const input = clear();
    input.site = { lastUpdated: '2026-11-10T09:00:00Z', lastPublished: null };
    only(input, 'foreign-unpublished');
  });

  test('review-pending when a review row is pending', () => {
    const input = clear();
    input.log.changes.push({ id: 'r2', page: '/contact', tier: 'review', status: 'pending', date: '2026-11-16' });
    only(input, 'review-pending');
  });

  test('readback-mismatch when any read-back differs', () => {
    const input = clear();
    input.readBacks.push({ field: 'alt', expected: 'Studio Zissou team', actual: '' });
    only(input, 'readback-mismatch');
  });

  test('locale-guard-failed when the locale guard exits non-zero', () => {
    const input = clear();
    input.lint.localeGuard = 1;
    only(input, 'locale-guard-failed');
  });

  test('locale-guard-failed when the locale guard did not run', () => {
    const input = clear();
    delete input.lint.localeGuard;
    only(input, 'locale-guard-failed');
  });

  test('link-lint-failed when content mode fails', () => {
    const input = clear();
    input.lint.linkLintContent = 1;
    only(input, 'link-lint-failed');
  });

  test('link-lint-failed when site mode fails', () => {
    const input = clear();
    input.lint.linkLintSite = 2;
    only(input, 'link-lint-failed');
  });

  test('too-many-auto when more than 5 auto items are queued', () => {
    const input = clear();
    input.queue = Array.from({ length: 6 }, (_, i) => ({ id: `a${i}`, page: `/p${i}`, tier: 'auto' }));
    only(input, 'too-many-auto');
  });

  test('exactly 5 auto items is allowed', () => {
    const input = clear();
    input.queue = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, page: `/p${i}`, tier: 'auto' }));
    assert.equal(canAutoPublish(input).ok, true);
  });

  test('page-changed-recently when a queued page changed under 28 days ago', () => {
    const input = clear();
    input.log.changes.push({ id: 'x', page: '/pricing', tier: 'auto', status: 'open', date: '2026-10-20' });
    only(input, 'page-changed-recently');
  });

  test('a change exactly 28 days ago does not block', () => {
    const input = clear();
    input.log.changes.push({ id: 'x', page: '/pricing', tier: 'auto', status: 'open', date: '2026-10-19' });
    assert.equal(canAutoPublish(input).ok, true);
  });

  test('log rows for the queued items themselves do not block', () => {
    const input = clear();
    input.log.changes.push({ id: 'q1', page: '/pricing', tier: 'auto', status: 'open', date: TODAY });
    assert.equal(canAutoPublish(input).ok, true);
  });

  test('active-experiment when a queued page has an active experiment', () => {
    const input = clear();
    input.queue.push({ id: 'q3', page: '/', tier: 'auto' });
    only(input, 'active-experiment');
  });

  test('collects several reasons at once without duplicates', () => {
    const input = clear();
    input.lint = { localeGuard: 1, linkLintContent: 1, linkLintSite: 1 };
    input.readBacks = [{ expected: 'a', actual: 'b' }, { expected: 'c', actual: 'd' }];
    const result = canAutoPublish(input);
    assert.equal(result.ok, false);
    assert.deepEqual(result.reasons, ['readback-mismatch', 'locale-guard-failed', 'link-lint-failed']);
  });

  test('missing inputs fail safe rather than pass', () => {
    const result = canAutoPublish({ today: TODAY });
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes('foreign-unpublished'));
    assert.ok(result.reasons.includes('locale-guard-failed'));
    assert.ok(result.reasons.includes('link-lint-failed'));
    assert.ok(result.reasons.includes('missing-input'));
  });

  for (const field of ['queue', 'readBacks', 'today']) {
    test(`missing-input when ${field} is absent`, () => {
      const input = clear();
      delete input[field];
      assert.ok(canAutoPublish(input).reasons.includes('missing-input'));
    });
  }

  test('missing-input when log.changes is absent', () => {
    const input = clear();
    delete input.log.changes;
    only(input, 'missing-input');
  });

  test('missing-input when readBacks is empty', () => {
    const input = clear();
    input.readBacks = [];
    only(input, 'missing-input');
  });

  test('missing-input when queue is empty', () => {
    const input = clear();
    input.queue = [];
    only(input, 'missing-input');
  });

  test('readback-mismatch when actual is empty, even if expected is too', () => {
    const input = clear();
    input.readBacks = [{ field: 'jsonLdSchema', expected: undefined, actual: '' }];
    only(input, 'readback-mismatch');
  });

  test('JSON read-backs compare by value, not by key order or whitespace', () => {
    const input = clear();
    input.readBacks = [{ field: 'jsonLdSchema', expected: '{"@type":"Service","name":"Care"}', actual: '{ "name": "Care", "@type": "Service" }' }];
    assert.deepEqual(canAutoPublish(input), { ok: true, reasons: [] });
  });

  test('JSON read-backs with a different value mismatch', () => {
    const input = clear();
    input.readBacks = [{ field: 'jsonLdSchema', expected: '{"@type":"Service"}', actual: '{"@type":"Product"}' }];
    only(input, 'readback-mismatch');
  });
});
