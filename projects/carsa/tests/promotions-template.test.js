// Unit tests for Carsa promotions-template.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the promo filter link, the __CARSA_PROMO config coercion and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'promotions-template.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');
const MARKER = { release: 'v1.2.0' };

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function makeEl(props = {}) {
  const listeners = {};
  const classes = new Set();
  const el = {
    attrs: {},
    style: {},
    children: [],
    dataset: {},
    textContent: '',
    value: '',
    checked: false,
    listeners,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    setAttribute: (k, v) => { el.attrs[k] = String(v); },
    getAttribute: (k) => (k in el.attrs ? el.attrs[k] : null),
    removeAttribute: (k) => { delete el.attrs[k]; },
    addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
    removeEventListener() {},
    closest: () => null,
    querySelectorAll: () => [],
    matches: () => false,
    ...props,
  };
  return el;
}

function makeEnv({ marker = MARKER, config = {}, nodes = {}, search = '', pathname = '/', readyState = 'complete', title = '', referrer = '', local = {}, session = {}, globals = {} } = {}) {
  const docListeners = {};
  const winListeners = {};
  const delegated = [];
  const timers = [];
  const dataStore = new WeakMap();
  const document = {
    readyState,
    referrer,
    title,
    head: makeEl(),
    body: makeEl(),
    documentElement: { clientHeight: 800 },
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    querySelector: (s) => (nodes[s] || [])[0] || null,
    querySelectorAll: (s) => nodes[s] || [],
    getElementById: (id) => (nodes['#' + id] || [])[0] || null,
  };
  const location = {
    hostname: 'www.carsa.co.uk',
    origin: 'https://www.carsa.co.uk',
    pathname,
    search,
    href: 'https://www.carsa.co.uk' + pathname + search,
    replace: (u) => { location.replacedWith = u; },
  };
  const window = {
    location,
    document,
    innerHeight: 800,
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    removeEventListener() {},
    setTimeout: (fn) => timers.push(fn),
    open() {},
    ...config,
  };
  if (marker) window.__CARSA_PAGE = marker;

  function wrap(list) {
    const els = list.filter(Boolean);
    const c = {
      els,
      length: els.length,
      0: els[0],
      each(fn) { els.forEach((el, i) => fn.call(el, i, el)); return c; },
      get() { return els; },
      first() { return wrap(els.slice(0, 1)); },
      closest(s) { return wrap(els.map((e) => e.closest(s))); },
      find(s) { return wrap(els.flatMap((e) => Array.from(e.querySelectorAll(s)))); },
      attr(k, v) {
        if (typeof k === 'string' && v === undefined) return els[0] ? (els[0].getAttribute(k) ?? undefined) : undefined;
        const o = typeof k === 'string' ? { [k]: v } : k;
        els.forEach((e) => Object.entries(o).forEach(([a, b]) => e.setAttribute(a, b)));
        return c;
      },
      text(v) {
        if (v === undefined) return els.map((e) => e.textContent).join('');
        els.forEach((e) => { e.textContent = String(v); });
        return c;
      },
      val(v) {
        if (v === undefined) return els[0] ? els[0].value : undefined;
        els.forEach((e) => { e.value = v; });
        return c;
      },
      css(k, v) {
        const o = typeof k === 'string' ? { [k]: v } : k;
        els.forEach((e) => Object.assign(e.style, o));
        return c;
      },
      removeClass(n) { els.forEach((e) => e.classList.remove(n)); return c; },
      hasClass(n) { return els.some((e) => e.classList.contains(n)); },
      is(s) { return els.some((e) => e.matches(s)); },
      data(k, v) {
        const e = els[0];
        if (!e) return undefined;
        const d = dataStore.get(e) || {};
        dataStore.set(e, d);
        if (v === undefined) return k in d ? d[k] : e.dataset[k];
        d[k] = v;
        return c;
      },
      on(t, fn) { els.forEach((e) => e.addEventListener(t, fn)); return c; },
      trigger(t) { els.forEach((e) => (e.listeners[t] || []).forEach((fn) => fn.call(e, { type: t }))); return c; },
      append(h) { els.forEach((e) => e.children.push(h)); return c; },
      prepend(o) { els.forEach((e) => e.children.unshift(...(o && o.els ? o.els : [o]))); return c; },
      appendTo(t) { t.els.forEach((e) => e.children.push(...els)); return c; },
    };
    return c;
  }

  const $ = (arg, props) => {
    if (typeof arg === 'function') { arg($); return undefined; }
    if (arg === document) return { ready: (fn) => fn($), on: (t, sel, fn) => delegated.push({ t, sel, fn }) };
    if (typeof arg === 'string' && arg.startsWith('<')) return wrap([makeEl({ tagName: arg.slice(1, -1).toUpperCase(), ...props })]);
    if (typeof arg === 'string') return wrap([...(nodes[arg] || [])]);
    return wrap([arg]);
  };
  $.trim = (s) => String(s == null ? '' : s).trim();
  window.jQuery = window.$ = $;

  const context = vm.createContext({
    window,
    document,
    location,
    jQuery: $,
    $,
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(session),
    URL,
    URLSearchParams,
    setTimeout: window.setTimeout,
    console,
    ...globals,
  });
  window.localStorage = context.localStorage;
  window.sessionStorage = context.sessionStorage;
  vm.runInContext(SOURCE, context);
  const fire = (target, type) => ((target === 'doc' ? docListeners : winListeners)[type] || []).forEach((fn) => fn({}));
  const delegate = (t, sel, el, e = {}) => delegated
    .filter((d) => d.t === t && (sel == null || d.sel === sel))
    .forEach((d) => d.fn.call(el, { type: t, preventDefault() {}, ...e }));
  return { window, document, location, timers, fire, delegate, delegated, docListeners, winListeners };
}

