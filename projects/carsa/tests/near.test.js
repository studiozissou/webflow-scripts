// Unit tests for Carsa near.js: runs the real file in a vm sandbox with a stub DOM, a recording chainable jQuery and a recording FinsweetAttributes queue.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadHelpers } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'near.js'), 'utf8');

function makeEl(extra = {}) {
  const listeners = {};
  const attrs = {};
  return {
    listeners,
    attrs,
    value: '',
    textContent: '',
    style: {},
    classList: { add() {}, remove() {}, contains: () => false },
    addEventListener: (t, fn, opts) => (listeners[t] ||= []).push({ fn, opts }),
    removeEventListener() {},
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    removeAttribute: (k) => { delete attrs[k]; },
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    ...extra,
  };
}

function makeEnv({ marker = true, readyState = 'complete', path = '/used-cars/near/leeds', search = '', byId = {}, helpers = true, mobile = false, jqOverride = () => undefined, ddLogs } = {}) {
  const docListeners = {};
  const winListeners = {};
  const timers = [];
  const intervals = [];
  const jq = [];
  const ids = { ...byId };
  const appended = [];
  const location = {
    pathname: path,
    search,
    origin: 'https://www.carsa.co.uk',
    href: 'https://www.carsa.co.uk' + path + search,
    replaced: null,
    replace(u) { this.replaced = u; },
    reload() {},
  };

  const document = {
    readyState,
    head: makeEl({ appendChild: (n) => appended.push(n) }),
    getElementById: (id) => ids[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeEl(),
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
  };

  const jQuery = (arg) => {
    const custom = jqOverride(arg, jQuery);
    if (custom) return custom;
    const rec = { arg, calls: [] };
    jq.push(rec);
    const proxy = new Proxy(function () {}, {
      get(_, prop) {
        if (prop === 'length') return 0;
        if (prop === Symbol.toPrimitive) return () => 0;
        return (...args) => {
          rec.calls.push({ method: prop, args });
          if (prop === 'ready' && typeof args[0] === 'function') args[0]();
          return proxy;
        };
      },
    });
    if (typeof arg === 'function') arg();
    return proxy;
  };

  const window = {
    location,
    matchMedia: () => ({ matches: mobile }),
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    jQuery,
    $: jQuery,
  };
  if (marker) window.__CARSA_PAGE = 'near';
  if (ddLogs) window.DD_LOGS = ddLogs;

  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    URL,
    URLSearchParams,
    setTimeout: window.setTimeout,
    clearTimeout() {},
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    clearInterval() {},
    MutationObserver: class { observe() {} },
    history: { replaceState() {} },
    Event: class { constructor(type) { this.type = type; } },
    console,
  });
  window.window = window;
  window.document = document;
  if (helpers) loadHelpers(context);
  vm.runInContext(SOURCE, context);
  return {
    window, document, location, timers, intervals, jq, docListeners, winListeners, appended,
    fire(target, type) {
      (target === 'doc' ? docListeners : winListeners)[type]?.forEach((fn) => fn({ type }));
    },
    handlers(selector, method, event) {
      return jq
        .filter((r) => r.arg === selector)
        .flatMap((r) => r.calls)
        .filter((c) => c.method === method && (event === undefined || c.args[0] === event))
        .map((c) => c.args[c.args.length - 1]);
    },
  };
}

function formEl() {
  const done = makeEl();
  const fail = makeEl();
  const parent = makeEl({ querySelector: (s) => (s === '.w-form-done' ? done : s === '.w-form-fail' ? fail : null) });
  const form = makeEl({ closest: (s) => (s === '.w-form' ? parent : null) });
  return { form, done, fail };
}

function submitEvent() {
  const ev = { type: 'submit', prevented: false, stopped: false };
  ev.preventDefault = () => { ev.prevented = true; };
  ev.stopImmediatePropagation = () => { ev.stopped = true; };
  return ev;
}

function makeSelect() {
  const el = { value: '', options: [], disabled: false, classes: new Set(), handlers: {}, events: [] };
  el.dispatchEvent = (e) => el.events.push(e.type);
  return el;
}

