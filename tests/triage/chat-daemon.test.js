// Guards the triage chat daemon with a fake socket, Slack and spawn: acks, the 👀 and ⏸ reactions, thread replies and resume, the claude argv and stdin, retry dedup, first-start lastSeenTs, reconnect with backoff then catch-up, triage.off, failures and timeouts, the approve route and the concurrency limit.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDaemon, spawnProcess, killChildren } from '../../tools/triage/chat-daemon.js';
import { tsFromMs } from '../../tools/triage/lib/chat.js';

const dirs = [];
const daemons = [];
after(() => {
  for (const d of daemons) d.stop();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const NOW = Date.parse('2026-11-11T10:00:00Z');
const NOW_TS = tsFromMs(NOW);
const USER = 'UWILL';
const CHANNEL = 'CDIGEST';
const DIGEST_TS = '1794380000.000100';
const ts = (n) => `17943913${String(n).padStart(2, '0')}.000100`;
const msg = (extra = {}) => ({ type: 'message', channel: CHANNEL, user: USER, ts: ts(1), text: 'what is on today?', ...extra });

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.listeners = {};
    this.closed = false;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
  emit(type, ev = {}) {
    for (const fn of this.listeners[type] ?? []) fn(ev);
  }
  send(text) {
    this.sent.push(JSON.parse(text));
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.emit('close', {});
  }
  deliver(obj) {
    this.emit('message', { data: JSON.stringify(obj) });
  }
  hello() {
    this.deliver({ type: 'hello' });
  }
  event(event, extra = {}) {
    const id = `env-${Math.random().toString(36).slice(2)}`;
    this.deliver({ envelope_id: id, type: 'events_api', payload: { event }, ...extra });
    return id;
  }
}

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const tick = () => new Promise((r) => setImmediate(r));

const okRun = (n) => ({ code: 0, timedOut: false, stdout: JSON.stringify({ type: 'result', is_error: false, result: `answer ${n}`, session_id: `sess-${n}` }), stderr: '' });

function harness({ off = false, chatState, sessions, digestTs = DIGEST_TS, spawn, history = [], replies = {}, openFails = 0, config = {}, tools = 'Read\nBash(node tools/triage/cli.js *)\n' } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'triage-chatd-'));
  dirs.push(repo);
  const internal = join(repo, '.claude', 'triage');
  mkdirSync(join(internal, 'chat'), { recursive: true });
  writeFileSync(join(internal, 'state.json'), JSON.stringify({ digest: digestTs ? { ts: digestTs, channelId: CHANNEL, items: [] } : null }));
  writeFileSync(join(internal, 'chat-allowed-tools.txt'), tools);
  if (off) writeFileSync(join(internal, 'triage.off'), '');
  if (chatState !== undefined) writeFileSync(join(internal, 'chat', 'state.json'), typeof chatState === 'string' ? chatState : JSON.stringify(chatState));
  if (sessions) writeFileSync(join(internal, 'chat', 'sessions.json'), JSON.stringify(sessions));
  const paths = {
    repo,
    chatState: join(internal, 'chat', 'state.json'),
    sessions: join(internal, 'chat', 'sessions.json'),
    digestState: join(internal, 'state.json'),
    killSwitch: join(internal, 'triage.off'),
    toolsFile: join(internal, 'chat-allowed-tools.txt'),
    mcpConfig: join(internal, 'chat-mcp.json'),
    promptFile: join(repo, '.claude', 'skills', 'triage', 'modes', 'chat.md'),
    dirs: ['/real/triage', '/real/specs', '/real/plans'],
    logFile: '~/Library/Logs/triage-chat.log',
  };
  const sockets = [];
  const calls = [];
  const spawns = [];
  const logs = [];
  const delays = [];
  let opens = 0;
  let posted = 0;
  const slack = {
    async bot(method, params) {
      calls.push({ method, params });
      if (method === 'chat.postMessage') return { ok: true, ts: `1794399999.${String(++posted).padStart(6, '0')}` };
      if (method === 'conversations.history') return { ok: true, messages: history };
      if (method === 'conversations.replies') return { ok: true, messages: replies[params.ts] ?? [] };
      return { ok: true };
    },
    async app(method) {
      calls.push({ method });
      opens++;
      if (opens <= openFails) throw new Error('network down');
      return { ok: true, url: `wss://fake/${opens}` };
    },
  };
  let n = 0;
  const daemon = createDaemon({
    openSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    slack,
    spawnClaude: async (command, args, opts) => {
      const call = { command, args, ...opts };
      spawns.push(call);
      n++;
      return spawn ? spawn(call, n) : okRun(n);
    },
    now: () => NOW,
    delay: async (ms) => {
      delays.push(ms);
    },
    log: (line) => logs.push(line),
    claudeBin: '/bin/claude',
    env: { PATH: '/usr/bin', SLACK_BOT_TOKEN: 'xoxb-t', SLACK_APP_TOKEN: 'xapp-t', NOTION_TOKEN: 'n', ANTHROPIC_API_KEY: 'k' },
    config: { userId: USER, channelId: CHANNEL, maxConcurrent: 2, timeoutMs: 600000, ...config },
    paths,
  });
  daemons.push(daemon);
  const of = (method) => calls.filter((c) => c.method === method).map((c) => c.params);
  const readState = () => JSON.parse(readFileSync(paths.chatState, 'utf8'));
  return { daemon, sockets, calls, spawns, logs, delays, paths, internal, of, chatState: readState, socket: () => sockets.at(-1) };
}

