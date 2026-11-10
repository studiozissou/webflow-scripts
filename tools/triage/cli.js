// Triage CLI over the tested rule modules (buckets, rank, approvals, lint, jobs start|collect|list): reads JSON from --in or stdin, writes JSON to stdout, exits 0 on success, 1 on lint warnings or a refused job, 2 on usage or input errors.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';
import { bucketTasks } from './lib/buckets.js';
import { rankAutomatable } from './lib/rank.js';
import { parseReplies } from './lib/approvals.js';
import { lint } from './lib/ste-lint.js';
import { start, collect, list, DEFAULT_JOBS_DIR, DEFAULT_KILL_SWITCH, DEFAULT_SCRIPT, DEFAULT_CAP } from './lib/jobs.js';

const USAGE = `usage: cli.js <command> [options]
  buckets [--now <iso>] [--in <tasks.json>]          tasks array or {tasks, threads}
  rank [--in <tasks.json>] [--max <n>] [--jobs-dir <dir>]
  approvals --digest <state.json> --replies <replies.json> [--user <id>]
  lint [--in <digest.md>]                             exit 1 on warnings
  jobs start --page <id> --slug <slug> --thread <ts> [--task <name>] [--brief <text>]
  jobs collect | jobs list
common: --config <config.json>  jobs: --jobs-dir <dir> --script <path> --kill-switch <path> --cap <n>
`;

const VALUE_FLAGS = [
  'now', 'in', 'config', 'digest', 'replies', 'user', 'max', 'page', 'slug', 'thread',
  'task', 'brief', 'jobs-dir', 'script', 'kill-switch', 'cap',
];
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

function jobPaths(args) {
  return {
    jobsDir: resolve(args['jobs-dir'] ?? DEFAULT_JOBS_DIR),
    script: resolve(args.script ?? DEFAULT_SCRIPT),
    killSwitch: resolve(args['kill-switch'] ?? DEFAULT_KILL_SWITCH),
    cap: intFlag(args.cap, 'cap', DEFAULT_CAP),
  };
}

function runBuckets(args, config) {
  const now = args.now ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) throw new UsageError(`--now is not a valid date: ${now}`);
  const { tasks, threads } = tasksAndThreads(readJson(readInput(args), 'input'));
  out(bucketTasks(tasks, threads, now, config.digest?.rules ?? {}));
  return 0;
}

function runRank(args, config) {
  const input = readJson(readInput(args), 'input');
  const { tasks } = tasksAndThreads(input);
  const { jobsDir } = jobPaths(args);
  const claimed = [...list(jobsDir).map((j) => j.pageId), ...(input?.claimed ?? [])];
  const max = intFlag(args.max, 'max', config.digest?.maxBuildItems ?? 5);
  out(rankAutomatable(tasks, config.digest?.doerMap, claimed, { max }));
  return 0;
}

function runApprovals(args, config) {
  if (!args.digest || !args.replies) throw new UsageError('approvals needs --digest and --replies');
  const userId = args.user ?? config.slack?.digest?.userId;
  if (!userId) throw new UsageError('approvals needs --user or config.slack.digest.userId');
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

function runJobs(args) {
  const [, sub] = args.positional;
  const paths = jobPaths(args);
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
  const result = start({
    ...paths,
    pageId: args.page,
    slug: args.slug,
    threadTs: args.thread,
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
