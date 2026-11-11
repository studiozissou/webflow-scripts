// Socket Mode daemon for the digest channel: acks every envelope, reacts 👀 (⏸ under triage.off), routes each of Will's messages to scripts/triage-approve.sh or a chat-mode claude -p run (message on stdin, one session per thread, serial per thread, at most slack.chat.maxConcurrent at once), replies in the thread as the bot, dedups by ts in .claude/triage/chat/state.json and catches up from lastSeenTs after every hello; dependencies are injected so tests run with fakes.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldHandle, route, sessionKey, SessionMap, Dedup, ThreadQueue, truncate, chatArgv, parseResult, readToolList, tsFromMs } from './lib/chat.js';
import { compareTs } from './lib/approvals.js';
import { readJsonFile } from './lib/cli-io.js';
import { controlConfig } from './cli.js';
import { api, resolveBotToken, resolveAppToken } from '../slack/client.js';

const MAX_BACKOFF = 60000;
const CATCH_UP_LIMIT = 20;
const SESSION_DAYS = 7;
const APPROVE_LOCK_WAIT_MS = 300000;
const PAUSE = 'double_vertical_bar';

class RunFailure extends Error {}

const decode = (text) => String(text ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function messageText(event) {
  const files = (event.files ?? []).map((f) => f?.name).filter(Boolean);
  const text = decode(event.text);
  return files.length ? `${text}\n\n[attached in Slack: ${files.join(', ')}]` : text;
}

function childEnv(env, kind, repo) {
  const out = { ...env, TRIAGE_REPO: repo };
  delete out.SLACK_APP_TOKEN;
  delete out.ANTHROPIC_API_KEY;
  if (kind === 'chat') delete out.SLACK_BOT_TOKEN;
  return out;
}

export function createDaemon({ openSocket, slack, spawnClaude, now = Date.now, delay = (ms) => new Promise((r) => setTimeout(r, ms)), log, claudeBin, env = process.env, config, paths }) {
  const timeoutMs = config.timeoutMs ?? 600000;
  const approveTimeoutMs = config.approveTimeoutMs ?? timeoutMs + APPROVE_LOCK_WAIT_MS;
  const queue = new ThreadQueue({ limit: config.maxConcurrent ?? 2 });
  const inflight = new Set();
  const tracked = new Set();
  let dedup;
  let sessions;
  let socket = null;
  let backoff = 1000;
  let stopped = false;

  const track = (promise) => {
    const p = Promise.resolve(promise).catch((err) => log(`error: ${err.message}`));
    tracked.add(p);
    p.finally(() => tracked.delete(p));
    return p;
  };
  const paused = () => existsSync(paths.killSwitch) || config.enabled === false;
  const digest = () => readJsonFile(paths.digestState)?.digest ?? null;
  const react = (ts, name) => slack.bot('reactions.add', { channel: config.channelId, timestamp: ts, name }).catch((err) => log(`react ${name} ${ts} failed: ${err.message}`));
  const reply = (thread, text) => slack.bot('chat.postMessage', { channel: config.channelId, thread_ts: thread, text });

  function done(ts) {
    inflight.delete(ts);
    const ceiling = [...inflight].sort(compareTs)[0] ?? null;
    dedup.add(ts, { ceiling });
  }

  async function runChat(event, key) {
    const sessionId = sessions.get(key);
    let argv;
    try {
      argv = chatArgv({ sessionId, promptFile: paths.promptFile, dirs: paths.dirs, tools: readToolList(paths.toolsFile), mcpConfig: paths.mcpConfig && existsSync(paths.mcpConfig) ? paths.mcpConfig : null });
    } catch (err) {
      throw new RunFailure(err.message);
    }
    log(`chat ${event.ts} in thread ${key}${sessionId ? ` --resume ${sessionId}` : ''}`);
    const res = await spawnClaude(claudeBin, argv, { input: messageText(event), cwd: paths.repo, env: childEnv(env, 'chat', paths.repo), timeoutMs });
    if (res.timedOut) throw new RunFailure(`timed out after ${Math.round(timeoutMs / 60000)} min`);
    if (res.code !== 0) throw new RunFailure(`claude exited ${res.code}`, { cause: res.stderr });
    let parsed;
    try {
      parsed = parseResult(res.stdout);
    } catch (err) {
      throw new RunFailure(err.message, { cause: res.stdout.slice(-2000) });
    }
    if (parsed.sessionId) sessions.set(key, parsed.sessionId, now());
    if (parsed.isError) throw new RunFailure(parsed.result.split('\n')[0] || 'claude reported an error');
    const text = truncate(parsed.result.trim() || '(no reply)', paths.logFile);
    if (text.length < parsed.result.length) log(`full reply for ${event.ts}:\n${parsed.result}`);
    await reply(key, text);
  }

  async function runApprove(event) {
    log(`approve ${event.ts}: running scripts/triage-approve.sh`);
    const res = await spawnClaude('bash', ['scripts/triage-approve.sh'], { cwd: paths.repo, env: childEnv(env, 'approve', paths.repo), timeoutMs: approveTimeoutMs });
    if (res.timedOut) throw new RunFailure(`approve timed out after ${Math.round(approveTimeoutMs / 60000)} min`);
    if (res.code !== 0) throw new RunFailure(`approve exited ${res.code}`, { cause: res.stderr });
  }

  async function run(event, key) {
    try {
      if (paused()) {
        log(`skip ${event.ts}: paused (triage.off or slack.chat.enabled false)`);
        await react(event.ts, PAUSE);
        return;
      }
      await (route(event, digest()) === 'approve' ? runApprove(event) : runChat(event, key));
    } catch (err) {
      const reason = String(err.message).split('\n')[0];
      log(`failed ${event.ts}: ${reason}${err.cause ? `\n${err.cause}` : ''}`);
      await reply(key, `failed: ${reason}`).catch((e) => log(`failed reply for ${event.ts} not posted: ${e.message}`));
    } finally {
      done(event.ts);
    }
  }

  function handleEvent(event) {
    if (!shouldHandle(event, config)) return null;
    if (dedup.has(event.ts) || inflight.has(event.ts)) return null;
    inflight.add(event.ts);
    if (paused()) {
      log(`skip ${event.ts}: triage.off exists or slack.chat.enabled is false`);
      return track(react(event.ts, PAUSE).finally(() => done(event.ts)));
    }
    track(react(event.ts, 'eyes'));
    const key = sessionKey(event);
    return track(queue.push(key, () => run(event, key)));
  }

  async function catchUp() {
    const oldest = dedup.lastSeenTs;
    const channel = config.channelId;
    const found = [...((await slack.bot('conversations.history', { channel, oldest, limit: 100 })).messages ?? [])];
    const threads = new Set([digest()?.ts, ...sessions.activeSince(now() - SESSION_DAYS * 86400000)].filter(Boolean));
    for (const ts of threads) {
      try {
        found.push(...((await slack.bot('conversations.replies', { channel, ts, oldest, limit: 100 })).messages ?? []));
      } catch (err) {
        log(`catch-up replies ${ts} failed: ${err.message}`);
      }
    }
    const byTs = new Map();
    for (const m of found) {
      const event = { type: 'message', channel, ...m };
      if (shouldHandle(event, config) && compareTs(event.ts, oldest) > 0 && !dedup.has(event.ts) && !inflight.has(event.ts)) byTs.set(event.ts, event);
    }
    const events = [...byTs.values()].sort((a, b) => compareTs(a.ts, b.ts));
    const kept = events.slice(-CATCH_UP_LIMIT);
    log(`catch-up: ${kept.length} message(s) since ${oldest}${events.length > kept.length ? `, ${events.length - kept.length} older ones dropped` : ''}`);
    for (const event of kept) handleEvent(event);
  }

  function onEnvelope(ws, data) {
    let envelope;
    try {
      envelope = JSON.parse(String(data));
    } catch {
      log('unreadable envelope');
      return;
    }
    if (envelope.envelope_id) ws.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
    if (envelope.type === 'hello') {
      backoff = 1000;
      log('connected');
      track(catchUp());
    } else if (envelope.type === 'disconnect') {
      log(`disconnect: ${envelope.reason ?? 'no reason'}`);
      ws.close();
    } else if (envelope.type === 'events_api') {
      handleEvent(envelope.payload?.event);
    }
  }

  async function reconnect() {
    if (stopped) return;
    const wait = backoff;
    backoff = Math.min(backoff * 2, MAX_BACKOFF);
    log(`reconnecting in ${wait / 1000} s`);
    await delay(wait);
    await connect();
  }

  async function connect() {
    if (stopped) return;
    let url;
    try {
      ({ url } = await slack.app('apps.connections.open'));
    } catch (err) {
      log(`apps.connections.open failed: ${err.message}`);
      return reconnect();
    }
    if (stopped) return;
    const ws = openSocket(url);
    socket = ws;
    ws.addEventListener('message', (ev) => onEnvelope(ws, ev.data));
    ws.addEventListener('error', (ev) => log(`socket error: ${ev?.message ?? 'unknown'}`));
    ws.addEventListener('close', () => {
      if (socket !== ws) return;
      socket = null;
      log('socket closed');
      reconnect();
    });
  }

  return {
    async start() {
      dedup = new Dedup(paths.chatState);
      sessions = new SessionMap(paths.sessions);
      if (dedup.fresh || !dedup.lastSeenTs) {
        dedup.setLastSeen(tsFromMs(now()));
        log(`no chat state; lastSeenTs set to now (${dedup.lastSeenTs}), no backfill`);
      }
      connect();
    },
    stop() {
      stopped = true;
      const ws = socket;
      socket = null;
      ws?.close();
    },
    handleEvent,
    async idle() {
      while (tracked.size) await Promise.all([...tracked]);
      await queue.idle();
    },
  };
}

const children = new Set();

export function killChildren(signal = 'SIGTERM') {
  for (const pid of children) {
    try {
      process.kill(-pid, signal);
    } catch {}
  }
  return children.size;
}

export function spawnProcess(command, args, { input, cwd, env, timeoutMs }) {
  return new Promise((done) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    if (child.pid) children.add(child.pid);
    const kill = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {}
    };
    const timer = setTimeout(() => {
      timedOut = true;
      kill('SIGTERM');
      setTimeout(() => kill('SIGKILL'), 10000).unref();
    }, timeoutMs);
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', (err) => {
      children.delete(child.pid);
      clearTimeout(timer);
      done({ code: 127, timedOut, stdout, stderr: err.message });
    });
    child.on('close', (code) => {
      children.delete(child.pid);
      clearTimeout(timer);
      done({ code, timedOut, stdout, stderr });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const logLine = (line) => process.stderr.write(`${stamp()} triage-chat: ${line}\n`);

function main(env = process.env) {
  const repo = resolve(env.TRIAGE_REPO || process.cwd());
  process.chdir(repo);
  const internal = resolve(env.INTERNAL_TRIAGE || join(repo, '.claude/triage'));
  const cfg = controlConfig(env);
  const config = { userId: cfg.slack?.digest?.userId, channelId: cfg.slack?.digest?.channelId, ...(cfg.slack?.chat ?? {}) };
  const dirs = [env.TRIAGE_REAL_DIR, env.SPECS_REAL_DIR, env.PLANS_REAL_DIR];
  if (!config.userId || !config.channelId || !env.CLAUDE_BIN || dirs.some((d) => !d)) {
    logLine('FATAL: needs slack.digest.userId and channelId in config.json, CLAUDE_BIN, TRIAGE_REAL_DIR, SPECS_REAL_DIR and PLANS_REAL_DIR; start it with scripts/triage-chat.sh');
    process.exit(1);
  }
  let botToken;
  let appToken;
  try {
    botToken = resolveBotToken({ env });
    appToken = resolveAppToken({ env });
  } catch (err) {
    logLine(`FATAL: ${err.message}`);
    process.exit(1);
  }
  const daemon = createDaemon({
    openSocket: (url) => new WebSocket(url),
    slack: { bot: (method, params) => api(method, params, { token: botToken, env }), app: (method, params) => api(method, params, { token: appToken, env }) },
    spawnClaude: spawnProcess,
    log: logLine,
    claudeBin: env.CLAUDE_BIN,
    env,
    config,
    paths: {
      repo,
      chatState: join(internal, 'chat', 'state.json'),
      sessions: join(internal, 'chat', 'sessions.json'),
      digestState: join(internal, 'state.json'),
      killSwitch: join(internal, 'triage.off'),
      toolsFile: join(internal, 'chat-allowed-tools.txt'),
      mcpConfig: join(internal, 'chat-mcp.json'),
      promptFile: join(repo, '.claude/skills/triage/modes/chat.md'),
      dirs,
      logFile: '~/Library/Logs/triage-chat.log',
    },
  });
  daemon.start();
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      logLine(`${signal}: stopping`);
      daemon.stop();
      killChildren('SIGTERM');
      process.exit(0);
    });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
