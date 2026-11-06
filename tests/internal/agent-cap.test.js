// Tests for .claude/scripts/agent-cap.mjs, the PreToolUse hook that refuses agents at high 5-hour usage.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUsage } from '../../.claude/scripts/agent-cap.mjs';

const CAP = join(dirname(fileURLToPath(import.meta.url)), '../../.claude/scripts/agent-cap.mjs');

let dir, file;

const run = () => spawnSync(process.execPath, [CAP], {
  input: JSON.stringify({ tool_name: 'Agent', tool_input: {} }),
  env: { ...process.env, AGENT_CAP_FILE: file },
  encoding: 'utf8',
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agent-cap-'));
  file = join(dir, 'usage-5h');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('allows when the usage file is missing', () => {
  assert.equal(run().status, 0);
});

test('allows at 50%', () => {
  writeFileSync(file, '50\n');
  assert.equal(run().status, 0);
});

test('blocks at 80% and names the usage', () => {
  writeFileSync(file, '80 1730900000\n');
  const r = run();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /80%/);
  assert.match(r.stderr, /inline with Grep and Read/);
});

test('blocks at exactly the 75% limit', () => {
  writeFileSync(file, '75');
  assert.equal(run().status, 2);
});

test('allows a reading older than ten minutes', () => {
  writeFileSync(file, '80');
  const old = new Date(Date.now() - 11 * 60 * 1000);
  utimesSync(file, old, old);
  assert.equal(run().status, 0);
});

test('allows an unreadable or non-numeric file', () => {
  writeFileSync(file, 'garbage');
  assert.equal(run().status, 0);
  rmSync(file);
  writeFileSync(join(dir, 'x'), '');
  file = dir;
  assert.equal(run().status, 0, 'a directory is unreadable as a file');
});

test('parseUsage takes the first number', () => {
  assert.equal(parseUsage('usage 82.5% at 10:00'), 82.5);
  assert.equal(parseUsage('none'), null);
});
