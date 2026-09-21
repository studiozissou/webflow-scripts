// Runs podcast-player.js in a stub DOM to check the ?playerdebug on-page log turns on only with the flag and captures what a client needs to report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(here, '../../projects/jayshetty/podcast-player/podcast-player.js'),
  'utf8',
);

function makeEl(tag, created) {
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    children: [],
    style: {},
    attrs: {},
    listeners: {},
    textContent: '',
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    remove() {},
  };
  created.push(el);
  return el;
}

function run(search) {
  const created = [];
  const win = { listeners: {} };
  const doc = { listeners: {} };
  let clipboard = null;
  const head = makeEl('head', created);
  const body = makeEl('body', created);
  const document = {
    head,
    body,
    readyState: 'complete',
    visibilityState: 'visible',
    createElement: (tag) => makeEl(tag, created),
    getElementById: (id) => created.find((el) => el.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true,
    addEventListener(type, fn) { (doc.listeners[type] ||= []).push(fn); },
  };
  const context = {
    document,
    location: { search, href: 'https://www.jayshetty.me/podcast' + search },
    navigator: {
      userAgent: 'TestUA/1.0',
      clipboard: { writeText: async (text) => { clipboard = text; } },
    },
    innerWidth: 1280,
    innerHeight: 800,
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    addEventListener(type, fn) { (win.listeners[type] ||= []).push(fn); },
    removeEventListener() {},
  };
  context.window = context;
  vm.runInNewContext(src, context);
  return {
    context,
    win,
    body,
    panel: () => document.getElementById('js-player-debug'),
    clipboard: () => clipboard,
  };
}

function findButton(el, label) {
  if (el.tagName === 'BUTTON' && el.textContent === label) return el;
  for (const child of el.children) {
    const hit = findButton(child, label);
    if (hit) return hit;
  }
  return null;
}

test('without the flag there is no panel, no log and no global listeners', () => {
  const env = run('');
  assert.equal(env.panel(), null);
  assert.equal(env.context.__playerLog, undefined);
  assert.equal(env.win.listeners.error, undefined);
  assert.equal(env.win.listeners.message, undefined);
});

test('a lookalike query param does not turn the log on', () => {
  assert.equal(run('?playerdebugger=1').panel(), null);
});

for (const search of ['?playerdebug', '?playerdebug=1', '?utm_source=x&playerdebug']) {
  test(`${search} mounts the panel on the page`, () => {
    const env = run(search);
    const panel = env.panel();
    assert.ok(panel, 'panel element not created');
    assert.equal(panel.parentNode, env.body);
    assert.ok(findButton(panel, 'Copy log'), 'Copy log button missing');
    assert.ok(findButton(panel, 'Hide'), 'Hide button missing');
  });
}

test('the first log line identifies version, browser and viewport', () => {
  const first = run('?playerdebug').context.__playerLog[0];
  assert.match(first, /v1\.3\.0/);
  assert.match(first, /TestUA\/1\.0/);
  assert.match(first, /1280x800/);
});

test('page errors are written to the log', () => {
  const env = run('?playerdebug');
  env.win.listeners.error[0]({ message: 'boom', filename: 'x.js', lineno: 7 });
  assert.ok(env.context.__playerLog.some((l) => /error.*boom/.test(l)));
});

test('Spotify messages are logged', () => {
  const env = run('?playerdebug');
  env.win.listeners.message.forEach((fn) =>
    fn({ origin: 'https://open.spotify.com', data: { type: 'ready' }, source: {} }),
  );
  assert.ok(env.context.__playerLog.some((l) => /msg ready/.test(l)));
});

test('Copy log puts every line plus a state snapshot on the clipboard', async () => {
  const env = run('?playerdebug');
  const copy = findButton(env.panel(), 'Copy log');
  copy.listeners.click.forEach((fn) => fn({ preventDefault() {} }));
  await new Promise((r) => setTimeout(r, 0));
  const text = env.clipboard();
  assert.ok(text, 'nothing copied');
  env.context.__playerLog.forEach((line) => assert.ok(text.includes(line)));
  assert.match(text, /state/);
});
