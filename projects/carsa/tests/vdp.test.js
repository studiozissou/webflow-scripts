// Unit tests for Carsa vdp.js: runs the real file in a vm sandbox with a stub DOM, a minimal chainable jQuery and a recorded fetch, driven by window.__CARSA_VDP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'vdp.js'), 'utf8');

const BASE_VDP = {
  price: '18995',
  registrationDate: 'Mar 01, 2024',
  odometer: '42000',
  vrm: 'bl73dmu',
  financeType: 'PCP',
  depositContribution: '',
  locationName: 'Leeds',
  isStorageLocation: 'false',
  makeName: 'Land Rover',
  modelName: 'Range Rover Evoque',
  status: 'For sale',
};

const QUOTE = { pcp: { payments: { regular: 250.25 }, term: 48 }, hp: { payments: { regular: 321.45 } } };

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function makeEl(extra = {}) {
  const listeners = {};
  const attrs = {};
  const el = {
    listeners,
    attrs,
    value: '',
    textContent: '',
    checked: false,
    options: [],
    children: [],
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains: () => false },
    addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
    removeEventListener() {},
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k) => { delete attrs[k]; },
    closest: () => null,
    querySelectorAll: () => [],
    click() {},
    ...extra,
  };
  return el;
}

function makeEnv({ vdp = BASE_VDP, readyState = 'complete', nodes = {}, byId = {} } = {}) {
  const docListeners = {};
  const winListeners = {};
  const jqDocHandlers = [];
  const timers = [];
  const logs = [];
  const fetches = [];
  const ids = { ...byId };
  const getEl = (id) => (ids[id] ||= makeEl({ id }));

  const document = {
    readyState,
    referrer: '',
    body: makeEl(),
    documentElement: { clientHeight: 800 },
    activeElement: null,
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    querySelector: (sel) => (nodes[sel] || [])[0] || null,
    querySelectorAll: (sel) => nodes[sel] || [],
    getElementById: getEl,
  };
  const location = {
    hostname: 'www.carsa.co.uk',
    origin: 'https://www.carsa.co.uk',
    pathname: '/vehicles/used/bl73dmu',
    search: '',
    hash: '',
    href: 'https://www.carsa.co.uk/vehicles/used/bl73dmu',
  };
  const window = {
    location,
    innerHeight: 800,
    scrollX: 0,
    scrollY: 0,
    scrollTo() {},
    open() {},
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    removeEventListener() {},
  };
  if (vdp) window.__CARSA_VDP = { ...vdp };

  function wrap(els) {
    const $w = {
      length: els.length,
      each(fn) { els.forEach((el, i) => fn.call(el, i, el)); return $w; },
      on(type, a, b) {
        if (els[0] === window && type === 'load') window.addEventListener('load', a);
        if (els[0] === document) jqDocHandlers.push({ type, selector: a, fn: b });
        return $w;
      },
      ready(fn) { fn(); return $w; },
      text(v) {
        if (v === undefined) return els[0] ? String(els[0].textContent) : '';
        els.forEach((el) => { el.textContent = String(v); });
        return $w;
      },
      html(v) { return $w.text(v); },
      val(v) {
        if (v === undefined) return els[0] ? els[0].value : undefined;
        els.forEach((el) => { el.value = v; });
        return $w;
      },
      attr(k, v) {
        if (typeof k === 'object') { Object.keys(k).forEach((key) => $w.attr(key, k[key])); return $w; }
        if (v === undefined) return els[0] && els[0].getAttribute ? els[0].getAttribute(k) ?? undefined : undefined;
        els.forEach((el) => el.setAttribute && el.setAttribute(k, v));
        return $w;
      },
      data(k, v) {
        if (v === undefined) return els[0] && els[0].__data ? els[0].__data[k] : undefined;
        els.forEach((el) => { (el.__data ||= {})[k] = v; });
        return $w;
      },
      prop(k, v) {
        if (v === undefined) return els[0] ? els[0][k] : undefined;
        els.forEach((el) => { el[k] = v; });
        return $w;
      },
      css(k) { return typeof k === 'string' && arguments.length === 1 ? '' : $w; },
      find: () => wrap([]),
      closest: () => wrap([]),
      first: () => wrap(els.slice(0, 1)),
      is: () => false,
      get: (i) => (i === undefined ? els.slice() : els[i]),
      map: (fn) => wrap(els.map((el, i) => fn.call(el, i, el)).filter((x) => x != null)),
      hide: () => $w,
      show: () => $w,
      remove: () => $w,
      append: () => $w,
      toggleClass: () => $w,
      animate: () => $w,
    };
    els.forEach((el, i) => { $w[i] = el; });
    return $w;
  }

  const jQuery = (arg) => {
    if (typeof arg === 'function') { arg(); return undefined; }
    if (arg === window || arg === document) return wrap([arg]);
    if (typeof arg === 'object') return wrap([arg]);
    if (arg.startsWith('<')) return wrap([]);
    if (/^#[\w-]+$/.test(arg)) return wrap([getEl(arg.slice(1))]);
    return wrap(nodes[arg] || []);
  };
  window.jQuery = window.$ = jQuery;

  const fetch = (url, opts = {}) => {
    fetches.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null });
    const data = url.endsWith('/quote') ? QUOTE : {};
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  };

  const context = vm.createContext({
    window,
    document,
    location,
    history: { replaceState() {} },
    jQuery,
    $: jQuery,
    gsap: { registerPlugin() {}, timeline: () => ({ to() {} }), to: () => ({ play() {} }), delayedCall() {} },
    fetch,
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout() {},
    requestAnimationFrame() {},
    getComputedStyle: () => ({ stroke: 'none', strokeWidth: '0' }),
    MutationObserver: class { observe() {} },
    IntersectionObserver: class { observe() {} },
    URL,
    URLSearchParams,
    console: { log: (...a) => logs.push(a), error: (...a) => logs.push(a), warn: (...a) => logs.push(a) },
  });
  window.localStorage = context.localStorage;
  window.sessionStorage = context.sessionStorage;
  window.fetch = fetch;
  vm.runInContext(SOURCE, context);
  const fire = (type) => (docListeners[type] || []).forEach((fn) => fn({}));
  return { context, window, document, ids, timers, logs, fetches, docListeners, winListeners, jqDocHandlers, fire };
}

