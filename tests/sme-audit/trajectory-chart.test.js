// Checks the /sme-audit traffic trajectory chart: it draws measured history plus do-nothing and every-fix projection bands, validates its input, and is wired into the skill and report template.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildTrajectoryChart } from '../../tools/sme-audit/trajectory-chart.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

const sample = () => ({
  history: [
    { month: '2025-10', visits: 85 },
    { month: '2025-11', visits: 78 },
    { month: '2025-12', visits: 85 },
    { month: '2026-01', visits: 64 },
    { month: '2026-02', visits: 64 },
    { month: '2026-03', visits: 78 },
    { month: '2026-04', visits: 78 },
    { month: '2026-05', visits: 65 },
    { month: '2026-06', visits: 42 },
    { month: '2026-07', visits: 67 },
    { month: '2026-08', visits: 72 },
    { month: '2026-09', visits: 84 },
  ],
  doNothing: [
    { after: 1, low: 70, high: 85 },
    { after: 3, low: 65, high: 85 },
    { after: 6, low: 60, high: 85 },
    { after: 12, low: 55, high: 85 },
  ],
  everyFix: [
    { after: 1, low: 90, high: 100 },
    { after: 3, low: 110, high: 140 },
    { after: 6, low: 170, high: 280 },
    { after: 12, low: 250, high: 500 },
  ],
});

test('the chart draws measured history and both projection bands with direct labels', () => {
  const svg = buildTrajectoryChart(sample());
  assert.match(svg, /^<svg [^>]*viewBox="0 0 960 540"/);
  assert.equal((svg.match(/<polygon /g) || []).length, 2);
  for (const label of ['Measured', 'Do nothing', 'Every fix', 'Today']) assert.ok(svg.includes(label), label);
  assert.ok(svg.includes('250–500 a month'));
  assert.ok(svg.includes('55–85 a month'));
  assert.ok(svg.includes('Measured: 42–85, average 72'));
});

test('the chart uses the validated categorical pair and a neutral ink for history', () => {
  const svg = buildTrajectoryChart(sample());
  assert.ok(svg.includes('#2a78d6'));
  assert.ok(svg.includes('#eb6834'));
  assert.ok(svg.includes('#1f1f1e'));
});

test('the y axis grows to fit the highest projection', () => {
  const data = sample();
  data.everyFix[3].high = 1200;
  const svg = buildTrajectoryChart(data);
  assert.ok(svg.includes('>1200<') || svg.includes('>1250<'));
});

test('the chart rejects missing history or projections', () => {
  assert.throws(() => buildTrajectoryChart({ ...sample(), history: [] }), /history/);
  assert.throws(() => buildTrajectoryChart({ ...sample(), everyFix: [] }), /everyFix/);
  assert.throws(() => buildTrajectoryChart({ ...sample(), doNothing: undefined }), /doNothing/);
});

test('the report template has the trajectory section under Looking ahead', () => {
  const text = read('.claude', 'templates', 'sme-audit-report.md');
  const ahead = text.indexOf('## Looking ahead');
  const section = text.indexOf('### Where your visits are heading');
  const next = text.indexOf('## What we need from you');
  assert.ok(ahead > -1 && section > ahead && section < next, 'section placed under Looking ahead');
  assert.ok(text.includes('traffic-trajectory-{{yyyy_mm}}.png'));
  assert.ok(text.includes('If nothing changes'));
  assert.ok(text.includes('With every fix in the plan'));
});

test('the skill pulls traffic history and builds the projection chart', () => {
  const text = read('.claude', 'skills', 'sme-audit', 'SKILL.md');
  assert.ok(text.includes('resource_rank_history'));
  assert.ok(text.includes('tools/sme-audit/trajectory-chart.js'));
  assert.match(text, /do nothing/i);
  assert.match(text, /every fix/i);
});

test('the chart script carries no client names or prices', () => {
  const banned = /rolfing|janco|oost|carsa|€\s?\d|\d+\s?euro|@[a-z0-9-]+\.(nl|com|co\.uk)/i;
  assert.doesNotMatch(read('tools', 'sme-audit', 'trajectory-chart.js'), banned);
});
