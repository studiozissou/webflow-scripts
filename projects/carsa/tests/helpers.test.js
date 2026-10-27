// Unit tests for Carsa helpers.js: runs the real file in a vm sandbox and checks every shared helper, the three first-touch attribution tiers, the addParams fallback and the double-load guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { HELPERS_SOURCE, loadHelpers, makeEnv } from './_env.js';

const SOURCE = HELPERS_SOURCE;
const plain = (o) => (o && typeof o === 'object' ? { ...o } : o);
const env = (opts = {}) => makeEnv(null, { jquery: false, ...opts });
const json = (o) => JSON.stringify(o);

test('exposes exactly the seven helpers on window.__CARSA', () => {
  const { H } = env();
  assert.deepEqual(Object.keys(H).sort(), ['addParams', 'block', 'cms', 'getAttributionParams', 'onLoad', 'onPage', 'onReady']);
  for (const k of Object.keys(H)) assert.equal(typeof H[k], 'function', k);
});

test('guard: a second load keeps the first __CARSA object', () => {
  const e = env();
  const first = e.H;
  assert.equal(loadHelpers(e.context), first);
});

test('guard: an existing window.__CARSA is left alone', () => {
  const sentinel = { mine: true };
  const context = vm.createContext({ window: { __CARSA: sentinel }, document: {}, location: {} });
  assert.equal(loadHelpers(context), sentinel);
});

test('load does no DOM, storage or jQuery work', () => {
  const trap = new Proxy({}, { get() { throw new Error('touched at load'); } });
  const context = vm.createContext({ window: {}, document: trap, location: trap, localStorage: trap, sessionStorage: trap });
  const H = loadHelpers(context);
  assert.equal(typeof H.block, 'function');
});

test('block: runs fn, rethrows its error asynchronously and lets the caller continue', () => {
  const { H, timers } = env();
  const ran = [];
  const err = new Error('boom');
  H.block(() => { ran.push(1); throw err; });
  H.block(() => ran.push(2));
  assert.deepEqual(ran, [1, 2]);
  assert.equal(timers.length, 1);
  assert.throws(() => timers[0](), (e) => e === err);
});

test('onReady: runs at once once the document has left loading', () => {
  for (const readyState of ['interactive', 'complete']) {
    const { H, docListeners } = env({ readyState });
    let n = 0;
    H.onReady(() => n++);
    assert.equal(n, 1, readyState);
    assert.equal(docListeners.DOMContentLoaded, undefined, readyState);
  }
});

test('onReady: while loading, waits for DOMContentLoaded and block-wraps the callback', () => {
  const { H, fire, timers } = env({ readyState: 'loading' });
  let n = 0;
  H.onReady(() => { n++; throw new Error('x'); });
  assert.equal(n, 0);
  fire('doc', 'DOMContentLoaded');
  assert.equal(n, 1);
  assert.equal(timers.length, 1);
});

test('onLoad: runs at once when complete, otherwise waits for window load', () => {
  const done = env({ readyState: 'complete' });
  let n = 0;
  done.H.onLoad(() => n++);
  assert.equal(n, 1);
  assert.equal(done.winListeners.load, undefined);

  const waiting = env({ readyState: 'interactive' });
  let m = 0;
  waiting.H.onLoad(() => { m++; throw new Error('y'); });
  assert.equal(m, 0);
  waiting.fire('win', 'load');
  assert.equal(m, 1);
  assert.equal(waiting.timers.length, 1);
});

test('onPage: exact paths ignore a trailing slash, prefixes match one segment only', () => {
  const at = (pathname, paths, prefixes) => env({ pathname }).H.onPage(paths, prefixes);
  assert.equal(at('/', ['/']), true);
  assert.equal(at('/about/', ['/about']), true);
  assert.equal(at('/about/x', ['/about']), false);
  assert.equal(at('/blog/post', [], ['/blog']), true);
  assert.equal(at('/blog/post/', [], ['/blog']), true);
  assert.equal(at('/blog/post/x', [], ['/blog']), false);
  assert.equal(at('/blog', [], ['/blog']), false);
  assert.equal(at('/blogger/x', [], ['/blog']), false);
  assert.equal(at('/x', ['/y']), false);
});

test('cms: trims and stringifies the listed keys, missing or null keys become empty strings', () => {
  const { H } = env();
  assert.deepEqual(plain(H.cms({ name: ' Petrol ', n: 5, z: null, extra: 'drop' }, ['name', 'n', 'z', 'missing'])), { name: 'Petrol', n: '5', z: '', missing: '' });
  assert.equal(H.cms(null, ['name']), null);
  assert.equal(H.cms(undefined, ['name']), null);
  assert.equal(H.cms('str', ['name']), null);
});

const STORED = { utms: { utm_source: 'first', utm_medium: 'cpc' }, referrer: 'https://www.google.com/search', referrerDomain: 'google.com', updatedAt: 1, expiresAt: 9e15 };

test('attribution tier 1: the stored first-touch record wins over URL UTMs and document.referrer', () => {
  const { H } = env({ local: { attribution: json(STORED) }, search: '?utm_source=url', referrer: 'https://www.bing.com/' });
  assert.deepEqual(plain(H.getAttributionParams()), { utm_source: 'first', utm_medium: 'cpc', referrer: 'google.com' });
});

