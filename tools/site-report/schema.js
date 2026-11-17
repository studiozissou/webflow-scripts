// Validates a client's goals.json and fills profile defaults for whatever the file leaves out.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PROFILES = ['small', 'multi-location'];
export const IMPACTS = ['high', 'medium', 'low'];
export const DIRECTIONS = ['up', 'down'];
export const CHART_TYPES = ['line-yoy', 'line', 'dots'];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const PROFILE_DEFAULTS = {
  small: {
    maxGoals: 8,
    phases: [
      { name: 'Measure', offset: 0 },
      { name: 'Google profile and reviews', offset: 0 },
      { name: 'Service pages', offset: 1 },
      { name: 'Local authority', offset: 2 },
    ],
    charts: [
      { type: 'line-yoy', pick: 'headline' },
      { type: 'line', sourcePattern: 'google profile|business profile' },
      { type: 'dots', sourcePattern: 'position tracking' },
    ],
    sources: {
      forms: 'Webflow form submissions: Webflow MCP only, staged for collect.js with --mcp.',
      googleProfile: 'Google profile performance and reviews: tools/gbp/client.js, works today.',
      searchConsole: 'Search Console: no access and no API scope yet, so the figure is null until both exist.',
      rankings: 'Semrush position tracking for one location: Semrush MCP only, staged for collect.js with --mcp.',
    },
  },
  'multi-location': {
    maxGoals: 15,
    phases: null,
    charts: [],
    sources: {
      forms: 'Webflow form submissions: Webflow MCP only, staged for collect.js with --mcp.',
      googleProfile: 'Google profile performance and reviews: tools/gbp/client.js, summed over every location in goals.json.',
      searchConsole: 'Search Console: no access and no API scope yet, so the figure is null until both exist.',
      rankings: 'Semrush position tracking by town: Semrush MCP only, staged for collect.js with --mcp.',
      leadSystem: "The client's lead system: an export staged for collect.js with --mcp.",
    },
  },
};

export function reportsDir(projects, client) {
  const nested = join(projects, client, '.claude', 'reports');
  return existsSync(nested) ? nested : join(projects, client);
}

