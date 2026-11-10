// Guards the P2 learnings loop: the SessionEnd pointer hook (one line per session, kill switch, garbage stdin, missing private dir, JSON escaping, speed), learnings.js (pointer select by date and job join, correction-turn extraction, size bound, journal append) and the `cli.js learnings extract|add|comment|digest` write gates. Fixtures are fake.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readJsonl,
  selectPointers,
  extractCandidates,
  buildExcerpts,
  appendLearning,
  allowLearningsComment,
  validateDigest,
  MAX_CANDIDATES,
} from '../../tools/triage/lib/learnings.js';
import { sanitize } from '../../tools/triage/lib/sessions.js';
import { UsageError } from '../../tools/triage/lib/cli-io.js';
import { run as runLearnings } from '../../tools/triage/lib/learnings-cli.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'tools/triage/cli.js');
const HOOK = join(ROOT, 'scripts/hooks/learnings-pointer.sh');

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-learn-'));
  dirs.push(d);
  return d;
}

const read = (f) => readFileSync(f, 'utf8');
const lines = (f) => (existsSync(f) ? read(f).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const jsonl = (rows) => rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n') + '\n';

// ---------- hook ----------

function hookEnv(dir, extra = {}) {
  return { PATH: process.env.PATH, HOME: join(dir, 'home'), TRIAGE_TEST_LEARNINGS_DIR: join(dir, 'triage', 'learnings'), TRIAGE_TEST_KILL_SWITCH: join(dir, 'triage', 'triage.off'), ...extra };
}

function hook(dir, input, extra = {}) {
  const started = Date.now();
  const r = spawnSync('bash', [HOOK], { input, encoding: 'utf8', env: hookEnv(dir, extra) });
  return { ...r, ms: Date.now() - started, inbox: join(dir, 'triage', 'learnings', 'inbox.jsonl') };
}

const HOOK_INPUT = (over = {}) => JSON.stringify({ session_id: 'sess-1', transcript_path: '/home/test/.claude/projects/-home-test-repo/sess-1.jsonl', cwd: '/home/test/repo', reason: 'exit', hook_event_name: 'SessionEnd', ...over });

test('hook parses with bash -n', () => {
  const r = spawnSync('bash', ['-n', HOOK], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('hook appends one pointer line per session end, prints nothing, and runs in under 1 s', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'triage'));
  const a = hook(dir, HOOK_INPUT());
  const b = hook(dir, HOOK_INPUT({ session_id: 'sess-2', reason: 'clear' }));
  for (const r of [a, b]) {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.ok(r.ms < 1000, `${r.ms} ms`);
  }
  const rows = lines(a.inbox);
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['cwd', 'endedAt', 'reason', 'sessionId', 'transcriptPath']);
  assert.equal(rows[0].sessionId, 'sess-1');
  assert.equal(rows[0].cwd, '/home/test/repo');
  assert.match(rows[0].endedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(rows[1].reason, 'clear');
});

test('hook writes nothing when the kill switch exists', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'triage'));
  writeFileSync(join(dir, 'triage', 'triage.off'), '');
  const r = hook(dir, HOOK_INPUT());
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(existsSync(join(dir, 'triage', 'learnings')), false);
});

test('hook exits 0 with no line on garbage, empty or session-less stdin', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'triage'));
  for (const input of ['', '{nope', 'null', '[1,2]', HOOK_INPUT({ session_id: '' }), JSON.stringify({ cwd: '/x' })]) {
    const r = hook(dir, input);
    assert.equal(r.status, 0, input);
    assert.equal(r.stdout, '');
  }
  assert.equal(lines(join(dir, 'triage', 'learnings', 'inbox.jsonl')).length, 0);
});

test('hook exits 0 and creates nothing when the private triage dir is missing', () => {
  const dir = tmp();
  const r = hook(dir, HOOK_INPUT());
  assert.equal(r.status, 0);
  assert.equal(existsSync(join(dir, 'triage')), false);
});

test('hook JSON-escapes a cwd with quotes, spaces and a backslash, with jq and with the node fallback', () => {
  const cwd = '/home/test/My "Odd" Dir\\x';
  for (const extra of [{}, { TRIAGE_TEST_JQ: '/nonexistent/jq' }]) {
    const dir = tmp();
    mkdirSync(join(dir, 'triage'));
    const r = hook(dir, HOOK_INPUT({ cwd }), extra);
    assert.equal(r.status, 0, r.stderr);
    const rows = lines(r.inbox);
    assert.equal(rows.length, 1, JSON.stringify(extra));
    assert.equal(rows[0].cwd, cwd);
  }
});

// ---------- sanitize ----------

test('sanitize keeps the 120-char default and takes a max option', () => {
  const long = 'a'.repeat(600);
  assert.equal(sanitize(long).length, 120);
  assert.equal(sanitize(long, { max: 500 }).length, 500);
  assert.equal(sanitize('see https://x.example/a now\u0007', { max: 500 }), 'see now');
});