function wrapSelect(el) {
  const w = {
    length: 1,
    0: el,
    off(t) { delete el.handlers[t]; return w; },
    html() { el.options = []; return w; },
    append(opt) { el.options.push(opt); return w; },
    val(v) { if (v === undefined) return el.value; el.value = v; return w; },
    prop(k, v) { el[k] = v; return w; },
    addClass(c) { el.classes.add(c); return w; },
    removeClass(c) { el.classes.delete(c); return w; },
    on(t, fn) { el.handlers[t] = fn; return w; },
  };
  return w;
}

function dropdownEnv({ data, mobile = false, search = '' } = {}) {
  const make = makeSelect();
  const model = makeSelect();
  const items = (data || [
    { 'make-title': 'Ford', 'make-slug': 'ford', 'model-title': 'Puma', 'model-slug': 'ford-puma' },
    { 'make-title': 'Ford', 'make-slug': 'ford', 'model-title': 'Focus', 'model-slug': 'ford-focus' },
    { 'make-title': 'Audi', 'make-slug': 'audi', 'model-title': 'A3', 'model-slug': 'audi-a3' },
  ]).map((attrs) => ({ dataAttrs: attrs }));
  const jqOverride = (arg) => {
    if (arg === '[name="make"]') return wrapSelect(make);
    if (arg === '[name="model"]') return wrapSelect(model);
    if (arg === '.model-data') return { each(fn) { items.forEach((it, i) => fn.call(it, i, it)); } };
    if (arg && arg.dataAttrs) return { attr: (k) => arg.dataAttrs[k] };
    return undefined;
  };
  const env = makeEnv({ mobile, search, jqOverride });
  env.window.FinsweetAttributes[1][1]([{ instance: 'models', addHook() {} }]);
  const docOn = env.jq.filter((r) => r.arg === env.document).flatMap((r) => r.calls).filter((c) => c.method === 'on');
  const submit = docOn.find((c) => c.args[0] === 'click' && c.args[1] === '#mobile-search-submit').args[2];
  const filterChange = docOn.find((c) => c.args[0] === 'change' && c.args[1] === '[fs-list-field]').args[2];
  const choose = (sel, v) => { sel.value = v; sel.handlers['change.carsa'].call(sel); };
  return { ...env, make, model, submit, filterChange, choose, startHref: env.location.href };
}

test('module contract: without window.__CARSA it warns to DD_LOGS and returns before the marker push', () => {
  const warns = [];
  const env = makeEnv({ helpers: false, ddLogs: { logger: { warn: (m) => warns.push(m) } } });
  assert.deepEqual(warns, ['near.js: window.__CARSA missing']);
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.window.FinsweetAttributes, undefined);
  assert.equal(env.jq.length, 0);
});

test('module contract: without window.__CARSA or DD_LOGS it returns quietly', () => {
  const env = makeEnv({ helpers: false });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.timers.length, 0);
});

test('near make/model: the models list fills make with Any plus sorted unique makes and disables model', () => {
  const env = dropdownEnv();
  assert.deepEqual(env.make.options.map((o) => o.value), ['', 'Audi', 'Ford']);
  assert.deepEqual(env.make.options.map((o) => o.textContent), ['Any', 'Audi', 'Ford']);
  assert.equal(env.make.value, '');
  assert.deepEqual(env.model.options.map((o) => o.value), ['']);
  assert.equal(env.model.disabled, true);
  assert.ok(env.model.classes.has('is-disabled'));
});

test('near make/model: choosing a make fills and enables model, resets it and fires input and change', () => {
  const env = dropdownEnv();
  env.model.value = 'stale';
  env.choose(env.make, 'Ford');
  assert.deepEqual(env.model.options.map((o) => o.value), ['', 'Puma', 'Focus']);
  assert.equal(env.model.disabled, false);
  assert.ok(!env.model.classes.has('is-disabled'));
  assert.equal(env.model.value, '');
  assert.deepEqual(env.model.events, ['input', 'change']);
});

test('near make/model: choosing Any again disables model', () => {
  const env = dropdownEnv();
  env.choose(env.make, 'Ford');
  env.choose(env.make, '');
  assert.equal(env.model.disabled, true);
  assert.deepEqual(env.model.options.map((o) => o.value), ['']);
});

test('near make/model: on desktop a make or model change does not navigate or prefetch', () => {
  const env = dropdownEnv();
  env.choose(env.make, 'Ford');
  env.choose(env.model, 'Puma');
  assert.equal(env.location.href, env.startHref);
  assert.equal(env.appended.length, 0);
});

