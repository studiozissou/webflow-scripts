// Read-only session rollup for triage: one collector per source (local jobs + triage build jobs, transcript tails, Desktop Code sessions, git worktrees, gh PRs, spec frontmatter, and remote/cloud sessions handed in by the model), each returning { status: ok|unavailable|error, items, error? } and never throwing on unknown or missing fields; sanitize() for untrusted text; merge() that joins records by session id, short id, branch and spec slug and links Notion tasks; and classify() into the five rollup classes with precedence waiting > inFlight > built > planned > stale (a failed build job from the last 7 days waits on the user; only a passed one counts as built). Branch and slug matches are scoped by repo; a spec joins the most recent matching group.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fstatSync, lstatSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { DEFAULT_JOBS_DIR, REPO_ROOT, list as listTriageJobs } from './jobs.js';
import { workingDaysBetween } from './workdays.js';
import { readJsonFile } from './cli-io.js';

export const CLASSES = ['waiting', 'inFlight', 'built', 'planned', 'stale'];
export const TRANSCRIPT_MAX_AGE_DAYS = 14;
export const TRANSCRIPT_TAIL_BYTES = 50 * 1024;
export const IN_FLIGHT_MS = 2 * 3_600_000;
export const BUILT_RESULT_DAYS = 7;
export const STALE_WORKING_DAYS = 7;
const EXEC_TIMEOUT_MS = 10_000;
const MAX_TEXT = 120;
const DAY_MS = 86_400_000;
const BASE_BRANCHES = new Set(['main', 'master', 'HEAD']);
const WAITING = /waiting (on|for) (a )?(human|you|user|input)|needs? (your )?(input|answer|reply)|awaiting/i;
const WORKING = /^(running|working|busy|active|in progress)$/i;

const CONTROL = /[\p{Cc}\p{Cf}]/gu;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

export function sanitize(text, { max = MAX_TEXT } = {}) {
  if (typeof text !== 'string' && typeof text !== 'number') return '';
  return String(text).replace(/\s/g, ' ').replace(CONTROL, '').replace(URL_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trimEnd();
}

const str = (v) => (typeof v === 'string' && v.trim() ? v : null);
const slugify = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

// ISO string from an ISO/date string or epoch milliseconds; small numbers (seconds, counters) are not times.
function iso(value) {
  if (value == null || value === '') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms) || (typeof value === 'number' && ms < 1e11)) return null;
  return new Date(ms).toISOString();
}

const latest = (...values) => values.map(iso).filter(Boolean).sort().at(-1) ?? null;

function readTail(path, bytes) {
  const fd = openSync(path, 'r');
  try {
    const { size } = fstatSync(fd);
    const length = Math.min(size, bytes);
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, size - length);
    const text = buf.toString('utf8');
    return size > bytes ? text.slice(text.indexOf('\n') + 1) : text;
  } finally {
    closeSync(fd);
  }
}

// Objects and arrays from JSONL text; partial or foreign lines are skipped.
export function jsonLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object') out.push(value);
    } catch {
      // Partial or foreign line; skip it.
    }
  }
  return out;
}