// ---------- pointers ----------

test('readJsonl skips bad lines', () => {
  const dir = tmp();
  const inbox = join(dir, 'inbox.jsonl');
  writeFileSync(inbox, jsonl([{ sessionId: 'a', endedAt: '2026-11-10T10:00:00Z' }, '{bad', '', '7', { sessionId: 'b', endedAt: '2026-11-10T11:00:00Z' }]));
  assert.deepEqual(readJsonl(inbox).map((p) => p.sessionId), ['a', 'b']);
  assert.deepEqual(readJsonl(join(dir, 'missing.jsonl')), []);
});

test('selectPointers keeps (since, now], defaults since to Amsterdam midnight, dedupes by session and joins jobs on cwd', () => {
  const wt = '/home/test/repo/.claude/worktrees/job-faq';
  const pointers = [
    { sessionId: 'old', cwd: '/x', endedAt: '2026-11-09T22:59:00Z' },
    { sessionId: 'a', cwd: '/x', transcriptPath: '/t/a1.jsonl', endedAt: '2026-11-09T23:30:00Z' },
    { sessionId: 'a', cwd: '/x', transcriptPath: '/t/a2.jsonl', endedAt: '2026-11-10T09:00:00Z' },
    { sessionId: 'job', cwd: wt, transcriptPath: '/t/j.jsonl', endedAt: '2026-11-10T12:00:00Z' },
    { kind: 'job', taskPageId: 'page-1', slug: 'faq', cwd: wt, status: 'passed', endedAt: '2026-11-10T12:05:00Z' },
    { sessionId: 'future', cwd: '/x', endedAt: '2026-11-10T18:00:01Z' },
    { sessionId: 'noTime', cwd: '/x' },
  ];
  const got = selectPointers(pointers, { now: '2026-11-10T18:00:00Z' });
  assert.deepEqual(got.map((p) => p.sessionId), ['a', 'job']);
  assert.equal(got[0].transcriptPath, '/t/a2.jsonl');
  assert.equal(got[0].taskPageId, undefined);
  assert.equal(got[1].taskPageId, 'page-1');
  assert.equal(got[1].slug, 'faq');
  const since = selectPointers(pointers, { since: '2026-11-10T10:00:00Z', now: '2026-11-10T18:00:00Z' });
  assert.deepEqual(since.map((p) => p.sessionId), ['job']);
});

test('selectPointers uses the CEST midnight in summer', () => {
  const got = selectPointers([{ sessionId: 'a', endedAt: '2026-07-01T22:30:00Z' }, { sessionId: 'b', endedAt: '2026-07-01T21:59:00Z' }], { now: '2026-07-02T10:00:00Z' });
  assert.deepEqual(got.map((p) => p.sessionId), ['a']);
});

// ---------- transcript extraction ----------

const user = (content, extra = {}) => ({ type: 'user', timestamp: extra.at ?? '2026-11-10T10:00:00Z', message: { role: 'user', content }, ...extra });
const assistant = (...blocks) => ({ type: 'assistant', timestamp: '2026-11-10T10:00:00Z', message: { role: 'assistant', content: blocks } });
const text = (t) => ({ type: 'text', text: t });
const edit = (file_path, old_string, new_string) => ({ type: 'tool_use', name: 'Edit', input: { file_path, old_string, new_string } });

const TRANSCRIPT = jsonl([
  { type: 'summary', summary: 'x' },
  user('<command-name>/build</command-name>\n<command-message>build</command-message>'),
  user('<local-command-stdout>no output</local-command-stdout>'),
  user('Caveat: The messages below were generated by the user while running local commands. No.', { isMeta: true }),
  assistant(text('I will use margin-top for the gap.'), { type: 'tool_use', name: 'Skill', input: { skill: 'client-first' } }),
  user('No, use the padding-section spacer instead.', { at: '2026-11-10T10:01:00Z' }),
  user([{ type: 'tool_result', tool_use_id: 't1', content: 'no such file' }]),
  assistant(text('Fixed with the spacer.'), edit('/home/test/repo/a.css', 'gap: 1rem', 'gap: 2rem')),
  user([text('[Request interrupted by user for tool use]')]),
  user([text('<system-reminder>ignore me</system-reminder>')]),
  user([text('Wait, keep the existing class names, see https://evil.example/x')], { at: '2026-11-10T10:03:00Z' }),
  assistant(text('Reverting.'), edit('/home/test/repo/a.css', 'gap: 2rem', 'gap: 1rem')),
  user('Thanks, all good now.'),
  user(`Please build the page. ${'Long context. '.repeat(40)} No rush.`),
]);

