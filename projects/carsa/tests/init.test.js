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

function run({ src = CDN + 'init.js', pathname = '/', search = '', deps = true, storage = {}, preloaded = [], allowLocal = false, ids = [] } = {}) {
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
    getElementById: (id) => (ids.includes(id) ? { id } : null),
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
const BASE_LIST = [CDN + 'helpers.js', CDN + 'global.js', CDN + 'check-finance.js'];
const SHARED = ['animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js'].map((f) => CDN + f);
const VDP = ['vdp.js', 'battery-animation.js', 'at-price-total.js'].map((f) => CDN + f);
const local = (port) => ['helpers.js', 'global.js', 'check-finance.js'].map((f) => `https://localhost:${port}/projects/carsa/${f}`);

test('loads helpers.js, global.js and check-finance.js from the same versioned folder as init.js', () => {
  const { appended } = run();
  assert.deepEqual(srcs(appended).slice(0, 3), BASE_LIST);
});

test('dynamic scripts keep insertion order (async false)', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.ok(appended.every((el) => el.async === false));
});

test('VDP route adds vdp.js, battery-animation.js and at-price-total.js, in that order, after the base list, with no shared modules', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde' });
  assert.deepEqual(srcs(appended), [...BASE_LIST, ...VDP]);
});

test('helpers.js is the first file on every route, then global.js, then check-finance.js', () => {
  for (const pathname of ['/', '/used-cars', '/faq', '/vehicles/used/x', '/used-cars/near/leeds', '/blog', '/get-started']) {
    const list = srcs(run({ pathname }).appended);
    assert.deepEqual(list.slice(0, 3), BASE_LIST, pathname);
    assert.equal(list.filter((s) => s === CDN + 'helpers.js').length, 1, pathname);
  }
});

