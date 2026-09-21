// Guards the Carsa release tool: version format, tag naming, reading files from the tag, and never overwriting a published release folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RELEASE_FILES, tagFor, buildRelease } from '../../tools/carsa/release.js';

function fakeRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'carsa-'));
  writeFileSync(join(repo, 'sst.config.ts'), '');
  return repo;
}

const reader = (calls = []) => (tag, file) => {
  calls.push([tag, file]);
  return `// ${file} at ${tag}\n`;
};

test('release set is the loader, global.js and the two VDP scripts', () => {
  assert.deepEqual(RELEASE_FILES, ['init.js', 'global.js', 'battery-animation.js', 'at-price-total.js']);
});

test('tag name follows the repo convention', () => {
  assert.equal(tagFor('v1.0.0'), 'carsa-v1.0.0');
});

test('rejects anything that is not vMAJOR.MINOR.PATCH', () => {
  const repo = fakeRepo();
  for (const bad of ['1.0.0', 'v1.0', 'latest', 'main', 'v1.0.0/../x', '']) {
    assert.throws(() => buildRelease({ version: bad, carsaRepo: repo, readFromTag: reader() }), /version/i, bad);
  }
});

test('writes every file, read from the tag, into webflow/releases/<version>/', () => {
  const repo = fakeRepo();
  const calls = [];
  const out = buildRelease({ version: 'v1.2.3', carsaRepo: repo, readFromTag: reader(calls) });
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
  assert.throws(() => buildRelease({ version: 'v1.0.0', carsaRepo: repo, readFromTag: reader() }), /already exists/);
});

test('a missing file in the tag aborts before anything is written', () => {
  const repo = fakeRepo();
  const failing = (tag, file) => {
    if (file === 'at-price-total.js') throw new Error('not in tag');
    return 'x';
  };
  assert.throws(() => buildRelease({ version: 'v2.0.0', carsaRepo: repo, readFromTag: failing }), /at-price-total\.js/);
  assert.equal(existsSync(join(repo, 'webflow', 'releases', 'v2.0.0')), false);
});

test('refuses a path that is not a checkout of carsa-website-support', () => {
  assert.throws(() => buildRelease({ version: 'v1.0.0', carsaRepo: join(tmpdir(), 'does-not-exist-carsa'), readFromTag: reader() }), /not found/);
});
