// Guards the session rollup collectors (jobs, transcripts, desktop, worktrees, PRs, specs, remote) on fake fixtures, sanitize(), tolerant parsing, merge dedup by id, alias and branch with Notion task links, and the classify matrix with its precedence.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitize,
  defaultRoots,
  collectJobs,
  collectTranscripts,
  collectDesktop,
  collectWorktrees,
  collectPrs,
  collectSpecs,
  remoteItems,
  collectAll,
  merge,
  classify,
  branchSlug,
} from '../../tools/triage/lib/sessions.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const NOW = '2026-11-16T07:00:00.000Z'; // Monday 08:00 in Amsterdam
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-sessions-'));
  dirs.push(d);
  return d;
}

const line = (o) => JSON.stringify(o);

// A copy of the fake home with transcripts whose mtimes sit relative to NOW.
function fakeHome() {
  const home = join(tmp(), 'home');
  cpSync(join(FIXTURES, 'home'), home, { recursive: true });
  const project = join(home, '.claude/projects/-home-test-webflow-scripts');
  mkdirSync(project, { recursive: true });
  const write = (name, lines, ageMs) => {
    const file = join(project, `${name}.jsonl`);
    writeFileSync(file, `${lines.join('\n')}\n`);
    const t = new Date(Date.parse(NOW) - ageMs);
    utimesSync(file, t, t);
    return file;
  };
  write('11111111-0000-4000-8000-000000000011', [
    line({ type: 'user', cwd: '/home/test/webflow-scripts/.claude/worktrees/faq-schema-build', gitBranch: 'worktree-faq-schema-build', entrypoint: 'cli', timestamp: '2026-11-16T06:20:00Z' }),
    line({ type: 'ai-title', aiTitle: 'Old title', sessionId: '11111111-0000-4000-8000-000000000011' }),
    line({ type: 'last-prompt', lastPrompt: 'add the faq\u0000 block, see https://example.com/spec\tnow', sessionId: 'x' }),
    line({ type: 'ai-title', aiTitle: 'FAQ schema build', sessionId: '11111111-0000-4000-8000-000000000011' }),
    '{ broken json',
    line({ type: 'mystery', anything: [1, 2, 3] }),
  ], 30 * 60_000);
  write('22222222-0000-4000-8000-000000000022', [
    line({ type: 'user', cwd: '/home/test/webflow-internal', gitBranch: 'main', entrypoint: 'sdk-cli' }),
    line({ type: 'last-prompt', lastPrompt: '/triage' }),
  ], 3 * DAY);
  write('33333333-0000-4000-8000-000000000033', [line({ type: 'ai-title', aiTitle: 'Too old' })], 20 * DAY);
  const padding = 'x'.repeat(200);
  const big = [line({ type: 'ai-title', aiTitle: 'Head title outside the tail' })];
  for (let i = 0; i < 400; i++) big.push(line({ type: 'progress', pad: padding }));
  big.push(line({ type: 'last-prompt', lastPrompt: 'tail prompt' }));
  write('44444444-0000-4000-8000-000000000044', big, 5 * HOUR);
  write('a1b2c3d4-0000-4000-8000-000000000001', [
    line({ type: 'ai-title', aiTitle: 'acme invoice transcript', sessionKind: 'bg' }),
    line({ type: 'user', gitBranch: 'worktree-acme-invoice-build', cwd: '/home/test/webflow-scripts/.claude/worktrees/acme-invoice-build' }),
  ], 2 * DAY);
  return home;
}

const REPOS = [
  { name: 'webflow-scripts', path: '/home/test/webflow-scripts' },
  { name: 'webflow-internal', path: '/home/test/webflow-internal' },
];

// Fake exec keyed by "<cwd>|<cmd> <args>"; unknown commands throw like a failed process.
function fakeExec(table) {
  const calls = [];
  const exec = (cmd, args, opts = {}) => {
    const key = `${opts.cwd}|${cmd} ${args.join(' ')}`;
    calls.push(key);
    const value = table[key];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new Error(`fake exec: no entry for ${key}`);
    return value;
  };
  exec.calls = calls;
  return exec;
}

