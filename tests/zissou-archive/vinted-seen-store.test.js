import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadSeen,
  saveSeen,
  markSeen,
  filterNew,
  appendCsv,
} from '../../projects/zissou-archive/lib/seen-store.js';

let dir;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vinted-seen-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadSeen / saveSeen', () => {
  it('returns an empty store for a missing file', async () => {
    const seen = await loadSeen(join(dir, 'missing.json'));
    assert.deepEqual(seen.items, {});
  });

  it('round-trips via an atomic write', async () => {
    const path = join(dir, 'nested', 'seen.json');
    const seen = await loadSeen(path);
    markSeen([{ id: 5 }], seen, '2026-11-05T10:00:00.000Z');
    await saveSeen(path, seen);
    const again = await loadSeen(path);
    assert.equal(again.items['5'].firstSeen, '2026-11-05T10:00:00.000Z');
    const files = await readdir(join(dir, 'nested'));
    assert.deepEqual(files, ['seen.json']);
  });

  it('throws on a corrupt file rather than wiping it', async () => {
    const path = join(dir, 'corrupt.json');
    await writeFile(path, '{not json');
    await assert.rejects(() => loadSeen(path));
  });
});

describe('markSeen', () => {
  it('returns only items not seen before and records firstSeen', () => {
    const seen = { version: 1, items: {} };
    const first = markSeen([{ id: 1 }, { id: 2 }, { id: 1 }], seen, 't1');
    assert.deepEqual(first.map((i) => i.id), [1, 2]);
    const second = markSeen([{ id: 2 }, { id: 3 }], seen, 't2');
    assert.deepEqual(second.map((i) => i.id), [3]);
    assert.equal(seen.items['2'].firstSeen, 't1');
  });
});

describe('filterNew', () => {
  it('flags an item at most once and dedupes an item seen in an earlier run', () => {
    const seen = { version: 1, items: {} };
    const runOne = filterNew([{ id: 10 }, { id: 11 }], seen, 'run1');
    assert.deepEqual(runOne.map((i) => i.id), [10, 11]);
    assert.equal(seen.items['10'].flagged, 'run1');
    assert.equal(seen.items['10'].firstSeen, 'run1');
    const runTwo = filterNew([{ id: 10 }, { id: 12 }], seen, 'run2');
    assert.deepEqual(runTwo.map((i) => i.id), [12]);
    assert.equal(seen.items['10'].flagged, 'run1');
  });

  it('dedupes within a run', () => {
    const seen = { version: 1, items: {} };
    assert.equal(filterNew([{ id: 1 }, { id: 1 }], seen, 'r').length, 1);
  });

  it('flags an item already marked seen but never flagged', () => {
    const seen = { version: 1, items: {} };
    markSeen([{ id: 4 }], seen, 'early');
    assert.equal(filterNew([{ id: 4 }], seen, 'later').length, 1);
    assert.equal(seen.items['4'].firstSeen, 'early');
  });
});

describe('appendCsv', () => {
  it('writes the header once and quotes values', async () => {
    const path = join(dir, 'csv', 'supply.csv');
    const header = ['firstSeen', 'id', 'title', 'price'];
    await appendCsv(path, header, [{ firstSeen: 't', id: 1, title: 'Coat, "navy"\nwool', price: 20 }]);
    await appendCsv(path, header, [['t2', 2, 'Plain', null]]);
    const text = await readFile(path, 'utf8');
    assert.equal(text, 'firstSeen,id,title,price\nt,1,"Coat, ""navy""\nwool",20\nt2,2,Plain,\n');
  });

  it('neutralises spreadsheet formulas', async () => {
    const path = join(dir, 'formula.csv');
    await appendCsv(path, ['title'], [['=HYPERLINK("x")']]);
    const text = await readFile(path, 'utf8');
    assert.equal(text, 'title\n"\'=HYPERLINK(""x"")"\n');
  });

  it('does nothing for no rows on an existing file', async () => {
    const path = join(dir, 'empty.csv');
    await appendCsv(path, ['a'], []);
    assert.equal(await readFile(path, 'utf8'), 'a\n');
    await appendCsv(path, ['a'], []);
    assert.equal(await readFile(path, 'utf8'), 'a\n');
  });
});
