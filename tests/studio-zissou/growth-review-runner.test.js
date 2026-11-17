// Guards the unattended /growth-review runner: the tool allowlist, the autopilot.off kill switch, the single-run lock, the live-publish switch and the Monday 08:00 launchd schedule.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'growth-review.sh');
const PLIST = join(ROOT, 'scripts', 'growth-review.plist');

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

const FAKE_CLAUDE = `#!/usr/bin/env node
const fs = require('fs');
fs.appendFileSync(process.env.FAKE_MARKER, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), scheduled: process.env.GROWTH_SCHEDULED || null, live: process.env.SZ_GROWTH_LIVE ?? null, apiKey: process.env.ANTHROPIC_API_KEY || null }) + '\\n');
process.stdout.write('fake growth report\\n');
`;

function fakeClaude() {
  const bin = tmp('growth-bin-');
  const path = join(bin, 'claude');
  writeFileSync(path, FAKE_CLAUDE);
  chmodSync(path, 0o755);
  const marker = join(bin, 'calls.jsonl');
  return { path, marker, calls: () => (existsSync(marker) ? readFileSync(marker, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []) };
}

function szRepo({ off = false, allowlist = true } = {}) {
  const repo = tmp('growth-repo-');
  const sz = join(repo, 'projects', 'studio-zissou', '.claude');
  mkdirSync(join(sz, 'experiments'), { recursive: true });
  mkdirSync(join(sz, 'growth-review'), { recursive: true });
  if (off) writeFileSync(join(sz, 'experiments', 'autopilot.off'), '');
  if (allowlist) writeFileSync(join(sz, 'growth-review', 'allowed-tools.txt'), '# growth tools\nRead\nBash(node tools/studio-zissou/*)\n');
  return { repo, sz };
}

function runScript(fake, repo, extra = {}) {
  return spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_BIN: fake.path, FAKE_MARKER: fake.marker, GROWTH_REPO: repo, ANTHROPIC_API_KEY: 'should-be-unset', ...extra },
  });
}

test('runs claude -p /growth-review in the repo with the allowlist and GROWTH_SCHEDULED=1', () => {
  const fake = fakeClaude();
  const { repo, sz } = szRepo();
  const r = runScript(fake, repo, { GROWTH_ARGS: '' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [call] = fake.calls();
  assert.equal(call.args[0], '-p');
  assert.equal(call.args[1], '/growth-review');
  assert.ok(call.args.includes('--allowedTools'));
  assert.ok(call.args.includes('Bash(node tools/studio-zissou/*)'));
  assert.ok(!call.args.includes('--dangerously-skip-permissions'));
  assert.equal(call.scheduled, '1');
  assert.equal(call.apiKey, null);
  const runs = readdirSync(join(sz, 'reports'));
  assert.equal(runs.length, 1);
  assert.match(readFileSync(join(sz, 'reports', runs[0]), 'utf8'), /fake growth report/);
});

test('GROWTH_ARGS is appended to the prompt', () => {
  const fake = fakeClaude();
  const { repo } = szRepo();
  const r = runScript(fake, repo, { GROWTH_ARGS: '--dry-run' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fake.calls()[0].args[1], '/growth-review --dry-run');
});

test('autopilot.off still runs, but read-only with --dry-run', () => {
  const fake = fakeClaude();
  const { repo } = szRepo({ off: true });
  const r = runScript(fake, repo, { GROWTH_ARGS: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fake.calls()[0].args[1], '/growth-review --dry-run');
});

test('autopilot.off does not add a second --dry-run', () => {
  const fake = fakeClaude();
  const { repo } = szRepo({ off: true });
  runScript(fake, repo, { GROWTH_ARGS: '--dry-run' });
  assert.equal(fake.calls()[0].args[1], '/growth-review --dry-run');
});

test('refuses to run without a tool allowlist', () => {
  const fake = fakeClaude();
  const { repo } = szRepo({ allowlist: false });
  const r = runScript(fake, repo);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /allowlist/);
  assert.equal(fake.calls().length, 0);
});

test('SZ_GROWTH_LIVE defaults to 0 and is passed through when set', () => {
  const fake = fakeClaude();
  const { repo } = szRepo();
  const env = { ...process.env };
  delete env.SZ_GROWTH_LIVE;
  spawnSync('bash', [SCRIPT], { encoding: 'utf8', env: { ...env, CLAUDE_BIN: fake.path, FAKE_MARKER: fake.marker, GROWTH_REPO: repo } });
  runScript(fake, repo, { SZ_GROWTH_LIVE: '1' });
  const [first, second] = fake.calls();
  assert.equal(first.live, '0');
  assert.equal(second.live, '1');
});

test('a live lock holder stops a second run; a stale lock is cleared', () => {
  const fake = fakeClaude();
  const { repo, sz } = szRepo();
  const lock = join(sz, 'experiments', 'growth-review.lock');
  mkdirSync(lock);
  writeFileSync(join(lock, 'pid'), String(process.pid));
  const held = runScript(fake, repo);
  assert.equal(held.status, 0);
  assert.match(held.stderr, /already running/);
  assert.equal(fake.calls().length, 0);
  writeFileSync(join(lock, 'pid'), '999999');
  const stale = runScript(fake, repo);
  assert.equal(stale.status, 0, stale.stderr);
  assert.equal(fake.calls().length, 1);
  assert.ok(!existsSync(lock));
});

test('plist runs growth-review.sh Monday 08:00 only, not at load, dry-run and live off by default', () => {
  const p = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', PLIST], { encoding: 'utf8' }));
  assert.equal(p.Label, 'io.teamzissou.growth-review');
  assert.match(p.ProgramArguments.at(-1), /scripts\/growth-review\.sh$/);
  assert.deepEqual(p.StartCalendarInterval, [{ Weekday: 1, Hour: 8, Minute: 0 }]);
  assert.equal(p.RunAtLoad, false);
  assert.equal(p.EnvironmentVariables.GROWTH_ARGS, '--dry-run');
  assert.equal(p.EnvironmentVariables.SZ_GROWTH_LIVE, '0');
  assert.match(p.StandardOutPath, /growth-review\.log$/);
});