const PORCELAIN = [
  'worktree /home/test/webflow-scripts',
  'HEAD aaaa',
  'branch refs/heads/main',
  '',
  'worktree /home/test/webflow-scripts/.claude/worktrees/faq-schema-build',
  'HEAD bbbb',
  'branch refs/heads/worktree-faq-schema-build',
  '',
  'worktree /home/test/webflow-scripts/.claude/worktrees/old-thing-build',
  'HEAD cccc',
  'branch refs/heads/worktree-old-thing-build',
  '',
  'worktree /home/test/webflow-scripts/.claude/worktrees/detached',
  'HEAD dddd',
  'detached',
  '',
  'worktree /home/test/webflow-scripts/.claude/worktrees/merged-build',
  'HEAD eeee',
  'branch refs/heads/worktree-merged-build',
  'futurekey value',
  '',
].join('\n');

const WS = '/home/test/webflow-scripts';
const WI = '/home/test/webflow-internal';
const GIT_TABLE = {
  [`${WS}|git worktree list --porcelain`]: PORCELAIN,
  [`${WS}|git rev-list --count main..worktree-faq-schema-build`]: '3\n',
  [`${WS}|git log -1 --format=%cI worktree-faq-schema-build`]: '2026-11-13T10:00:00+01:00\n',
  [`${WS}|git rev-list --count main..worktree-old-thing-build`]: '2\n',
  [`${WS}|git log -1 --format=%cI worktree-old-thing-build`]: '2026-10-20T10:00:00+01:00\n',
  [`${WS}|git rev-list --count main..worktree-merged-build`]: '0\n',
  [`${WS}|git log -1 --format=%cI worktree-merged-build`]: '2026-11-12T10:00:00+01:00\n',
  [`${WI}|git worktree list --porcelain`]: new Error('not a git repository'),
};

const PR_FIELDS = 'number,title,headRefName,url,updatedAt,isDraft';
const PR_TABLE = {
  [`${WS}|gh pr list --state open --json ${PR_FIELDS} --limit 100`]: JSON.stringify([
    { number: 24, title: 'Hooli hours update https://x.example', headRefName: 'worktree-hooli-hours-build', url: 'https://github.com/example/repo/pull/24', updatedAt: '2026-11-13T12:00:00Z', isDraft: true, extra: 1 },
    { number: 25, title: 'Review this', headRefName: 'worktree-review-me', url: 'u', updatedAt: '2026-11-14T12:00:00Z', isDraft: false },
    { title: 'no number' },
  ]),
  [`${WS}|gh pr list --state open --search review-requested:@me --json number --limit 100`]: '[{"number":25}]',
  [`${WI}|gh pr list --state open --json ${PR_FIELDS} --limit 100`]: 'not json',
  [`${WI}|gh pr list --state open --search review-requested:@me --json number --limit 100`]: '[]',
};

test('sanitize strips control characters and URLs, collapses whitespace and truncates to 120 chars', () => {
  assert.equal(sanitize('a\u0000b\u0007c\u001b[31m d‮ e'), 'abc[31m d e');
  assert.equal(sanitize('see https://evil.example/x?y=1 and www.evil.example/z now'), 'see and now');
  assert.equal(sanitize('  many \n\t spaces  '), 'many spaces');
  assert.equal(sanitize('x'.repeat(300)).length, 120);
  assert.equal(sanitize(null), '');
  assert.equal(sanitize(42), '42');
  assert.equal(sanitize({ a: 1 }), '');
});

test('branchSlug strips worktree-, job/ and -plan/-build, and ignores main', () => {
  assert.equal(branchSlug('worktree-faq-schema-build'), 'faq-schema');
  assert.equal(branchSlug('refs/heads/worktree-x-plan'), 'x');
  assert.equal(branchSlug('job/contoso-alt-text'), 'contoso-alt-text');
  assert.equal(branchSlug('feature'), 'feature');
  for (const b of ['main', 'master', 'HEAD', '', null, 42]) assert.equal(branchSlug(b), null);
});

test('defaultRoots maps a home to the session sources and both repos', () => {
  const r = defaultRoots('/home/test');
  assert.equal(r.jobsDir, '/home/test/.claude/jobs');
  assert.equal(r.projectsDir, '/home/test/.claude/projects');
  assert.equal(r.desktopDir, '/home/test/Library/Application Support/Claude/claude-code-sessions');
  assert.deepEqual(r.repos, REPOS);
  assert.deepEqual(r.specsDirs, ['/home/test/webflow-internal/.claude/specs', '/home/test/webflow-scripts/.claude/specs']);
});

