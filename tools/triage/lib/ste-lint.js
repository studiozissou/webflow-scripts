// Lints a Slack mrkdwn digest against the spec STE rules (sentence length and average, banned filler, em/en dashes, emoji, numbers as digits, 40-line cap, "(N)" header counts equal the item lines beneath), treating lines that open with *bold* as section headers excluded from sentence stats; "one sentence per line", "active voice verbs first" and "term defined on first use" are not checked because the spec's own example puts several sentences on one line and the other two need judgement.

export const DEFAULT_LINT_RULES = {
  maxSentenceWords: 20,
  maxAvgWords: 15,
  maxLines: 40,
  bannedWords: ['just', 'really', 'very', 'basically', 'note that', 'please note', 'kindly'],
  checkNumbers: true,
  spelledNumbers: [
    'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  ],
};

const HEADER = /^\*[^*\s][^*]*\*/;
const COUNT = /^\*[^*]*\((\d+)\b[^)]*\)[^*]*\*/;
const ITEM = /^\s*(?:[A-Za-z]?\d+[.)]|[-•])\s+/;
const DASH = /[‒–—―]/;
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const SHORTCODE = /:[a-z_+-][a-z0-9_+-]*:/i;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (phrase) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(phrase).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');

function sentencesOf(line) {
  return line
    .replace(ITEM, '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const wordCount = (sentence) => sentence.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export function lint(text = '', rules = {}) {
  const r = { ...DEFAULT_LINT_RULES, ...rules };
  const warnings = [];
  const warn = (rule, line, message) => warnings.push({ rule, line, message });
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const banned = r.bannedWords.map((w) => [w, wordRe(w)]);
  const numbers = r.spelledNumbers.map((w) => [w, wordRe(w)]);
  let totalWords = 0;
  let totalSentences = 0;

  if (lines.filter((l) => l.trim()).length > r.maxLines) {
    warn('line-count', lines.length, `digest has more than ${r.maxLines} lines`);
  }

  lines.forEach((line, i) => {
    const n = i + 1;
    if (!line.trim()) return;
    const header = HEADER.test(line.trim());
    for (const [word, re] of banned) if (re.test(line)) warn('banned-word', n, `banned word "${word}"`);
    if (r.checkNumbers) {
      for (const [word, re] of numbers) if (re.test(line)) warn('numbers-as-digits', n, `write "${word}" as digits`);
    }
    if (DASH.test(line)) warn('dash', n, 'em or en dash; use a full stop or comma');
    if (EMOJI.test(line) || SHORTCODE.test(line)) warn('emoji', n, 'emoji found');
    if (header) {
      const count = COUNT.exec(line.trim());
      if (count) {
        let found = 0;
        for (let j = i + 1; j < lines.length && !HEADER.test(lines[j].trim()); j++) {
          if (ITEM.test(lines[j])) found++;
        }
        if (found !== Number(count[1])) warn('section-count', n, `header says ${count[1]}, found ${found} item lines`);
      }
      return;
    }
    for (const sentence of sentencesOf(line)) {
      const words = wordCount(sentence);
      if (!words) continue;
      totalWords += words;
      totalSentences++;
      if (words > r.maxSentenceWords) warn('sentence-length', n, `${words} words; limit ${r.maxSentenceWords}`);
    }
  });

  if (totalSentences > 1 && totalWords / totalSentences > r.maxAvgWords) {
    warn('average-length', 0, `average ${(totalWords / totalSentences).toFixed(1)} words per sentence; limit ${r.maxAvgWords}`);
  }
  warnings.sort((a, b) => (a.line || Infinity) - (b.line || Infinity));
  return { ok: warnings.length === 0, warnings };
}
