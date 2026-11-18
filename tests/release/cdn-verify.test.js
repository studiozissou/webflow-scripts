// Guards the CDN verifier: URL shape, MIME by extension, the status, MIME, CORS, cache, byte and compile checks per file, and the summary line with its exit code, all against fake fetch and git readers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cdnUrl, mimeFor, checkFile, verify } from '../../tools/release/cdn-verify.js';

const config = {
  host: 'cdn.example.invalid',
  clients: ['oost', 'rolfing-amsterdam', 'studio-zissou'],
  roots: ['projects/{client}', 'shared', 'styles'],
  extensions: ['.js', '.css', '.woff2'],
  deniedSegments: ['archive', 'tests', 'test', 'reference', 'tools', 'scripts', 'node_modules', 'dist', 'schema', 'n8n']
};

const GOOD_HEADERS = {
  'content-type': 'application/javascript; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=31536000, immutable'
};

const respond = (body, { status = 200, headers = GOOD_HEADERS } = {}) => async () => new Response(body, { status, headers });

test('cdnUrl builds https://<host>/<tag>/<path>', () => {
  assert.equal(cdnUrl('cdn.example.invalid', 'oost-v0.4.2', 'projects/oost/init.js'), 'https://cdn.example.invalid/oost-v0.4.2/projects/oost/init.js');
});

test('mimeFor maps extensions to the accepted MIME types', () => {
  assert.deepEqual(mimeFor('a/b.js'), ['application/javascript', 'text/javascript']);
  assert.deepEqual(mimeFor('a/b.min.js'), ['application/javascript', 'text/javascript']);
  assert.deepEqual(mimeFor('a/b.css'), ['text/css']);
  assert.deepEqual(mimeFor('a/b.woff2'), ['font/woff2']);
  assert.deepEqual(mimeFor('a/b.json'), []);
});

const url = 'https://cdn.example.invalid/oost-v1.0.0/projects/oost/init.js';
const body = 'window.a = 1;';

test('checkFile passes on 200, JS MIME, CORS, immutable cache and equal bytes', async () => {
  assert.deepEqual(await checkFile({ url, expected: Buffer.from(body), fetch: respond(body) }), []);
  const textJs = respond(body, { headers: { ...GOOD_HEADERS, 'content-type': 'text/javascript' } });
  assert.deepEqual(await checkFile({ url, expected: Buffer.from(body), fetch: textJs }), []);
});

test('checkFile passes a fetch timeout signal and reports a timeout', async () => {
  let signal;
  await checkFile({
    url,
    expected: Buffer.from(body),
    fetch: async (u, opts) => {
      signal = opts?.signal;
      return new Response(body, { headers: GOOD_HEADERS });
    }
  });
  assert.ok(signal instanceof AbortSignal);
  const problems = await checkFile({
    url,
    expected: Buffer.from(body),
    fetch: async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    }
  });
  assert.match(problems.join('\n'), /timed out/i);
});

test('checkFile reports a wrong status', async () => {
  const problems = await checkFile({ url, expected: Buffer.from(body), fetch: respond('nope', { status: 404 }) });
  assert.match(problems.join('\n'), /status 404/);
});

test('checkFile reports a wrong MIME type', async () => {
  const fetch = respond(body, { headers: { ...GOOD_HEADERS, 'content-type': 'text/plain' } });
  assert.match((await checkFile({ url, expected: Buffer.from(body), fetch })).join('\n'), /MIME text\/plain/);
});

test('checkFile reports a missing CORS header', async () => {
  const { 'access-control-allow-origin': _, ...headers } = GOOD_HEADERS;
  assert.match((await checkFile({ url, expected: Buffer.from(body), fetch: respond(body, { headers }) })).join('\n'), /Access-Control-Allow-Origin/);
});

test('checkFile reports a missing or weaker cache header', async () => {
  const { 'cache-control': _, ...headers } = GOOD_HEADERS;
  assert.match((await checkFile({ url, expected: Buffer.from(body), fetch: respond(body, { headers }) })).join('\n'), /Cache-Control/);
  const weak = respond(body, { headers: { ...GOOD_HEADERS, 'cache-control': 'public, max-age=0, must-revalidate' } });
  assert.match((await checkFile({ url, expected: Buffer.from(body), fetch: weak })).join('\n'), /Cache-Control/);
});

test('checkFile reports a byte mismatch', async () => {
  const problems = await checkFile({ url, expected: Buffer.from(body), fetch: respond('window.a = 2;') });
  assert.match(problems.join('\n'), /bytes differ/);
});

