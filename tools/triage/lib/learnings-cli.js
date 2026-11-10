// `cli.js learnings extract|add|comment|digest`: extract turns the pointer inbox into today's bounded excerpts-<date>.json (cursor in state.json, floored 4 days back; no candidates writes the "No learnings today." digest and prints noModel), add appends one dated line to a `## <skill>` section of the learnings journal (10 a day), comment posts one gated "Learnings:" comment per task per day through tools/notion/client.js addComment, and digest places a validated draft as digest-<date>.md. Every subcommand refuses inside a build job and refuses --now (the clock picks the day; tests set TRIAGE_TEST_NOW). Paths come only from code defaults (tests override them with TRIAGE_TEST_LEARNINGS_DIR, TRIAGE_TEST_LEARNINGS_FILE, TRIAGE_TEST_COMMENTS_LEDGER and TRIAGE_TEST_TMP_DIR, never a flag); --text-file and --in must sit under the triage tmp dir.
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { addComment, notionClientFromEnv } from '../../notion/client.js';
import { UsageError, clock, out, readJsonFile, refuseInBuildJob } from './cli-io.js';
import { PAGE_ID, REPO_ROOT, claim, release } from './jobs.js';
import { allowLearningsComment, amsterdamDayStart, appendLearning, buildExcerpts, readJsonl, readTranscriptFile, selectPointers, validateDigest } from './learnings.js';
import { writeAtomic } from './snapshot.js';
import { DAY_MS, amsterdamDate, toMs } from './workdays.js';

export const DEFAULT_LEARNINGS_DIR = join(REPO_ROOT, '.claude/triage/learnings');
export const DEFAULT_LEARNINGS_FILE = join(homedir(), '.claude/context/learnings.md');
export const DEFAULT_COMMENTS_LEDGER = join(REPO_ROOT, '.claude/triage/comments.jsonl');
export const DEFAULT_TMP_DIR = join(REPO_ROOT, '.claude/triage/tmp');
export const MAX_ADDS_PER_DAY = 10;
export const LOOKBACK_DAYS = 4;
export const INBOX_KEEP_DAYS = 30;

const TEST_ENV = { dir: 'TRIAGE_TEST_LEARNINGS_DIR', file: 'TRIAGE_TEST_LEARNINGS_FILE', ledger: 'TRIAGE_TEST_COMMENTS_LEDGER', tmp: 'TRIAGE_TEST_TMP_DIR' };

function paths(env = process.env) {
  return {
    dir: resolve(env[TEST_ENV.dir] || DEFAULT_LEARNINGS_DIR),
    file: resolve(env[TEST_ENV.file] || DEFAULT_LEARNINGS_FILE),
    ledger: resolve(env[TEST_ENV.ledger] || DEFAULT_COMMENTS_LEDGER),
    tmp: resolve(env[TEST_ENV.tmp] || DEFAULT_TMP_DIR),
  };
}

