// Turns goals.json and the metrics files into statuses, progress rows, the next-month task pick, report markup and chart specs.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readGoalsFile, reportsDir } from './schema.js';
import { runIfMain, say, warn } from './cli.js';

export const MISSING = '[to write]';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const IMPACT_RANK = { high: 0, medium: 1, low: 2 };
const MAX_NEXT_TASKS = 5;
const MAX_CHARTS = 3;
const YOY = /(higher|lower) than (the )?(same month )?last year/i;
const MARKER = '†';

export const monthIndex = (month) => {
  const [year, number] = month.split('-').map(Number);
  return year * 12 + number - 1;
};
export const addMonths = (month, count) => {
  const index = monthIndex(month) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
};
export const monthsBetween = (from, to) => monthIndex(to) - monthIndex(from);
export const monthName = (month) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];
export const windowMonths = (month, count) => Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));

export function progressBar(done, total) {
  const filled = total > 0 ? Math.min(10, Math.round((done / total) * 10)) : 0;
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export const metricKeys = (goal) => [goal.metric ?? `goal-${goal.id}`].flat();

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isYearOnYear = (goal) => typeof goal.target === 'string' && YOY.test(goal.target);

export function resolveFigure(goal, figures) {
  const figs = metricKeys(goal).map((key) => figures?.[key]);
  if (figs.some((fig) => fig === null || fig === undefined || fig.value === null || fig.value === undefined)) return null;
  if (figs.length === 1) return figs[0];
  if (figs.some((fig) => !isNumber(fig.value))) return null;
  return {
    value: figs.reduce((sum, fig) => sum + fig.value, 0),
    source: [...new Set(figs.map((fig) => fig.source).filter(Boolean))].join(' and '),
    sample: figs.every((fig) => fig.sample === false) ? false : undefined,
  };
}

export const scalarOf = (goal, value) =>
  goal.statusKey && value && typeof value === 'object' ? value[goal.statusKey] : value;

export function historyOf(goal, history) {
  const series = metricKeys(goal).map((key) => history?.[key] ?? {});
  const months = Object.keys(series[0]);
  const out = {};
  for (const month of months) {
    const values = series.map((one) => scalarOf(goal, one[month]));
    if (values.every(isNumber)) out[month] = values.reduce((sum, value) => sum + value, 0);
  }
  return out;
}

const STATUS = {
  onTrack: { key: 'on-track', label: '● On track', color: 'green' },
  behind: { key: 'behind', label: '● Behind', color: 'orange' },
  starting: { key: 'starting-point', label: '○ Starting point set', color: 'gray' },
  noData: { key: 'no-data', label: '○ No data', color: 'gray' },
  notScored: { key: 'not-scored', label: '○ Not scored yet', color: 'gray' },
};

export function goalStatus(goal, { phase, month, figures, history }) {
  if (phase?.start && monthIndex(phase.start) > monthIndex(month)) {
    return { key: 'starts', label: `○ Starts ${monthName(phase.start)}`, color: 'gray' };
  }
  const fig = resolveFigure(goal, figures);
  if (!fig) return STATUS.noData;
  const series = historyOf(goal, history);
  const earlier = Object.keys(series).filter((m) => m < month).sort();
  const sign = goal.direction === 'down' ? -1 : 1;
  const beats = (current, line) => sign * (current - line) >= 0;
  const current = isNumber(scalarOf(goal, fig.value)) ? scalarOf(goal, fig.value) : null;
  if (current === null) {
    const bare = fig.value !== null && typeof fig.value === 'object';
    return earlier.length === 0 && !bare ? STATUS.starting : STATUS.notScored;
  }
  const lastYearFigure = series[addMonths(month, -12)];
  const quarterFirst = typeof goal.target === 'string' && /\bquarter\b/i.test(goal.target) && !isNumber(lastYearFigure);
  if (isYearOnYear(goal) && !quarterFirst) {
    const lastYear = lastYearFigure;
    if (isNumber(lastYear)) return beats(current, lastYear) ? STATUS.onTrack : STATUS.behind;
    if (earlier.length === 0) return STATUS.starting;
    const result = beats(current, series[earlier.at(-1)]) ? STATUS.onTrack : STATUS.behind;
    return { ...result, basis: 'month' };
  }
  if (typeof goal.target === 'string') {
    const previous = series[addMonths(month, -3)];
    if (!isNumber(previous)) return STATUS.starting;
    return beats(current, previous) ? STATUS.onTrack : STATUS.behind;
  }
  const target = scalarOf(goal, goal.target);
  if (!isNumber(target)) return earlier.length === 0 ? STATUS.starting : STATUS.notScored;
  const given = scalarOf(goal, goal.baseline);
  let baseline = isNumber(given) ? given : null;
  if (baseline === null) {
    if (earlier.length === 0) return STATUS.starting;
    baseline = series[earlier[0]];
  }
  const start = phase?.start ?? month;
  if (monthsBetween(start, month) <= 0 && current === baseline) return STATUS.starting;
  const total = monthsBetween(start, goal.due);
  const share = total > 0 ? Math.min(1, Math.max(0, monthsBetween(start, month) / total)) : 1;
  return beats(current, baseline + (target - baseline) * share) ? STATUS.onTrack : STATUS.behind;
}

export function formatValue(value) {
  if (isNumber(value)) return value.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if ('of' in value) return `${formatValue(value.value)} of ${formatValue(value.of)}`;
    return Object.entries(value)
      .map(([key, item]) => `${formatValue(item)} ${key}`)
      .join(', ');
  }
  return String(value);
}

