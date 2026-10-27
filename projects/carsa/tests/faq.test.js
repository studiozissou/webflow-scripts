// Unit tests for Carsa faq.js: runs the real file in a vm sandbox with a stub question element and recorded timers, checking the marker gate, the /faq gate and the deep-link click.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadHelpers } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'faq.js'), 'utf8');

function makeEnv({ path = '/faq', marker = true, search = '?question_contain=how-does-finance-work', helpers = true, ids = null } = {}) {
  const timers = [];
  const clicks = [];
  const warns = [];
  const byId = ids || { 'how-does-finance-work': { click: () => clicks.push('how-does-finance-work') } };
  const document = {
    readyState: 'complete',
    addEventListener() {},
    getElementById: (id) => byId[id] || null,
    querySelector: (s) => {
      if (/^#\d/.test(s)) throw new SyntaxError(`'${s}' is not a valid selector`);
      const id = s.slice(1).split(/[ .]/)[0];
      return byId[id] || null;
    },
  };
  const location = { pathname: path, search };
  const window = { location, addEventListener() {}, setTimeout: (fn, ms) => timers.push({ fn, ms }), DD_LOGS: { logger: { warn: (m) => warns.push(m) } } };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  const jQuery = (arg) => (typeof arg === 'function' ? arg() : {});
  window.jQuery = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
    URLSearchParams,
    console,
  });
  if (helpers) loadHelpers(context);
  vm.runInContext(SOURCE, context);
  return { window, timers, clicks, warns };
}

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const env = makeEnv({ marker: false });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.timers.length, 0);
});

test('marker gate: with the marker the module records itself once', () => {
  assert.deepEqual([...makeEnv().window.__CARSA_RAN], ['faq.js']);
});

test('open FAQ: ?question_contain clicks the matching question after 1 s', () => {
  const env = makeEnv();
  assert.equal(env.timers.length, 1);
  assert.equal(env.timers[0].ms, 1000);
  env.timers[0].fn();
  assert.deepEqual(env.clicks, ['how-does-finance-work']);
});

test('open FAQ: no query parameter, no timer', () => {
  assert.equal(makeEnv({ search: '' }).timers.length, 0);
});

test('open FAQ: an unknown slug does not throw', () => {
  const env = makeEnv({ search: '?question_contain=nope' });
  env.timers[0].fn();
  assert.equal(env.clicks.length, 0);
});

test('open FAQ: slugs that are not valid CSS ids neither throw nor click the wrong node', () => {
  for (const slug of ['1-deposit', 'a.b c']) {
    const clicks = [];
    const ids = { [slug]: { click: () => clicks.push(slug) }, a: { click: () => clicks.push('a') }, 1: { click: () => clicks.push('1') } };
    const env = makeEnv({ search: '?question_contain=' + encodeURIComponent(slug), ids });
    assert.doesNotThrow(() => env.timers[0].fn(), slug);
    assert.deepEqual(clicks, [slug], slug);
  }
});

test('guard: without window.__CARSA the module warns to Datadog and stops', () => {
  const env = makeEnv({ helpers: false });
  assert.deepEqual(env.warns, ['faq.js: window.__CARSA missing']);
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.timers.length, 0);
});

test('gates: a marked page other than /faq gets nothing', () => {
  for (const p of ['/car-finance', '/faq/x', '/']) {
    const env = makeEnv({ path: p });
    assert.deepEqual([...env.window.__CARSA_RAN], ['faq.js']);
    assert.equal(env.timers.length, 0, p);
  }
  assert.equal(makeEnv({ path: '/faq/' }).timers.length, 1);
});

test('source: the __CARSA guard then the marker gate open the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}var H = window\.__CARSA;\n {2}if \(!H\) \{\n {4}if \(window\.DD_LOGS\) window\.DD_LOGS\.logger\.warn\('faq\.js: window\.__CARSA missing'\);\n {4}return;\n {2}\}\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('faq\.js'\);/m);
});

test('source: the /faq view-all mover is not carried over', () => {
  assert.ok(!SOURCE.includes('#view-all'));
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  (SOURCE.match(/.{0,9}console\.log/g) || []).forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: DOMContentLoaded and load are left to H.onReady / H.onLoad', () => {
  assert.equal((SOURCE.match(/DOMContentLoaded/g) || []).length, 0);
  assert.equal((SOURCE.match(/addEventListener\('load'/g) || []).length, 0);
  assert.ok(!/\.on\(['"]load/.test(SOURCE));
});

test('source: no local copies of the shared helpers', () => {
  for (const name of ['block', 'onReady', 'onLoad', 'onPage', 'getAttributionParams', 'addParams']) {
    assert.ok(!new RegExp('function ' + name + '\\b').test(SOURCE), name);
  }
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
