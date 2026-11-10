// Triage CLI over the tested rule modules (buckets, rank, approvals, lint, jobs start|collect|list): reads JSON from --in or stdin, writes JSON to stdout, exits 0 on success, 1 on lint warnings or a refused job, 2 on usage or input errors. It takes no flag that weakens a control: job paths and the cap come from code defaults (tests override them with TRIAGE_TEST_* env vars, which the unattended allowlist cannot set), the approvals user ID only from --config, and `jobs start` refuses inside a build job.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';
import { bucketTasks } from './lib/buckets.js';
import { rankAutomatable, DEFAULT_MAX_BUILD_ITEMS } from './lib/rank.js';
import { parseReplies } from './lib/approvals.js';
import { lint } from './lib/ste-lint.js';
import { start, collect, list, DEFAULT_JOBS_DIR, DEFAULT_KILL_SWITCH, DEFAULT_SCRIPT, DEFAULT_CAP } from './lib/jobs.js';

const USAGE = `usage: cli.js <command> [options]
  buckets [--now <iso>] [--in <tasks.json>] [--threads <threads.json>]
                                                      tasks array or {tasks, threads}; threads array
  rank [--in <tasks.json>] [--max <n>]
  approvals --digest <state.json> --replies <replies.json>   user ID from config.slack.digest.userId
  lint [--in <digest.md>]                             exit 1 on warnings
  jobs start --page <id> --slug <slug> --thread <ts> [--label <B1>] [--task <name>] [--brief <text>]
                                                      exit 1 when refused (builds-off, kill-switch, cap, claimed)
  jobs collect | jobs list
common: --config <config.json>
`;

const VALUE_FLAGS = ['now', 'in', 'threads', 'config', 'digest', 'replies', 'max', 'page', 'slug', 'thread', 'label', 'task', 'brief'];

// Test-only overrides. The unattended allowlist rule Bash(node tools/triage/cli.js *) cannot
// match a command with a leading env assignment, so a scheduled run cannot set these.
const TEST_ENV = {
  jobsDir: 'TRIAGE_TEST_JOBS_DIR',
  script: 'TRIAGE_TEST_SCRIPT',
  killSwitch: 'TRIAGE_TEST_KILL_SWITCH',
  cap: 'TRIAGE_TEST_CAP',
};
const OPTIONS = Object.fromEntries(VALUE_FLAGS.map((name) => [name, { type: 'string' }]));

class UsageError extends Error {}

export function parseArgs(argv) {
  try {
    const { values, positionals } = parseNodeArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: true });
    return { positional: positionals, ...values };
  } catch (err) {
    throw new UsageError(err.message);
  }
}

function readInput(args) {
  return readFileSync(args.in ? resolve(args.in) : 0, 'utf8');
}

function readJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new UsageError(`${label} is not valid JSON: ${err.message}`);
  }
}

function loadConfig(args) {
  if (!args.config) return {};
  return readJson(readFileSync(resolve(args.config), 'utf8'), args.config);
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

function out(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
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
  const now = args.now ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) throw new UsageError(`--now is not a valid date: ${now}`);
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

function runApprovals(args, config) {
  if (!args.digest || !args.replies) throw new UsageError('approvals needs --digest and --replies');
  const userId = config.slack?.digest?.userId;
  if (!userId) throw new UsageError('approvals needs --config with slack.digest.userId');
  const state = readJson(readFileSync(resolve(args.digest), 'utf8'), args.digest);
  const replies = readJson(readFileSync(resolve(args.replies), 'utf8'), args.replies);
  const digest = state?.digest ?? state;
  const messages = Array.isArray(replies) ? replies : (replies?.messages ?? []);
  out(parseReplies(digest, messages, { userId }));
  return 0;
}

function runLint(args, config) {
  const result = lint(readInput(args), config.digest?.lint ?? {});
  out(result);
  return result.ok ? 0 : 1;
}

function runJobs(args, config) {
  const [, sub] = args.positional;
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
  if (process.env.TRIAGE_BUILD_JOB) {
    process.stderr.write('jobs start: not available inside a build job\n');
    return 2;
  }
  if (!args.page || !args.slug || !args.thread) throw new UsageError('jobs start needs --page, --slug and --thread');
  if (config.digest?.buildsEnabled !== true) {
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

const COMMANDS = { buckets: runBuckets, rank: runRank, approvals: runApprovals, lint: runLint, jobs: runJobs };

export function main(argv) {
  try {
    const args = parseArgs(argv);
    const command = COMMANDS[args.positional[0]];
    if (!command) throw new UsageError(args.positional[0] ? `unknown command: ${args.positional[0]}` : 'no command');
    return command(args, loadConfig(args));
  } catch (err) {
    if (err instanceof UsageError) process.stderr.write(`${err.message}\n${USAGE}`);
    else process.stderr.write(`ERROR ${err.message}\n`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