test('collectJobs reads state.json and timeline tolerantly and marks blocked jobs as needing the user', () => {
  const home = fakeHome();
  const r = collectJobs({ jobsDir: join(home, '.claude/jobs'), triageJobsDir: join(FIXTURES, 'triage-jobs'), repos: REPOS });
  assert.equal(r.status, 'ok');
  const byJob = Object.fromEntries(r.items.map((i) => [i.jobId ?? i.id, i]));
  const blocked = byJob.a1b2c3d4;
  assert.equal(blocked.id, 'a1b2c3d4-0000-4000-8000-000000000001');
  assert.equal(blocked.kind, 'job');
  assert.equal(blocked.state, 'blocked');
  assert.equal(blocked.needsUser, true);
  assert.equal(blocked.branch, 'worktree-acme-invoice-build');
  assert.equal(blocked.repo, 'webflow-scripts');
  assert.equal(blocked.title, 'acme invoice check');
  assert.equal(blocked.detail, 'confirm: keep the footer link?');
  assert.equal(blocked.untrusted, true);
  assert.equal(byJob.e5f6a7b8.lastActivity, '2026-11-16T06:45:00.000Z');
  assert.equal(byJob.e5f6a7b8.state, 'working');
  const odd = byJob.c9d0e1f2;
  assert.equal(odd.title, 'tidy the docs see');
  assert.equal(odd.cwd, null);
  assert.equal(odd.lastActivity, null);
  assert.equal(byJob.badjson1, undefined);
  assert.equal(byJob.onlytime, undefined);
  const triage = r.items.find((i) => i.id === 'triage-job:page-built');
  assert.equal(triage.taskPageId, 'page-built');
  assert.equal(triage.specSlug, 'contoso-alt-text');
  assert.equal(triage.branch, 'job/contoso-alt-text');
  assert.equal(triage.state, 'done');
  assert.equal(triage.result.status, 'passed');
  assert.match(triage.result.at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(triage.repo, 'webflow-scripts', 'build jobs run in the public repo');
  const died = r.items.find((i) => i.id === 'triage-job:page-died');
  assert.deepEqual([died.state, died.result], ['failed', { status: 'failed', at: null }]);
  assert.equal(died.lastActivity, '2026-11-13T13:00:00.000Z');
  const failed = r.items.find((i) => i.id === 'triage-job:page-failed');
  assert.equal(failed.state, 'failed');
  assert.equal(failed.result.status, 'failed');
});

test('collectJobs is unavailable when neither jobs dir exists', () => {
  const r = collectJobs({ jobsDir: join(tmp(), 'none'), triageJobsDir: join(tmp(), 'none') });
  assert.deepEqual(r, { status: 'unavailable', items: [] });
});

test('collectTranscripts reads only recent tails and keeps the last title, prompt, branch and cwd', () => {
  const home = fakeHome();
  const r = collectTranscripts({ projectsDir: join(home, '.claude/projects'), now: NOW, repos: REPOS });
  assert.equal(r.status, 'ok');
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  assert.equal(byId['33333333-0000-4000-8000-000000000033'], undefined, 'older than 14 days');
  const faq = byId['11111111-0000-4000-8000-000000000011'];
  assert.equal(faq.kind, 'cli');
  assert.equal(faq.title, 'FAQ schema build');
  assert.equal(faq.prompt, 'add the faq block, see now');
  assert.equal(faq.branch, 'worktree-faq-schema-build');
  assert.equal(faq.cwd, '/home/test/webflow-scripts/.claude/worktrees/faq-schema-build');
  assert.equal(faq.repo, 'webflow-scripts');
  assert.equal(faq.lastActivity, new Date(Date.parse(NOW) - 30 * 60_000).toISOString());
  assert.equal(faq.untrusted, true);
  assert.deepEqual(faq.aliases, ['11111111']);
  assert.equal(byId['22222222-0000-4000-8000-000000000022'].title, '/triage');
  assert.equal(byId['22222222-0000-4000-8000-000000000022'].repo, 'webflow-internal');
  const big = byId['44444444-0000-4000-8000-000000000044'];
  assert.equal(big.title, 'tail prompt', 'the head title is outside the 50 KB tail');
  assert.equal(byId['a1b2c3d4-0000-4000-8000-000000000001'].kind, 'job');
});

test('collectTranscripts is unavailable without a projects dir', () => {
  assert.deepEqual(collectTranscripts({ projectsDir: join(tmp(), 'none'), now: NOW }), { status: 'unavailable', items: [] });
});

test('collectDesktop reads local_*.json, skips archived and broken files, and flags blocked sessions', () => {
  const home = fakeHome();
  const r = collectDesktop({ desktopDir: join(home, 'Library/Application Support/Claude/claude-code-sessions'), repos: REPOS });
  assert.equal(r.status, 'ok');
  assert.equal(r.items.length, 1);
  const [d] = r.items;
  assert.equal(d.id, 'd4d4d4d4-0000-4000-8000-000000000004');
  assert.equal(d.kind, 'desktop');
  assert.equal(d.branch, 'worktree-initech-privacy-plan');
  assert.equal(d.title, 'initech-privacy-plan');
  assert.equal(d.detail, 'waiting on answers for the privacy page');
  assert.equal(d.needsUser, true);
  assert.equal(d.lastActivity, '2026-11-10T08:40:00.000Z');
  assert.deepEqual(collectDesktop({ desktopDir: join(tmp(), 'none') }), { status: 'unavailable', items: [] });
});

test('collectWorktrees parses porcelain, counts commits ahead of main and skips main and detached', () => {
  const exec = fakeExec(GIT_TABLE);
  const r = collectWorktrees({ repos: REPOS, exec, exists: () => true });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.items.map((w) => [w.branch, w.ahead, w.lastCommitAt]), [
    ['worktree-faq-schema-build', 3, '2026-11-13T09:00:00.000Z'],
    ['worktree-old-thing-build', 2, '2026-10-20T09:00:00.000Z'],
    ['worktree-merged-build', 0, '2026-11-12T09:00:00.000Z'],
  ]);
  assert.equal(r.items[0].repo, 'webflow-scripts');
  assert.equal(r.items[0].id, 'wt:webflow-scripts:worktree-faq-schema-build');
  assert.match(r.error, /webflow-internal/);
});

