// Unit tests for Carsa valuation-links.js: runs the real file in a vm sandbox with a stub form and a minimal delegating jQuery, checking the marker gate, the path gate and the built sellcar URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadHelpers } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'valuation-links.js'), 'utf8');
const DAY = 864e5;

function makeStorage(seed = {}) {
  const data = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

function makeForm(vrm, mileage) {
  const form = { q: {} };
  const trigger = { tagName: 'A', attrs: {}, closest: (s) => (s === 'form' ? form : null), click() {} };
  form.q['[name="vrm"]'] = [{ value: vrm }];
  form.q['[name="mileage"]'] = [{ value: mileage }];
  form.q['[data-link="valuation"]'] = [trigger];
  return { form, trigger };
}

function wrap(els) {
  const list = els.filter(Boolean);
  const w = {
    length: list.length,
    first: () => wrap(list.slice(0, 1)),
    find: (s) => wrap(list.flatMap((e) => (e.q && e.q[s]) || [])),
    closest: (s) => wrap(list.map((e) => (e.closest ? e.closest(s) : null))),
    val: () => (list[0] ? list[0].value : undefined),
    is: (s) => s === 'a' && !!list[0] && list[0].tagName === 'A',
    attr(o) { list.forEach((e) => Object.assign(e.attrs, o)); return w; },
    each(fn) { list.forEach((e, i) => fn.call(e, i, e)); return w; },
  };
  list.forEach((e, i) => { w[i] = e; });
  return w;
}

function makeEnv({ path = '/used-cars', marker = true, local = {}, session = {}, search = '', referrer = '', helpers = true, URLImpl = URL } = {}) {
  const handlers = [];
  const opened = [];
  const warns = [];
  const document = { readyState: 'complete', referrer, addEventListener() {} };
  const location = { pathname: path, hostname: 'www.carsa.co.uk', origin: 'https://www.carsa.co.uk', search };
  const window = { location, addEventListener() {}, setTimeout() {}, open: (...a) => opened.push(a), DD_LOGS: { logger: { warn: (m) => warns.push(m) } } };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  const jQuery = (arg) => {
    if (typeof arg === 'function') return arg();
    if (arg === document) return { on: (type, sel, fn) => handlers.push({ type, sel, fn }) };
    return wrap([arg]);
  };
  window.jQuery = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(session),
    URL: URLImpl,
    URLSearchParams,
    console,
  });
  if (helpers) loadHelpers(context);
  vm.runInContext(SOURCE, context);
  return { window, handlers, opened, warns };
}

function clickHref(env, vrm = 'ab12 cde', mileage = ' 42000 ') {
  const { trigger } = makeForm(vrm, mileage);
  env.handlers.find((h) => h.type === 'click').fn.call(trigger, { preventDefault() {} });
  return trigger.attrs.href;
}

const firstTouch = (utms, extra = {}) => JSON.stringify({ utms, referrerDomain: 'google.com', expiresAt: Date.now() + DAY, ...extra });

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const env = makeEnv({ marker: false });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.handlers.length, 0);
});

test('marker gate: with the marker the module records itself once', () => {
  const env = makeEnv();
  assert.deepEqual([...env.window.__CARSA_RAN], ['valuation-links.js']);
});

test('valuation: binds click, Enter and input handlers on every listed page and template', () => {
  for (const p of ['/', '/about/reviews', '/sell-car/part-exchange', '/sell-car/value-car', '/used-cars', '/used-cars/black-friday-deals', '/used-cars/deals', '/used-cars/fuel/petrol', '/used-cars/make/audi', '/used-cars/models/a3', '/used-cars/near/leeds', '/mot-and-car-servicing/servicing-locations/leeds', '/sell-car/store/leeds', '/used-cars/']) {
    assert.deepEqual(makeEnv({ path: p }).handlers.map((h) => h.type), ['click', 'keydown', 'input'], p);
  }
});

test('valuation: a marked page outside the list gets nothing', () => {
  for (const p of ['/contact', '/used-cars/models', '/sell-car/store', '/used-cars/make/audi/a3', '/faq']) {
    const env = makeEnv({ path: p });
    assert.deepEqual([...env.window.__CARSA_RAN], ['valuation-links.js']);
    assert.equal(env.handlers.length, 0, p);
  }
});

test('valuation: click builds the sellcar link with the cleaned VRM, mileage, stored UTMs and referrer', () => {
  const env = makeEnv({ local: { attribution: firstTouch({ utm_source: 'ads' }) } });
  const { trigger } = makeForm('ab12 cde', ' 42000 ');
  env.handlers.find((h) => h.type === 'click').fn.call(trigger, { preventDefault() {} });
  const u = new URL(trigger.attrs.href);
  assert.equal(u.origin + u.pathname, 'https://sellcar.carsa.co.uk/new-order');
  assert.equal(u.searchParams.get('vrm'), 'AB12CDE');
  assert.equal(u.searchParams.get('mileage'), '42000');
  assert.equal(u.searchParams.get('utm_source'), 'ads');
  assert.equal(u.searchParams.get('referrer'), 'google.com');
  assert.equal(trigger.attrs.target, '_blank');
});

