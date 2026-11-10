// Shared sort helpers for triage: Priority rank (P0 first, unset last) and a comparator that puts null and undefined last.

export const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

export const priorityRank = (p) => PRIORITY_RANK[p] ?? 4;

export function compareNullable(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : 1;
}