test('collectWorktrees is unavailable with no repo and error when every repo fails', () => {
  assert.equal(collectWorktrees({ repos: REPOS, exec: fakeExec({}), exists: () => false }).status, 'unavailable');
  const failed = collectWorktrees({ repos: REPOS, exec: fakeExec({}), exists: () => true });
  assert.equal(failed.status, 'error');
  assert.deepEqual(failed.items, []);
});

test('collectPrs lists open PRs, sanitises titles and marks review requests from the user', () => {
  const r = collectPrs({ repos: REPOS, exec: fakeExec(PR_TABLE), exists: () => true });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.items.map((p) => [p.id, p.branch, p.reviewRequested, p.isDraft]), [
    ['pr:webflow-scripts#24', 'worktree-hooli-hours-build', false, true],
    ['pr:webflow-scripts#25', 'worktree-review-me', true, false],
  ]);
  assert.equal(r.items[0].title, 'Hooli hours update');
  assert.equal(r.items[0].untrusted, true);
  assert.match(r.error, /webflow-internal/);
});

test('collectPrs is unavailable when gh is not installed', () => {
  const missing = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
  const exec = () => {
    throw missing;
  };
  assert.deepEqual(collectPrs({ repos: REPOS, exec, exists: () => true }), { status: 'unavailable', items: [], error: 'gh not found' });
});

test('collectSpecs reads frontmatter and bold Status headers, buckets them and skips symlinked dirs', () => {
  const home = fakeHome();
  const r = collectSpecs({ specsDirs: [join(home, 'webflow-internal/.claude/specs'), join(tmp(), 'missing')] });
  assert.equal(r.status, 'ok');
  const bySlug = Object.fromEntries(r.items.map((s) => [s.slug, s]));
  assert.deepEqual([bySlug['faq-schema'].status, bySlug['faq-schema'].bucket], ['Approved', 'buildable']);
  assert.equal(bySlug['faq-schema'].title, 'Add FAQ schema to Contoso');
  assert.deepEqual([bySlug['hooli-footer'].status, bySlug['hooli-footer'].bucket], ['Ready to Build', 'buildable']);
  assert.equal(bySlug['umbrella-case-study'].bucket, 'review');
  assert.equal(bySlug['done-thing'].bucket, 'closed');
  assert.equal(bySlug.notes.bucket, 'unlabelled');
  assert.equal(bySlug['faq-schema'].id, 'spec:faq-schema');
  assert.match(bySlug['faq-schema'].mtime, /^\d{4}-/);
});