function dirsIn(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export function branchSlug(branch) {
  if (typeof branch !== 'string') return null;
  const b = branch.replace(/^refs\/heads\//, '');
  if (!b || BASE_BRANCHES.has(b)) return null;
  return b.replace(/^worktree-/, '').replace(/^job\//, '').replace(/-(plan|build)$/, '') || null;
}

const isPlanBranch = (branch) => typeof branch === 'string' && /-plan$/.test(branch);

function repoOf(cwd, repos = []) {
  if (typeof cwd !== 'string' || !cwd) return null;
  const hit = repos.find((r) => cwd === r.path || cwd.startsWith(`${r.path}/`));
  if (hit) return hit.name;
  const root = cwd.split('/.claude/worktrees/')[0];
  return basename(root) || null;
}

function defaultExec(cmd, args, { cwd } = {}) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

const errorText = (failures) => failures.map(([name, err]) => `${name}: ${err.message ?? err}`).join('; ');

export function defaultRoots(home = homedir()) {
  return {
    jobsDir: join(home, '.claude/jobs'),
    triageJobsDir: DEFAULT_JOBS_DIR,
    projectsDir: join(home, '.claude/projects'),
    desktopDir: join(home, 'Library/Application Support/Claude/claude-code-sessions'),
    repos: [
      { name: 'webflow-scripts', path: join(home, 'webflow-scripts') },
      { name: 'webflow-internal', path: join(home, 'webflow-internal') },
    ],
    specsDirs: [join(home, 'webflow-internal/.claude/specs'), join(home, 'webflow-scripts/.claude/specs')],
  };
}

function normState(value) {
  const s = sanitize(value).toLowerCase();
  if (!s) return 'unknown';
  return WORKING.test(s) ? 'working' : s;
}

function localJob(jobsDir, dir, repos) {
  const state = readJsonFile(join(jobsDir, dir, 'state.json'));
  if (!state || typeof state !== 'object') return null;
  let timelineAt = null;
  try {
    const last = jsonLines(readTail(join(jobsDir, dir, 'timeline.jsonl'), 4096)).at(-1);
    timelineAt = last?.at ?? null;
  } catch {
    // No timeline; state.json is enough.
  }
  const cwd = str(state.worktreePath) ?? str(state.cwd);
  const st = normState(state.state);
  return {
    id: str(state.sessionId) ?? dir,
    aliases: [dir, str(state.resumeSessionId)].filter(Boolean),
    jobId: dir,
    kind: 'job',
    source: 'jobs',
    title: sanitize(str(state.name) ?? str(state.intent) ?? dir),
    detail: sanitize(str(state.needs) ?? str(state.detail)),
    cwd,
    branch: str(state.worktreeBranch),
    repo: repoOf(cwd, repos),
    state: st,
    lastActivity: latest(state.updatedAt, timelineAt),
    needsUser: st === 'blocked',
    untrusted: true,
  };
}

// Build jobs run in worktrees of the public repo (scripts/triage-job.sh, cwd REPO_ROOT).
function triageJob(job, repos) {
  const meta = job.meta ?? {};
  let at = null;
  try {
    at = statSync(join(job.jobDir, 'result.json')).mtime.toISOString();
  } catch {
    // Not finished, or finished without a result file.
  }
  const result = job.finished ? { status: str(job.result?.status) ?? 'failed', at } : null;
  const state = job.alive ? 'working' : result ? (result.status === 'passed' ? 'done' : 'failed') : 'queued';
  return {
    id: `triage-job:${job.pageId}`,
    kind: 'job',
    source: 'triage-jobs',
    title: sanitize(str(meta.task) ?? str(meta.slug) ?? job.pageId),
    cwd: null,
    branch: str(job.result?.branch),
    repo: repoOf(REPO_ROOT.replace(/\/+$/, ''), repos),
    state,
    lastActivity: latest(at, meta.startedAt),
    needsUser: false,
    taskPageId: job.pageId,
    specSlug: str(meta.slug),
    result,
    untrusted: true,
  };
}

export function collectJobs({ jobsDir, triageJobsDir = DEFAULT_JOBS_DIR, repos = [], listJobs = listTriageJobs } = {}) {
  const haveLocal = jobsDir && existsSync(jobsDir);
  const haveTriage = triageJobsDir && existsSync(triageJobsDir);
  if (!haveLocal && !haveTriage) return { status: 'unavailable', items: [] };
  const items = [];
  if (haveLocal) for (const dir of dirsIn(jobsDir)) {
    const item = localJob(jobsDir, dir, repos);
    if (item) items.push(item);
  }
  if (haveTriage) for (const job of listJobs(triageJobsDir)) items.push(triageJob(job, repos));
  return { status: 'ok', items };
}

function transcriptItem(path, mtime, tailBytes, repos) {
  const id = basename(path, '.jsonl');
  const seen = {};
  for (const entry of jsonLines(readTail(path, tailBytes))) {
    const pick = (key, field) => {
      if (str(entry[field])) seen[key] = entry[field];
    };
    if (entry.type === 'ai-title') pick('aiTitle', 'aiTitle');
    if (entry.type === 'custom-title') pick('customTitle', 'customTitle');
    if (entry.type === 'agent-name') pick('agentName', 'agentName');
    if (entry.type === 'last-prompt') pick('lastPrompt', 'lastPrompt');
    pick('branch', 'gitBranch');
    pick('cwd', 'cwd');
    pick('entrypoint', 'entrypoint');
    pick('sessionKind', 'sessionKind');
  }
  const kind = seen.sessionKind === 'bg' ? 'job' : seen.entrypoint === 'claude-desktop' ? 'desktop' : 'cli';
  return {
    id,
    aliases: [id.slice(0, 8)],
    kind,
    source: 'transcripts',
    title: sanitize(seen.customTitle ?? seen.aiTitle ?? seen.agentName ?? seen.lastPrompt ?? ''),
    prompt: sanitize(seen.lastPrompt),
    cwd: seen.cwd ?? null,
    branch: seen.branch ?? null,
    repo: repoOf(seen.cwd, repos),
    state: 'idle',
    lastActivity: mtime.toISOString(),
    needsUser: false,
    untrusted: true,
  };
}

export function collectTranscripts({ projectsDir, now = new Date(), maxAgeDays = TRANSCRIPT_MAX_AGE_DAYS, tailBytes = TRANSCRIPT_TAIL_BYTES, repos = [] } = {}) {
  if (!projectsDir || !existsSync(projectsDir)) return { status: 'unavailable', items: [] };
  const since = new Date(now).getTime() - maxAgeDays * DAY_MS;
  const items = [];
  for (const dir of dirsIn(projectsDir)) {
    let files;
    try {
      files = readdirSync(join(projectsDir, dir)).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const file of files) {
      const path = join(projectsDir, dir, file);
      try {
        const { mtime } = statSync(path);
        if (mtime.getTime() < since) continue;
        items.push(transcriptItem(path, mtime, tailBytes, repos));
      } catch {
        // Unreadable transcript; skip it.
      }
    }
  }
  return { status: 'ok', items };
}

function findFiles(dir, re, depth = 4) {
  if (depth < 0) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return findFiles(path, re, depth - 1);
    return e.isFile() && re.test(e.name) ? [path] : [];
  });
}

function desktopItem(path, repos) {
  const d = readJsonFile(path);
  if (!d || typeof d !== 'object' || d.isArchived === true) return null;
  const summary = d.postTurnSummary && typeof d.postTurnSummary === 'object' ? d.postTurnSummary : {};
  const category = sanitize(summary.status_category).toLowerCase();
  const cwd = str(d.cwd) ?? str(d.worktreePath);
  return {
    id: str(d.cliSessionId) ?? str(d.sessionId) ?? basename(path, '.json'),
    aliases: [str(d.sessionId)].filter(Boolean),
    kind: 'desktop',
    source: 'desktop',
    title: sanitize(str(d.title) ?? str(d.worktreeName) ?? branchSlug(d.branch) ?? ''),
    detail: sanitize(summary.status_detail),
    cwd,
    branch: str(d.branch),
    repo: repoOf(cwd, repos),
    state: category || 'unknown',
    lastActivity: iso(d.lastActivityAt),
    needsUser: /blocked|waiting|needs/.test(category),
    untrusted: true,
  };
}

export function collectDesktop({ desktopDir, repos = [] } = {}) {
  if (!desktopDir || !existsSync(desktopDir)) return { status: 'unavailable', items: [] };
  const items = findFiles(desktopDir, /^local_.*\.json$/).map((p) => desktopItem(p, repos)).filter(Boolean);
  return { status: 'ok', items };
}

function parsePorcelain(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = { path: line.slice(9) };
      out.push(cur);
    } else if (cur && line.startsWith('branch ')) {
      cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    } else if (cur && line === 'prunable') {
      cur.prunable = true;
    }
  }
  return out;
}

