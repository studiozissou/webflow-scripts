// `cli.js snapshot collect|add-remote|rollup`: collect runs the session collectors into today's world/<date>.json (a failing source is recorded, never fatal), add-remote merges the cloud and Remote Control sessions the model listed in-run (or records them as unavailable), and rollup prints counts, the digest headline and thread reply 1. Every subcommand refuses inside a build job. The world dir and the home the collectors read come only from code defaults; tests override them with TRIAGE_TEST_WORLD_DIR, TRIAGE_TEST_HOME and TRIAGE_TEST_JOBS_DIR, never a flag.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UsageError, out, parseNow, readInput, readJson, refuseInBuildJob } from './cli-io.js';
import { DEFAULT_JOBS_DIR } from './jobs.js';
import { defaultRoots } from './sessions.js';
import { DEFAULT_WORLD_DIR, REMOTE_KINDS, addRemote, collectSnapshot, readSnapshot, snapshotPath, withLock, writeSnapshot } from './snapshot.js';
import { rollup } from './rollup.js';

const TEST_ENV = { worldDir: 'TRIAGE_TEST_WORLD_DIR', home: 'TRIAGE_TEST_HOME', jobsDir: 'TRIAGE_TEST_JOBS_DIR' };

function paths(env = process.env) {
  const roots = env[TEST_ENV.home] ? defaultRoots(resolve(env[TEST_ENV.home])) : defaultRoots();
  return {
    worldDir: resolve(env[TEST_ENV.worldDir] || DEFAULT_WORLD_DIR),
    roots: { ...roots, triageJobsDir: resolve(env[TEST_ENV.jobsDir] || DEFAULT_JOBS_DIR) },
  };
}

const noSnapshot = (worldDir, now) => new UsageError(`no snapshot at ${snapshotPath(worldDir, now)}; run snapshot collect first`);

function readTasks(path) {
  if (!path) return undefined;
  const value = readJson(readFileSync(resolve(path), 'utf8'), path);
  const tasks = Array.isArray(value) ? value : value?.tasks;
  if (!Array.isArray(tasks)) throw new UsageError('--tasks must be a JSON array of tasks or {tasks}');
  return tasks;
}

function runCollect(args, now, { worldDir, roots }) {
  const result = collectSnapshot({ dir: worldDir, now, roots, tasks: readTasks(args.tasks) });
  if (!result.ok) {
    out({ written: false, reason: result.reason });
    return 1;
  }
  out({ path: result.path, sources: result.snapshot.sources, counts: rollup(result.snapshot, { now }).counts });
  return 0;
}

function readRemoteList(args) {
  if (args.unavailable) return null;
  const value = readJson(readInput(args), args.in ?? 'stdin');
  const list = Array.isArray(value) ? value : value?.sessions;
  if (!Array.isArray(list)) throw new UsageError('add-remote needs a JSON array of { id?, name, status, kind? }');
  return list;
}

function runAddRemote(args, now, { worldDir }) {
  const list = readRemoteList(args);
  const locked = withLock(worldDir, () => {
    const snapshot = readSnapshot(worldDir, now);
    if (!snapshot) return null;
    const next = addRemote(snapshot, list);
    writeSnapshot(worldDir, next);
    return next;
  });
  if (!locked.ok) {
    out({ written: false, reason: locked.reason });
    return 1;
  }
  if (!locked.value) throw noSnapshot(worldDir, now);
  const added = locked.value.sessions.filter((s) => REMOTE_KINDS.has(s.kind)).length;
  out({ path: snapshotPath(worldDir, now), sources: locked.value.sources, added });
  return 0;
}

function runRollup(args, now, { worldDir }) {
  const snapshot = args.in ? readJson(readInput(args), args.in) : readSnapshot(worldDir, now);
  if (!snapshot) throw noSnapshot(worldDir, now);
  out(rollup(snapshot, { now }));
  return 0;
}

const SUBCOMMANDS = { collect: runCollect, 'add-remote': runAddRemote, rollup: runRollup };

export function run(args) {
  if (refuseInBuildJob('snapshot')) return 2;
  const [, sub] = args.positional;
  const command = SUBCOMMANDS[sub];
  if (!command) throw new UsageError(`unknown snapshot subcommand: ${sub ?? '(none)'}`);
  return command(args, parseNow(args), paths());
}
