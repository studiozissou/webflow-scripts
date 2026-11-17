// Unit tests for the shared experiment runner: runs the real file in a vm sandbox with a stub document, fake timers and a fake window.posthog.
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', '..', 'shared', 'experiments.js'), 'utf8');

afterEach(() => mock.timers.reset());

function makeElement(tag = 'div') {
  const attributes = {};
  const classes = new Set();
  const children = [];
  return {
    tagName: tag.toUpperCase(),
    attributes,
    children,
    id: '',
    textContent: '',
    classes,
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => {
      attributes[k] = String(v);
    },
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    hasAttribute: (k) => k in attributes,
    removeAttribute: (k) => {
      delete attributes[k];
    },
    appendChild: (el) => {
      children.push(el);
      return el;
    },
  };
}

function makePosthog(flags = {}) {
  const calls = { getFeatureFlag: [], personProps: [] };
  let cb = null;
  const ph = {
    calls,
    __loaded: true,
    featureFlags: { getFlags: () => Object.keys(flags) },
    getFeatureFlag: (k) => {
      calls.getFeatureFlag.push(k);
      return flags[k] ? flags[k].variant : undefined;
    },
    getFeatureFlagPayload: (k) => (flags[k] ? flags[k].payload : undefined),
    onFeatureFlags: (fn) => {
      cb = fn;
      fn(Object.keys(flags));
      return () => {};
    },
    setPersonPropertiesForFlags: (p) => calls.personProps.push(p),
    fire: () => cb(Object.keys(flags)),
  };
  return ph;
}

function setup({ posthog, search = '', stored = null, nodes = {} } = {}) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const html = makeElement('html');
  const head = makeElement('head');
  const observers = [];
  const store = new Map(stored ? [['exp-preview', stored]] : []);
  const document = {
    documentElement: html,
    head,
    getElementById: (id) => head.children.find((c) => c.id === id) || null,
    createElement: (tag) => makeElement(tag),
    querySelectorAll: (sel) => nodes[sel] || [],
  };
  class FakeObserver {
    constructor(fn) {
      this.fn = fn;
      this.opts = null;
      observers.push(this);
    }
    observe(target, opts) {
      this.target = target;
      this.opts = opts;
    }
    disconnect() {}
  }
  const window = {
    document,
    location: { search },
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    MutationObserver: FakeObserver,
  };
  if (posthog) window.posthog = posthog;
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    URLSearchParams,
    MutationObserver: FakeObserver,
    setTimeout: (...a) => globalThis.setTimeout(...a),
    clearTimeout: (...a) => globalThis.clearTimeout(...a),
    setInterval: (...a) => globalThis.setInterval(...a),
    clearInterval: (...a) => globalThis.clearInterval(...a),
  });
  vm.runInContext(SOURCE, context);
  const tick = (ms) => mock.timers.tick(ms);
  const styleText = () => {
    const s = document.getElementById('experiments');
    return s ? s.textContent : null;
  };
  return { window, document, html, head, observers, store, tick, styleText };
}

const SWAP = {
  ops: [
    { selector: '[data-sz-story="c"]', action: 'show' },
    { selector: '[data-sz-story="d"]', action: 'hide' },
  ],
};

test('does nothing without posthog but still exposes a version string', () => {
  const env = setup();
  env.tick(11000);
  assert.equal(typeof env.window.__EXPERIMENTS.version, 'string');
  assert.equal(env.styleText(), null);
  assert.deepEqual(Object.keys(env.html.attributes), []);
});

test('polls until posthog is loaded, then applies', () => {
  const env = setup();
  const ph = makePosthog({ 'exp-home-story': { variant: 'test', payload: SWAP } });
  ph.__loaded = false;
  env.window.posthog = ph;
  env.tick(1000);
  assert.equal(env.html.getAttribute('data-exp-home-story'), null);
  ph.__loaded = true;
  env.tick(250);
  assert.equal(env.html.getAttribute('data-exp-home-story'), 'test');
});

test('stops polling after 10 seconds', () => {
  const env = setup();
  env.tick(10500);
  env.window.posthog = makePosthog({ 'exp-a': { variant: 'test', payload: SWAP } });
  env.tick(2000);
  assert.equal(env.html.getAttribute('data-exp-a'), null);
});

