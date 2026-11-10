// Sorts open tasks and unanswered human threads into NOW, TODAY and THIS WEEK per spec D4 and derives Priority-only proposals, with thresholds overridable from config.digest.rules.
import { amsterdamDate, calendarDaysBetween, workingDaysBetween } from './workdays.js';

export const DEFAULT_RULES = {
  replyAgeWorkingDays: 2,
  todayDueDays: 1,
  weekDueDays: 7,
  proposalP0WorkingDays: 2,
  proposalP1Days: 7,
  quickTag: 'Quick',
  blockedNamePattern: '\\bWill\\b',
  blockedDoers: ['User', 'User + Claude'],
  excludeStatuses: ['Done', 'Cancelled'],
};

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const NOW_ORDER = ['new-business', 'blocked-on-will', 'overdue', 'reply-age'];
const TODAY_ORDER = ['due-today', 'due-tomorrow', 'p0'];
const WEEK_ORDER = ['due-week', 'p1'];

const priorityRank = (p) => PRIORITY_RANK[p] ?? 4;

function compareNullable(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : 1;
}

function compareTasks(a, b) {
  return (
    priorityRank(a.priority) - priorityRank(b.priority) ||
    compareNullable(a.due, b.due) ||
    String(a.name).localeCompare(String(b.name))
  );
}

function compareItems(order) {
  return (a, b) => {
    const byReason = order.indexOf(a.reason) - order.indexOf(b.reason);
    if (byReason) return byReason;
    if (a.kind !== b.kind) return a.kind === 'task' ? -1 : 1;
    if (a.kind === 'thread') return compareNullable(a.lastMessageAt, b.lastMessageAt);
    return compareTasks(a, b);
  };
}

const isQuick = (task, rules) =>
  (task.tags ?? []).some((t) => String(t).toLowerCase() === rules.quickTag.toLowerCase());

function isBlockedOnWill(task, rules) {
  if (!rules.blockedDoers.includes(task.doer) || !task.blockedReason) return false;
  return new RegExp(rules.blockedNamePattern).test(task.blockedReason);
}

function taskItem(task, reason) {
  return {
    kind: 'task',
    id: task.id,
    name: task.name,
    reason,
    priority: task.priority ?? null,
    due: task.due ?? null,
    doer: task.doer ?? null,
    clients: task.clients ?? [],
    url: task.url ?? null,
  };
}

function classifyTask(task, today, rules) {
  const dueIn = task.due ? calendarDaysBetween(today, task.due) : null;
  if (isBlockedOnWill(task, rules)) return ['now', 'blocked-on-will'];
  if (dueIn !== null && dueIn < 0) return ['now', 'overdue'];
  if (dueIn === 0) return ['today', 'due-today'];
  if (dueIn !== null && dueIn <= rules.todayDueDays) return ['today', 'due-tomorrow'];
  if (task.priority === 'P0' && !isQuick(task, rules)) return ['today', 'p0'];
  if (dueIn !== null && dueIn <= rules.weekDueDays) return ['week', 'due-week'];
  if (task.priority === 'P1') return ['week', 'p1'];
  return [null, null];
}

function proposalFor(task, today, rules) {
  if (isQuick(task, rules)) return null;
  const from = task.priority ?? null;
  const make = (to, reason) => ({ pageId: task.id, name: task.name, from, to, reason, due: task.due ?? null });
  if (task.due && from !== 'P0') {
    const working = workingDaysBetween(today, task.due);
    if (working < 0) return make('P0', 'overdue');
    if (working <= rules.proposalP0WorkingDays) return make('P0', 'due-soon');
  }
  if (from !== 'P0' && isBlockedOnWill(task, rules)) return make('P0', 'blocked-on-will');
  if (task.due && (from === 'P2' || from === 'P3') && calendarDaysBetween(today, task.due) <= rules.proposalP1Days) {
    return make('P1', 'due-week');
  }
  return null;
}

function threadItem(thread, today, rules) {
  const age = workingDaysBetween(thread.lastMessageAt, today);
  let reason = null;
  if (thread.newBusiness) reason = 'new-business';
  else if (thread.directQuestion) reason = 'blocked-on-will';
  else if (age > rules.replyAgeWorkingDays) reason = 'reply-age';
  if (!reason) return null;
  return {
    kind: 'thread',
    id: thread.threadId,
    name: thread.subject,
    from: thread.from,
    reason,
    lastMessageAt: thread.lastMessageAt,
    ageWorkingDays: age,
  };
}

export function bucketTasks(tasks = [], threads = [], now = new Date(), rules = {}) {
  const r = { ...DEFAULT_RULES, ...rules };
  const today = amsterdamDate(now);
  const out = { now: [], today: [], week: [], proposals: [] };
  for (const task of tasks) {
    if (r.excludeStatuses.includes(task.status)) continue;
    const [bucket, reason] = classifyTask(task, today, r);
    if (bucket) out[bucket].push(taskItem(task, reason));
    const proposal = proposalFor(task, today, r);
    if (proposal) out.proposals.push(proposal);
  }
  for (const thread of threads) {
    const item = threadItem(thread, today, r);
    if (item) out.now.push(item);
  }
  out.now.sort(compareItems(NOW_ORDER));
  out.today.sort(compareItems(TODAY_ORDER));
  out.week.sort(compareItems(WEEK_ORDER));
  out.proposals.sort(
    (a, b) =>
      priorityRank(a.to) - priorityRank(b.to) ||
      compareNullable(a.due, b.due) ||
      String(a.name).localeCompare(String(b.name)),
  );
  return out;
}