async function started(h) {
  await h.daemon.start();
  await tick();
  h.socket().hello();
  await h.daemon.idle();
}

test('acks each envelope, reacts 👀, runs chat and replies in the message thread, then saves the session', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  const id = h.socket().event(msg());
  await h.daemon.idle();
  assert.deepEqual(h.socket().sent, [{ envelope_id: id }]);
  assert.deepEqual(h.of('reactions.add'), [{ channel: CHANNEL, timestamp: ts(1), name: 'eyes' }]);
  assert.equal(h.spawns.length, 1);
  const [run] = h.spawns;
  assert.equal(run.command, '/bin/claude');
  assert.equal(run.cwd, h.paths.repo);
  assert.equal(run.timeoutMs, 600000);
  assert.deepEqual(h.of('chat.postMessage'), [{ channel: CHANNEL, thread_ts: ts(1), text: 'answer 1' }]);
  assert.deepEqual(JSON.parse(readFileSync(h.paths.sessions, 'utf8'))[ts(1)].sessionId, 'sess-1');
  assert.equal(h.chatState().lastSeenTs, ts(1));
  assert.deepEqual(h.chatState().handled, [ts(1)]);
});

test('the message goes on stdin only; argv has every --add-dir and the chat prompt, and no message text', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  const text = '--dangerously-skip-permissions please & tell me <things>';
  h.socket().event(msg({ text: text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') }));
  await h.daemon.idle();
  const [run] = h.spawns;
  assert.equal(run.input, text);
  assert.ok(!run.args.some((a) => a.includes('please') || a.includes('dangerously')), run.args.join(' '));
  const dirsAdded = run.args.flatMap((a, i) => (a === '--add-dir' ? [run.args[i + 1]] : []));
  assert.deepEqual(dirsAdded, ['/real/triage', '/real/specs', '/real/plans']);
  assert.equal(run.args[run.args.indexOf('--append-system-prompt-file') + 1], h.paths.promptFile);
  assert.deepEqual(run.args.slice(run.args.indexOf('--allowedTools')), ['--allowedTools', 'Read', 'Bash(node tools/triage/cli.js *)']);
  assert.deepEqual(run.args.slice(0, 3), ['-p', '--output-format', 'json']);
});

test('a follow-up in the same thread resumes that thread session; a new top-level message starts fresh', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg());
  h.socket().event(msg({ ts: ts(2), thread_ts: ts(1), text: 'and which can you build?' }));
  h.socket().event(msg({ ts: ts(3), text: 'new topic' }));
  await h.daemon.idle();
  const resumeOf = (run) => (run.args.includes('--resume') ? run.args[run.args.indexOf('--resume') + 1] : null);
  const byInput = Object.fromEntries(h.spawns.map((r) => [r.input, resumeOf(r)]));
  assert.deepEqual(byInput, { 'what is on today?': null, 'and which can you build?': 'sess-1', 'new topic': null });
  assert.ok(h.logs.some((l) => /--resume sess-1/.test(l)));
  assert.deepEqual(h.of('chat.postMessage').map((p) => p.thread_ts).sort(), [ts(1), ts(1), ts(3)].sort());
});

