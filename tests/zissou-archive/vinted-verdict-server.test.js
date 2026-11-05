import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startVerdictServer } from '../../projects/zissou-archive/lib/verdict-server.js';

let dir;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vinted-verdict-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

function post(url, body, contentType = 'application/json') {
  return fetch(`${url}verdict`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('startVerdictServer', () => {
  it('serves the report on GET /', async () => {
    const server = await startVerdictServer({ html: '<p>report</p>', csvPath: join(dir, 'a.csv') });
    try {
      assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
      const res = await fetch(server.url);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/html/);
      assert.equal(await res.text(), '<p>report</p>');
      assert.equal((await fetch(`${server.url}nope`)).status, 404);
    } finally {
      await server.close();
    }
  });

  it('appends a CSV row for a verdict POST', async () => {
    const csvPath = join(dir, 'verdicts.csv');
    const server = await startVerdictServer({ html: '', csvPath });
    try {
      const res = await post(server.url, {
        id: 900000001,
        verdict: 'buy',
        title: 'Coat, navy',
        url: 'https://www.vinted.nl/items/900000001-x',
        price: 20,
        queryId: 'band-25-30',
      });
      assert.equal(res.status, 200);
      await post(server.url, { id: 2, verdict: 'junk', title: 'B', url: 'u', price: 5, queryId: 'q' });
      const lines = (await readFile(csvPath, 'utf8')).trim().split('\n');
      assert.equal(lines[0], 'markedAt,id,verdict,queryId,price,title,url');
      assert.match(lines[1], /^\d{4}-\d\d-\d\dT[^,]+,900000001,buy,band-25-30,20,"Coat, navy",https:\/\/www\.vinted\.nl\/items\/900000001-x$/);
      assert.match(lines[2], /,2,junk,q,5,B,u$/);
    } finally {
      await server.close();
    }
  });

  it('rejects an invalid verdict, bad json and a non-json content type', async () => {
    const csvPath = join(dir, 'rejects.csv');
    const server = await startVerdictServer({ html: '', csvPath });
    try {
      assert.equal((await post(server.url, { id: 1, verdict: 'maybe-not' })).status, 400);
      assert.equal((await post(server.url, { verdict: 'buy' })).status, 400);
      assert.equal((await post(server.url, '{oops')).status, 400);
      assert.equal((await post(server.url, { id: 1, verdict: 'buy' }, 'text/plain')).status, 415);
      assert.equal(existsSync(csvPath), false);
    } finally {
      await server.close();
    }
  });

  it('closes itself after the idle timeout', async () => {
    const server = await startVerdictServer({ html: '', csvPath: join(dir, 'idle.csv'), idleMs: 50 });
    await server.closed;
    await assert.rejects(() => fetch(server.url));
  });

  it('close is idempotent', async () => {
    const server = await startVerdictServer({ html: '', csvPath: join(dir, 'c.csv') });
    await server.close();
    await server.close();
  });
});