test('remoteItems sanitises names, makes safe ids and flags "waiting on a human"', () => {
  const items = remoteItems(JSON.parse(readFileSync(join(FIXTURES, 'remote.json'), 'utf8')));
  assert.deepEqual(items.map((i) => [i.id, i.kind, i.needsUser, i.state]), [
    ['remote:cse_fake01', 'remote', true, 'waiting on a human'],
    ['remote:cse_fake02', 'cloud', false, 'working'],
    ['remote:unnamed-status', 'remote', false, 'idle'],
    ['remote:bad-id-rm-rf', 'remote', false, 'completed'],
  ]);
  assert.equal(items[1].title, 'Initech audit[31m run');
  assert.ok(items.every((i) => i.untrusted === true && i.source === 'remote'));
});

test('merge joins records by id, short alias and branch, keeps the richer fields and links Notion tasks', () => {
  const merged = merge(
    [
      { id: 'a1b2c3d4-0000-4000-8000-000000000001', aliases: ['a1b2c3d4'], kind: 'cli', source: 'transcripts', title: 'transcript title', cwd: '/x', branch: 'worktree-acme-invoice-build', state: 'idle', lastActivity: '2026-11-03T11:00:00Z', needsUser: false, prompt: 'p' },
      { id: 'a1b2c3d4-0000-4000-8000-000000000001', jobId: 'a1b2c3d4', kind: 'job', source: 'jobs', title: 'job title', branch: null, state: 'blocked', lastActivity: '2026-11-03T10:00:00Z', needsUser: true },
      { id: 'wt:webflow-scripts:worktree-acme-invoice-build', kind: 'worktree', source: 'worktrees', branch: 'worktree-acme-invoice-build', ahead: 2, lastActivity: '2026-11-02T10:00:00Z' },
      { id: 'spec:acme-invoice', kind: 'spec', source: 'specs', specSlug: 'acme-invoice', spec: { bucket: 'buildable' } },
      { id: 'x-main-1', kind: 'cli', source: 'transcripts', branch: 'main' },
      { id: 'x-main-2', kind: 'cli', source: 'transcripts', branch: 'main' },
      { id: 'job-short', aliases: ['deadbeef'], kind: 'job', source: 'jobs' },
      { id: 'deadbeef-0000-4000-8000-000000000009', aliases: ['deadbeef'], kind: 'cli', source: 'transcripts', title: 'by alias' },
    ],
    { tasks: [{ id: 'notion-page-1', name: 'Acme invoice' }] },
  );
  assert.equal(merged.length, 4);
  const acme = merged.find((m) => m.branch === 'worktree-acme-invoice-build');
  assert.equal(acme.id, 'a1b2c3d4-0000-4000-8000-000000000001');
  assert.equal(acme.kind, 'job');
  assert.equal(acme.state, 'blocked');
  assert.equal(acme.needsUser, true);
  assert.equal(acme.lastActivity, '2026-11-03T11:00:00.000Z');
  assert.equal(acme.ahead, 2);
  assert.equal(acme.prompt, 'p');
  assert.equal(acme.specSlug, 'acme-invoice');
  assert.equal(acme.taskPageId, 'notion-page-1');
  assert.deepEqual(acme.sources, ['jobs', 'specs', 'transcripts', 'worktrees']);
  assert.equal(merged.filter((m) => m.branch === 'main').length, 2, 'main never merges');
  assert.equal(merged.find((m) => m.title === 'by alias').id, 'job-short');
});

test('merge keeps an existing taskPageId and links by spec slug only when it matches a task name', () => {
  const [a, b] = merge([
    { id: 'a', kind: 'job', taskPageId: 'page-x', specSlug: 'acme-invoice' },
    { id: 'b', kind: 'cli', branch: 'worktree-unknown-build' },
  ], { tasks: [{ id: 'page-y', name: 'Acme invoice' }] });
  assert.equal(a.taskPageId, 'page-x');
  assert.equal(b.taskPageId, undefined);
});

function snapshot(extra = {}) {
  return { sessions: [], worktrees: [], prs: [], specs: [], tasks: [], plans: [], ...extra };
}
const ids = (c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.map((i) => i.id)]));