test('Socket Mode retries and repeats are handled once, also after a restart', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg());
  h.socket().event(msg(), { retry_attempt: 1, retry_reason: 'timeout' });
  await h.daemon.idle();
  h.socket().event(msg(), { retry_attempt: 2 });
  await h.daemon.idle();
  assert.equal(h.spawns.length, 1);
  assert.equal(h.socket().sent.length, 3, 'every envelope is still acked');
  h.daemon.stop();
  const again = harness({ chatState: h.chatState() });
  await started(again);
  again.socket().event(msg());
  await again.daemon.idle();
  assert.equal(again.spawns.length, 0);
});

for (const [label, chatState] of [['missing', undefined], ['corrupt', '{oops']]) {
  test(`a ${label} chat state sets lastSeenTs to now with no backfill`, async () => {
    const h = harness({ chatState, history: [msg({ ts: '1794391000.000100' })] });
    await started(h);
    assert.equal(h.chatState().lastSeenTs, NOW_TS);
    assert.ok(h.logs.some((l) => /no backfill/.test(l)));
    assert.deepEqual(h.of('conversations.history'), [{ channel: CHANNEL, oldest: NOW_TS, limit: 100 }]);
    assert.equal(h.spawns.length, 0);
  });
}

test('ignored events are acked and nothing else happens', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  const events = [
    msg({ bot_id: 'B1' }),
    msg({ user: 'UOTHER' }),
    msg({ channel: 'COTHER' }),
    msg({ subtype: 'message_changed', message: msg() }),
    msg({ subtype: 'message_deleted' }),
    msg({ subtype: 'channel_join' }),
    msg({ subtype: 'channel_topic' }),
  ];
  for (const e of events) h.socket().event(e);
  await h.daemon.idle();
  assert.equal(h.socket().sent.length, events.length);
  assert.deepEqual(h.calls.filter((c) => c.method !== 'apps.connections.open' && !c.method.startsWith('conversations.')), []);
  assert.equal(h.spawns.length, 0);
});

test('file_share and thread_broadcast are handled; file names go on stdin', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg({ subtype: 'file_share', text: 'look', files: [{ name: 'shot.png' }] }));
  h.socket().event(msg({ ts: ts(2), subtype: 'thread_broadcast', thread_ts: ts(1), text: 'also' }));
  await h.daemon.idle();
  assert.equal(h.spawns.length, 2);
  assert.match(h.spawns.find((r) => r.input.startsWith('look')).input, /shot\.png/);
});

test('triage.off: ⏸ reaction, no run, no reply, lastSeenTs still advances, the daemon stays up', async () => {
  const h = harness({ off: true, chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg());
  await h.daemon.idle();
  assert.deepEqual(h.of('reactions.add'), [{ channel: CHANNEL, timestamp: ts(1), name: 'double_vertical_bar' }]);
  assert.equal(h.spawns.length, 0);
  assert.deepEqual(h.of('chat.postMessage'), []);
  assert.equal(h.chatState().lastSeenTs, ts(1));
  assert.ok(h.logs.some((l) => /triage\.off/.test(l)));
  rmSync(h.paths.killSwitch);
  h.socket().event(msg({ ts: ts(2) }));
  await h.daemon.idle();
  assert.equal(h.spawns.length, 1);
});

test('slack.chat.enabled false skips like triage.off', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, config: { enabled: false } });
  await started(h);
  h.socket().event(msg());
  await h.daemon.idle();
  assert.equal(h.spawns.length, 0);
  assert.equal(h.of('reactions.add')[0].name, 'double_vertical_bar');
});

