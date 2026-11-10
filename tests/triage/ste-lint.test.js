// Guards the digest STE lint: sentence length, average length, banned words, dashes, emoji, digits, line cap and section counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint, DEFAULT_LINT_RULES } from '../../tools/triage/lib/ste-lint.js';

const GOOD = [
  '*Daybook, Wed 11 Nov*',
  '*NOW (2)*',
  '1. Reply to Dana (Acme). She asked for the phase B quote 3 days ago. Draft ready.',
  '2. New business: Bakery Example wants a site. Draft ready.',
  '*TODAY (1)*',
  '3. Fix the Globex menu PDF link. Due today. P0.',
  '*EMAILS TO REPLY (2 drafts in Gmail)*  new business first, one line each',
  '- Bakery Example: new site enquiry.',
  '- Dana (Acme): phase B quote.',
  '*CLAUDE CAN BUILD*  reply "go 1 3" or "go all"',
  'B1. Add FAQ schema to Contoso (~1 h). /generate-schema',
  '*PROPOSED CHANGES*  reply "ok changes"',
  'C1. Acme A/B spec: P2 → P1 (due Fri).',
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
  const r = lint('Just reply to Dana.\nPlease note the quote is due.\nThis is really basically done.');
  assert.deepEqual(rulesOf(r), ['banned-word', 'banned-word', 'banned-word', 'banned-word']);
  assert.match(r.warnings[1].message, /please note/);
});

test('banned words match whole words only', () => {
  assert.equal(lint('Adjust the justified text.').ok, true);
});

test('em and en dashes warn, hyphens do not', () => {
  const r = lint('Reply to Dana — today.\nFix pages 2–4.\nUse the A/B test-plan.');
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
  const r = lint('*NOW (3)*\n1. Reply to Dana.\n2. Fix the link.\n*TODAY (1)*\n3. Send the invoice.\nFull report: x.md');
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
  assert.equal(lint('Reply to Dana today.', { maxSentenceWords: 3 }).ok, false);
  assert.equal(lint('Just reply.', { bannedWords: ['reply'] }).warnings[0].message.includes('reply'), true);
  assert.equal(lint('She asked three days ago.', { checkNumbers: false }).ok, true);
});

const TEN = [
  '*NOW (2)*',
  '1. Reply to Dana. She asked for the quote.',
  '2. Fix the menu link. Due today.',
  '*TODAY (1)*',
  '3. Send the invoice. Then file it. Check the total.',
  'Draft ready. Report saved.',
  'Just ship it.',
].join('\n');

test('ratio is passing sentences over total: 1 failing sentence in 10 is 0.90', () => {
  const r = lint(TEN);
  assert.equal(r.ratio, 0.9);
  assert.deepEqual(rulesOf(r), ['banned-word']);
});

test('ratio counts each per-sentence rule against the sentence that breaks it', () => {
  const long = Array.from({ length: 21 }, (_, i) => `w${i}`).join(' ');
  const text = `Reply now. Wait — then go.\nShip it 🚀. She asked three days ago.\n${long}. Done.`;
  const r = lint(text);
  assert.equal(r.ratio, 2 / 6);
});

test('headers and document-level rules do not change the ratio', () => {
  assert.equal(lint('*NOW (3)*\n1. Reply to Dana.').ratio, 1);
  assert.equal(lint('*Just — a header 🚀*\nReply to Dana.').ratio, 1);
  const s = Array.from({ length: 18 }, (_, i) => `w${i}`).join(' ');
  const avg = lint(`${s}.\n${s}.`);
  assert.deepEqual(rulesOf(avg), ['average-length']);
  assert.equal(avg.ratio, 1);
  assert.equal(lint(Array.from({ length: 41 }, (_, i) => `Line ${i}.`).join('\n')).ratio, 1);
});

test('text with no sentences has ratio 0 (passing / max(1, total)) and the spec digest example has ratio 1', () => {
  assert.equal(lint('').ratio, 0);
  assert.equal(lint('*NOW (0)*').ratio, 0);
  assert.equal(lint(GOOD).ratio, 1);
});

test('a fragment with no words still fails when it breaks a rule', () => {
  assert.equal(lint('Reply now.\n🚀').ratio, 0.5);
});
