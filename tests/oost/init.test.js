// Unit tests for the Oost site loader: runs the real init.js in a vm sandbox with a stub document and storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'oost', 'init.js'),
  'utf8',
);
const CDN =
  'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.1.0/projects/oost/';
const LENIS_JS = 'https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js';
const LENIS_CSS = 'https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.css';

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

function run({
  src = CDN + 'init.js',
  pathname = '/',
  search = '',
  storage = {},
  preloaded = [],
  allowLocal = false,
} = {}) {
  const appended = [];
  const sessionStorage = makeStorage(storage);
  const head = { appendChild: (el) => appended.push(el) };
  const document = {
    currentScript: src
      ? { src, hasAttribute: (name) => name === 'data-allow-local' && allowLocal }
      : null,
    head,
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: (sel) => {
      const m = sel.match(/(?:src|href)="([^"]+)"/);
      return m && preloaded.includes(m[1]) ? {} : null;
    },
  };
  const window = { location: { pathname, search }, sessionStorage };
  window.window = window;
  window.document = document;
  const context = vm.createContext({
    window,
    document,
    sessionStorage,
    location: window.location,
    URLSearchParams,
  });
  vm.runInContext(SOURCE, context);
  return { window, appended, sessionStorage };
}

const urls = (appended) => appended.map((el) => el.src || el.href);
const scripts = (appended) => appended.filter((el) => el.tagName === 'SCRIPT');

test('loads the Lenis stylesheet and script, then smooth-scroll.js from the same folder as init.js', () => {
  const { appended } = run();
  assert.deepEqual(urls(appended), [LENIS_CSS, LENIS_JS, CDN + 'smooth-scroll.js']);
});

test('the stylesheet is a link element and the scripts keep insertion order', () => {
  const { appended } = run();
  assert.equal(appended[0].tagName, 'LINK');
  assert.equal(appended[0].rel, 'stylesheet');
  assert.ok(scripts(appended).every((el) => el.async === false));
});

test('every page gets the same global modules', () => {
  for (const pathname of ['/', '/afhalen', '/catering', '/geen-pagina']) {
    assert.deepEqual(
      urls(run({ pathname }).appended),
      [LENIS_CSS, LENIS_JS, CDN + 'smooth-scroll.js'],
      pathname,
    );
  }
});

test('exposes the base, version and module list for debugging', () => {
  const { window } = run();
  assert.equal(window.OOST.base, CDN);
  assert.match(window.OOST.version, /^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/);
  assert.deepEqual([...window.OOST.modules], ['smooth-scroll.js']);
});

test('runs once even if the tag is pasted twice', () => {
  const { window, appended } = run();
  const document = {
    currentScript: { src: CDN + 'init.js', hasAttribute: () => false },
    head: { appendChild: (el) => appended.push(el) },
    createElement: () => ({}),
    querySelector: () => null,
  };
  vm.runInContext(
    SOURCE,
    vm.createContext({
      window,
      document,
      sessionStorage: window.sessionStorage,
      location: window.location,
      URLSearchParams,
    }),
  );
  assert.equal(appended.length, 3);
});

test('skips a dependency or module whose exact URL is already on the page', () => {
  const { appended } = run({ preloaded: [LENIS_JS, LENIS_CSS] });
  assert.deepEqual(urls(appended), [CDN + 'smooth-scroll.js']);
});

test('?oost=local is ignored unless the tag carries data-allow-local', () => {
  const { appended, sessionStorage } = run({ search: '?oost=local' });
  assert.equal(urls(appended)[2], CDN + 'smooth-scroll.js');
  assert.deepEqual(sessionStorage.data, {});
});

test('with data-allow-local, ?oost=local loads modules from the local server for the session', () => {
  const { appended, sessionStorage } = run({ search: '?oost=local', allowLocal: true });
  assert.equal(
    urls(appended)[2],
    'https://localhost:8080/projects/oost/smooth-scroll.js',
  );
  assert.equal(sessionStorage.data['oost-source'], 'local');
});

test('?oost-port only accepts a 4-5 digit port', () => {
  assert.equal(
    urls(run({ search: '?oost=local&oost-port=8081', allowLocal: true }).appended)[2],
    'https://localhost:8081/projects/oost/smooth-scroll.js',
  );
  assert.equal(
    urls(run({ search: '?oost=local&oost-port=evil.com', allowLocal: true }).appended)[2],
    'https://localhost:8080/projects/oost/smooth-scroll.js',
  );
});

test('?oost=cdn clears the local switch', () => {
  const { appended, sessionStorage } = run({
    search: '?oost=cdn',
    storage: { 'oost-source': 'local', 'oost-port': '8083' },
    allowLocal: true,
  });
  assert.equal(urls(appended)[2], CDN + 'smooth-scroll.js');
  assert.equal(sessionStorage.data['oost-source'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = {
    currentScript: { src: CDN + 'init.js', hasAttribute: () => true },
    head: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: () => null,
  };
  const window = { location: { pathname: '/', search: '?oost=local' } };
  Object.defineProperty(window, 'sessionStorage', {
    get() {
      throw new Error('SecurityError');
    },
  });
  vm.runInContext(
    SOURCE,
    vm.createContext({ window, document, location: window.location, URLSearchParams }),
  );
  assert.equal(urls(appended)[2], CDN + 'smooth-scroll.js');
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  const { appended } = run({ src: null });
  assert.equal(appended.length, 0);
});