test('extractCandidates finds corrections, interrupts and reverted edits, skips wrappers, meta and tool results', () => {
  const { candidates, skills } = extractCandidates(TRANSCRIPT);
  assert.deepEqual(candidates.map((c) => c.kind), ['correction', 'interrupt', 'revert']);
  const [correction, interrupt, revert] = candidates;
  assert.equal(correction.user, 'No, use the padding-section spacer instead.');
  assert.equal(correction.before, 'I will use margin-top for the gap.');
  assert.equal(correction.at, '2026-11-10T10:01:00Z');
  assert.equal(correction.untrusted, true);
  assert.equal(interrupt.user, 'Wait, keep the existing class names, see');
  assert.equal(interrupt.before, 'Fixed with the spacer.');
  assert.match(revert.user, /a\.css/);
  assert.equal(revert.before, 'Reverting.');
  assert.deepEqual(skills, ['build', 'client-first']);
});

test('extractCandidates caps at 6, bounds text, and requires short turns unless they start with a correction word', () => {
  const rows = [assistant(text('B'.repeat(800)))];
  for (let i = 0; i < 10; i++) rows.push(user(`Actually ${i} ${'x'.repeat(900)}`));
  rows.push(user(`Here is a long brief that mentions instead somewhere ${'y'.repeat(500)}`));
  const { candidates } = extractCandidates(jsonl(rows));
  assert.equal(candidates.length, MAX_CANDIDATES);
  assert.equal(MAX_CANDIDATES, 6);
  assert.ok(candidates.every((c) => c.user.length <= 500 && c.before.length <= 300));
  assert.match(candidates[0].user, /^Actually 0/);
  assert.equal(extractCandidates(jsonl([user(`Here is a long brief that mentions instead somewhere ${'y'.repeat(500)}`)])).candidates.length, 0);
  assert.equal(extractCandidates(jsonl([user("Don't touch the nav.")])).candidates.length, 1);
  assert.equal(extractCandidates(jsonl([user('I knowledge-checked it')])).candidates.length, 0, 'word boundary');
  assert.equal(extractCandidates('{bad\n').candidates.length, 0);
});

// ---------- excerpts ----------

test('buildExcerpts drops sessions without candidates, skips missing/non-jsonl paths, lists tasks and stays under maxBytes', () => {
  const files = {
    '/t/a.jsonl': TRANSCRIPT,
    '/t/quiet.jsonl': jsonl([user('Thanks')]),
  };
  const readTranscript = (p) => (p in files ? files[p] : null);
  const pointers = [
    { sessionId: 'a', cwd: '/x', transcriptPath: '/t/a.jsonl', taskPageId: 'page-1', slug: 'faq' },
    { sessionId: 'q', cwd: '/x', transcriptPath: '/t/quiet.jsonl', taskPageId: 'page-2' },
    { sessionId: 'm', cwd: '/x', transcriptPath: '/t/missing.jsonl' },
    { sessionId: 'evil', cwd: '/x', transcriptPath: '/etc/passwd' },
  ];
  const seen = [];
  const ex = buildExcerpts(pointers, (p) => (seen.push(p), readTranscript(p)), { now: '2026-11-10T17:00:00Z', since: '2026-11-09T23:00:00Z' });
  assert.equal(ex.generatedAt, '2026-11-10T17:00:00.000Z');
  assert.equal(ex.since, '2026-11-09T23:00:00Z');
  assert.deepEqual(ex.sessions.map((s) => s.sessionId), ['a']);
  assert.deepEqual(ex.sessions[0].skills, ['build', 'client-first']);
  assert.equal(ex.sessions[0].taskPageId, 'page-1');
  assert.deepEqual(ex.tasks, ['page-1']);
  assert.ok(!seen.includes('/etc/passwd'));

  const many = Array.from({ length: 40 }, (_, i) => ({ sessionId: `s${i}`, cwd: '/x', transcriptPath: '/t/a.jsonl', taskPageId: `page-${i}` }));
  const small = buildExcerpts(many, readTranscript, { now: '2026-11-10T17:00:00Z', maxBytes: 8 * 1024 });
  assert.ok(Buffer.byteLength(JSON.stringify(small, null, 2)) <= 8 * 1024);
  assert.ok(small.sessions.length > 0 && small.sessions.length < 40);
  assert.equal(small.sessions[0].sessionId, 's0');
  assert.deepEqual(small.tasks, small.sessions.map((s) => s.taskPageId));
});

// ---------- journal ----------

const JOURNAL = '# Learnings Journal\n\n## general\n\n- 2026-09-01: First.\n\n## build\n\n- 2026-09-02: Old build lesson.\n\n## gsap-scrolltrigger\n\n- 2026-09-03: Refresh after transitions.\n';

