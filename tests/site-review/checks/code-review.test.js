import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check, meta, extractCustomCode, reviewCode } from '../../../tools/site-review/checks/code-review.js';
import { page, site, config, assertValidRows, ids } from './_helpers.js';

const silent = { log() {}, warn() {}, error() {} };
const client = (text) => ({ messages: { create: async () => ({ content: [{ type: 'text', text }] }) } });
const html = '<html><head><script>var x = eval(input);</script><style>.a{color:red}</style></head></html>';

describe('code-review check', () => {
  it('is excluded from audit mode', () => {
    assert.equal(meta.audit, false);
    assert.deepEqual(meta.taxonomyIds, ['code-review']);
  });

  it('extracts custom inline code and skips external and library scripts', () => {
    const code = extractCustomCode(`${html}<script src="x.js">fallback</script><script>gsap.to('.a', {})</script>`);
    assert.ok(code.includes('eval(input)'));
    assert.ok(code.includes('.a{color:red}'));
    assert.ok(!code.includes('fallback'));
    assert.ok(!code.includes('gsap.to'));
  });

  it('maps the model response to issues and flags a parse failure', async () => {
    const ok = await reviewCode('var x;', client(JSON.stringify([{ severity: 'bogus', title: 'T', description: 'D' }])));
    assert.deepEqual(ok, { issues: [{ severity: 'info', title: 'T', description: 'D', recommendation: null }], parsed: true });
    assert.equal((await reviewCode('var x;', client('not json'))).parsed, false);
  });

  it('returns one row per page with issues, fetching HTML through fetchPage', async () => {
    const cfg = config({ anthropicClient: client(JSON.stringify([{ severity: 'critical', title: 'eval', description: 'uses eval' }])), codeReviewDelayMs: 0 });
    const fetchPage = async () => ({ body: html });
    const rows = assertValidRows(await check({ facts: [page('/')], site: site(), config: cfg, log: silent, fetchPage }));
    assert.deepEqual(ids(rows), ['code-review /']);
    assert.deepEqual(rows[0].evidence.value, ['critical: eval']);
    assert.ok(rows[0].evidence.snippet.includes('eval(input)'));
  });

  it('gives unknown not_run without fetchPage', async () => {
    const cfg = config({ anthropicClient: client('[]') });
    const rows = assertValidRows(await check({ facts: [page('/')], site: site(), config: cfg, log: silent }));
    assert.deepEqual(ids(rows), ['code-review / (not_run)']);
  });
});
