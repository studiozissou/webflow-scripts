// Planner rules for triage P5, pure: due() picks Active goals with no open task and no spec in progress under their goal-<name> slug and no plan job yet, nearest target date first, at most 2 new plan jobs a day and never past the shared job cap; goalFit() reads a spec's "Goal fit:" line (null for none); planItems() turns finished planned jobs into the P items of PLANS TO APPROVE and never offers one whose spec says Goal fit: none or cannot be read.
import { CLOSED_STATUSES } from './goals.js';
import { sanitize } from './sessions.js';
import { amsterdamDate } from './workdays.js';
import { compareNullable } from './compare.js';
import { bareId } from '../../notion/client.js';

export const MAX_PLANS_PER_DAY = 2;
export const MAX_PLAN_ITEMS = 5;
const DEFAULT_CAP = 3;
const SPEC_IN_PROGRESS = new Set(['buildable', 'in_flight', 'review', 'blocked', 'unlabelled', 'unparsed']);
const GOAL_FIT = /^[\s>*-]*\**goal fit:?\**:?\s*(.+)$/im;

export function goalSlug(goal) {
  const words = String(goal?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `goal-${words || 'unnamed'}`.slice(0, 64).replace(/-+$/, '');
}

const isLinked = (task, goal) =>
  (task.goalIds ?? []).some((id) => bareId(id) === bareId(goal.id)) || (goal.taskIds ?? []).some((id) => bareId(id) === bareId(task.id));

const occupies = (job) => !job.finished && (job.alive || job.meta?.pid == null);

export function due(goals = [], tasks = [], specs = [], { now = new Date(), jobs = [], cap = DEFAULT_CAP, maxPerDay = MAX_PLANS_PER_DAY } = {}) {
  const today = amsterdamDate(now);
  const plansToday = jobs.filter((j) => j.meta?.kind === 'plan' && j.meta?.startedAt && amsterdamDate(j.meta.startedAt) === today).length;
  const slots = Math.min(maxPerDay - plansToday, cap - jobs.filter(occupies).length);
  if (slots <= 0) return [];
  const planned = new Set(jobs.map((j) => j.pageId));
  const inProgress = new Set(specs.filter((s) => SPEC_IN_PROGRESS.has(s.bucket)).map((s) => s.slug));
  const open = tasks.filter((t) => !CLOSED_STATUSES.has(t?.status));
  return goals
    .filter((g) => g?.status === 'Active' && g.id && !planned.has(g.id))
    .filter((g) => !open.some((t) => isLinked(t, g)) && !inProgress.has(goalSlug(g)))
    .sort((a, b) => compareNullable(a.targetDate, b.targetDate) || String(a.name).localeCompare(String(b.name)))
    .slice(0, slots)
    .map((g) => ({
      pageId: g.id,
      slug: goalSlug(g),
      task: `Plan the next step for goal: ${sanitize(g.name)}`,
      brief: sanitize([g.measure && `Measure: ${g.measure}`, g.why && `Why: ${g.why}`].filter(Boolean).join('. ')),
    }));
}

// The Goal fit value, null when it says none, undefined when the spec has no such line.
export function goalFit(specText) {
  const m = GOAL_FIT.exec(String(specText ?? ''));
  if (!m) return undefined;
  const value = sanitize(m[1].replace(/\*+/g, '').trim());
  return /^none\b/i.test(value) ? null : value;
}

export function planItems(jobs = [], readSpec = () => null, { max = MAX_PLAN_ITEMS } = {}) {
  const items = [];
  for (const job of jobs) {
    if (items.length >= max) break;
    if (job.meta?.kind !== 'plan' || !job.finished || job.result?.status !== 'planned') continue;
    const text = readSpec(job.meta.slug);
    if (typeof text !== 'string') continue;
    const fit = goalFit(text);
    if (fit === null) continue;
    items.push({
      n: `P${items.length + 1}`,
      kind: 'plan',
      pageId: job.pageId,
      slug: job.meta.slug,
      title: sanitize(job.meta.task ?? job.meta.slug),
      goalFit: fit ?? null,
    });
  }
  return items;
}