test('verify loop: one blocked job and one remote "waiting on a human" session both land in Waiting on you', () => {
  const remote = remoteItems([{ id: 'cse_fake01', name: 'Hooli landing copy', status: 'Waiting on a human' }]);
  const c = classify(snapshot({
    sessions: [{ id: 'job-1', kind: 'job', state: 'blocked', needsUser: true, lastActivity: '2026-11-16T06:50:00Z' }, ...remote],
  }), { now: NOW });
  assert.deepEqual(c.waiting.map((i) => i.id).sort(), ['job-1', 'remote:cse_fake01']);
  assert.deepEqual(c.inFlight, []);
});

test('classify matrix: each item lands in exactly one class, by precedence', () => {
  const c = classify(snapshot({
    sessions: [
      { id: 'blocked-and-active', kind: 'job', state: 'blocked', needsUser: true, lastActivity: '2026-11-16T06:59:00Z' },
      { id: 'working-old', kind: 'job', state: 'working', lastActivity: '2026-10-01T00:00:00Z' },
      { id: 'active-1h', kind: 'cli', state: 'idle', lastActivity: '2026-11-16T06:00:00Z' },
      { id: 'idle-3h', kind: 'cli', state: 'idle', lastActivity: '2026-11-16T04:00:00Z' },
      { id: 'active-on-built', kind: 'cli', repo: 'r', branch: 'worktree-faq-schema-build', lastActivity: '2026-11-16T06:30:00Z' },
      { id: 'triage-job:page-built', kind: 'job', state: 'done', branch: 'job/contoso-alt-text', result: { status: 'passed', at: '2026-11-12T14:00:00Z' }, lastActivity: '2026-11-12T14:00:00Z' },
      { id: 'triage-job:old', kind: 'job', state: 'done', result: { status: 'passed', at: '2026-11-01T14:00:00Z' }, lastActivity: '2026-11-01T14:00:00Z' },
    ],
    worktrees: [
      { id: 'wt:r:worktree-faq-schema-build', repo: 'r', branch: 'worktree-faq-schema-build', ahead: 3, lastCommitAt: '2026-11-13T09:00:00Z' },
      { id: 'wt:r:worktree-fresh-build', repo: 'r', branch: 'worktree-fresh-build', ahead: 1, lastCommitAt: '2026-11-12T09:00:00Z' },
      { id: 'wt:r:worktree-old-thing-build', repo: 'r', branch: 'worktree-old-thing-build', ahead: 2, lastCommitAt: '2026-10-20T09:00:00Z' },
      { id: 'wt:r:worktree-merged-build', repo: 'r', branch: 'worktree-merged-build', ahead: 0, lastCommitAt: '2026-10-01T09:00:00Z' },
    ],
    prs: [
      { id: 'pr:r#24', repo: 'r', number: 24, branch: 'worktree-hooli-hours-build', updatedAt: '2026-11-13T12:00:00Z', reviewRequested: false },
      { id: 'pr:r#25', repo: 'r', number: 25, branch: 'worktree-review-me', updatedAt: '2026-10-01T12:00:00Z', reviewRequested: true },
      { id: 'pr:r#26', repo: 'r', number: 26, branch: 'worktree-old-pr', updatedAt: '2026-10-01T12:00:00Z', reviewRequested: false },
    ],
    specs: [
      { id: 'spec:faq-schema', slug: 'faq-schema', bucket: 'buildable', status: 'Approved', mtime: '2026-11-01T00:00:00Z' },
      { id: 'spec:hooli-footer', slug: 'hooli-footer', bucket: 'buildable', status: 'Ready to Build', mtime: '2026-11-02T00:00:00Z' },
      { id: 'spec:initech-privacy', slug: 'initech-privacy', bucket: 'buildable', status: 'Approved', mtime: '2026-11-03T00:00:00Z' },
      { id: 'spec:umbrella', slug: 'umbrella', bucket: 'review', status: 'Review' },
    ],
    plans: [{ id: 'P1', title: 'plan hook', approved: false }],
  }), { now: NOW });
  const got = ids(c);
  assert.deepEqual(got.waiting.sort(), ['P1', 'blocked-and-active', 'pr:r#25'].sort());
  assert.deepEqual(got.inFlight.sort(), ['active-1h', 'active-on-built', 'working-old'].sort());
  assert.deepEqual(got.built.sort(), ['pr:r#24', 'triage-job:page-built', 'wt:r:worktree-fresh-build'].sort());
  assert.deepEqual(got.planned.sort(), ['spec:hooli-footer', 'spec:initech-privacy']);
  assert.deepEqual(got.stale.sort(), ['pr:r#26', 'wt:r:worktree-old-thing-build']);
  const all = Object.values(got).flat();
  assert.equal(new Set(all).size, all.length, 'no item in two classes');
  for (const absent of ['idle-3h', 'triage-job:old', 'wt:r:worktree-merged-build', 'spec:umbrella', 'spec:faq-schema']) {
    assert.ok(!all.includes(absent), absent);
  }
});

