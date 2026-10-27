// Unit tests for Carsa car-redirect.js: runs the real file in a vm sandbox with a stub location and checks the VRM redirect and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'car-redirect.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');
const makeEnv = (opts) => baseEnv(SOURCE, { helpers: false, jquery: false, ...opts });

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
  test(`${name} source: self-contained classic script with the marker gate first and no jQuery`, () => {
    assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
    assert.doesNotMatch(SOURCE, /^(const|let)\s/m);
    assert.equal(lines[1], '(function () {');
    assert.equal(lines[2].trim(), 'if (!window.__CARSA_PAGE) return;');
    assert.equal(lines[3].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${name}');`);
    assert.equal(lines[lines.length - 1], '})();');
    assert.doesNotMatch(lines.slice(1).join('\n'), /jQuery|\$\(/);
  });
  test(`${name} source: own block, no window.__CARSA, no onReady/onLoad`, () => {
    assert.match(SOURCE, /function block\(fn\)/);
    assert.doesNotMatch(SOURCE, /window\.__CARSA\b(?!_)/);
    assert.doesNotMatch(SOURCE, /function\s+(onReady|onLoad)\b/);
  });
}

function markerTests(name, opts = {}) {
  test(`${name}: without the marker nothing runs and __CARSA_RAN stays undefined`, () => {
    const env = makeEnv({ ...opts, marker: null });
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.location.replacedWith, undefined);
  });
  test(`${name}: with the marker it pushes its name once`, () => {
    const env = makeEnv(opts);
    assert.deepEqual([...env.window.__CARSA_RAN], [name]);
  });
  test(`${name}: runs with neither helpers.js nor jQuery loaded`, () => {
    const env = makeEnv(opts);
    assert.equal(env.window.__CARSA, undefined);
    assert.equal(env.window.jQuery, undefined);
    assert.ok(env.location.replacedWith);
  });
}

sourceChecks(MODULE);
markerTests(MODULE, { pathname: '/car-redirect', search: '?vrm=BL73DMU' });

test('car-redirect: ?vrm= replaces the location with the lower-cased VDP', () => {
  const env = makeEnv({ pathname: '/car-redirect', search: '?vrm=BL73DMU' });
  assert.equal(env.location.replacedWith, 'https://www.carsa.co.uk/vehicles/used/bl73dmu');
});

test('car-redirect: fires synchronously while the document is still loading', () => {
  const env = makeEnv({ pathname: '/car-redirect', search: '?vrm=AB12CDE', readyState: 'loading' });
  assert.equal(env.location.replacedWith, 'https://www.carsa.co.uk/vehicles/used/ab12cde');
  assert.equal(Object.keys(env.docListeners).length, 0);
});

test('car-redirect: no vrm, no redirect', () => {
  const env = makeEnv({ pathname: '/car-redirect', search: '' });
  assert.equal(env.location.replacedWith, undefined);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
});

test('car-redirect: the redirect is the first block after the marker gate', () => {
  const body = SOURCE.split('\n').slice(4).join('\n');
  assert.ok(body.indexOf('location.replace') > -1);
  assert.ok(body.indexOf('location.replace') < body.indexOf('function block'));
});

test('car-redirect: spaces are stripped and the VRM is lower-cased', () => {
  const env = makeEnv({ pathname: '/car-redirect', search: '?vrm=AB12%20CDE' });
  assert.equal(env.location.replacedWith, 'https://www.carsa.co.uk/vehicles/used/ab12cde');
});

test('car-redirect: a VRM with path characters leaves the page alone', () => {
  ['../x', '..%2Fused-cars%3Fx', 'AB12CDE%3Fx%3D1', 'A', 'ABCDEFGHI', 'AB-12'].forEach((v) => {
    const env = makeEnv({ pathname: '/car-redirect', search: '?vrm=' + (v.includes('%') ? v : encodeURIComponent(v)) });
    assert.equal(env.location.replacedWith, undefined, v);
    assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
    assert.equal(env.timers.length, 0);
  });
});
