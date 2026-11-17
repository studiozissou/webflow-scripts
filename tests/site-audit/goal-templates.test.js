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

test('the plan template sizes work in T-shirt sizes, never hours', () => {
  const t = read(PLAN);
  assert.match(t, /\| Size \|/, 'the work table needs a Size column');
  assert.match(t, /S, M, L or XL/);
  for (const size of ['**S**', '**M**', '**L**', '**XL**']) assert.ok(t.includes(size), `missing the ${size} definition`);
  assert.doesNotMatch(t, /\bhours?\b/i, 'sizes replace hours');
});

test('the report template makes the small business the default and multi-location the variant', () => {
  const t = read(REPORT);
  assert.match(t, /default is a small business/i);
  assert.match(t, /\*\*Multi-location\*\*/);
  assert.match(t, /enquiries from Google/i);
  assert.match(t, /core searches against page one/i);
  assert.ok(t.indexOf('default is a small business') < t.indexOf('**Multi-location:**'), 'the default comes first');
});

test('the report template spells out the logged review cycle', () => {
  const t = read(REPORT);
  assert.match(t, /review-YYYY-MM\.md/);
  assert.match(t, /\[applied\|rejected\] <finding> — <what changed or why not>/);
  assert.match(t, /up to 3 cycles/i);
  assert.match(t, /80 or above/);
  assert.match(t, /review-log\.js/);
  assert.match(t, /wordcount\.js/);
  assert.match(t, /copy review[\s\S]*design-critic/i);
  const gate = t.indexOf('review-log.js');
  assert.ok(t.indexOf('wordcount.js') < t.indexOf('reviewer pass'), 'the word gate comes before the reviewer');
  assert.ok(t.indexOf('reviewer pass') < gate && gate < t.indexOf('copy review (design-critic', gate), 'reviewer, log gate, then copy review');
});

test('the report template keeps sample figures out of the metrics files', () => {
  const t = read(REPORT);
  assert.match(t, /sample-YYYY-MM\.json/);
  assert.match(t, /never writes a\s+`metrics-YYYY-MM\.json`/);
  assert.match(t, /"No data" never carries a †/);
});

test('the plan template names the profiles and the review cycle', () => {
  const t = read(PLAN);
  assert.match(t, /default is a small business/i);
  assert.match(t, /\*\*Multi-location\*\*/);
  assert.match(t, /5 to 8 goals/);
  assert.match(t, /up to 15 goals/);
  assert.match(t, /`profile`/);
  assert.match(t, /## Checks before sharing/);
  assert.match(t, /\[applied\|rejected\]/);
  assert.match(t, /review-log\.js/);
});

test('neither template names a client', () => {
  for (const p of [REPORT, PLAN]) assert.doesNotMatch(read(p), CLIENTS, `${p} names a client`);
});