test('attribution tier 1: an internal stored referrerDomain falls back to the stored referrer URL', () => {
  const stored = { utms: { utm_source: 'first' }, referrer: 'https://www.facebook.com/x', referrerDomain: 'carsa.co.uk' };
  const { H } = env({ local: { attribution: json(stored) }, referrer: 'https://www.bing.com/' });
  assert.deepEqual(plain(H.getAttributionParams()), { utm_source: 'first', referrer: 'facebook.com' });
});

test('attribution tier 2: a stored record without UTMs takes utm_* from the URL, keeping its referrer', () => {
  const stored = { utms: {}, referrer: 'https://www.google.com/', referrerDomain: 'google.com' };
  const { H } = env({ local: { attribution: json(stored) }, search: '?utm_source=url&utm_campaign=spring&foo=1&utm_term=' });
  assert.deepEqual(plain(H.getAttributionParams()), { utm_source: 'url', utm_campaign: 'spring', referrer: 'google.com' });
});

test('attribution tier 2: no stored record at all also reads URL UTMs', () => {
  const { H } = env({ search: '?utm_source=url' });
  assert.deepEqual(plain(H.getAttributionParams()), { utm_source: 'url' });
});

test('attribution tier 3: no stored referrer uses an external document.referrer, never an internal one', () => {
  assert.deepEqual(plain(env({ referrer: 'https://www.bing.com/search?q=x' }).H.getAttributionParams()), { referrer: 'bing.com' });
  assert.deepEqual(plain(env({ referrer: 'https://www.carsa.co.uk/used-cars' }).H.getAttributionParams()), {});
  assert.deepEqual(plain(env({ referrer: 'https://quote.carsa.co.uk/x' }).H.getAttributionParams()), {});
  const internalStored = { utms: { utm_source: 'first' }, referrer: '', referrerDomain: 'carsa.co.uk' };
  assert.deepEqual(plain(env({ local: { attribution: json(internalStored) }, referrer: 'https://www.bing.com/' }).H.getAttributionParams()), { utm_source: 'first', referrer: 'bing.com' });
});

test('attribution: nothing stored, no UTMs, no referrer gives an empty object', () => {
  assert.deepEqual(plain(env().H.getAttributionParams()), {});
});

test('attribution: the sessionStorage attribution_session record is never read', () => {
  const session = { attribution_session: json({ utms: { utm_source: 'last', utm_medium: 'social' }, referrer: 'https://facebook.com/', referrerDomain: 'facebook.com', updatedAt: 2 }) };
  const withStored = env({ local: { attribution: json(STORED) }, session });
  assert.deepEqual(plain(withStored.H.getAttributionParams()), { utm_source: 'first', utm_medium: 'cpc', referrer: 'google.com' });
  const sessionOnly = env({ session });
  assert.deepEqual(plain(sessionOnly.H.getAttributionParams()), {});
});

test('attribution: corrupt JSON or throwing storage falls through to the URL and referrer', () => {
  const corrupt = env({ local: { attribution: '{nope' }, search: '?utm_source=url', referrer: 'https://www.bing.com/' });
  assert.deepEqual(plain(corrupt.H.getAttributionParams()), { utm_source: 'url', referrer: 'bing.com' });
  const blocked = env({ search: '?utm_source=url' });
  blocked.context.localStorage = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(plain(blocked.H.getAttributionParams()), { utm_source: 'url' });
});

test('addParams: adds missing keys, skips keys already in the URL, resolves relative URLs', () => {
  const { H } = env();
  const out = H.addParams('https://quote.carsa.co.uk/eligibility/questions?vrm=AB12CDE&utm_source=keep', { utm_source: 'x', referrer: 'google.com' });
  assert.equal(out, 'https://quote.carsa.co.uk/eligibility/questions?vrm=AB12CDE&utm_source=keep&referrer=google.com');
  assert.equal(H.addParams('/sell-car?vrm=1', { utm_source: 'a b' }), 'https://www.carsa.co.uk/sell-car?vrm=1&utm_source=a+b');
});

test('addParams: an unparsable URL falls back to string appends and still skips existing keys', () => {
  const { H } = env();
  assert.equal(H.addParams('http://[bad/x?utm_source=keep', { utm_source: 'x', referrer: 'g.com' }), 'http://[bad/x?utm_source=keep&referrer=g.com');
  assert.equal(H.addParams('http://[bad/x', { utm_source: 'a b' }), 'http://[bad/x?utm_source=a%20b');
  assert.equal(H.addParams('http://[bad/x?utm_source=keep', { utm_source: 'x' }), 'http://[bad/x?utm_source=keep');
});

test('source: one header comment on line 1, no other comments, no console.log, classic script', () => {
  const lines = SOURCE.trimEnd().split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  lines.slice(1).forEach((l, i) => {
    assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
    assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
    assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
  });
  assert.doesNotMatch(SOURCE, /console\.log/);
  assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
  assert.doesNotMatch(SOURCE, /attribution_session/);
  assert.doesNotMatch(SOURCE, /__CARSA_PAGE|jQuery|\$\(/);
});

test('source: strict IIFE whose first statement is the double-load guard', () => {
  assert.match(SOURCE, /^\/\/ [^\n]+\n\(function \(\) \{\n {2}'use strict';\n\n {2}if \(window\.__CARSA\) return;\n/);
});
