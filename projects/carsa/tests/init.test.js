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

function run({ src = CDN + 'init.js', pathname = '/', search = '', deps = true, storage = {}, preloaded = [], allowLocal = false } = {}) {
  const appended = [];
  const timers = [];
  const sessionStorage = makeStorage(storage);
  const head = { appendChild: (el) => appended.push(el) };
  const document = {
    currentScript: src ? { src, hasAttribute: (name) => name === 'data-allow-local' && allowLocal } : null,
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
    sessionStorage,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
  };
  if (deps) {
    window.jQuery = function () {};
    window.gsap = {};
  }
  window.window = window;
  window.document = document;
  const context = vm.createContext({ window, document, sessionStorage, location: window.location, setTimeout: window.setTimeout, URLSearchParams });
  vm.runInContext(SOURCE, context);
  const tick = (n = 1) => {
    for (let i = 0; i < n && timers.length; i++) timers.shift().fn();
  };
  return { window, appended, timers, tick, sessionStorage };
}

const srcs = (appended) => appended.map((el) => el.src);

test('loads global.js and check-finance.js from the same versioned folder as init.js', () => {
  const { appended } = run();
  assert.deepEqual(srcs(appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
});

test('dynamic scripts keep insertion order (async false)', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.ok(appended.every((el) => el.async === false));
});

const BASE_LIST = [CDN + 'global.js', CDN + 'check-finance.js'];
const SHARED = ['animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js'].map((f) => CDN + f);

test('VDP route adds vdp.js, battery-animation.js and at-price-total.js, in that order, after the base list, with no shared modules', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.deepEqual(srcs(appended), [...BASE_LIST, CDN + 'vdp.js', CDN + 'battery-animation.js', CDN + 'at-price-total.js']);
});

test('check-finance.js loads on every route, directly after global.js', () => {
  for (const pathname of ['/', '/used-cars', '/faq', '/vehicles/used/x']) {
    const list = srcs(run({ pathname }).appended);
    assert.equal(list[0], CDN + 'global.js', pathname);
    assert.equal(list.indexOf(CDN + 'check-finance.js'), 1, pathname);
  }
});

test('every route outside /vehicles/ loads the four shared modules after the base list', () => {
  for (const pathname of ['/', '/used-cars', '/faq', '/contact', '/blog/some-post', '/stores/leeds', '/404-anything', '/vehicles']) {
    assert.deepEqual(srcs(run({ pathname }).appended).slice(0, 6), [...BASE_LIST, ...SHARED], pathname);
  }
});

test('page routes add their own module after the shared modules', () => {
  const cases = {
    '/used-cars/near/leeds': 'near.js',
    '/car-finance-calculator': 'finance-calculator.js',
    '/get-started': 'get-started.js',
    '/faq': 'faq.js',
    '/used-cars/models/ford-fiesta': 'models-template.js',
    '/used-cars/fuel/electric': 'fuel-template.js',
    '/used-cars/promotions/black-friday': 'promotions-template.js',
    '/used-cars/models': 'all-models.js',
    '/blog': 'blog.js',
    '/car-redirect': 'car-redirect.js',
  };
  for (const [pathname, file] of Object.entries(cases)) {
    assert.deepEqual(srcs(run({ pathname }).appended), [...BASE_LIST, ...SHARED, CDN + file], pathname);
  }
});

test('routes are anchored: near neighbours load the shared modules only', () => {
  for (const pathname of ['/', '/used-cars', '/used-cars/deals', '/used-cars/near', '/car-finance', '/car-finance-calculator/x', '/get-started/x', '/faq/x', '/blog/some-post', '/stores', '/stores/leeds', '/used-cars/fuel', '/used-cars/promotions', '/x/car-redirect', '/x/faq', '/sell-car/value-car']) {
    assert.deepEqual(srcs(run({ pathname }).appended), [...BASE_LIST, ...SHARED], pathname);
  }
});

