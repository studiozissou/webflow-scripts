// Guards the Carsa release tool: version format, tag naming, reading files from the tag, never overwriting a published release folder, and never reusing or going below a version already on carsa-website-support main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RELEASE_FILES, tagFor, buildRelease, compareVersions } from '../../tools/carsa/release.js';

function fakeRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'carsa-'));
  writeFileSync(join(repo, 'sst.config.ts'), '');
  return repo;
}

const none = () => [];

const reader = (calls = []) => (tag, file) => {
  calls.push([tag, file]);
  return `// ${file} at ${tag}\n`;
};

test('release set is the loader, global.js, check-finance.js, the VDP scripts, the shared modules and the page modules', () => {
  assert.deepEqual(RELEASE_FILES, [
    'init.js', 'global.js', 'check-finance.js', 'vdp.js', 'battery-animation.js', 'at-price-total.js',
    'animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js',
    'near.js', 'finance-calculator.js', 'get-started.js', 'faq.js', 'models-template.js', 'fuel-template.js',
    'promotions-template.js', 'all-models.js', 'blog.js', 'car-redirect.js',
  ]);
});

test('every module the loader can request ships in the release', () => {
  const loader = readFileSync(new URL('../../projects/carsa/init.js', import.meta.url), 'utf8');
  const named = new Set(loader.match(/'[a-z-]+\.js'/g).map((s) => s.slice(1, -1)));
  for (const file of named) assert.ok(RELEASE_FILES.includes(file), `${file} is loaded by init.js but missing from RELEASE_FILES`);
});

test('tag name follows the repo convention', () => {
  assert.equal(tagFor('v1.0.0'), 'carsa-v1.0.0');
});

test('rejects anything that is not vMAJOR.MINOR.PATCH', () => {
  const repo = fakeRepo();
  for (const bad of ['1.0.0', 'v1.0', 'latest', 'main', 'v1.0.0/../x', '']) {
    assert.throws(() => buildRelease({ version: bad, carsaRepo: repo, readFromTag: reader(), remoteReleases: none }), /version/i, bad);
  }
});

test('writes every file, read from the tag, into webflow/releases/<version>/', () => {
  const repo = fakeRepo();
  const calls = [];
  const out = buildRelease({ version: 'v1.2.3', carsaRepo: repo, readFromTag: reader(calls), remoteReleases: none });
  const dir = join(repo, 'webflow', 'releases', 'v1.2.3');
  assert.equal(out.dir, dir);
  assert.deepEqual(readdirSync(dir).sort(), [...RELEASE_FILES].sort());
  assert.equal(readFileSync(join(dir, 'init.js'), 'utf8'), '// init.js at carsa-v1.2.3\n');
  assert.ok(calls.every(([tag]) => tag === 'carsa-v1.2.3'));
  assert.equal(out.files.length, RELEASE_FILES.length);
  assert.match(out.files[0].sha256, /^[0-9a-f]{64}$/);
});

test('refuses to overwrite an existing release folder', () => {
  const repo = fakeRepo();
  mkdirSync(join(repo, 'webflow', 'releases', 'v1.0.0'), { recursive: true });
  assert.throws(() => buildRelease({ version: 'v1.0.0', carsaRepo: repo, readFromTag: reader(), remoteReleases: none }), /already exists/);
});

test('a missing file in the tag aborts before anything is written', () => {
  const repo = fakeRepo();
  const failing = (tag, file) => {
    if (file === 'at-price-total.js') throw new Error('not in tag');
    return 'x';
  };
  assert.throws(() => buildRelease({ version: 'v2.0.0', carsaRepo: repo, readFromTag: failing, remoteReleases: none }), /at-price-total\.js/);
  assert.equal(existsSync(join(repo, 'webflow', 'releases', 'v2.0.0')), false);
});

test('refuses a path that is not a checkout of carsa-website-support', () => {
  assert.throws(() => buildRelease({ version: 'v1.0.0', carsaRepo: join(tmpdir(), 'does-not-exist-carsa'), readFromTag: reader(), remoteReleases: none }), /not found/);
});

test('versions compare numerically, not as strings', () => {
  assert.ok(compareVersions('v1.2.10', 'v1.2.9') > 0);
  assert.ok(compareVersions('v1.10.0', 'v1.9.9') > 0);
  assert.equal(compareVersions('v1.2.1', 'v1.2.1'), 0);
  assert.ok(compareVersions('v1.2.0', 'v1.2.1') < 0);
});

test('refuses a version that is already a folder on carsa-website-support main', () => {
  const repo = fakeRepo();
  const remote = () => ['v1.1.1', 'v1.2.0', 'v1.2.1'];
  assert.throws(() => buildRelease({ version: 'v1.2.1', carsaRepo: repo, readFromTag: reader(), remoteReleases: remote }), /v1\.2\.1 is already on carsa-website-support main/);
  assert.equal(existsSync(join(repo, 'webflow', 'releases', 'v1.2.1')), false);
});

test('refuses a version at or below the highest release on main, naming it', () => {
  const repo = fakeRepo();
  const remote = () => ['v1.2.0', 'v1.2.3', 'v1.1.1'];
  assert.throws(() => buildRelease({ version: 'v1.2.2', carsaRepo: repo, readFromTag: reader(), remoteReleases: remote }), /main is already at v1\.2\.3/);
  assert.equal(existsSync(join(repo, 'webflow', 'releases', 'v1.2.2')), false);
});

test('a version above everything on main builds, and the remote list is read from the checkout', () => {
  const repo = fakeRepo();
  const seen = [];
  const remote = (r) => { seen.push(r); return ['v1.2.0', 'v1.2.1', 'README.md']; };
  const out = buildRelease({ version: 'v1.2.4', carsaRepo: repo, readFromTag: reader(), remoteReleases: remote });
  assert.equal(out.files.length, RELEASE_FILES.length);
  assert.deepEqual(seen, [repo]);
});

test('a failure reading main aborts before anything is written', () => {
  const repo = fakeRepo();
  const broken = () => { throw new Error('could not fetch'); };
  assert.throws(() => buildRelease({ version: 'v9.0.0', carsaRepo: repo, readFromTag: reader(), remoteReleases: broken }), /carsa-website-support main.*could not fetch/);
  assert.equal(existsSync(join(repo, 'webflow', 'releases', 'v9.0.0')), false);
});
