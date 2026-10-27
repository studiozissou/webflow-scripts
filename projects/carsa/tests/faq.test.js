// Unit tests for Carsa faq.js: runs the real file in a vm sandbox with a stub question element and recorded timers, checking the marker gate, the /faq gate and the deep-link click.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'faq.js'), 'utf8');

function makeEnv({ path = '/faq', marker = true, search = '?question_contain=how-does-finance-work' } = {}) {
  const timers = [];
  const clicks = [];
  const question = { click: () => clicks.push('how-does-finance-work') };
  const document = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: (s) => (s === '#how-does-finance-work' ? question : null),
  };
  const location = { pathname: path, search };
  const window = { location, addEventListener() {}, setTimeout: (fn, ms) => timers.push({ fn, ms }) };
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
  vm.runInContext(SOURCE, context);
  return { window, timers, clicks };
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

test('gates: a marked page other than /faq gets nothing', () => {
  for (const p of ['/car-finance', '/faq/x', '/']) {
    const env = makeEnv({ path: p });
    assert.deepEqual([...env.window.__CARSA_RAN], ['faq.js']);
    assert.equal(env.timers.length, 0, p);
  }
  assert.equal(makeEnv({ path: '/faq/' }).timers.length, 1);
});

test('source: marker gate is the first statement in the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('faq\.js'\);/m);
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
