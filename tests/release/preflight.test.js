// Guards the release preflight: branch, clean tree, pushed main, module files on disk, bumped VERSION and a free tag, checked against throwaway git fixture repos.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir, devNull } from 'node:os';
import { join } from 'node:path';
import { preflight, parseInit, compareVersions } from '../../tools/release/preflight.js';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
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

function initSource(version, modules = ['site-utilities.js', 'faq.js'], routeModules = ['booking.js']) {
  return [
    '(function () {',
    `  var VERSION = '${version}';`,
    "  var DEPS = ['https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js'];",
    `  var GLOBAL_MODULES = [${modules.map((m) => `'${m}'`).join(', ')}];`,
    `  var ROUTES = [{ match: /^\\/book/, modules: [${routeModules.map((m) => `'${m}'`).join(', ')}] }];`,
    '})();',
    ''
  ].join('\n');
}

function fixture({ version = '0.2.0', tags = ['acme-v0.1.0'] } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'preflight-'));
  dirs.push(base);
  const remote = join(base, 'remote.git');
  const repo = join(base, 'repo');
  mkdirSync(repo);
  git(base, 'init', '-q', '--bare', '-b', 'main', remote);
  git(repo, 'init', '-q', '-b', 'main');
  const dir = join(repo, 'projects', 'acme');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'init.js'), initSource(version));
  for (const f of ['site-utilities.js', 'faq.js', 'booking.js']) writeFileSync(join(dir, f), '');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');
  for (const t of tags) git(repo, 'tag', t);
  git(repo, 'remote', 'add', 'origin', remote);
  git(repo, 'push', '-q', 'origin', 'main');
  return { repo, dir };
}

test('passes on a clean, pushed, bumped fixture and reports the tag it would cut', () => {
  const { repo } = fixture();
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.deepEqual(out.failures, []);
  assert.equal(out.ok, true);
  assert.equal(out.version, '0.2.0');
  assert.equal(out.tag, 'acme-v0.2.0');
});

test('passes when the client has no tags yet', () => {
  const { repo } = fixture({ tags: [] });
  assert.equal(preflight({ repoRoot: repo, client: 'acme' }).ok, true);
});

test('fails off main', () => {
  const { repo } = fixture();
  git(repo, 'switch', '-q', '-c', 'feature');
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /main/.test(f) && /branch/i.test(f)), out.failures.join('\n'));
});

test('fails on a dirty working tree, including untracked files', () => {
  const { repo, dir } = fixture();
  writeFileSync(join(dir, 'scratch.txt'), 'x');
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /clean|uncommitted|dirty/i.test(f)), out.failures.join('\n'));
});

test('fails when main has commits not on origin/main', () => {
  const { repo } = fixture();
  git(repo, 'commit', '-q', '--allow-empty', '-m', 'local only');
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /ahead|unpushed|push/i.test(f)), out.failures.join('\n'));
});

test('fails when a listed module is missing on disk, naming the file', () => {
  const { repo, dir } = fixture();
  unlinkSync(join(dir, 'booking.js'));
  git(repo, 'commit', '-q', '-am', 'drop booking');
  git(repo, 'push', '-q', 'origin', 'main');
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => f.includes('booking.js')), out.failures.join('\n'));
});

test('fails when VERSION is not above the latest tag', () => {
  const { repo } = fixture({ version: '0.1.0', tags: ['acme-v0.0.9', 'acme-v0.1.0'] });
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /VERSION/.test(f) && f.includes('acme-v0.1.0')), out.failures.join('\n'));
});

test('compares tags numerically, not as strings', () => {
  const { repo } = fixture({ version: '0.10.0', tags: ['acme-v0.9.0', 'acme-v0.2.0'] });
  assert.equal(preflight({ repoRoot: repo, client: 'acme' }).ok, true);
  const low = fixture({ version: '0.9.1', tags: ['acme-v0.10.0'] });
  assert.equal(preflight({ repoRoot: low.repo, client: 'acme' }).ok, false);
});

test('fails when the new tag name is already taken', () => {
  const { repo } = fixture({ version: '0.2.0', tags: ['acme-v0.2.0'] });
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /exists|taken/i.test(f) && f.includes('acme-v0.2.0')), out.failures.join('\n'));
});

test('ignores tags belonging to other clients', () => {
  const { repo } = fixture({ version: '0.2.0', tags: ['acme-v0.1.0', 'other-v9.0.0', 'acmeplus-v5.0.0'] });
  assert.equal(preflight({ repoRoot: repo, client: 'acme' }).ok, true);
});

test('collects every failure rather than stopping at the first', () => {
  const { repo, dir } = fixture({ version: '0.1.0', tags: ['acme-v0.1.0'] });
  git(repo, 'switch', '-q', '-c', 'feature');
  writeFileSync(join(dir, 'scratch.txt'), 'x');
  unlinkSync(join(dir, 'faq.js'));
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.length >= 4, out.failures.join('\n'));
});

test('fails cleanly when the client has no init.js', () => {
  const { repo } = fixture();
  const out = preflight({ repoRoot: repo, client: 'nobody' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => f.includes('init.js')), out.failures.join('\n'));
});

test('fails when init.js has no VERSION', () => {
  const { repo, dir } = fixture();
  writeFileSync(join(dir, 'init.js'), "var GLOBAL_MODULES = ['faq.js'];\n");
  git(repo, 'commit', '-q', '-am', 'drop version');
  git(repo, 'push', '-q', 'origin', 'main');
  const out = preflight({ repoRoot: repo, client: 'acme' });
  assert.equal(out.ok, false);
  assert.ok(out.failures.some((f) => /VERSION/.test(f)), out.failures.join('\n'));
});

test('fails when VERSION is not X.Y.Z semver, e.g. a date-style cache buster', () => {
  for (const version of ['2026.10.6.3', '1.0']) {
    const { repo } = fixture({ version, tags: [] });
    const out = preflight({ repoRoot: repo, client: 'acme' });
    assert.equal(out.ok, false, version);
    assert.ok(
      out.failures.includes('VERSION must be X.Y.Z to cut a acme-vX.Y.Z tag'),
      out.failures.join('\n'),
    );
  }
});

test('parseInit reads VERSION and every module list, skipping dependency URLs', () => {
  const parsed = parseInit(initSource('1.2.3'));
  assert.equal(parsed.version, '1.2.3');
  assert.deepEqual(parsed.modules, ['site-utilities.js', 'faq.js', 'booking.js']);
});

test('parseInit handles a lowercase modules array and no VERSION', () => {
  const src = "var ROUTES = [{ match: /x/, modules: ['vdp.js'] }];\nvar modules = ['global.js', 'check-finance.js'];\n";
  const parsed = parseInit(src);
  assert.equal(parsed.version, null);
  assert.deepEqual([...parsed.modules].sort(), ['check-finance.js', 'global.js', 'vdp.js']);
});

test('parseInit ignores commented-out module entries', () => {
  const src = "const modules = [\n  // 'hero-anim.js',\n  'live.js',\n];\n";
  assert.deepEqual(parseInit(src).modules, ['live.js']);
});

test('parseInit reads module files from a page-ID map', () => {
  const src = "const modules = [\n  // 'hero-anim.js',\n];\nconst pageModules = {\n  '6ab10852f344a15a2b01d930': 'datasheet-unlock.js',\n};\n";
  assert.deepEqual(parseInit(src).modules, ['datasheet-unlock.js']);
});

test('compareVersions orders numerically and pads missing parts', () => {
  assert.ok(compareVersions('0.10.0', '0.9.9') > 0);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.ok(compareVersions('1.0', '1.0.1') < 0);
});
