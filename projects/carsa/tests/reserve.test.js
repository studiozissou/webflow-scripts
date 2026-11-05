// Unit tests for Carsa reserve.js: runs the real file in a vm sandbox with a stub DOM and checks the /reserve VRM finder against the former inline script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'reserve.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');

function makeEl(props = {}) {
  const listeners = {};
  const classes = new Set();
  const el = {
    value: '',
    focused: 0,
    listeners,
    classes,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
    focus: () => { el.focused++; },
    ...props,
  };
  return el;
}

function makeEnv({ marker = true, input = makeEl(), error = makeEl(), readyState = 'complete', gtag = true } = {}) {
  const docListeners = {};
  const timers = [];
  const opened = [];
  const events = [];
  const byId = { 'crw-vrm-input': input, 'crw-vrm-error': error };
  const document = {
    readyState,
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    getElementById: (id) => byId[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const window = {
    document,
    setTimeout: (fn) => timers.push(fn),
    open: (...a) => { opened.push(a); return null; },
    addEventListener() {},
  };
  if (gtag) window.gtag = (...a) => events.push(a);
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  window.jQuery = function () {};
  const context = vm.createContext({ window, document, setTimeout: window.setTimeout, console });
  vm.runInContext(SOURCE, context);
  const fire = (type) => (docListeners[type] || []).forEach((fn) => fn({}));
  const type = (value) => { input.value = value; (input.listeners.input || []).forEach((fn) => fn({})); };
  const key = (k) => (input.listeners.keydown || []).forEach((fn) => fn({ key: k }));
  return { window, input, error, timers, opened, events, fire, type, key, docListeners };
}

const lines = SOURCE.trimEnd().split('\n');

test('reserve.js source: one header comment, no other comments, no console.log', () => {
  assert.match(lines[0], /^\/\/ \S/);
  lines.slice(1).forEach((l, i) => {
    assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
    assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
    assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
  });
  assert.ok(!SOURCE.includes('console.log'));
});

test('reserve.js source: classic script with the marker gate first', () => {
  assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
  assert.equal(lines[1], '(function ($) {');
  assert.equal(lines[2].trim(), 'if (!window.__CARSA_PAGE) return;');
  assert.equal(lines[3].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${MODULE}');`);
  assert.equal(lines[lines.length - 1], '})(window.jQuery);');
});

test('reserve: without the marker nothing runs and crsaFindCar stays undefined', () => {
  const env = makeEnv({ marker: false });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.window.crsaFindCar, undefined);
  assert.equal(env.input.listeners.input, undefined);
});

test('reserve: with the marker it pushes its name once and exposes window.crsaFindCar', () => {
  const env = makeEnv();
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.equal(typeof env.window.crsaFindCar, 'function');
});

test('reserve: typing upper-cases, strips non-alphanumerics and clears the error', () => {
  const env = makeEnv();
  env.error.classList.add('crw-show');
  env.type('ab12 c-de');
  assert.equal(env.input.value, 'AB12CDE');
  assert.equal(env.error.classList.contains('crw-show'), false);
});

test('reserve: under two characters shows the error, focuses the field and opens nothing', () => {
  const env = makeEnv();
  for (const v of ['', 'A']) {
    env.input.value = v;
    env.window.crsaFindCar();
  }
  assert.equal(env.error.classList.contains('crw-show'), true);
  assert.equal(env.input.focused, 2);
  assert.equal(env.opened.length, 0);
  assert.equal(env.events.length, 0);
});

test('reserve: the button handler opens the lower-case VDP once in a new tab with noopener', () => {
  const env = makeEnv();
  env.type('ab12cde');
  env.window.crsaFindCar();
  assert.deepEqual(env.opened, [['https://www.carsa.co.uk/vehicles/used/ab12cde', '_blank', 'noopener']]);
});

test('reserve: Enter opens the VDP once; other keys do nothing', () => {
  const env = makeEnv();
  env.type('ab12cde');
  env.key('a');
  assert.equal(env.opened.length, 0);
  env.key('Enter');
  assert.equal(env.opened.length, 1);
  assert.equal(env.opened[0][0], 'https://www.carsa.co.uk/vehicles/used/ab12cde');
});

test('reserve: sends the unchanged find_car gtag event before opening', () => {
  const env = makeEnv();
  env.type('ab12cde');
  env.window.crsaFindCar();
  assert.equal(env.events.length, 1);
  const [kind, name, params] = env.events[0];
  assert.equal(kind, 'event');
  assert.equal(name, 'find_car');
  assert.deepEqual({ ...params }, { event_category: 'reservation_widget', event_label: 'AB12CDE', vrm: 'AB12CDE' });
});

test('reserve: no gtag on the page still opens the VDP', () => {
  const env = makeEnv({ gtag: false });
  env.type('ab12cde');
  env.window.crsaFindCar();
  assert.equal(env.opened.length, 1);
});

test('reserve: missing input and error elements do not throw, and crsaFindCar is a safe no-op', () => {
  const env = makeEnv({ input: null, error: null });
  assert.equal(env.timers.length, 0);
  assert.doesNotThrow(() => env.window.crsaFindCar && env.window.crsaFindCar());
  assert.equal(env.opened.length, 0);
});

test('reserve: waits for DOMContentLoaded while the document is still loading', () => {
  const env = makeEnv({ readyState: 'loading' });
  assert.equal(env.input.listeners.input, undefined);
  env.fire('DOMContentLoaded');
  env.type('x y');
  assert.equal(env.input.value, 'XY');
});

test('reserve: crsaFindCar works for a button click before DOMContentLoaded', () => {
  const env = makeEnv({ readyState: 'loading' });
  assert.equal(typeof env.window.crsaFindCar, 'function');
  env.input.value = 'ab12cde';
  env.window.crsaFindCar();
  assert.equal(env.opened.length, 1);
  assert.equal(env.opened[0][0], 'https://www.carsa.co.uk/vehicles/used/ab12cde');
});
