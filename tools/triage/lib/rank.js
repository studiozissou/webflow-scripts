// Picks the open Doer = Claude tasks that map to a command and are not already claimed, ranked by Priority, Due, then Hours Estimate ascending, labelled B1..Bn for the CLAUDE CAN BUILD section.

export const DEFAULT_DOER_MAP = [
  { pattern: '\\bschema\\b|json-?ld', command: '/generate-schema' },
  { pattern: '\\bseo\\b|\\baudit\\b', command: '/site-audit' },
  { pattern: '\\bspec\\b|\\bplan\\b', command: '/plan' },
  { pattern: '\\bproposal\\b', command: '/proposal' },
  { pattern: '\\bestimate\\b', command: '/estimate' },
  { pattern: '\\bcopy\\b.*\\breview\\b|\\breview\\b.*\\b(copy|content)\\b', command: '/copy-review' },
  { pattern: '\\bqa\\b', command: '/qa-check' },
  { pattern: '\\bvinted\\b', command: '/zissou-scan' },
  { pattern: '\\bcode\\b|\\bbuild\\b|\\bimplement\\b|\\bfix\\b|\\brefactor\\b', command: '/build' },
];

export const DEFAULT_RANK_OPTIONS = {
  max: 5,
  doer: 'Claude',
  excludeStatuses: ['Done', 'Cancelled', 'Waiting', 'Blocked', 'In Testing'],
};

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compareNullable(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : 1;
}

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
        (PRIORITY_RANK[a.task.priority] ?? 4) - (PRIORITY_RANK[b.task.priority] ?? 4) ||
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