const isMonth = (value) => typeof value === 'string' && MONTH.test(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';

function defaultPhases(profile, planStart) {
  const rules = PROFILE_DEFAULTS[profile]?.phases;
  if (!rules || !isMonth(planStart)) return null;
  const [year, month] = planStart.split('-').map(Number);
  return rules.map((rule, id) => {
    const index = year * 12 + month - 1 + rule.offset;
    const start = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
    return { id, name: rule.name, start };
  });
}

function defaultCharts(goals, profile) {
  const rules = PROFILE_DEFAULTS[profile]?.charts ?? [];
  if (rules.length === 0 || goals.some((goal) => goal.chart !== undefined)) return;
  for (const rule of rules) {
    const pattern = rule.sourcePattern ? new RegExp(rule.sourcePattern, 'i') : null;
    const match = goals.find(
      (goal) =>
        goal.chart === undefined &&
        (rule.pick === 'headline' ? goal.headline === true : pattern?.test(String(goal.source ?? ''))),
    );
    if (match) match.chart = rule.type;
  }
}

export function applyProfileDefaults(raw) {
  const data = structuredClone(raw ?? {});
  data.profile ??= 'small';
  if (!Array.isArray(data.phases) || data.phases.length === 0) {
    const phases = defaultPhases(data.profile, data.planStart);
    if (phases) data.phases = phases;
  } else {
    data.phases = data.phases.map((phase, index) => ({ id: index, ...phase }));
  }
  if (Array.isArray(data.goals)) defaultCharts(data.goals, data.profile);
  return data;
}

function checkPhases(data, errors) {
  const ids = new Set();
  if (!Array.isArray(data.phases) || data.phases.length === 0) {
    errors.push(
      PROFILE_DEFAULTS[data.profile]?.phases
        ? 'phases: left out, so planStart (YYYY-MM) is needed to build the profile default phases'
        : `phases: required for the ${data.profile} profile, which has no default phases`,
    );
    return ids;
  }
  for (const phase of data.phases) {
    const label = `phase ${phase?.id}`;
    if (ids.has(String(phase?.id))) errors.push(`${label}: duplicate phase id`);
    ids.add(String(phase?.id));
    if (!isText(phase?.name)) errors.push(`${label}: name is required`);
    if (!isMonth(phase?.start)) errors.push(`${label}: start must be YYYY-MM`);
  }
  return ids;
}

function checkGoals(data, phaseIds, errors) {
  const ids = new Set();
  if (!Array.isArray(data.goals) || data.goals.length === 0) {
    errors.push('goals: at least one goal is required');
    return ids;
  }
  for (const goal of data.goals) {
    const label = `goal ${goal?.id}`;
    if (goal?.id === undefined || goal?.id === null || goal.id === '') errors.push('goal: id is required');
    if (ids.has(String(goal?.id))) errors.push(`${label}: duplicate goal id`);
    ids.add(String(goal?.id));
    if (!isText(goal?.name)) errors.push(`${label}: name is required`);
    if (!isText(goal?.owner)) errors.push(`${label}: owner is required`);
    if (!isText(goal?.source)) errors.push(`${label}: source is required`);
    if (goal?.phase === undefined || goal?.phase === null) {
      errors.push(`${label}: phase is required, every goal belongs to exactly one phase`);
    } else if (typeof goal.phase === 'object') {
      errors.push(`${label}: phase must be one phase id, every goal belongs to exactly one phase`);
    } else if (!phaseIds.has(String(goal.phase))) {
      errors.push(`${label}: phase ${goal.phase} does not exist`);
    }
    if (!DIRECTIONS.includes(goal?.direction)) errors.push(`${label}: direction must be up or down`);
    if (!isMonth(goal?.due)) errors.push(`${label}: due must be YYYY-MM`);
    if (goal?.statusKey !== undefined && !isText(goal.statusKey)) errors.push(`${label}: statusKey must be the name of one key`);
    const chart = goal?.chart;
    if (chart !== undefined && typeof chart !== 'boolean' && !CHART_TYPES.includes(chart)) {
      errors.push(`${label}: chart must be true, false or one of ${CHART_TYPES.join(', ')}`);
    }
  }
  return ids;
}

function checkTasks(data, phaseIds, goalIds, errors) {
  if (data.tasks === undefined) return;
  if (!Array.isArray(data.tasks)) {
    errors.push('tasks: must be a list');
    return;
  }
  const taskIds = new Set(data.tasks.map((task) => String(task?.id)));
  const seen = new Set();
  for (const task of data.tasks) {
    const label = `task ${task?.id}`;
    if (!isText(String(task?.id ?? ''))) errors.push('task: id is required');
    if (seen.has(String(task?.id))) errors.push(`${label}: duplicate task id`);
    seen.add(String(task?.id));
    if (!phaseIds.has(String(task?.phase))) errors.push(`${label}: phase ${task?.phase} does not exist`);
    if (!Array.isArray(task?.goals) || task.goals.some((id) => !goalIds.has(String(id)))) {
      errors.push(`${label}: goals must list existing goal ids`);
    }
    if (!Array.isArray(task?.blocks) || task.blocks.some((id) => !taskIds.has(String(id)))) {
      errors.push(`${label}: blocks must list existing task ids`);
    }
    if (!IMPACTS.includes(task?.impact)) errors.push(`${label}: impact must be high, medium or low`);
    if (typeof task?.done !== 'boolean') errors.push(`${label}: done must be true or false`);
  }
}

export function validateGoals(raw) {
  const data = applyProfileDefaults(raw);
  const errors = [];
  const warnings = [];
  if (!PROFILES.includes(data.profile)) errors.push(`profile must be one of ${PROFILES.join(', ')}`);
  if (typeof data.agreed !== 'boolean') errors.push('agreed must be true or false');
  if (!isText(data.realisticGoal)) errors.push('realisticGoal is required');
  const phaseIds = checkPhases(data, errors);
  const goalIds = checkGoals(data, phaseIds, errors);
  checkTasks(data, phaseIds, goalIds, errors);
  const max = PROFILE_DEFAULTS[data.profile]?.maxGoals;
  const count = Array.isArray(data.goals) ? data.goals.length : 0;
  if (max && count > max) {
    warnings.push(`${count} goals for the ${data.profile} profile, over the limit of ${max}`);
  }
  return { ok: errors.length === 0, errors, warnings, data };
}

export function readGoalsFile(path) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { ok: false, errors: [`cannot read ${path}: ${err.message}`], warnings: [], data: null };
  }
  return validateGoals(raw);
}
