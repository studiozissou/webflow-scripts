// Gate for the review log: every finding has a status, every rejection has a reason, and the last cycle has no open finding.
import { readFileSync } from 'node:fs';
import { runIfMain, say, warn } from './cli.js';

export const MAX_CYCLES = 3;
const STATUSES = ['applied', 'rejected', 'open'];

function blocks(text) {
  const found = [];
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const title = heading[1];
      const kind = /^cycle\b/i.test(title) ? 'cycle' : /^copy review\b/i.test(title) ? 'copy' : null;
      current = kind ? { kind, title, lines: [] } : null;
      if (current) found.push(current);
    } else if (current) current.lines.push(line);
  }
  return found;
}

function checkBlock(block, errors) {
  const bullets = block.lines.filter((line) => /^\s*[-*]\s+/.test(line));
  const cleared = block.lines.some((line) => /^\s*no (open )?findings\.?\s*$/i.test(line));
  if (bullets.length === 0 && !cleared) {
    errors.push(`${block.title}: no findings and no "No findings." line`);
    return;
  }
  for (const line of bullets) {
    const body = line.replace(/^\s*[-*]\s+/, '');
    const match = body.match(/^\[([^\]]*)\]\s*(.*)$/);
    if (!match) {
      errors.push(`${block.title}: finding has no status: ${body}`);
      continue;
    }
    const status = match[1].toLowerCase();
    if (!STATUSES.includes(status)) {
      errors.push(`${block.title}: unknown status [${match[1]}]: ${body}`);
      continue;
    }
    if (status === 'open') errors.push(`${block.title}: open finding: ${match[2]}`);
    if (status === 'rejected') {
      const reason = match[2].split(/\s—\s|\s--\s/).slice(1).join(' ').trim();
      if (!reason) errors.push(`${block.title}: rejection has no reason: ${match[2]}`);
    }
  }
}

export function checkReviewLog(text, { requireCopy = false } = {}) {
  const errors = [];
  const all = blocks(text);
  const cycles = all.filter((block) => block.kind === 'cycle');
  const copy = all.filter((block) => block.kind === 'copy');
  if (cycles.length === 0) errors.push('the log has no review cycle');
  if (cycles.length > MAX_CYCLES) errors.push(`${cycles.length} cycles, over the limit of ${MAX_CYCLES} cycles`);
  if (requireCopy && copy.length === 0) errors.push('the log has no copy review');
  for (const block of all) checkBlock(block, errors);
  return { ok: errors.length === 0, errors };
}

function main(argv) {
  const file = argv.find((arg) => !arg.startsWith('--'));
  if (!file) {
    warn('usage: review-log.js <review-YYYY-MM.md> [--require-copy]');
    return 2;
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    warn(`cannot read ${file}: ${error.message}`);
    return 1;
  }
  const result = checkReviewLog(text, { requireCopy: argv.includes('--require-copy') });
  for (const error of result.errors) say(`BREACH: ${error}`);
  say(result.ok ? 'review log clear' : 'review log blocked');
  return result.ok ? 0 : 1;
}

runIfMain(import.meta.url, main);
