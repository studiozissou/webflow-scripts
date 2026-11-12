// Guards the triage chat rules: which Slack events are handled, approve-or-chat routing on the approvals grammar, the thread session map, the persisted dedup and lastSeenTs, the per-thread queue with its global limit, truncation, the claude argv and its JSON result.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  shouldHandle,
  route,
  sessionKey,
  SessionMap,
  Dedup,
  ThreadQueue,
  truncate,
  MAX_REPLY,
  chatArgv,
  CHAT_DENIED_TOOLS,
  parseResult,
  readToolList,
  tsFromMs,
} from '../../tools/triage/lib/chat.js';
import { COMMAND } from '../../tools/triage/lib/approvals.js';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'triage-chat-'));
  dirs.push(d);
  return d;
}

const CFG = { userId: 'UWILL', channelId: 'CDIGEST' };
const msg = (extra = {}) => ({ type: 'message', channel: 'CDIGEST', user: 'UWILL', ts: '1731300000.000100', text: 'hi', ...extra });

test('shouldHandle takes plain messages, file_share and thread_broadcast from the user in the digest channel', () => {
  assert.equal(shouldHandle(msg(), CFG), true);
  assert.equal(shouldHandle(msg({ subtype: 'file_share' }), CFG), true);
  assert.equal(shouldHandle(msg({ subtype: 'thread_broadcast', thread_ts: '1731200000.000100' }), CFG), true);
  assert.equal(shouldHandle(msg({ thread_ts: '1731200000.000100' }), CFG), true);
});

test('shouldHandle ignores bots, other users, other channels, edits, deletes, joins and any other subtype', () => {
  const ignored = [
    msg({ bot_id: 'B1' }),
    msg({ subtype: 'file_share', bot_id: 'B1' }),
    msg({ user: 'UOTHER' }),
    msg({ channel: 'COTHER' }),
    msg({ subtype: 'message_changed', message: msg() }),
    msg({ subtype: 'message_deleted' }),
    msg({ subtype: 'channel_join' }),
    msg({ subtype: 'bot_message' }),
    msg({ subtype: 'me_message' }),
    msg({ type: 'reaction_added' }),
    msg({ ts: undefined }),
    msg({ ts: 'abc' }),
    null,
  ];
  for (const e of ignored) assert.equal(shouldHandle(e, CFG), false, JSON.stringify(e));
  assert.equal(shouldHandle(msg(), {}), false, 'no config means nothing is handled');
});

test('route sends grammar replies in the digest thread to approve and everything else to chat', () => {
  const digest = { ts: '1731200000.000100' };
  const inThread = (text) => msg({ text, thread_ts: digest.ts, ts: '1731300000.000200' });
  for (const text of ['go 1 3', 'go all', 'skip 2', 'ok changes', '  OK  changes ', 'go 1 and also tell me about Carsa', 'link Q1', 'keep Q2', 'drop Q1']) {
    assert.equal(route(inThread(text), digest), 'approve', text);
  }
  for (const text of ['what is on today?', 'going home', 'keep it short please', 'drop it', 'link?']) {
    assert.equal(route(inThread(text), digest), 'chat', text);
  }
  assert.equal(route(msg({ text: 'go 1' }), digest), 'chat', 'top level is never approve');
  assert.equal(route(msg({ text: 'go 1', thread_ts: '1731100000.000100' }), digest), 'chat', 'another thread');
  assert.equal(route(inThread('go 1'), null), 'chat', 'no digest');
  assert.equal(route(msg({ text: 'go 1', ts: digest.ts }), digest), 'chat', 'the digest itself');
  assert.ok(COMMAND instanceof RegExp);
});

test('sessionKey is the thread root ts, or the message ts at top level', () => {
  assert.equal(sessionKey(msg()), '1731300000.000100');
  assert.equal(sessionKey(msg({ thread_ts: '1731200000.000100' })), '1731200000.000100');
});

test('SessionMap persists thread to session id atomically and lists threads active since a time', () => {
  const dir = tmp();
  const path = join(dir, 'chat', 'sessions.json');
  const a = new SessionMap(path);
  assert.equal(a.get('1.1'), null);
  a.set('1.1', 'sess-a', Date.parse('2026-11-01T10:00:00Z'));
  a.set('2.2', 'sess-b', Date.parse('2026-11-10T10:00:00Z'));
  const b = new SessionMap(path);
  assert.equal(b.get('1.1'), 'sess-a');
  assert.deepEqual(b.activeSince(Date.parse('2026-11-05T00:00:00Z')), ['2.2']);
  assert.deepEqual(readdirSync(join(dir, 'chat')), ['sessions.json'], 'no temp file left');
  writeFileSync(path, '{not json');
  assert.equal(new SessionMap(path).get('1.1'), null);
});

