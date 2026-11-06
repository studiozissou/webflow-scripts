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
    assert.match(HEALTH_FORMULA, /round\(100 × \(1 − \(E \+ 0\.5 × W\) \/ P\)\)/);
  });

  it('is null without fetched pages and clipped to 0..100', () => {
    assert.equal(computeHealth({ facts: [fact('/a', 'timeout')], findings: [] }).score, null);
    assert.equal(computeHealth({ facts: [fact('/a')], findings: [fail('/a', 1)] }).score, 0);
    assert.equal(computeHealth({ facts: [fact('/a')], findings: [] }).score, 100);
  });
});
