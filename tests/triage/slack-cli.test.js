// Guards the Slack bot client and CLI: Keychain-or-env tokens, form-encoded calls that throw on ok:false, posts only to the digest channel from the control config, ts printed as JSON, and no token ever printed.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, resolveBotToken, resolveAppToken } from '../../tools/slack/client.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'tools/slack/cli.js');
const TOKEN = 'xoxb-test-secret-123';
const CHANNEL = 'C0DIGEST01';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'slack-cli-'));
  dirs.push(d);
  return d;
}

async function fakeSlack(respond = () => ({ ok: true, ts: '1731300000.000100' })) {
  const requests = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const method = req.url.replace(/^\//, '');
      const params = Object.fromEntries(new URLSearchParams(body));
      requests.push({ method, params, auth: req.headers.authorization, type: req.headers['content-type'] });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(respond(method, params)));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  after(() => server.close());
  return { base, requests };
}

function config(dir, digest = { channelId: CHANNEL, userId: 'U1' }) {
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify({ slack: { digest } }));
  return path;
}

const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('TRIAGE_') && !k.startsWith('SLACK_')));

function run(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd: ROOT, env: { ...CLEAN_ENV, ...env } });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

async function setup(respond) {
  const dir = tmp();
  const server = await fakeSlack(respond);
  const file = join(dir, 'msg.txt');
  writeFileSync(file, 'Daybook for today\n');
  const env = { SLACK_BOT_TOKEN: TOKEN, SLACK_API_BASE: server.base, TRIAGE_TEST_CONFIG: config(dir) };
  return { dir, server, file, env };
}

test('resolveBotToken prefers SLACK_BOT_TOKEN, then reads Keychain item mcp/slack-bot', () => {
  assert.equal(resolveBotToken({ env: { SLACK_BOT_TOKEN: 'env' }, exec: () => assert.fail('no keychain') }), 'env');
  let argv;
  const token = resolveBotToken({ env: {}, exec: (cmd, args) => ((argv = [cmd, ...args]), 'kc\n') });
  assert.equal(token, 'kc');
  assert.deepEqual(argv, ['security', 'find-generic-password', '-s', 'mcp', '-a', 'slack-bot', '-w']);
});

test('resolveAppToken reads SLACK_APP_TOKEN or mcp/slack-app, and a missing token throws without a value', () => {
  assert.equal(resolveAppToken({ env: { SLACK_APP_TOKEN: 'xapp' } }), 'xapp');
  let argv;
  resolveAppToken({ env: {}, exec: (cmd, args) => ((argv = args), 'a') });
  assert.equal(argv[argv.indexOf('-a') + 1], 'slack-app');
  assert.throws(() => resolveAppToken({ env: {}, exec: () => { throw new Error('nope'); } }), /slack-app/);
  assert.throws(() => resolveBotToken({ env: {}, exec: () => '  ' }), /empty/);
});

test('api posts form-encoded params with a bearer token and returns the JSON body', async () => {
  const { base, requests } = await fakeSlack(() => ({ ok: true, ts: '1.2' }));
  const res = await api('chat.postMessage', { channel: CHANNEL, text: 'hi & bye', thread_ts: undefined }, { token: TOKEN, base });
  assert.equal(res.ts, '1.2');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'chat.postMessage');
  assert.equal(requests[0].auth, `Bearer ${TOKEN}`);
  assert.match(requests[0].type, /application\/x-www-form-urlencoded/);
  assert.deepEqual(requests[0].params, { channel: CHANNEL, text: 'hi & bye' });
});

test('api throws with the Slack error code on ok:false and never includes the token', async () => {
  const { base } = await fakeSlack(() => ({ ok: false, error: 'not_in_channel' }));
  await assert.rejects(api('chat.postMessage', { channel: CHANNEL }, { token: TOKEN, base }), (err) => {
    assert.match(err.message, /chat\.postMessage.*not_in_channel/);
    assert.doesNotMatch(err.message, /xox/);
    return true;
  });
});

