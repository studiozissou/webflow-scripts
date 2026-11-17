// Covers createTask (one page in the Tasks DB with a title and nothing else) and the create-task CLI command, on a fake client without the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTask } from '../../tools/notion/client.js';
import { main, parseArgs } from '../../tools/notion/cli.js';

const fakeClient = () => {
  const created = [];
  return {
    created,
    pages: { create: async (args) => (created.push(args), { id: 'new-page', url: 'https://www.notion.so/new-page' }) },
  };
};

test('createTask writes one page with only the title in the given database', async () => {
  const client = fakeClient();
  const res = await createTask(client, 'db-1', { title: 'Review a report' });
  assert.deepEqual(client.created, [
    { parent: { database_id: 'db-1' }, properties: { 'Task name': { title: [{ text: { content: 'Review a report' } }] } } },
  ]);
  assert.deepEqual(res, { id: 'new-page', url: 'https://www.notion.so/new-page' });
});

test('createTask refuses an empty title and writes nothing', async () => {
  const client = fakeClient();
  await assert.rejects(createTask(client, 'db-1', { title: '  ' }), /title/i);
  assert.deepEqual(client.created, []);
});

test('parseArgs reads create-task and needs a title', () => {
  assert.deepEqual(parseArgs(['create-task', '--title', 'T', '--db', 'abc']), { command: 'create-task', title: 'T', db: 'abc' });
  assert.throws(() => parseArgs(['create-task']), /--title/);
  assert.throws(() => parseArgs(['create-task', '--title', 'T', '--page', 'x']), /not allowed/i);
});

test('the create-task command prints the new page and exits 0', async () => {
  const client = fakeClient();
  const write = process.stdout.write.bind(process.stdout);
  let out = '';
  process.stdout.write = (chunk) => ((out += chunk), true);
  let code;
  try {
    code = await main(['create-task', '--title', 'Review a report', '--db', 'db-1'], {}, { client });
  } finally {
    process.stdout.write = write;
  }
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(out), { ok: true, id: 'new-page', url: 'https://www.notion.so/new-page' });
  assert.equal(client.created.length, 1);
});

test('create-task refuses inside a build job', () => {
  const cli = fileURLToPath(new URL('../../tools/notion/cli.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NOTION_TOKEN'));
  const r = spawnSync(process.execPath, [cli, 'create-task', '--title', 'T', '--db', 'abc'], {
    encoding: 'utf8',
    env: { ...env, PATH: '/usr/bin:/bin', TRIAGE_BUILD_JOB: '1' },
  });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /not available inside a build job/);
});
