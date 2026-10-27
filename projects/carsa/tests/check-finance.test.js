// Unit tests for Carsa check-finance.js: runs the real file in a vm sandbox with a stub body, card, anchor and storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadHelpers } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'check-finance.js'), 'utf8');
const SELECTOR = '[data-link="check-finance"]';
const ELIGIBILITY = 'https://quote.carsa.co.uk/eligibility/questions';
const ORIGINAL = 'https://www.carsa.co.uk/vehicles/used/ab12cde';

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function makeAnchor(href = ORIGINAL, attrs = {}) {
  const a = { href, dataset: {}, attrs: { ...attrs } };
  a.getAttribute = (k) => (k in a.attrs ? a.attrs[k] : null);
  a.setAttribute = (k, v) => { a.attrs[k] = String(v); };
  a.removeAttribute = (k) => { delete a.attrs[k]; };
  a.closest = (sel) => (sel === 'a' ? a : null);
  return a;
}

function makeCard(anchor, vrm = 'AB12CDE') {
  const child = {};
  const card = { child };
  card.getAttribute = (k) => (k === 'vrm' ? vrm : null);
  card.closest = (sel) => (sel === SELECTOR ? card : sel === 'a' ? anchor : null);
  card.contains = (n) => n === card || n === child;
  child.closest = card.closest;
  return card;
}

function makeEnv({ session = {}, local = {}, referrer = '', search = '', helpers = true, dd = null } = {}) {
  const listeners = {};
  const timers = [];
  const body = { addEventListener: (t, fn) => (listeners[t] ||= []).push(fn) };
  const document = { body, referrer, readyState: 'complete', addEventListener() {} };
  const location = { hostname: 'www.carsa.co.uk', origin: 'https://www.carsa.co.uk', search };
  const window = { location, document, setTimeout: (fn) => timers.push(fn), addEventListener() {} };
  if (dd) window.DD_LOGS = dd;
  const context = vm.createContext({
    window,
    document,
    location,
    sessionStorage: makeStorage(session),
    localStorage: makeStorage(local),
    URL,
    URLSearchParams,
  });
  if (helpers) loadHelpers(context);
  vm.runInContext(SOURCE, context);
  const fire = (type, target, relatedTarget = null) => listeners[type].forEach((fn) => fn({ target, relatedTarget }));
  return { listeners, fire, timers, window };
}

const params = (href) => Object.fromEntries(new URL(href).searchParams);
const SWAPPED = ELIGIBILITY + '?vrm=AB12CDE';

function hover(envOptions, vrm) {
  const env = makeEnv(envOptions);
  const anchor = makeAnchor();
  env.fire('mouseover', makeCard(anchor, vrm));
  return anchor;
}

test('registers exactly three body listeners: mouseover, mouseout and click', () => {
  const { listeners } = makeEnv();
  assert.deepEqual(Object.keys(listeners).sort(), ['click', 'mouseout', 'mouseover']);
  assert.ok(Object.values(listeners).every((l) => l.length === 1));
});

test('mouseover swaps the anchor href to the eligibility URL and sets the analytics event', () => {
  const anchor = hover();
  assert.equal(anchor.href, SWAPPED);
  assert.equal(anchor.getAttribute('data-analytics-event'), 'check-finance-car-card-click');
  assert.equal(anchor.dataset.originalHref, ORIGINAL);
});

test('mouseout restores the href and the original analytics attribute', () => {
  const env = makeEnv();
  const anchor = makeAnchor(ORIGINAL, { 'data-analytics-event': 'car-card-click' });
  const card = makeCard(anchor);
  env.fire('mouseover', card);
  env.fire('mouseout', card);
  assert.equal(anchor.href, ORIGINAL);
  assert.equal(anchor.getAttribute('data-analytics-event'), 'car-card-click');
  assert.equal(anchor.dataset.originalHref, undefined);
  assert.equal('originalAnalytics' in anchor.dataset, false);
});

test('mouseout removes the analytics attribute when there was none before', () => {
  const env = makeEnv();
  const anchor = makeAnchor();
  const card = makeCard(anchor);
  env.fire('mouseover', card);
  env.fire('mouseout', card);
  assert.equal(anchor.href, ORIGINAL);
  assert.equal(anchor.getAttribute('data-analytics-event'), null);
});

test('mouseout into a child of the card does not restore', () => {
  const env = makeEnv();
  const anchor = makeAnchor();
  const card = makeCard(anchor);
  env.fire('mouseover', card);
  env.fire('mouseout', card, card.child);
  assert.equal(anchor.href, SWAPPED);
  assert.equal(anchor.dataset.originalHref, ORIGINAL);
});

