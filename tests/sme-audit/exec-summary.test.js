// Checks the /sme-audit executive summary template: the short client-facing sections exist, it carries the projection chart, it never shows hours, and the skill produces it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = join(ROOT, '.claude', 'templates', 'sme-exec-summary.md');
const read = (file) => readFileSync(file, 'utf8');
const headings = (text) => text.split('\n').filter((l) => /^#{1,3} /.test(l)).map((l) => l.replace(/^#+ /, '').trim());

test('the exec summary template exists with its sections in order', () => {
  assert.ok(existsSync(TEMPLATE));
  const found = headings(read(TEMPLATE));
  let last = -1;
  for (const section of ['Where you stand', 'What could change', 'What we will do', 'What we need from you to get started', 'Next steps']) {
    const index = found.indexOf(section);
    assert.ok(index > last, `${section} missing or out of order`);
    last = index;
  }
});

test('the exec summary carries the projection chart', () => {
  assert.ok(read(TEMPLATE).includes('traffic-trajectory-{{yyyy_mm}}.png'));
});

test('each work category explains the problem, its cost to the business and the fix', () => {
  const work = read(TEMPLATE).split('## What we will do')[1].split('## What we need from you')[0];
  const categories = work.split('### ').slice(1);
  assert.ok(categories.length >= 2, 'template shows at least two example categories');
  for (const category of categories) {
    for (const label of ['**The problem:**', '**Why it hurts you:**', '**How we fix it:**']) {
      assert.ok(category.includes(label), `category missing ${label}`);
    }
  }
});

test('each work category lists every fix in a collapsed accordion', () => {
  const work = read(TEMPLATE).split('## What we will do')[1].split('## What we need from you')[0];
  for (const category of work.split('### ').slice(1)) {
    assert.match(category, /<details>\s*<summary>[^<]+<\/summary>[\s\S]*?- \{\{fix_sentence\}\}[\s\S]*?<\/details>/);
  }
});

test('the exec summary shows no hours or effort estimates', () => {
  const text = read(TEMPLATE);
  assert.ok(text.includes('No hours'), 'template tells the writer to leave hours out');
  const body = text.split('\n').filter((l) => !l.includes('No hours')).join('\n');
  assert.doesNotMatch(body, /\b(hours?|effort|\d+(\.\d+)?\s?h)\b/i);
});

test('the exec summary carries no client names or prices', () => {
  const banned = /rolfing|janco|oost|carsa|€\s?\d|\d+\s?euro|@[a-z0-9-]+\.(nl|com|co\.uk)/i;
  assert.doesNotMatch(read(TEMPLATE), banned);
});

test('the skill writes and publishes the exec summary', () => {
  const text = read(join(ROOT, '.claude', 'skills', 'sme-audit', 'SKILL.md'));
  assert.ok(text.includes('sme-exec-summary.md'));
  assert.ok(text.includes('reports/exec-summary-<YYYY-MM>.md'));
});
