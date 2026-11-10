// Picks the open Doer = Claude tasks that map to a command and are not already claimed, ranked by Priority, Due, then Hours Estimate ascending, labelled B1..Bn for the CLAUDE CAN BUILD section.
import { compareNullable, priorityRank } from './compare.js';

export const DEFAULT_DOER_MAP = [
  { pattern: '\\bschema\\b|json-?ld', command: '/generate-schema' },
  { pattern: '\\bseo\\b|\\baudit\\b', command: '/site-audit' },
  { pattern: '\\bspec\\b|\\bplan\\b', command: '/plan' },
  { pattern: '\\bproposal\\b', command: '/proposal' },
  { pattern: '\\bestimate\\b', command: '/estimate' },
  { pattern: '\\bcopy\\b.*\\breview\\b|\\breview\\b.*\\b(copy|content)\\b', command: '/copy-review' },
  { pattern: '\\bqa\\b', command: '/qa-check' },
  { pattern: '\\bcode\\b|\\bbuild\\b|\\bimplement\\b|\\bfix\\b|\\brefactor\\b', command: '/build' },
];

export const DEFAULT_MAX_BUILD_ITEMS = 5;

export const DEFAULT_RANK_OPTIONS = {
  max: DEFAULT_MAX_BUILD_ITEMS,
  doer: 'Claude',
  excludeStatuses: ['Done', 'Cancelled', 'Waiting', 'Blocked', 'In Testing'],
};

function commandFor(task, doerMap) {
  const haystack = [task.name, ...(task.tags ?? [])].join(' ');
  return doerMap.find((entry) => new RegExp(entry.pattern, 'i').test(haystack))?.command ?? null;
}

export function rankAutomatable(tasks = [], doerMap = DEFAULT_DOER_MAP, claimed = [], options = {}) {
  const opts = { ...DEFAULT_RANK_OPTIONS, ...options };
  const taken = new Set(claimed);
  return tasks
    .filter((t) => t.doer === opts.doer && !opts.excludeStatuses.includes(t.status) && !taken.has(t.id))
    .map((t) => ({ task: t, command: commandFor(t, doerMap ?? DEFAULT_DOER_MAP) }))
    .filter((x) => x.command)
    .sort(
      (a, b) =>
        priorityRank(a.task.priority) - priorityRank(b.task.priority) ||
        compareNullable(a.task.due, b.task.due) ||
        compareNullable(a.task.hours, b.task.hours) ||
        String(a.task.name).localeCompare(String(b.task.name)),
    )
    .slice(0, opts.max)
    .map(({ task, command }, i) => ({
      label: `B${i + 1}`,
      pageId: task.id,
      name: task.name,
      command,
      hours: task.hours ?? null,
      priority: task.priority ?? null,
      due: task.due ?? null,
      url: task.url ?? null,
    }));
}
