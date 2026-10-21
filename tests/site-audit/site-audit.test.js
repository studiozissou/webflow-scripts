// Structural checks for the /site-audit command: Stream B runs the crosslink scan, the merge expects its CSV, and Verification checks it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const text = readFileSync(join(ROOT, '.claude', 'commands', 'site-audit.md'), 'utf8');

const between = (start, end) => {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `missing ${start}`);
  const to = text.indexOf(end, from + start.length);
  return text.slice(from, to >= 0 ? to : undefined);
};

test('Stream B runs the crosslink scan using the /sme-audit method', () => {
  const streamB = between('### Stream B', '### Stream C');
  assert.match(streamB, /Crosslink/);
  assert.ok(streamB.includes('/sme-audit'));
  assert.ok(streamB.includes('research/crosslink-opportunities-YYYY-MM-DD.csv'));
});

test('the merge step expects the crosslink CSV', () => {
  assert.ok(between('### Merge results', '## Phase 5').includes('research/crosslink-opportunities-YYYY-MM-DD.csv'));
});

test('Verification checks the crosslink scan ran and became tasks', () => {
  assert.match(between('## Verification', '\u0000'), /crosslink/i);
});
