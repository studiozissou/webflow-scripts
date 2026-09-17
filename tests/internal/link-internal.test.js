// Tests for scripts/link-internal.sh, which symlinks private internal docs into a checkout.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, lstatSync, readlinkSync, existsSync, rmSync, cpSync, realpathSync, utimesSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../../scripts/link-internal.sh');

let base, repo, internal;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();
const put = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
const run = (cwd, ...args) => spawnSync('bash', [join(cwd, 'scripts/link-internal.sh'), ...args], {
  cwd,
  env: { ...process.env, WEBFLOW_INTERNAL: internal },
  encoding: 'utf8',
});
const isLinkTo = (path, target) => lstatSync(path).isSymbolicLink() && readlinkSync(path) === target;

beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'link-internal-')));
  repo = join(base, 'public');
  internal = join(base, 'internal');

  put(join(internal, 'projects/acme/.claude/specs/a.md'), 'spec a');
  put(join(internal, '.claude/specs/x.md'), 'top spec');
  put(join(internal, '.claude/queue.json'), '{}');

  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@t');
  git(repo, 'config', 'user.name', 't');
  cpSync(SCRIPT, join(repo, 'scripts/link-internal.sh'));
  put(join(repo, '.gitignore'), 'projects/*/.claude\n.claude/specs\n.claude/queue.json\n');
  put(join(repo, 'projects/acme/app.js'), 'code');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');
});

afterEach(() => rmSync(base, { recursive: true, force: true }));

test('links client and top-level internal paths to the private checkout', () => {
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(isLinkTo(join(repo, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
  assert.ok(isLinkTo(join(repo, '.claude/specs'), join(internal, '.claude/specs')));
  assert.ok(isLinkTo(join(repo, '.claude/queue.json'), join(internal, '.claude/queue.json')));
  assert.equal(readFileSync(join(repo, 'projects/acme/.claude/specs/a.md'), 'utf8'), 'spec a');
});

test('is idempotent', () => {
  run(repo);
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(isLinkTo(join(repo, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
});

test('replaces a real folder whose files all exist unchanged in the private checkout', () => {
  put(join(repo, 'projects/acme/.claude/specs/a.md'), 'spec a');
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(isLinkTo(join(repo, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
});

test('treats files with the same content but different timestamps as unchanged', () => {
  const file = join(repo, 'projects/acme/.claude/specs/a.md');
  put(file, 'spec a');
  utimesSync(file, new Date('2020-01-01'), new Date('2020-01-01'));
  chmodSync(file, 0o600);
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(isLinkTo(join(repo, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
});

test('copies new files from a real folder into the private checkout before linking', () => {
  put(join(repo, 'projects/acme/.claude/comms/new-note.md'), 'written in a worktree');
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(readFileSync(join(internal, 'projects/acme/.claude/comms/new-note.md'), 'utf8'), 'written in a worktree');
  assert.ok(isLinkTo(join(repo, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
});

test('moves a client folder that only exists in the checkout into the private checkout', () => {
  put(join(repo, 'projects/newco/.claude/client.md'), 'new client');
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(readFileSync(join(internal, 'projects/newco/.claude/client.md'), 'utf8'), 'new client');
  assert.ok(isLinkTo(join(repo, 'projects/newco/.claude'), join(internal, 'projects/newco/.claude')));
});

test('leaves a conflicting real folder alone and exits non-zero', () => {
  put(join(repo, 'projects/acme/.claude/specs/a.md'), 'edited differently');
  const r = run(repo);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /projects\/acme\/\.claude/);
  assert.ok(!lstatSync(join(repo, 'projects/acme/.claude')).isSymbolicLink());
  assert.equal(readFileSync(join(repo, 'projects/acme/.claude/specs/a.md'), 'utf8'), 'edited differently');
  assert.equal(readFileSync(join(internal, 'projects/acme/.claude/specs/a.md'), 'utf8'), 'spec a');
});

test('does nothing and exits 0 when the private checkout is missing', () => {
  rmSync(internal, { recursive: true });
  const r = run(repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout + r.stderr, /not found/);
  assert.ok(!existsSync(join(repo, 'projects/acme/.claude')));
});

test('--unlinked lists real ignored internal folders that would be lost', () => {
  put(join(repo, 'projects/acme/.claude/comms/draft.md'), 'unsaved');
  const r = run(repo, '--unlinked');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /projects\/acme\/\.claude/);
  run(repo);
  assert.equal(run(repo, '--unlinked').stdout.trim(), '');
});

test('--install-hook links internal paths in new worktrees', () => {
  const r = run(repo, '--install-hook');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const wt = join(base, 'wt');
  execFileSync('git', ['worktree', 'add', '-q', '-b', 'feature', wt], {
    cwd: repo, stdio: 'pipe', env: { ...process.env, WEBFLOW_INTERNAL: internal },
  });
  assert.ok(isLinkTo(join(wt, 'projects/acme/.claude'), join(internal, 'projects/acme/.claude')));
  assert.ok(isLinkTo(join(wt, '.claude/specs'), join(internal, '.claude/specs')));
});