test('appendLearning inserts at the end of the matching section, creates a missing one, and refuses bad input and duplicates', () => {
  const now = '2026-11-10T17:00:00Z';
  const r = appendLearning(JOURNAL, 'build', 'Run the client tests before /build ends.', { now });
  assert.equal(r.count, 2);
  assert.equal(r.warn, false);
  assert.match(r.text, /## build\n\n- 2026-09-02: Old build lesson\.\n- 2026-11-10: Run the client tests before \/build ends\.\n\n## gsap-scrolltrigger/);
  const created = appendLearning(JOURNAL, 'new-skill', 'A new lesson.', { now });
  assert.match(created.text, /Refresh after transitions\.\n\n## new-skill\n\n- 2026-11-10: A new lesson\.\n$/);
  assert.equal(created.count, 1);
  assert.equal(appendLearning(r.text, 'build', 'Run the client tests before /build ends.', { now }).refused, 'duplicate');
  for (const bad of ['Build', 'a b', '../x', '']) assert.throws(() => appendLearning(JOURNAL, bad, 'x', { now }), UsageError, bad);
  assert.throws(() => appendLearning(JOURNAL, 'build', 'two\nlines', { now }), UsageError);
  assert.throws(() => appendLearning(JOURNAL, 'build', 'x'.repeat(301), { now }), UsageError);
  assert.throws(() => appendLearning(JOURNAL, 'build', '   ', { now }), UsageError);
  let text = JOURNAL;
  for (let i = 0; i < 15; i++) text = appendLearning(text, 'general', `Lesson ${i}.`, { now }).text;
  const last = appendLearning(text, 'general', 'One too many.', { now });
  assert.equal(last.count, 17);
  assert.equal(last.warn, true);
});

// ---------- comment gate and digest validation ----------

test('allowLearningsComment refuses a task not in the excerpts, a bad prefix, long text, and a second learnings comment today', () => {
  const now = '2026-11-10T17:00:00Z';
  const excerpts = { tasks: ['page-1'] };
  const ok = { taskId: 'page-1', text: 'Learnings: we used margins; the reviewer wanted spacers.' };
  assert.deepEqual(allowLearningsComment(ok, excerpts, [], now), { ok: true });
  assert.equal(allowLearningsComment({ ...ok, taskId: 'page-9' }, excerpts, [], now).reason, 'task-not-in-excerpts');
  assert.equal(allowLearningsComment(ok, null, [], now).reason, 'task-not-in-excerpts');
  assert.equal(allowLearningsComment({ ...ok, text: 'Note: x' }, excerpts, [], now).reason, 'prefix');
  assert.equal(allowLearningsComment({ ...ok, text: `Learnings: ${'x'.repeat(1500)}` }, excerpts, [], now).reason, 'too-long');
  const ledger = [{ taskId: 'page-1', source: 'learnings', sourceId: 'learnings-2026-11-10', at: '2026-11-10T09:00:00Z' }];
  assert.equal(allowLearningsComment(ok, excerpts, ledger, now).reason, 'already-commented-today');
  assert.equal(allowLearningsComment(ok, excerpts, [{ ...ledger[0], at: '2026-11-09T09:00:00Z' }], now).ok, true);
  assert.equal(allowLearningsComment(ok, excerpts, [{ ...ledger[0], source: 'doer' }], now).ok, true);
});

test('validateDigest allows at most 3 learning bullets and 40 lines, and sanitizes lines', () => {
  const good = validateDigest('*Learnings*\n- One https://x.example/y.\n- Two.\n- Three.\n');
  assert.equal(good.ok, true);
  assert.equal(good.text, '*Learnings*\n- One\n- Two.\n- Three.\n');
  assert.equal(validateDigest('- 1\n- 2\n- 3\n- 4\n').ok, false);
  assert.equal(validateDigest(Array.from({ length: 41 }, (_, i) => `line ${i}`).join('\n')).ok, false);
  assert.equal(validateDigest('').ok, false);
});

// ---------- CLI ----------

const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('TRIAGE_') && k !== 'NOTION_TOKEN'));

function cliEnv() {
  const dir = tmp();
  const triage = join(dir, 'triage');
  const env = {
    TRIAGE_TEST_LEARNINGS_DIR: join(triage, 'learnings'),
    TRIAGE_TEST_LEARNINGS_FILE: join(dir, 'home', '.claude', 'context', 'learnings.md'),
    TRIAGE_TEST_COMMENTS_LEDGER: join(triage, 'comments.jsonl'),
    TRIAGE_TEST_TMP_DIR: join(triage, 'tmp'),
    // A missing Keychain/token must never be reached by a refusal.
    PATH: '/usr/bin:/bin',
  };
  mkdirSync(env.TRIAGE_TEST_LEARNINGS_DIR, { recursive: true });
  mkdirSync(env.TRIAGE_TEST_TMP_DIR, { recursive: true });
  return { dir, triage, env, learnings: env.TRIAGE_TEST_LEARNINGS_DIR };
}

const at = (env, now) => ({ ...env, TRIAGE_TEST_NOW: now });

