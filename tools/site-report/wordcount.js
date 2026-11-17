// Word gate for a goal-led report: visible words, sentence lengths and toggle rules, with exit code 1 on any breach.
import { readFileSync } from 'node:fs';
import { runIfMain, say, warn } from './cli.js';
import { escapeToggleTitles } from './report-data.js';

export const LIMITS = { visibleWords: 800, visibleSentence: 20, averageSentence: 15, bodySentence: 25, minSentenceWords: 3, summaryBullets: 5 };

const clean = (line) =>
  line
    .replace(/<image\b[^>]*>/g, ' ')
    .replace(/<\/image>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\\|/g, ' ')
    .trim()
    .replace(/^(?:[-*]|\d+\\?\.)\s+/, '');

const wordsOf = (text) => text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));

function sentencesOf(lines) {
  const found = [];
  const cells = lines.flatMap((line) => (/^\s*\|/.test(line) ? line.split(/(?<!\\)\|/) : [line]));
  for (const cell of cells) {
    for (const part of clean(cell).split(/(?<=[.?!])\s+/)) {
      const count = wordsOf(part).length;
      if (count >= LIMITS.minSentenceWords) found.push({ count, text: part });
    }
  }
  return found;
}

function split(text, errors) {
  const visible = [];
  const body = [];
  let depth = 0;
  let awaitTitle = false;
  let afterTitle = false;
  for (const line of text.split('\n')) {
    if (afterTitle && line.trim() !== '' && !/^\s*<\/toggle>/.test(line)) {
      errors.push(`a toggle title has no blank line before its body: ${line.trim()}`);
    }
    afterTitle = false;
    if (/^\s*<toggle\b/.test(line)) {
      depth += 1;
      if (depth === 1) awaitTitle = true;
      continue;
    }
    if (/^\s*<\/toggle>/.test(line)) {
      if (depth === 0) errors.push('a </toggle> close has no matching open');
      if (awaitTitle) errors.push('a toggle has no title');
      awaitTitle = false;
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) visible.push(line);
    else if (depth === 1 && awaitTitle && line.trim() !== '') {
      awaitTitle = false;
      if (/^\s*<p\s*\/>\s*$/.test(line)) errors.push('a toggle title is empty (its first child is <p />)');
      else {
        visible.push(line);
        afterTitle = true;
      }
    } else body.push(line);
  }
  if (depth > 0) errors.push(`${depth} toggle open(s) with no matching close`);
  return { visible, body };
}

export function countReport(text) {
  const errors = [];
  if (/\{toggle="true"\}/.test(text)) errors.push('found {toggle="true"}: use <toggle heading="h3"> markup');
  if (text.includes('[to write]')) errors.push('found a [to write] placeholder');
  if (escapeToggleTitles(text) !== text) errors.push('a numbered toggle title is not escaped: write 1\\. not 1.');
  const summary = text.match(/^#{1,3}\s+Summary\s*\n([\s\S]*?)(?=^#{1,3}\s|^<toggle\b|(?![\s\S]))/m);
  const bullets = summary ? summary[1].split('\n').filter((line) => /^[-*]\s+/.test(line)).length : 0;
  if (bullets > LIMITS.summaryBullets) errors.push(`Summary has ${bullets} bullets, over the limit of ${LIMITS.summaryBullets}`);
  const { visible, body } = split(text, errors);
  const visibleWords = wordsOf(visible.map(clean).join('\n')).length;
  const bodyWords = wordsOf(body.map(clean).join('\n')).length;
  const visibleUnits = sentencesOf(visible);
  const bodyUnits = sentencesOf(body);
  const average = visibleUnits.length
    ? visibleUnits.reduce((sum, unit) => sum + unit.count, 0) / visibleUnits.length
    : 0;
  if (visibleWords > LIMITS.visibleWords) {
    errors.push(`${visibleWords} visible words, over the limit of ${LIMITS.visibleWords}`);
  }
  for (const unit of visibleUnits.filter((u) => u.count > LIMITS.visibleSentence)) {
    errors.push(`visible sentence of ${unit.count} words (limit ${LIMITS.visibleSentence}): ${unit.text}`);
  }
  if (average > LIMITS.averageSentence) {
    errors.push(`average visible sentence is ${average.toFixed(1)} words, over the limit of ${LIMITS.averageSentence}`);
  }
  for (const unit of bodyUnits.filter((u) => u.count > LIMITS.bodySentence)) {
    errors.push(`toggle body sentence of ${unit.count} words (limit ${LIMITS.bodySentence}): ${unit.text}`);
  }
  return {
    visibleWords,
    bodyWords,
    visibleSentences: visibleUnits.length,
    averageVisible: Number(average.toFixed(1)),
    errors,
  };
}

function main(argv) {
  const file = argv[0];
  if (!file) {
    warn('usage: wordcount.js <report.md>');
    return 2;
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    warn(`cannot read ${file}: ${error.message}`);
    return 1;
  }
  const result = countReport(text);
  say(`visible words: ${result.visibleWords} (limit ${LIMITS.visibleWords})`);
  say(`toggle-body words: ${result.bodyWords}`);
  say(`visible sentences: ${result.visibleSentences}, average ${result.averageVisible} words`);
  for (const error of result.errors) say(`BREACH: ${error}`);
  return result.errors.length === 0 ? 0 : 1;
}

runIfMain(import.meta.url, main);
