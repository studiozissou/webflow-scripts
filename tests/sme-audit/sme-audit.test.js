// Structural checks for the /sme-audit skill and templates: required phases and sections exist, the learning loop is wired in, and no client data or prices leak into these public files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(ROOT, '.claude', 'skills', 'sme-audit', 'SKILL.md');
const REPORT = join(ROOT, '.claude', 'templates', 'sme-audit-report.md');
const GBP = join(ROOT, '.claude', 'templates', 'sme-gbp-copy-pack.md');
const WORK_PLAN = join(ROOT, '.claude', 'templates', 'sme-work-plan.md');
const PUBLIC_FILES = [SKILL, REPORT, GBP, WORK_PLAN];

const read = (file) => readFileSync(file, 'utf8');
const headings = (text) =>
  text
    .split('\n')
    .filter((line) => /^#{1,3} /.test(line))
    .map((line) => line.replace(/^#+ /, '').trim());

test('the skill and all three templates exist', () => {
  for (const file of PUBLIC_FILES) assert.ok(existsSync(file), file);
});

test('the skill has name and description frontmatter and a checklist version', () => {
  const text = read(SKILL);
  assert.match(text, /^---\nname: sme-audit\n/);
  assert.match(text, /\ndescription: .{40,}\n/);
  assert.match(text, /\nchecklist-version: \d+\n/);
});

test('the skill runs its phases in order, starting by reading past learnings and ending with a retro', () => {
  const found = headings(read(SKILL));
  const phases = [
    'Phase 0 — Learn from past audits',
    'Phase 1 — Context',
    'Phase 2 — Website',
    'Phase 3 — Google search',
    'Phase 4 — Google Business Profile',
    'Phase 5 — AI search',
    'Phase 6 — Landing-page plan',
    'Phase 7 — Write the report',
    'Phase 8 — Plan the work',
    'Phase 9 — Publish',
    'Phase 10 — Retro and learn',
  ];
  let last = -1;
  for (const phase of phases) {
    const index = found.indexOf(phase);
    assert.ok(index > last, `${phase} missing or out of order`);
    last = index;
  }
});

test('the learning loop reads and writes the private learnings, findings library and benchmarks', () => {
  const text = read(SKILL);
  for (const path of [
    '.claude/reference/sme-audit/learnings.md',
    '.claude/reference/sme-audit/findings-library.md',
    '.claude/reference/sme-audit/benchmarks.csv',
  ])
    assert.ok(text.includes(path), path);
  assert.match(text, /## Changelog/);
  assert.match(text, /two or more (audits|businesses)/i);
});

test('the skill reuses the existing tools instead of redefining them', () => {
  const text = read(SKILL);
  for (const ref of ['ai-search-aeo', 'launch-guard', 'generate-schema', 'humanizer', 'Claim gate'])
    assert.ok(text.includes(ref), ref);
  assert.match(text, /20[- ]check/);
});

test('the report template has every client-facing section', () => {
  const found = headings(read(REPORT));
  for (const section of [
    'Summary',
    'Scorecard',
    'Fix these first',
    'Being found on Google',
    'New pages worth adding',
    'Google Business Profile',
    'AI search',
    'Reviews and trust',
    'Looking ahead',
    'What we need from you',
    'Sources',
  ])
    assert.ok(found.includes(section), section);
});

test('the GBP copy pack template covers the paste-ready fields', () => {
  const found = headings(read(GBP));
  for (const section of [
    'Name, address, phone',
    'Categories',
    'Description',
    'Services',
    'Hours',
    'Photos',
    'First three posts',
    'Review request',
  ])
    assert.ok(found.includes(section), section);
});

test('the work plan template groups every task by kind and gives each one an effort, owner and approval gate', () => {
  const text = read(WORK_PLAN);
  const found = headings(text);
  for (const section of [
    'How to use this plan',
    'Bugs and broken things',
    'Quick SEO fixes',
    'Google and listings',
    'Upgrades',
    'Later',
    'Waiting on the owner',
  ])
    assert.ok(found.includes(section), section);
  for (const column of ['ID', 'Task', 'Why', 'Effort (h)', 'Owner', 'Needs approval', 'Depends on', 'Spec'])
    assert.ok(text.includes(`| ${column} |`) || text.includes(`| ${column}`), column);
});

test('the skill turns findings into a work plan and learns from estimated versus actual hours', () => {
  const text = read(SKILL);
  assert.ok(text.includes('sme-work-plan.md'));
  assert.match(text, /estimated (versus|vs\.?) actual hours/i);
  assert.match(text, /\/plan/);
});

test('public files carry no client names, contact details or prices', () => {
  const banned = /rolfing|janco|oost|carsa|€\s?\d|\d+\s?euro|@[a-z0-9-]+\.(nl|com|co\.uk)/i;
  for (const file of PUBLIC_FILES) assert.doesNotMatch(read(file), banned, file);
});

const section = (text, heading) => {
  const start = text.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `no ## ${heading} section`);
  const rest = text.slice(start + 1);
  const end = rest.indexOf('\n## ');
  return end >= 0 ? rest.slice(0, end) : rest;
};

test('Phase 3 runs a competitor gap and backlink snapshot within about 450 rows, with no disavow', () => {
  const text = section(read(SKILL), 'Phase 3 — Google search');
  assert.ok(text.includes('`competitor-gap`'), 'Phase 3 does not load competitor-gap');
  assert.ok(text.includes('`backlink-audit`'), 'Phase 3 does not load backlink-audit');
  assert.match(text, /about 450 rows/);
  assert.doesNotMatch(text, /about 300 rows/);
  assert.match(text, /no disavow/i);
});

test('the report has "Who you\'re up against" under "Being found on Google"', () => {
  assert.match(section(read(REPORT), 'Being found on Google'), /^### Who you're up against$/m);
});

test('the skill is at checklist-version 4 with a v4 changelog line', () => {
  const text = read(SKILL);
  assert.match(text, /\nchecklist-version: 4\n/);
  assert.match(section(text, 'Changelog'), /^- v4, \d{4}-\d{2}-\d{2}: /m);
});