function tryExec(exec, cmd, args, opts) {
  try {
    return exec(cmd, args, opts);
  } catch {
    return null;
  }
}

// One status for a per-repo source: unavailable with no repo or no binary, error when every repo failed.
function perRepo(repos, exists, binary, fn) {
  const present = repos.filter((r) => exists(r.path));
  if (!present.length) return { status: 'unavailable', items: [] };
  const items = [];
  const failures = [];
  for (const repo of present) {
    try {
      items.push(...fn(repo));
    } catch (err) {
      if (err?.code === 'ENOENT') return { status: 'unavailable', items: [], error: `${binary} not found` };
      failures.push([repo.name, err]);
    }
  }
  const status = failures.length === present.length ? 'error' : 'ok';
  return failures.length ? { status, items, error: errorText(failures) } : { status, items };
}

export function collectWorktrees({ repos = [], exec = defaultExec, exists = existsSync, base = 'main' } = {}) {
  return perRepo(repos, exists, 'git', (repo) => {
    const trees = parsePorcelain(exec('git', ['worktree', 'list', '--porcelain'], { cwd: repo.path }));
    return trees
      .filter((w) => w.branch && w.branch !== base)
      .map((w) => {
        const ahead = Number.parseInt(tryExec(exec, 'git', ['rev-list', '--count', `${base}..${w.branch}`], { cwd: repo.path }) ?? '', 10);
        const last = tryExec(exec, 'git', ['log', '-1', '--format=%cI', w.branch], { cwd: repo.path });
        return {
          id: `wt:${repo.name}:${w.branch}`,
          repo: repo.name,
          path: w.path,
          branch: w.branch,
          ahead: Number.isInteger(ahead) ? ahead : null,
          lastCommitAt: iso(last?.trim()),
          ...(w.prunable ? { prunable: true } : {}),
        };
      });
  });
}

