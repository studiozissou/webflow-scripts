// Unit tests for Studio Zissou tracking.js: runs the real file in a vm sandbox with a stub document, fake timers, observers and a fake window.posthog.
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'studio-zissou', 'tracking.js'),
  'utf8',
);

afterEach(() => mock.timers.reset());

function makeElement(attrs = {}, { visible = true, id = '' } = {}) {
  const attributes = { ...attrs };
  return {
    id,
    attributes,
    style: {},
    offsetParent: visible ? {} : null,
    getClientRects: () => (visible ? [{}] : []),
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    closest: (sel) => (sel === '[data-sz-cta]' && 'data-sz-cta' in attributes ? makeSelf() : null),
  };
  function makeSelf() {
    return { getAttribute: (k) => (k in attributes ? attributes[k] : null) };
  }
}

function makePosthog() {
  const calls = { capture: [], register: [], identify: [], alias: [] };
  return {
    calls,
    __loaded: true,
    capture: (event, props) => calls.capture.push({ event, props: { ...props } }),
    register: (props) => calls.register.push({ ...props }),
    identify: (...a) => calls.identify.push(a),
    alias: (...a) => calls.alias.push(a),
  };
}

function makeForm({ name = null, id = '', doneVisible = false, doneDisplay = '' } = {}) {
  const done = makeElement({}, { visible: doneVisible });
  done.style.display = doneDisplay;
  const parent = { querySelector: (sel) => (sel === '.w-form-done' ? done : null) };
  const attrs = name ? { name } : {};
  const form = makeElement(attrs, { id });
  form.parentElement = parent;
  return { form, done, parent };
}

function setup({
  posthog,
  stories = [],
  frame = null,
  forms = [],
  lang = '',
  pathname = '/',
  io = true,
} = {}) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const listeners = {};
  const mutationObservers = [];
  const intersectionObservers = [];
  const body = {
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const document = {
    body,
    documentElement: { lang },
    readyState: 'complete',
    addEventListener: () => {},
    querySelectorAll: (sel) => {
      if (sel === '[data-sz-story]') return stories;
      if (sel === 'form') return forms.map((f) => f.form);
      return [];
    },
    querySelector: (sel) => (sel === '[data-sz="frame-start"]' ? frame : null),
  };
  class FakeMutationObserver {
    constructor(fn) {
      this.fn = fn;
      mutationObservers.push(this);
    }
    observe(target, opts) {
      this.target = target;
      this.opts = opts;
    }
    disconnect() {}
  }
  class FakeIntersectionObserver {
    constructor(fn) {
      this.fn = fn;
      this.disconnected = false;
      intersectionObservers.push(this);
    }
    observe(target) {
      this.target = target;
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const window = {
    document,
    location: { pathname },
    MutationObserver: FakeMutationObserver,
  };
  if (io) window.IntersectionObserver = FakeIntersectionObserver;
  if (posthog) window.posthog = posthog;
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    MutationObserver: FakeMutationObserver,
    IntersectionObserver: io ? FakeIntersectionObserver : undefined,
    setTimeout: (...a) => globalThis.setTimeout(...a),
    clearTimeout: (...a) => globalThis.clearTimeout(...a),
    setInterval: (...a) => globalThis.setInterval(...a),
    clearInterval: (...a) => globalThis.clearInterval(...a),
  });
  vm.runInContext(SOURCE, context);
  return {
    window,
    listeners,
    mutationObservers,
    intersectionObservers,
    tick: (ms) => mock.timers.tick(ms),
  };
}

const events = (ph, name) => ph.calls.capture.filter((c) => c.event === name);

test('does nothing without posthog', () => {
  const env = setup({ stories: [makeElement({ 'data-sz-story': 'd' })] });
  env.tick(11000);
  assert.deepEqual(Object.keys(env.listeners), []);
  assert.equal(env.mutationObservers.length, 0);
  assert.equal(env.intersectionObservers.length, 0);
});

test('waits for a loaded posthog instance', () => {
  const ph = makePosthog();
  ph.__loaded = false;
  const env = setup({ posthog: ph, stories: [makeElement({ 'data-sz-story': 'd' })] });
  env.tick(1000);
  assert.equal(ph.calls.register.length, 0);
  ph.__loaded = true;
  env.tick(250);
  assert.equal(ph.calls.register.length, 1);
});

test('registers the first visible story and the locale', () => {
  const ph = makePosthog();
  setup({
    posthog: ph,
    lang: 'nl-NL',
    stories: [
      makeElement({ 'data-sz-story': 'c' }, { visible: false }),
      makeElement({ 'data-sz-story': 'd' }),
      makeElement({ 'data-sz-story': 'e' }),
    ],
  });
  assert.deepEqual(ph.calls.register, [{ story: 'd', locale: 'nl' }]);
});

