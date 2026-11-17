// Reads and writes the Studio Zissou growth log, a markdown file with a weeks table and a changes table, as pure text transforms plus two thin file helpers.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEBUG = false;

export const WEEK_COLUMNS = ['date', 'week', 'mode', 'autopilot', 'sessions', 'leads', 'clicks', 'impressions', 'changes', 'note'];
export const CHANGE_COLUMNS = ['date', 'page', 'tier', 'type', 'before', 'after', 'commit', 'metric', 'threshold', 'review', 'status', 'id'];

const OPEN = new Set(['', 'open', 'live']);
const PENDING = 'pending';
const ROW = /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function header(columns) {
  return `| ${columns.join(' | ')} |\n|${columns.map(() => ' --- |').join('')}`;
}

export const LOG_TEMPLATE = `# Studio Zissou growth log

## Weeks

${header(WEEK_COLUMNS)}

## Changes

${header(CHANGE_COLUMNS)}
`;

function escapeCell(value) {
  return String(value ?? '').replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|');
}

function unescapeCell(value) {
  return value.replace(/<br>/g, '\n').replace(/\\\|/g, '|');
}

function renderRow(columns, row) {
  return `| ${columns.map((c) => escapeCell(row[c])).join(' | ')} |`;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => unescapeCell(c.trim()));
}

function sectionRange(lines, heading) {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) throw new Error(`growth log has no "${heading}" heading`);
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;
  return [start, end];
}

function rowsIn(lines, heading, columns) {
  const [start, end] = sectionRange(lines, heading);
  return lines
    .slice(start + 1, end)
    .filter((l) => ROW.test(l))
    .map((l) => Object.fromEntries(columns.map((c, i) => [c, splitRow(l)[i] ?? ''])));
}

function insertRow(text, heading, line) {
  const lines = text.split('\n');
  const [start, end] = sectionRange(lines, heading);
  let last = -1;
  for (let i = start + 1; i < end; i += 1) if (lines[i].trim().startsWith('|')) last = i;
  if (last === -1) throw new Error(`growth log "${heading}" has no table`);
  lines.splice(last + 1, 0, line);
  return lines.join('\n');
}

function toDay(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function isClosed(status) {
  const s = String(status ?? '').trim();
  return !OPEN.has(s) && s !== PENDING;
}

export function parseLog(text) {
  const lines = text.split('\n');
  return {
    weeks: rowsIn(lines, '## Weeks', WEEK_COLUMNS),
    changes: rowsIn(lines, '## Changes', CHANGE_COLUMNS),
  };
}

export function appendWeek(text, row) {
  if (!DATE.test(row.date || '')) throw new Error('week row needs a YYYY-MM-DD date');
  if (!/^\d{4}-W\d{2}$/.test(row.week || '')) throw new Error('week row needs a YYYY-Www week');
  let autopilot = row.autopilot;
  if (autopilot === false) autopilot = 'autopilot.off';
  if (autopilot === true || autopilot === undefined) autopilot = 'on';
  DEBUG && console.log('appendWeek', row.week, autopilot);
  return insertRow(text, '## Weeks', renderRow(WEEK_COLUMNS, { ...row, autopilot }));
}

export function appendChange(text, row) {
  if (!DATE.test(row.date || '')) throw new Error('change row needs a YYYY-MM-DD date');
  if (!String(row.page || '').startsWith('/')) throw new Error('change row page must start with "/"');
  if (!['auto', 'review'].includes(row.tier)) throw new Error('change row tier must be "auto" or "review"');
  const { weeks, changes } = parseLog(text);
  if (weeks.some((w) => w.date === row.date && Object.values(w).join(' ').includes('autopilot.off'))) {
    throw new Error(`week ${row.date} ran with autopilot.off, so it cannot have change rows`);
  }
  const id = row.id || `${row.date}-${changes.filter((c) => c.date === row.date).length + 1}`;
  if (changes.some((c) => c.id === id)) throw new Error(`duplicate id "${id}"`);
  const status = row.status || (row.tier === 'review' ? PENDING : 'open');
  DEBUG && console.log('appendChange', id, row.page, row.type);
  return insertRow(text, '## Changes', renderRow(CHANGE_COLUMNS, { ...row, status, id }));
}

export function dueReviews(text, today) {
  const day = toDay(today);
  return parseLog(text).changes.filter((c) => OPEN.has(c.status) && DATE.test(c.review) && c.review <= day);
}

export function pendingReview(text) {
  return parseLog(text).changes.filter((c) => c.tier === 'review' && c.status === PENDING);
}

export function closeRow(text, id, status) {
  if (!String(status || '').trim()) throw new Error('closeRow needs a status');
  const lines = text.split('\n');
  const [start, end] = sectionRange(lines, '## Changes');
  const idAt = CHANGE_COLUMNS.indexOf('id');
  for (let i = start + 1; i < end; i += 1) {
    if (!ROW.test(lines[i])) continue;
    const cells = splitRow(lines[i]);
    if (cells[idAt] !== id) continue;
    const row = Object.fromEntries(CHANGE_COLUMNS.map((c, j) => [c, cells[j] ?? '']));
    lines[i] = renderRow(CHANGE_COLUMNS, { ...row, status });
    return lines.join('\n');
  }
  throw new Error(`no change row with id "${id}"`);
}

export function readLog(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : LOG_TEMPLATE;
}

export function writeLog(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