const PR_FIELDS = 'number,title,headRefName,url,updatedAt,isDraft';

function parseJsonArray(text, label) {
  const value = JSON.parse(text);
  if (!Array.isArray(value)) throw new Error(`${label} is not a JSON array`);
  return value;
}

export function collectPrs({ repos = [], exec = defaultExec, exists = existsSync } = {}) {
  return perRepo(repos, exists, 'gh', (repo) => {
    const opts = { cwd: repo.path };
    const prs = parseJsonArray(exec('gh', ['pr', 'list', '--state', 'open', '--json', PR_FIELDS, '--limit', '100'], opts), 'gh pr list');
    const review = new Set(
      parseJsonArray(exec('gh', ['pr', 'list', '--state', 'open', '--search', 'review-requested:@me', '--json', 'number', '--limit', '100'], opts), 'gh pr list')
        .map((p) => p?.number),
    );
    return prs
      .filter((p) => Number.isInteger(p?.number))
      .map((p) => ({
        id: `pr:${repo.name}#${p.number}`,
        repo: repo.name,
        number: p.number,
        title: sanitize(p.title),
        branch: str(p.headRefName),
        url: str(p.url),
        updatedAt: iso(p.updatedAt),
        isDraft: p.isDraft === true,
        reviewRequested: review.has(p.number),
        untrusted: true,
      }));
  });
}

// Status vocabulary matches /next's gather.py: match the leading words, keep the rest visible.
const BUCKETS = [
  ['closed', ['done', 'closed', 'complete', 'shipped', 'merged']],
  ['review', ['ready for review', 'review', 'in review']],
  ['buildable', ['ready to build', 'ready to plan', 'ready to implement', 'ready to action', 'ready', 'approved', 'planned']],
  ['in_flight', ['planning', 'draft', 'partial', 'in progress', 'wip']],
];

