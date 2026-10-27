// Unit tests for Carsa all-models.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the dropdown label and close handlers and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'all-models.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');
const makeEnv = (opts) => baseEnv(SOURCE, opts);

function sourceChecks(name) {
  const lines = SOURCE.trimEnd().split('\n');
  test(`${name} source: one header comment on line 1 and no other comments`, () => {
    assert.match(lines[0], /^\/\/ \S/);
    lines.slice(1).forEach((l, i) => {
      assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
      assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
      assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
    });
  });
  test(`${name} source: no {{wf tokens`, () => {
    assert.ok(!SOURCE.includes('{{wf'));
  });
  test(`${name} source: console.log only behind DEBUG &&`, () => {
    const all = SOURCE.match(/console\.log/g) || [];
    const gated = SOURCE.match(/DEBUG && console\.log/g) || [];
    assert.equal(all.length, gated.length);
    if (all.length) assert.match(SOURCE, /var DEBUG = false;/);
  });
  test(`${name} source: no DOMContentLoaded or load listeners of its own`, () => {
    assert.doesNotMatch(SOURCE, /DOMContentLoaded/);
    assert.doesNotMatch(SOURCE, /addEventListener\(['"]load['"]/);
    assert.doesNotMatch(SOURCE, /\$\(window\)\.on\(['"]load/);
  });
  test(`${name} source: classic script with the __CARSA guard, then the marker gate`, () => {
    assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
    assert.doesNotMatch(SOURCE, /^(const|let)\s/m);
    assert.equal(lines[1], '(function ($) {');
    assert.equal(lines[2].trim(), 'var H = window.__CARSA;');
    assert.equal(lines[3].trim(), 'if (!H) {');
    assert.equal(lines[4].trim(), `if (window.DD_LOGS) window.DD_LOGS.logger.warn('${name}: window.__CARSA missing');`);
    assert.equal(lines[5].trim(), 'return;');
    assert.equal(lines[6].trim(), '}');
    assert.equal(lines[7].trim(), 'if (!window.__CARSA_PAGE) return;');
    assert.equal(lines[8].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${name}');`);
    assert.equal(lines[lines.length - 1], '})(window.jQuery);');
  });
  test(`${name} source: no local copies of the shared helpers`, () => {
    assert.doesNotMatch(SOURCE, /function\s+(block|onReady|onLoad|onPage|cms|getAttributionParams|addParams)\b/);
  });
}

function markerTests(name, opts = {}) {
  test(`${name}: without the marker nothing runs and __CARSA_RAN stays undefined`, () => {
    const env = makeEnv({ ...opts, marker: null });
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.location.replacedWith, undefined);
    assert.equal(env.document.title, opts.title || '');
  });
  test(`${name}: with the marker it pushes its name once`, () => {
    const env = makeEnv(opts);
    assert.deepEqual([...env.window.__CARSA_RAN], [name]);
  });
  test(`${name}: without window.__CARSA it warns once and stands down before the marker gate`, () => {
    const warns = [];
    const DD_LOGS = { logger: { warn: (m) => warns.push(m) } };
    const env = makeEnv({ ...opts, helpers: false, config: { ...(opts.config || {}), DD_LOGS } });
    assert.deepEqual(warns, [`${name}: window.__CARSA missing`]);
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.timers.length, 0);
    assert.doesNotThrow(() => makeEnv({ ...opts, helpers: false }));
  });
}

sourceChecks(MODULE);

markerTests(MODULE, { pathname: '/used-cars/models' });

function setup() {
  const label = makeEl({ textContent: 'Any make' });
  const events = [];
  const toggle = makeEl({ id: 'toggle-1', click() { events.push('toggle'); } });
  toggle.setAttribute('aria-expanded', 'true');
  const list = makeEl();
  list.setAttribute('aria-labelledby', 'toggle-1');
  const item = makeEl({ textContent: '  Audi ', closest: (s) => (s === '.w-dropdown-list' ? list : null) });
  const body = makeEl({ dispatchEvent: (e) => events.push(e.type) });
  class MouseEvent { constructor(type) { this.type = type; } }
  const env = makeEnv({ pathname: '/used-cars/models', nodes: { '#select-text': [label] }, globals: { MouseEvent } });
  env.document.body = body;
  env.document.getElementById = (id) => (id === 'toggle-1' ? toggle : null);
  return { env, label, item, events };
}

test('all-models: pointerdown on a make sets the label to its data-text or trimmed text', () => {
  const { env, label, item } = setup();
  env.delegate('pointerdown', "[data-element='select']", item);
  assert.equal(label.textContent, 'Audi');
  item.dataset.text = 'BMW';
  env.delegate('pointerdown', "[data-element='select']", item);
  assert.equal(label.textContent, 'BMW');
});

test('all-models: pointerdown on clear resets the label to Any make', () => {
  const { env, label, item } = setup();
  env.delegate('pointerdown', "[data-element='select']", item);
  env.delegate('pointerdown', "[fs-list-element='clear']", item);
  assert.equal(label.textContent, 'Any make');
});

test('all-models: click closes the dropdown on the next tick (outside click, then the open toggle)', () => {
  const { env, item, events } = setup();
  env.delegate('click', "[data-element='select'], [fs-list-element='clear']", item);
  assert.deepEqual(events, []);
  env.timers.forEach((fn) => fn());
  assert.deepEqual(events, ['mousedown', 'mouseup', 'click', 'toggle']);
});
