// Local seen-store and CSV logs so each Vinted item is logged once and flagged at most once ever.

import { readFile, writeFile, rename, mkdir, appendFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function loadSeen(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { version: 1, items: {} };
    throw err;
  }
  const data = JSON.parse(text);
  return { version: 1, ...data, items: data.items ?? {} };
}

export async function saveSeen(path, seen) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(seen));
  await rename(tmp, path);
}

export function markSeen(items, seen, now) {
  const fresh = [];
  for (const item of items) {
    const key = String(item.id);
    if (seen.items[key]) continue;
    seen.items[key] = { firstSeen: now };
    fresh.push(item);
  }
  return fresh;
}

export function filterNew(items, seen, now) {
  const fresh = [];
  for (const item of items) {
    const key = String(item.id);
    const entry = seen.items[key] ?? (seen.items[key] = { firstSeen: now });
    if (entry.flagged) continue;
    entry.flagged = now;
    fresh.push(item);
  }
  return fresh;
}

function csvCell(value) {
  if (value == null) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) || s !== String(value) ? `"${s.replace(/"/g, '""')}"` : s;
}

const appendQueues = new Map();

export function appendCsv(path, header, rows) {
  const run = (appendQueues.get(path) ?? Promise.resolve()).then(() => writeCsvRows(path, header, rows));
  appendQueues.set(path, run.catch(() => {}));
  return run;
}

async function writeCsvRows(path, header, rows) {
  await mkdir(dirname(path), { recursive: true });
  const isNew = await stat(path).then(
    (info) => info.size === 0,
    (err) => {
      if (err.code === 'ENOENT') return true;
      throw err;
    },
  );
  const lines = rows.map((row) => {
    const cells = Array.isArray(row) ? row : header.map((key) => row[key]);
    return cells.map(csvCell).join(',');
  });
  const text = (isNew ? [header.join(','), ...lines] : lines).map((line) => `${line}\n`).join('');
  if (text) await appendFile(path, text);
}
