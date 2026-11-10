// Guards the digest STE lint: sentence length, average length, banned words, dashes, emoji, digits, line cap and section counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint, DEFAULT_LINT_RULES } from '../../tools/triage/lib/ste-lint.js';

const GOOD = [
  '*Daybook, Wed 11 Nov*',
  '*NOW (2)*',
  '1. Reply to Anna (Carsa). She asked for the phase B quote 3 days ago. Draft ready.',
  '2. New business: Bakkerij De Pijp wants a site. Draft ready.',
  '*TODAY (1)*',
  '3. Fix the Oost menu PDF link. Due today. P0.',
  '*EMAILS TO REPLY (2 drafts in Gmail)*  new business first, one line each',
  '- Bakkerij De Pijp: new site enquiry.',
  '- Anna (Carsa): phase B quote.',
  '*CLAUDE CAN BUILD*  reply "go 1 3" or "go all"',
  'B1. Add FAQ schema to Rolfing Amsterdam (~1 h). /generate-schema',
  '*PROPOSED CHANGES*  reply "ok changes"',
  'C1. Carsa A/B spec: P2 → P1 (due Fri).',
  'Full report: .claude/triage/reports/2026-11-11.md',
].join('\n');

const rulesOf = (r) => r.warnings.map((w) => w.rule);

test('the spec digest example passes', () => {
  const r = lint(GOOD);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.ok, true);
});

test('a sentence over 20 words warns with its line number', () => {
  const long = Array.from({ length: 21 }, (_, i) => `w${i}`).join(' ');
  const r = lint(`*NOW (1)*\n1. ${long}.`);
  assert.deepEqual(rulesOf(r), ['sentence-length']);
  assert.equal(r.warnings[0].line, 2);
  assert.equal(r.ok, false);
});

test('an average over 15 words warns once', () => {
  const s = Array.from({ length: 18 }, (_, i) => `w${i}`).join(' ');
  const r = lint(`${s}.\n${s}.`);
  assert.deepEqual(rulesOf(r), ['average-length']);
});

test('banned filler words and phrases warn', () => {
  const r = lint('Just reply to Anna.\nPlease note the quote is due.\nThis is really basically done.');
  assert.deepEqual(rulesOf(r), ['banned-word', 'banned-word', 'banned-word', 'banned-word']);
  assert.match(r.warnings[1].message, /please note/);
});

test('banned words match whole words only', () => {
  assert.equal(lint('Adjust the justified text.').ok, true);
});

test('em and en dashes warn, hyphens do not', () => {
  const r = lint('Reply to Anna — today.\nFix pages 2–4.\nUse the A/B test-plan.');
  assert.deepEqual(rulesOf(r), ['dash', 'dash']);
});

test('emoji and Slack emoji shortcodes warn; arrows and times do not', () => {
  const r = lint('Ship it 🚀.\nDone :white_check_mark: today.\nP2 → P1 at 13:00.\nTerms © 2026 apply.');
  assert.deepEqual(rulesOf(r), ['emoji', 'emoji']);
});

test('spelled-out numbers warn', () => {
  const r = lint('She asked three days ago.');
  assert.deepEqual(rulesOf(r), ['numbers-as-digits']);
});

test('section counts must equal the item lines beneath', () => {
  const r = lint('*NOW (3)*\n1. Reply to Anna.\n2. Fix the link.\n*TODAY (1)*\n3. Send the invoice.\nFull report: x.md');
  assert.deepEqual(rulesOf(r), ['section-count']);
  assert.equal(r.warnings[0].line, 1);
  assert.match(r.warnings[0].message, /says 3, found 2/);
});

test('more than 40 lines warns', () => {
  const lines = Array.from({ length: 41 }, (_, i) => `Line ${i}.`);
  assert.deepEqual(rulesOf(lint(lines.join('\n'))), ['line-count']);
});

test('rules override the defaults', () => {
  assert.equal(DEFAULT_LINT_RULES.maxSentenceWords, 20);
  assert.equal(lint('Reply to Anna today.', { maxSentenceWords: 3 }).ok, false);
  assert.equal(lint('Just reply.', { bannedWords: ['reply'] }).warnings[0].message.includes('reply'), true);
  assert.equal(lint('She asked three days ago.', { checkNumbers: false }).ok, true);
});
