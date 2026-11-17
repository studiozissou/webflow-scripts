// Scans the public site-report folders and templates for client names, and checks the code rules and the sample and private-data rules.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, TOOLS } from './helpers.js';

const part = (...bits) => bits.join('');
const CLIENT_NAMES = [
  part('car', 'sa'),
  part('\\boo', 'st\\b'),
  part('rol', 'fing'),
  part('tam', 'sen'),
  part('coco', 'nut'),
  part('jay', ' ?shetty'),
  part('ready ?hit', ' ?play'),
  part('studio ?zis', 'sou'),
  part('zis', 'sou'),
  part('\\br', 'hp\\b'),
  part('\\bn', 'em\\b'),
  part('tom', 'ek'),
];
const NAMES = new RegExp(CLIENT_NAMES.join('|'), 'i');

const SCAN = ['tools/site-report', 'tests/site-report', '.claude/templates/goal-report.md', '.claude/templates/goal-plan.md'];

function walk(path) {
  const entries = readdirSync(path, { withFileTypes: true });
  return entries.flatMap((e) => (e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)]));
}

function filesOf(target) {
  const full = join(ROOT, target);
  return full.endsWith('.md') ? [full] : walk(full);
}

const scanned = () => SCAN.flatMap(filesOf).filter((f) => !/__pycache__|\.pyc$|\.png$/.test(f));

describe('scanner', () => {
  it('catches a planted client name', () => {
    assert.ok(NAMES.test(part('the ', 'Car', 'sa team')));
    assert.ok(NAMES.test(part('Oo', 'st restaurant')));
    assert.equal(NAMES.test('a boost in membership'), false);
  });
});

describe('repo scan', () => {
  it('finds files to scan in every folder', () => {
    const files = scanned().map((f) => relative(ROOT, f));
    for (const prefix of ['tools/site-report/', 'tests/site-report/', '.claude/templates/goal-']) {
      assert.ok(files.some((f) => f.startsWith(prefix)), prefix);
    }
  });

  it('names no client in tools/site-report, tests/site-report or the templates', () => {
    const hits = scanned()
      .filter((f) => NAMES.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    assert.deepEqual(hits, []);
  });

  it('keeps private data files out of the public folders', () => {
    const bad = walk(join(ROOT, 'tools', 'site-report')).filter((f) => /metrics-.*\.json$|sample-.*\.json$|review-.*\.md$|goals\.json$/.test(f));
    assert.deepEqual(bad, []);
  });
});

describe('code rules', () => {
  const code = () => walk(TOOLS).filter((f) => /\.(js|py)$/.test(f) && !f.includes('__pycache__'));

  it('tools/site-report has code to check', () => {
    assert.ok(code().some((f) => f.endsWith('schema.js')));
    assert.ok(code().some((f) => f.endsWith('charts.py')));
  });

  it('has no default export and no console.log', () => {
    for (const f of code().filter((p) => p.endsWith('.js'))) {
      const text = readFileSync(f, 'utf8');
      assert.ok(!/export\s+default/.test(text), `${relative(ROOT, f)} has a default export`);
      assert.ok(!/console\.log/.test(text), `${relative(ROOT, f)} has console.log`);
    }
  });

  it('has one header sentence and no other comments', () => {
    for (const f of code()) {
      const lines = readFileSync(f, 'utf8').split('\n');
      const marker = f.endsWith('.py') ? '#' : '//';
      assert.ok(lines[0].startsWith(`${marker} `) && /\.$/.test(lines[0]), `${relative(ROOT, f)} needs a one-sentence header`);
      const others = lines.slice(1).filter((l) => (f.endsWith('.py') ? /(^|\s)#\s/.test(l) : /^\s*(\/\/|\/\*|\*)|\s\/\/\s/.test(l)));
      assert.deepEqual(others, [], relative(ROOT, f));
    }
  });
});