function bucketOf(raw) {
  const low = raw.toLowerCase().replace(/[-_]+/g, ' ').trim();
  if (!low) return 'unlabelled';
  if (low.startsWith('blocked')) return 'blocked';
  for (const [name, keys] of BUCKETS) if (keys.some((k) => low.startsWith(k))) return name;
  return 'unparsed';
}

function frontmatter(head) {
  if (!head.startsWith('---\n')) return {};
  const end = head.indexOf('\n---', 4);
  if (end < 0) return {};
  const fields = {};
  for (const line of head.slice(4, end).split('\n')) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) fields[m[1].toLowerCase()] = m[2].trim().replace(/^["'`]|["'`]$/g, '');
  }
  return fields;
}

function parseSpec(path) {
  let head;
  try {
    const fd = openSync(path, 'r');
    try {
      const buf = Buffer.alloc(4000);
      head = buf.toString('utf8', 0, readSync(fd, buf, 0, 4000, 0)).replace(/\r\n/g, '\n');
    } finally {
      closeSync(fd);
    }
  } catch {
    return null;
  }
  const fm = frontmatter(head);
  const bold = (name) => new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'mi').exec(head)?.[1].trim() ?? '';
  const raw = fm.status ?? bold('Status');
  const slug = slugify(fm.slug || bold('Slug').replace(/`/g, '') || basename(path, '.md'));
  return {
    id: `spec:${slug}`,
    slug,
    title: sanitize((/^#\s+(.+)$/m.exec(head)?.[1] ?? slug).replace(/^spec:\s*/i, '')),
    status: sanitize(raw),
    bucket: bucketOf(raw),
    path,
    mtime: statSync(path).mtime.toISOString(),
    untrusted: true,
  };
}

const isRealDir = (dir) => {
  try {
    return lstatSync(dir).isDirectory();
  } catch {
    return false;
  }
};

export function collectSpecs({ specsDirs = [] } = {}) {
  const dirs = specsDirs.filter(isRealDir);
  if (!dirs.length) return { status: 'unavailable', items: [] };
  const items = dirs.flatMap((d) => findFiles(d, /\.md$/, 2)).map(parseSpec).filter(Boolean);
  return { status: 'ok', items };
}

const safeId = (value) => String(value).replace(/[^A-Za-z0-9_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

// Remote Control and cloud sessions, as the model reshaped them from the in-run session list.
export function remoteItems(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const status = sanitize(r.status);
      const name = sanitize(r.name);
      const id = safeId(sanitize(r.id)) || slugify(name);
      if (!id) return null;
      return {
        id: `remote:${id}`,
        kind: r.kind === 'cloud' ? 'cloud' : 'remote',
        source: 'remote',
        title: name,
        cwd: null,
        branch: null,
        repo: null,
        state: normState(status),
        lastActivity: iso(r.lastActivity),
        needsUser: WAITING.test(status),
        untrusted: true,
      };
    })
    .filter(Boolean);
}

// Session kinds win the merged id and kind over derived records.
const KIND_RANK = ['job', 'desktop', 'cli', 'cloud', 'remote', 'worktree', 'pr', 'spec', 'plan'];
const STATE_RANK = ['blocked', 'working', 'queued', 'failed', 'done', 'idle'];
const rankOf = (ranks, v) => (ranks.includes(v) ? ranks.indexOf(v) : ranks.length);
const richness = (item) => Object.values(item).filter((v) => v != null && v !== '' && v !== false).length;

const slugOf = (item) => item.specSlug ?? branchSlug(item.branch);
const isSpecOnly = (item) => item.kind === 'spec' && !item.branch;

// Branch and slug keys are scoped by repo: the same branch name in both repos is two pieces of work.
function keysOf(item) {
  const keys = [];
  if (item.id) keys.push(`id:${item.id}`);
  for (const a of item.aliases ?? []) keys.push(`id:${a}`);
  const branch = typeof item.branch === 'string' ? item.branch.replace(/^refs\/heads\//, '') : '';
  if (branch && !BASE_BRANCHES.has(branch)) keys.push(`branch:${item.repo}:${branch}`);
  const slug = slugOf(item);
  if (slug) keys.push(`slug:${item.repo}:${slug}`);
  return keys;
}

function combine(parts) {
  const ordered = [...parts].sort((a, b) => richness(b) - richness(a) || rankOf(KIND_RANK, a.kind) - rankOf(KIND_RANK, b.kind));
  const out = {};
  for (const part of ordered) {
    for (const [k, v] of Object.entries(part)) if (out[k] == null || out[k] === '') out[k] = v;
  }
  const lead = [...parts].sort((a, b) => rankOf(KIND_RANK, a.kind) - rankOf(KIND_RANK, b.kind))[0];
  const states = parts.map((p) => p.state).filter(Boolean);
  out.id = lead.id;
  out.kind = lead.kind;
  if (states.length) out.state = states.sort((a, b) => rankOf(STATE_RANK, a) - rankOf(STATE_RANK, b))[0];
  out.needsUser = parts.some((p) => p.needsUser === true);
  out.untrusted = parts.some((p) => p.untrusted === true);
  out.lastActivity = latest(...parts.map((p) => p.lastActivity));
  const aheads = parts.map((p) => p.ahead).filter(Number.isInteger);
  if (aheads.length) out.ahead = Math.max(...aheads);
  const branches = parts.map((p) => p.branch).filter((b) => typeof b === 'string' && b);
  out.hasBuildBranch = branches.some((b) => !isPlanBranch(b) && !BASE_BRANCHES.has(b));
  out.sources = [...new Set(parts.flatMap((p) => p.sources ?? [p.source]).filter(Boolean))].sort();
  delete out.source;
  delete out.aliases;
  if (parts.length > 1) out.mergedIds = [...new Set(parts.map((p) => p.id))];
  return out;
}

function linkTask(item, tasks) {
  if (item.taskPageId) return item;
  const slug = item.specSlug ?? branchSlug(item.branch);
  const task = slug && tasks.find((t) => t?.id && slugify(t.name) === slug);
  return task ? { ...item, taskPageId: task.id } : item;
}

function groupByKeys(items) {
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map();
  items.forEach((item, i) => {
    for (const key of keysOf(item)) {
      if (owner.has(key)) parent[find(i)] = find(owner.get(key));
      else owner.set(key, i);
    }
  });
  const groups = new Map();
  items.forEach((item, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item);
  });
  return [...groups.values()];
}

const groupActivity = (parts) => latest(...parts.map((p) => p.lastActivity)) ?? '';

// A spec has no repo, so it joins only the most recently active group with its slug.
export function merge(items, { tasks = [] } = {}) {
  const specs = items.filter(isSpecOnly);
  const groups = groupByKeys(items.filter((i) => !isSpecOnly(i)));
  for (const spec of specs) {
    const slug = slugOf(spec);
    const match = groups
      .filter((parts) => slug && parts.some((p) => slugOf(p) === slug))
      .sort((a, b) => groupActivity(b).localeCompare(groupActivity(a)))[0];
    if (match) match.push(spec);
    else groups.push([spec]);
  }
  return groups.map((parts) => linkTask(combine(parts), tasks));
}

const worktreeEntity = (w) => ({ id: w.id, kind: 'worktree', source: 'worktrees', title: branchSlug(w.branch) ?? w.branch, cwd: w.path, branch: w.branch, repo: w.repo, ahead: w.ahead, lastActivity: w.lastCommitAt });
const prEntity = (p) => ({ id: p.id, kind: 'pr', source: 'prs', title: p.title, branch: p.branch, repo: p.repo, lastActivity: p.updatedAt, pr: { number: p.number, url: p.url, isDraft: p.isDraft, reviewRequested: p.reviewRequested }, untrusted: p.untrusted });
const specEntity = (s) => ({ id: s.id, kind: 'spec', source: 'specs', title: s.title, specSlug: s.slug, spec: { status: s.status, bucket: s.bucket, mtime: s.mtime }, untrusted: s.untrusted });
// P5 hook: planner plans waiting for `go`.
const planEntity = (p) => ({ id: p.id, kind: 'plan', source: 'plans', title: sanitize(p.title), needsUser: p.approved !== true, untrusted: true });

// A died job has no result.json, so its age falls back to its last activity.
function recentResult(item, nowMs) {
  const at = Date.parse(item.result?.at ?? item.lastActivity ?? '');
  return Boolean(item.result) && nowMs - at < BUILT_RESULT_DAYS * DAY_MS;
}

export const failedBuild = (item) => Boolean(item.result) && item.result.status !== 'passed';

function classOf(item, nowMs) {
  const ageMs = item.lastActivity ? nowMs - Date.parse(item.lastActivity) : Infinity;
  const recent = recentResult(item, nowMs);
  if (item.needsUser || item.pr?.reviewRequested || (recent && failedBuild(item))) return 'waiting';
  if (item.state === 'working' || ageMs < IN_FLIGHT_MS) return 'inFlight';
  const unmerged = item.ahead > 0 || Boolean(item.pr);
  const fresh = item.lastActivity && workingDaysBetween(item.lastActivity, new Date(nowMs)) < STALE_WORKING_DAYS;
  if ((unmerged && fresh) || (recent && !failedBuild(item))) return 'built';
  if (item.spec?.bucket === 'buildable' && !item.hasBuildBranch) return 'planned';
  if (unmerged) return 'stale';
  return null;
}

const byRecent = (a, b) => (b.lastActivity ?? b.spec?.mtime ?? '').localeCompare(a.lastActivity ?? a.spec?.mtime ?? '');

export function classify(snapshot, { now = new Date() } = {}) {
  const nowMs = new Date(now).getTime();
  const entities = [
    ...(snapshot?.sessions ?? []),
    ...(snapshot?.worktrees ?? []).map(worktreeEntity),
    ...(snapshot?.prs ?? []).map(prEntity),
    ...(snapshot?.specs ?? []).filter((s) => s.bucket === 'buildable').map(specEntity),
    ...(snapshot?.plans ?? []).map(planEntity),
  ];
  const classes = Object.fromEntries(CLASSES.map((c) => [c, []]));
  for (const item of merge(entities, { tasks: snapshot?.tasks ?? [] })) {
    const cls = classOf(item, nowMs);
    if (cls) classes[cls].push(item);
  }
  for (const c of CLASSES) classes[c].sort(byRecent);
  return classes;
}

const COLLECTORS = {
  jobs: (roots) => collectJobs(roots),
  transcripts: (roots, opts) => collectTranscripts({ ...roots, now: opts.now }),
  desktop: (roots) => collectDesktop(roots),
  worktrees: (roots, opts) => collectWorktrees({ repos: roots.repos, exec: opts.exec, exists: opts.exists }),
  prs: (roots, opts) => collectPrs({ repos: roots.repos, exec: opts.exec, exists: opts.exists }),
  specs: (roots) => collectSpecs(roots),
};

export function collectAll(roots, { now = new Date(), exec = defaultExec, exists = existsSync, collectors = {} } = {}) {
  const sources = {};
  const errors = {};
  const results = {};
  for (const [name, run] of Object.entries({ ...COLLECTORS, ...collectors })) {
    let r;
    try {
      r = run(roots, { now, exec, exists });
    } catch (err) {
      r = { status: err?.code === 'ENOENT' ? 'unavailable' : 'error', items: [], error: err?.message ?? String(err) };
    }
    sources[name] = r.status;
    if (r.error) errors[name] = r.error;
    results[name] = r.items ?? [];
  }
  const sessions = merge([...results.jobs, ...results.transcripts, ...results.desktop]);
  return { sources, errors, sessions, worktrees: results.worktrees, prs: results.prs, specs: results.specs };
}