test('Dedup never moves lastSeenTs up to or past a ceiling ts that is still in flight', () => {
  const d = new Dedup(join(tmp(), 'state.json'));
  d.setLastSeen('1731300000.000000');
  d.add('1731300000.000300', { ceiling: '1731300000.000200' });
  assert.equal(d.lastSeenTs, '1731300000.000000', 'newer one finished first: stays put');
  d.add('1731300000.000100', { ceiling: '1731300000.000200' });
  assert.equal(d.lastSeenTs, '1731300000.000100', 'advances to the newest handled ts below the ceiling');
  d.add('1731300000.000200');
  assert.equal(d.lastSeenTs, '1731300000.000300', 'nothing in flight: catches up to the newest handled');
  assert.equal(d.has('1731300000.000300'), true);
});

test('Dedup starts fresh on a missing or corrupt file and persists handled ts and lastSeenTs', () => {
  const dir = tmp();
  const path = join(dir, 'chat', 'state.json');
  const a = new Dedup(path);
  assert.equal(a.fresh, true);
  assert.equal(a.lastSeenTs, null);
  a.setLastSeen('1731300000.000000');
  a.add('1731300000.000200');
  a.add('1731300000.000100');
  assert.equal(a.lastSeenTs, '1731300000.000200', 'only moves forward');
  const b = new Dedup(path);
  assert.equal(b.fresh, false);
  assert.equal(b.has('1731300000.000100'), true);
  assert.equal(b.has('1731300000.000300'), false);
  assert.equal(b.lastSeenTs, '1731300000.000200');
  writeFileSync(path, '[]');
  assert.equal(new Dedup(path).fresh, true);
  writeFileSync(path, 'nope');
  assert.equal(new Dedup(path).fresh, true);
});

test('Dedup keeps the newest 500 ts', () => {
  const path = join(tmp(), 'state.json');
  const d = new Dedup(path);
  for (let i = 0; i < 520; i++) d.add(`17313${String(i).padStart(5, '0')}.000100`);
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(saved.handled.length, 500);
  assert.equal(new Dedup(path).has('1731300000.000100'), false);
  assert.equal(new Dedup(path).has('1731300519.000100'), true);
});

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const tick = () => new Promise((r) => setImmediate(r));

test('ThreadQueue runs one task per thread at a time, in order', async () => {
  const q = new ThreadQueue({ limit: 2 });
  const order = [];
  const gates = [deferred(), deferred()];
  const p1 = q.push('t1', async () => { order.push('a:start'); await gates[0].promise; order.push('a:end'); return 'a'; });
  const p2 = q.push('t1', async () => { order.push('b:start'); await gates[1].promise; order.push('b:end'); return 'b'; });
  await tick();
  assert.deepEqual(order, ['a:start']);
  gates[0].resolve();
  assert.equal(await p1, 'a');
  await tick();
  assert.deepEqual(order, ['a:start', 'a:end', 'b:start']);
  gates[1].resolve();
  assert.equal(await p2, 'b');
  await q.idle();
});

test('ThreadQueue runs at most limit tasks across threads and queues the rest in arrival order', async () => {
  const q = new ThreadQueue({ limit: 2 });
  const running = new Set();
  let peak = 0;
  const started = [];
  const gates = {};
  const task = (name) => async () => {
    started.push(name);
    running.add(name);
    peak = Math.max(peak, running.size);
    gates[name] = deferred();
    await gates[name].promise;
    running.delete(name);
  };
  const all = ['t1', 't2', 't3', 't4'].map((k) => q.push(k, task(k)));
  await tick();
  assert.deepEqual(started, ['t1', 't2']);
  gates.t2.resolve();
  await tick();
  await tick();
  assert.deepEqual(started, ['t1', 't2', 't3']);
  gates.t1.resolve();
  await tick();
  await tick();
  gates.t3.resolve();
  await tick();
  await tick();
  gates.t4.resolve();
  await Promise.all(all);
  assert.equal(peak, 2);
  assert.deepEqual(started, ['t1', 't2', 't3', 't4']);
});

