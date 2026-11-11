// Read-only Node advisors for the triage P7 trial: logistics (open tasks due by Sunday of this Amsterdam week, free triage job slots under the shared cap, 5-hour quota from the usage-5h text), relationship (people with no contact for 14+ days from snapshot.contacts or a given list), auditor (denied tools, failed jobs and overridden approvals, only on the first working day of the month); numberLines() labels at most 3 lines per advisor V1…; readScores()/appendScores() keep advisors/scores.jsonl deduped by advisor, line and date; verdict() after 10 working days keeps an advisor with at least 50% thumbs up, drops it below that, and says no data under 4 rated lines.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOSED_STATUSES } from './goals.js';
import { plain, plural } from './rollup.js';
import { amsterdamDate, calendarDaysBetween, isWorkingDay, workingDaysBetween } from './workdays.js';

export const MAX_LINES = 3;
export const NO_CONTACT_DAYS = 14;
export const TRIAL_WORKING_DAYS = 10;
export const MIN_RATED = 4;
export const KEEP_RATIO = 0.5;
const DEFAULT_CAP = 3;
const NAME_WORDS = 6;
const REACTIONS = new Set(['+1', '-1']);

function weekEnd(today) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const ms = Date.parse(`${today}T00:00:00Z`) + ((7 - weekday) % 7) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function logistics(snapshot = {}, { now = new Date(), usage5h = '', cap = DEFAULT_CAP } = {}) {
  const today = amsterdamDate(now);
  const end = weekEnd(today);
  const due = (snapshot.tasks ?? [])
    .filter((t) => !CLOSED_STATUSES.has(t?.status) && t.due && amsterdamDate(t.due) >= today && amsterdamDate(t.due) <= end)
    .sort((a, b) => amsterdamDate(a.due).localeCompare(amsterdamDate(b.due)));
  const lines = [
    due.length === 0
      ? 'No tasks are due this week.'
      : `${plural(due.length, 'task')} ${due.length === 1 ? 'is' : 'are'} due this week. First: ${plain(due[0].name, NAME_WORDS)} on ${amsterdamDate(due[0].due)}.`,
  ];
  const live = (snapshot.sessions ?? []).filter((s) => s?.source === 'triage-jobs' && s.state === 'working').length;
  lines.push(`${Math.max(0, cap - live)} of ${cap} job slots are free.`);
  const quota = Number.parseInt(String(usage5h).trim().split(/\s+/)[0], 10);
  if (Number.isFinite(quota) && quota >= 0 && quota <= 100) lines.push(`Quota use is ${quota}% of the 5-hour limit.`);
  return lines.slice(0, MAX_LINES);
}

export function relationship(snapshot = {}, { now = new Date(), contacts = snapshot.contacts ?? [] } = {}) {
  const today = amsterdamDate(now);
  return contacts
    .filter((c) => c?.name && c.lastContact)
    .map((c) => ({ name: plain(c.name, NAME_WORDS), days: calendarDaysBetween(c.lastContact, today) }))
    .filter((c) => c.days >= NO_CONTACT_DAYS)
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, MAX_LINES)
    .map((c) => `No contact with ${c.name} for ${c.days} days.`);
}

export function isFirstWorkingDayOfMonth(now = new Date()) {
  const today = amsterdamDate(now);
  if (!isWorkingDay(today)) return false;
  for (let d = 1; d < Number(today.slice(8)); d++) if (isWorkingDay(`${today.slice(0, 8)}${String(d).padStart(2, '0')}`)) return false;
  return true;
}

const count = (list) => (Array.isArray(list) ? list.length : 0);

export function auditor(logs = {}, { now = new Date() } = {}) {
  if (!isFirstWorkingDayOfMonth(now)) return [];
  const denied = count(logs.denied);
  const failed = count(logs.failedJobs);
  const overridden = count(logs.overridden);
  return [
    denied ? `${plural(denied, 'tool call')} ${denied === 1 ? 'was' : 'were'} denied last month.` : 'No tool calls were denied.',
    failed ? `${plural(failed, 'job')} failed last month.` : 'No jobs failed.',
    overridden ? `${plural(overridden, 'approval')} ${overridden === 1 ? 'was' : 'were'} overridden.` : 'No approvals were overridden.',
  ];
}

export function numberLines(outputs = {}) {
  const out = [];
  for (const [advisor, lines] of Object.entries(outputs)) {
    for (const text of (Array.isArray(lines) ? lines : []).slice(0, MAX_LINES)) {
      const n = `V${out.length + 1}`;
      out.push({ n, kind: 'advisor', advisor, text, line: `${n}. ${text}` });
    }
  }
  return out;
}

const scoresFile = (dir) => join(dir, 'advisors', 'scores.jsonl');
const scoreKey = (r) => `${r.advisor}\u0000${r.line}\u0000${r.date}`;
const validScore = (r) => r && typeof r.advisor === 'string' && typeof r.line === 'string' && REACTIONS.has(r.reaction) && typeof r.date === 'string';

export function readScores(dir) {
  let text;
  try {
    text = readFileSync(scoresFile(dir), 'utf8');
  } catch {
    return [];
  }
  return text.split('\n').flatMap((l) => {
    try {
      const r = JSON.parse(l);
      return validScore(r) ? [r] : [];
    } catch {
      return [];
    }
  });
}

export function appendScores(dir, rows = []) {
  const seen = new Set(readScores(dir).map(scoreKey));
  const fresh = [];
  for (const r of rows) {
    if (!validScore(r) || seen.has(scoreKey(r))) continue;
    seen.add(scoreKey(r));
    fresh.push({ advisor: r.advisor, line: r.line, reaction: r.reaction, date: r.date });
  }
  if (fresh.length) {
    mkdirSync(join(dir, 'advisors'), { recursive: true });
    appendFileSync(scoresFile(dir), fresh.map((r) => `${JSON.stringify(r)}\n`).join(''));
  }
  return fresh.length;
}

export function verdict(scores = [], { now = new Date(), startDate } = {}) {
  if (!startDate || workingDaysBetween(startDate, now) < TRIAL_WORKING_DAYS) return { ready: false, verdicts: [] };
  const by = new Map();
  for (const r of scores.filter(validScore)) {
    const s = by.get(r.advisor) ?? { up: 0, rated: 0 };
    s.rated++;
    if (r.reaction === '+1') s.up++;
    by.set(r.advisor, s);
  }
  const verdicts = [...by.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([advisor, { up, rated }]) => ({ advisor, up, rated, verdict: rated < MIN_RATED ? 'no data' : up / rated >= KEEP_RATIO ? 'keep' : 'drop' }));
  return { ready: true, verdicts };
}
