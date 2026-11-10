// Triage CLI over the tested rule modules (buckets, rank, approvals, lint, jobs start|collect|list, snapshot collect|add-remote|rollup from lib/snapshot-cli.js, learnings extract|add|comment|digest from lib/learnings-cli.js): reads JSON from --in or stdin, writes JSON to stdout, exits 0 on success, 1 on lint warnings or a refused job, 2 on usage or input errors. It takes no flag that weakens a control: job paths and the cap come from code defaults (tests override them with TRIAGE_TEST_* env vars, which the unattended allowlist cannot set), buildsEnabled and the approvals user ID come only from the real .claude/triage/config.json (TRIAGE_TEST_CONFIG in tests), never --config, and every jobs, snapshot and learnings subcommand refuses inside a build job.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';
import { bucketTasks } from './lib/buckets.js';
import { rankAutomatable, DEFAULT_MAX_BUILD_ITEMS } from './lib/rank.js';
import { parseReplies } from './lib/approvals.js';
import { lint, MIN_RATIO } from './lib/ste-lint.js';
import { start, collect, list, DEFAULT_JOBS_DIR, DEFAULT_KILL_SWITCH, DEFAULT_SCRIPT, DEFAULT_CAP } from './lib/jobs.js';
import { run as runSnapshot } from './lib/snapshot-cli.js';
import { run as runLearnings } from './lib/learnings-cli.js';
import { UsageError, out, parseNow, readInput, readJson, refuseInBuildJob } from './lib/cli-io.js';

const USAGE = `usage: cli.js <command> [options]
  buckets [--now <iso>] [--in <tasks.json>] [--threads <threads.json>]
                                                      tasks array or {tasks, threads}; threads array
  rank [--in <tasks.json>] [--max <n>]
  approvals --digest <state.json> --replies <replies.json>   user ID from .claude/triage/config.json only
  lint [--in <digest.md>] [--ratio]                   exit 1 on warnings; with --ratio, prints the
                                                      pass ratio and exits 1 only when it is below 0.80
  jobs start --page <id> --slug <slug> --thread <ts> [--label <B1>] [--task <name>] [--brief <text>]
                                                      exit 1 when refused (builds-off, kill-switch, cap, claimed)
  jobs collect | jobs list
  snapshot collect [--tasks <tasks.json>] [--now <iso>]   writes .claude/triage/world/<date>.json
  snapshot add-remote [--in <remote.json>] | --unavailable   [{ id?, name, status, kind? }] from the session list
  snapshot rollup [--in <snapshot.json>] [--now <iso>]    counts, headline and thread reply 1
  learnings extract                                   inbox -> learnings/excerpts-<date>.json; noModel when empty
  learnings add --skill <name> --text <line>          one dated line in ~/.claude/context/learnings.md; 10 a day
  learnings comment --task <pageId> (--text <t> | --text-file <tmp/file>)
                                                      one "Learnings:" comment per excerpted task per day
  learnings digest --in <tmp/draft.md>                validated draft -> learnings/digest-<date>.md
common: --config <config.json>; learnings takes no --now (clock only)
`;

const VALUE_FLAGS = ['now', 'in', 'threads', 'config', 'digest', 'replies', 'max', 'page', 'slug', 'thread', 'label', 'task', 'brief', 'tasks', 'skill', 'text', 'text-file'];

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
    task: args.task ?? '',
    brief: args.brief ?? '',
  });
  out(result);
  return result.started ? 0 : 1;
}

const COMMANDS = { buckets: runBuckets, rank: runRank, approvals: runApprovals, lint: runLint, jobs: runJobs, snapshot: runSnapshot, learnings: runLearnings };

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