test('checkFile checks a generated .min.js by compile, not bytes', async () => {
  const minUrl = url.replace('init.js', 'init.min.js');
  assert.deepEqual(await checkFile({ url: minUrl, expected: null, fetch: respond('window.a=1') }), []);
  const broken = await checkFile({ url: minUrl, expected: null, fetch: respond('window.a = (;') });
  assert.match(broken.join('\n'), /does not compile/);
});

const TREE = {
  'oost-v1.0.0': {
    'projects/oost/init.js': 'window.a = 1;',
    'projects/oost/a.css': 'body{}',
    'projects/oost/tests/x.js': 'nope'
  },
  'studio-zissou-v1.0.0': {
    'projects/studio-zissou/init.js': 'window.s = 1;'
  }
};

const lsTree = (tag) => Object.keys(TREE[tag]);
const readBlob = (tag, path) => Buffer.from(TREE[tag][path]);

function cdnFake(overrides = {}) {
  const seen = [];
  const fetch = async (u) => {
    seen.push(u);
    const path = new URL(u).pathname.slice(1);
    if (overrides[path]) return overrides[path]();
    const [tag, ...rest] = path.split('/');
    const file = rest.join('/');
    const type = file.endsWith('.css') ? 'text/css' : 'application/javascript';
    const headers = { ...GOOD_HEADERS, 'content-type': type };
    if (file.endsWith('.min.js')) return new Response('window.x=1', { headers });
    const src = TREE[tag]?.[file];
    return src == null ? new Response('', { status: 404 }) : new Response(src, { headers });
  };
  return { fetch, seen };
}

test('verify checks every hosted file and each generated .min.js and prints the summary line', async () => {
  const { fetch, seen } = cdnFake();
  const result = await verify({ host: 'cdn.example.invalid', tags: ['oost-v1.0.0', 'studio-zissou-v1.0.0'], fetch, readBlob, lsTree, config });
  assert.equal(result.line, 'Verified 5 files across 2 tags: 0 failures');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(seen.sort(), [
    'https://cdn.example.invalid/oost-v1.0.0/projects/oost/a.css',
    'https://cdn.example.invalid/oost-v1.0.0/projects/oost/init.js',
    'https://cdn.example.invalid/oost-v1.0.0/projects/oost/init.min.js',
    'https://cdn.example.invalid/studio-zissou-v1.0.0/projects/studio-zissou/init.js',
    'https://cdn.example.invalid/studio-zissou-v1.0.0/projects/studio-zissou/init.min.js'
  ]);
});

test('verify counts failures and exits 1', async () => {
  const { fetch } = cdnFake({
    'oost-v1.0.0/projects/oost/init.js': async () => new Response('window.a = 2;', { headers: GOOD_HEADERS }),
    'oost-v1.0.0/projects/oost/a.css': async () => new Response('', { status: 500 })
  });
  const result = await verify({ host: 'cdn.example.invalid', tags: ['oost-v1.0.0'], fetch, readBlob, lsTree, config });
  assert.equal(result.line, 'Verified 3 files across 1 tags: 2 failures');
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.failures.map((f) => f.url).sort(), [
    'https://cdn.example.invalid/oost-v1.0.0/projects/oost/a.css',
    'https://cdn.example.invalid/oost-v1.0.0/projects/oost/init.js'
  ]);
});

test('verify expects no .min.js for an ES module source', async () => {
  const tree = { 'shared/mod.js': 'export const a = 1;' };
  const seen = [];
  const fetch = async (u) => {
    seen.push(u);
    return new Response(tree['shared/mod.js'], { headers: GOOD_HEADERS });
  };
  const result = await verify({
    host: 'h',
    tags: ['oost-v1.0.0'],
    fetch,
    lsTree: () => Object.keys(tree),
    readBlob: (tag, path) => Buffer.from(tree[path]),
    config
  });
  assert.deepEqual(seen, ['https://h/oost-v1.0.0/shared/mod.js']);
  assert.equal(result.line, 'Verified 1 files across 1 tags: 0 failures');
});

test('verify skips a tag of an unlisted client', async () => {
  const { fetch, seen } = cdnFake();
  const result = await verify({ host: 'h', tags: ['rhp-live-v2'], fetch, readBlob, lsTree: () => ['projects/rhp/init.js'], config });
  assert.equal(result.line, 'Verified 0 files across 0 tags: 0 failures');
  assert.deepEqual(seen, []);
});

test('verify fails when there is nothing to verify', async () => {
  const { fetch } = cdnFake();
  const result = await verify({ host: 'h', tags: [], fetch, readBlob, lsTree: () => [], config });
  assert.equal(result.exitCode, 1);
});
