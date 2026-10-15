// Tests that every private path scripts/link-internal.sh links into this public checkout is ignored and untracked by git.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/link-internal.sh');

const topPaths = () => {
  const match = readFileSync(SCRIPT, 'utf8').match(/^TOP_PATHS=\(([^)]*)\)/m);
  assert.ok(match, `no TOP_PATHS=( ... ) array in ${SCRIPT}`);
  const paths = match[1].split(/\s+/).filter(Boolean);
  assert.ok(paths.length > 0, `TOP_PATHS in ${SCRIPT} is empty`);
  const malformed = paths.filter((path) => /[#()]/.test(path));
  assert.deepEqual(malformed, [], `TOP_PATHS entries contain #, ( or ): ${malformed.join(', ')}`);
  return paths;
};

const PROBE = 'projects/__probe__/.claude';

const projectPaths = () =>
  readdirSync(join(ROOT, 'projects'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `projects/${entry.name}/.claude`)
    .filter((path) => lstatSync(join(ROOT, path), { throwIfNoEntry: false }));

const isIgnored = (path) => {
  const r = spawnSync('git', ['check-ignore', '-q', '--no-index', '--', path], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.ok(
    r.status === 0 || r.status === 1,
    `git check-ignore failed for ${path}: ${r.error?.message ?? r.stderr}`,
  );
  return r.status === 0;
};

const matchedPatterns = (path) => {
  const isLink = lstatSync(join(ROOT, path), { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
  const queries = isLink ? [path] : [path, `${path}/`];
  const r = spawnSync('git', ['check-ignore', '-v', '--no-index', '--', ...queries], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.ok(
    r.status === 0 || r.status === 1,
    `git check-ignore -v failed for ${path}: ${r.error?.message ?? r.stderr}`,
  );
  return r.stdout
    .split('\n')
    .map((line) => line.match(/^(.+):(\d+):([^\t]*)\t/))
    .filter(Boolean)
    .map(([, source, line, pattern]) => ({ source, line, pattern }));
};

const isTracked = (path) =>
  execFileSync('git', ['ls-files', '--', path], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim() !== '';

const notIgnored = (paths) => paths.filter((path) => !isIgnored(path));
const tracked = (paths) => paths.filter((path) => isTracked(path));

test('TOP_PATHS includes the storyteller skill', () => {
  assert.ok(
    topPaths().includes('.claude/skills/storyteller'),
    'TOP_PATHS in scripts/link-internal.sh is missing .claude/skills/storyteller',
  );
});

test('git ignores every TOP_PATHS entry', () => {
  const offenders = notIgnored(topPaths());
  assert.deepEqual(offenders, [], `not ignored by .gitignore: ${offenders.join(', ')}`);
});

test('no .gitignore rule that ignores a TOP_PATHS entry ends in /', () => {
  const offenders = topPaths().flatMap((path) =>
    matchedPatterns(path)
      .filter(({ pattern }) => pattern.endsWith('/'))
      .map(({ source, line, pattern }) => `${path} matched by "${pattern}" at ${source}:${line}`),
  );
  assert.deepEqual(
    offenders,
    [],
    `trailing-slash rules skip symlinks, so the link shows as untracked: ${offenders.join('; ')}`,
  );
});

test('git tracks nothing under any TOP_PATHS entry', () => {
  const offenders = tracked(topPaths());
  assert.deepEqual(offenders, [], `tracked by git: ${offenders.join(', ')}`);
});

test(`git ignores the probe path ${PROBE}, so the project rule exists even with no projects`, () => {
  assert.ok(isIgnored(PROBE), `${PROBE} is not ignored; .gitignore needs a projects/*/.claude rule`);
});

test('git ignores every project .claude path and tracks nothing under it', () => {
  const paths = projectPaths();
  const offenders = [
    ...notIgnored(paths).map((path) => `${path} is not ignored`),
    ...tracked(paths).map((path) => `${path} is tracked`),
  ];
  assert.deepEqual(offenders, [], offenders.join('; '));
});
