// Covers the Notion task mapper, open-task pagination and filter, CLI arg parsing, and token resolution without touching the network or the Keychain, and the CLI refusal inside a build job.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapTaskPage, queryOpenTasks, updatePriority, updateStatus, addComment } from '../../tools/notion/client.js';
import { parseArgs, resolveToken, resolveDatabaseId } from '../../tools/notion/cli.js';

const page = JSON.parse(readFileSync(new URL('./fixtures/page.json', import.meta.url), 'utf8'));

test('mapTaskPage maps a full Tasks Tracker page', () => {
  assert.deepEqual(mapTaskPage(page), {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Reply to Alex about Phase B pricing',
    status: 'In progress',
    priority: 'P1',
    due: '2026-11-12',
    doer: 'User + Claude',
    tags: ['Quick', 'Email'],
    blockedReason: 'waiting on Pat to confirm scope',
    hours: 0.25,
    clients: ['00000000-0000-0000-0000-000000000003'],
    url: 'https://www.notion.so/Reply-to-Alex-about-Phase-B-pricing-00000000000000000000000000000001',
  });
});

test('mapTaskPage returns nulls and empty arrays for empty properties', () => {
  const empty = {
    id: 'x',
    url: 'u',
    properties: {
      'Task name': { type: 'title', title: [] },
      Status: { type: 'status', status: null },
      Priority: { type: 'select', select: null },
      'Due date': { type: 'date', date: null },
      Doer: { type: 'select', select: null },
      Tags: { type: 'multi_select', multi_select: [] },
      'Blocked Reason': { type: 'rich_text', rich_text: [] },
      'Hours Estimate': { type: 'number', number: null },
      Clients: { type: 'relation', relation: [] },
    },
  };
  assert.deepEqual(mapTaskPage(empty), {
    id: 'x', name: '', status: null, priority: null, due: null, doer: null,
    tags: [], blockedReason: null, hours: null, clients: [], url: 'u',
  });
});

test('mapTaskPage survives missing properties entirely', () => {
  const t = mapTaskPage({ id: 'y' });
  assert.equal(t.id, 'y');
  assert.equal(t.name, '');
  assert.equal(t.status, null);
  assert.deepEqual(t.tags, []);
  assert.deepEqual(t.clients, []);
  assert.equal(t.url, null);
});

test('mapTaskPage reads Status stored as a select and finds the title by type', () => {
  const t = mapTaskPage({
    id: 'z',
    properties: {
      Name: { type: 'title', title: [{ plain_text: 'Other title' }] },
      Status: { type: 'select', select: { name: 'Waiting' } },
      Priority: { type: 'status', status: { name: 'P0' } },
      'Due date': { type: 'date', date: { start: '2026-11-11T09:00:00.000+00:00' } },
    },
  });
  assert.equal(t.name, 'Other title');
  assert.equal(t.status, 'Waiting');
  assert.equal(t.priority, 'P0');
  assert.equal(t.due, '2026-11-11T09:00:00.000+00:00');
});

function fakeClient(pages) {
  const calls = { query: [], update: [], comment: [] };
  return {
    calls,
    databases: {
      async query(args) {
        calls.query.push(args);
        return pages[calls.query.length - 1];
      },
    },
    pages: { async update(args) { calls.update.push(args); return { id: args.page_id }; } },
    comments: { async create(args) { calls.comment.push(args); return { id: 'c1' }; } },
  };
}

test('queryOpenTasks paginates and excludes Done and Cancelled by default', async () => {
  const client = fakeClient([
    { results: [page], has_more: true, next_cursor: 'cur2' },
    { results: [{ ...page, id: 'second' }], has_more: false, next_cursor: null },
  ]);
  const tasks = await queryOpenTasks(client, 'db1');
  assert.deepEqual(tasks.map((t) => t.id), [page.id, 'second']);
  assert.equal(client.calls.query.length, 2);
  assert.equal(client.calls.query[0].database_id, 'db1');
  assert.equal(client.calls.query[0].start_cursor, undefined);
  assert.equal(client.calls.query[1].start_cursor, 'cur2');
  assert.deepEqual(client.calls.query[0].filter, {
    and: [
      { property: 'Status', status: { does_not_equal: 'Done' } },
      { property: 'Status', status: { does_not_equal: 'Cancelled' } },
    ],
  });
});

test('queryOpenTasks honours custom excludeStatuses and skips archived pages', async () => {
  const client = fakeClient([
    { results: [page, { ...page, id: 'gone', archived: true }], has_more: false },
  ]);
  const tasks = await queryOpenTasks(client, 'db1', { excludeStatuses: ['Done'] });
  assert.deepEqual(tasks.map((t) => t.id), [page.id]);
  assert.deepEqual(client.calls.query[0].filter, {
    and: [{ property: 'Status', status: { does_not_equal: 'Done' } }],
  });
});

