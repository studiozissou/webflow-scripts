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

const pathA = () => between('### Path A', '### Path B');
const goalPipeline = () => between('#### Path A: goal clients', '#### Path A: clients with no goal plan');

test('Path A picks goal-report.md only when goals.json exists, and the old template otherwise', () => {
  const a = pathA();
  assert.match(a, /Template choice/);
  assert.match(a, /projects\/\{client\}\/\.claude\/reports\/goals\.json/);
  const exists = a.slice(a.indexOf('It exists'), a.indexOf('It does not exist'));
  const missing = a.slice(a.indexOf('It does not exist'), a.indexOf('#### Path A: goal clients'));
  assert.ok(exists.includes('.claude/templates/goal-report.md'));
  assert.ok(!exists.includes('site-audit-monthly-report.md'));
  assert.ok(missing.includes('.claude/templates/site-audit-monthly-report.md'));
  assert.ok(!missing.includes('goal-report.md'));
});

test('the old monthly path is still there, unchanged in its steps', () => {
  const old = between('#### Path A: clients with no goal plan', '### Path B');
  assert.ok(old.includes('Read and follow the template at `.claude/templates/site-audit-monthly-report.md`'));
  assert.ok(old.includes('Generate `comms/site-report-YYYY-MM.md` (month-stamped, not date-stamped).'));
  assert.ok(old.includes('Load the `humanizer` skill'));
});

test('Path B and the report-type gate are intact', () => {
  const b = between('### Path B', '### Step: Notion push');
  assert.ok(b.includes('.claude/templates/site-audit-client-report.md'));
  assert.ok(b.includes('Effort columns must be filled in'));
  assert.ok(between('## Phase 7', '### Path A').includes('**C) Both**'));
});

test('the goal pipeline runs in the agreed order', () => {
  const p = goalPipeline();
  const steps = [
    'tools/site-report/report-data.js',
    'tools/site-report/collect.js',
    'charts-spec.json',
    'tools/site-report/charts.py',
    'notion-create-file-upload',
    '`comms/site-report-YYYY-MM.md`',
    'tools/site-report/wordcount.js',
    'Opus review cycle',
    'tools/site-report/review-log.js',
    'Copy review',
    'humanizer',
    '`creation_mode: "draft"`',
  ];
  let at = -1;
  for (const step of steps) {
    const i = p.indexOf(step, at + 1);
    assert.ok(i > at, `${step} is missing or out of order`);
    at = i;
  }
});

test('the review cycle is logged, capped at 3, and gates the push', () => {
  const p = goalPipeline();
  assert.match(p, /review-YYYY-MM\.md/);
  assert.match(p, /\[applied\|rejected\] <finding> — <what changed or why not>/);
  assert.match(p, /up to 3 cycles/i);
  assert.match(p, /80 or above/);
  assert.match(p, /does not go to Notion until/i);
  assert.ok(p.indexOf('review-log.js') < p.indexOf('`creation_mode: "draft"`'));
  assert.match(p, /--require-copy/);
  assert.match(p, /design-critic/);
  assert.match(p, /may not push the report past the word cap/i);
});

test('collect gaps become No data, never a guess, and collect is skipped in sample mode', () => {
  const p = goalPipeline();
  assert.match(p, /"No data"/);
  assert.match(p, /Never fill a gap\s+with a guess/);
  assert.match(p, /skip it with `--sample`/);
  assert.match(p, /--mcp/);
});

test('the command documents --report-only and --sample', () => {
  const flags = between('## Flags', '## Re-entry check');
  assert.match(flags, /`--report-only`[\s\S]*skip Phases 1-6/);
  assert.match(flags, /`--sample`[\s\S]*no `metrics-\*\.json`/);
  assert.match(between('## Re-entry check', '## Phase 1'), /--report-only/);
  assert.match(between('## Phase 7', '### Path A'), /--report-only/);
});

test('Verification covers the goal-report path', () => {
  const v = between('## Verification', '\u0000');
  assert.match(v, /goals\.json.*goal-report\.md|goal-report\.md.*goals\.json/s);
  assert.match(v, /review-log\.js/);
  assert.match(v, /--report-only/);
  assert.match(v, /wordcount\.js/);
});

test('--unattended is documented in Flags and asks nothing', () => {
  const flags = between('## Flags', '## Re-entry check');
  assert.match(flags, /`--unattended`/);
  assert.match(flags, /asks nothing/i);
  assert.match(flags, /private draft/i);
  assert.match(flags, /report-YYYY-MM\.done/);
});

test('Path A with --unattended has no gate, no iteration and no push question', () => {
  const p = goalPipeline();
  assert.match(p, /With `--unattended`/);
  const unattended = p.slice(p.indexOf('With `--unattended`'));
  assert.match(unattended, /no A\/B\/C gate/i);
  assert.match(unattended, /no "iterate until approved"/i);
  assert.match(unattended, /no "Push to Notion\?"/i);
  assert.match(unattended, /private draft/i);
  assert.match(unattended, /not .*Notes database/i);
});

test('--unattended writes the .done file only after a successful push', () => {
  const p = goalPipeline();
  const at = p.indexOf('report-YYYY-MM.done');
  assert.ok(at > p.indexOf('`creation_mode: "draft"`'), 'the .done file comes after the push step');
  assert.match(p.slice(at - 200, at + 300), /projects\/\{client\}\/\.claude\/reports\/report-YYYY-MM\.done/);
  assert.match(p, /only after .*push/i);
});

test('the report-type gate and the push question are skipped with --unattended', () => {
  assert.match(between('## Phase 7', '### Path A'), /--unattended/);
  assert.match(between('### Step: Notion push', '\u0000'), /--unattended/);
});