export function figureText(goal, { figures, history, sample, month }) {
  const fig = resolveFigure(goal, figures);
  if (!fig) return 'No data';
  let text = fig.text ?? formatValue(fig.value);
  if (isYearOnYear(goal) && !fig.text) {
    const lastYear = historyOf(goal, history)[addMonths(month, -12)];
    if (isNumber(lastYear)) text = `${text} against ${formatValue(lastYear)}`;
  }
  return sample && fig.sample !== false ? `${text} ${MARKER}` : text;
}

function changeOnLastYear(goal, { figures, history, month }) {
  const fig = resolveFigure(goal, figures);
  const lastYear = historyOf(goal, history)[addMonths(month, -12)];
  if (!fig || !isNumber(fig.value) || !isNumber(lastYear) || lastYear === 0) return '';
  const percent = Math.round(((fig.value - lastYear) / lastYear) * 100);
  return `${percent < 0 ? '−' : '+'}${Math.abs(percent)}% on last year`;
}

export const targetText = (goal) => {
  if (goal.targetLabel) return goal.targetLabel;
  if (goal.target === null || goal.target === undefined) return goal.targetNote ?? 'Set from first month';
  return formatValue(goal.target);
};

export function pickNextTasks(tasks, { phases = [], month, limit = MAX_NEXT_TASKS } = {}) {
  const phaseOrder = new Map(phases.map((phase, index) => [String(phase.id), index]));
  const phaseStart = new Map(phases.map((phase) => [String(phase.id), phase.start]));
  const open = new Set(tasks.filter((task) => !task.done).map((task) => String(task.id)));
  const rank = (task) => phaseOrder.get(String(task.phase)) ?? Number(task.phase);
  const unblocks = (task) => (task.blocks ?? []).filter((id) => open.has(String(id))).length;
  const indexed = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => {
      const start = phaseStart.get(String(task.phase));
      return !task.done && (!month || !start || start <= month);
    });
  const byImpact = (a, b) =>
    (IMPACT_RANK[a.task.impact] ?? 3) - (IMPACT_RANK[b.task.impact] ?? 3) ||
    rank(a.task) - rank(b.task) ||
    a.index - b.index;
  const blockers = indexed
    .filter(({ task }) => unblocks(task) > 0)
    .sort((a, b) => unblocks(b.task) - unblocks(a.task) || byImpact(a, b))
    .slice(0, limit);
  const chosen = new Set(blockers.map(({ task }) => task.id));
  const fill = indexed
    .filter(({ task }) => !chosen.has(task.id))
    .sort(byImpact)
    .slice(0, Math.max(0, limit - blockers.length));
  return [...blockers, ...fill]
    .sort((a, b) => rank(a.task) - rank(b.task) || a.index - b.index)
    .map(({ task }) => task);
}

export const escapeToggleTitle = (title) => title.replace(/^(\d+)\.(\s)/, '$1\\.$2');

export function escapeToggleTitles(markdown) {
  let expectTitle = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*<toggle\b/.test(line)) {
        expectTitle = true;
        return line;
      }
      if (expectTitle && line.trim() !== '') {
        expectTitle = false;
        return escapeToggleTitle(line);
      }
      return line;
    })
    .join('\n');
}

const sentence = (text) => (/[.?!]$/.test(text) ? text : `${text}.`);

