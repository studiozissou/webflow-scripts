// Tests for the MCP layer: tool list, annotations, in-memory round trip, error redaction and stdout discipline.
import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createChanges } from '../../tools/gbp/changes.js';
import { REQUIRED_ENV, TOOLS, createServer } from '../../tools/gbp/mcp-server.js';
import {
  FAKE_ACCESS,
  FAKE_CLIENT_ID,
  FAKE_REFRESH,
  FAKE_SECRET,
  json,
  makeCtx,
  on,
  routedFetch,
} from './helpers.js';

const SERVER_PATH = fileURLToPath(
  new URL('../../tools/gbp/mcp-server.js', import.meta.url),
);
const NEW_URL = 'https://example.com/en';

const EXPECTED_TOOLS = [
  'gbp_apply',
  'gbp_get_location',
  'gbp_get_performance',
  'gbp_list_accounts',
  'gbp_list_locations',
  'gbp_list_posts',
  'gbp_list_reviews',
  'gbp_preview_location_edit',
  'gbp_preview_post',
  'gbp_preview_review_reply',
];

async function connect(deps) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(deps);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

const parseResult = (result) => JSON.parse(result.content[0].text);

describe('mcp server', () => {
  let dir;
  let logPath;
  let merchant;
  let fetchFn;
  let client;
  let server;

  const call = (name, args = {}) => client.callTool({ name, arguments: args });
  const writesSent = () => fetchFn.calls.filter((c) => c.method !== 'GET');

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'gbp-server-'));
    logPath = join(dir, 'changes.jsonl');
    merchant = {
      name: 'locations/222',
      title: 'Example Bakery',
      websiteUri: 'https://example.com/',
      metadata: {},
    };
    fetchFn = routedFetch([
      on('GET', ':getGoogleUpdated', () => json({ location: merchant })),
      on('GET', ':fetchMultiDailyMetricsTimeSeries', {
        multiDailyMetricTimeSeries: [{ marker: 'numbers' }],
      }),
      on('GET', '/v1/accounts/111/locations', {
        locations: [{ name: 'locations/222', title: 'Example Bakery' }],
      }),
      on('GET', '/v1/accounts', { accounts: [{ name: 'accounts/111' }] }),
      on('GET', '/v1/locations/222', () => json(merchant)),
      on('PATCH', '/v1/locations/222', (c) => {
        if (c.params.get('validateOnly') !== 'true')
          merchant = { ...merchant, ...c.body };
        return json(c.params.get('validateOnly') === 'true' ? undefined : merchant);
      }),
      on('GET', '/reviews', { reviews: [{ reviewId: 'r1' }] }),
      on('GET', '/localPosts', { localPosts: [{ name: 'p1' }] }),
    ]);
    const ctx = makeCtx(fetchFn);
    ({ client, server } = await connect({
      ctx,
      changes: createChanges({ ctx, logPath }),
      secrets: [FAKE_SECRET, FAKE_REFRESH],
    }));
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });

  describe('tool list', () => {
    it('lists exactly the ten tools', async () => {
      const { tools } = await client.listTools();
      assert.deepEqual(tools.map((tool) => tool.name).sort(), EXPECTED_TOOLS);
    });

    it('has exactly one write tool, gbp_apply', async () => {
      const { tools } = await client.listTools();
      const writes = tools.filter((tool) => !tool.annotations?.readOnlyHint);
      assert.deepEqual(
        writes.map((tool) => tool.name),
        ['gbp_apply'],
      );
      const destructive = tools.filter((tool) => tool.annotations?.destructiveHint);
      assert.deepEqual(
        destructive.map((tool) => tool.name),
        ['gbp_apply'],
      );
    });

    it('uses plain JSON Schema and requires both apply values', async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) assert.equal(tool.inputSchema.type, 'object');
      const apply = tools.find((tool) => tool.name === 'gbp_apply');
      assert.deepEqual([...apply.inputSchema.required].sort(), [
        'confirmText',
        'previewId',
      ]);
    });
  });

  describe('read tools', () => {
    it('gbp_list_accounts', async () => {
      const result = await call('gbp_list_accounts');
      assert.deepEqual(parseResult(result), [{ name: 'accounts/111' }]);
    });

    it('gbp_list_locations', async () => {
      const [location] = parseResult(await call('gbp_list_locations'));
      assert.equal(location.v4Name, 'accounts/111/locations/222');
    });

    it('gbp_get_location shows merchant, live and the pending flag', async () => {
      const view = parseResult(
        await call('gbp_get_location', { location: 'locations/222' }),
      );
      assert.equal(view.merchant.title, 'Example Bakery');
      assert.equal(view.live.title, 'Example Bakery');
      assert.equal(view.hasPendingEdits, false);
    });

    it('gbp_list_reviews resolves the v4 path', async () => {
      const reviews = parseResult(
        await call('gbp_list_reviews', { location: 'locations/222' }),
      );
      assert.equal(reviews[0].reviewId, 'r1');
      assert.ok(fetchFn.calls.at(-1).path.startsWith('/v4/accounts/111/locations/222/'));
    });

    it('gbp_list_posts resolves the v4 path', async () => {
      const posts = parseResult(
        await call('gbp_list_posts', { location: 'locations/222' }),
      );
      assert.equal(posts[0].name, 'p1');
    });

    it('gbp_get_performance', async () => {
      const numbers = parseResult(
        await call('gbp_get_performance', {
          location: 'locations/222',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      );
      assert.equal(numbers[0].marker, 'numbers');
    });

    it('no read tool sends a write', async () => {
      await call('gbp_list_accounts');
      await call('gbp_list_locations');
      await call('gbp_get_location', { location: 'locations/222' });
      await call('gbp_list_reviews', { location: 'locations/222' });
      await call('gbp_list_posts', { location: 'locations/222' });
      assert.equal(writesSent().length, 0);
    });
  });

  describe('preview and apply round trip', () => {
    it('previews, applies, reads back and refuses a second apply', async () => {
      const preview = parseResult(
        await call('gbp_preview_location_edit', {
          location: 'locations/222',
          edits: { websiteUri: NEW_URL },
        }),
      );
      assert.equal(preview.confirmText, 'Example Bakery: websiteUri');
      assert.equal(writesSent().length, 1);
      assert.equal(writesSent()[0].params.get('validateOnly'), 'true');

      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      const applied = await call('gbp_apply', args);
      assert.equal(applied.isError, undefined);
      assert.equal(parseResult(applied).status, 'live');

      const second = await call('gbp_apply', args);
      assert.equal(second.isError, true);
      assert.equal(parseResult(second).reason, 'used');

      const lines = (await readFile(logPath, 'utf8')).trim().split('\n');
      assert.equal(lines.length, 2);
      assert.equal(JSON.parse(lines[1]).sent, false);
    });

    it('marks a validateOnly failure as a tool error with no previewId', async () => {
      const failing = routedFetch([
        on('GET', '/v1/locations/222', () => json(merchant)),
        on('PATCH', '/v1/locations/222', () =>
          json({ error: { message: 'Bad value.' } }, 400),
        ),
      ]);
      const ctx = makeCtx(failing);
      const local = await connect({ ctx, changes: createChanges({ ctx, logPath }) });
      const result = await local.client.callTool({
        name: 'gbp_preview_location_edit',
        arguments: { location: 'locations/222', edits: { websiteUri: NEW_URL } },
      });
      assert.equal(result.isError, true);
      const body = parseResult(result);
      assert.match(body.error, /Bad value\./);
      assert.equal('previewId' in body, false);
      assert.equal('confirmText' in body, false);
      await local.client.close();
      await local.server.close();
    });

    it('marks an unknown preview as a tool error', async () => {
      const result = await call('gbp_apply', { previewId: 'nope', confirmText: 'x' });
      assert.equal(result.isError, true);
      assert.equal(parseResult(result).reason, 'unknown');
    });
  });

  describe('errors', () => {
    it('turns a thrown error into a redacted tool error', async () => {
      const leaky = {
        listAccounts: async () => {
          throw new Error(
            `boom ${FAKE_ACCESS} ${FAKE_SECRET} plain-opaque Bearer abc123`,
          );
        },
      };
      const local = await connect({
        ctx: {},
        reads: leaky,
        changes: {},
        secrets: ['plain-opaque'],
      });
      const result = await local.client.callTool({
        name: 'gbp_list_accounts',
        arguments: {},
      });
      assert.equal(result.isError, true);
      const { text } = result.content[0];
      assert.match(text, /boom/);
      for (const forbidden of [FAKE_ACCESS, FAKE_SECRET, 'plain-opaque', 'abc123']) {
        assert.ok(!text.includes(forbidden), `leaked ${forbidden}`);
      }
      await local.client.close();
      await local.server.close();
    });

    it('redacts secrets from a successful result too', async () => {
      const local = await connect({
        ctx: {},
        reads: { listAccounts: async () => [{ note: FAKE_SECRET }] },
        changes: {},
      });
      const result = await local.client.callTool({
        name: 'gbp_list_accounts',
        arguments: {},
      });
      assert.ok(!result.content[0].text.includes(FAKE_SECRET));
      await local.client.close();
      await local.server.close();
    });

    it('reports an unknown tool as a tool error', async () => {
      const result = await call('gbp_delete_everything');
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /unknown tool/i);
    });

    it('refuses missing, wrongly typed and unexpected arguments before calling Google', async () => {
      const before = fetchFn.calls.length;
      for (const [name, args] of [
        ['gbp_get_location', {}],
        ['gbp_get_location', { location: 222 }],
        ['gbp_get_location', { location: 'locations/222', extra: true }],
        ['gbp_apply', { previewId: 'x' }],
        ['gbp_preview_location_edit', { location: 'locations/222', edits: 'nope' }],
      ]) {
        const result = await call(name, args);
        assert.equal(result.isError, true, `${name} ${JSON.stringify(args)}`);
      }
      assert.equal(fetchFn.calls.length, before);
    });
  });
});