test('a timeout or failure posts one failed line, logs the detail, advances lastSeenTs and keeps going', async () => {
  const h = harness({
    chatState: { lastSeenTs: NOW_TS, handled: [] },
    spawn: (call, n) => {
      if (n === 1) return { code: null, timedOut: true, stdout: '', stderr: '' };
      if (n === 2) return { code: 1, timedOut: false, stdout: '', stderr: 'boom detail' };
      if (n === 3) throw new Error('spawn ENOENT');
      if (n === 4) return { code: 0, timedOut: false, stdout: 'garbage', stderr: '' };
      return okRun(n);
    },
  });
  await started(h);
  for (let i = 1; i <= 5; i++) h.socket().event(msg({ ts: ts(i), text: `m${i}` }));
  await h.daemon.idle();
  const texts = Object.fromEntries(h.of('chat.postMessage').map((p) => [p.thread_ts, p.text]));
  assert.equal(texts[ts(1)], 'failed: timed out after 10 min');
  assert.equal(texts[ts(2)], 'failed: claude exited 1');
  assert.equal(texts[ts(3)], 'failed: spawn ENOENT');
  assert.equal(texts[ts(4)], 'failed: unreadable claude output');
  assert.equal(texts[ts(5)], 'answer 5');
  for (const t of Object.values(texts)) assert.equal(t.split('\n').length, 1);
  assert.ok(h.logs.some((l) => /boom detail/.test(l)));
  assert.equal(h.chatState().lastSeenTs, ts(5));
  assert.equal(h.chatState().handled.length, 5);
});

test('an empty chat allowlist fails the run closed without spawning', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, tools: '# nothing\n' });
  await started(h);
  h.socket().event(msg());
  await h.daemon.idle();
  assert.equal(h.spawns.length, 0);
  assert.match(h.of('chat.postMessage')[0].text, /^failed: .*allowlist/);
});

test('a long reply is cut with a pointer to the log', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, spawn: () => ({ code: 0, timedOut: false, stdout: JSON.stringify({ result: 'y'.repeat(50000), session_id: 's' }), stderr: '' }) });
  await started(h);
  h.socket().event(msg());
  await h.daemon.idle();
  const [post] = h.of('chat.postMessage');
  assert.ok(post.text.length <= 39000);
  assert.match(post.text, /triage-chat\.log/);
});

test('lastSeenTs stays below a message still running in another thread, so a crash leaves it for catch-up', async () => {
  const slow = deferred();
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, spawn: (call, n) => (n === 1 ? slow.promise.then(() => okRun(1)) : okRun(n)) });
  await started(h);
  h.socket().event(msg({ ts: ts(1), text: 'slow one' }));
  h.socket().event(msg({ ts: ts(2), text: 'fast one' }));
  await tick();
  await tick();
  await tick();
  assert.equal(h.chatState().handled.includes(ts(2)), true);
  assert.equal(h.chatState().lastSeenTs, NOW_TS, 'ts(1) still running');
  slow.resolve();
  await h.daemon.idle();
  assert.equal(h.chatState().lastSeenTs, ts(2));
});

test('chat runs load chat-mcp.json with --mcp-config only when the file exists', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg({ ts: ts(1) }));
  await h.daemon.idle();
  writeFileSync(h.paths.mcpConfig, '{"mcpServers":{}}');
  h.socket().event(msg({ ts: ts(2) }));
  await h.daemon.idle();
  assert.equal(h.spawns[0].args.includes('--mcp-config'), false);
  assert.equal(h.spawns[1].args[h.spawns[1].args.indexOf('--mcp-config') + 1], h.paths.mcpConfig);
});