export function renderTaskToggle(task, { n, clientName = 'the client', picked = [], tasks = [], phases = [], month }) {
  const detail = task.detail ?? {};
  const number = (other) => picked.findIndex((p) => p.id === other.id) + 1;
  const work = detail.work?.length ? detail.work.map((step, i) => `${i + 1}. ${step}`).join('\n') : MISSING;
  const open = tasks.filter((other) => !other.done);
  const blocksTask = (from, to) => (from.blocks ?? []).map(String).includes(String(to.id));
  const before = open.filter((other) => blocksTask(other, task));
  const after = open.filter((other) => blocksTask(task, other));
  const afterPicked = after.filter((other) => number(other) > 0).map(number).sort((a, b) => a - b);
  const unpicked = after.filter((other) => number(other) === 0);
  const needs = before.map((other) => (number(other) > 0 ? `task ${number(other)} (${other.name})` : other.name));
  const startOf = (other) => phases.find((p) => String(p.id) === String(other.phase))?.start;
  const named = (other) => {
    const start = startOf(other);
    return month && start && start > month ? `"${other.name}" (${monthName(start)})` : `"${other.name}"`;
  };
  const subjects = [
    ...(afterPicked.length === 1 ? [`Task ${afterPicked[0]}`] : []),
    ...(afterPicked.length > 1 ? [`Tasks ${afterPicked.slice(0, -1).join(', ')} and ${afterPicked.at(-1)}`] : []),
    ...unpicked.map(named),
  ];
  const plural = afterPicked.length + unpicked.length > 1;
  const list = subjects.length > 1 ? `${subjects.slice(0, -1).join(', ')} and ${subjects.at(-1)}` : subjects[0];
  const waits = subjects.length ? ` ${list} ${plural ? 'wait' : 'waits'} on this one.` : '';
  const depends = `${needs.length ? sentence(needs.join(', ')) : 'nothing.'}${waits}`;
  const field = (value) => (value ? sentence(value) : MISSING);
  return [
    '<toggle heading="h3">',
    escapeToggleTitle(`${n}. ${task.name}`),
    '',
    '<b>Work</b>',
    '',
    work,
    '',
    `<b>Needs from ${clientName}:</b> ${field(detail.needs)}`,
    '',
    `<b>Depends on:</b> ${depends}`,
    '',
    `<b>Done when:</b> ${field(detail.doneWhen)}`,
    '',
    `<b>Unknown:</b> ${field(detail.unknown)}`,
    '</toggle>',
  ].join('\n');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function loadMetrics(dir, { month, sample }) {
  const history = {};
  const note = (key, when, value) => {
    if (isNumber(value)) (history[key] ??= {})[when] = value;
  };
  if (sample) {
    const file = readJson(join(dir, `sample-${month}.json`));
    if (!file) return { figures: {}, history: {}, taskCounts: null };
    for (const [key, months] of Object.entries(file.history ?? {})) {
      for (const [when, value] of Object.entries(months)) note(key, when, value);
    }
    for (const [key, fig] of Object.entries(file.figures ?? {})) note(key, month, fig?.value);
    return { figures: file.figures ?? {}, history, taskCounts: file.taskCounts ?? null };
  }
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => /^metrics-\d{4}-\d{2}\.json$/.test(name)) : [];
  let figures = {};
  for (const name of files.sort()) {
    const file = readJson(join(dir, name));
    if (!file?.month || file.month > month) continue;
    for (const [key, fig] of Object.entries(file.figures ?? {})) note(key, file.month, fig?.value);
    if (file.month === month) figures = file.figures ?? {};
  }
  return { figures, history, taskCounts: null };
}

function phaseStatus(phase, goals, statuses, month) {
  if (phase.start && monthIndex(phase.start) > monthIndex(month)) {
    return { key: 'starts', label: `○ Starts ${monthName(phase.start)}`, color: 'gray' };
  }
  const keys = goals.map((goal) => statuses.get(goal.id).key);
  if (keys.includes('behind')) return STATUS.behind;
  if (keys.includes('on-track')) return STATUS.onTrack;
  if (keys.length > 0 && keys.every((key) => key === 'no-data')) return STATUS.noData;
  return STATUS.starting;
}

