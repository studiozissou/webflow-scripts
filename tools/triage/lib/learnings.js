// Pure rules for the P2 learnings loop: read SessionEnd and job pointers from learnings/inbox.jsonl (readJsonl), select one window of them (job pointers join sessions on the job worktree cwd), extract correction, interrupt and reverted-edit turns from a transcript into a bounded excerpt file, append a dated line to a `## <skill>` section of the learnings journal, gate learnings comments, and validate the digest draft. All transcript text passes sanitize() and is marked untrusted.
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { UsageError } from './cli-io.js';
import { jsonLines, sanitize } from './sessions.js';
import { amsterdamDate, toMs } from './workdays.js';

export const MAX_CANDIDATES = 6;
export const MAX_EXCERPT_BYTES = 64 * 1024;
export const MAX_TRANSCRIPT_BYTES = 20 * 1024 * 1024;
export const SECTION_WARN = 15;
export const MAX_LEARNING = 300;
export const MAX_COMMENT = 1500;
export const COMMENT_PREFIX = 'Learnings:';
export const MAX_DIGEST_LINES = 40;
export const MAX_DIGEST_BULLETS = 3;
const MAX_USER = 500;
const MAX_BEFORE = 300;
const SHORT_TURN = 400;
const SKILL = /^[a-z0-9-]+$/;
const INTERRUPT = '[Request interrupted by user';
const WRAPPER = /^\s*(<local-command-|<command-(name|message|args)>|<system-reminder>|Caveat:)/;
// Entries that are not a turn the user typed in this thread: compaction summaries, subagent
// sidechains, transcript-only notes and meta lines.
const NOT_A_TURN = ['isMeta', 'isCompactSummary', 'isSidechain', 'isVisibleInTranscriptOnly'];
const MAX_AT = 40;
// Claude Code's own slash commands, which say nothing about a skill.
const BUILT_INS = new Set(('clear compact resume model config cost help login logout status exit init memory permissions agents mcp hooks fast '
  + 'context export rewind usage doctor ide plugin add-dir bashes vim theme terminal-setup release-notes upgrade feedback bug '
  + 'privacy-settings statusline output-style todos sandbox security-review review pr-comments install-github-app migrate-installer '
  + 'artifacts workflows tasks').split(' '));
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
const COMMAND_NAME = /<command-name>\/?([A-Za-z0-9:_-]{1,64})<\/command-name>/g;

// Correction heuristic (cheap on purpose; the model judges the excerpts). A user turn is a
// candidate when it starts (after spaces or punctuation) with a rejection word, or when it is
// short (<= 400 chars) and says "actually", "that's wrong", "not what I", "wrong" or "instead".
// "stop", "undo", "no" and the like count only at the start: mid-sentence they are usually a
// request ("how do I stop Gmail..."). A plain question (starts with a question word, ends with
// "?") is not a correction unless it has one of the strong phrases.
const APOS = "['\u2019]?";
const LEAD = '^[\\s\\p{P}]*';
const START = new RegExp(`${LEAD}(no|nope|actually|wrong|don${APOS}t|do not|stop|undo|revert)\\b`, 'iu');
const ANYWHERE = new RegExp(`\\b(actually|that${APOS}s wrong|not what i|wrong|instead)\\b`, 'i');
const STRONG = new RegExp(`\\b(actually|that${APOS}s wrong|not what i)\\b`, 'i');
const QUESTION = new RegExp(`${LEAD}(how|what|why|where|when|can|could|is|are|does|do you)\\b`, 'iu');

const isQuestion = (text) => QUESTION.test(text) && text.trimEnd().endsWith('?') && !STRONG.test(text);
const isCorrection = (text) => !isQuestion(text) && (START.test(text) || (text.length <= SHORT_TURN && ANYWHERE.test(text)));

// JSON objects only: a bare array or scalar line is not an entry.
const objectLines = (text) => jsonLines(String(text ?? '')).filter((v) => !Array.isArray(v));