test('a trailing slash still matches a page route', () => {
  assert.deepEqual(srcs(run({ pathname: '/faq/' }).appended), [...BASE_LIST, ...SHARED, CDN + 'faq.js']);
  assert.deepEqual(srcs(run({ pathname: '/used-cars/models/' }).appended), [...BASE_LIST, ...SHARED, CDN + 'all-models.js']);
});

test('exposes the base and module list for debugging', () => {
  const { window } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.equal(window.__CARSA_LOADER.base, CDN);
  assert.deepEqual([...window.__CARSA_LOADER.modules], ['global.js', 'check-finance.js', 'vdp.js', 'battery-animation.js', 'at-price-total.js']);
});

test('runs once even if the tag is pasted twice', () => {
  const { window, appended } = run({ pathname: '/vehicles/used/x' });
  const document = { currentScript: { src: CDN + 'init.js', hasAttribute: () => false }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  vm.runInContext(SOURCE, vm.createContext({ window, document, sessionStorage: window.sessionStorage, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.equal(appended.length, 5);
});

test('skips a module whose exact URL is already on the page', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde', preloaded: [CDN + 'battery-animation.js'] });
  assert.deepEqual(srcs(appended), [CDN + 'global.js', CDN + 'check-finance.js', CDN + 'vdp.js', CDN + 'at-price-total.js']);
});

test('waits for jQuery and GSAP before loading anything', () => {
  const env = run({ deps: false });
  assert.equal(env.appended.length, 0);
  env.window.jQuery = function () {};
  env.tick();
  assert.equal(env.appended.length, 0);
  env.window.gsap = {};
  env.tick();
  assert.deepEqual(srcs(env.appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
});

test('gives up waiting after about 3 seconds and loads anyway', () => {
  const env = run({ deps: false });
  const step = env.timers[0].ms;
  env.tick(Math.ceil(3000 / step) + 1);
  assert.deepEqual(srcs(env.appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
  assert.equal(env.timers.length, 0);
});

test('?carsa=local is ignored unless the tag carries data-allow-local', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=local&carsa-port=8081' });
  assert.deepEqual(srcs(appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
  assert.deepEqual(sessionStorage.data, {});
});

test('a stored local source is ignored unless the tag carries data-allow-local', () => {
  const { appended } = run({ storage: { 'carsa-source': 'local', 'carsa-port': '8083' } });
  assert.deepEqual(srcs(appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
});

test('with data-allow-local, ?carsa=local switches to the local server for the session', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=local', allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 2), ['https://localhost:8080/projects/carsa/global.js', 'https://localhost:8080/projects/carsa/check-finance.js']);
  assert.equal(sessionStorage.data['carsa-source'], 'local');
});

test('with data-allow-local, a session-stored local source survives navigation, with a custom port', () => {
  const { appended } = run({ storage: { 'carsa-source': 'local', 'carsa-port': '8083' }, allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 2), ['https://localhost:8083/projects/carsa/global.js', 'https://localhost:8083/projects/carsa/check-finance.js']);
});

test('?carsa-port only accepts a 4-5 digit port', () => {
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=8081', allowLocal: true }).appended).slice(0, 2), ['https://localhost:8081/projects/carsa/global.js', 'https://localhost:8081/projects/carsa/check-finance.js']);
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=evil.com', allowLocal: true }).appended).slice(0, 2), ['https://localhost:8080/projects/carsa/global.js', 'https://localhost:8080/projects/carsa/check-finance.js']);
});

test('?carsa=cdn clears the local switch', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=cdn', storage: { 'carsa-source': 'local', 'carsa-port': '8083' }, allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
  assert.equal(sessionStorage.data['carsa-source'], undefined);
  assert.equal(sessionStorage.data['carsa-port'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = { currentScript: { src: CDN + 'init.js', hasAttribute: () => true }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  const window = { location: { pathname: '/', search: '?carsa=local' }, setTimeout: () => {}, jQuery() {}, gsap: {} };
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
  vm.runInContext(SOURCE, vm.createContext({ window, document, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.deepEqual(srcs(appended).slice(0, 2), [CDN + 'global.js', CDN + 'check-finance.js']);
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  const { appended } = run({ src: null });
  assert.equal(appended.length, 0);
});
