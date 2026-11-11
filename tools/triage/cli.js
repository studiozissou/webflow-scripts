// Triage CLI over the tested rule modules (buckets, rank, approvals, lint, jobs start|collect|list, snapshot collect|add-remote|rollup from lib/snapshot-cli.js, learnings extract|add|comment|digest from lib/learnings-cli.js, goals health|questions|keep from lib/goals-cli.js, plan due|list from lib/plan-cli.js, patterns over lib/patterns.js, advisors lines|scores|verdict over lib/advisors.js, drafts targets from lib/doer-cli.js): reads JSON from --in or stdin, writes JSON to stdout, exits 0 on success, 1 on lint warnings or a refused job, 2 on usage or input errors. It takes no flag that weakens a control: job paths and the cap come from code defaults (tests override them with TRIAGE_TEST_* env vars, which the unattended allowlist cannot set), buildsEnabled (which also gates plan jobs) and the approvals and drafts user ID come only from the real .claude/triage/config.json (TRIAGE_TEST_CONFIG in tests), never --config, and every jobs, snapshot, learnings, goals, plan and drafts subcommand refuses inside a build job.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';
import { bucketTasks } from './lib/buckets.js';
import { rankAutomatable, DEFAULT_MAX_BUILD_ITEMS } from './lib/rank.js';
import { parseReplies } from './lib/approvals.js';
import { lint, MIN_RATIO } from './lib/ste-lint.js';
import { start, collect, list, REPO_ROOT, DEFAULT_JOBS_DIR, DEFAULT_KILL_SWITCH, DEFAULT_SCRIPT, DEFAULT_CAP } from './lib/jobs.js';
import { run as runSnapshot } from './lib/snapshot-cli.js';
import { run as runLearnings } from './lib/learnings-cli.js';
import { run as runGoals } from './lib/goals-cli.js';
import { run as runPlan } from './lib/plan-cli.js';
import { run as runDoer } from './lib/doer-cli.js';
import { DEFAULT_WORLD_DIR, readSnapshot } from './lib/snapshot.js';
import { spot } from './lib/patterns.js';
import { auditor, appendScores, logistics, numberLines, readScores, relationship, verdict } from './lib/advisors.js';
import { homedir } from 'node:os';
import { UsageError, out, parseNow, readInput, readJson, refuseInBuildJob } from './lib/cli-io.js';

const USAGE = `usage: cli.js <command> [options]
  buckets [--now <iso>] [--in <tasks.json>] [--threads <threads.json>]
                                                      tasks array or {tasks, threads}; threads array
  rank [--in <tasks.json>] [--max <n>]
  approvals --digest <state.json> --replies <replies.json>   user ID from .claude/triage/config.json only
  lint [--in <digest.md>] [--ratio]                   exit 1 on warnings; with --ratio, prints the
                                                      pass ratio and exits 1 only when it is below 0.80
  jobs start --page <id> --slug <slug> --thread <ts> [--kind build|plan] [--label <B1>] [--task <name>] [--brief <text>]
                                                      exit 1 when refused (builds-off, kill-switch, cap, claimed);
                                                      kind plan runs /plan only (default build)
  jobs collect | jobs list
  snapshot collect [--tasks <tasks.json>] [--goals <goals.json>] [--now <iso>]
                                                      writes .claude/triage/world/<date>.json
  snapshot add-remote [--in <remote.json>] | --unavailable   [{ id?, name, status, kind? }] from the session list
  snapshot rollup [--in <snapshot.json>] [--now <iso>]    counts, headline and thread reply 1
  learnings extract                                   inbox -> learnings/excerpts-<date>.json; noModel when empty
  learnings add --skill <name> --text <line>          one dated line in ~/.claude/context/learnings.md; 10 a day
  learnings comment --task <pageId> (--text <t> | --text-file <tmp/file>)
                                                      one "Learnings:" comment per excerpted task per day
  learnings digest --in <tmp/draft.md>                validated draft -> learnings/digest-<date>.md
  goals health [--in <snapshot.json>]                 goal health, tasks with no goal, Monday GOALS block
  goals questions [--in <snapshot.json>]              up to 3 goal-fit Q items (D18); keeps from goals-state.json
  goals keep --task <pageId>                          30-day keep; only a goal-fit item in today's digest
  plan due --thread <ts> [--goals <json>] [--tasks <json>] [--specs-dir <path>]
                                                      plan jobs for goals with no next step; 2 a day, shared cap
  plan list [--specs-dir <path>]                      P items from finished plan jobs; Goal fit: none hidden
  patterns [--in <{tasks, sessions, learnings}.json>]  up to 3 COULD AUTOMATE A items (3+ in 30 days);
                                                      default: today's snapshot tasks and sessions
  advisors lines [--in <snapshot.json>] [--logs <audit.json>]
                                                      V lines from the Node advisors, max 3 each
  advisors scores --in <reactions.json>               append [{advisor, line, reaction: +1|-1, date}]
  advisors verdict --start <yyyy-mm-dd>               keep/drop/no data after 10 working days
  drafts targets [--in <threads.json>]                Slack DMs and threads whose last message is not Will's
common: --config <config.json>; learnings, goals and plan take no --now (clock only)
`;

