// Unit tests for Carsa equal-height.js: runs the real file in a vm sandbox with stub cards, a minimal jQuery and a recording MutationObserver, checking the marker gate and which variant each page gets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'equal-height.js'), 'utf8');
const CARDS = '[data-card-height="equal"]';

function card(h) {
  return { offsetHeight: h, style: {} };
}

function wrap(els) {
  const w = {
    css(k, v) { els.forEach((e) => { e.style[k] = v; e.jq = true; }); return w; },
    each(fn) { els.forEach((e, i) => fn.call(e, i, e)); return w; },
    outerHeight: () => els[0].offsetHeight,
    height(h) { els.forEach((e) => { e.style.height = h + 'px'; e.jq = true; }); return w; },
  };
  return w;
}

function makeEnv({ path = '/', marker = true, readyState = 'complete', cards = [card(100), card(240)] } = {}) {
  const winListeners = {};
  const jqWin = {};
  const observers = [];
  const document = {
    readyState,
    body: {},
    addEventListener() {},
    querySelectorAll: (s) => (s === CARDS ? cards : []),
  };
  const location = { pathname: path };
  const window = {
    location,
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    setTimeout() {},
  };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  const jQuery = (arg) => {
    if (typeof arg === 'function') return arg();
    if (arg === window) return { on: (t, fn) => t.split(' ').forEach((k) => (jqWin[k] ||= []).push(fn)) };
    if (arg === CARDS) return wrap(cards);
    return wrap([arg]);
  };
  window.jQuery = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe(target, opts) { this.target = target; this.opts = opts; }
    },
    console,
  });
  vm.runInContext(SOURCE, context);
  return { window, cards, winListeners, jqWin, observers };
}

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const env = makeEnv({ marker: false });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.observers.length, 0);
  assert.equal(env.winListeners.resize, undefined);
});

test('marker gate: with the marker the module records itself once', () => {
  assert.deepEqual([...makeEnv().window.__CARSA_RAN], ['equal-height.js']);
});

test('vanilla: home, calculator and reserve equalise on resize and on DOM changes', () => {
  for (const p of ['/', '/car-finance-calculator', '/reserve']) {
    const env = makeEnv({ path: p });
    assert.equal(env.winListeners.resize.length, 1, p);
    assert.equal(env.observers.length, 1, p);
    assert.deepEqual({ ...env.observers[0].opts }, { childList: true, subtree: true });
    assert.equal(env.jqWin.resize, undefined, p);
    env.winListeners.resize[0]();
    assert.deepEqual(env.cards.map((c) => c.style.height), ['240px', '240px']);
  }
});

test('vanilla: the MutationObserver callback re-equalises', () => {
  const env = makeEnv({ path: '/reserve' });
  env.observers[0].fn();
  assert.deepEqual(env.cards.map((c) => c.style.height), ['240px', '240px']);
});

test('jQuery: store, sell-car store and servicing templates run at once when load has passed and on resize', () => {
  for (const p of ['/stores/leeds', '/sell-car/store/leeds', '/mot-and-car-servicing/servicing-locations/leeds']) {
    const env = makeEnv({ path: p });
    assert.deepEqual(env.cards.map((c) => c.style.height), ['240px', '240px'], p);
    assert.ok(env.cards[0].jq);
    assert.equal(env.jqWin.resize.length, 1);
    assert.equal(env.observers.length, 0);
    assert.equal(env.winListeners.resize, undefined);
  }
});

test('jQuery: waits for window load while the page is still loading', () => {
  const env = makeEnv({ path: '/stores/leeds', readyState: 'interactive' });
  assert.equal(env.cards[0].style.height, undefined);
  env.winListeners.load.forEach((fn) => fn());
  assert.equal(env.cards[0].style.height, '240px');
});

test('gates: a marked page outside both lists gets nothing', () => {
  for (const p of ['/contact', '/stores', '/used-cars', '/stores/leeds/x', '/car-finance']) {
    const env = makeEnv({ path: p });
    assert.deepEqual([...env.window.__CARSA_RAN], ['equal-height.js']);
    assert.equal(env.observers.length, 0, p);
    assert.equal(env.winListeners.resize, undefined, p);
    assert.equal(env.jqWin.resize, undefined, p);
    assert.equal(env.cards[0].style.height, undefined, p);
  }
});

test('source: marker gate is the first statement in the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('equal-height\.js'\);/m);
});

test('source: load resize became onLoad plus a resize binding', () => {
  assert.ok(!SOURCE.includes("'load resize'"));
  assert.match(SOURCE, /onLoad\(setEqualHeight\);\n\s*\$\(window\)\.on\('resize', setEqualHeight\);/);
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  (SOURCE.match(/.{0,9}console\.log/g) || []).forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: DOMContentLoaded and load are bound only inside onReady / onLoad', () => {
  assert.equal((SOURCE.match(/DOMContentLoaded/g) || []).length, 1);
  assert.equal((SOURCE.match(/addEventListener\('load'/g) || []).length, 1);
  assert.ok(!/\.on\(['"]load/.test(SOURCE));
});

test('source: exactly one comment, on line 1', () => {
  const lines = SOURCE.split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  assert.ok(!SOURCE.includes('/*'));
  lines.slice(1).forEach((line, i) => {
    assert.ok(!/^\s*\/\//.test(line), `comment line at ${i + 2}`);
    assert.ok(!/(^|[^:])\/\/\s/.test(line), `trailing comment at ${i + 2}`);
  });
});