test('attribution: stored first-touch UTMs and referrer win over URL UTMs', () => {
  const u = new URL(clickHref(makeEnv({ local: { attribution: firstTouch({ utm_source: 'first', utm_medium: 'cpc' }) }, search: '?utm_source=url' })));
  assert.equal(u.searchParams.get('utm_source'), 'first');
  assert.equal(u.searchParams.get('utm_medium'), 'cpc');
  assert.equal(u.searchParams.get('referrer'), 'google.com');
});

test('attribution: no stored UTMs falls back to the URL UTMs', () => {
  const u = new URL(clickHref(makeEnv({ local: { attribution: firstTouch({}) }, search: '?utm_source=url&utm_medium=social' })));
  assert.equal(u.searchParams.get('utm_source'), 'url');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
  assert.equal(u.searchParams.get('referrer'), 'google.com');
});

test('attribution: nothing stored sends only the external document.referrer', () => {
  const u = new URL(clickHref(makeEnv({ referrer: 'https://www.bing.com/search?q=carsa' })));
  assert.equal(u.searchParams.get('referrer'), 'bing.com');
  assert.deepEqual([...u.searchParams.keys()], ['vrm', 'mileage', 'referrer']);
  const internal = new URL(clickHref(makeEnv({ referrer: 'https://www.carsa.co.uk/used-cars' })));
  assert.equal(internal.searchParams.get('referrer'), null);
});

test('attribution: session UTMs that differ from the first touch are ignored (first-touch)', () => {
  const env = makeEnv({
    local: { attribution: firstTouch({ utm_source: 'first' }) },
    session: { attribution_session: JSON.stringify({ utms: { utm_source: 'session' }, referrerDomain: 'facebook.com' }) },
  });
  const u = new URL(clickHref(env));
  assert.equal(u.searchParams.get('utm_source'), 'first');
  assert.equal(u.searchParams.get('referrer'), 'google.com');
});

test('attribution: an unparsable URL falls back to string params instead of throwing', () => {
  class BadURL { constructor() { throw new TypeError('Invalid URL'); } }
  const env = makeEnv({ local: { attribution: firstTouch({ utm_source: 'ads' }) }, URLImpl: BadURL });
  assert.equal(clickHref(env), 'https://sellcar.carsa.co.uk/new-order?vrm=AB12CDE&mileage=42000&utm_source=ads&referrer=google.com');
});

test('guard: without window.__CARSA the module warns to Datadog and stops', () => {
  const env = makeEnv({ helpers: false });
  assert.deepEqual(env.warns, ['valuation-links.js: window.__CARSA missing']);
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.handlers.length, 0);
});

test('valuation: no VRM leaves the trigger alone', () => {
  const env = makeEnv();
  const { trigger } = makeForm('', '');
  env.handlers.find((h) => h.type === 'click').fn.call(trigger, { preventDefault() {} });
  assert.equal(trigger.attrs.href, undefined);
});

test('source: the __CARSA guard then the marker gate open the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}var H = window\.__CARSA;\n {2}if \(!H\) \{\n {4}if \(window\.DD_LOGS\) window\.DD_LOGS\.logger\.warn\('valuation-links\.js: window\.__CARSA missing'\);\n {4}return;\n {2}\}\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('valuation-links\.js'\);/m);
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  (SOURCE.match(/.{0,9}console\.log/g) || []).forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: DOMContentLoaded and load are left to H.onReady / H.onLoad', () => {
  assert.equal((SOURCE.match(/DOMContentLoaded/g) || []).length, 0);
  assert.equal((SOURCE.match(/addEventListener\('load'/g) || []).length, 0);
  assert.ok(!/\.on\(['"]load/.test(SOURCE));
});

test('source: no local copies of the shared helpers', () => {
  for (const name of ['block', 'onReady', 'onLoad', 'onPage', 'getAttributionParams', 'addParams']) {
    assert.ok(!new RegExp('function ' + name + '\\b').test(SOURCE), name);
  }
});

test('source: exactly one comment, on line 1', () => {
  const lines = SOURCE.split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  assert.ok(!SOURCE.includes('/*'));
  lines.slice(1).forEach((line, i) => {
    assert.ok(!/^\s*\/\//.test(line), `comment line at ${i + 2}`);
    assert.ok(!/(^|[^:])\/\/\s/.test(line), `trailing comment at ${i + 2}`);
  });
});