test('a plan-only branch does not stop a spec from counting as planned', () => {
  const c = classify(snapshot({
    sessions: [{ id: 'd1', kind: 'desktop', branch: 'worktree-initech-privacy-plan', lastActivity: '2026-11-10T08:40:00Z' }],
    specs: [{ id: 'spec:initech-privacy', slug: 'initech-privacy', bucket: 'buildable', status: 'Approved' }],
  }), { now: NOW });
  assert.deepEqual(ids(c).planned, ['d1']);
});

test('collectAll runs every collector, isolates a throwing one and never needs the network in tests', () => {
  const home = fakeHome();
  const roots = { ...defaultRoots(home), triageJobsDir: join(FIXTURES, 'triage-jobs'), repos: REPOS };
  const exec = fakeExec({ ...GIT_TABLE, ...PR_TABLE });
  const r = collectAll(roots, { now: NOW, exec, exists: (p) => REPOS.some((repo) => repo.path === p) });
  assert.deepEqual(r.sources, { jobs: 'ok', transcripts: 'ok', desktop: 'ok', worktrees: 'ok', prs: 'ok', specs: 'ok' });
  assert.ok(r.sessions.some((s) => s.kind === 'desktop'));
  const ids = r.sessions.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'sessions are merged');
  assert.equal(r.worktrees.length, 3);
  assert.equal(r.prs.length, 2);
  assert.ok(r.specs.length >= 5);
  const broken = collectAll(roots, { now: NOW, exec: () => { throw new Error('boom'); }, exists: () => true, collectors: { desktop: () => { throw new Error('bad'); } } });
  assert.equal(broken.sources.desktop, 'error');
  assert.equal(broken.sources.worktrees, 'error');
  assert.equal(broken.sources.jobs, 'ok');
  assert.match(broken.errors.desktop, /bad/);
});

test('a passed build job is Built; a failed or died one within 7 days waits on the user; an old failure drops out', () => {
  const job = (id, status, at, lastActivity = at) => ({ id, kind: 'job', state: status === 'passed' ? 'done' : 'failed', result: { status, at }, lastActivity });
  const c = classify(snapshot({
    sessions: [
      job('passed', 'passed', '2026-11-12T14:00:00Z'),
      job('failed', 'failed', '2026-11-12T14:00:00Z'),
      job('died', 'failed', null, '2026-11-13T13:00:00Z'),
      job('old-failure', 'failed', '2026-11-01T14:00:00Z'),
    ],
  }), { now: NOW });
  assert.deepEqual(ids(c).built, ['passed']);
  assert.deepEqual(ids(c).waiting.sort(), ['died', 'failed']);
  assert.ok(!Object.values(ids(c)).flat().includes('old-failure'));
});

test('merge keeps same-named branches in different repos apart and links a spec to only one of them', () => {
  const merged = merge([
    { id: 'wt:webflow-scripts:triage-daybook', kind: 'worktree', repo: 'webflow-scripts', branch: 'triage-daybook', lastActivity: '2026-11-10T16:00:00Z' },
    { id: 'wt:webflow-internal:triage-daybook', kind: 'worktree', repo: 'webflow-internal', branch: 'triage-daybook', lastActivity: '2026-11-10T15:00:00Z' },
    { id: 's1', kind: 'cli', repo: 'webflow-internal', branch: 'triage-daybook' },
    { id: 'spec:triage-daybook', kind: 'spec', specSlug: 'triage-daybook', spec: { bucket: 'buildable' } },
  ]);
  assert.equal(merged.length, 2);
  const scripts = merged.find((m) => m.repo === 'webflow-scripts');
  const internal = merged.find((m) => m.repo === 'webflow-internal');
  assert.deepEqual(internal.mergedIds.sort(), ['s1', 'wt:webflow-internal:triage-daybook']);
  assert.deepEqual(scripts.mergedIds.sort(), ['spec:triage-daybook', 'wt:webflow-scripts:triage-daybook'], 'spec joins the most recent match only');
});