function cli(args, env, input = '') {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, input, encoding: 'utf8', env: { ...CLEAN_ENV, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr, json: () => JSON.parse(r.stdout) };
}

function seedInbox({ dir, learnings }) {
  const transcript = join(dir, 'sess-a.jsonl');
  writeFileSync(transcript, TRANSCRIPT);
  const wt = '/home/test/repo/.claude/worktrees/job-faq';
  writeFileSync(join(learnings, 'inbox.jsonl'), jsonl([
    { sessionId: 'ancient', cwd: '/x', transcriptPath: transcript, endedAt: '2026-09-01T10:00:00Z' },
    { sessionId: 'sat', cwd: wt, transcriptPath: transcript, endedAt: '2026-11-07T10:00:00Z' },
    { sessionId: 'a', cwd: wt, transcriptPath: transcript, endedAt: '2026-11-10T12:00:00Z' },
    { kind: 'job', taskPageId: 'page-1', slug: 'faq', cwd: wt, jobDir: '/home/test/jobs/page-1', status: 'passed', endedAt: '2026-11-10T12:05:00Z' },
  ]));
}

test('learnings extract writes excerpts, moves the cursor, keeps a same-day re-run complete, and prunes old inbox lines', () => {
  const fx = cliEnv();
  seedInbox(fx);
  const now = '2026-11-10T17:00:00Z';
  const r = cli(['learnings', 'extract'], at(fx.env, now));
  assert.equal(r.code, 0, r.err);
  const res = r.json();
  assert.deepEqual({ ...res, path: undefined }, { sessions: 1, candidates: 3, tasks: 1, path: undefined });
  assert.equal(res.path, join(fx.learnings, 'excerpts-2026-11-10.json'));
  const ex = JSON.parse(read(res.path));
  assert.deepEqual(ex.tasks, ['page-1']);
  const state = JSON.parse(read(join(fx.learnings, 'state.json')));
  assert.equal(state.lastExtractAt, '2026-11-10T17:00:00.000Z');
  assert.ok(!lines(join(fx.learnings, 'inbox.jsonl')).some((p) => p.sessionId === 'ancient'));
  const again = cli(['learnings', 'extract'], at(fx.env, '2026-11-10T17:30:00Z'));
  assert.equal(again.json().tasks, 1, 'a same-day re-run keeps the day window');
  // Next working day: the cursor carries Saturday-to-Monday style gaps, floored at 4 days.
  const next = cli(['learnings', 'extract'], at(fx.env, '2026-11-11T17:00:00Z'));
  assert.equal(next.json().sessions, 0);
  assert.equal(next.json().noModel, true);
  assert.match(read(join(fx.learnings, 'digest-2026-11-11.md')), /No learnings today\./);
});

test('learnings extract after a weekend picks up sessions since the last run, floored at 4 days back', () => {
  const fx = cliEnv();
  seedInbox(fx);
  writeFileSync(join(fx.learnings, 'state.json'), JSON.stringify({ lastExtractAt: '2026-11-06T17:00:00Z', date: '2026-11-06', since: '2026-11-05T23:00:00Z' }));
  const r = cli(['learnings', 'extract'], at(fx.env, '2026-11-09T17:00:00Z'));
  assert.equal(r.json().sessions, 1, 'Saturday session included');
  writeFileSync(join(fx.learnings, 'state.json'), JSON.stringify({ lastExtractAt: '2026-10-01T17:00:00Z', date: '2026-10-01' }));
  const floored = cli(['learnings', 'extract'], at(fx.env, '2026-11-12T17:00:00Z'));
  assert.equal(floored.code, 0, floored.err);
  assert.deepEqual(JSON.parse(read(floored.json().path)).sessions.map((s) => s.sessionId), ['a'], 'the Saturday session is more than 4 days back');
});

test('learnings add appends to the journal, warns past 15 entries, refuses duplicates and caps 10 adds a day', () => {
  const fx = cliEnv();
  const journal = fx.env.TRIAGE_TEST_LEARNINGS_FILE;
  mkdirSync(join(journal, '..'), { recursive: true });
  writeFileSync(journal, JOURNAL);
  const now = '2026-11-10T17:00:00Z';
  const r = cli(['learnings', 'add', '--skill', 'build', '--text', 'Run client tests first.'], at(fx.env, now));
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.json(), { skill: 'build', count: 2, warn: false });
  assert.match(read(journal), /- 2026-11-10: Run client tests first\.\n\n## gsap/);
  assert.equal(cli(['learnings', 'add', '--skill', 'build', '--text', 'Run client tests first.'], at(fx.env, now)).code, 1);
  assert.equal(cli(['learnings', 'add', '--skill', 'Bad Skill', '--text', 'x'], at(fx.env, now)).code, 2);
  for (let i = 0; i < 9; i++) assert.equal(cli(['learnings', 'add', '--skill', 'general', '--text', `Lesson ${i}.`], at(fx.env, now)).code, 0, `add ${i}`);
  const capped = cli(['learnings', 'add', '--skill', 'general', '--text', 'Eleventh.'], at(fx.env, now));
  assert.equal(capped.code, 1);
  assert.equal(capped.json().reason, 'daily-limit');
  assert.equal(cli(['learnings', 'add', '--skill', 'general', '--text', 'Next day.'], at(fx.env, '2026-11-11T17:00:00Z')).code, 0);
});