test('show and hide become rules scoped by the html attribute', () => {
  const env = setup({ posthog: makePosthog({ 'exp-home-story': { variant: 'test', payload: SWAP } }) });
  env.tick(0);
  assert.equal(env.html.getAttribute('data-exp-home-story'), 'test');
  const css = env.styleText();
  assert.ok(css.includes('html[data-exp-home-story="test"] :is([data-sz-story="c"]){display:revert!important}'));
  assert.ok(css.includes('html[data-exp-home-story="test"] :is([data-sz-story="d"]){display:none!important}'));
  assert.equal(env.head.children.filter((c) => c.id === 'experiments').length, 1);
  assert.deepEqual({ ...env.window.__EXPERIMENTS.applied }, { 'exp-home-story': 'test' });
});

test('css op writes its value as declarations', () => {
  const payload = { ops: [{ selector: '.hero', action: 'css', value: 'color:red;opacity:.5' }] };
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'b', payload } }) });
  assert.ok(env.styleText().includes('html[data-exp-a="b"] :is(.hero){color:red;opacity:.5}'));
});

test('a selector list is scoped as one :is() group, so commas inside it stay intact', () => {
  const payload = { ops: [{ selector: '.a, :is(.b, .c)', action: 'hide' }] };
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'b', payload } }) });
  assert.ok(env.styleText().includes('html[data-exp-a="b"] :is(.a, :is(.b, .c)){display:none!important}'));
});

test('braces in a selector or css value are rejected, so a payload cannot break out of its rule', () => {
  const payload = {
    ops: [
      { selector: '.x}body{display:none', action: 'hide' },
      { selector: '.y', action: 'css', value: 'color:red}body{display:none' },
      { selector: '.z', action: 'hide' },
    ],
  };
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'b', payload } }) });
  const css = env.styleText();
  assert.ok(!css.includes('body{'));
  assert.ok(css.includes('.z){display:none!important}'));
  assert.equal(env.window.__EXPERIMENTS.ops.length, 1);
});

test('re-running apply does not grow the ops list', () => {
  const ph = makePosthog({ 'exp-home-story': { variant: 'test', payload: SWAP } });
  const env = setup({ posthog: ph });
  const before = env.window.__EXPERIMENTS.ops.length;
  ph.fire();
  ph.fire();
  assert.equal(env.window.__EXPERIMENTS.ops.length, before);
});

test('show takes an optional display value for flex or grid wrappers', () => {
  const payload = { ops: [{ selector: '.a', action: 'show', value: 'flex' }, { selector: '.b', action: 'show', value: 'red;x:y' }] };
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'b', payload } }) });
  const css = env.styleText();
  assert.ok(css.includes(':is(.a){display:flex!important}'));
  assert.ok(css.includes(':is(.b){display:revert!important}'));
});

test('payload given as a JSON string is parsed', () => {
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'b', payload: JSON.stringify(SWAP) } }) });
  assert.ok(env.styleText().includes('display:none!important'));
});

test('control with an empty payload adds no css rule and no style tag', () => {
  const env = setup({ posthog: makePosthog({ 'exp-home-story': { variant: 'control', payload: {} } }) });
  assert.equal(env.html.getAttribute('data-exp-home-story'), 'control');
  assert.equal(env.styleText(), null);
});

test('bad JSON does not throw and adds no ops', () => {
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'test', payload: '{not json' } }) });
  assert.equal(env.html.getAttribute('data-exp-a'), 'test');
  assert.equal(env.styleText(), null);
});

test('a bad op does not stop the next op', () => {
  const payload = { ops: [null, { selector: '.x', action: 'nope' }, { selector: '.y', action: 'hide' }] };
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: 'test', payload } }) });
  assert.ok(env.styleText().includes('.y){display:none!important}'));
});

test('flags without the exp- prefix are ignored', () => {
  const ph = makePosthog({ 'product-flag': { variant: 'test', payload: SWAP } });
  const env = setup({ posthog: ph });
  assert.deepEqual(Object.keys(env.html.attributes), []);
  assert.equal(env.styleText(), null);
  assert.deepEqual(ph.calls.getFeatureFlag, []);
});

test('falsy variant is skipped', () => {
  const env = setup({ posthog: makePosthog({ 'exp-a': { variant: false, payload: SWAP } }) });
  assert.deepEqual(Object.keys(env.html.attributes), []);
});

test('getFeatureFlag is called for the exp flag', () => {
  const ph = makePosthog({ 'exp-home-story': { variant: 'test', payload: {} } });
  setup({ posthog: ph });
  assert.ok(ph.calls.getFeatureFlag.includes('exp-home-story'));
});