export function buildReportData(data, metrics, { month, sample }) {
  const { figures, history, taskCounts } = metrics;
  const ctx = { figures, history, sample, month };
  const phases = new Map(data.phases.map((phase) => [String(phase.id), phase]));
  const statuses = new Map(
    data.goals.map((goal) => [goal.id, goalStatus(goal, { phase: phases.get(String(goal.phase)), month, figures, history })]),
  );
  const goalRows = data.goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    owner: goal.owner,
    phase: goal.phase,
    target: targetText(goal),
    figure: figureText(goal, ctx),
    status: statuses.get(goal.id),
  }));
  const tasks = data.tasks ?? [];
  const phaseRows = data.phases.map((phase) => {
    const goals = data.goals.filter((goal) => String(goal.phase) === String(phase.id));
    const own = tasks.filter((task) => String(task.phase) === String(phase.id));
    const counts = taskCounts?.[phase.id] ?? { done: own.filter((task) => task.done).length, total: own.length };
    const onTrack = goals.filter((goal) => statuses.get(goal.id).key === 'on-track').length;
    return {
      id: phase.id,
      name: phase.name,
      label: `${phase.id}. ${phase.name}`,
      status: phaseStatus(phase, goals, statuses, month),
      done: counts.done,
      total: counts.total,
      tasks: `${counts.done} of ${counts.total}`,
      bar: progressBar(counts.done, counts.total),
      goalsOnTrack: `${onTrack} of ${goals.length}`,
    };
  });
  const headlineGoal = data.goals.find((goal) => goal.headline === true) ?? data.goals[0];
  const headline = {
    goalId: headlineGoal.id,
    name: headlineGoal.name,
    status: statuses.get(headlineGoal.id),
    figure: figureText(headlineGoal, ctx),
    change: changeOnLastYear(headlineGoal, ctx),
  };
  const nextTasks = pickNextTasks(tasks, { phases: data.phases, month: addMonths(month, 1) });
  const report = {
    month,
    monthLabel: `${monthName(month)} ${month.slice(0, 4)}`,
    sample: Boolean(sample),
    profile: data.profile,
    agreed: data.agreed,
    realisticGoal: data.realisticGoal,
    headline,
    phaseRows,
    goalRows,
    nextTasks,
  };
  report.markdown = {
    progressTable: renderProgressTable(report, data),
    goalsToggle: renderGoalsToggle(report, data),
    nextTasks: nextTasks
      .map((task, index) => renderTaskToggle(task, { n: index + 1, clientName: data.clientName ?? 'the client', picked: nextTasks, tasks, phases: data.phases ?? [], month }))
      .join('\n\n'),
  };
  return report;
}

const cell = (text, color) => `<td${color ? ` color="${color}"` : ''}>${text}</td>`;

export function renderProgressTable(report, data = {}) {
  const head = ['Phase', 'Status', 'Plan tasks done', 'Goals on track'].map((text) => cell(text));
  const headlineChange = [report.headline.figure, report.headline.change].filter(Boolean).join(', ');
  const rows = [
    ['<tr color="blue_bg">', cell(`<b>★ ${data.headlineLabel ?? report.headline.name}</b>`), cell(report.headline.status.label, report.headline.status.color), cell('—'), cell(headlineChange), '</tr>'],
    ...report.phaseRows.map((row) => [
      '<tr>',
      cell(row.label),
      cell(row.status.label, row.status.color),
      cell(`${row.bar} ${row.tasks}${report.sample && row.done > 0 ? ` ${MARKER}` : ''}`),
      cell(row.goalsOnTrack),
      '</tr>',
    ]),
  ];
  return [
    '<table fit-page-width="true" header-row="true">',
    '<tr>',
    ...head,
    '</tr>',
    ...rows.flat(),
    '</table>',
  ].join('\n');
}

export function renderGoalsToggle(report, data = {}) {
  const proposed = report.agreed ? '' : ' (proposed)';
  const lines = [
    '<toggle heading="h3">',
    `The ${report.goalRows.length} goals, by phase${proposed}`,
    '',
    '<table fit-page-width="true" header-row="true">',
    '<tr>',
    ...['#', 'Goal', '12-month target', monthName(report.month), 'Status'].map((text) => cell(text)),
    '</tr>',
  ];
  for (const phase of report.phaseRows) {
    const rows = report.goalRows.filter((row) => String(row.phase) === String(phase.id));
    if (rows.length === 0) continue;
    lines.push('<tr color="gray_bg">', cell(''), cell(`<b>Phase ${phase.label}</b>`), cell(''), cell(''), cell(''), '</tr>');
    for (const row of rows) {
      const owner = row.owner === 'client' && data.clientName ? ` (${data.clientName})` : '';
      lines.push('<tr>', cell(String(row.id)), cell(`${row.name}${owner}`), cell(row.target), cell(row.figure), cell(row.status.label, row.status.color), '</tr>');
    }
  }
  lines.push('</table>', '</toggle>');
  return lines.join('\n');
}