test('post sends the file to the digest channel and prints {"ts"} as JSON', async () => {
  const { server, file, env } = await setup();
  const r = await run(['post', '--file', file], env);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse(r.out), { ts: '1731300000.000100' });
  assert.equal(server.requests.length, 1);
  assert.deepEqual(server.requests[0].params, { channel: CHANNEL, text: 'Daybook for today\n' });
});

test('post --thread replies in that thread, and --channel equal to the digest channel is accepted', async () => {
  const { server, file, env } = await setup();
  const r = await run(['post', '--file', file, '--thread', '1731200000.000001', '--channel', CHANNEL], env);
  assert.equal(r.code, 0, r.err);
  assert.equal(server.requests[0].params.thread_ts, '1731200000.000001');
  assert.equal(server.requests[0].params.channel, CHANNEL);
});

test('post to any other channel exits 2 with channel not allowed, makes no request and prints no token', async () => {
  const { server, file, env } = await setup();
  const r = await run(['post', '--channel', 'C000OTHER', '--file', file], env);
  assert.equal(r.code, 2);
  assert.match(r.err, /channel not allowed/);
  assert.equal(server.requests.length, 0);
  assert.doesNotMatch(r.out + r.err, /xox/);
});

test('post refuses with exit 2 when the control config has no digest channel', async () => {
  const { server, file, env, dir } = await setup();
  const r = await run(['post', '--file', file], { ...env, TRIAGE_TEST_CONFIG: config(dir, { userId: 'U1' }) });
  assert.equal(r.code, 2);
  assert.match(r.err, /channelId/);
  assert.equal(server.requests.length, 0);
});

test('post refuses an empty file, a missing --file and an unknown flag with exit 2', async () => {
  const { server, env, dir } = await setup();
  const empty = join(dir, 'empty.txt');
  writeFileSync(empty, '  \n');
  for (const args of [['post', '--file', empty], ['post'], ['post', '--file', empty, '--config', 'x'], ['nope']]) {
    const r = await run(args, env);
    assert.equal(r.code, 2, args.join(' '));
  }
  assert.equal(server.requests.length, 0);
});

test('a Slack error exits 1 and names the error code without the token', async () => {
  const { file, env } = await setup(() => ({ ok: false, error: 'invalid_auth' }));
  const r = await run(['post', '--file', file], env);
  assert.equal(r.code, 1);
  assert.match(r.err, /invalid_auth/);
  assert.doesNotMatch(r.out + r.err, /xox/);
});

test('a missing bot token exits 1 naming the Keychain item, with no request', async () => {
  const { server, file, env } = await setup();
  const bin = tmp();
  writeFileSync(join(bin, 'security'), '#!/bin/sh\nexit 44\n');
  chmodSync(join(bin, 'security'), 0o755);
  const { SLACK_BOT_TOKEN, ...rest } = env;
  const r = await run(['post', '--file', file], { ...rest, PATH: `${bin}:/usr/bin:/bin` });
  assert.equal(r.code, 1);
  assert.match(r.err, /mcp\/slack-bot|slack-bot/);
  assert.equal(server.requests.length, 0);
});

test('react adds a reaction to a message in the digest channel', async () => {
  const { server, env } = await setup(() => ({ ok: true }));
  const r = await run(['react', '--ts', '1731300000.000200', '--name', 'eyes'], env);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(server.requests[0], { ...server.requests[0], method: 'reactions.add', params: { channel: CHANNEL, timestamp: '1731300000.000200', name: 'eyes' } });
});

test('the CLI refuses inside a build job before any token lookup or request', async () => {
  const { server, file, env } = await setup();
  const r = await run(['post', '--file', file], { ...env, TRIAGE_BUILD_JOB: '1' });
  assert.equal(r.code, 2);
  assert.equal(server.requests.length, 0);
});