test('learnings add writes through a symlinked journal instead of replacing the link', () => {
  const fx = cliEnv();
  const real = join(fx.dir, 'real-learnings.md');
  writeFileSync(real, JOURNAL);
  mkdirSync(join(fx.env.TRIAGE_TEST_LEARNINGS_FILE, '..'), { recursive: true });
  symlinkSync(real, fx.env.TRIAGE_TEST_LEARNINGS_FILE);
  const r = cli(['learnings', 'add', '--skill', 'general', '--text', 'Via link.'], at(fx.env, '2026-11-10T17:00:00Z'));
  assert.equal(r.code, 0, r.err);
  assert.match(read(real), /Via link\./);
});

test('learnings add warns with a merge hint when the section passes 15 entries', () => {
  const fx = cliEnv();
  const journal = fx.env.TRIAGE_TEST_LEARNINGS_FILE;
  mkdirSync(join(journal, '..'), { recursive: true });
  writeFileSync(journal, `## general\n\n${Array.from({ length: 15 }, (_, i) => `- 2026-09-01: Old ${i}.`).join('\n')}\n`);
  const r = cli(['learnings', 'add', '--skill', 'general', '--text', 'Sixteenth.'], at(fx.env, '2026-11-10T17:00:00Z'));
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json().warn, true);
  assert.match(r.json().message, /merge/);
});

function commentFixture() {
  const fx = cliEnv();
  writeFileSync(join(fx.learnings, 'excerpts-2026-11-10.json'), JSON.stringify({ tasks: ['page-1'], sessions: [] }));
  return fx;
}

test('learnings comment refuses without any Notion call: unknown task, bad prefix, long text, second comment today', () => {
  const fx = commentFixture();
  const now = '2026-11-10T17:00:00Z';
  const refuse = (args, reason) => {
    const r = cli(['learnings', 'comment', ...args], at(fx.env, now));
    assert.equal(r.code, 1, r.err);
    assert.equal(r.json().reason, reason);
    assert.doesNotMatch(r.err, /token/i);
  };
  refuse(['--task', 'page-9', '--text', 'Learnings: x'], 'task-not-in-excerpts');
  refuse(['--task', 'page-1', '--text', 'Hello'], 'prefix');
  refuse(['--task', 'page-1', '--text', `Learnings: ${'x'.repeat(1500)}`], 'too-long');
  writeFileSync(fx.env.TRIAGE_TEST_COMMENTS_LEDGER, jsonl([{ taskId: 'page-1', source: 'learnings', sourceId: 'learnings-2026-11-10', at: '2026-11-10T16:00:00Z' }]));
  refuse(['--task', 'page-1', '--text', 'Learnings: x'], 'already-commented-today');
  assert.equal(cli(['learnings', 'comment', '--task', 'page-1'], at(fx.env, now)).code, 2, 'needs text');
  assert.equal(cli(['learnings', 'comment', '--task', 'bad id!', '--text', 'Learnings: x'], at(fx.env, now)).code, 2);
});

test('learnings comment --text-file must sit under the triage tmp dir after realpath; exactly one of --text/--text-file', () => {
  const fx = commentFixture();
  const now = '2026-11-10T17:00:00Z';
  const outside = join(fx.dir, 'outside.md');
  writeFileSync(outside, 'Learnings: x');
  const sneaky = join(fx.env.TRIAGE_TEST_TMP_DIR, 'link.md');
  symlinkSync(outside, sneaky);
  for (const path of [outside, sneaky, join(fx.env.TRIAGE_TEST_TMP_DIR, '..', 'comments.jsonl')]) {
    assert.equal(cli(['learnings', 'comment', '--task', 'page-1', '--text-file', path], at(fx.env, now)).code, 2, path);
  }
  const inside = join(fx.env.TRIAGE_TEST_TMP_DIR, 'learnings-comment-1.md');
  writeFileSync(inside, 'Learnings: x');
  assert.equal(cli(['learnings', 'comment', '--task', 'page-1', '--text', 'Learnings: y', '--text-file', inside], at(fx.env, now)).code, 2);
  const prefix = join(fx.env.TRIAGE_TEST_TMP_DIR, 'bad.md');
  writeFileSync(prefix, 'Nope');
  assert.equal(cli(['learnings', 'comment', '--task', 'page-1', '--text-file', prefix], at(fx.env, now)).json().reason, 'prefix');
});