test('one exposure per flag even when apply runs twice', () => {
  const ph = makePosthog({ 'exp-home-story': { variant: 'test', payload: SWAP } });
  const env = setup({ posthog: ph });
  ph.fire();
  ph.fire();
  const events = env.window.dataLayer.filter((e) => e.event === 'experiment_exposure');
  assert.equal(events.length, 1);
  assert.equal(events[0].exp_flag, 'exp-home-story');
  assert.equal(events[0].exp_variant, 'test');
  assert.equal(env.head.children.filter((c) => c.id === 'experiments').length, 1);
});

test('exp-preview=1 sets the person property, stores it, and repeats on later pages', () => {
  const first = setup({ posthog: makePosthog({}), search: '?exp-preview=1' });
  assert.equal(first.store.get('exp-preview'), '1');
  assert.equal(JSON.stringify(first.window.posthog.calls.personProps), '[{"exp_preview":"yes"}]');
  const later = setup({ posthog: makePosthog({}), stored: '1' });
  assert.equal(JSON.stringify(later.window.posthog.calls.personProps), '[{"exp_preview":"yes"}]');
});

test('exp-preview=0 clears the stored flag and sets no property', () => {
  const env = setup({ posthog: makePosthog({}), search: '?exp-preview=0', stored: '1' });
  assert.equal(env.store.has('exp-preview'), false);
  assert.deepEqual(env.window.posthog.calls.personProps, []);
});

test('class-add, class-remove and text ops apply and mark elements', () => {
  const a = makeElement();
  const b = makeElement();
  b.classList.add('old');
  const c = makeElement();
  const payload = {
    ops: [
      { selector: '.a', action: 'class-add', value: 'one two' },
      { selector: '.b', action: 'class-remove', value: 'old' },
      { selector: '.c', action: 'text', value: 'Hello' },
    ],
  };
  const env = setup({
    posthog: makePosthog({ 'exp-x': { variant: 'v', payload } }),
    nodes: { '.a': [a], '.b': [b], '.c': [c] },
  });
  assert.ok(a.classes.has('one') && a.classes.has('two'));
  assert.equal(b.classes.has('old'), false);
  assert.equal(c.textContent, 'Hello');
  assert.ok('data-exp-applied-x' in a.attributes);
  assert.equal(env.styleText(), null);
});

test('a debounced observer applies class ops to nodes added later', () => {
  const nodes = { '.late': [] };
  const payload = { ops: [{ selector: '.late', action: 'class-add', value: 'on' }] };
  const env = setup({ posthog: makePosthog({ 'exp-x': { variant: 'v', payload } }), nodes });
  assert.equal(env.observers.length, 1);
  assert.equal(env.observers[0].target, env.document.documentElement);
  assert.equal(env.observers[0].opts.subtree, true);
  assert.equal(env.observers[0].opts.childList, true);
  const late = makeElement();
  nodes['.late'] = [late];
  env.observers[0].fn([]);
  env.observers[0].fn([]);
  assert.equal(late.classes.has('on'), false);
  env.tick(200);
  assert.ok(late.classes.has('on'));
  env.observers[0].fn([]);
  env.tick(200);
  assert.equal(late.getAttribute('data-exp-applied-x').split(' ').length, 1);
});

test('never throws when posthog methods throw', () => {
  const boom = () => {
    throw new Error('boom');
  };
  const cases = [
    (ph) => (ph.featureFlags.getFlags = boom),
    (ph) => (ph.getFeatureFlag = boom),
    (ph) => (ph.getFeatureFlagPayload = boom),
    (ph) => (ph.onFeatureFlags = boom),
    (ph) => (ph.setPersonPropertiesForFlags = boom),
  ];
  for (const breakIt of cases) {
    const ph = makePosthog({ 'exp-a': { variant: 'v', payload: SWAP } });
    breakIt(ph);
    assert.doesNotThrow(() => {
      const env = setup({ posthog: ph, search: '?exp-preview=1' });
      env.tick(11000);
    });
  }
});

test('never throws when sessionStorage is blocked', () => {
  const ph = makePosthog({});
  assert.doesNotThrow(() => {
    setup({ posthog: ph, search: '?exp-preview=1' }).window.sessionStorage.getItem = () => {
      throw new Error('blocked');
    };
  });
});