// Objects from a JSONL file; a missing file is empty. Used for the inbox and the ledgers.
export function readJsonl(path) {
  try {
    return objectLines(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
}


// The instant Europe/Amsterdam's calendar day starts (22:00Z or 23:00Z the day before).
export function amsterdamDayStart(input) {
  const day = amsterdamDate(input);
  const utc = Date.parse(`${day}T00:00:00Z`);
  for (const hours of [2, 1, 0]) {
    const at = utc - hours * 3_600_000;
    if (amsterdamDate(new Date(at)) === day) return new Date(at).toISOString();
  }
  return new Date(utc).toISOString();
}

// Epoch ms for an ISO string or Date; NaN for anything else (including null).
export { toMs };

// Session pointers that ended in (since, now], last one per sessionId, with taskPageId/slug from
// any job pointer on the same cwd (the job worktree). All job pointers join, not just the window.
export function selectPointers(pointers, { since, now = new Date() } = {}) {
  const from = toMs(since ?? amsterdamDayStart(now));
  const to = toMs(now);
  const jobs = new Map(pointers.filter((p) => p.kind === 'job' && p.cwd).map((p) => [p.cwd, p]));
  const sessions = new Map();
  for (const p of pointers) {
    if (p.kind === 'job' || typeof p.sessionId !== 'string' || !p.sessionId) continue;
    const at = toMs(p.endedAt);
    if (!(at > from && at <= to)) continue;
    const job = jobs.get(p.cwd);
    sessions.set(p.sessionId, job ? { ...p, taskPageId: job.taskPageId, slug: job.slug } : { ...p });
  }
  return [...sessions.values()];
}

function blocksOf(entry) {
  const content = entry?.message?.content;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return Array.isArray(content) ? content : [];
}

const textOf = (blocks) => blocks.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');

// A transcript timestamp we can trust to compare: a short parseable string, else null.
const stamp = (value) => (typeof value === 'string' && value.length <= MAX_AT && Number.isFinite(toMs(value)) ? value : null);

function candidate(kind, user, before, at) {
  return { kind, user: sanitize(user, { max: MAX_USER }), before: sanitize(before, { max: MAX_BEFORE }), at: stamp(at), untrusted: true };
}

// One pass over the transcript; state is the last assistant text, a pending interrupt and the
// Edit history per file (an Edit whose new_string restores an earlier old_string is a revert).
// With since, a resumed session's turns at or before it are dropped (untimed turns are kept),
// so they are not reported twice; the earlier turns still feed the state.
export function extractCandidates(transcriptText, { since = null } = {}) {
  const from = toMs(since);
  const candidates = [];
  const skills = new Set();
  const edits = new Map();
  let before = '';
  let interrupted = false;
  const add = (c) => candidates.length < MAX_CANDIDATES && !(c.at && toMs(c.at) <= from) && candidates.push(c);

  for (const entry of objectLines(transcriptText)) {
    if (NOT_A_TURN.some((flag) => entry[flag])) continue;
    const blocks = blocksOf(entry);
    if (entry.type === 'assistant') {
      for (const b of blocks) {
        if (b?.type === 'text' && typeof b.text === 'string' && b.text.trim()) before = b.text;
        if (b?.type !== 'tool_use') continue;
        if (b.name === 'Skill' && typeof b.input?.skill === 'string') skills.add(sanitize(b.input.skill, { max: 64 }));
        if (b.name === 'Edit') {
          const { file_path: file, old_string: oldText, new_string: newText } = b.input ?? {};
          if (typeof file !== 'string') continue;
          const history = edits.get(file) ?? [];
          if (newText !== oldText && history.includes(newText)) add(candidate('revert', `Reverted an earlier edit to ${basename(file)}`, before, entry.timestamp));
          edits.set(file, [...history, oldText]);
        }
      }
      continue;
    }
    if (entry.type !== 'user') continue;
    const raw = textOf(blocks);
    for (const [, name] of raw.matchAll(COMMAND_NAME)) if (!BUILT_INS.has(name)) skills.add(name);
    if (raw.includes(INTERRUPT)) {
      interrupted = true;
      continue;
    }
    const text = raw.replace(REMINDER, '').trim();
    if (!text || WRAPPER.test(text)) continue;
    if (interrupted) add(candidate('interrupt', text, before, entry.timestamp));
    else if (isCorrection(text)) add(candidate('correction', text, before, entry.timestamp));
    interrupted = false;
  }
  return { candidates, skills: [...skills].filter(Boolean) };
}

// Default transcript reader: only .jsonl files up to 20 MB; anything else reads as missing.
export function readTranscriptFile(path) {
  try {
    if (!String(path).endsWith('.jsonl') || statSync(path).size > MAX_TRANSCRIPT_BYTES) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

const sizeOf = (value) => Buffer.byteLength(JSON.stringify(value, null, 2));
const tasksOf = (sessions) => [...new Set(sessions.map((s) => s.taskPageId).filter(Boolean))];

export function buildExcerpts(pointers, readTranscript = readTranscriptFile, { since = null, now = new Date(), maxBytes = MAX_EXCERPT_BYTES } = {}) {
  const sessions = [];
  for (const p of pointers) {
    if (typeof p.transcriptPath !== 'string' || !p.transcriptPath.endsWith('.jsonl')) continue;
    const text = readTranscript(p.transcriptPath);
    if (typeof text !== 'string') continue;
    const { candidates, skills } = extractCandidates(text, { since });
    if (!candidates.length) continue;
    sessions.push({
      sessionId: p.sessionId,
      cwd: p.cwd ?? null,
      ...(p.taskPageId ? { taskPageId: p.taskPageId } : {}),
      ...(p.slug ? { slug: p.slug } : {}),
      skills,
      candidates,
    });
  }
  const excerpts = { generatedAt: new Date(now).toISOString(), since, sessions, tasks: tasksOf(sessions) };
  while (excerpts.sessions.length && sizeOf(excerpts) > maxBytes) {
    excerpts.sessions.pop();
    excerpts.tasks = tasksOf(excerpts.sessions);
  }
  return excerpts;
}

const ENTRY = /^- \d{4}-\d{2}-\d{2}: (.*)$/;
const isHeading = (line) => /^#{1,2} /.test(line);

function checkLearning(skill, text) {
  if (typeof skill !== 'string' || !SKILL.test(skill)) throw new UsageError(`--skill must match ${SKILL}: ${skill}`);
  if (typeof text !== 'string' || /[\r\n]/.test(text)) throw new UsageError('--text must be a single line');
  if (text.length > MAX_LEARNING) throw new UsageError(`--text is longer than ${MAX_LEARNING} chars`);
  const clean = sanitize(text, { max: MAX_LEARNING });
  if (!clean) throw new UsageError('--text is empty');
  return clean;
}

// Inserts `- YYYY-MM-DD: text` after the last entry of `## <skill>`, or adds the section at the
// end. Returns { text, count, warn } or { refused: 'duplicate' } when the section has it already.
export function appendLearning(fileText, skill, line, { now = new Date() } = {}) {
  const clean = checkLearning(skill, line);
  const lines = String(fileText ?? '').replace(/\n+$/, '').split('\n');
  const start = lines.findIndex((l) => l.trimEnd() === `## ${skill}`);
  const entry = `- ${amsterdamDate(now)}: ${clean}`;
  if (start === -1) {
    const head = lines.join('\n').trim() ? `${lines.join('\n')}\n\n` : '';
    return { text: `${head}## ${skill}\n\n${entry}\n`, count: 1, warn: false };
  }
  let end = lines.findIndex((l, i) => i > start && isHeading(l));
  if (end === -1) end = lines.length;
  const section = lines.slice(start + 1, end);
  const existing = section.map((l) => l.match(ENTRY)?.[1]).filter((t) => t !== undefined);
  if (existing.includes(clean)) return { refused: 'duplicate', count: existing.length };
  let at = end;
  while (at > start + 1 && !lines[at - 1].trim()) at--;
  // An empty section gets a blank line under its heading first.
  lines.splice(at, 0, ...(at === start + 1 ? ['', entry] : [entry]));
  const count = existing.length + 1;
  return { text: `${lines.join('\n')}\n`, count, warn: count > SECTION_WARN };
}

// Write gate for a learnings comment. P4's comments.js allowComment() will generalise this to
// every comment source; until then this is the only automatic Notion write P2 makes. The target
// must be a task in today's Node-built excerpts, so transcript text cannot choose it.
export function allowLearningsComment({ taskId, text }, excerpts, ledger, now = new Date()) {
  if (!Array.isArray(excerpts?.tasks) || !excerpts.tasks.includes(taskId)) return { ok: false, reason: 'task-not-in-excerpts' };
  if (typeof text !== 'string' || !text.startsWith(COMMENT_PREFIX)) return { ok: false, reason: 'prefix' };
  if (text.length > MAX_COMMENT) return { ok: false, reason: 'too-long' };
  const today = amsterdamDate(now);
  const done = ledger.some((l) => l.taskId === taskId && l.source === 'learnings' && Number.isFinite(toMs(l.at)) && amsterdamDate(l.at) === today);
  return done ? { ok: false, reason: 'already-commented-today' } : { ok: true };
}

export function validateDigest(markdown) {
  const lines = String(markdown ?? '').replace(/\n+$/, '').split('\n').map((l) => (l.trim() ? sanitize(l, { max: MAX_LEARNING }) : ''));
  if (!lines.some(Boolean)) return { ok: false, reason: 'empty' };
  if (lines.length > MAX_DIGEST_LINES) return { ok: false, reason: 'too-many-lines' };
  if (lines.filter((l) => l.startsWith('- ')).length > MAX_DIGEST_BULLETS) return { ok: false, reason: 'too-many-learnings' };
  return { ok: true, text: `${lines.join('\n')}\n` };
}
