// Round-trip tests for the NDJSON writer and reader in lib/ndjson.js.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNdjsonWriter, readNdjson } from '../../tools/site-review/lib/ndjson.js';

describe('ndjson', () => {
  it('writes one JSON object per line and reads them back', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ndjson-'));
    try {
      const path = join(dir, 'nested', 'facts.ndjson');
      const writer = createNdjsonWriter(path);
      const rows = [{ a: 1, text: 'line\nbreak' }, { b: 'é–' }, { c: [1, 2] }];
      for (const row of rows) await writer.write(row);
      await writer.close();
      const raw = await readFile(path, 'utf8');
      assert.equal(raw.split('\n').length, 4);
      assert.ok(raw.endsWith('\n'));
      assert.deepEqual(await readNdjson(path), rows);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