const VALUE_FLAGS = ['now', 'in', 'threads', 'config', 'digest', 'replies', 'max', 'page', 'slug', 'thread', 'label', 'task', 'brief', 'tasks', 'goals', 'skill', 'text', 'text-file', 'kind', 'specs-dir', 'logs', 'start'];

// Test-only overrides. The unattended allowlist rule Bash(node tools/triage/cli.js *) cannot
// match a command with a leading env assignment, so a scheduled run cannot set these.
const TEST_ENV = {
  jobsDir: 'TRIAGE_TEST_JOBS_DIR',
  script: 'TRIAGE_TEST_SCRIPT',
  killSwitch: 'TRIAGE_TEST_KILL_SWITCH',
  cap: 'TRIAGE_TEST_CAP',
  config: 'TRIAGE_TEST_CONFIG',
};

// The real private config. buildsEnabled and the approver user ID are read only from here,
// never from --config, so a run cannot point --config at a file it wrote under tmp/.
export const CONTROL_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), '../../.claude/triage/config.json');
const BOOLEAN_FLAGS = ['ratio', 'unavailable'];
const OPTIONS = Object.fromEntries([
  ...VALUE_FLAGS.map((name) => [name, { type: 'string' }]),
  ...BOOLEAN_FLAGS.map((name) => [name, { type: 'boolean' }]),
]);

export function parseArgs(argv) {
  try {
    const { values, positionals } = parseNodeArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: true });
    return { positional: positionals, ...values };
  } catch (err) {
    throw new UsageError(err.message);
  }
}

function loadConfig(args) {
  if (!args.config) return {};
  return readJson(readFileSync(resolve(args.config), 'utf8'), args.config);
}

// Missing file → {} so builds stay off and approvals fail closed.
function controlConfig(env = process.env) {
  const path = resolve(env[TEST_ENV.config] || CONTROL_CONFIG);
  if (!existsSync(path)) return {};
  return readJson(readFileSync(path, 'utf8'), path);
}

function tasksAndThreads(input) {
  if (Array.isArray(input)) return { tasks: input, threads: [] };
  return { tasks: input?.tasks ?? [], threads: input?.threads ?? [] };
}

function intFlag(value, name, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new UsageError(`--${name} must be a whole number`);
  return n;
}

function jobPaths(env = process.env) {
  return {
    jobsDir: resolve(env[TEST_ENV.jobsDir] || DEFAULT_JOBS_DIR),
    script: resolve(env[TEST_ENV.script] || DEFAULT_SCRIPT),
    killSwitch: resolve(env[TEST_ENV.killSwitch] || DEFAULT_KILL_SWITCH),
    cap: intFlag(env[TEST_ENV.cap] || undefined, TEST_ENV.cap, DEFAULT_CAP),
  };
}

function readThreads(path) {
  if (!path) return [];
  let text;
  try {
    text = readFileSync(resolve(path), 'utf8');
  } catch (err) {
    throw new UsageError(`--threads cannot be read: ${err.message}`);
  }
  const threads = readJson(text, path);
  if (!Array.isArray(threads)) throw new UsageError('--threads must be a JSON array of threads');
  return threads;
}

function runBuckets(args, config) {
  const now = parseNow(args);
  const { tasks, threads } = tasksAndThreads(readJson(readInput(args), 'input'));
  out(bucketTasks(tasks, [...threads, ...readThreads(args.threads)], now, config.digest?.rules ?? {}));
  return 0;
}

function runRank(args, config) {
  const { tasks } = tasksAndThreads(readJson(readInput(args), 'input'));
  const claimed = list(jobPaths().jobsDir).map((j) => j.pageId);
  const max = intFlag(args.max, 'max', config.digest?.maxBuildItems ?? DEFAULT_MAX_BUILD_ITEMS);
  out(rankAutomatable(tasks, config.digest?.doerMap, claimed, { max }));
  return 0;
}

function runApprovals(args) {
  if (!args.digest || !args.replies) throw new UsageError('approvals needs --digest and --replies');
  const userId = controlConfig().slack?.digest?.userId;
  if (!userId) throw new UsageError('approvals needs slack.digest.userId in .claude/triage/config.json');
  const state = readJson(readFileSync(resolve(args.digest), 'utf8'), args.digest);
  const replies = readJson(readFileSync(resolve(args.replies), 'utf8'), args.replies);
  const digest = state?.digest ?? state;
  const messages = Array.isArray(replies) ? replies : (replies?.messages ?? []);
  out(parseReplies(digest, messages, { userId }));
  return 0;
}

function runLint(args, config) {
  const { ok, warnings, ratio } = lint(readInput(args), config.digest?.lint ?? {});
  if (!args.ratio) {
    out({ ok, warnings });
    return ok ? 0 : 1;
  }
  out({ ok, ratio, warnings });
  return ratio >= MIN_RATIO ? 0 : 1;
}