test('near make/model: on mobile a make change prefetches /used-cars/make/<slug> keeping other filters', () => {
  const env = dropdownEnv({ mobile: true, search: '?cars_sort=desc&cars_model_equal=X' });
  env.choose(env.make, 'Ford');
  assert.equal(env.appended.length, 1);
  assert.equal(env.appended[0].rel, 'prefetch');
  assert.equal(env.appended[0].href, 'https://www.carsa.co.uk/used-cars/make/ford?cars_make_equal=Ford&cars_sort=desc');
  assert.equal(env.location.href, env.startHref);
});

test('near make/model: on mobile a model change prefetches /used-cars/models/<slug>', () => {
  const env = dropdownEnv({ mobile: true });
  env.choose(env.make, 'Ford');
  env.choose(env.model, 'Puma');
  assert.equal(env.appended.at(-1).href, 'https://www.carsa.co.uk/used-cars/models/ford-puma?cars_make_equal=Ford&cars_model_equal=Puma');
});

test('near make/model: mobile submit with a model goes to the model page from the slug map', () => {
  const env = dropdownEnv({ mobile: true, search: '?cars_sort=desc' });
  env.choose(env.make, 'Ford');
  env.choose(env.model, 'Focus');
  env.submit();
  assert.equal(env.location.href, 'https://www.carsa.co.uk/used-cars/models/ford-focus?cars_make_equal=Ford&cars_model_equal=Focus&cars_sort=desc');
});

test('near make/model: mobile submit with only a make goes to /used-cars/make/<slug>', () => {
  const env = dropdownEnv({ mobile: true });
  env.choose(env.make, 'Audi');
  env.submit();
  assert.equal(env.location.href, 'https://www.carsa.co.uk/used-cars/make/audi?cars_make_equal=Audi');
});

test('near make/model: submit with no make or model stays on the near page', () => {
  const env = dropdownEnv({ mobile: true, search: '?cars_sort=desc' });
  env.submit();
  assert.equal(env.location.href, env.startHref);
});

test('near make/model: a model without a slug attribute falls back to slugify', () => {
  const env = dropdownEnv({ mobile: true, data: [{ 'make-title': "Land Rover's", 'model-title': 'Defender 110' }] });
  env.choose(env.make, "Land Rover's");
  env.choose(env.model, 'Defender 110');
  env.submit();
  assert.equal(env.location.href, 'https://www.carsa.co.uk/used-cars/models/defender-110?cars_make_equal=Land+Rover%27s&cars_model_equal=Defender+110');
});

test('near make/model: a mobile non-make filter change prefetches after the debounce', () => {
  const env = dropdownEnv({ mobile: true });
  env.choose(env.make, 'Ford');
  const before = env.appended.length;
  const n = env.timers.length;
  env.filterChange.call({ name: 'fuel' });
  assert.equal(env.timers.length, n + 1);
  env.timers.at(-1)();
  assert.equal(env.appended.length, before + 1);
  assert.equal(env.appended.at(-1).href, 'https://www.carsa.co.uk/used-cars/make/ford?cars_make_equal=Ford');
});

test('near make/model: the models render hook rebuilds the dropdowns', () => {
  const env = dropdownEnv();
  const hooks = {};
  env.window.FinsweetAttributes[1][1]([{ instance: 'models', addHook: (n, fn) => { hooks[n] = fn; } }]);
  env.make.options = [];
  hooks.render();
  assert.deepEqual(env.make.options.map((o) => o.value), ['', 'Audi', 'Ford']);
});

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const { form } = formEl();
  const env = makeEnv({ marker: false, byId: { 'wf-form-Filter-Vehicles': form } });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.window.FinsweetAttributes, undefined);
  assert.equal(form.listeners.submit, undefined);
  assert.equal(env.jq.length, 0);
  assert.equal(env.intervals.length, 0);
});

test('marker gate: with the marker near.js is pushed to __CARSA_RAN once', () => {
  const env = makeEnv();
  assert.deepEqual([...env.window.__CARSA_RAN], ['near.js']);
});

test('no block throws on load (no "filtered is not defined")', () => {
  const { form } = formEl();
  const env = makeEnv({ byId: { 'wf-form-Filter-Vehicles': form, 'desktop-results': makeEl({ textContent: '12' }) } });
  for (const fn of env.timers) assert.doesNotThrow(fn);
  assert.equal(env.timers.length, 0);
});