test('click without a prior hover swaps href and analytics, and a later hover does not double-wrap', () => {
  const env = makeEnv();
  const anchor = makeAnchor();
  const card = makeCard(anchor);
  env.fire('click', card);
  assert.equal(anchor.href, SWAPPED);
  assert.equal(anchor.getAttribute('data-analytics-event'), 'check-finance-car-card-click');
  assert.equal(anchor.dataset.originalHref, ORIGINAL);
  env.fire('mouseover', card);
  assert.equal(anchor.dataset.originalHref, ORIGINAL);
  env.fire('mouseout', card);
  assert.equal(anchor.href, ORIGINAL);
});

test('guard: without window.__CARSA it warns once and binds nothing', () => {
  const warned = [];
  const env = makeEnv({ helpers: false, dd: { logger: { warn: (m) => warned.push(m) } } });
  assert.deepEqual(warned, ['check-finance.js: window.__CARSA missing']);
  assert.deepEqual(Object.keys(env.listeners), []);
});

test('guard: without window.__CARSA or DD_LOGS it returns quietly', () => {
  assert.doesNotThrow(() => makeEnv({ helpers: false }));
});

test('attribution case 1: stored first-touch utms and referrerDomain', () => {
  const anchor = hover({ local: { attribution: JSON.stringify({ utms: { utm_source: 'ls', utm_medium: 'cpc' }, referrerDomain: 'google.com' }) } });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', utm_source: 'ls', utm_medium: 'cpc', referrer: 'google.com' });
});

test('attribution case 2: no stored utms falls back to the URL utm_* params (first-touch helper; the old copy ignored the URL)', () => {
  const anchor = hover({ search: '?utm_source=url&utm_campaign=c1&x=1', local: { attribution: JSON.stringify({ utms: {} }) } });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', utm_source: 'url', utm_campaign: 'c1' });
});

test('attribution case 3: nothing stored, external document.referrer only', () => {
  const anchor = hover({ referrer: 'https://www.facebook.com/' });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', referrer: 'facebook.com' });
});

test('attribution case 4: session utms that differ from stored first-touch are ignored (was session-first)', () => {
  const anchor = hover({
    session: { attribution_session: JSON.stringify({ utms: { utm_source: 'session' }, referrerDomain: 'bing.com' }) },
    local: { attribution: JSON.stringify({ utms: { utm_source: 'local', utm_medium: 'cpc' }, referrerDomain: 'google.com' }) },
  });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', utm_source: 'local', utm_medium: 'cpc', referrer: 'google.com' });
});

test('source: uses the shared helpers, no local attribution copies', () => {
  assert.match(SOURCE, /H\.addParams\(url, H\.getAttributionParams\(\)\)/);
  assert.ok(!/function (getAttributionParams|addParams)/.test(SOURCE));
  assert.ok(!SOURCE.includes('attribution_session'));
});

test('local attribution utms are used when session utms are empty', () => {
  const anchor = hover({
    session: { attribution_session: JSON.stringify({ utms: {} }) },
    local: { attribution: JSON.stringify({ utms: { utm_source: 'local' } }) },
  });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', utm_source: 'local' });
});

test('a stored referrerDomain becomes the referrer param', () => {
  const anchor = hover({ local: { attribution: JSON.stringify({ referrerDomain: 'google.com' }) }, referrer: 'https://bing.com/' });
  assert.equal(params(anchor.href).referrer, 'google.com');
});

test('an external document.referrer is used when nothing is stored', () => {
  const anchor = hover({ referrer: 'https://www.bing.com/search?q=x' });
  assert.equal(params(anchor.href).referrer, 'bing.com');
});

test('an internal document.referrer adds no referrer param', () => {
  for (const referrer of ['https://www.carsa.co.uk/used-cars', 'https://carsa.co.uk/', 'https://blog.carsa.co.uk/post']) {
    const anchor = hover({ referrer });
    assert.equal('referrer' in params(anchor.href), false, referrer);
  }
});

test('attribution never overwrites an existing query param', () => {
  const anchor = hover({ local: { attribution: JSON.stringify({ utms: { vrm: 'HIJACK', utm_source: 'x' } }) } });
  assert.deepEqual(params(anchor.href), { vrm: 'AB12CDE', utm_source: 'x' });
});

test('the VRM is URL-encoded', () => {
  const anchor = hover({}, 'AB12 C&E');
  assert.equal(params(anchor.href).vrm, 'AB12 C&E');
  assert.match(anchor.href, /vrm=AB12(\+|%20)C%26E/);
});

test('events on pages without finance cards are a no-op', () => {
  const env = makeEnv();
  const target = { closest: () => null };
  for (const type of ['mouseover', 'mouseout', 'click']) {
    assert.doesNotThrow(() => env.fire(type, target), type);
  }
});
