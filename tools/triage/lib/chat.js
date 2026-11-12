// Pure rules for the triage chat daemon: which Slack message events are handled (shouldHandle), approve-or-chat routing on the approvals grammar (route), the thread to session map and the persisted dedup with lastSeenTs (atomic JSON writes), the per-thread serial queue with a global limit, reply truncation, the claude -p argv (message on stdin, never argv) and its JSON result.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { commandOf, compareTs } from './approvals.js';
import { readJsonFile } from './cli-io.js';

export const MAX_REPLY = 39000;
export const DEDUP_LIMIT = 500;
const HANDLED_SUBTYPES = new Set(['file_share', 'thread_broadcast']);
const TS = /^\d+\.\d+$/;

export const CHAT_DENIED_TOOLS = [
  'Bash(git push*)',
  'Bash(git log*--output*)',
  'Bash(node -e*)',
  'Bash(node -p*)',
  'Bash(node --eval*)',
  'Bash(python3*)',
  'Bash(curl*)',
  'Bash(wget*)',
  'Bash(security*)',
  'Bash(launchctl*)',
  'Bash(rm *)',
  'mcp__webflow',
  'mcp__webflow-2',
  'mcp__claude_ai_Webflow',
  'mcp__plugin_slack_slack__slack_send_message',
  'mcp__plugin_slack_slack__slack_schedule_message',
  'mcp__claude_ai_Gmail__send_message',
  'mcp__claude_ai_Gmail__reply',
  'mcp__claude_ai_Gmail__forward',
];

export const tsFromMs = (ms) => (ms / 1000).toFixed(6);
export const sessionKey = (event) => event.thread_ts || event.ts;

export function shouldHandle(event, { userId, channelId } = {}) {
  if (!event || !userId || !channelId) return false;
  if (event.type !== undefined && event.type !== 'message') return false;
  if (event.bot_id || event.channel !== channelId || event.user !== userId) return false;
  if (event.subtype !== undefined && !HANDLED_SUBTYPES.has(event.subtype)) return false;
  return typeof event.ts === 'string' && TS.test(event.ts);
}

export function route(event, digestState) {
  const digestTs = digestState?.ts;
  if (!digestTs || event.thread_ts !== digestTs || event.ts === digestTs) return 'chat';
  return commandOf(event.text) ? 'approve' : 'chat';
}

function readObject(path) {
  const value = readJsonFile(path);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function writeAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, path);
}

export class SessionMap {
  constructor(path) {
    this.path = path;
    this.threads = readObject(path) ?? {};
  }

  get(key) {
    return this.threads[key]?.sessionId ?? null;
  }

  set(key, sessionId, nowMs = Date.now()) {
    this.threads[key] = { sessionId, updatedAt: new Date(nowMs).toISOString() };
    writeAtomic(this.path, this.threads);
  }

  activeSince(ms) {
    return Object.entries(this.threads)
      .filter(([, v]) => Date.parse(v?.updatedAt) >= ms)
      .map(([key]) => key);
  }
}

export class Dedup {
  constructor(path, { limit = DEDUP_LIMIT } = {}) {
    this.path = path;
    this.limit = limit;
    const saved = readObject(path);
    this.fresh = !saved || !Array.isArray(saved.handled);
    this.handled = this.fresh ? [] : saved.handled.filter((ts) => TS.test(ts));
    this.lastSeenTs = !this.fresh && TS.test(saved.lastSeenTs ?? '') ? saved.lastSeenTs : null;
    this.set = new Set(this.handled);
  }

  has(ts) {
    return this.set.has(ts);
  }

  add(ts, { ceiling = null } = {}) {
    if (!this.set.has(ts)) {
      this.handled = [...this.handled, ts].sort(compareTs).slice(-this.limit);
      this.set = new Set(this.handled);
    }
    const below = ceiling ? this.handled.filter((h) => compareTs(h, ceiling) < 0) : this.handled;
    const newest = below.at(-1);
    if (newest && (!this.lastSeenTs || compareTs(newest, this.lastSeenTs) > 0)) this.lastSeenTs = newest;
    this.save();
  }

  setLastSeen(ts) {
    this.lastSeenTs = ts;
    this.save();
  }

  save() {
    writeAtomic(this.path, { lastSeenTs: this.lastSeenTs, handled: this.handled });
    this.fresh = false;
  }
}

export class ThreadQueue {
  constructor({ limit = 2 } = {}) {
    this.limit = limit;
    this.pending = [];
    this.active = new Set();
    this.waiters = [];
  }

  push(key, task) {
    return new Promise((resolve, reject) => {
      this.pending.push({ key, task, resolve, reject });
      this.pump();
    });
  }

  pump() {
    for (let i = 0; i < this.pending.length && this.active.size < this.limit; ) {
      const job = this.pending[i];
      if (this.active.has(job.key)) {
        i++;
        continue;
      }
      this.pending.splice(i, 1);
      this.active.add(job.key);
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          this.active.delete(job.key);
          this.pump();
        });
    }
    if (!this.pending.length && !this.active.size) for (const done of this.waiters.splice(0)) done();
  }

  idle() {
    return !this.pending.length && !this.active.size ? Promise.resolve() : new Promise((done) => this.waiters.push(done));
  }
}

export function truncate(text, logPath = 'the triage-chat log') {
  const value = String(text ?? '');
  if (value.length <= MAX_REPLY) return value;
  const pointer = `\n\n(cut at 39,000 characters; the full reply is in ${logPath})`;
  return value.slice(0, MAX_REPLY - pointer.length) + pointer;
}

export function chatArgv({ sessionId = null, promptFile, dirs = [], tools = [], mcpConfig = null }) {
  if (!tools.length) throw new Error('chat allowlist lists no tools; refusing to run');
  if (!promptFile) throw new Error('chat prompt file is required');
  if (!dirs.length || dirs.some((d) => !d)) throw new Error('every --add-dir dir is required');
  return [
    '-p',
    '--output-format',
    'json',
    ...(sessionId ? ['--resume', sessionId] : []),
    '--setting-sources',
    '',
    '--permission-mode',
    'default',
    '--append-system-prompt-file',
    promptFile,
    ...dirs.flatMap((d) => ['--add-dir', d]),
    ...(mcpConfig ? ['--mcp-config', mcpConfig] : []),
    '--disallowedTools',
    ...CHAT_DENIED_TOOLS,
    '--allowedTools',
    ...tools,
  ];
}

export function parseResult(stdout) {
  const line = String(stdout ?? '')
    .trim()
    .split('\n')
    .reverse()
    .find((l) => l.trim().startsWith('{'));
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    throw new Error('unreadable claude output');
  }
  if (typeof data?.result !== 'string') throw new Error('claude output has no result');
  return { sessionId: data.session_id ?? null, result: data.result, isError: data.is_error === true };
}

export function readToolList(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}
