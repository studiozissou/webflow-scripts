// File-based registry for unattended triage build jobs: <jobsDir>/<pageId>/ claimed by atomic mkdir, meta.json {pageId, slug, threadTs, task, brief, startedAt, pid, pidStart}, result.json written by the job script, a reported marker, a live cap checked with process.kill(pid, 0) plus the process start time (a dead or reused pid without result.json counts as finished-failed), a kill switch, and a detached /bin/bash spawn of the job script with args [slug, pageId, threadTs, jobDir] and no tokens in its env.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEBUG = false;

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const DEFAULT_JOBS_DIR = join(REPO_ROOT, '.claude/triage/jobs');
export const DEFAULT_KILL_SWITCH = join(REPO_ROOT, '.claude/triage/triage.off');
export const DEFAULT_SCRIPT = join(REPO_ROOT, 'scripts/triage-job.sh');
export const DEFAULT_CAP = 3;

const PAGE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const THREAD_TS = /^\d+\.\d+$/;

function check(value, re, name) {
  if (typeof value !== 'string' || !re.test(value)) throw new Error(`invalid ${name}: ${value}`);
  return value;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeMeta(jobDir, meta) {
  writeFileSync(join(jobDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
}

const DIED = { status: 'failed', branch: null, tests: { passed: 0, total: 0 }, summary: 'job died without result', specPath: null };
const SECRET_ENV = (name) => name === 'NOTION_TOKEN' || name.endsWith('_TOKEN') || name.startsWith('SLACK_');

function processStart(pid) {
  try {
    const out = execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, LC_ALL: 'C' },
    });
    return out.trim().replace(/\s+/g, ' ') || null;
  } catch {
    return null;
  }
}

function isAlive(meta) {
  const { pid, pidStart } = meta;
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
  } catch (err) {
    if (err.code !== 'EPERM') return false;
  }
  return !pidStart || processStart(pid) === pidStart;
}

function jobIds(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && PAGE_ID.test(e.name))
    .map((e) => e.name)
    .sort();
}

function stateOf(dir, pageId) {
  const jobDir = join(dir, pageId);
  const meta = readJson(join(jobDir, 'meta.json')) ?? { pageId };
  const hasResult = () => existsSync(join(jobDir, 'result.json'));
  let alive = false;
  let died = false;
  if (!hasResult() && meta.pid != null) {
    alive = isAlive(meta);
    died = !alive && !hasResult();
  }
  return {
    pageId,
    jobDir,
    meta,
    alive,
    finished: died || hasResult(),
    died,
    reported: existsSync(join(jobDir, 'reported')),
  };
}

function resultOf(state) {
  if (state.died) return { ...DIED };
  return (
    readJson(join(state.jobDir, 'result.json')) ?? {
      status: 'failed',
      branch: null,
      tests: null,
      summary: 'result.json unreadable',
      specPath: null,
    }
  );
}

// Claimed and unfinished, including claims whose pid is not written yet.
function occupiedCount(dir) {
  return jobIds(dir).filter((id) => {
    const state = stateOf(dir, id);
    return !state.finished && (state.alive || state.meta.pid == null);
  }).length;
}

export function claim(dir, pageId, meta = {}) {
  check(pageId, PAGE_ID, 'pageId');
  mkdirSync(dir, { recursive: true });
  const jobDir = join(dir, pageId);
  try {
    mkdirSync(jobDir);
  } catch (err) {
    if (err.code === 'EEXIST') return { ok: false, reason: 'claimed' };
    throw err;
  }
  writeMeta(jobDir, { ...meta, pageId, pid: null });
  return { ok: true, jobDir };
}

export function liveCount(dir) {
  return jobIds(dir).filter((id) => stateOf(dir, id).alive).length;
}

export function list(dir) {
  return jobIds(dir).map((id) => {
    const { died, ...state } = stateOf(dir, id);
    if (state.finished) state.result = resultOf({ ...state, died });
    return state;
  });
}

export function release(dir, pageId) {
  check(pageId, PAGE_ID, 'pageId');
  rmSync(join(dir, pageId), { recursive: true, force: true });
}

export function collect(dir) {
  const out = [];
  for (const id of jobIds(dir)) {
    const state = stateOf(dir, id);
    if (!state.finished || state.reported) continue;
    const result = resultOf(state);
    writeFileSync(join(state.jobDir, 'reported'), `${new Date().toISOString()}\n`);
    out.push({ pageId: id, jobDir: state.jobDir, meta: state.meta, result });
  }
  return out;
}

function childEnv(jobDir) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !SECRET_ENV(name)));
  return { ...env, CLAUDE_JOB_DIR: jobDir };
}

export function start({
  jobsDir = DEFAULT_JOBS_DIR,
  pageId,
  slug,
  threadTs,
  task = '',
  brief = '',
  script = DEFAULT_SCRIPT,
  killSwitch = DEFAULT_KILL_SWITCH,
  cap = DEFAULT_CAP,
} = {}) {
  check(pageId, PAGE_ID, 'pageId');
  check(slug, SLUG, 'slug');
  check(threadTs, THREAD_TS, 'threadTs');
  if (killSwitch && existsSync(killSwitch)) return { started: false, reason: 'kill-switch' };
  if (liveCount(jobsDir) >= cap) return { started: false, reason: 'cap' };
  const claimed = claim(jobsDir, pageId, { slug, threadTs, task, brief, startedAt: new Date().toISOString() });
  if (!claimed.ok) return { started: false, reason: claimed.reason };
  const { jobDir } = claimed;
  if (occupiedCount(jobsDir) > cap) {
    release(jobsDir, pageId);
    return { started: false, reason: 'cap' };
  }
  const scriptPath = resolve(script);
  if (!existsSync(scriptPath)) {
    release(jobsDir, pageId);
    return { started: false, reason: 'script-missing' };
  }
  let child;
  try {
    child = spawn('/bin/bash', [scriptPath, slug, pageId, threadTs, jobDir], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: 'ignore',
      env: childEnv(jobDir),
    });
  } catch (err) {
    DEBUG && console.log(`spawn failed: ${err.message}`);
    release(jobsDir, pageId);
    return { started: false, reason: 'spawn-failed' };
  }
  child.on('error', (err) => DEBUG && console.log(`job ${pageId} error: ${err.message}`));
  if (!child.pid) {
    release(jobsDir, pageId);
    return { started: false, reason: 'spawn-failed' };
  }
  child.unref();
  const meta = readJson(join(jobDir, 'meta.json'));
  writeMeta(jobDir, { ...meta, pid: child.pid, pidStart: processStart(child.pid) });
  return { started: true, pageId, jobDir, pid: child.pid };
}