describe('process behaviour', () => {
  const baseEnv = () => ({ PATH: process.env.PATH, HOME: tmpdir() });
  const fullEnv = () => ({
    ...baseEnv(),
    GBP_CLIENT_ID: FAKE_CLIENT_ID,
    GBP_CLIENT_SECRET: FAKE_SECRET,
    GBP_REFRESH_TOKEN: FAKE_REFRESH,
  });

  it('names the three required variables', () => {
    assert.deepEqual([...REQUIRED_ENV].sort(), [
      'GBP_CLIENT_ID',
      'GBP_CLIENT_SECRET',
      'GBP_REFRESH_TOKEN',
    ]);
    assert.equal(TOOLS.length, 10);
  });

  it('importing has no side effects', () => {
    const r = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(SERVER_PATH)});`],
      { encoding: 'utf8', timeout: 15000, env: baseEnv() },
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
  });

  for (const missing of ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN']) {
    it(`exits naming ${missing}, with no value and nothing on stdout`, () => {
      const env = fullEnv();
      delete env[missing];
      const r = spawnSync(process.execPath, [SERVER_PATH], {
        encoding: 'utf8',
        timeout: 15000,
        env,
      });
      assert.equal(r.status, 1);
      assert.equal(r.stdout, '');
      assert.match(r.stderr, new RegExp(missing));
      assert.ok(!r.stderr.includes(FAKE_SECRET));
      assert.ok(!r.stderr.includes(FAKE_REFRESH));
    });
  }

  it('speaks only protocol on stdout and answers over stdio', async () => {
    const child = spawn(process.execPath, [SERVER_PATH], {
      env: fullEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const listed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no tools/list reply')), 15000);
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        if (stdout.includes('"id":2')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const send = (message) =>
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
    send({
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });
    send({ method: 'notifications/initialized' });
    send({ id: 2, method: 'tools/list', params: {} });
    await listed;
    child.kill();

    const lines = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.ok(lines.every((line) => line.jsonrpc === '2.0'));
    const toolsReply = lines.find((line) => line.id === 2);
    assert.equal(toolsReply.result.tools.length, 10);
    for (const secret of [FAKE_SECRET, FAKE_REFRESH]) {
      assert.ok(!stdout.includes(secret));
      assert.ok(!stderr.includes(secret));
    }
  });
});
