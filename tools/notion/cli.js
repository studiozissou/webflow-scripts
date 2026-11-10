// CLI over the Notion Tasks Tracker client: list open tasks as JSON and set Priority, Status or a comment on one page; token from NOTION_TOKEN or the Keychain.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createNotionClient,
  queryOpenTasks,
  updatePriority,
  updateStatus,
  addComment,
} from './client.js';

const DEBUG = false;

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DEFAULT_CONFIG = resolve(REPO_ROOT, '.claude/triage/config.json');
const KEYCHAIN_ARGS = ['find-generic-password', '-s', 'mcp', '-a', 'notion-triage', '-w'];

const USAGE = [
  'usage: node tools/notion/cli.js <command> [options]',
  '  tasks --open [--db <id>] [--config <path>]',
  '  set-priority --page <id> --value P0|P1|P2|P3',
  '  set-status --page <id> --value <status>',
  '  comment --page <id> --text <text>',
].join('\n');

const COMMANDS = {
  tasks: { required: ['open'] },
  'set-priority': { required: ['page', 'value'] },
  'set-status': { required: ['page', 'value'] },
  comment: { required: ['page', 'text'] },
};
const VALUE_FLAGS = new Set(['db', 'config', 'page', 'value', 'text']);
const BOOL_FLAGS = new Set(['open']);

export class UsageError extends Error {}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || !COMMANDS[command]) throw new UsageError(USAGE);
  const args = { command };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i].replace(/^--/, '');
    if (!rest[i].startsWith('--')) throw new UsageError(`unknown argument ${rest[i]}\n${USAGE}`);
    if (BOOL_FLAGS.has(flag)) args[flag] = true;
    else if (VALUE_FLAGS.has(flag)) {
      const value = rest[++i];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`--${flag} needs a value`);
      args[flag] = value;
    } else throw new UsageError(`unknown flag --${flag}\n${USAGE}`);
  }
  for (const req of COMMANDS[command].required) {
    if (args[req] === undefined) throw new UsageError(`${command} requires --${req}\n${USAGE}`);
  }
  return args;
}

export function resolveToken({ env = process.env, exec = execFileSync } = {}) {
  if (env.NOTION_TOKEN) return env.NOTION_TOKEN;
  let raw;
  try {
    raw = exec('security', KEYCHAIN_ARGS, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('Notion token not found: set NOTION_TOKEN or add Keychain item -s mcp -a notion-triage');
  }
  const token = String(raw ?? '').trim();
  if (!token) throw new Error('Notion token from Keychain item mcp/notion-triage is empty');
  return token;
}

export function resolveDatabaseId(args, read = (p) => readFileSync(p, 'utf8')) {
  if (args.db) return args.db;
  const path = args.config ?? DEFAULT_CONFIG;
  const id = JSON.parse(read(path))?.notion?.databaseId;
  if (!id) throw new Error(`no notion.databaseId in ${path}; pass --db <id>`);
  return id;
}

async function run(args) {
  const databaseId = args.command === 'tasks' ? resolveDatabaseId(args) : null;
  const client = await createNotionClient({ token: resolveToken() });
  switch (args.command) {
    case 'tasks':
      return queryOpenTasks(client, databaseId);
    case 'set-priority':
      await updatePriority(client, args.page, args.value);
      return { ok: true, page: args.page, priority: args.value };
    case 'set-status':
      await updateStatus(client, args.page, args.value);
      return { ok: true, page: args.page, status: args.value };
    case 'comment': {
      const res = await addComment(client, args.page, args.text);
      return { ok: true, page: args.page, commentId: res?.id ?? null };
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 1;
  }
  try {
    const result = await run(args);
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
