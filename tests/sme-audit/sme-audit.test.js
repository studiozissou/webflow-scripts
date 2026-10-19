// Structural checks for the /sme-audit skill, command and templates: required phases and sections exist, the learning loop is wired in, and no client data or prices leak into these public files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(ROOT, '.claude', 'skills', 'sme-audit', 'SKILL.md');
const COMMAND = join(ROOT, '.claude', 'commands', 'sme-audit.md');
const REPORT = join(ROOT, '.claude', 'templates', 'sme-audit-report.md');
const GBP = join(ROOT, '.claude', 'templates', 'sme-gbp-copy-pack.md');
const PUBLIC_FILES = [SKILL, COMMAND, REPORT, GBP];

const read = (file) => readFileSync(file, 'utf8');
const headings = (text) =>
  text
    .split('\n')
    .filter((line) => /^#{1,3} /.test(line))
    .map((line) => line.replace(/^#+ /, '').trim());

test('the skill, command and both templates exist', () => {
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
    'Phase 8 — Publish',
    'Phase 9 — Retro and learn',
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

test('the command is a thin entry point to the skill', () => {
  const text = read(COMMAND);
  assert.match(text, /sme-audit <client-slug> <url>/);
  assert.ok(text.includes('skills/sme-audit/SKILL.md'));
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

test('public files carry no client names, contact details or prices', () => {
  const banned = /rolfing|janco|oost|carsa|€\s?\d|\d+\s?euro|@[a-z0-9-]+\.(nl|com|co\.uk)/i;
  for (const file of PUBLIC_FILES) assert.doesNotMatch(read(file), banned, file);
});
