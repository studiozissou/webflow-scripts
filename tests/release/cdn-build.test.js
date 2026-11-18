// Guards the CDN build: tag to client mapping, the hosted-file allowlist, the dist/ output (.min.js, _headers, 404.html, manifest), the manifest diff, the live-manifest check and the batch git reader.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, devNull } from 'node:os';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import {
  clientFor,
  isHosted,
  hostedFiles,
  buildDist,
  headersFile,
  diffManifest,
  checkLive,
  gitSource,
  isClassicScript
} from '../../tools/release/cdn-build.js';

const config = {
  host: 'cdn.example.invalid',
  clients: ['oost', 'rolfing-amsterdam', 'studio-zissou'],
  roots: ['projects/{client}', 'shared', 'styles'],
  extensions: ['.js', '.css', '.woff2'],
  deniedSegments: ['archive', 'tests', 'test', 'reference', 'tools', 'scripts', 'node_modules', 'dist', 'schema', 'n8n']
};

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

test('clientFor returns the client before -v<digit> when it is listed', () => {
  assert.equal(clientFor('oost-v0.4.2', config), 'oost');
  assert.equal(clientFor('rolfing-amsterdam-v0.2.0-rc.1', config), 'rolfing-amsterdam');
  assert.equal(clientFor('studio-zissou-v1.2.1', config), 'studio-zissou');
});

test('clientFor returns null for a client not in clients or a tag with no version', () => {
  assert.equal(clientFor('rhp-live-v2', config), null);
  assert.equal(clientFor('nem-life-v1.0.0', config), null);
  assert.equal(clientFor('oost-live', config), null);
  assert.equal(clientFor('oost-vx', config), null);
});

test('clientFor rejects a tag of a listed client with a character outside [a-z0-9.-]', () => {
  assert.throws(() => clientFor('oost-v1.0.0_x', config), /Invalid tag/);
  assert.throws(() => clientFor('oost-v1.0.0+build', config), /Invalid tag/);
  assert.throws(() => clientFor('Oost-v1.0.0', { ...config, clients: ['Oost'] }), /Invalid tag/);
});

test('isHosted accepts .js, .css and .woff2 under the roots', () => {
  for (const p of [
    'projects/oost/init.js',
    'projects/studio-zissou/fonts/a.woff2',
    'projects/rolfing-amsterdam/init.min.js',
    'shared/experiments.js',
    'styles/shared.css'
  ]) {
    assert.equal(isHosted(p, config), true, p);
  }
});

test('isHosted rejects archive, dot, denied segments, test files and other extensions', () => {
  const rejected = [
    'projects/studio-zissou/archive/a.woff2',
    'projects/x/.claude/a.json',
    'projects/oost/.claude/a.js',
    'projects/x/tests/a.js',
    'projects/oost/tests/a.js',
    'projects/oost/init.test.js',
    'projects/oost/init.spec.js',
    'projects/oost/serve-cors.js',
    'projects/oost/a.json',
    'projects/oost/a.html',
    'projects/oost/a.md',
    'projects/oost/../carsa/init.js',
    'projects/oost/./init.js',
    'README.js',
    'tools/release/cdn-build.js',
    'projects/carsa/init.js'
  ];
  for (const seg of config.deniedSegments) rejected.push(`projects/oost/${seg}/a.js`);
  for (const p of rejected) assert.equal(isHosted(p, config), false, p);
});

test('hostedFiles lists only the tag client, shared and styles', () => {
  const calls = [];
  const lsTree = (tag, roots) => {
    calls.push({ tag, roots });
    return [
      'projects/oost/init.js',
      'projects/oost/tests/a.js',
      'projects/rolfing-amsterdam/init.js',
      'shared/experiments.js',
      'styles/shared.css',
      'projects/oost/README.md'
    ];
  };
  const files = hostedFiles({ tag: 'oost-v0.4.2', config, lsTree });
  assert.deepEqual(files, ['projects/oost/init.js', 'shared/experiments.js', 'styles/shared.css']);
  assert.deepEqual(calls, [{ tag: 'oost-v0.4.2', roots: ['projects/oost', 'shared', 'styles'] }]);
});

test('hostedFiles returns nothing for a tag of an unlisted client', () => {
  const files = hostedFiles({ tag: 'rhp-live-v2', config, lsTree: () => ['projects/rhp/init.js'] });
  assert.deepEqual(files, []);
});

const TREE = {
  'oost-v0.4.2': {
    'projects/oost/init.js': 'var answer = 40 + 2;\nwindow.answer = answer;\n',
    'projects/oost/vendor.min.js': 'window.v=1;',
    'projects/oost/a.css': 'body{color:red}',
    'projects/oost/archive/old.js': 'nope',
    'shared/experiments.js': 'function exp(name) { return name; }\nwindow.exp = exp;\n'
  },
  'rhp-live-v2': {
    'projects/rhp/init.js': 'window.rhp=1;'
  }
};