test('every route outside /vehicles/ loads the four shared modules after the base list', () => {
  for (const pathname of ['/', '/used-cars', '/faq', '/contact', '/blog/some-post', '/stores/leeds', '/404-anything', '/vehicles']) {
    assert.deepEqual(srcs(run({ pathname }).appended).slice(0, 7), [...BASE_LIST, ...SHARED], pathname);
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
  assert.deepEqual([...window.__CARSA_LOADER.modules], ['helpers.js', 'global.js', 'check-finance.js', 'vdp.js', 'battery-animation.js', 'at-price-total.js']);
});

test('/car-redirect appends car-redirect.js at once, before the jQuery/GSAP gate resolves', () => {
  for (const pathname of ['/car-redirect', '/car-redirect/']) {
    const env = run({ pathname, deps: false });
    assert.deepEqual(srcs(env.appended), [CDN + 'car-redirect.js'], pathname);
    assert.equal(env.appended[0].async, false, pathname);
  }
});

test('/car-redirect does not append car-redirect.js again after the gate', () => {
  const env = run({ pathname: '/car-redirect', deps: false });
  env.window.jQuery = function () {};
  env.window.gsap = {};
  env.tick();
  assert.deepEqual(srcs(env.appended), [CDN + 'car-redirect.js', ...BASE_LIST, ...SHARED]);
  assert.deepEqual(srcs(run({ pathname: '/car-redirect' }).appended), [CDN + 'car-redirect.js', ...BASE_LIST, ...SHARED]);
});

test('/car-redirect: the debug module list puts car-redirect.js first, once', () => {
  const { window } = run({ pathname: '/car-redirect' });
  assert.deepEqual([...window.__CARSA_LOADER.modules], ['car-redirect.js', 'helpers.js', 'global.js', 'check-finance.js', 'animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js']);
});

test('/car-redirect: a car-redirect.js already on the page is not appended again', () => {
  const env = run({ pathname: '/car-redirect', deps: false, preloaded: [CDN + 'car-redirect.js'] });
  assert.equal(env.appended.length, 0);
});

test('car-redirect.js is only pre-gated on /car-redirect itself', () => {
  for (const pathname of ['/x/car-redirect', '/car-redirect/x', '/']) {
    assert.equal(run({ pathname, deps: false }).appended.length, 0, pathname);
  }
});

test('404 guard: a /vehicles/ 404 (#404-message present) loads the base list only, no VDP modules', () => {
  const env = run({ pathname: '/vehicles/used/zz99zzz', ids: ['404-message'] });
  assert.deepEqual(srcs(env.appended), BASE_LIST);
  assert.deepEqual([...env.window.__CARSA_LOADER.modules], ['helpers.js', 'global.js', 'check-finance.js']);
});

test('404 guard: a /vehicles/ 404 gets no shared modules either, since SHARED excludes /vehicles/', () => {
  const list = srcs(run({ pathname: '/vehicles/used/zz99zzz', ids: ['404-message'] }).appended);
  for (const f of [...VDP, ...SHARED]) assert.ok(!list.includes(f), f);
});

test('404 guard: a real VDP without #404-message still loads the VDP modules', () => {
  assert.deepEqual(srcs(run({ pathname: '/vehicles/used/ab12cde', ids: ['other'] }).appended), [...BASE_LIST, ...VDP]);
});

test('404 guard: #404-message off /vehicles/ leaves the other routes alone', () => {
  assert.deepEqual(srcs(run({ pathname: '/faq', ids: ['404-message'] }).appended), [...BASE_LIST, ...SHARED, CDN + 'faq.js']);
  assert.deepEqual(srcs(run({ pathname: '/404-anything', ids: ['404-message'] }).appended), [...BASE_LIST, ...SHARED]);
});

test('runs once even if the tag is pasted twice', () => {
  const { window, appended } = run({ pathname: '/vehicles/used/x' });
  const document = { currentScript: { src: CDN + 'init.js', hasAttribute: () => false }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  vm.runInContext(SOURCE, vm.createContext({ window, document, sessionStorage: window.sessionStorage, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.equal(appended.length, 6);
});

test('skips a module whose exact URL is already on the page', () => {
  const { appended } = run({ pathname: '/vehicles/used/ab12cde', preloaded: [CDN + 'battery-animation.js'] });
  assert.deepEqual(srcs(appended), [...BASE_LIST, CDN + 'vdp.js', CDN + 'at-price-total.js']);
});

test('waits for jQuery and GSAP before loading anything', () => {
  const env = run({ deps: false });
  assert.equal(env.appended.length, 0);
  env.window.jQuery = function () {};
  env.tick();
  assert.equal(env.appended.length, 0);
  env.window.gsap = {};
  env.tick();
  assert.deepEqual(srcs(env.appended).slice(0, 3), BASE_LIST);
});

test('gives up waiting after about 3 seconds and loads anyway', () => {
  const env = run({ deps: false });
  const step = env.timers[0].ms;
  env.tick(Math.ceil(3000 / step) + 1);
  assert.deepEqual(srcs(env.appended).slice(0, 3), BASE_LIST);
  assert.equal(env.timers.length, 0);
});

test('?carsa=local is ignored unless the tag carries data-allow-local', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=local&carsa-port=8081' });
  assert.deepEqual(srcs(appended).slice(0, 3), BASE_LIST);
  assert.deepEqual(sessionStorage.data, {});
});

test('a stored local source is ignored unless the tag carries data-allow-local', () => {
  const { appended } = run({ storage: { 'carsa-source': 'local', 'carsa-port': '8083' } });
  assert.deepEqual(srcs(appended).slice(0, 3), BASE_LIST);
});

test('with data-allow-local, ?carsa=local switches to the local server for the session', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=local', allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 3), local(8080));
  assert.equal(sessionStorage.data['carsa-source'], 'local');
});

test('with data-allow-local, a session-stored local source survives navigation, with a custom port', () => {
  const { appended } = run({ storage: { 'carsa-source': 'local', 'carsa-port': '8083' }, allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 3), local(8083));
});

test('?carsa-port only accepts a 4-5 digit port', () => {
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=8081', allowLocal: true }).appended).slice(0, 3), local(8081));
  assert.deepEqual(srcs(run({ search: '?carsa=local&carsa-port=evil.com', allowLocal: true }).appended).slice(0, 3), local(8080));
});

test('?carsa=cdn clears the local switch', () => {
  const { appended, sessionStorage } = run({ search: '?carsa=cdn', storage: { 'carsa-source': 'local', 'carsa-port': '8083' }, allowLocal: true });
  assert.deepEqual(srcs(appended).slice(0, 3), BASE_LIST);
  assert.equal(sessionStorage.data['carsa-source'], undefined);
  assert.equal(sessionStorage.data['carsa-port'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = { currentScript: { src: CDN + 'init.js', hasAttribute: () => true }, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}), querySelector: () => null };
  const window = { location: { pathname: '/', search: '?carsa=local' }, setTimeout: () => {}, jQuery() {}, gsap: {} };
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
  vm.runInContext(SOURCE, vm.createContext({ window, document, location: window.location, setTimeout: window.setTimeout, URLSearchParams }));
  assert.deepEqual(srcs(appended).slice(0, 3), BASE_LIST);
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  const { appended } = run({ src: null });
  assert.equal(appended.length, 0);
});