test('ThreadQueue keeps going after a task throws', async () => {
  const q = new ThreadQueue({ limit: 1 });
  await assert.rejects(q.push('t', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await q.push('t', async () => 'next'), 'next');
});

test('truncate leaves short text alone and cuts long text to the limit with a pointer', () => {
  assert.equal(truncate('short'), 'short');
  const long = 'x'.repeat(MAX_REPLY + 5000);
  const cut = truncate(long, '/logs/triage-chat.log');
  assert.equal(MAX_REPLY, 39000);
  assert.ok(cut.length <= MAX_REPLY);
  assert.match(cut, /cut at 39,000 characters.*\/logs\/triage-chat\.log/);
  assert.equal(truncate('x'.repeat(MAX_REPLY)).length, MAX_REPLY);
});

test('chatArgv puts every flag before --allowedTools, resumes when it has a session and carries no message', () => {
  const base = { promptFile: '/r/.claude/skills/triage/modes/chat.md', dirs: ['/real/triage', '/real/specs', '/real/plans'], tools: ['Read', 'Bash(node tools/triage/cli.js *)'] };
  assert.deepEqual(chatArgv(base), [
    '-p', '--output-format', 'json',
    '--setting-sources', '', '--permission-mode', 'default',
    '--append-system-prompt-file', base.promptFile,
    '--add-dir', '/real/triage', '--add-dir', '/real/specs', '--add-dir', '/real/plans',
    '--disallowedTools', ...CHAT_DENIED_TOOLS,
    '--allowedTools', 'Read', 'Bash(node tools/triage/cli.js *)',
  ]);
  const resumed = chatArgv({ ...base, sessionId: 'sess-1' });
  assert.deepEqual(resumed.slice(0, 5), ['-p', '--output-format', 'json', '--resume', 'sess-1']);
  assert.throws(() => chatArgv({ ...base, tools: [] }), /no tools/);
  assert.throws(() => chatArgv({ ...base, dirs: ['/a', ''] }), /dir/);
});

test('chatArgv loads no project or user settings and denies push, shells out, Keychain, Slack and Gmail sends and Webflow', () => {
  const argv = chatArgv({ promptFile: '/p', dirs: ['/d'], tools: ['Read'] });
  assert.equal(argv[argv.indexOf('--setting-sources') + 1], '');
  assert.equal(argv[argv.indexOf('--permission-mode') + 1], 'default');
  for (const tool of ['Bash(git push*)', 'Bash(git log*--output*)', 'Bash(node -e*)', 'Bash(python3*)', 'Bash(curl*)', 'Bash(security*)', 'Bash(launchctl*)', 'Bash(rm *)', 'mcp__webflow', 'mcp__webflow-2', 'mcp__claude_ai_Webflow', 'mcp__plugin_slack_slack__slack_send_message', 'mcp__claude_ai_Gmail__send_message']) {
    assert.ok(CHAT_DENIED_TOOLS.includes(tool), tool);
  }
  assert.ok(argv.indexOf('--disallowedTools') < argv.indexOf('--allowedTools'));
  assert.equal(argv.includes('--mcp-config'), false);
  const withMcp = chatArgv({ promptFile: '/p', dirs: ['/d'], tools: ['Read'], mcpConfig: '/r/chat-mcp.json' });
  assert.equal(withMcp[withMcp.indexOf('--mcp-config') + 1], '/r/chat-mcp.json');
  assert.ok(withMcp.indexOf('--mcp-config') < withMcp.indexOf('--disallowedTools'));
});

test('parseResult reads session_id and result, and flags an error result', () => {
  assert.deepEqual(parseResult(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Done.', session_id: 's1' })), { sessionId: 's1', result: 'Done.', isError: false });
  assert.deepEqual(parseResult('noise\n' + JSON.stringify({ type: 'result', is_error: true, result: 'max turns', session_id: 's2' })), { sessionId: 's2', result: 'max turns', isError: true });
  assert.throws(() => parseResult('not json'), /claude output/);
  assert.throws(() => parseResult(JSON.stringify({ type: 'result' })), /claude output/);
});

test('readToolList trims, skips comments and blanks, and returns [] for a missing file', () => {
  const dir = tmp();
  const path = join(dir, 'tools.txt');
  writeFileSync(path, '# c\nRead\n\n  Bash(git status)  \n');
  assert.deepEqual(readToolList(path), ['Read', 'Bash(git status)']);
  assert.deepEqual(readToolList(join(dir, 'none.txt')), []);
  assert.equal(existsSync(join(dir, 'none.txt')), false);
});

test('tsFromMs writes a Slack ts with 6 decimals', () => {
  assert.equal(tsFromMs(1731300000123), '1731300000.123000');
});
