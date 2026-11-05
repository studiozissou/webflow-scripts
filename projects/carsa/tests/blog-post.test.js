// Unit tests for Carsa blog-post.js: runs the real file in a vm sandbox with a stub DOM and checks the Relume tooltip powerup against the former inline script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'blog-post.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function makeTooltip({ pointerClass = 'tooltip1_pointer', iconRect = rect(10, 300, 20, 20), tipRect = rect(0, 0, 200, 50), setup } = {}) {
  const listeners = {};
  const tip = { className: 'tooltip1_tooltip-wrapper', style: {}, css: { paddingTop: '12px' }, getBoundingClientRect: () => tipRect };
  const pointer = { className: pointerClass, style: {}, css: { marginTop: '0px', marginRight: '6px', marginBottom: '8px', marginLeft: '4px' } };
  const parent = {
    listeners,
    addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
    querySelector: (s) => (s === '.tooltip1_tooltip-wrapper' ? tip : s === '.tooltip1_pointer' ? pointer : null),
  };
  const icon = { dataset: {}, parentElement: parent, getBoundingClientRect: () => iconRect };
  if (setup) icon.dataset.relumeTooltipSetup = setup;
  return { icon, tip, pointer, parent, listeners };
}

function makeEnv({ marker = true, icons = [], readyState = 'complete' } = {}) {
  const docListeners = {};
  const timers = [];
  const frames = [];
  const document = {
    readyState,
    documentElement: { clientWidth: 1000, clientHeight: 800 },
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    querySelector: () => null,
    querySelectorAll: (s) => (s === '.tooltip1_element-wrapper' ? icons : []),
  };
  const window = {
    document,
    setTimeout: (fn) => timers.push(fn),
    addEventListener() {},
    requestAnimationFrame: (fn) => frames.push(fn),
    getComputedStyle: (el) => ({ paddingTop: '', paddingBottom: '', paddingLeft: '', paddingRight: '', marginTop: '', marginRight: '', marginBottom: '', marginLeft: '', ...el.css }),
  };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  window.jQuery = function () {};
  const context = vm.createContext({ window, document, setTimeout: window.setTimeout, console });
  vm.runInContext(SOURCE, context);
  const fire = (type) => (docListeners[type] || []).forEach((fn) => fn({}));
  return { context, window, timers, frames, fire, docListeners };
}

const lines = SOURCE.trimEnd().split('\n');

test('blog-post.js source: one header comment, no other comments, no console.log', () => {
  assert.match(lines[0], /^\/\/ \S/);
  lines.slice(1).forEach((l, i) => {
    assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
    assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
    assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
  });
  assert.ok(!SOURCE.includes('console.log'));
});

test('blog-post.js source: classic script with the marker gate first, no implicit globals', () => {
  assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
  assert.equal(lines[1], '(function ($) {');
  assert.equal(lines[2].trim(), 'if (!window.__CARSA_PAGE) return;');
  assert.equal(lines[3].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${MODULE}');`);
  assert.equal(lines[lines.length - 1], '})(window.jQuery);');
  assert.doesNotMatch(SOURCE, /^\s*(iconWrapperClass|tooltipWrapperClass|pointerClass)\s*=/m);
});

test('blog-post: without the marker nothing runs', () => {
  const t = makeTooltip();
  const env = makeEnv({ marker: false, icons: [t.icon] });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(t.icon.dataset.relumeTooltipSetup, undefined);
  assert.equal(t.listeners.mouseenter, undefined);
});

test('blog-post: with the marker it pushes its name once and leaks no class-name globals', () => {
  const env = makeEnv();
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  for (const name of ['iconWrapperClass', 'tooltipWrapperClass', 'pointerClass']) {
    assert.equal(name in env.context, false, name);
    assert.equal(name in env.window, false, name);
  }
});

test('blog-post: marks each icon wrapper data-relume-tooltip-setup=1 and binds hover on its parent', () => {
  const a = makeTooltip();
  const b = makeTooltip();
  makeEnv({ icons: [a.icon, b.icon] });
  for (const t of [a, b]) {
    assert.equal(String(t.icon.dataset.relumeTooltipSetup), '1');
    assert.equal(t.listeners.mouseenter.length, 1);
    assert.equal(t.listeners.mouseleave.length, 1);
  }
});

test('blog-post: the guard skips an icon already set up', () => {
  const t = makeTooltip({ setup: '1' });
  makeEnv({ icons: [t.icon] });
  assert.equal(t.listeners.mouseenter, undefined);
});

test('blog-post: running twice binds hover only once per icon', () => {
  const t = makeTooltip();
  const env = makeEnv({ icons: [t.icon] });
  vm.runInContext(SOURCE, env.context);
  env.fire('DOMContentLoaded');
  assert.equal(t.listeners.mouseenter.length, 1);
});

test('blog-post: waits for DOMContentLoaded while the document is still loading', () => {
  const t = makeTooltip();
  const env = makeEnv({ icons: [t.icon], readyState: 'loading' });
  assert.equal(t.listeners.mouseenter, undefined);
  env.fire('DOMContentLoaded');
  assert.equal(t.listeners.mouseenter.length, 1);
});

test('blog-post: mouseenter on a top tooltip near the left edge shifts it on screen and counter-shifts the pointer', () => {
  const t = makeTooltip();
  const env = makeEnv({ icons: [t.icon] });
  t.listeners.mouseenter[0]();
  assert.equal(t.tip.style.transform, 'translateX(80px)');
  assert.equal(t.pointer.style.transform, 'translateX(-80px) rotate(45deg)');
  assert.equal(t.tip.style.bottom, '100%');
  assert.equal(t.tip.style.top, 'auto');
  assert.equal(t.tip.style.paddingBottom, '12px');
  assert.equal(t.tip.style.paddingTop, '0');
  assert.equal(t.pointer.style.margin, '0 auto 8px auto');
  assert.equal(t.pointer.style.inset, 'auto 0 0 0');
  assert.equal(env.frames.length, 1);
});

test('blog-post: a top tooltip with no room above flips to the bottom', () => {
  const t = makeTooltip({ iconRect: rect(400, 20, 20, 20) });
  makeEnv({ icons: [t.icon] });
  t.listeners.mouseenter[0]();
  assert.equal(t.tip.style.top, '100%');
  assert.equal(t.tip.style.bottom, 'auto');
  assert.equal(t.tip.style.transform, 'translateX(0px)');
  assert.equal(t.pointer.style.margin, '8px auto 0 auto');
  assert.equal(t.pointer.style.inset, '0 0 auto 0');
});

test('blog-post: a right pointer near the bottom edge shifts on the Y axis', () => {
  const t = makeTooltip({ pointerClass: 'tooltip1_pointer is-right', iconRect: rect(100, 780, 20, 20), tipRect: rect(0, 0, 150, 100) });
  makeEnv({ icons: [t.icon] });
  t.listeners.mouseenter[0]();
  assert.equal(t.tip.style.left, '100%');
  assert.equal(t.tip.style.right, 'auto');
  assert.equal(t.tip.style.transform, 'translateY(-40px)');
  assert.equal(t.pointer.style.margin, '0 0 0 4px');
});

test('blog-post: mouseleave stops the animation-frame loop', () => {
  const t = makeTooltip();
  const env = makeEnv({ icons: [t.icon] });
  t.listeners.mouseenter[0]();
  t.listeners.mouseleave[0]();
  const transform = t.tip.style.transform;
  t.tip.style.transform = '';
  env.frames.shift()();
  assert.equal(t.tip.style.transform, '');
  assert.equal(env.frames.length, 0);
  assert.equal(transform, 'translateX(80px)');
});