const iso = (value) => new Date(value).toISOString();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function appendJsonl(path, row) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(row)}\n`);
}

// A model-written draft is read only from the triage tmp dir, after resolving symlinks.
function readTmpFile(path, tmpDir, flag) {
  let real;
  let root;
  try {
    real = realpathSync(resolve(path));
    root = realpathSync(tmpDir);
  } catch {
    throw new UsageError(`--${flag} must be an existing file under ${tmpDir}`);
  }
  if (!real.startsWith(root + sep)) throw new UsageError(`--${flag} must be under ${tmpDir}`);
  return readFileSync(real, 'utf8');
}

// Same day: reuse the day's window so a re-run rewrites the full file. Otherwise start at the
// last run (evening and weekend sessions), or today's midnight on a first run; never > 4 days back.
function windowStart(state, now) {
  const floor = toMs(now) - LOOKBACK_DAYS * DAY_MS;
  const start = state?.date === amsterdamDate(now) && state.since ? state.since : (state?.lastExtractAt ?? amsterdamDayStart(now));
  return iso(Math.max(toMs(start) || floor, floor));
}

// Rewritten only when something expired, to keep the window for a racing hook append small.
function pruneInbox(inbox, pointers, now) {
  const keepFrom = toMs(now) - INBOX_KEEP_DAYS * DAY_MS;
  const kept = pointers.filter((p) => toMs(p.endedAt) >= keepFrom);
  if (kept.length < pointers.length) writeAtomic(inbox, kept.map((p) => `${JSON.stringify(p)}\n`).join(''));
}

function runExtract(args, now, { dir }) {
  const today = amsterdamDate(now);
  const statePath = join(dir, 'state.json');
  const since = windowStart(readJsonFile(statePath), now);
  const inbox = join(dir, 'inbox.jsonl');
  const pointers = readJsonl(inbox);
  const excerpts = buildExcerpts(selectPointers(pointers, { since, now }), readTranscriptFile, { since, now });
  const path = writeAtomic(join(dir, `excerpts-${today}.json`), json(excerpts));
  writeAtomic(statePath, json({ lastExtractAt: iso(now), date: today, since }));
  pruneInbox(inbox, pointers, now);
  const candidates = excerpts.sessions.reduce((n, s) => n + s.candidates.length, 0);
  const summary = { sessions: excerpts.sessions.length, candidates, tasks: excerpts.tasks.length, path };
  if (!candidates) {
    writeAtomic(join(dir, `digest-${today}.md`), 'No learnings today.\n');
    summary.noModel = true;
  }
  out(summary);
  return 0;
}

function runAdd(args, now, { dir, file }) {
  if (!args.skill || args.text === undefined) throw new UsageError('learnings add needs --skill and --text');
  const ledger = join(dir, `added-${amsterdamDate(now)}.jsonl`);
  if (readJsonl(ledger).length >= MAX_ADDS_PER_DAY) {
    out({ added: false, reason: 'daily-limit' });
    return 1;
  }
  // Write through a symlinked journal rather than replacing the link with a file.
  const target = existsSync(file) ? realpathSync(file) : file;
  const result = appendLearning(existsSync(target) ? readFileSync(target, 'utf8') : '', args.skill, args.text, { now });
  if (result.refused) {
    out({ added: false, reason: result.refused });
    return 1;
  }
  writeAtomic(target, result.text);
  appendJsonl(ledger, { skill: args.skill, at: iso(now) });
  const { count, warn } = result;
  out({ skill: args.skill, count, warn, ...(warn ? { message: `## ${args.skill} has ${count} entries; propose a merge of similar lines` } : {}) });
  return 0;
}

function commentText(args, tmpDir) {
  const hasText = args.text !== undefined;
  if (hasText === (args['text-file'] !== undefined)) throw new UsageError('learnings comment needs exactly one of --text or --text-file');
  return hasText ? args.text : readTmpFile(args['text-file'], tmpDir, 'text-file').replace(/\s+$/, '');
}

// The gate runs, then an atomic mkdir claim on learnings/claims/<date>/<task> before the
// Notion call, so two concurrent calls for one task cannot both post. A failed post releases
// the claim (a retry may post); a posted one keeps it and adds the ledger line.
async function runComment(args, now, { dir, ledger, tmp }, { notionClient } = {}) {
  if (!args.task || !PAGE_ID.test(args.task)) throw new UsageError('learnings comment needs --task <pageId>');
  const text = commentText(args, tmp);
  const today = amsterdamDate(now);
  const gate = allowLearningsComment({ taskId: args.task, text }, readJsonFile(join(dir, `excerpts-${today}.json`)), readJsonl(ledger), now);
  const claims = join(dir, 'claims', today);
  const claimed = gate.ok && claim(claims, args.task, { at: iso(now) }).ok;
  if (!claimed) {
    out({ posted: false, reason: gate.ok ? 'already-commented-today' : gate.reason });
    return 1;
  }
  let res;
  try {
    res = await addComment(notionClient ?? (await notionClientFromEnv()), args.task, text);
  } catch (err) {
    release(claims, args.task);
    throw err;
  }
  appendJsonl(ledger, { taskId: args.task, source: 'learnings', sourceId: `learnings-${today}`, at: iso(now) });
  out({ posted: true, task: args.task, commentId: res?.id ?? null });
  return 0;
}

function runDigest(args, now, { dir, tmp }) {
  if (!args.in) throw new UsageError('learnings digest needs --in <draft under .claude/triage/tmp/>');
  const digest = validateDigest(readTmpFile(args.in, tmp, 'in'));
  if (!digest.ok) {
    out({ written: false, reason: digest.reason });
    return 1;
  }
  out({ written: true, path: writeAtomic(join(dir, `digest-${amsterdamDate(now)}.md`), digest.text) });
  return 0;
}

const SUBCOMMANDS = { extract: runExtract, add: runAdd, comment: runComment, digest: runDigest };

// deps.notionClient replaces the real client in tests; comment returns a promise.
export function run(args, config, deps = {}) {
  if (refuseInBuildJob('learnings')) return 2;
  const [, sub] = args.positional;
  const command = SUBCOMMANDS[sub];
  if (!command) throw new UsageError(`unknown learnings subcommand: ${sub ?? '(none)'}`);
  // The day picks the ledger, cap and excerpts, so it comes from the clock, never a flag.
  return command(args, clock(args, 'learnings'), paths(), deps);
}