const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
const quoteCall = (env) => env.fetches.find((f) => f.url.endsWith('/quote'));

test('missing config: no listeners, no fetch, nothing logged, nothing thrown', () => {
  const env = makeEnv({ vdp: null });
  assert.deepEqual(env.docListeners, {});
  assert.deepEqual(env.winListeners, {});
  assert.equal(env.jqDocHandlers.length, 0);
  assert.equal(env.fetches.length, 0);
  assert.equal(env.logs.length, 0);
  assert.equal(env.window.CARSA_FIN, undefined);
});

test('runs end to end with a full config and fetches finance-config once', async () => {
  const env = makeEnv();
  await flush();
  assert.equal(env.fetches.filter((f) => f.url.endsWith('/finance-config')).length, 1);
  assert.ok(quoteCall(env));
  assert.equal(env.logs.length, 0);
});

test('coercion: price and odometer reach the quote payload as numbers; vrm and registration date as strings', async () => {
  const env = makeEnv();
  await flush();
  const { vehicle, requestUuid } = quoteCall(env).body;
  assert.equal(vehicle.price, 18995);
  assert.equal(vehicle.mileage, 42000);
  assert.equal(vehicle.vrm, 'bl73dmu');
  assert.equal(vehicle.registrationDate, '2024-03-01');
  assert.equal(requestUuid, '6319f553-726a-4e25-83e6-7b6fd792414a');
});

test('coercion: empty deposit contribution is 0 and the quote uses the full flat deposit', async () => {
  const env = makeEnv();
  await flush();
  assert.equal(quoteCall(env).body.criteria.cashDeposit, 2500);
  assert.equal(env.ids['finance-deposit'].value, '£2,500');
  assert.equal(env.ids['deposit-contribution'].value, '');
});

test('coercion: a £500 contribution lowers the customer box but quotes on the full deposit', async () => {
  const env = makeEnv({ vdp: { ...BASE_VDP, depositContribution: '£500' } });
  await flush();
  assert.equal(env.ids['finance-deposit'].value, '£2,000');
  assert.equal(env.ids['deposit-contribution'].value, '£500');
  assert.equal(quoteCall(env).body.criteria.cashDeposit, 2500);
});

test('coercion: finance type HP checks the 60-month term, otherwise the config default', () => {
  const hp = makeEnv({ vdp: { ...BASE_VDP, financeType: 'HP' } });
  assert.equal(hp.ids['60'].checked, true);
  const pcp = makeEnv();
  assert.equal(pcp.ids['48'].checked, true);
  assert.equal(pcp.ids['60'], undefined);
});