function runJobs(args) {
  const [, sub] = args.positional;
  if (refuseInBuildJob('jobs')) return 2;
  const paths = jobPaths();
  if (sub === 'list') {
    out(list(paths.jobsDir));
    return 0;
  }
  if (sub === 'collect') {
    out(collect(paths.jobsDir));
    return 0;
  }
  if (sub !== 'start') throw new UsageError(`unknown jobs subcommand: ${sub ?? '(none)'}`);
  if (!args.page || !args.slug || !args.thread) throw new UsageError('jobs start needs --page, --slug and --thread');
  if (args.kind !== undefined && args.kind !== 'build' && args.kind !== 'plan') throw new UsageError('--kind must be build or plan');
  if (controlConfig().digest?.buildsEnabled !== true) {
    out({ started: false, reason: 'builds-off' });
    return 1;
  }
  const result = start({
    ...paths,
    pageId: args.page,
    slug: args.slug,
    threadTs: args.thread,
    label: args.label ?? null,
    kind: args.kind ?? 'build',
    task: args.task ?? '',
    brief: args.brief ?? '',
  });
  out(result);
  return result.started ? 0 : 1;
}

function runPlanCommand(args) {
  return runPlan(args, {
    buildsEnabled: controlConfig().digest?.buildsEnabled === true,
    paths: jobPaths(),
    worldDir: resolve(process.env.TRIAGE_TEST_WORLD_DIR || DEFAULT_WORLD_DIR),
  });
}

function runPatterns(args) {
  const now = parseNow(args);
  const input = args.in ? readJson(readInput(args), args.in) : readSnapshot(resolve(process.env.TRIAGE_TEST_WORLD_DIR || DEFAULT_WORLD_DIR), now);
  if (!input) throw new UsageError('patterns needs --in or a snapshot for today');
  out(spot({ tasks: input.tasks ?? [], sessions: input.sessions ?? [], learnings: input.learnings ?? [] }, { now }));
  return 0;
}

const ADVISORS_DIR = () => resolve(process.env.TRIAGE_TEST_ADVISORS_DIR || join(REPO_ROOT, '.claude/triage'));

function readUsage() {
  try {
    return readFileSync(join(process.env.TRIAGE_TEST_HOME || homedir(), '.claude/usage-5h'), 'utf8');
  } catch {
    return '';
  }
}

function runAdvisors(args) {
  if (refuseInBuildJob('advisors')) return 2;
  const [, sub] = args.positional;
  const now = parseNow(args);
  if (sub === 'lines') {
    const snapshot = args.in ? readJson(readInput(args), args.in) : readSnapshot(resolve(process.env.TRIAGE_TEST_WORLD_DIR || DEFAULT_WORLD_DIR), now);
    if (!snapshot) throw new UsageError('advisors lines needs --in or a snapshot for today');
    const logs = args.logs ? readJson(readFileSync(resolve(args.logs), 'utf8'), args.logs) : {};
    out(numberLines({ logistics: logistics(snapshot, { now, usage5h: readUsage() }), relationship: relationship(snapshot, { now }), auditor: auditor(logs, { now }) }));
    return 0;
  }
  if (sub === 'scores') {
    if (!args.in) throw new UsageError('advisors scores needs --in <reactions.json>');
    const rows = readJson(readInput(args), args.in);
    if (!Array.isArray(rows)) throw new UsageError('--in must be a JSON array of scores');
    out({ added: appendScores(ADVISORS_DIR(), rows) });
    return 0;
  }
  if (sub === 'verdict') {
    if (!args.start || Number.isNaN(Date.parse(args.start))) throw new UsageError('advisors verdict needs --start <yyyy-mm-dd>');
    out(verdict(readScores(ADVISORS_DIR()), { now, startDate: args.start }));
    return 0;
  }
  throw new UsageError(`unknown advisors subcommand: ${sub ?? '(none)'}`);
}

function runDrafts(args) {
  return runDoer(args, { userId: controlConfig().slack?.digest?.userId });
}

const COMMANDS = { buckets: runBuckets, rank: runRank, approvals: runApprovals, lint: runLint, jobs: runJobs, snapshot: runSnapshot, learnings: runLearnings, goals: runGoals, plan: runPlanCommand, patterns: runPatterns, advisors: runAdvisors, drafts: runDrafts };

function fail(err) {
  if (err instanceof UsageError) process.stderr.write(`${err.message}\n${USAGE}`);
  else process.stderr.write(`ERROR ${err.message}\n`);
  return 2;
}

// An exit code, or a promise of one for commands that call the network (learnings comment).
export function main(argv) {
  try {
    const args = parseArgs(argv);
    const command = COMMANDS[args.positional[0]];
    if (!command) throw new UsageError(args.positional[0] ? `unknown command: ${args.positional[0]}` : 'no command');
    const code = command(args, loadConfig(args));
    return code instanceof Promise ? code.catch(fail) : code;
  } catch (err) {
    return fail(err);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve(main(process.argv.slice(2))).then((code) => {
    process.exitCode = code;
  });
}