test('approve runs get the chat timeout plus the 5 minute lock wait', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, spawn: () => ({ code: 0, timedOut: false, stdout: '', stderr: '' }) });
  await started(h);
  h.socket().event(msg({ ts: ts(1), thread_ts: DIGEST_TS, text: 'skip 2' }));
  await h.daemon.idle();
  assert.equal(h.spawns[0].timeoutMs, 900000);
});

test('a grammar reply in the digest thread runs triage-approve.sh, posts nothing on success and a failed line on failure', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, spawn: (call, n) => (n === 1 ? { code: 0, timedOut: false, stdout: '', stderr: '' } : { code: 3, timedOut: false, stdout: '', stderr: '' }) });
  await started(h);
  h.socket().event(msg({ ts: ts(1), thread_ts: DIGEST_TS, text: 'skip 2' }));
  await h.daemon.idle();
  h.socket().event(msg({ ts: ts(2), thread_ts: DIGEST_TS, text: 'go 1' }));
  await h.daemon.idle();
  assert.deepEqual(h.spawns.map((r) => [r.command, ...r.args]), [['bash', 'scripts/triage-approve.sh'], ['bash', 'scripts/triage-approve.sh']]);
  assert.equal(h.spawns[0].cwd, h.paths.repo);
  assert.equal(h.spawns[0].env.TRIAGE_REPO, h.paths.repo);
  assert.deepEqual(h.of('chat.postMessage'), [{ channel: CHANNEL, thread_ts: DIGEST_TS, text: 'failed: approve exited 3' }]);
  assert.equal(h.of('reactions.add').length, 2);
});

test('chat runs get no Slack tokens or API key; approve runs keep only the bot token', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.socket().event(msg());
  h.socket().event(msg({ ts: ts(2), thread_ts: DIGEST_TS, text: 'ok changes' }));
  await h.daemon.idle();
  const chat = h.spawns.find((r) => r.command === '/bin/claude');
  const approve = h.spawns.find((r) => r.command === 'bash');
  for (const key of ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'ANTHROPIC_API_KEY']) assert.equal(chat.env[key], undefined, key);
  assert.equal(chat.env.NOTION_TOKEN, 'n');
  assert.equal(approve.env.SLACK_BOT_TOKEN, 'xoxb-t');
  assert.equal(approve.env.SLACK_APP_TOKEN, undefined);
});

test('runs in one thread are serial and at most 2 run at once across threads', async () => {
  const gates = [];
  let active = 0;
  let peak = 0;
  const h = harness({
    chatState: { lastSeenTs: NOW_TS, handled: [] },
    spawn: async (call, n) => {
      active++;
      peak = Math.max(peak, active);
      const g = deferred();
      gates.push(g);
      await g.promise;
      active--;
      return okRun(n);
    },
  });
  await started(h);
  h.socket().event(msg({ ts: ts(1), text: 'a' }));
  h.socket().event(msg({ ts: ts(2), thread_ts: ts(1), text: 'a2' }));
  h.socket().event(msg({ ts: ts(3), text: 'b' }));
  h.socket().event(msg({ ts: ts(4), text: 'c' }));
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(h.spawns.map((r) => r.input), ['a', 'b']);
  gates[0].resolve();
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(h.spawns.map((r) => r.input), ['a', 'b', 'a2']);
  gates[1].resolve();
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(h.spawns.map((r) => r.input), ['a', 'b', 'a2', 'c']);
  gates[2].resolve();
  gates[3].resolve();
  await h.daemon.idle();
  assert.equal(peak, 2);
});