const WINDOW = 12;

function chartType(goal, fig) {
  if (typeof goal.chart === 'string') return goal.chart;
  if (Array.isArray(fig?.items)) return 'dots';
  return goal.headline || isYearOnYear(goal) ? 'line-yoy' : 'line';
}

const trimLeading = (months, ...series) => {
  const first = months.findIndex((_, i) => series.some((one) => one[i] !== null));
  return first < 0 ? 0 : first;
};

export function buildChartSpecs(data, metrics, report, { month, sample }) {
  const { figures, history } = metrics;
  const charts = [];
  for (const goal of data.goals) {
    if (!goal.chart || charts.length >= MAX_CHARTS) continue;
    const fig = resolveFigure(goal, figures);
    const type = chartType(goal, fig);
    const row = report.goalRows.find((r) => r.id === goal.id);
    const aim = goal.targetLabel ?? (isNumber(goal.target) ? `target ${formatValue(goal.target)}` : targetText(goal));
    const subtitle = `Goal ${goal.id}: ${aim}. ${monthName(month)}: ${row.figure}`;
    const source = goal.chartSource ?? fig?.source ?? goal.source;
    const footer = `Source: ${source}.${sample ? ` Figures marked ${MARKER} are sample figures.` : ''}`;
    const spec = { type, goalId: goal.id, file: `chart-${goal.id}.png`, title: goal.chartTitle ?? goal.name, subtitle, footer, unit: goal.chartUnit ?? { divide: 1, suffix: '', decimals: 0 } };
    const series = historyOf(goal, history);
    if (type === 'dots') {
      spec.items = (fig?.items ?? []).map((item) => ({ label: item.label, value: item.value }));
      spec.band = goal.chartBand ?? { low: 1, high: 10, label: 'Page one' };
    } else {
      const months = windowMonths(month, WINDOW);
      const values = months.map((m) => series[m] ?? null);
      const lastYear = months.map((m) => series[addMonths(m, -12)] ?? null);
      const from = trimLeading(months, values, ...(type === 'line-yoy' ? [lastYear] : []));
      spec.months = months.slice(from);
      spec.values = values.slice(from);
      if (type === 'line-yoy') {
        spec.lastYear = lastYear.slice(from);
        spec.labels = { current: 'This year', last: 'Last year' };
      } else {
        const due = goal.due;
        spec.endMonth = due && monthsBetween(month, due) > 0 && monthsBetween(month, due) <= 24 ? due : null;
        const aimAt = scalarOf(goal, goal.target);
        spec.target = goal.chartTarget ?? (isNumber(aimAt) ? { low: aimAt, high: aimAt, label: `Target ${formatValue(aimAt)}` } : null);
      }
    }
    charts.push(spec);
  }
  return { charts };
}

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      client: { type: 'string' },
      month: { type: 'string' },
      projects: { type: 'string' },
      out: { type: 'string' },
      sample: { type: 'boolean', default: false },
    },
  });
  if (!values.client || !/^\d{4}-\d{2}$/.test(values.month ?? '')) {
    warn('usage: report-data.js --client <name> --month YYYY-MM [--projects <dir>] [--out <dir>] [--sample]');
    return 2;
  }
  const projects = resolve(values.projects ?? fileURLToPath(new URL('../../projects', import.meta.url)));
  const dir = reportsDir(projects, values.client);
  const goals = readGoalsFile(join(dir, 'goals.json'));
  if (!goals.ok) {
    warn(goals.errors.join('\n'));
    return 2;
  }
  for (const warning of goals.warnings) warn(`warning: ${warning}`);
  const metrics = loadMetrics(dir, { month: values.month, sample: values.sample });
  const report = buildReportData(goals.data, metrics, { month: values.month, sample: values.sample });
  const charts = buildChartSpecs(goals.data, metrics, report, { month: values.month, sample: values.sample });
  const out = resolve(values.out ?? join(tmpdir(), `site-report-${values.client}-${values.month}`));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'report-data.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(out, 'charts-spec.json'), `${JSON.stringify(charts, null, 2)}\n`);
  say(JSON.stringify({ out, reportData: join(out, 'report-data.json'), chartsSpec: join(out, 'charts-spec.json') }));
  return 0;
}

runIfMain(import.meta.url, main);
