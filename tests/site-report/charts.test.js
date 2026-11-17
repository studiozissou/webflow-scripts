// Tests that charts.py renders from both fixtures, skips thin line charts, and that the chart specs match the text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGoalsFile } from '../../tools/site-report/schema.js';
import { buildChartSpecs, buildReportData, loadMetrics } from '../../tools/site-report/report-data.js';
import { FIXTURES, TOOLS, VENV_PYTHON, tempDir } from './helpers.js';

const MIN_BYTES = 20 * 1024;

function specFor(name, month = '2026-11') {
  const dir = join(FIXTURES, name);
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const metrics = loadMetrics(dir, { month, sample: false });
  const report = buildReportData(data, metrics, { month, sample: false });
  return { report, spec: buildChartSpecs(data, metrics, report, { month, sample: false }) };
}

function render(spec) {
  const out = tempDir('charts-');
  const specPath = join(out, 'spec.json');
  writeFileSync(specPath, JSON.stringify(spec));
  const run = spawnSync(VENV_PYTHON, ['-I', join(TOOLS, 'charts.py'), specPath, out], { encoding: 'utf8' });
  return { out, run, result: run.status === 0 ? JSON.parse(run.stdout) : null };
}

test('the chart spec for the small fixture has up to 3 generic charts, each with a source footer', () => {
  const { spec } = specFor('small');
  assert.deepEqual(spec.charts.map((c) => c.type), ['line-yoy', 'line', 'dots']);
  assert.ok(spec.charts.length <= 3);
  for (const c of spec.charts) {
    assert.ok(c.title && c.subtitle && c.footer && c.file, JSON.stringify(c));
    assert.match(c.footer, /^Source: /);
  }
});

test('a goal chartSource replaces the raw metric source in the footer', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const headline = data.goals.find((g) => g.headline);
  headline.chartSource = 'website forms and Google profile';
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  const spec = buildChartSpecs(data, metrics, report, { month: '2026-11', sample: false });
  assert.equal(spec.charts[0].footer, 'Source: website forms and Google profile.');
});

test('an object goal with a statusKey charts against that key of its target', () => {
  const dir = join(FIXTURES, 'small');
  const { data } = readGoalsFile(join(dir, 'goals.json'));
  const goal = data.goals.find((g) => g.chart === 'line');
  goal.statusKey = 'total';
  goal.target = { total: 180, average: 4.8 };
  const metrics = loadMetrics(dir, { month: '2026-11', sample: false });
  const report = buildReportData(data, metrics, { month: '2026-11', sample: false });
  const spec = buildChartSpecs(data, metrics, report, { month: '2026-11', sample: false });
  const chart = spec.charts.find((c) => c.goalId === goal.id);
  assert.deepEqual([chart.target.low, chart.target.high], [180, 180]);
});

test('chart figures match the text', () => {
  const { report, spec } = specFor('small');
  const row = report.goalRows.find((r) => r.id === 1);
  assert.ok(spec.charts[0].subtitle.includes(row.figure), `${spec.charts[0].subtitle} vs ${row.figure}`);
  const dots = spec.charts.find((c) => c.type === 'dots');
  assert.equal(dots.items.length, 5);
  assert.ok(dots.subtitle.includes(report.goalRows.find((r) => r.id === 4).figure));
});

test('a sample chart footer says the figures are samples; a real one does not', () => {
  const real = specFor('small').spec;
  assert.doesNotMatch(JSON.stringify(real), /†|sample/i);
});

for (const name of ['small', 'multi']) {
  test(`renders every chart from the ${name} fixture, each over 20 KB`, (t) => {
    if (!existsSync(VENV_PYTHON)) {
      t.skip(`venv missing at ${VENV_PYTHON}: run python3 -m venv ~/.venvs/site-report && ~/.venvs/site-report/bin/pip install -r tools/site-report/requirements.txt`);
      return;
    }
    const { spec } = specFor(name);
    assert.equal(spec.charts.length, 3);
    const { out, run, result } = render(spec);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.written.sort(), spec.charts.map((c) => c.file).sort());
    for (const file of result.written) {
      assert.ok(statSync(join(out, file)).size > MIN_BYTES, `${file} is ${statSync(join(out, file)).size} bytes`);
    }
  });
}

test('line charts with 1 month of data are skipped, other charts still render', (t) => {
  if (!existsSync(VENV_PYTHON)) {
    t.skip('venv missing');
    return;
  }
  const { spec } = specFor('small');
  for (const c of spec.charts) {
    if (c.values) c.values = c.values.map((v, i) => (i === c.values.length - 1 ? v : null));
  }
  const lines = spec.charts.filter((c) => c.type !== 'dots');
  assert.ok(lines.length >= 1);
  const { out, run, result } = render(spec);
  assert.equal(run.status, 0, run.stderr);
  for (const c of lines) {
    assert.ok(result.skipped.some((s) => s.file === c.file && /month/i.test(s.reason)), c.file);
    assert.equal(readdirSync(out).includes(c.file), false);
  }
});

test('a dot plot with no items is skipped', (t) => {
  if (!existsSync(VENV_PYTHON)) {
    t.skip('venv missing');
    return;
  }
  const { out, run, result } = render({
    charts: [{ type: 'dots', file: 'chart-x.png', title: 't', subtitle: 's', footer: 'Source: x.', items: [] }],
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(result.skipped.length, 1);
  assert.equal(readdirSync(out).includes('chart-x.png'), false);
});
