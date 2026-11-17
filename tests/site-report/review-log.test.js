// Tests for the review-log gate: statuses, reasons, the last cycle, the cycle cap and the exit code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkReviewLog } from '../../tools/site-report/review-log.js';
import { TOOLS, tempDir } from './helpers.js';

const clean = [
  '# Review log 2026-11',
  '',
  '## Cycle 1',
  '',
  '- [applied] Goal 4 sits in the wrong phase — moved it to phase 1.',
  '- [rejected] Use "enquiries" in the summary — the client says "leads", so we keep it.',
  '',
  '## Cycle 2',
  '',
  'No findings.',
  '',
].join('\n');

test('passes a log where every finding is actioned and the last cycle is clear', () => {
  const r = checkReviewLog(clean);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('fails on a finding with no status', () => {
  const r = checkReviewLog(clean.replace('- [applied]', '-'));
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /no status/i);
});

test('fails on an unknown status', () => {
  const r = checkReviewLog(clean.replace('[applied]', '[maybe]'));
  assert.equal(r.ok, false);
});

test('fails on a rejection with no reason', () => {
  for (const line of ['- [rejected] Use enquiries in the summary', '- [rejected] Use enquiries in the summary — ']) {
    const r = checkReviewLog(clean.replace(/- \[rejected\].*/, line));
    assert.equal(r.ok, false, line);
    assert.match(r.errors.join('\n'), /reason/i);
  }
});

test('fails on an open finding in the last cycle', () => {
  const r = checkReviewLog(`${clean}\n## Cycle 3\n\n- [open] Chart 2 disagrees with the table (score 85)\n`);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /open/i);
});

test('fails when a cycle has neither findings nor the no-findings line, and on an empty log', () => {
  assert.equal(checkReviewLog(`${clean}\n## Cycle 3\n\n`).ok, false);
  assert.equal(checkReviewLog('# Review log\n').ok, false);
});

test('fails over 3 cycles', () => {
  const four = ['1', '2', '3', '4'].map((n) => `## Cycle ${n}\n\nNo findings.\n`).join('\n');
  const r = checkReviewLog(four);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /3 cycles/);
});

test('the copy review is checked the same way, and is required only on request', () => {
  const copy = `${clean}\n## Copy review\n\n- [applied] Shorten the goal callout — now 19 words.\n`;
  assert.equal(checkReviewLog(copy, { requireCopy: true }).ok, true);
  assert.equal(checkReviewLog(clean, { requireCopy: true }).ok, false);
  assert.equal(checkReviewLog(clean).ok, true);
  const bad = `${clean}\n## Copy review\n\n- [open] Fix the heading\n`;
  assert.equal(checkReviewLog(bad).ok, false);
});

test('the CLI exits 0 on a clean log and 1 on a breach', () => {
  const dir = tempDir();
  const good = join(dir, 'review-2026-11.md');
  const bad = join(dir, 'review-2026-12.md');
  writeFileSync(good, clean);
  writeFileSync(bad, clean.replace('- [applied]', '-'));
  const run = (file) => spawnSync(process.execPath, [join(TOOLS, 'review-log.js'), file], { encoding: 'utf8' });
  assert.equal(run(good).status, 0);
  assert.equal(run(bad).status, 1);
  assert.equal(run(join(dir, 'missing.md')).status, 1);
});