// Runs fn with env applied and stdout captured; fn gets the captured-text getter.
async function captured(env, fn) {
  const saved = { ...process.env };
  const write = process.stdout.write;
  let stdout = '';
  Object.assign(process.env, env);
  process.stdout.write = (chunk) => ((stdout += chunk), true);
  try {
    return await fn(() => stdout);
  } finally {
    process.stdout.write = write;
    for (const k of Object.keys(env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

async function inProcess(args, env, deps) {
  return captured(env, async (stdout) => {
    const code = await runLearnings(args, {}, deps);
    return { code, json: () => JSON.parse(stdout()) };
  });
}

test('learnings comment posts through addComment with a multi-line text file and records the ledger line', async () => {
  const fx = commentFixture();
  const file = join(fx.env.TRIAGE_TEST_TMP_DIR, 'learnings-comment-1.md');
  writeFileSync(file, 'Learnings: what we got wrong\n- Used margins.\n- the reviewer wanted spacers.\n');
  const calls = [];
  const notionClient = { comments: { create: async (body) => (calls.push(body), { id: 'c-1' }) } };
  const args = { positional: ['learnings', 'comment'], task: 'page-1', 'text-file': file };
  const env = at(fx.env, '2026-11-10T17:00:00Z');
  const r = await inProcess(args, env, { notionClient });
  assert.equal(r.code, 0);
  assert.deepEqual(r.json(), { posted: true, task: 'page-1', commentId: 'c-1' });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].parent, { page_id: 'page-1' });
  assert.match(calls[0].rich_text[0].text.content, /^Learnings: what we got wrong\n- Used margins\./);
  assert.deepEqual(lines(fx.env.TRIAGE_TEST_COMMENTS_LEDGER).map(({ at, ...rest }) => rest), [{ taskId: 'page-1', source: 'learnings', sourceId: 'learnings-2026-11-10' }]);
  const second = await inProcess(args, env, { notionClient });
  assert.equal(second.code, 1);
  assert.equal(calls.length, 1);
});

test('learnings digest places a valid draft from the tmp dir and refuses an invalid or outside one', () => {
  const fx = cliEnv();
  const now = '2026-11-10T17:00:00Z';
  const draft = join(fx.env.TRIAGE_TEST_TMP_DIR, 'digest.md');
  writeFileSync(draft, '*Learnings*\n- Use spacers, not margins.\n');
  const r = cli(['learnings', 'digest', '--in', draft], at(fx.env, now));
  assert.equal(r.code, 0, r.err);
  assert.equal(read(join(fx.learnings, 'digest-2026-11-10.md')), '*Learnings*\n- Use spacers, not margins.\n');
  writeFileSync(draft, '- 1\n- 2\n- 3\n- 4\n');
  assert.equal(cli(['learnings', 'digest', '--in', draft], at(fx.env, now)).code, 1);
  const outside = join(fx.dir, 'digest.md');
  writeFileSync(outside, '- ok\n');
  assert.equal(cli(['learnings', 'digest', '--in', outside], at(fx.env, now)).code, 2);
  assert.equal(cli(['learnings', 'digest'], at(fx.env, now), '- stdin\n').code, 2, 'needs --in');
});

test('every learnings subcommand refuses inside a build job; unknown subcommand and path flags are usage errors', () => {
  const fx = cliEnv();
  for (const sub of ['extract', 'add', 'comment', 'digest']) {
    const r = cli(['learnings', sub], { ...fx.env, TRIAGE_BUILD_JOB: '1' });
    assert.equal(r.code, 2, sub);
    assert.match(r.err, /not available inside a build job/);
  }
  assert.equal(cli(['learnings'], fx.env).code, 2);
  assert.equal(cli(['learnings', 'nope'], fx.env).code, 2);
  for (const flag of ['--dir', '--out', '--file', '--ledger']) assert.equal(cli(['learnings', 'extract', flag, '/tmp/x'], fx.env).code, 2, flag);
});

// ---------- review fixes ----------

test('every learnings subcommand refuses --now, so a run cannot pick another day\'s ledger or excerpts', () => {
  const fx = commentFixture();
  const cases = [
    ['extract'],
    ['add', '--skill', 'general', '--text', 'x'],
    ['comment', '--task', 'page-1', '--text', 'Learnings: x'],
    ['digest', '--in', join(fx.env.TRIAGE_TEST_TMP_DIR, 'd.md')],
  ];
  for (const args of cases) {
    const r = cli(['learnings', ...args, '--now', '2026-11-10T17:00:00Z'], fx.env);
    assert.equal(r.code, 2, args[0]);
    assert.match(r.err, /--now/);
  }
  assert.equal(existsSync(join(fx.learnings, 'state.json')), false);
  assert.equal(cli(['learnings', 'extract'], at(fx.env, 'yesterday')).code, 2, 'bad TRIAGE_TEST_NOW');
});

test('learnings comment claims before posting: two concurrent calls for one task post once', async () => {
  const fx = commentFixture();
  let finish;
  const gate = new Promise((r) => (finish = r));
  const calls = [];
  const notionClient = { comments: { create: async (body) => (calls.push(body), await gate, { id: 'c-1' }) } };
  const args = { positional: ['learnings', 'comment'], task: 'page-1', text: 'Learnings: once.' };
  const codes = await captured(at(fx.env, '2026-11-10T17:00:00Z'), async () => {
    const first = runLearnings(args, {}, { notionClient });
    const second = runLearnings(args, {}, { notionClient });
    finish();
    return Promise.all([first, second]);
  });
  assert.deepEqual(codes.sort(), [0, 1]);
  assert.equal(calls.length, 1);
  assert.equal(lines(fx.env.TRIAGE_TEST_COMMENTS_LEDGER).length, 1);
});

test('learnings comment releases its claim when Notion fails, so a retry can post', async () => {
  const fx = commentFixture();
  const env = at(fx.env, '2026-11-10T17:00:00Z');
  const args = { positional: ['learnings', 'comment'], task: 'page-1', text: 'Learnings: retry.' };
  const broken = { comments: { create: async () => { throw new Error('HTTP 502'); } } };
  await assert.rejects(captured(env, () => runLearnings(args, {}, { notionClient: broken })), /502/);
  assert.equal(lines(fx.env.TRIAGE_TEST_COMMENTS_LEDGER).length, 0);
  const ok = { comments: { create: async () => ({ id: 'c-2' }) } };
  const r = await inProcess(args, env, { notionClient: ok });
  assert.equal(r.code, 0);
  assert.equal(r.json().commentId, 'c-2');
});

test('extractCandidates drops turns at or before since (resumed sessions) and bounds at', () => {
  const rows = jsonl([
    user('No, old correction.', { at: '2026-11-09T10:00:00Z' }),
    user('No, at the boundary.', { at: '2026-11-09T23:00:00Z' }),
    user('No, new correction.', { at: '2026-11-10T10:00:00Z' }),
    user('No, untimed correction.', { timestamp: undefined }),
    user('No, junk time.', { at: 'x'.repeat(41) }),
  ]);
  const { candidates } = extractCandidates(rows, { since: '2026-11-09T23:00:00Z' });
  assert.deepEqual(candidates.map((c) => c.user), ['No, new correction.', 'No, untimed correction.', 'No, junk time.']);
  assert.equal(candidates[1].at, null);
  assert.equal(candidates[2].at, null);
  const files = { '/t/r.jsonl': rows };
  const ex = buildExcerpts([{ sessionId: 'r', transcriptPath: '/t/r.jsonl' }], (p) => files[p], { since: '2026-11-09T23:00:00Z', now: '2026-11-10T17:00:00Z' });
  assert.equal(ex.sessions[0].candidates.length, 3);
});

test('extractCandidates skips compaction summaries, sidechain and transcript-only entries', () => {
  const rows = jsonl([
    assistant(text('Main thread answer.')),
    user([text('[Request interrupted by user]')]),
    user('This session is being continued from a previous conversation. No, it was wrong.', { isCompactSummary: true }),
    user('No, sidechain prompt.', { isSidechain: true }),
    { ...assistant(text('Sidechain answer.')), isSidechain: true },
    user('No, transcript only.', { isVisibleInTranscriptOnly: true }),
    user('Use the other footer.'),
  ]);
  const { candidates } = extractCandidates(rows);
  assert.deepEqual(candidates.map((c) => [c.kind, c.user, c.before]), [['interrupt', 'Use the other footer.', 'Main thread answer.']]);
});

test('extractCandidates leaves built-in CLI commands out of skills', () => {
  const rows = jsonl(['clear', 'compact', 'model', 'add-dir', 'build', 'plugin:audit'].map((n) => user(`<command-name>/${n}</command-name>`)));
  assert.deepEqual(extractCandidates(rows).skills, ['build', 'plugin:audit']);
});

test('extractCandidates: stop/undo/revert/no/don\'t count only at the start, and plain questions are not corrections', () => {
  const count = (t) => extractCandidates(jsonl([user(t)])).candidates.length;
  assert.equal(count('how do i stop gmail rewriting links?'), 0);
  assert.equal(count('Can you undo that later if needed?'), 0);
  assert.equal(count('Is there no way to keep both?'), 0);
  assert.equal(count('Please revert nothing, it is fine'), 0);
  assert.equal(count('What? Actually use the spacer.'), 1, 'actually wins over the question rule');
  assert.equal(count('why is this here? that\'s wrong?'), 1);
  assert.equal(count('...stop, that is the wrong file'), 1);
  assert.equal(count('- undo the last change'), 1);
  assert.equal(count('Undo that.'), 1);
  assert.equal(count('Use flex instead of grid.'), 1);
});