test('FinsweetAttributes: list loader, make/model, promo cards and near-location callbacks queued in order', () => {
  const env = makeEnv();
  const q = env.window.FinsweetAttributes;
  assert.equal(q.length, 4);
  for (const entry of q) assert.equal(entry[0], 'list');
});

test('list loader: adds filter and afterRender hooks to each list', () => {
  const env = makeEnv();
  const hooks = [];
  env.window.FinsweetAttributes[0][1]([{ addHook: (name) => hooks.push(name) }]);
  assert.deepEqual(hooks, ['filter', 'afterRender']);
});

test('make/model redirect: no "models" list instance means no dropdown work', () => {
  const env = makeEnv();
  const before = env.jq.length;
  env.window.FinsweetAttributes[1][1]([{ instance: 'cars', addHook() { throw new Error('should not hook'); } }]);
  assert.equal(env.jq.length, before);
});

test('make/model redirect: a "models" instance hooks render', () => {
  const env = makeEnv();
  const hooks = [];
  env.window.FinsweetAttributes[1][1]([{ instance: 'models', addHook: (name) => hooks.push(name) }]);
  assert.deepEqual(hooks, ['render']);
});

test('promo cards: hooks afterRender on each list', () => {
  const env = makeEnv();
  const hooks = [];
  env.window.FinsweetAttributes[2][1]([{ addHook: (name) => hooks.push(name) }, { addHook: (name) => hooks.push(name) }]);
  assert.deepEqual(hooks, ['afterRender', 'afterRender']);
});

test('filter-submit-fix: blocks a native submit on #wf-form-Filter-Vehicles and hides Webflow states', () => {
  const { form, done, fail } = formEl();
  makeEnv({ byId: { 'wf-form-Filter-Vehicles': form } });
  assert.equal(form.listeners.submit.length, 1);
  assert.equal(form.listeners.submit[0].opts, true);
  const ev = submitEvent();
  form.listeners.submit[0].fn(ev);
  assert.equal(ev.prevented, true);
  assert.equal(ev.stopped, true);
  assert.equal(done.style.display, 'none');
  assert.equal(fail.style.display, 'none');
});

test('filter-submit-fix: binds on DOMContentLoaded when the form is not there yet', () => {
  const env = makeEnv({ readyState: 'loading' });
  const { form } = formEl();
  env.document.getElementById = (id) => (id === 'wf-form-Filter-Vehicles' ? form : null);
  env.fire('doc', 'DOMContentLoaded');
  assert.equal(form.listeners.submit.length, 1);
});

test('filter-submit-fix: no DOMContentLoaded listener once the DOM is ready (onReady runs at once)', () => {
  const env = makeEnv({ readyState: 'interactive' });
  assert.equal(env.docListeners.DOMContentLoaded, undefined);
});

test('hide mobile filters: load block runs immediately when readyState is complete', () => {
  const env = makeEnv({ readyState: 'complete', byId: { 'desktop-results': makeEl({ textContent: '1,234' }) } });
  assert.equal(env.intervals.length, 1);
  assert.equal(env.intervals[0].ms, 400);
  assert.equal(env.winListeners.load, undefined);
});

test('hide mobile filters: waits for window load while the page is still loading', () => {
  const env = makeEnv({ readyState: 'interactive', byId: { 'desktop-results': makeEl({ textContent: '5' }) } });
  assert.equal(env.intervals.length, 0);
  env.fire('win', 'load');
  assert.equal(env.intervals.length, 1);
});

test('hide mobile filters: swaps the loading link for the filters link after 10 unchanged polls', () => {
  const env = makeEnv({ byId: { 'desktop-results': makeEl({ textContent: '7' }) } });
  for (let i = 0; i < 10; i++) env.intervals[0].fn();
  assert.ok(env.handlers('#mobile-filters-loading-link', 'hide').length === 1);
  assert.ok(env.jq.some((r) => r.arg === '#mobile-filters-link' && r.calls.some((c) => c.method === 'css' && c.args[1] === 'flex')));
});

test('filter accordions: delegated click handler bound on the group heading', () => {
  const env = makeEnv();
  const docOn = env.jq.filter((r) => r.arg === env.document).flatMap((r) => r.calls).filter((c) => c.method === 'on');
  assert.ok(docOn.some((c) => c.args[0] === 'click' && c.args[1] === '.filters1_filter-group-heading'));
});