test('story falls back to none and locale to en', () => {
  const ph = makePosthog();
  setup({ posthog: ph, stories: [makeElement({ 'data-sz-story': 'c' }, { visible: false })] });
  assert.deepEqual(ph.calls.register, [{ story: 'none', locale: 'en' }]);
});

test('locale is lower-cased to two characters', () => {
  const ph = makePosthog();
  setup({ posthog: ph, lang: 'EN-gb' });
  assert.equal(ph.calls.register[0].locale, 'en');
});

test('a click on a cta captures cta_click with name and path', () => {
  const ph = makePosthog();
  const env = setup({ posthog: ph, pathname: '/nl' });
  const cta = makeElement({ 'data-sz-cta': 'hero' });
  env.listeners.click({ target: cta });
  assert.deepEqual(events(ph, 'cta_click').map((c) => c.props), [{ cta: 'hero', path: '/nl' }]);
});

test('a click outside any cta captures nothing', () => {
  const ph = makePosthog();
  const env = setup({ posthog: ph });
  env.listeners.click({ target: makeElement() });
  env.listeners.click({ target: null });
  assert.equal(events(ph, 'cta_click').length, 0);
});

test('frame-start captures story_section_reached once, then disconnects', () => {
  const ph = makePosthog();
  const env = setup({ posthog: ph, frame: makeElement(), pathname: '/' });
  const io = env.intersectionObservers[0];
  io.fn([{ isIntersecting: false }]);
  assert.equal(events(ph, 'story_section_reached').length, 0);
  io.fn([{ isIntersecting: true }]);
  io.fn([{ isIntersecting: true }]);
  assert.deepEqual(events(ph, 'story_section_reached').map((c) => c.props), [{ path: '/' }]);
  assert.equal(io.disconnected, true);
});

test('missing IntersectionObserver or frame does not throw', () => {
  assert.doesNotThrow(() => setup({ posthog: makePosthog(), frame: makeElement(), io: false }));
  assert.doesNotThrow(() => setup({ posthog: makePosthog(), frame: null }));
});

test('lead_submitted fires once per form when .w-form-done becomes visible', () => {
  const ph = makePosthog();
  const f = makeForm({ name: 'Contact' });
  const env = setup({ posthog: ph, forms: [f], pathname: '/contact' });
  assert.equal(env.mutationObservers.length, 1);
  const mo = env.mutationObservers[0];
  assert.equal(mo.target, f.parent);
  assert.equal(mo.opts.attributes, true);
  assert.equal(mo.opts.childList, true);
  assert.equal(mo.opts.subtree, true);
  mo.fn([]);
  assert.equal(events(ph, 'lead_submitted').length, 0);
  f.done.offsetParent = {};
  f.done.getClientRects = () => [{}];
  mo.fn([]);
  mo.fn([]);
  assert.deepEqual(events(ph, 'lead_submitted').map((c) => c.props), [
    { form: 'Contact', path: '/contact' },
  ]);
});

test('lead_submitted checks once immediately and names the form from id or a default', () => {
  const ph = makePosthog();
  setup({
    posthog: ph,
    forms: [
      makeForm({ id: 'wf-form-1', doneVisible: true }),
      makeForm({ doneVisible: true }),
      makeForm({ name: 'Hidden', doneVisible: true, doneDisplay: 'none' }),
    ],
  });
  assert.deepEqual(
    events(ph, 'lead_submitted').map((c) => c.props.form),
    ['wf-form-1', 'form'],
  );
});

test('never calls identify or alias', () => {
  const ph = makePosthog();
  const env = setup({ posthog: ph, frame: makeElement(), forms: [makeForm({ doneVisible: true })] });
  env.listeners.click({ target: makeElement({ 'data-sz-cta': 'x' }) });
  assert.equal(ph.calls.identify.length + ph.calls.alias.length, 0);
});

test('never throws when posthog methods throw', () => {
  const boom = () => {
    throw new Error('boom');
  };
  for (const key of ['register', 'capture']) {
    const ph = makePosthog();
    ph[key] = boom;
    assert.doesNotThrow(() => {
      const env = setup({
        posthog: ph,
        frame: makeElement(),
        forms: [makeForm({ doneVisible: true })],
      });
      env.listeners.click({ target: makeElement({ 'data-sz-cta': 'x' }) });
      env.intersectionObservers[0].fn([{ isIntersecting: true }]);
    });
  }
});
