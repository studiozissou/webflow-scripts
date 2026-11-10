// `cli.js goals health|questions|keep`: health prints goal health, the top 5 tasks with no goal and the Monday GOALS block from today's snapshot (or --in), questions prints up to 3 goal-fit Q items picked by goals.js unlinked() with the real keep state, and keep records a 30-day keep for a task only when it is a goal-fit item in today's digest (state.json). Every subcommand refuses inside a build job and refuses --now (the clock picks the day; tests set TRIAGE_TEST_NOW). Paths come only from code defaults; tests override them with TRIAGE_TEST_WORLD_DIR, TRIAGE_TEST_GOALS_DIR and TRIAGE_TEST_STATE_FILE, never a flag.
import { join, resolve } from 'node:path';
import { UsageError, clock, out, readInput, readJson, readJsonFile, refuseInBuildJob } from './cli-io.js';
import { PAGE_ID, REPO_ROOT } from './jobs.js';
import { GOAL_FIT_KIND } from './approvals.js';
import { goalsBlock, health, unlinked } from './goals.js';
import { keep, loadState, saveState } from './goals-state.js';
import { sanitize } from './sessions.js';
import { DEFAULT_WORLD_DIR, readSnapshot, snapshotPath } from './snapshot.js';
import { amsterdamDate } from './workdays.js';

export const DEFAULT_GOALS_DIR = join(REPO_ROOT, '.claude/triage');
export const DEFAULT_STATE_FILE = join(REPO_ROOT, '.claude/triage/state.json');

const TEST_ENV = { worldDir: 'TRIAGE_TEST_WORLD_DIR', goalsDir: 'TRIAGE_TEST_GOALS_DIR', stateFile: 'TRIAGE_TEST_STATE_FILE' };

function paths(env = process.env) {
  return {
    worldDir: resolve(env[TEST_ENV.worldDir] || DEFAULT_WORLD_DIR),
    goalsDir: resolve(env[TEST_ENV.goalsDir] || DEFAULT_GOALS_DIR),
    stateFile: resolve(env[TEST_ENV.stateFile] || DEFAULT_STATE_FILE),
  };
}

// --in, else today's world/<date>.json, as `snapshot rollup` resolves it.
function snapshotOf(args, now, { worldDir }) {
  const snapshot = args.in ? readJson(readInput(args), args.in) : readSnapshot(worldDir, now);
  if (!snapshot) throw new UsageError(`no snapshot at ${snapshotPath(worldDir, now)}; run snapshot collect first`);
  return { tasks: snapshot.tasks ?? [], goals: snapshot.goals ?? [] };
}

function runHealth(args, now, p) {
  const { tasks, goals } = snapshotOf(args, now, p);
  const result = health(goals, tasks, { now });
  out({ ...result, block: goalsBlock(result) });
  return 0;
}

function runQuestions(args, now, p) {
  const { tasks, goals } = snapshotOf(args, now, p);
  const state = loadState(p.goalsDir, { now });
  out(
    unlinked(tasks, goals, { now, state }).map((t, i) => ({
      label: `Q${i + 1}`,
      taskId: t.id,
      taskName: sanitize(t.name),
      priority: t.priority ?? null,
    })),
  );
  return 0;
}

// The task must be a goal-fit item of today's digest, so a keep follows a question that was asked.
function keepRefusal(taskId, now, stateFile) {
  const digest = readJsonFile(stateFile)?.digest;
  if (!digest || digest.date !== amsterdamDate(now)) return 'no-digest-today';
  const asked = (digest.items ?? []).some((item) => item?.kind === GOAL_FIT_KIND && item.taskId === taskId);
  return asked ? null : 'not-a-question';
}

function runKeep(args, now, { goalsDir, stateFile }) {
  if (!args.task || !PAGE_ID.test(args.task)) throw new UsageError('goals keep needs --task <pageId>');
  const reason = keepRefusal(args.task, now, stateFile);
  if (reason) {
    out({ kept: false, reason });
    return 1;
  }
  const next = keep(loadState(goalsDir, { now }), args.task, now);
  saveState(goalsDir, next);
  const { until } = next.kept.find((e) => e.taskId === args.task);
  out({ kept: true, taskId: args.task, until });
  return 0;
}

const SUBCOMMANDS = { health: runHealth, questions: runQuestions, keep: runKeep };

export function run(args) {
  if (refuseInBuildJob('goals')) return 2;
  const [, sub] = args.positional;
  const command = SUBCOMMANDS[sub];
  if (!command) throw new UsageError(`unknown goals subcommand: ${sub ?? '(none)'}`);
  return command(args, clock(args, 'goals'), paths());
}