test('near-location-redirect: a stale cars_location_equal is stripped with location.replace', () => {
  const env = makeEnv({ search: '?cars_location_equal=%5B%22Leeds%22%5D&cars_sort=desc' });
  assert.equal(env.location.replaced, '/used-cars/near/leeds?cars_sort=desc');
  assert.equal(env.window.FinsweetAttributes.length, 3);
});

test('near-location-redirect: binds a bfcache pageshow reload on a near page', () => {
  const env = makeEnv();
  assert.equal(env.winListeners.pageshow.length, 1);
});

test('trim VRM: strips disallowed characters and upper-cases', () => {
  const env = makeEnv();
  const [handler] = env.handlers('#vrm-search', 'on', 'input');
  const input = { value: 'ab-12 c!d' };
  handler.call(input);
  assert.equal(input.value, 'AB12CD');
});

test('source: one comment on line 1 and no other comments', () => {
  const lines = SOURCE.split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  const rest = lines.slice(1).join('\n');
  assert.doesNotMatch(rest, /^\s*\/\//m);
  assert.doesNotMatch(rest, /\/\*/);
  assert.doesNotMatch(rest, /[;{,)]\s+\/\/ /);
});

test('source: no {{wf tokens, console.log only behind DEBUG &&', () => {
  assert.doesNotMatch(SOURCE, /\{\{wf/);
  const logs = SOURCE.match(/.{0,9}console\.log/g) || [];
  for (const l of logs) assert.match(l, /DEBUG && console\.log/);
});

test('source: no bare DOMContentLoaded or load listener, timing via H.onReady/H.onLoad', () => {
  assert.doesNotMatch(SOURCE, /DOMContentLoaded/);
  assert.doesNotMatch(SOURCE, /addEventListener\(\s*'load'/);
  assert.doesNotMatch(SOURCE, /on\(\s*'load/);
  assert.match(SOURCE, /H\.onReady\(blockSubmit\)/);
  assert.match(SOURCE, /H\.onLoad\(windowLoaded\)/);
});

test('source: no local helper copies, every block goes through H.block', () => {
  assert.doesNotMatch(SOURCE, /function (block|onReady|onLoad)\b/);
  assert.doesNotMatch(SOURCE, /\n {2}block\(/);
  assert.equal((SOURCE.match(/\n {2}H\.block\(/g) || []).length, 8);
});

test('source: module contract guard sits before the marker gate', () => {
  const lines = SOURCE.split('\n');
  assert.equal(lines[2].trim(), 'var H = window.__CARSA;');
  assert.equal(lines[3].trim(), 'if (!H) {');
  assert.equal(lines[4].trim(), "if (window.DD_LOGS) window.DD_LOGS.logger.warn('near.js: window.__CARSA missing');");
  assert.equal(lines[5].trim(), 'return;');
  assert.equal(lines[6].trim(), '}');
  assert.equal(lines[7].trim(), 'if (!window.__CARSA_PAGE) return;');
});

test('source: vsrp/make/model page-context branches are gone', () => {
  assert.doesNotMatch(SOURCE, /getPageContext|updateFacetVisibility|ctx\.type|'vsrp'/);
  assert.doesNotMatch(SOURCE, /used-cars\\\/(make|models)\\\/\(/);
  assert.doesNotMatch(SOURCE, /path === '\/used-cars'/);
});

test('source: marker gate and wrapper', () => {
  assert.match(SOURCE, /if \(!window\.__CARSA_PAGE\) return;\n\s*\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('near\.js'\);/);
  assert.match(SOURCE.trimEnd(), /\}\)\(window\.jQuery\);$/);
  assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
});

test('source: search-locations block deleted and no free "filtered" variable', () => {
  assert.doesNotMatch(SOURCE, /data-button="lo/);
  assert.doesNotMatch(SOURCE, /search-locations/);
  const uses = SOURCE.match(/\bfiltered\b/g) || [];
  assert.equal(uses.length, 3);
  assert.match(SOURCE, /var filtered = items\.filter/);
});

test('source: filter-submit-fix runs before every other block', () => {
  assert.ok(SOURCE.indexOf("FORM_ID = 'wf-form-Filter-Vehicles'") < SOURCE.indexOf('window.FinsweetAttributes'));
});
