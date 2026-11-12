// Guards the goal-led report and goal plan templates: each carries the agreed rules, and neither names a client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPORT = join(ROOT, '.claude', 'templates', 'goal-report.md');
const PLAN = join(ROOT, '.claude', 'templates', 'goal-plan.md');
const read = (p) => readFileSync(p, 'utf8');
const CLIENTS = /carsa|oost|rolfing|tamsen|coconut|jay ?shetty|ready ?hit ?play|\brhp\b|\bnem\b/i;

test('both templates exist', () => {
  assert.ok(existsSync(REPORT), 'missing goal-report.md');
  assert.ok(existsSync(PLAN), 'missing goal-plan.md');
});

test('the report template keeps the section order', () => {
  const t = read(REPORT);
  const order = ['## Summary', '## Progress to', '## What we did this month', '## Next month', '## Site health', '## What we need from', '## Reference'];
  let at = -1;
  for (const h of order) {
    const i = t.indexOf(h);
    assert.ok(i > at, `${h} missing or out of order`);
    at = i;
  }
});

test('the report template states the length and wording rules', () => {
  const t = read(REPORT);
  assert.match(t, /800 visible words/);
  assert.match(t, /ASD-STE100/);
  assert.match(t, /<toggle heading="h3">/);
  assert.match(t, /1\\\. /, 'numbered toggle titles must be escaped');
  assert.doesNotMatch(t, /\{toggle="true"\}/);
});

test('the report template states the task, health and tone rules', () => {
  const t = read(REPORT);
  assert.match(t, /unblock/i);
  assert.match(t, /impact/i);
  assert.match(t, /no phase tag/i);
  assert.match(t, /Done when/);
  assert.match(t, /one Site health accordion/i);
  assert.match(t, /only completed work/i);
  assert.match(t, /no time estimates/i);
  assert.match(t, /chasing/i);
  assert.match(t, /proposed/i);
  assert.match(t, /same month last year/i);
  assert.match(t, /Always, once the report is written[\s\S]*reviewer pass/, 'every report gets a reviewer pass');
  assert.doesNotMatch(t, /\bstep 0\b|\bstep 1\b/i, 'use "phase", never "step"');
});

test('the plan template defines goals by phase and tasks with blocks and impact', () => {
  const t = read(PLAN);
  for (const h of ['## The goal', '## Where', '## The plan in phases', '## Goals for the monthly report', '## The work', '## What runs itself', '## What to expect', '## Risks', '## What we need from', '## Sources']) {
    assert.ok(t.includes(h), `missing ${h}`);
  }
  assert.match(t, /blocks/);
  assert.match(t, /impact/i);
  assert.match(t, /owner/i);
  assert.match(t, /realistic/i);
});

test('neither template names a client', () => {
  for (const p of [REPORT, PLAN]) assert.doesNotMatch(read(p), CLIENTS, `${p} names a client`);
});
