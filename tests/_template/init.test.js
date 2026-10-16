// Unit tests for the template site loader: runs the real init.js in a vm sandbox with a stub document and storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { parseInit } from '../../tools/release/preflight.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', '_template', 'init.js'),
  'utf8',
);
const CDN =
  'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@client-v0.1.0/projects/client/';
const LENIS_JS = 'https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js';
const MODULES = ['smooth-scroll.js', 'site-utilities.js', 'faq-accordion.js', 'booking-widget.js'];
const EXPECTED = [LENIS_JS, ...MODULES.map((m) => CDN + m)];

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

test('loads the Lenis script, then smooth-scroll.js, site-utilities.js, faq-accordion.js and booking-widget.js from the same folder as init.js', () => {
  const { appended } = run();
  assert.deepEqual(urls(appended), EXPECTED);
});

test('appends no stylesheet: every element is a script that keeps insertion order', () => {
  const { appended } = run();
  assert.equal(scripts(appended).length, appended.length);
  assert.ok(appended.every((el) => el.async === false));
  assert.ok(urls(appended).every((url) => !url.endsWith('.css')));
});

test('every page gets the same global modules', () => {
  for (const pathname of ['/', '/about', '/contact', '/no-such-page']) {
    assert.deepEqual(urls(run({ pathname }).appended), EXPECTED, pathname);
  }
});

test('exposes the base, version and module list for debugging', () => {
  const { window } = run();
  assert.equal(window.CLIENT.base, CDN);
  assert.equal(window.CLIENT.version, '0.1.0');
  assert.deepEqual([...window.CLIENT.modules], MODULES);
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
  assert.equal(appended.length, EXPECTED.length);
});

test('skips a dependency or module whose exact URL is already on the page', () => {
  const { appended } = run({ preloaded: [LENIS_JS, CDN + 'site-utilities.js'] });
  assert.deepEqual(urls(appended), [
    CDN + 'smooth-scroll.js',
    CDN + 'faq-accordion.js',
    CDN + 'booking-widget.js',
  ]);
});

test('?client=local is ignored unless the tag carries data-allow-local', () => {
  const { appended, sessionStorage } = run({ search: '?client=local' });
  assert.equal(urls(appended)[1], CDN + 'smooth-scroll.js');
  assert.deepEqual(sessionStorage.data, {});
});

test('with data-allow-local, ?client=local loads modules from the local server for the session', () => {
  const { appended, sessionStorage } = run({ search: '?client=local', allowLocal: true });
  assert.equal(
    urls(appended)[1],
    'https://localhost:8080/projects/client/smooth-scroll.js',
  );
  assert.equal(sessionStorage.data['client-source'], 'local');
});

test('?client-port only accepts a 4-5 digit port', () => {
  assert.equal(
    urls(run({ search: '?client=local&client-port=8081', allowLocal: true }).appended)[1],
    'https://localhost:8081/projects/client/smooth-scroll.js',
  );
  assert.equal(
    urls(run({ search: '?client=local&client-port=evil.com', allowLocal: true }).appended)[1],
    'https://localhost:8080/projects/client/smooth-scroll.js',
  );
});

test('?client=cdn clears the local switch', () => {
  const { appended, sessionStorage } = run({
    search: '?client=cdn',
    storage: { 'client-source': 'local', 'client-port': '8083' },
    allowLocal: true,
  });
  assert.equal(urls(appended)[1], CDN + 'smooth-scroll.js');
  assert.equal(sessionStorage.data['client-source'], undefined);
});

test('blocked storage falls back to the CDN instead of throwing', () => {
  const appended = [];
  const document = {
    currentScript: { src: CDN + 'init.js', hasAttribute: () => true },
    head: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: () => null,
  };
  const window = { location: { pathname: '/', search: '?client=local' } };
  Object.defineProperty(window, 'sessionStorage', {
    get() {
      throw new Error('SecurityError');
    },
  });
  vm.runInContext(
    SOURCE,
    vm.createContext({ window, document, location: window.location, URLSearchParams }),
  );
  assert.equal(urls(appended)[1], CDN + 'smooth-scroll.js');
});

test('no currentScript (e.g. injected by a tag manager) does nothing rather than guess a host', () => {
  const { appended } = run({ src: null });
  assert.equal(appended.length, 0);
});

test('VERSION is X.Y.Z semver and every listed module exists, so release preflight can cut a tag', () => {
  const parsed = parseInit(SOURCE);
  assert.match(parsed.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(parsed.modules, MODULES);
  for (const m of MODULES) {
    assert.ok(existsSync(join(__dirname, '..', '..', 'projects', '_template', m)), m);
  }
});

test('the template copies of site-utilities.js and smooth-scroll.js match shared/', () => {
  for (const f of ['site-utilities.js', 'smooth-scroll.js']) {
    assert.equal(
      readFileSync(join(__dirname, '..', '..', 'projects', '_template', f), 'utf8'),
      readFileSync(join(__dirname, '..', '..', 'shared', f), 'utf8'),
      f,
    );
  }
});
