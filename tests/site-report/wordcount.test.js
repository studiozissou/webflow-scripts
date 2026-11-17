// Tests for the word gate: visible words, sentence limits, toggle rules and the exit code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { countReport } from '../../tools/site-report/wordcount.js';
import { FIXTURES, PRIVATE_REPORTS, TOOLS, tempDir, hasFile } from './helpers.js';

const sentence = (n) => `${Array.from({ length: n }, (_, i) => `w${i}`).join(' ')}.`;
const run = (text) => {
  const dir = tempDir();
  const file = join(dir, 'report.md');
  writeFileSync(file, text);
  return spawnSync(process.execPath, [join(TOOLS, 'wordcount.js'), file], { encoding: 'utf8' });
};

test('counts toggle titles, skips toggle bodies and images', () => {
  const md = [
    'One two three.',
    '',
    '<toggle heading="h3">',
    'Title with four words',
    '',
    'Body words that must not count at all here.',
    '</toggle>',
    '',
    '<image source="file-upload://abc"></image>',
    '',
  ].join('\n');
  const r = countReport(md);
  assert.equal(r.visibleWords, 3 + 4);
  assert.equal(r.bodyWords, 9);
});

test('counts text in callouts and table cells, and link text but not link addresses', () => {
  const md = [
    '<callout icon="x" color="blue_bg">',
    '<b>The goal:</b> page one in town.',
    '</callout>',
    '<table header-row="false">',
    '<tr>',
    '<td>Cell with [a link](https://example.com/very/long/address) inside</td>',
    '</tr>',
    '</table>',
  ].join('\n');
  assert.equal(countReport(md).visibleWords, 6 + 5);
});

test('a report of 800 visible words or fewer passes, and the exit code is 0', () => {
  const lines = Array.from({ length: 80 }, () => sentence(10));
  const r = run(lines.join('\n\n'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('exits 1 over 800 visible words', () => {
  const lines = Array.from({ length: 81 }, () => sentence(10));
  const r = run(lines.join('\n\n'));
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /800/);
});

test('exits 1 on {toggle="true"} input', () => {
  const r = run('## Heading {toggle="true"}\n\nShort text here today.\n');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /toggle="true"/);
});

test('exits 1 on a toggle with an empty title and on a to-write placeholder', () => {
  assert.equal(run('<toggle heading="h3">\n<p />\n\nBody text for the toggle here.\n</toggle>\n').status, 1);
  assert.equal(run('Fine words here today. [to write]\n').status, 1);
});

test('a visible sentence over 20 words breaches, 20 words is fine', () => {
  assert.equal(countReport(sentence(21)).errors.length > 0, true);
  assert.deepEqual(countReport([sentence(20), sentence(5), sentence(5)].join('\n\n')).errors, []);
});

test('the average visible sentence over 15 words breaches', () => {
  const text = Array.from({ length: 5 }, () => sentence(18)).join('\n\n');
  const r = countReport(text);
  assert.ok(r.errors.some((e) => /average/i.test(e)), r.errors.join('|'));
  const ok = Array.from({ length: 5 }, () => sentence(15)).join('\n\n');
  assert.deepEqual(countReport(ok).errors, []);
});

test('a toggle body sentence over 25 words breaches, 25 is fine', () => {
  const wrap = (s) => `Short line here today.\n\n<toggle heading="h3">\nTitle words here\n\n${s}\n</toggle>\n`;
  assert.ok(countReport(wrap(sentence(26))).errors.some((e) => /toggle/i.test(e)));
  assert.deepEqual(countReport(wrap(sentence(25))).errors, []);
});

test('a sentence unit needs 3 or more words, and splits on . ? and !', () => {
  const r = countReport('Two words. Why is this so long? Yes it is!');
  assert.equal(r.visibleSentences, 2);
});

test('list markers and escaped numbering do not count as words or sentences', () => {
  const r = countReport('- Item one here.\n1. Item two here.\n<toggle heading="h3">\n1\\. Title words here\n\nBody text only.\n</toggle>\n');
  assert.equal(r.visibleWords, 9);
});

test('each table cell is its own sentence unit', () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
  const r = countReport(`| A | B | C |\n|---|---|---|\n| ${words(12)} | ${words(12)} | ${words(4)} |\n`);
  assert.deepEqual(r.errors, []);
  assert.equal(r.visibleSentences, 3);
});

test('exits 1 when a toggle title runs straight into its body with no blank line', () => {
  const r = countReport('<toggle heading="h3">\nTitle words here\nBody text only here.\n</toggle>\n');
  assert.ok(r.errors.some((e) => /blank line/i.test(e)), r.errors.join('|'));
});

test('exits 1 on a Summary with more than 5 bullets', () => {
  const summary = (n) => `## Summary\n${Array.from({ length: n }, (_, i) => `- Point number ${i} is here.`).join('\n')}\n\n## Next\n- One more point here.\n`;
  assert.ok(countReport(summary(6)).errors.some((e) => /summary/i.test(e)));
  assert.deepEqual(countReport(summary(5)).errors, []);
});

test('exits 1 when toggle opens and closes do not match', () => {
  const extraClose = countReport('<toggle heading="h3">\nTitle words here\n\nBody text only.\n</toggle>\n</toggle>\n');
  assert.ok(extraClose.errors.some((e) => /toggle/i.test(e) && /match|close/i.test(e)), extraClose.errors.join('|'));
  const unclosed = countReport('<toggle heading="h3">\nTitle words here\n\nBody text only.\n');
  assert.ok(unclosed.errors.some((e) => /toggle/i.test(e) && /match|close/i.test(e)), unclosed.errors.join('|'));
});

test('exits 1 on a numbered toggle title that is not escaped', () => {
  const r = countReport('<toggle heading="h3">\n1. Fix the sitemap\n\nBody text only.\n</toggle>\n');
  assert.ok(r.errors.some((e) => /escape/i.test(e)), r.errors.join('|'));
});

test('passes on the small-business example report', () => {
  const file = join(FIXTURES, 'small', 'report.md');
  const text = readFileSync(file, 'utf8');
  const r = countReport(text);
  assert.deepEqual(r.errors, []);
  assert.ok(r.visibleWords > 150, `example is too thin: ${r.visibleWords}`);
  const cli = spawnSync(process.execPath, [join(TOOLS, 'wordcount.js'), file], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});

test('passes on the multi-location mockup when it is linked', (t) => {
  const file = join(PRIVATE_REPORTS, 'report-mockup-2026-11', 'report.md');
  if (!hasFile(file)) {
    t.skip('private mockup is not linked');
    return;
  }
  const r = countReport(readFileSync(file, 'utf8'));
  assert.deepEqual(r.errors, []);
  assert.ok(r.visibleWords <= 800);
});