function sourceChecks(name) {
  const lines = SOURCE.trimEnd().split('\n');
  test(`${name} source: one header comment on line 1 and no other comments`, () => {
    assert.match(lines[0], /^\/\/ \S/);
    lines.slice(1).forEach((l, i) => {
      assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
      assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
      assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
    });
  });
  test(`${name} source: no {{wf tokens`, () => {
    assert.ok(!SOURCE.includes('{{wf'));
  });
  test(`${name} source: console.log only behind DEBUG &&`, () => {
    const all = SOURCE.match(/console\.log/g) || [];
    const gated = SOURCE.match(/DEBUG && console\.log/g) || [];
    assert.equal(all.length, gated.length);
    if (all.length) assert.match(SOURCE, /var DEBUG = false;/);
  });
  test(`${name} source: DOMContentLoaded and load listeners only inside onReady/onLoad`, () => {
    assert.ok((SOURCE.match(/DOMContentLoaded/g) || []).length <= 1);
    assert.ok((SOURCE.match(/addEventListener\('load'/g) || []).length <= 1);
    assert.doesNotMatch(SOURCE, /addEventListener\("(DOMContentLoaded|load)"/);
    assert.doesNotMatch(SOURCE, /\$\(window\)\.on\(['"]load/);
  });
  test(`${name} source: classic script with the marker gate first`, () => {
    assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
    assert.doesNotMatch(SOURCE, /^(const|let)\s/m);
    assert.equal(lines[1], '(function ($) {');
    assert.equal(lines[2].trim(), 'if (!window.__CARSA_PAGE) return;');
    assert.equal(lines[3].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${name}');`);
    assert.equal(lines[lines.length - 1], '})(window.jQuery);');
  });
}

function markerTests(name, opts = {}) {
  test(`${name}: without the marker nothing runs and __CARSA_RAN stays undefined`, () => {
    const env = makeEnv({ ...opts, marker: null });
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.location.replacedWith, undefined);
    assert.equal(env.document.title, opts.title || '');
  });
  test(`${name}: with the marker it pushes its name once`, () => {
    const env = makeEnv(opts);
    assert.deepEqual([...env.window.__CARSA_RAN], [name]);
  });
}

sourceChecks(MODULE);

const DEALS = '/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=';

function run(promo, extra = {}) {
  const btns = [makeEl(), makeEl()];
  const config = promo === undefined ? {} : { __CARSA_PROMO: promo };
  const env = makeEnv({ pathname: '/used-cars/promotions/black-friday', config, nodes: { '[data-button="search-offer"]': btns }, ...extra });
  return { env, btns };
}

markerTests(MODULE, { config: { __CARSA_PROMO: { pillDescription: 'Black Friday' } } });

test('promotions: search-offer buttons link to the deals filter for the pill description', () => {
  const { btns } = run({ pillDescription: 'Black Friday £500 off' });
  btns.forEach((b) => assert.equal(b.attrs.href, DEALS + encodeURIComponent('Black Friday £500 off')));
});

test('promotions: surrounding whitespace is trimmed, as the inline .trim() did', () => {
  const { btns } = run({ pillDescription: '  EV Deals \n' });
  assert.equal(btns[0].attrs.href, DEALS + 'EV%20Deals');
});

test('promotions: an empty pill description gives the bare filter link, as an empty CMS field did', () => {
  const { btns } = run({ pillDescription: '' });
  assert.equal(btns[0].attrs.href, DEALS);
});

test('promotions: a missing key behaves like an empty CMS field', () => {
  const { btns } = run({});
  assert.equal(btns[0].attrs.href, DEALS);
});

test('promotions: non-string values are coerced to strings', () => {
  const { btns } = run({ pillDescription: 500 });
  assert.equal(btns[0].attrs.href, DEALS + '500');
});

test('promotions: a missing window.__CARSA_PROMO skips the link without throwing and still records the run', () => {
  const { env, btns } = run(undefined);
  assert.equal(btns[0].attrs.href, undefined);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.equal(env.timers.length, 0);
});

test('promotions: no promo/encoded/url globals leak onto window', () => {
  const { env } = run({ pillDescription: 'X' });
  assert.equal(env.window.promo, undefined);
  assert.equal(env.window.url, undefined);
});
