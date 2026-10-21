// Checks that the private Semrush skills (content-brief, competitor-gap, backlink-audit) are linked, carry the studio rules and licence files, and are wired into the seo agent and /site-audit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const INTERNAL = process.env.WEBFLOW_INTERNAL ?? join(homedir(), 'webflow-internal');
const SKILLS = ['content-brief', 'competitor-gap', 'backlink-audit'];

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const topPaths = () => {
  const match = read('scripts/link-internal.sh').match(/^TOP_PATHS=\(([^)]*)\)/m);
  assert.ok(match, 'no TOP_PATHS=( ... ) array in scripts/link-internal.sh');
  return match[1].split(/\s+/).filter(Boolean);
};

const phase5 = () => {
  const text = read('.claude/commands/site-audit.md');
  const start = text.search(/^## Phase 5/m);
  assert.ok(start >= 0, 'site-audit.md has no Phase 5 heading');
  const rest = text.slice(start + 1);
  const end = rest.search(/^## /m);
  return end >= 0 ? rest.slice(0, end) : rest;
};

test('TOP_PATHS lists the three Semrush skills', () => {
  const paths = topPaths();
  const missing = SKILLS.map((skill) => `.claude/skills/${skill}`).filter((path) => !paths.includes(path));
  assert.deepEqual(missing, [], `TOP_PATHS is missing ${missing.join(', ')}`);
});

test('the seo agent has the backlinks, competitors and traffic tools', () => {
  const text = read('.claude/agents/seo.md');
  for (const tool of ['backlinks_research', 'competitors_research', 'traffic_overview'])
    assert.match(text, new RegExp(`- mcp__claude_ai_SEMRush__${tool}\\n`), tool);
});

test('site-audit Phase 5 runs competitor-gap in Layer B and backlink-audit in Layer D', () => {
  const text = phase5();
  assert.match(text, /Layer B[^\n]*\n[\s\S]*?`competitor-gap`/);
  assert.match(text, /Layer D[^\n]*Backlink/);
  assert.ok(text.includes('`backlink-audit`'), 'Phase 5 does not name the backlink-audit skill');
  assert.match(text, /A\+B\+D/, 'gate question does not offer A+B+D');
});

test('the site-audit report template has a Backlink Profile section', () => {
  assert.match(read('.claude/templates/site-audit-report.md'), /^## Backlink Profile$/m);
});

test('each Semrush skill has Studio rules, UPSTREAM, LICENSE and NOTICE', { skip: !existsSync(INTERNAL) && `${INTERNAL} not found` }, () => {
  for (const skill of SKILLS) {
    const dir = join(INTERNAL, '.claude/skills', skill);
    for (const file of ['SKILL.md', 'UPSTREAM', 'LICENSE', 'NOTICE'])
      assert.ok(existsSync(join(dir, file)), `${skill}/${file} missing`);
    const text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const rules = text.match(/^## Studio rules\n([\s\S]*?)(?=^## )/m);
    assert.ok(rules, `${skill}/SKILL.md has no ## Studio rules section`);
    assert.ok(rules[1].includes('.claude/agents/seo.md'), `${skill} Studio rules do not point at .claude/agents/seo.md`);
    assert.match(readFileSync(join(dir, 'UPSTREAM'), 'utf8'), /semrush\/skills[\s\S]*019ab369403c0e816707edae6194fa3bb47dfcd0/);
  }
});
