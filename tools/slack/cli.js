// Slack CLI for unattended triage runs: post a file's text (optionally in a thread) or add a reaction, only in the digest channel read from the real control config (TRIAGE_TEST_CONFIG in tests), printing {"ts"} as JSON; exit 2 on usage errors, a refused channel or a build job, 1 on a Slack or token error, and never prints a token.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { api, resolveBotToken } from './client.js';
import { controlConfig } from '../triage/cli.js';
import { UsageError, refuseInBuildJob } from '../triage/lib/cli-io.js';

const USAGE = `usage: node tools/slack/cli.js <command> [options]
  post --file <path> [--thread <ts>] [--channel <id>]   prints {"ts": "..."}
  react --ts <ts> --name <emoji>
the channel is always slack.digest.channelId from .claude/triage/config.json; any other --channel exits 2
`;

const OPTIONS = { file: { type: 'string' }, thread: { type: 'string' }, channel: { type: 'string' }, ts: { type: 'string' }, name: { type: 'string' } };
const TS = /^\d+(\.\d+)?$/;

class Refused extends Error {}

const redact = (text) => String(text).replace(/xox[a-z]-[A-Za-z0-9-]+|xapp-[A-Za-z0-9-]+/g, '[token]');

function digestChannel(requested) {
  const channel = controlConfig().slack?.digest?.channelId;
  if (!channel) throw new Refused('no slack.digest.channelId in .claude/triage/config.json');
  if (requested !== undefined && requested !== channel) throw new Refused(`channel not allowed: ${requested}; only the digest channel`);
  return channel;
}

function postParams(args) {
  if (!args.file) throw new UsageError('post needs --file');
  if (args.thread !== undefined && !TS.test(args.thread)) throw new UsageError('--thread must be a Slack ts');
  const channel = digestChannel(args.channel);
  let text;
  try {
    text = readFileSync(resolve(args.file), 'utf8');
  } catch (err) {
    throw new UsageError(`--file cannot be read: ${err.code ?? err.message}`);
  }
  if (!text.trim()) throw new UsageError('--file is empty');
  return { channel, text, thread_ts: args.thread };
}

async function runPost(args) {
  const params = postParams(args);
  const res = await api('chat.postMessage', params, { token: resolveBotToken() });
  process.stdout.write(`${JSON.stringify({ ts: res.ts })}\n`);
  return 0;
}

async function runReact(args) {
  if (!args.ts || !TS.test(args.ts) || !args.name) throw new UsageError('react needs --ts <ts> and --name <emoji>');
  const channel = digestChannel(args.channel);
  await api('reactions.add', { channel, timestamp: args.ts, name: args.name }, { token: resolveBotToken() });
  return 0;
}

function parseCli(argv) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: true });
  } catch (err) {
    throw new UsageError(err.message);
  }
}

const COMMANDS = { post: runPost, react: runReact };

export async function main(argv) {
  try {
    const { values, positionals } = parseCli(argv);
    const command = COMMANDS[positionals[0]];
    if (!command) throw new UsageError(positionals[0] ? `unknown command: ${positionals[0]}` : 'no command');
    if (refuseInBuildJob('slack')) return 2;
    return await command(values);
  } catch (err) {
    if (err instanceof UsageError) process.stderr.write(`${redact(err.message)}\n${USAGE}`);
    else process.stderr.write(`${err instanceof Refused ? 'REFUSED' : 'ERROR'} ${redact(err.message)}\n`);
    return err instanceof UsageError || err instanceof Refused ? 2 : 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
