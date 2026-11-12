// CLI over the Notion Tasks Tracker and Goals clients: list open tasks or non-Dropped goals as JSON, set Priority or Status on one page, post a comment only when the triage write gate (tools/triage/lib/comments.js allowComment against today's snapshot and the comments.jsonl ledger) allows its --page and --source, checked before any token lookup, and append one goal to a task's Goal relation (link-goal, Notion ids only); token from NOTION_TOKEN or the Keychain; refuses with exit 2 inside a build job (TRIAGE_BUILD_JOB set) before any token lookup.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseNodeArgs } from 'node:util';
import {
  notionClientFromEnv,
  queryOpenTasks,
  queryGoals,
  linkGoal,
  updatePriority,
  updateStatus,
  addComment,
} from './client.js';

import { allowComment, recordComment, DEFAULT_COMMENTS_DIR } from '../triage/lib/comments.js';
import { DEFAULT_WORLD_DIR, readSnapshot } from '../triage/lib/snapshot.js';

// Re-exported for callers and tests that resolve the token through the CLI module.
export { resolveToken } from './client.js';

const DEBUG = false;

// Test-only gate paths and clock; the unattended allowlist cannot set a leading env assignment.
const TEST_ENV = { worldDir: 'TRIAGE_TEST_WORLD_DIR', ledgerDir: 'TRIAGE_TEST_COMMENTS_DIR', now: 'TRIAGE_TEST_NOW' };

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DEFAULT_CONFIG = resolve(REPO_ROOT, '.claude/triage/config.json');

const USAGE = [
  'usage: node tools/notion/cli.js <command> [options]',
  '  tasks --open [--db <id>] [--config <path>]',
  '  set-priority --page <id> --value P0|P1|P2|P3',
  '  set-status --page <id> --value <status>',
  '  comment --page <id> --text <text> --source <id>   only through the triage comment gate',
  '  goals [--db <id>] [--config <path>]          goals that are not Dropped',
  '  link-goal --page <taskId> --goal <goalId>    appends to the task Goal relation',
].join('\n');

// A Notion page id: 32 hex digits, with or without the UUID dashes.
const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

const COMMANDS = {
  tasks: { required: ['open'] },
  'set-priority': { required: ['page', 'value'] },
  'set-status': { required: ['page', 'value'] },
  comment: { required: ['page', 'text', 'source'], allowed: [] },
  goals: { required: [], allowed: ['db', 'config'] },
  'link-goal': { required: ['page', 'goal'], allowed: [], ids: ['page', 'goal'] },
};
const OPTIONS = {
  open: { type: 'boolean' },
  db: { type: 'string' },
  config: { type: 'string' },
  page: { type: 'string' },
  value: { type: 'string' },
  text: { type: 'string' },
  goal: { type: 'string' },
  source: { type: 'string' },
};

export class UsageError extends Error {}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || !COMMANDS[command]) throw new UsageError(USAGE);
  let parsed;
  try {
    parsed = parseNodeArgs({ args: rest, options: OPTIONS, strict: true, allowPositionals: true });
  } catch (err) {
    throw new UsageError(`${err.message}\n${USAGE}`);
  }
  if (parsed.positionals.length > 0) throw new UsageError(`unknown argument ${parsed.positionals[0]}\n${USAGE}`);
  const args = { command, ...parsed.values };
  const spec = COMMANDS[command];
  for (const req of spec.required) {
    if (args[req] === undefined) throw new UsageError(`${command} requires --${req}\n${USAGE}`);
  }
  if (spec.allowed) {
    const extra = Object.keys(parsed.values).find((k) => !spec.required.includes(k) && !spec.allowed.includes(k));
    if (extra) throw new UsageError(`--${extra} is not allowed with ${command}\n${USAGE}`);
  }
  for (const key of spec.ids ?? []) {
    if (!NOTION_ID.test(args[key])) throw new UsageError(`--${key} must be a Notion id\n${USAGE}`);
  }
  return args;
}

function configDatabaseId(args, read, section) {
  if (args.db) return args.db;
  const path = args.config ?? DEFAULT_CONFIG;
  const id = JSON.parse(read(path))?.[section]?.databaseId;
  if (!id) throw new Error(`no ${section}.databaseId in ${path}; pass --db <id>`);
  return id;
}

const readText = (p) => readFileSync(p, 'utf8');

export function resolveDatabaseId(args, read = readText) {
  return configDatabaseId(args, read, 'notion');
}

export function resolveGoalsDatabaseId(args, read = readText) {
  return configDatabaseId(args, read, 'goals');
}

const DATABASE_ID = { tasks: resolveDatabaseId, goals: resolveGoalsDatabaseId };

function gatePaths(env) {
  return {
    worldDir: resolve(env[TEST_ENV.worldDir] || DEFAULT_WORLD_DIR),
    ledgerDir: resolve(env[TEST_ENV.ledgerDir] || DEFAULT_COMMENTS_DIR),
    now: env[TEST_ENV.now] || new Date().toISOString(),
  };
}

async function runComment(args, env, client) {
  const { worldDir, ledgerDir, now } = gatePaths(env);
  const target = { taskId: args.page, sourceId: args.source };
  const gate = allowComment(target, readSnapshot(worldDir, now), ledgerDir, now);
  if (!gate.ok) return { code: 1, result: { commented: false, reason: gate.reason } };
  const res = await addComment(client ?? (await notionClientFromEnv()), args.page, args.text);
  recordComment(target, ledgerDir, now);
  return { code: 0, result: { commented: true, page: args.page, source: args.source, commentId: res?.id ?? null } };
}

async function run(args, client) {
  const databaseId = DATABASE_ID[args.command]?.(args) ?? null;
  client ??= await notionClientFromEnv();
  switch (args.command) {
    case 'tasks':
      return queryOpenTasks(client, databaseId);
    case 'goals':
      return queryGoals(client, databaseId, { excludeStatuses: ['Dropped'] });
    case 'link-goal': {
      const { linked } = await linkGoal(client, args.page, args.goal);
      return { ok: true, page: args.page, goal: args.goal, linked };
    }
    case 'set-priority':
      await updatePriority(client, args.page, args.value);
      return { ok: true, page: args.page, priority: args.value };
    case 'set-status':
      await updateStatus(client, args.page, args.value);
      return { ok: true, page: args.page, status: args.value };
  }
}

// deps.client replaces the real Notion client in tests.
export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  if (env.TRIAGE_BUILD_JOB) {
    process.stderr.write('notion cli: not available inside a build job\n');
    return 2;
  }
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 1;
  }
  try {
    if (args.command === 'comment') {
      const { code, result } = await runComment(args, env, deps.client);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return code;
    }
    const result = await run(args, deps.client);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (err) {
    const status = err?.status ? ` (HTTP ${err.status}${err.code ? ` ${err.code}` : ''})` : '';
    process.stderr.write(`notion cli: ${err?.message ?? err}${status}\n`);
    DEBUG && console.log(err);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code;
  });
}
