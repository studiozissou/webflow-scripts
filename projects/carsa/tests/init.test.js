/**
 * Unit tests for the Carsa site loader.
 * Runs the real init.js inside a vm sandbox with a stub document, storage and timers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'init.js'), 'utf8');
const CDN = 'https://d123.cloudfront.net/webflow/v1.0.0/';

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function run({ src = CDN + 'init.js', pathname = '/', search = '', deps = true, storage = {}, preloaded = [] } = {}) {
  const appended = [];
  const timers = [];
  const localStorage = makeStorage(storage);
  const head = { appendChild: (el) => appended.push(el) };
  const document = {
    currentScript: src ? { src } : null,
    head,
    body: head,
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: (sel) => {
      const m = sel.match(/src="([^"]+)"/);
      return m && preloaded.includes(m[1]) ? {} : null;
    },
  };
  const window = {
    location: { pathname, search },
    localStorage,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
  };
  if (deps) {
    window.jQuery = function () {};
    window.gsap = {};
  }
  window.window = window;
  window.document = document;
  const context = vm.createContext({ window, document, localStorage, location: window.location, setTimeout: window.setTimeout, URLSearchParams });
  vm.runInContext(SOURCE, context);
  const tick = (n = 1) => {
    for (let i = 0; i < n && timers.length; i++) timers.shift().fn();
  };
  return { window, appended, timers, tick, localStorage };
}

const srcs = (appended) => appended.map((el) => el.src);

test('loads global.js from the same versioned folder as init.js', () => {
  const { appended } = run();
  assert.deepEqual(srcs(appended), [CDN + 'global.js']);
});

test('dynamic scripts keep insertion order (async false)', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.ok(appended.every((el) => el.async === false));
});

test('VDP route adds battery-animation.js and at-price-total.js after global.js', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.deepEqual(srcs(appended), [CDN + 'global.js', CDN + 'battery-animation.js', CDN + 'at-price-total.js']);
});

test('unmapped routes load global.js only', () => {
  for (const pathname of ['/', '/used-cars', '/used-cars/deals', '/faq', '/blog/some-post', '/vehicles']) {
    assert.deepEqual(srcs(run({ pathname }).appended), [CDN + 'global.js'], pathname);
  }
});

test('exposes the base and module list for debugging', () => {
  const { window } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.equal(window.__CARSA_LOADER.base, CDN);
  assert.deepEqual([...window.__CARSA_LOADER.modules], ['global.js', 'battery-animation.js', 'at-price-total.js']);
});

test('runs once even if the tag is pasted twice', () => {
  const { window, appended } = run();
  const document = { currentScript: { src: CDN + 'init.js' }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  vm.runInContext(SOURCE, vm.createContext({ window, document, localStorage: window.localStorage, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.equal(appended.length, 1);
});

test('skips a module whose exact URL is already on the page', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde', preloaded: [CDN + 'battery-animation.js'] });
  assert.deepEqual(srcs(appended), [CDN + 'global.js', CDN + 'at-price-total.js']);
});

test('waits for jQuery and GSAP before loading anything', () => {
  const env = run({ deps: false });
  assert.equal(env.appended.length, 0);
  env.window.jQuery = function () {};
  env.tick();
  assert.equal(env.appended.length, 0);
  env.window.gsap = {};
  env.tick();
  assert.deepEqual(srcs(env.appended), [CDN + 'global.js']);
});

test('gives up waiting after about 3 seconds and loads anyway', () => {
  const env = run({ deps: false });
  const step = env.timers[0].ms;
  env.tick(Math.ceil(3000 / step) + 1);
  assert.deepEqual(srcs(env.appended), [CDN + 'global.js']);
  assert.equal(env.timers.length, 0);
});

test('?carsa=local switches to the local server and persists', () => {
  const { appended, localStorage } = run({ search: '?carsa=local' });
  assert.deepEqual(srcs(appended), ['https://localhost:8080/projects/carsa/global.js']);
  assert.equal(localStorage.data['carsa-source'], 'local');
});

test('a persisted local source survives navigation, with a custom port', () => {
  const { appended } = run({ storage: { 'carsa-source': 'local', 'carsa-port': '8083' } });
  assert.deepEqual(srcs(appended), ['https://localhost:8083/projects/carsa/global.js']);
});

test('?carsa-port only accepts a 4-5 digit port', () => {
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=8081' }).appended), ['https://localhost:8081/projects/carsa/global.js']);
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=evil.com' }).appended), ['https://localhost:8080/projects/carsa/global.js']);
});

test('?carsa=cdn clears the local switch', () => {
  const { appended, localStorage } = run({ search: '?carsa=cdn', storage: { 'carsa-source': 'local', 'carsa-port': '8083' } });
  assert.deepEqual(srcs(appended), [CDN + 'global.js']);
  assert.equal(localStorage.data['carsa-source'], undefined);
  assert.equal(localStorage.data['carsa-port'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = { currentScript: { src: CDN + 'init.js' }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  const window = { location: { pathname: '/', search: '?carsa=local' }, setTimeout: () => {}, jQuery() {}, gsap: {} };
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError'); } });
  vm.runInContext(SOURCE, vm.createContext({ window, document, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.deepEqual(srcs(appended), [CDN + 'global.js']);
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  const { appended } = run({ src: null });
  assert.equal(appended.length, 0);
});