const treeLs = (tag) => Object.keys(TREE[tag] ?? {});
const treeRead = (tag, path) => Buffer.from(TREE[tag][path]);

test('buildDist writes the files, a .min.js beside each .js, 404.html, _headers and the manifest', async () => {
  const outDir = join(tmp('cdn-build-'), 'dist');
  const manifest = await buildDist({
    outDir,
    tags: ['oost-v0.4.2', 'rhp-live-v2'],
    config,
    readBlob: treeRead,
    lsTree: treeLs
  });

  const init = readFileSync(join(outDir, 'oost-v0.4.2/projects/oost/init.js'), 'utf8');
  assert.equal(init, TREE['oost-v0.4.2']['projects/oost/init.js']);
  const min = readFileSync(join(outDir, 'oost-v0.4.2/projects/oost/init.min.js'), 'utf8');
  assert.ok(min.length > 0 && min.length < init.length);
  assert.doesNotThrow(() => new vm.Script(min));
  assert.ok(existsSync(join(outDir, 'oost-v0.4.2/shared/experiments.min.js')));
  assert.ok(existsSync(join(outDir, 'oost-v0.4.2/projects/oost/vendor.min.js')));
  assert.ok(!existsSync(join(outDir, 'oost-v0.4.2/projects/oost/vendor.min.min.js')));
  assert.ok(!existsSync(join(outDir, 'oost-v0.4.2/projects/oost/a.min.css')));
  assert.ok(!existsSync(join(outDir, 'oost-v0.4.2/projects/oost/archive')));
  assert.ok(!existsSync(join(outDir, 'rhp-live-v2')));

  assert.equal(readFileSync(join(outDir, '_headers'), 'utf8'), headersFile());
  assert.ok(readFileSync(join(outDir, '404.html'), 'utf8').includes('404'));

  const written = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
  assert.deepEqual(written, manifest);
  assert.deepEqual(
    manifest.map((e) => e.path),
    [
      'oost-v0.4.2/projects/oost/a.css',
      'oost-v0.4.2/projects/oost/init.js',
      'oost-v0.4.2/projects/oost/init.min.js',
      'oost-v0.4.2/projects/oost/vendor.min.js',
      'oost-v0.4.2/shared/experiments.js',
      'oost-v0.4.2/shared/experiments.min.js'
    ]
  );
  for (const entry of manifest) {
    assert.equal(entry.tag, 'oost-v0.4.2');
    assert.equal(entry.sha256, sha(readFileSync(join(outDir, entry.path))));
  }
});

test('buildDist keeps a committed .min.js instead of overwriting it', async () => {
  const outDir = join(tmp('cdn-build-'), 'dist');
  const tree = { 'projects/oost/a.js': 'window.a = 1;', 'projects/oost/a.min.js': '/*committed*/window.a=1;' };
  await buildDist({
    outDir,
    tags: ['oost-v1.0.0'],
    config,
    lsTree: () => Object.keys(tree),
    readBlob: (tag, path) => Buffer.from(tree[path])
  });
  assert.equal(readFileSync(join(outDir, 'oost-v1.0.0/projects/oost/a.min.js'), 'utf8'), tree['projects/oost/a.min.js']);
});

test('buildDist writes no .min.js for an ES module source, which no classic script tag can load', async () => {
  const outDir = join(tmp('cdn-build-'), 'dist');
  const tree = { 'shared/mod.js': 'export function a() { return 1; }\n' };
  const manifest = await buildDist({
    outDir,
    tags: ['oost-v1.0.0'],
    config,
    lsTree: () => Object.keys(tree),
    readBlob: (tag, path) => Buffer.from(tree[path])
  });
  assert.deepEqual(manifest.map((e) => e.path), ['oost-v1.0.0/shared/mod.js']);
  assert.equal(isClassicScript('export const a = 1;'), false);
  assert.equal(isClassicScript('window.a = 1;'), true);
});

test('headersFile matches the spec exactly', () => {
  assert.equal(
    headersFile(),
    [
      '/*',
      '  Access-Control-Allow-Origin: *',
      '  X-Content-Type-Options: nosniff',
      '  Cross-Origin-Resource-Policy: cross-origin',
      '/:tag/projects/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/:tag/shared/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/:tag/styles/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '/manifest.json',
      '  Cache-Control: no-store',
      ''
    ].join('\n')
  );
});

test('diffManifest reports added, changed and removed paths', () => {
  const live = [
    { tag: 't', path: 't/a.js', sha256: '1' },
    { tag: 't', path: 't/b.js', sha256: '2' },
    { tag: 't', path: 't/c.js', sha256: '3' }
  ];
  const next = [
    { tag: 't', path: 't/a.js', sha256: '1' },
    { tag: 't', path: 't/b.js', sha256: '9' },
    { tag: 'u', path: 'u/d.js', sha256: '4' }
  ];
  assert.deepEqual(diffManifest(live, next), { added: ['u/d.js'], changed: ['t/b.js'], removed: ['t/c.js'] });
  assert.deepEqual(diffManifest(next, next), { added: [], changed: [], removed: [] });
});