test('updatePriority, updateStatus and addComment send the right payloads', async () => {
  const client = fakeClient([]);
  await updatePriority(client, 'p1', 'P0');
  await updateStatus(client, 'p1', 'In Testing');
  await addComment(client, 'p1', 'built on job/x');
  assert.deepEqual(client.calls.update[0], { page_id: 'p1', properties: { Priority: { select: { name: 'P0' } } } });
  assert.deepEqual(client.calls.update[1], { page_id: 'p1', properties: { Status: { status: { name: 'In Testing' } } } });
  assert.deepEqual(client.calls.comment[0], {
    parent: { page_id: 'p1' },
    rich_text: [{ type: 'text', text: { content: 'built on job/x' } }],
  });
});

test('updatePriority rejects values outside P0-P3', async () => {
  await assert.rejects(updatePriority(fakeClient([]), 'p1', 'P9'), /P0, P1, P2, P3/);
});

test('resolveToken prefers NOTION_TOKEN and never calls the Keychain then', () => {
  let called = false;
  const token = resolveToken({ env: { NOTION_TOKEN: 'secret-env' }, exec: () => { called = true; return 'x'; } });
  assert.equal(token, 'secret-env');
  assert.equal(called, false);
});

test('resolveToken falls back to the Keychain item mcp/notion-triage and trims', () => {
  let seen;
  const token = resolveToken({
    env: {},
    exec: (cmd, args) => { seen = [cmd, args]; return 'secret-kc\n'; },
  });
  assert.equal(token, 'secret-kc');
  assert.deepEqual(seen, ['security', ['find-generic-password', '-s', 'mcp', '-a', 'notion-triage', '-w']]);
});

test('resolveToken errors without echoing anything secret', () => {
  assert.throws(
    () => resolveToken({ env: {}, exec: () => { throw new Error('security: item not found secret-ish'); } }),
    (err) => /Keychain/.test(err.message) && !/secret-ish/.test(err.message),
  );
  assert.throws(() => resolveToken({ env: {}, exec: () => '  \n' }), /empty/);
});

test('parseArgs reads commands and flags', () => {
  assert.deepEqual(parseArgs(['tasks', '--open']), { command: 'tasks', open: true });
  assert.deepEqual(parseArgs(['tasks', '--open', '--db', 'abc', '--config', '/c.json']), {
    command: 'tasks', open: true, db: 'abc', config: '/c.json',
  });
  assert.deepEqual(parseArgs(['set-priority', '--page', 'p', '--value', 'P1']), {
    command: 'set-priority', page: 'p', value: 'P1',
  });
  assert.deepEqual(parseArgs(['comment', '--page', 'p', '--text', 'hello there']), {
    command: 'comment', page: 'p', text: 'hello there',
  });
});

test('parseArgs flags usage errors', () => {
  assert.throws(() => parseArgs([]), /usage/i);
  assert.throws(() => parseArgs(['nope']), /usage/i);
  assert.throws(() => parseArgs(['tasks']), /--open/);
  assert.throws(() => parseArgs(['set-status', '--page', 'p']), /--value/);
  assert.throws(() => parseArgs(['comment', '--text', 't']), /--page/);
  assert.throws(() => parseArgs(['tasks', '--open', '--db']), /--db/);
  assert.throws(() => parseArgs(['tasks', '--open', '--bogus']), /unknown/i);
});

test('resolveDatabaseId prefers --db, else config notion.databaseId', () => {
  assert.equal(resolveDatabaseId({ db: 'flag' }, () => { throw new Error('no read'); }), 'flag');
  const read = (p) => { assert.equal(p, '/cfg.json'); return JSON.stringify({ notion: { databaseId: 'from-config' } }); };
  assert.equal(resolveDatabaseId({ config: '/cfg.json' }, read), 'from-config');
  assert.throws(() => resolveDatabaseId({ config: '/cfg.json' }, () => '{}'), /databaseId/);
});

test('the CLI refuses inside a build job before resolving any token', () => {
  const bin = mkdtempSync(join(tmpdir(), 'notion-cli-'));
  try {
    const marker = join(bin, 'called');
    writeFileSync(join(bin, 'security'), `#!/bin/sh\n: > "${marker}"\necho fake-token\n`);
    chmodSync(join(bin, 'security'), 0o755);
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NOTION_TOKEN'));
    const cli = fileURLToPath(new URL('../../tools/notion/cli.js', import.meta.url));
    for (const args of [['set-priority', '--page', 'p', '--value', 'P1'], ['tasks', '--open', '--db', 'x'], []]) {
      const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...env, PATH: `${bin}:${env.PATH}`, TRIAGE_BUILD_JOB: '1' } });
      assert.equal(r.status, 2, r.stderr);
      assert.match(r.stderr, /not available inside a build job/);
      assert.equal(r.stdout, '');
    }
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});
