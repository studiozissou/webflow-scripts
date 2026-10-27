// Unit tests for Carsa models-template.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the meta fallback, the __CARSA_MODELS config coercion, the FAQ JSON-LD scrub (moved from faq-scrub.test.js) and the page-marker gate.
import { describe, it } from 'node:test';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'models-template.js';
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

const DESC_TAIL = ' craftsmanship. Expect responsive engines, refined comfort, advanced infotainment and safety tech packaged in a distinctive design that turns routine drives into rewarding journeys.';
const TITLE_TAIL = ' cars combining style, performance and modern tech. Discover our stock online, choose your favourite and book a test drive.';

function rerunWithHead(models, opts = {}) {
  const description = makeEl();
  const meta = makeEl();
  if (opts.metaContent != null) meta.setAttribute('content', opts.metaContent);
  const metas = opts.metaContent == null ? [] : [meta];
  const headEl = makeEl();
  const nodes = { '#description': [description], head: [headEl] };
  Object.defineProperty(nodes, 'meta[name="description"]', {
    enumerable: true,
    get: () => {
      const appended = headEl.children.map((html) => {
        const m = makeEl();
        m.setAttribute('content', /content="([^"]*)"/.exec(html)[1]);
        return m;
      });
      return [...metas, ...appended];
    },
  });
  const config = models === undefined ? {} : { __CARSA_MODELS: models };
  const env = makeEnv({ pathname: '/used-cars/models/audi-a3', config, nodes, title: opts.title || '' });
  return { env, description, headEl };
}

markerTests(MODULE, { config: { __CARSA_MODELS: { make: 'Audi', name: 'A3' } } });

test('models meta: appends a default description, sets #description and fills an empty title', () => {
  const { env, description, headEl } = rerunWithHead({ make: 'Audi', name: 'A3' });
  const desc = 'The Audi A3 blends everyday practicality with signature Audi' + DESC_TAIL;
  assert.deepEqual(headEl.children, ['<meta name="description" content="' + desc + '">']);
  assert.equal(description.textContent, desc);
  assert.equal(env.document.title, 'Shop used Audi A3' + TITLE_TAIL);
});

test('models meta: keeps an existing description and title', () => {
  const { env, description, headEl } = rerunWithHead({ make: 'Audi', name: 'A3' }, { metaContent: 'Existing', title: 'Audi A3 | Carsa' });
  assert.deepEqual(headEl.children, []);
  assert.equal(description.textContent, 'Existing');
  assert.equal(env.document.title, 'Audi A3 | Carsa');
});

test('models meta: values with surrounding whitespace are trimmed', () => {
  const { env, description } = rerunWithHead({ make: ' Land Rover \n', name: '\tDefender  ' });
  assert.equal(description.textContent, 'The Land Rover Defender blends everyday practicality with signature Land Rover' + DESC_TAIL);
  assert.equal(env.document.title, 'Shop used Land Rover Defender' + TITLE_TAIL);
});

test('models meta: empty values build the text an empty CMS field built', () => {
  const { env, description } = rerunWithHead({ make: '', name: '' });
  assert.equal(description.textContent, 'The   blends everyday practicality with signature ' + DESC_TAIL);
  assert.equal(env.document.title, 'Shop used  ' + TITLE_TAIL);
});

test('models meta: a missing key behaves like an empty CMS field', () => {
  const { description } = rerunWithHead({ make: 'Audi' });
  assert.equal(description.textContent, 'The Audi  blends everyday practicality with signature Audi' + DESC_TAIL);
});

test('models meta: a missing window.__CARSA_MODELS skips the meta block without throwing; the FAQ scrub still runs', () => {
  const scripts = makeScripts([{ '@type': 'FAQPage', mainEntity: [{ name: '', acceptedAnswer: { text: '' } }] }]);
  const description = makeEl();
  const env = makeEnv({ config: {}, nodes: { '#description': [description], 'script[type="application/ld+json"]': scripts } });
  assert.equal(description.textContent, '');
  assert.equal(env.document.title, '');
  assert.equal(scripts[0]._removed, true);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.equal(env.timers.length, 0);
});

function makeScripts(blocks) {
  return blocks.map((json) => {
    const s = { textContent: JSON.stringify(json), _removed: false };
    s.parentNode = { removeChild: (node) => { node._removed = true; node.parentNode = null; } };
    return s;
  });
}

function scrub(blocks, marker = MARKER) {
  const scripts = makeScripts(blocks);
  makeEnv({ marker, config: { __CARSA_MODELS: { make: 'BMW', name: 'X1' } }, nodes: { 'script[type="application/ld+json"]': scripts }, title: 'x' });
  return scripts;
}

describe('FAQ scrub', () => {
  it('keeps all questions when all have name + answer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
      ],
    }]);
    assert.equal(JSON.parse(scripts[0].textContent).mainEntity.length, 2);
    assert.equal(scripts[0]._removed, false);
  });

  it('removes questions with empty name', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
        { '@type': 'Question', name: '  ', acceptedAnswer: { '@type': 'Answer', text: 'A3' } },
      ],
    }]);
    const result = JSON.parse(scripts[0].textContent);
    assert.equal(result.mainEntity.length, 1);
    assert.equal(result.mainEntity[0].name, 'Q1?');
  });

  it('removes questions with empty answer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
      ],
    }]);
    const result = JSON.parse(scripts[0].textContent);
    assert.equal(result.mainEntity.length, 1);
    assert.equal(result.mainEntity[0].name, 'Q2?');
  });

  it('removes questions with missing acceptedAnswer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?' },
      ],
    }]);
    assert.equal(JSON.parse(scripts[0].textContent).mainEntity.length, 1);
  });

  it('removes entire FAQPage block when all questions empty', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } },
      ],
    }]);
    assert.equal(scripts[0]._removed, true);
  });

  it('removes mainEntity #faq ref from CollectionPage when FAQPage removed', () => {
    const graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': 'https://www.carsa.co.uk/used-cars/make/test#webpage',
          mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq' },
        },
        { '@type': 'BreadcrumbList' },
      ],
    };
    const faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [{ '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }],
    };
    const scripts = scrub([faqBlock, graphBlock]);
    assert.equal(scripts[0]._removed, true);
    assert.equal(JSON.parse(scripts[1].textContent)['@graph'][0].mainEntity, undefined);
  });

  it('preserves mainEntity ref when FAQPage has valid questions', () => {
    const graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'CollectionPage', mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq' } }],
    };
    const faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
    };
    const scripts = scrub([faqBlock, graphBlock]);
    const graph = JSON.parse(scripts[1].textContent);
    assert.notEqual(graph['@graph'][0].mainEntity, undefined);
    assert.ok(graph['@graph'][0].mainEntity['@id'].includes('#faq'));
  });

  it('runs synchronously, before DOMContentLoaded', () => {
    const scripts = makeScripts([{ '@type': 'FAQPage', mainEntity: [] }]);
    makeEnv({ readyState: 'loading', config: { __CARSA_MODELS: { make: 'BMW', name: 'X1' } }, nodes: { 'script[type="application/ld+json"]': scripts } });
    assert.equal(scripts[0]._removed, true);
  });

  it('does nothing without the marker', () => {
    const scripts = scrub([{ '@type': 'FAQPage', mainEntity: [] }], null);
    assert.equal(scripts[0]._removed, false);
  });
});