test('a dropped socket reconnects with backoff, and hello runs catch-up over top level, the digest thread and recent session threads', async () => {
  const old = new Date(NOW - 8 * 86400000).toISOString();
  const recent = new Date(NOW - 86400000).toISOString();
  const recentThread = '1794300000.000100';
  const oldThread = '1793000000.000100';
  const h = harness({
    chatState: { lastSeenTs: NOW_TS, handled: [ts(9)] },
    sessions: { [recentThread]: { sessionId: 'sess-r', updatedAt: recent }, [oldThread]: { sessionId: 'sess-o', updatedAt: old } },
    openFails: 0,
    history: [
      { type: 'message', user: USER, ts: ts(5), text: 'top later' },
      { type: 'message', user: USER, ts: ts(3), text: 'top earlier' },
      { type: 'message', user: 'UOTHER', ts: ts(4), text: 'not me' },
      { type: 'message', user: USER, bot_id: 'B1', ts: ts(6), text: 'bot' },
      { type: 'message', user: USER, ts: ts(9), text: 'already handled' },
      { type: 'message', user: USER, subtype: 'thread_broadcast', thread_ts: recentThread, ts: ts(7), text: 'broadcast' },
    ],
    replies: {
      [DIGEST_TS]: [{ user: USER, ts: DIGEST_TS, text: 'digest root' }, { user: USER, thread_ts: DIGEST_TS, ts: ts(4), text: 'skip 2' }],
      [recentThread]: [{ user: USER, thread_ts: recentThread, ts: '1794390000.000100', text: 'before lastSeen' }, { user: USER, subtype: 'thread_broadcast', thread_ts: recentThread, ts: ts(7), text: 'broadcast' }],
    },
  });
  await h.daemon.start();
  await tick();
  h.socket().close();
  await tick();
  await tick();
  assert.deepEqual(h.delays, [1000]);
  assert.equal(h.sockets.length, 2);
  h.socket().hello();
  await h.daemon.idle();
  const repliesAsked = h.of('conversations.replies').map((p) => p.ts).sort();
  assert.deepEqual(repliesAsked, [recentThread, DIGEST_TS].sort());
  assert.ok(h.of('conversations.replies').every((p) => p.oldest === NOW_TS && p.channel === CHANNEL));
  assert.deepEqual(h.spawns.map((r) => r.input ?? r.args.join(' ')), ['top earlier', 'scripts/triage-approve.sh', 'top later', 'broadcast']);
  assert.ok(h.logs.some((l) => /connected/.test(l)));
  assert.ok(h.logs.some((l) => /catch-up: 4/.test(l)));
});

test('catch-up handles at most 20 messages, the newest, in ts order', async () => {
  const history = Array.from({ length: 25 }, (_, i) => ({ user: USER, ts: ts(i + 10), text: `m${i + 10}` }));
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, history, config: { maxConcurrent: 1 } });
  await started(h);
  assert.equal(h.spawns.length, 20);
  assert.deepEqual(h.spawns.map((r) => r.input), history.slice(5).map((m) => m.text));
});

test('a disconnect envelope closes the socket and reconnects; failed opens back off 1 s doubling to 60 s', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] }, openFails: 8 });
  await h.daemon.start();
  for (let i = 0; i < 30 && h.sockets.length === 0; i++) await tick();
  assert.deepEqual(h.delays, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  h.socket().hello();
  await h.daemon.idle();
  h.socket().deliver({ type: 'disconnect', reason: 'refresh_requested', envelope_id: 'd1' });
  for (let i = 0; i < 5; i++) await tick();
  assert.equal(h.sockets[0].closed, true);
  assert.equal(h.sockets.length, 2);
  assert.equal(h.delays.at(-1), 1000, 'backoff resets after hello');
});

test('stop closes the socket and does not reconnect', async () => {
  const h = harness({ chatState: { lastSeenTs: NOW_TS, handled: [] } });
  await started(h);
  h.daemon.stop();
  await tick();
  assert.equal(h.sockets.length, 1);
  assert.equal(h.sockets[0].closed, true);
  assert.equal(existsSync(h.paths.chatState), true);
});

test('killChildren stops every running child process group, so a daemon SIGTERM leaves no orphans', async () => {
  const started = Date.now();
  const run = spawnProcess('bash', ['-c', 'sleep 30 & wait'], { input: '', cwd: tmpdir(), env: process.env, timeoutMs: 60000 });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(killChildren('SIGTERM'), 1);
  const res = await run;
  assert.ok(Date.now() - started < 10000, 'child exited promptly');
  assert.equal(res.timedOut, false);
  assert.equal(killChildren('SIGTERM'), 0, 'finished children are forgotten');
});
