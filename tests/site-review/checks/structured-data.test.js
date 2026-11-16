import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { check } from '../../../tools/site-review/checks/structured-data.js';
import { page, assertValidRows, ids } from './_helpers.js';

describe('structured-data check', () => {
  it('checks: JSON-LD that does not parse is a finding with the parser message', async () => {
    const message = "Expected double-quoted property name in JSON at position 63";
    const facts = [
      page('/jsonld-error', { jsonLd: { types: [], hashes: [], parseErrors: [{ message, snippet: '{"@type":"Organization",}' }] } }),
      page('/fine', { jsonLd: { types: ['Organization'], hashes: ['abc'], parseErrors: [] } }),
    ];
    const rows = assertValidRows(await check({ facts }));
    assert.deepEqual(ids(rows), ['jsonld-parse-error /jsonld-error']);
    assert.equal(rows[0].evidence.value, message);
    assert.equal(rows[0].evidence.snippet, '{"@type":"Organization",}');
  });
});
