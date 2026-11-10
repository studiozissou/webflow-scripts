import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeHealth, HEALTH_FORMULA } from '../../tools/site-review/lib/health.js';

const ORIGIN = 'https://example.com';
const fact = (path, fetchState = 'ok') => ({ url: `${ORIGIN}${path}`, urlKey: `${ORIGIN}${path}`, fetchState });
const fail = (path, scoreWeight, extra = {}) => ({ taxonomyId: 't', state: 'fail', urlKey: `${ORIGIN}${path}`, scoreWeight, transient: false, ...extra });

describe('health', () => {
  it('health: score equals the README formula on the golden site', () => {
    const facts = [...Array.from({ length: 10 }, (_, i) => fact(`/p${i}`)), fact('/failed', 'fetch_failed')];
    const findings = [
      fail('/p0', 1), fail('/p0', 0.5),
      fail('/p1', 1),
      fail('/p2', 0.5), fail('/p2', 0.5),
      fail('/p3', 0.5),
      fail('/p4', 0.5),
      fail('/p5', 0),
      fail('/p6', 1, { transient: true }),
      fail('/p7', 1, { state: 'unknown' }),
      fail('/p8', 0, { severity: 'notice', tags: ['fixed-after-load'] }),
      fail('/failed', 1),
      { taxonomyId: 'w', state: 'fail', urlKey: `${ORIGIN}/p9`, severity: 'warning', transient: false },
    ];
    const health = computeHealth({ facts, findings });
    const P = 10;
    const E = 2;
    const W = 4;
    assert.deepEqual(
      { pages: health.pages, errorPages: health.errorPages, warningPages: health.warningPages },
      { pages: P, errorPages: E, warningPages: W },
    );
    assert.equal(health.score, Math.round(100 * (1 - (E + 0.5 * W) / P)));
    assert.equal(health.score, 60);
    assert.equal(health.formula, HEALTH_FORMULA);
    assert.match(HEALTH_FORMULA, /round\(100 × \(1 − \(E \+ 0\.5 × W \+ S\) \/ P\)\)/);
    assert.equal(health.sharedDamage, 0);
  });

  it('health: a shared issue counts once, weighted by the log of its reach (Rolfing worked example)', () => {
    const facts = Array.from({ length: 30 }, (_, i) => fact(`/p${i}`));
    const link = (i) => ({ ...fail(`/p${i}`, 1, { taxonomyId: 'broken-internal-link' }), targetKey: `${ORIGIN}/science`, target: `${ORIGIN}/science` });
    const description = (i) => fail(`/p${i}`, 0.5, { taxonomyId: 'description-missing', evidence: { snippet: '' } });
    const before = computeHealth({ facts, findings: facts.flatMap((_, i) => [link(i), description(i)]) });
    assert.equal(before.errorPages, 0);
    assert.equal(before.warningPages, 0);
    assert.equal(before.sharedIssues.length, 2);
    assert.equal(before.sharedDamage, Math.round(1.5 * (1 + Math.log2(30)) * 1000) / 1000);
    assert.equal(before.cappedPages, 0);
    assert.equal(before.score, 70);
    const after = computeHealth({ facts, findings: facts.map((_, i) => description(i)) });
    assert.equal(after.score, 90);
  });

  it('health: single-page fails still classify their page and shared issues add on top', () => {
    const facts = Array.from({ length: 10 }, (_, i) => fact(`/p${i}`));
    const shared = [0, 1, 2].map((i) => ({ ...fail(`/p${i}`, 1, { taxonomyId: 'broken-internal-link' }), targetKey: `${ORIGIN}/gone` }));
    const single = fail('/p5', 0.5, { taxonomyId: 'title-too-long', evidence: { snippet: '<title>unique</title>' } });
    const health = computeHealth({ facts, findings: [...shared, single] });
    assert.equal(health.warningPages, 1);
    assert.equal(health.errorPages, 0);
    assert.equal(health.sharedIssues[0].pages, 3);
    assert.equal(health.score, Math.round(100 * (1 - (0.5 + (1 + Math.log2(3))) / 10)));
  });

  it('health: shared issues never make a page cost more than its worst fail (Rolfing science pages)', () => {
    const facts = Array.from({ length: 31 }, (_, i) => fact(`/p${i}`));
    const dead = Array.from({ length: 9 }, (_, t) => [0, 1].map((i) => ({
      ...fail(`/p${i}`, 0.5, { taxonomyId: 'broken-external-link' }), targetKey: `https://gone.org/${t}`, target: `https://gone.org/${t}`,
    }))).flat();
    const health = computeHealth({ facts, findings: dead });
    assert.equal(health.sharedIssues.length, 9);
    assert.equal(health.sharedPenaltyTotal, 9);
    assert.equal(health.cappedPages, 2);
    assert.equal(health.sharedDamage, 1);
    assert.equal(health.score, Math.round(100 * (1 - 1 / 31)));

    const withError = computeHealth({ facts, findings: [...dead, fail('/p0', 1, { taxonomyId: 'title-missing', evidence: { snippet: '<title></title>' } })] });
    assert.equal(withError.errorPages, 1);
    assert.equal(withError.sharedDamage, 0.5);
  });

  it('is null without fetched pages and clipped to 0..100', () => {
    assert.equal(computeHealth({ facts: [fact('/a', 'timeout')], findings: [] }).score, null);
    assert.equal(computeHealth({ facts: [fact('/a')], findings: [fail('/a', 1)] }).score, 0);
    assert.equal(computeHealth({ facts: [fact('/a')], findings: [] }).score, 100);
  });
});
