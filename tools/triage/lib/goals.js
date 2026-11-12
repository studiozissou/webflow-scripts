// Goal rules for triage, pure: health() per Active goal (open task count from either side of the Goal/Tasks relation, no open task, target date before today in Amsterdam, days since last review) plus the top 5 open tasks with no goal; unlinked() picks the D18 goal-fit questions (open, no goal, not due within 2 working days, not Blocked or Waiting, not kept, priority then age, max 3, none without an Active goal); goalsBlock() writes the Monday GOALS lines in short STE sentences for flagged goals only (no open task, overdue, or last review 14+ days ago; never reviewed is not a flag), or one all-on-track line.
import { bareId } from '../../notion/client.js';
import { compareNullable, priorityRank } from './compare.js';
import { plain, plural } from './rollup.js';
import { addWorkingDays, amsterdamDate, calendarDaysBetween } from './workdays.js';
import { isKept } from './goals-state.js';

export const CLOSED_STATUSES = new Set(['Done', 'Cancelled']);
export const ON_SOMEONE_STATUSES = new Set(['Blocked', 'Waiting']);
export const NEAR_DUE_WORKING_DAYS = 2;
export const MAX_QUESTIONS = 3;
export const MAX_NO_GOAL = 5;
export const MAX_BLOCK_LINES = 8;
export const REVIEW_FLAG_DAYS = 14;
const NAME_WORDS = 8;

const isOpen = (task) => !CLOSED_STATUSES.has(task?.status);
const isActive = (goal) => goal?.status === 'Active';

// Linked from either side of the two-way relation: the task's goalIds or the goal's taskIds.
function isLinked(task, goal) {
  const has = (ids, id) => (ids ?? []).some((x) => bareId(x) === bareId(id));
  return has(task.goalIds, goal.id) || has(goal.taskIds, task.id);
}

// Any goal at all on the task side (even one not in the list), or a listed goal that names it.
const hasGoal = (task, goals) => (task.goalIds ?? []).length > 0 || goals.some((g) => isLinked(task, g));

const byPriorityThenAge = (a, b) =>
  priorityRank(a.priority) - priorityRank(b.priority) ||
  compareNullable(a.createdTime, b.createdTime) ||
  String(a.name ?? '').localeCompare(String(b.name ?? ''));

function openUnlinked(tasks, goals) {
  return tasks.filter((t) => isOpen(t) && !hasGoal(t, goals)).sort(byPriorityThenAge);
}

function goalHealth(goal, openTasks, today) {
  const count = openTasks.filter((t) => isLinked(t, goal)).length;
  const target = goal.targetDate ? amsterdamDate(goal.targetDate) : null;
  return {
    id: goal.id,
    name: goal.name,
    openTasks: count,
    noOpenTask: count === 0,
    overdue: target !== null && target < today,
    targetDate: target,
    daysSinceReview: goal.lastReviewed ? calendarDaysBetween(goal.lastReviewed, today) : null,
  };
}

export function health(goals = [], tasks = [], { now = new Date() } = {}) {
  const today = amsterdamDate(now);
  const open = tasks.filter(isOpen);
  return {
    goals: goals.filter(isActive).map((g) => goalHealth(g, open, today)),
    tasksWithNoGoal: openUnlinked(tasks, goals)
      .slice(0, MAX_NO_GOAL)
      .map(({ id, name, priority, createdTime }) => ({ id, name, priority: priority ?? null, createdTime: createdTime ?? null })),
  };
}

// Due on or before the 2nd working day from today, overdue included.
function nearDue(task, today) {
  return Boolean(task.due) && amsterdamDate(task.due) <= addWorkingDays(today, NEAR_DUE_WORKING_DAYS);
}

export function unlinked(tasks = [], goals = [], { now = new Date(), state = { kept: [] }, max = MAX_QUESTIONS } = {}) {
  if (!goals.some(isActive)) return [];
  const today = amsterdamDate(now);
  return openUnlinked(tasks, goals)
    .filter((t) => !nearDue(t, today) && !ON_SOMEONE_STATUSES.has(t.status) && !isKept(state, t.id, now))
    .slice(0, max);
}

function reviewSentence(days) {
  if (days == null) return '';
  if (days === 0) return 'Review today.';
  return `Review ${plural(days, 'day')} ago.`;
}

function goalLine(goal) {
  const tasks = goal.noOpenTask ? 'no open task.' : `${plural(goal.openTasks, 'open task')}.`;
  const overdue = goal.overdue ? ` Overdue since ${goal.targetDate}.` : '';
  const review = reviewSentence(goal.daysSinceReview);
  return `${plain(goal.name, NAME_WORDS)}: ${tasks}${overdue}${review ? ` ${review}` : ''}`;
}

const flagged = (goal) => goal.noOpenTask || goal.overdue || (goal.daysSinceReview ?? 0) >= REVIEW_FLAG_DAYS;

export function goalsBlock({ goals = [] } = {}) {
  if (goals.length === 0) return ['No active goals. Set one with /strategy.'];
  const shown = goals.filter(flagged);
  if (shown.length === 0) return [`All ${plural(goals.length, 'goal')} are on track.`];
  return shown.slice(0, MAX_BLOCK_LINES).map(goalLine);
}
