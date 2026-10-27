// Unit tests for Carsa faq-schema.js: runs the real file in a vm sandbox with a fake clock, stub FAQ items and a stub Finsweet Attributes list that loads in batches, checking the marker gate, both gates and that the /faq JSON-LD lists every loaded question.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'faq-schema.js'), 'utf8');
const ITEM = '[data-faq-question]';

const flush = () => new Promise((r) => setImmediate(r));

function faqItem(n) {
  const answer = { textContent: `  Answer ${n}\n ` };
  const item = { querySelector: (s) => (s === '[data-faq-answer]' ? answer : null) };
  return { textContent: `Question ${n}?`, closest: (s) => (s === '[data-faq-item]' ? item : null) };
}

function items(from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(faqItem(i));
  return out;
}

function container(rendered) {
  const listElement = { id: 'list' };
  return {
    rendered,
    listElement,
    querySelectorAll: (s) => (s === ITEM ? rendered : []),
    contains: (o) => o === listElement,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function makeEnv({ path = '/faq', marker = true, readyState = 'complete', scope = null, section = null, preset = {} } = {}) {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  const head = { children: [], appendChild: (c) => head.children.push(c) };
  const document = {
    readyState,
    head,
    addEventListener() {},
    createElement: (tag) => ({ tagName: tag.toUpperCase(), dataset: {}, type: '', text: '' }),
    querySelector: (s) => {
      if (s === '#faq-schema-list') return scope;
      if (s === '#section-faq') return section;
      if (s === 'script[data-faq-jsonld]') return head.children.find((c) => c.dataset.faqJsonld) || null;
      return null;
    },
    querySelectorAll: (s) => (s === ITEM ? [...((scope && scope.rendered) || []), ...((section && section.rendered) || [])] : []),
  };
  const add = (fn, ms, every) => {
    const id = ++seq;
    timers.set(id, { fn, at: now + (ms || 0), every: every ? ms : 0 });
    return id;
  };
  const clock = {
    setTimeout: (fn, ms) => add(fn, ms, false),
    setInterval: (fn, ms) => add(fn, ms, true),
    clearTimeout: (id) => timers.delete(id),
    clearInterval: (id) => timers.delete(id),
  };
  const location = { pathname: path, search: '' };
  const window = { location, addEventListener() {}, ...clock, ...preset };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  const jQuery = (arg) => (typeof arg === 'function' ? arg() : {});
  window.jQuery = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    performance: { now: () => now },
    ...clock,
    console,
  });
  vm.runInContext(SOURCE, context);

  const advance = (ms) => {
    const end = now + ms;
    while (now < end) {
      now += 50;
      for (const [id, t] of [...timers]) {
        if (!timers.has(id) || t.at > now) continue;
        if (t.every) t.at = now + t.every;
        else timers.delete(id);
        t.fn();
      }
    }
  };
  const schemas = () => head.children.filter((c) => c.dataset.faqJsonld);
  const count = () => (schemas()[0] ? JSON.parse(schemas()[0].text).mainEntity.length : 0);
  const listCallbacks = () => (window.FinsweetAttributes || []).filter((e) => Array.isArray(e) && e[0] === 'list').map((e) => e[1]);
  return { window, advance, schemas, count, listCallbacks };
}

function instanceFor(scope, { loaded, loading } = {}) {
  const hooks = [];
  return {
    hooks,
    listElement: scope.listElement,
    wrapperElement: {},
    items: { value: loaded },
    loadingPaginatedItems: loading,
    addHook: (name, fn) => hooks.push({ name, fn }),
    afterRender() {
      hooks.filter((h) => h.name === 'afterRender').forEach((h) => h.fn(this.items.value));
    },
  };
}

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const env = makeEnv({ marker: false, scope: container(items(1, 3)) });
  assert.equal(env.window.__CARSA_RAN, undefined);
  assert.equal(env.window.FinsweetAttributes, undefined);
  env.advance(20000);
  assert.equal(env.schemas().length, 0);
});

test('marker gate: with the marker the module records itself once', () => {
  assert.deepEqual([...makeEnv({ scope: container(items(1, 3)) }).window.__CARSA_RAN], ['faq-schema.js']);
});

test('faq builder: registers a Finsweet list callback and waits for paginated items before writing once', async () => {
  const scope = container(items(1, 10));
  const env = makeEnv({ scope });
  const cbs = env.listCallbacks();
  assert.equal(cbs.length, 1);

  const loading = deferred();
  const inst = instanceFor(scope, { loaded: items(1, 10), loading: loading.promise });
  const other = { listElement: { id: 'other' }, items: { value: [] } };
  cbs[0]([other, inst]);
  env.advance(3000);
  await flush();
  assert.equal(env.schemas().length, 0, 'no schema while Finsweet is still loading pages');

  inst.items.value = items(1, 15);
  loading.resolve();
  await flush();
  env.advance(300);
  assert.equal(env.schemas().length, 0, 'waits for the DOM to catch up with the loaded items');

  scope.rendered.push(...items(11, 15));
  inst.afterRender();
  assert.equal(env.schemas().length, 1);
  assert.equal(env.count(), 15);
  assert.equal(env.count(), scope.rendered.length);

  env.advance(20000);
  await flush();
  assert.equal(env.schemas().length, 1);
  assert.equal(env.count(), 15);
});

