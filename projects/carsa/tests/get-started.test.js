// Unit tests for Carsa get-started.js: runs the real file in a vm sandbox with a stub DOM, a minimal jQuery and a GSAP stub and checks the five get-started blocks and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'get-started.js';
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

markerTests(MODULE, { pathname: '/get-started', search: '?vrm=ab12cde' });

function radio(id, { checked = false, name = 'booking', field = null } = {}) {
  return makeEl({ id, name, checked, closest: (s) => (s === '.radio3_field' ? field : null) });
}

test('get-started URL data: adds the hidden vrm input, fills location/vrm text and hides the free test drive for storage', () => {
  const form = makeEl();
  const loc = makeEl();
  const vrmText = makeEl();
  const ftd = makeEl();
  makeEnv({
    pathname: '/get-started',
    search: '?vrm=AB12CDE&location=Leeds&storage=true',
    nodes: { form: [form], '[data-text="location"]': [loc], '[data-text="vrm"]': [vrmText], '#free-test-drive': [ftd] },
  });
  assert.equal(form.children.length, 1);
  assert.equal(form.children[0].tagName, 'INPUT');
  assert.equal(form.children[0].type, 'hidden');
  assert.equal(form.children[0].name, 'vrm');
  assert.equal(form.children[0].value, 'AB12CDE');
  assert.equal(loc.textContent, 'Leeds');
  assert.equal(vrmText.textContent, 'AB12CDE');
  assert.equal(ftd.style.display, 'none');
});

test('get-started booking link: a pre-checked radio sets #book-button with UTMs and referrer, the note and #back-button', () => {
  const reserve = radio('reserve-collect', { checked: true });
  const free = radio('test-drive-free');
  const book = makeEl();
  book.classList.add('is-disabled');
  const note = makeEl();
  const back = makeEl();
  makeEnv({
    pathname: '/get-started',
    search: '?vrm=AB12CDE',
    local: { attribution: JSON.stringify({ utms: { utm_source: 'google' }, referrerDomain: 'bing.com' }) },
    nodes: {
      'input[type="radio"]': [reserve, free],
      'input[type="radio"]:checked': [reserve],
      '#book-button': [book],
      '#reservation-note': [note],
      '#back-button': [back],
    },
  });
  const href = new URL(book.attrs.href);
  assert.equal(href.origin + href.pathname, 'https://quote.carsa.co.uk/build-deal/AB12CDE');
  assert.equal(href.searchParams.get('utm_source'), 'google');
  assert.equal(href.searchParams.get('referrer'), 'bing.com');
  assert.equal(book.attrs.target, '_blank');
  assert.equal(book.attrs['data-analytics-event'], 'reserve-collect-submit');
  assert.equal(book.textContent, 'Reserve & collect');
  assert.equal(book.classList.contains('is-disabled'), false);
  assert.equal(note.style.opacity, 1);
  assert.equal(back.attrs.href, 'https://www.carsa.co.uk/vehicles/used/AB12CDE');
  assert.equal(back.attrs.target, '_self');
  free.listeners.change[0].call(free, {});
  assert.equal(book.textContent, 'Book free test drive');
  assert.equal(note.style.opacity, 0);
  assert.equal(note.style.pointerEvents, 'none');
});

test('get-started squiggle: a radio change shows the checked squiggle and hides the others in its group', () => {
  const sqA = makeEl();
  const sqB = makeEl();
  const fieldA = makeEl({ querySelectorAll: (s) => (s === '.booking-options-squiggle' ? [sqA] : []) });
  const fieldB = makeEl({ querySelectorAll: (s) => (s === '.booking-options-squiggle' ? [sqB] : []) });
  const a = radio('a', { checked: true, field: fieldA });
  const b = radio('b', { field: fieldB });
  const env = makeEnv({ pathname: '/get-started', nodes: { 'input[name="booking"]': [a, b] } });
  env.delegate('change', 'input[type="radio"]', a);
  assert.equal(sqA.style.opacity, 0.75);
  assert.equal(sqB.style.opacity, 0);
});

test('get-started draw-line: defines svg.__svgDrawPlay and a checked radio plays its field\'s SVG', () => {
  let played = 0;
  const path = makeEl({ getTotalLength: () => 120 });
  const svg = makeEl({ querySelectorAll: () => [path] });
  const wrapper = makeEl({ querySelectorAll: (s) => (s === 'svg' ? [svg] : []) });
  const field = makeEl({ querySelectorAll: (s) => (s === '[data-svg="draw-line"] svg' ? [svg] : []) });
  const r = radio('reserve-collect', { checked: true, field });
  const gsap = {
    registerPlugin() {},
    timeline: () => ({ to() { return this; } }),
    to: () => ({ pause() { return this; }, play() { played++; return this; } }),
  };
  const env = makeEnv({
    pathname: '/get-started',
    nodes: { '[data-svg="draw-line"]': [wrapper] },
    globals: { gsap, getComputedStyle: () => ({ stroke: '#000', strokeWidth: '2' }) },
  });
  assert.equal(typeof svg.__svgDrawPlay, 'function');
  assert.equal(path.style.strokeDasharray, '120 120');
  env.delegate('change', 'input[type="radio"]', r);
  assert.equal(played, 1);
});

test('get-started draw-line: without gsap only the squiggle handler is delegated', () => {
  const env = makeEnv({ pathname: '/get-started' });
  assert.equal(env.delegated.length, 1);
});

test('get-started meta title: ?vrm= upper-cases into the title and meta titles', () => {
  const meta = makeEl();
  const env = makeEnv({ pathname: '/get-started', search: '?vrm=ab12cde', nodes: { 'meta[name="title"], meta[property="og:title"]': [meta] } });
  assert.equal(env.document.title, 'Get Started With AB12CDE | Carsa');
  assert.equal(meta.attrs.content, 'Get Started With AB12CDE | Carsa');
});
