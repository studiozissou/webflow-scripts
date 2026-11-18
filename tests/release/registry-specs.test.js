// Guards the post-deploy spec picker: only runnable acceptance specs, optional since-last-deploy filter, and a reason for every skip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSpecs } from '../../tools/release/registry-specs.js';

const registry = {
  lastDeployed: '2026-11-16',
  testPages: [
    { slug: 'old', spec: 'tests/acceptance/old.spec.js', created: '2026-10-01', critical: false },
    { slug: 'crit', spec: 'tests/acceptance/crit.spec.js', created: '2026-09-01', critical: true },
    { slug: 'new', spec: 'tests/acceptance/new.spec.js', created: '2026-11-17', critical: false },
    { slug: 'gone', spec: 'tests/acceptance/gone.spec.js', created: '2026-11-17' },
    { slug: 'outside', spec: 'projects/rhp/tests/acceptance/x.spec.js', created: '2026-11-17' },
    { slug: 'doc', spec: 'tests/acceptance/notes.md', created: '2026-11-17' },
    { slug: 'nospec', created: '2026-11-17' },
    { slug: 'dupe', spec: 'tests/acceptance/new.spec.js', created: '2026-11-17' },
  ],
};
const exists = (p) => p !== 'tests/acceptance/gone.spec.js';

test('full run keeps every runnable acceptance spec once', () => {
  const { run } = selectSpecs(registry, { exists });
  assert.deepEqual(run, [
    'tests/acceptance/old.spec.js',
    'tests/acceptance/crit.spec.js',
    'tests/acceptance/new.spec.js',
  ]);
});

test('since run keeps specs created after lastDeployed plus critical ones', () => {
  const { run } = selectSpecs(registry, { exists, since: true });
  assert.deepEqual(run, ['tests/acceptance/crit.spec.js', 'tests/acceptance/new.spec.js']);
});

test('every unrunnable entry is skipped with a reason', () => {
  const { skipped } = selectSpecs(registry, { exists });
  assert.deepEqual(
    skipped.map((s) => [s.slug, s.reason]),
    [
      ['gone', 'missing file'],
      ['outside', 'outside tests/acceptance'],
      ['doc', 'not a .spec.js file'],
      ['nospec', 'no spec path'],
    ],
  );
});

test('no lastDeployed means since run takes everything runnable', () => {
  const { run } = selectSpecs({ ...registry, lastDeployed: undefined }, { exists, since: true });
  assert.equal(run.length, 3);
});
