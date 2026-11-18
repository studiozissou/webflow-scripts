// Tests the security-hardening rules for hosted script tags, the Claude permission allow list and GitHub workflow permissions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const FORBIDDEN_RULES = ['Bash(node *)', 'Bash(npx *)', 'Bash(python3 *)', 'Bash(npm *)'];

const REQUIRED_RULES = [
  'Bash(node --test *)',
  'Bash(node --check *)',
  'Bash(node --version)',
  'Bash(node tools/*)',
  'Bash(npx eslint *)',
  'Bash(npx prettier *)',
  'Bash(npm test*)',
  'Bash(npm run *)',
  'Bash(npm ci)',
  'Bash(npm audit*)',
  'Bash(npm ls*)',
];

const branchReferences = () => {
  const r = spawnSync('git', ['grep', '-nE', 'webflow-scripts@(main|master|latest)/', '--', ':!tests'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.ok(
    r.status === 0 || r.status === 1,
    `git grep failed: ${r.error?.message ?? r.stderr}`,
  );
  return r.stdout.split('\n').filter(Boolean);
};

const allowList = () => {
  const settings = JSON.parse(readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'));
  return settings.permissions?.allow ?? [];
};

const workflowFiles = () =>
  readdirSync(join(ROOT, '.github/workflows')).filter((name) => /\.ya?ml$/.test(name));

test('no tracked file outside tests loads a hosted script from a branch', () => {
  const matches = branchReferences();
  assert.deepEqual(matches, [], `branch-pinned script references:\n${matches.join('\n')}`);
});

test('project allow list has no blanket interpreter or package-runner rule', () => {
  const allow = allowList();
  const present = FORBIDDEN_RULES.filter((rule) => allow.includes(rule));
  const missing = REQUIRED_RULES.filter((rule) => !allow.includes(rule));
  assert.deepEqual(present, [], `blanket rules present: ${present.join(', ')}`);
  assert.deepEqual(missing, [], `scoped rules missing: ${missing.join(', ')}`);
});

test('every GitHub workflow declares top-level permissions', () => {
  const files = workflowFiles();
  assert.ok(files.length > 0, 'no workflow files in .github/workflows');
  const without = files.filter(
    (name) => !/^permissions:/m.test(readFileSync(join(ROOT, '.github/workflows', name), 'utf8')),
  );
  assert.deepEqual(without, [], `no top-level permissions: ${without.join(', ')}`);
});
