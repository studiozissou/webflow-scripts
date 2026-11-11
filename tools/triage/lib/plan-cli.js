// `cli.js plan due|list`: due starts plan jobs (jobs.js kind plan) for the goals plans.js due() picks from --goals/--tasks files or today's snapshot and the specs in --specs-dir or the snapshot, only when buildsEnabled is true in the control config, at most 2 a day inside the shared cap; list prints the PLANS TO APPROVE P items from finished planned jobs, hiding any whose spec says Goal fit: none. Both refuse inside a build job and refuse --now (the clock picks the day; tests set TRIAGE_TEST_NOW); cli.js passes in buildsEnabled and the job paths, so no flag can move them.
import { readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { UsageError, clock, out, readJson, refuseInBuildJob } from './cli-io.js';
import { REPO_ROOT, list, start } from './jobs.js';
import { due, planItems } from './plans.js';
import { collectSpecs } from './sessions.js';
import { DEFAULT_WORLD_DIR, readSnapshot } from './snapshot.js';

export const DEFAULT_SPECS_DIR = join(REPO_ROOT, '.claude/specs');
const THREAD_TS = /^\d+\.\d+$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

function readList(path, key) {
  const value = readJson(readFileSync(resolve(path), 'utf8'), path);
  const items = Array.isArray(value) ? value : value?.[key];
  if (!Array.isArray(items)) throw new UsageError(`--${key} must be a JSON array or { ${key}: [...] }`);
  return items;
}

function specsIn(dir) {
  try {
    return collectSpecs({ specsDirs: [realpathSync(resolve(dir))] }).items;
  } catch {
    return [];
  }
}

function runDue(args, now, { buildsEnabled, paths, worldDir }) {
  if (!args.thread || !THREAD_TS.test(args.thread)) throw new UsageError('plan due needs --thread <ts>');
  if (!buildsEnabled) {
    out({ started: [], reason: 'builds-off' });
    return 1;
  }
  const snapshot = !args.goals || !args.tasks || !args['specs-dir'] ? readSnapshot(worldDir, now) ?? {} : {};
  const goals = args.goals ? readList(args.goals, 'goals') : (snapshot.goals ?? []);
  const tasks = args.tasks ? readList(args.tasks, 'tasks') : (snapshot.tasks ?? []);
  const specs = args['specs-dir'] ? specsIn(args['specs-dir']) : (snapshot.specs ?? []);
  const picks = due(goals, tasks, specs, { now, jobs: list(paths.jobsDir), cap: paths.cap });
  const started = [];
  const refused = [];
  for (const p of picks) {
    const r = start({ ...paths, kind: 'plan', pageId: p.pageId, slug: p.slug, threadTs: args.thread, task: p.task, brief: p.brief });
    if (r.started) started.push({ pageId: p.pageId, slug: p.slug, pid: r.pid });
    else refused.push({ pageId: p.pageId, slug: p.slug, reason: r.reason });
  }
  out(refused.length ? { started, refused } : { started });
  return 0;
}

function runList(args, now, { paths }) {
  const dir = resolve(args['specs-dir'] ?? DEFAULT_SPECS_DIR);
  const readSpec = (slug) => {
    if (typeof slug !== 'string' || !SLUG.test(slug)) return null;
    try {
      return readFileSync(join(dir, `${slug}.md`), 'utf8');
    } catch {
      return null;
    }
  };
  out(planItems(list(paths.jobsDir), readSpec));
  return 0;
}

const SUBCOMMANDS = { due: runDue, list: runList };

export function run(args, { buildsEnabled = false, paths, worldDir = DEFAULT_WORLD_DIR } = {}) {
  if (refuseInBuildJob('plan')) return 2;
  const [, sub] = args.positional;
  const command = SUBCOMMANDS[sub];
  if (!command) throw new UsageError(`unknown plan subcommand: ${sub ?? '(none)'}`);
  return command(args, clock(args, 'plan'), { buildsEnabled, paths, worldDir });
}
