import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { collapseFindings } from '../../tools/site-review/lib/collapse.js';
import { computeHealth } from '../../tools/site-review/lib/health.js';

const ORIGIN = 'https://example.com';
const fact = (i) => ({ url: `${ORIGIN}/p${i}`, urlKey: `${ORIGIN}/p${i}`, fetchState: 'ok' });
const fail = (taxonomyId, i, { targetKey, snippet = '', scoreWeight = 0.5, transient = false } = {}) => ({
  id: `${taxonomyId}-${i}-${targetKey ?? ''}`,
  taxonomyId,
  state: 'fail',
  url: `${ORIGIN}/p${i}`,
  urlKey: `${ORIGIN}/p${i}`,
  ...(targetKey ? { target: targetKey, targetKey } : {}),
  scoreWeight,
  transient,
  evidence: { snippet },
});

describe('collapse', () => {
  it('collapse: findings sharing a target or snippet group into one report row with a page count; counts for scoring are unchanged', () => {
    const facts = Array.from({ length: 10 }, (_, i) => fact(i));
    const findings = [
      ...[0, 1, 2, 3].map((i) => fail('broken-internal-link', i, { targetKey: `${ORIGIN}/missing`, scoreWeight: 1 })),
      fail('broken-internal-link', 5, { targetKey: `${ORIGIN}/elsewhere`, scoreWeight: 1 }),
      ...[4, 5, 6].map((i) => fail('link-no-accessible-name', i, { snippet: '<a href="/x">click here</a>', scoreWeight: 0 })),
      fail('link-no-accessible-name', 7, { snippet: '<a href="/y"></a>', scoreWeight: 0 }),
      ...Array.from({ length: 10 }, (_, i) => fail('description-missing', i)),
      fail('http-4xx', 8, { transient: true, targetKey: `${ORIGIN}/t` }),
      fail('http-4xx', 9, { transient: true, targetKey: `${ORIGIN}/t` }),
    ];
    const before = computeHealth({ facts, findings });
    const snapshotOfInput = JSON.stringify(findings);
    const { groups, sitewide, singles } = collapseFindings({ findings, facts });

    assert.deepEqual(sitewide, [{ taxonomyId: 'description-missing', pages: 10, ratio: 1 }]);
    assert.equal(groups.length, 2);
    const [target, snippet] = groups;
    assert.equal(target.kind, 'target');
    assert.equal(target.taxonomyId, 'broken-internal-link');
    assert.equal(target.count, 4);
    assert.deepEqual(target.urlKeys, [0, 1, 2, 3].map((i) => `${ORIGIN}/p${i}`));
    assert.match(target.fingerprint, /^[0-9a-f]{12}$/);
    assert.equal(target.sample.urlKey, `${ORIGIN}/p0`);
    assert.equal(snippet.kind, 'snippet');
    assert.equal(snippet.count, 3);
    assert.deepEqual(singles.map((f) => f.id).sort(), ['broken-internal-link-5-https://example.com/elsewhere', 'link-no-accessible-name-7-'].sort());

    assert.equal(JSON.stringify(findings), snapshotOfInput);
    assert.deepEqual(computeHealth({ facts, findings }), before);
  });

  it('collapse: fixed-after-load findings never count towards a site-wide pattern or a group', () => {
    const facts = Array.from({ length: 10 }, (_, i) => fact(i));
    const findings = facts.map((_, i) => ({ ...fail('title-too-short', i, { snippet: '<title>Hi</title>' }), tags: ['fixed-after-load'], excludedFromParity: true }));
    const out = collapseFindings({ findings, facts });
    assert.deepEqual(out.sitewide, []);
    assert.deepEqual(out.groups, []);
  });

  it('does not call a check site-wide at or under the threshold', () => {
    const facts = Array.from({ length: 10 }, (_, i) => fact(i));
    const findings = Array.from({ length: 9 }, (_, i) => fail('description-missing', i));
    const out = collapseFindings({ findings, facts });
    assert.deepEqual(out.sitewide, []);
    assert.equal(out.singles.length, 9);
  });
});