test('faq builder: the schema entries carry normalised question and answer text', async () => {
  const scope = container(items(1, 2));
  const env = makeEnv({ scope });
  env.listCallbacks()[0]([instanceFor(scope, { loaded: items(1, 2) })]);
  await flush();
  env.advance(200);
  const ld = JSON.parse(env.schemas()[0].text);
  assert.equal(ld['@type'], 'FAQPage');
  assert.deepEqual(ld.mainEntity[0], { '@type': 'Question', name: 'Question 1?', acceptedAnswer: { '@type': 'Answer', text: 'Answer 1' } });
  assert.equal(env.schemas()[0].type, 'application/ld+json');
});

test('faq builder: falls back to the stable-count poll when the Finsweet hook never fires', () => {
  const scope = container(items(1, 4));
  const env = makeEnv({ scope });
  env.advance(14000);
  assert.equal(env.schemas().length, 0);
  env.advance(3000);
  assert.equal(env.count(), 4);
});

test('faq builder: still falls back when Finsweet claims the list but its loading never settles', async () => {
  const scope = container(items(1, 6));
  const env = makeEnv({ scope });
  env.listCallbacks()[0]([instanceFor(scope, { loaded: items(1, 6), loading: new Promise(() => {}) })]);
  await flush();
  env.advance(17000);
  assert.equal(env.schemas().length, 1);
  assert.equal(env.count(), 6);
});

test('faq builder: a late Finsweet build replaces the fallback schema in place', async () => {
  const scope = container(items(1, 4));
  const env = makeEnv({ scope });
  env.advance(17000);
  assert.equal(env.count(), 4);
  scope.rendered.push(...items(5, 9));
  env.listCallbacks()[0]([instanceFor(scope, { loaded: items(1, 9) })]);
  await flush();
  env.advance(200);
  assert.equal(env.schemas().length, 1);
  assert.equal(env.count(), 9);
});

test('faq builder: the __FAQ_SCHEMA_INIT__ guard still stops a second run', () => {
  const env = makeEnv({ scope: container(items(1, 3)), preset: { __FAQ_SCHEMA_INIT__: true } });
  assert.equal(env.window.FinsweetAttributes, undefined);
});

test('faq builder: gated on /faq and #faq-schema-list', () => {
  const noList = makeEnv({ scope: null });
  assert.equal(noList.window.FinsweetAttributes, undefined);
  assert.equal(noList.window.__FAQ_SCHEMA_INIT__, undefined);
  const otherPage = makeEnv({ path: '/contact', scope: container(items(1, 3)) });
  assert.deepEqual([...otherPage.window.__CARSA_RAN], ['faq-schema.js']);
  assert.equal(otherPage.window.FinsweetAttributes, undefined);
  otherPage.advance(20000);
  assert.equal(otherPage.schemas().length, 0);
});

test('faq mini: builds from #section-faq at once on car-finance, part-exchange and value-car', () => {
  for (const p of ['/car-finance', '/sell-car/part-exchange', '/sell-car/value-car/']) {
    const env = makeEnv({ path: p, section: container(items(1, 3)) });
    assert.equal(env.count(), 3, p);
    assert.equal(env.window.__FAQ_SCHEMA_MINI__, true);
    assert.equal(env.window.FinsweetAttributes, undefined);
  }
});

test('faq mini: a marked page outside its list, or without #section-faq, gets nothing', () => {
  for (const p of ['/reserve', '/sell-car', '/faq']) {
    const env = makeEnv({ path: p, section: container(items(1, 3)) });
    assert.equal(env.schemas().length, 0, p);
    assert.equal(env.window.__FAQ_SCHEMA_MINI__, undefined, p);
  }
  const bare = makeEnv({ path: '/car-finance' });
  assert.equal(bare.schemas().length, 0);
  assert.equal(bare.window.__FAQ_SCHEMA_MINI__, undefined);
});

test('source: marker gate is the first statement in the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('faq-schema\.js'\);/m);
});

test('source: builds from the Finsweet v2 list callback', () => {
  assert.match(SOURCE, /window\.FinsweetAttributes = window\.FinsweetAttributes \|\| \[\];/);
  assert.match(SOURCE, /window\.FinsweetAttributes\.push\(\['list', /);
  assert.match(SOURCE, /loadingPaginatedItems/);
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  (SOURCE.match(/.{0,9}console\.log/g) || []).forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: every DOMContentLoaded listener sits behind a readyState check', () => {
  const lines = SOURCE.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('DOMContentLoaded')) assert.match(lines[i - 1], /document\.readyState === 'loading'/, `line ${i + 1}`);
  });
  assert.equal((SOURCE.match(/addEventListener\('load'/g) || []).length, 1);
  assert.ok(!/\.on\(['"]load/.test(SOURCE));
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
