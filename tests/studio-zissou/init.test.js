// Unit tests for the Studio Zissou site loader: runs the real init.js in a vm sandbox with a stub document and storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { parseInit } from '../../tools/release/preflight.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(__dirname, '..', '..', 'projects', 'studio-zissou');
const SOURCE = readFileSync(join(PROJECT, 'init.js'), 'utf8');
const CDN =
  'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@studio-zissou-v1.0.0/projects/studio-zissou/';
const MODULES = ['global.js'];
const EXPECTED = MODULES.map((m) => CDN + m);

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

function makeDocument({ src, allowLocal, appended, preloaded = [] }) {
  return {
    currentScript: src
      ? { src, hasAttribute: (name) => name === 'data-allow-local' && allowLocal }
      : null,
    head: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: (sel) => {
      const m = sel.match(/(?:src|href)="([^"]+)"/);
      return m && preloaded.includes(m[1]) ? {} : null;
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
  const document = makeDocument({ src, allowLocal, appended, preloaded });
  const window = { location: { pathname, search }, sessionStorage };
  window.window = window;
  window.document = document;
  vm.runInContext(
    SOURCE,
    vm.createContext({ window, document, sessionStorage, location: window.location, URLSearchParams }),
  );
  return { window, appended, sessionStorage };
}

const urls = (appended) => appended.map((el) => el.src || el.href);

test('loads only global.js, from the same versioned folder as init.js, with no third-party dependency', () => {
  assert.deepEqual(urls(run().appended), EXPECTED);
});

test('every element is a script that keeps insertion order', () => {
  const { appended } = run();
  assert.ok(appended.every((el) => el.tagName === 'SCRIPT' && el.async === false));
});

test('every page gets the same global modules', () => {
  for (const pathname of ['/', '/privacy', '/terms', '/404']) {
    assert.deepEqual(urls(run({ pathname }).appended), EXPECTED, pathname);
  }
});

test('exposes the base, version and module list on window.SZ', () => {
  const { window } = run();
  assert.equal(window.SZ.base, CDN);
  assert.equal(window.SZ.version, '1.0.0');
  assert.deepEqual([...window.SZ.modules], MODULES);
});

test('runs once even if the tag is pasted twice', () => {
  const { window, appended } = run();
  const document = makeDocument({ src: CDN + 'init.js', allowLocal: false, appended });
  vm.runInContext(
    SOURCE,
    vm.createContext({ window, document, sessionStorage: window.sessionStorage, location: window.location, URLSearchParams }),
  );
  assert.equal(appended.length, EXPECTED.length);
});

test('skips a module whose exact URL is already on the page', () => {
  assert.deepEqual(urls(run({ preloaded: [CDN + 'global.js'] }).appended), []);
});

test('?sz=local is ignored unless the tag carries data-allow-local', () => {
  const { appended, sessionStorage } = run({ search: '?sz=local' });
  assert.deepEqual(urls(appended), EXPECTED);
  assert.deepEqual(sessionStorage.data, {});
});

test('with data-allow-local, ?sz=local loads from the local server for the session', () => {
  const { appended, sessionStorage } = run({ search: '?sz=local', allowLocal: true });
  assert.deepEqual(urls(appended), ['https://localhost:8080/projects/studio-zissou/global.js']);
  assert.equal(sessionStorage.data['sz-source'], 'local');
});

test('?sz-port only accepts a 4-5 digit port', () => {
  assert.deepEqual(
    urls(run({ search: '?sz=local&sz-port=8081', allowLocal: true }).appended),
    ['https://localhost:8081/projects/studio-zissou/global.js'],
  );
  assert.deepEqual(
    urls(run({ search: '?sz=local&sz-port=evil.com', allowLocal: true }).appended),
    ['https://localhost:8080/projects/studio-zissou/global.js'],
  );
});

test('?sz=cdn clears the local switch', () => {
  const { appended, sessionStorage } = run({
    search: '?sz=cdn',
    storage: { 'sz-source': 'local', 'sz-port': '8083' },
    allowLocal: true,
  });
  assert.deepEqual(urls(appended), EXPECTED);
  assert.equal(sessionStorage.data['sz-source'], undefined);
  assert.equal(sessionStorage.data['sz-port'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = makeDocument({ src: CDN + 'init.js', allowLocal: true, appended });
  const window = { location: { pathname: '/', search: '?sz=local' } };
  Object.defineProperty(window, 'sessionStorage', {
    get() {
      throw new Error('SecurityError');
    },
  });
  vm.runInContext(SOURCE, vm.createContext({ window, document, location: window.location, URLSearchParams }));
  assert.deepEqual(urls(appended), EXPECTED);
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  assert.equal(run({ src: null }).appended.length, 0);
});

test('VERSION is X.Y.Z semver and every listed module exists, so release preflight can cut a tag', () => {
  const parsed = parseInit(SOURCE);
  assert.equal(parsed.version, '1.0.0');
  assert.deepEqual(parsed.modules, MODULES);
  for (const m of MODULES) assert.ok(existsSync(join(PROJECT, m)), m);
});