test('coercion: isStorageLocation "true" adds storage=true to Get Started; "false" and "" do not', () => {
  const href = (isStorageLocation) => {
    const btn = makeEl();
    makeEnv({ vdp: { ...BASE_VDP, isStorageLocation, vrm: ' BL73DMU ', locationName: ' Leeds ' }, nodes: { '[data-button="booking-options"]': [btn] } });
    return btn.getAttribute('href');
  };
  assert.equal(href('true'), '/get-started?vrm=bl73dmu&location=Leeds&storage=true');
  assert.equal(href('false'), '/get-started?vrm=bl73dmu&location=Leeds');
  assert.equal(href(''), '/get-started?vrm=bl73dmu&location=Leeds');
});

test('coercion: CTA link uses the trimmed upper-case VRM', () => {
  const cta = makeEl();
  makeEnv({ vdp: { ...BASE_VDP, vrm: ' bl73dmu ' }, nodes: { '[data-button="cta-option"]': [cta] } });
  assert.equal(cta.getAttribute('href'), 'https://quote.carsa.co.uk/book/BL73DMU');
});

test('status: "Removed" marks the Product offer SoldOut and drops the price', () => {
  const ld = { textContent: JSON.stringify({ '@type': 'Product', name: 'Car', offers: { '@type': 'Offer', price: 18995, priceCurrency: 'GBP', availability: 'https://schema.org/InStock' } }) };
  makeEnv({ vdp: { ...BASE_VDP, status: ' Removed ' }, nodes: { 'script[type="application/ld+json"]': [ld] } });
  const offer = JSON.parse(ld.textContent).offers;
  assert.equal(offer.availability, 'https://schema.org/SoldOut');
  assert.equal(offer.price, undefined);
});

test('status: a live car keeps its offer price', () => {
  const original = JSON.stringify({ '@type': 'Product', name: 'Car', offers: { '@type': 'Offer', price: 18995, availability: 'https://schema.org/InStock' } });
  const ld = { textContent: original };
  makeEnv({ nodes: { 'script[type="application/ld+json"]': [ld] } });
  assert.equal(ld.textContent, original);
});

test('late start: readyState complete runs the former DOMContentLoaded blocks immediately', async () => {
  const btn = makeEl();
  const env = makeEnv({ readyState: 'complete', nodes: { '[data-link="search-similar"]': [btn] } });
  assert.equal(btn.getAttribute('href'), '/used-cars?cars_make_equal=Land+Rover&cars_model_equal=Range+Rover+Evoque');
  assert.equal(env.docListeners.DOMContentLoaded, undefined);
  assert.ok(env.ids['finance-deposit'].listeners.input);
  await flush();
  assert.ok(quoteCall(env));
});

test('late start: readyState loading defers both blocks until DOMContentLoaded fires', async () => {
  const btn = makeEl();
  const env = makeEnv({ readyState: 'loading', nodes: { '[data-link="search-similar"]': [btn] } });
  assert.equal(btn.getAttribute('href'), null);
  assert.equal(env.docListeners.DOMContentLoaded.length, 2);
  await flush();
  assert.equal(quoteCall(env), undefined);
  env.fire('DOMContentLoaded');
  assert.match(btn.getAttribute('href'), /^\/used-cars\?cars_make_equal=Land\+Rover/);
  await flush();
  assert.ok(quoteCall(env));
});

test('window load: the UTM-link and APR blocks register load listeners', () => {
  const env = makeEnv();
  assert.equal(env.winListeners.load.length, 2);
});

test('source: DOMContentLoaded appears only inside onReady', () => {
  assert.equal(SOURCE.match(/DOMContentLoaded/g).length, 1);
  assert.match(SOURCE, /function onReady\(fn\) \{[^}]*DOMContentLoaded/);
});

test('source: the check-finance handler (block 12) is not included', () => {
  assert.ok(!SOURCE.includes('check-finance-car-card-click'));
  assert.ok(!SOURCE.includes('[data-link="check-finance"]'));
  assert.ok(!SOURCE.includes('eligibility/questions\';'));
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  const logs = SOURCE.match(/.{0,9}console\.log/g) || [];
  assert.ok(logs.length >= 1);
  logs.forEach((l) => assert.match(l, /DEBUG && console\.log$/));
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

test('source: fifteen block IIFEs inside the outer wrapper', () => {
  assert.equal(SOURCE.match(/^ {2}\(function \(\) \{$/gm).length, 15);
  assert.equal(SOURCE.match(/^ {2}\}\)\(\);$/gm).length, 15);
});