const next = [{ tag: 't', path: 't/a.js', sha256: '1' }];
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('checkLive passes when the live manifest only gains paths', async () => {
  const urls = [];
  const fetch = async (url, opts) => {
    urls.push(url);
    assert.ok(opts?.signal, 'fetch gets a timeout signal');
    return jsonResponse([]);
  };
  const result = await checkLive({ host: 'cdn.example.invalid', next, fetch, bootstrap: false, allowChanges: false });
  assert.equal(result.ok, true);
  assert.deepEqual(result.diff.added, ['t/a.js']);
  assert.equal(urls[0], 'https://cdn.example.invalid/manifest.json');
});

test('checkLive treats a 404 as empty only with bootstrap', async () => {
  const fetch = async () => new Response('not found', { status: 404 });
  const without = await checkLive({ host: 'h', next, fetch, bootstrap: false, allowChanges: false });
  assert.equal(without.ok, false);
  assert.match(without.failures.join('\n'), /404/);
  const withBootstrap = await checkLive({ host: 'h', next, fetch, bootstrap: true, allowChanges: false });
  assert.equal(withBootstrap.ok, true);
  assert.deepEqual(withBootstrap.diff.added, ['t/a.js']);
});

test('checkLive fails on another non-200 status and on a timeout, even with bootstrap', async () => {
  const s500 = await checkLive({ host: 'h', next, fetch: async () => new Response('', { status: 500 }), bootstrap: true, allowChanges: true });
  assert.equal(s500.ok, false);
  assert.match(s500.failures.join('\n'), /500/);
  const timeout = await checkLive({
    host: 'h',
    next,
    fetch: async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    },
    bootstrap: true,
    allowChanges: true
  });
  assert.equal(timeout.ok, false);
  assert.match(timeout.failures.join('\n'), /timed out/i);
});

test('checkLive fails on a changed or removed path unless allowChanges', async () => {
  const live = [
    { tag: 't', path: 't/a.js', sha256: 'old' },
    { tag: 't', path: 't/gone.js', sha256: '2' }
  ];
  const fetch = async () => jsonResponse(live);
  const blocked = await checkLive({ host: 'h', next, fetch, bootstrap: false, allowChanges: false });
  assert.equal(blocked.ok, false);
  assert.match(blocked.failures.join('\n'), /t\/a\.js/);
  assert.match(blocked.failures.join('\n'), /t\/gone\.js/);
  const allowed = await checkLive({ host: 'h', next, fetch, bootstrap: false, allowChanges: true });
  assert.equal(allowed.ok, true);
});

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid'
};

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function fixture() {
  const repo = tmp('cdn-git-');
  git(repo, 'init', '-q', '-b', 'main');
  const write = (path, body) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), body);
  };
  write('projects/oost/init.js', 'window.v = 1;');
  write('projects/rolfing-amsterdam/init.js', 'window.r = 1;');
  write('shared/experiments.js', 'window.e = 1;');
  write('projects/oost/font.woff2', Buffer.from([0, 1, 2, 255]));
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'one');
  git(repo, 'tag', 'oost-v0.1.0');
  write('projects/oost/init.js', 'window.v = 2;');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'two');
  git(repo, 'tag', 'oost-v0.2.0');
  git(repo, 'tag', 'rhp-live-v2');
  return repo;
}

test('gitSource reads each tag tree and its blobs from git', () => {
  const repo = fixture();
  const source = gitSource({ repoRoot: repo, tags: ['oost-v0.1.0', 'oost-v0.2.0'], config });
  assert.deepEqual(source.tags, ['oost-v0.1.0', 'oost-v0.2.0']);
  assert.deepEqual(source.lsTree('oost-v0.1.0', ['projects/oost', 'shared', 'styles']).sort(), [
    'projects/oost/font.woff2',
    'projects/oost/init.js',
    'shared/experiments.js'
  ]);
  assert.equal(source.readBlob('oost-v0.1.0', 'projects/oost/init.js').toString(), 'window.v = 1;');
  assert.equal(source.readBlob('oost-v0.2.0', 'projects/oost/init.js').toString(), 'window.v = 2;');
  assert.deepEqual([...source.readBlob('oost-v0.1.0', 'projects/oost/font.woff2')], [0, 1, 2, 255]);
});

test('gitSource with no tags lists every tag of a listed client', () => {
  const repo = fixture();
  const source = gitSource({ repoRoot: repo, config });
  assert.deepEqual(source.tags, ['oost-v0.1.0', 'oost-v0.2.0']);
});

test('gitSource drops a requested tag that does not exist instead of throwing', () => {
  const repo = fixture();
  const source = gitSource({ repoRoot: repo, tags: ['oost-v9.9.9'], config });
  assert.deepEqual(source.tags, []);
});
