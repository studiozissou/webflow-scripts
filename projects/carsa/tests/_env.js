// Shared vm harness for the Carsa unit tests: loads helpers.js into a sandbox and builds the stub window, document, storage and minimal jQuery the module tests run against.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HELPERS_SOURCE = readFileSync(join(__dirname, '..', 'helpers.js'), 'utf8');
export const MARKER = { release: 'v1.2.0' };

export function loadHelpers(context) {
  vm.runInContext(HELPERS_SOURCE, context);
  return context.window.__CARSA;
}

export function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

export function makeEl(props = {}) {
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

function makeJQuery({ document, nodes, delegated }) {
  const dataStore = new WeakMap();
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
  return $;
}

export function makeEnv(source, { marker = MARKER, config = {}, nodes = {}, search = '', pathname = '/', readyState = 'complete', title = '', referrer = '', local = {}, session = {}, globals = {}, helpers = true, jquery = true } = {}) {
  const docListeners = {};
  const winListeners = {};
  const delegated = [];
  const timers = [];
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
  const $ = jquery ? makeJQuery({ document, nodes, delegated }) : undefined;
  if ($) window.jQuery = window.$ = $;

  const context = vm.createContext({
    window,
    document,
    location,
    ...($ ? { jQuery: $, $ } : {}),
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
  const H = helpers ? loadHelpers(context) : undefined;
  if (source) vm.runInContext(source, context);
  const fire = (target, type) => ((target === 'doc' ? docListeners : winListeners)[type] || []).forEach((fn) => fn({}));
  const delegate = (t, sel, el, e = {}) => delegated
    .filter((d) => d.t === t && (sel == null || d.sel === sel))
    .forEach((d) => d.fn.call(el, { type: t, preventDefault() {}, ...e }));
  return { window, document, location, context, H, $, timers, fire, delegate, delegated, docListeners, winListeners };
}
