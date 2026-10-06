// Unit tests for the Oost FAQ accordion: runs the real faq-accordion.js in a vm sandbox with stub details elements, Element.animate and matchMedia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'oost', 'faq-accordion.js'),
  'utf8',
);
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CLOSED = 73;
const FULL = 200;
const PADDING = {
  paddingTop: '24px',
  paddingBottom: '24px',
  borderTopWidth: '0px',
  borderBottomWidth: '1px',
};

function makeTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
    },
    dispatch(type) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      for (const fn of [...(listeners[type] || [])]) fn(event);
      return event;
    },
  };
}

function makeAnimatable(target, calls) {
  target.running = [];
  target.animate = (keyframes, options) => {
    const anim = {
      keyframes,
      options,
      playState: 'running',
      onfinish: null,
      cancel() {
        this.playState = 'idle';
        target.running = target.running.filter((a) => a !== anim);
      },
      finish() {
        this.playState = 'finished';
        target.running = target.running.filter((a) => a !== anim);
        if (this.onfinish) this.onfinish({ type: 'finish' });
      },
    };
    target.running.push(anim);
    calls.push({ el: target, keyframes, options, anim });
    return anim;
  };
  target.getAnimations = () => target.running.slice();
  return target;
}

function makeDetails(calls, { open = true } = {}) {
  const attrs = { class: 'faq_item' };
  if (open) attrs.open = '';
  const summary = { ...makeTarget(), tagName: 'SUMMARY', offsetHeight: CLOSED - 49 };
  const wrap = makeAnimatable(
    { className: 'faq_answer-wrap', style: {}, opacity: '1' },
    calls,
  );
  const details = makeAnimatable(
    {
      ...makeTarget(),
      tagName: 'DETAILS',
      attrs,
      style: {},
      midHeight: 130,
      classes: new Set(),
      hasAttribute: (k) => k in attrs,
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      setAttribute: (k, v) => {
        attrs[k] = String(v);
      },
      removeAttribute: (k) => {
        delete attrs[k];
      },
      querySelector: (sel) => {
        if (sel.includes('summary')) return summary;
        if (sel.includes('faq_answer-wrap')) return wrap;
        return null;
      },
    },
    calls,
  );
  Object.defineProperty(details, 'offsetHeight', {
    get: () =>
      details.running.length ? details.midHeight : 'open' in attrs ? FULL : CLOSED,
  });
  details.classList = {
    add: (c) => details.classes.add(c),
    remove: (c) => details.classes.delete(c),
    contains: (c) => details.classes.has(c),
    toggle: (c, force) => {
      const on = force === undefined ? !details.classes.has(c) : force;
      if (on) details.classes.add(c);
      else details.classes.delete(c);
      return on;
    },
  };
  details.summary = summary;
  details.wrap = wrap;
  return details;
}

function makeList(calls, count) {
  const items = Array.from({ length: count }, () => makeDetails(calls));
  return {
    items,
    querySelectorAll: (sel) => (sel.includes('details') ? items : []),
  };
}

function run({
  lists = [[]],
  reducedMotion = false,
  readyState = 'complete',
  noList = false,
} = {}) {
  const calls = [];
  const built = noList ? [] : lists.map((spec) => makeList(calls, spec.length || 3));
  const classes = new Set();
  const docListeners = makeTarget();
  const document = {
    ...docListeners,
    readyState,
    documentElement: {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
    },
    querySelectorAll: (sel) => (sel === '.faq_list' ? built : []),
  };
  const media = { matches: reducedMotion };
  const window = {
    document,
    OOST: { version: 'x' },
    matchMedia: (q) =>
      q.includes('prefers-reduced-motion') ? media : { matches: false },
    getComputedStyle: (el) =>
      el.tagName === 'DETAILS' ? { ...PADDING } : { opacity: el.opacity },
  };
  window.window = window;
  vm.runInContext(SOURCE, vm.createContext({ window, document }));
  const items = built.flatMap((l) => l.items);
  return { window, document, classes, calls, lists: built, items, media };
}

const callsOn = (calls, el) => calls.filter((c) => c.el === el);
const lastOn = (calls, el) => callsOn(calls, el).at(-1);

test('does nothing on a page without .faq_list', () => {
  const { classes, window } = run({ noList: true });
  assert.equal(classes.has('faq-ready'), false);
  assert.equal(typeof window.OOST.faq.init, 'function');
});

test('keeps only the first details open in each list and marks the page ready', () => {
  const { items, lists, classes } = run({
    lists: [
      [1, 2, 3],
      [1, 2],
    ],
  });
  assert.deepEqual(
    lists.map((l) => l.items.map((d) => d.hasAttribute('open'))),
    [
      [true, false, false],
      [true, false],
    ],
  );
  assert.equal(classes.has('faq-ready'), true);
  assert.ok(items.every((d) => d.hasAttribute('data-faq-bound')));
});

test('waits for DOMContentLoaded while the document is still loading', () => {
  const { items, document, classes } = run({ readyState: 'loading' });
  assert.equal(items[1].hasAttribute('open'), true);
  document.dispatch('DOMContentLoaded');
  assert.equal(items[1].hasAttribute('open'), false);
  assert.equal(classes.has('faq-ready'), true);
});

test('exposes init and destroy on window.OOST.faq without dropping other OOST keys', () => {
  const { window } = run();
  assert.equal(typeof window.OOST.faq.init, 'function');
  assert.equal(typeof window.OOST.faq.destroy, 'function');
  assert.equal(window.OOST.version, 'x');
});

test('a click opens with a 400ms height animation and fades the answer in', () => {
  const { items, calls } = run();
  const d = items[1];
  const event = d.summary.dispatch('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(d.hasAttribute('open'), true);
  const height = lastOn(calls, d);
  assert.deepEqual(JSON.parse(JSON.stringify(height.keyframes)), [
    { height: CLOSED + 'px' },
    { height: FULL + 'px' },
  ]);
  assert.equal(height.options.duration, 400);
  assert.equal(height.options.easing, EASING);
  const fade = lastOn(calls, d.wrap);
  assert.deepEqual(JSON.parse(JSON.stringify(fade.keyframes)), [
    { opacity: 0 },
    { opacity: 1 },
  ]);
  assert.equal(fade.options.duration, 400);
  assert.equal(fade.options.easing, EASING);
  assert.equal(d.style.overflow, 'hidden');
});

test('finishing the open animation clears the inline styles and leaves it open', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  lastOn(calls, d).anim.finish();
  lastOn(calls, d.wrap).anim.finish();
  assert.equal(d.hasAttribute('open'), true);
  assert.equal(d.style.overflow, '');
  assert.equal(d.getAnimations().length, 0);
});

test('a click on an open item animates 300ms closed and removes open only on finish', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  const height = lastOn(calls, d);
  assert.deepEqual(JSON.parse(JSON.stringify(height.keyframes)), [
    { height: FULL + 'px' },
    { height: CLOSED + 'px' },
  ]);
  assert.equal(height.options.duration, 300);
  assert.equal(height.options.easing, EASING);
  assert.deepEqual(JSON.parse(JSON.stringify(lastOn(calls, d.wrap).keyframes)), [
    { opacity: 1 },
    { opacity: 0 },
  ]);
  assert.equal(d.hasAttribute('open'), true);
  height.anim.finish();
  assert.equal(d.hasAttribute('open'), false);
  assert.equal(d.style.overflow, '');
  assert.equal(d.getAnimations().length + d.wrap.getAnimations().length, 0);
});

test('a closing item is marked is-closing from the click until it finishes, so the chevron turns with it', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  assert.equal(d.classList.contains('is-closing'), true);
  lastOn(calls, d).anim.finish();
  assert.equal(d.classList.contains('is-closing'), false);
  assert.equal(d.hasAttribute('open'), false);
});

test('reopening mid-close drops is-closing straight away', () => {
  const { items } = run();
  const d = items[0];
  d.summary.dispatch('click');
  d.summary.dispatch('click');
  assert.equal(d.classList.contains('is-closing'), false);
  assert.equal(d.hasAttribute('open'), true);
});

test('a click mid-open cancels and reverses from the current height, ending closed', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  const first = lastOn(calls, d).anim;
  d.wrap.opacity = '0.4';
  d.summary.dispatch('click');
  assert.equal(first.playState, 'idle');
  const back = lastOn(calls, d);
  assert.deepEqual(JSON.parse(JSON.stringify(back.keyframes)), [
    { height: '130px' },
    { height: CLOSED + 'px' },
  ]);
  assert.equal(back.options.duration, 300);
  assert.deepEqual(JSON.parse(JSON.stringify(lastOn(calls, d.wrap).keyframes)), [
    { opacity: 0.4 },
    { opacity: 0 },
  ]);
  back.anim.finish();
  assert.equal(d.hasAttribute('open'), false);
  assert.equal(d.getAnimations().length + d.wrap.getAnimations().length, 0);
  assert.equal(d.style.overflow, '');
});

test('a click mid-close reverses back open and the item stays open', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  const closing = lastOn(calls, d).anim;
  d.summary.dispatch('click');
  assert.equal(closing.playState, 'idle');
  const reopen = lastOn(calls, d);
  assert.deepEqual(JSON.parse(JSON.stringify(reopen.keyframes)), [
    { height: '130px' },
    { height: FULL + 'px' },
  ]);
  assert.equal(reopen.options.duration, 400);
  closing.finish();
  assert.equal(d.hasAttribute('open'), true);
  reopen.anim.finish();
  assert.equal(d.hasAttribute('open'), true);
  assert.equal(d.getAnimations().length + d.wrap.getAnimations().length, 0);
});

test('the toggle event from our own open does not stop the animation', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  d.dispatch('toggle');
  assert.equal(lastOn(calls, d).anim.playState, 'running');
});

test('a native toggle (find-in-page) is not animated and the next click follows the new state', () => {
  const { items, calls } = run();
  const d = items[1];
  d.setAttribute('open', '');
  d.dispatch('toggle');
  assert.equal(callsOn(calls, d).length, 0);
  d.summary.dispatch('click');
  assert.equal(lastOn(calls, d).options.duration, 300);
});

test('a native close during an animation cancels it and clears the inline styles', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  d.removeAttribute('open');
  d.dispatch('toggle');
  assert.equal(lastOn(calls, d).anim.playState, 'idle');
  assert.equal(lastOn(calls, d.wrap).anim.playState, 'idle');
  assert.equal(d.style.overflow, '');
  assert.equal(d.hasAttribute('open'), false);
});

test('with reduced motion clicks are left to the browser', () => {
  const { items, calls, classes } = run({ reducedMotion: true });
  const event = items[1].summary.dispatch('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(calls.length, 0);
  assert.equal(items[1].hasAttribute('open'), false);
  assert.equal(classes.has('faq-ready'), true);
});

test('reduced motion is read at click time', () => {
  const { items, calls, media } = run();
  media.matches = true;
  assert.equal(items[1].summary.dispatch('click').defaultPrevented, false);
  assert.equal(calls.length, 0);
});

test('init is idempotent: a second run binds nothing twice and keeps user-opened items', () => {
  const { items, calls, window } = run();
  items[2].setAttribute('open', '');
  window.OOST.faq.init();
  assert.equal(items[2].hasAttribute('open'), true);
  items[1].summary.dispatch('click');
  assert.equal(callsOn(calls, items[1]).length, 1);
  assert.equal(items[1].summary.listeners.click.length, 1);
});

test('the file running twice does not rebind', () => {
  const { items, window, document } = run();
  vm.runInContext(SOURCE, vm.createContext({ window, document }));
  assert.equal(items[1].summary.listeners.click.length, 1);
});

test('destroy removes listeners, cancels animations and unbinds, and init binds again', () => {
  const { items, calls, window } = run();
  items[1].summary.dispatch('click');
  const anim = lastOn(calls, items[1]).anim;
  window.OOST.faq.destroy();
  assert.equal(anim.playState, 'idle');
  assert.equal(items[1].style.overflow, '');
  assert.ok(items.every((d) => !d.hasAttribute('data-faq-bound')));
  const event = items[2].summary.dispatch('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(items[2].listeners.toggle?.length ?? 0, 0);
  window.OOST.faq.init();
  assert.equal(items[2].summary.dispatch('click').defaultPrevented, true);
});

test('init(root) only looks inside the given root', () => {
  const { window, calls } = run({ noList: true });
  const list = makeList(calls, 2);
  const root = { querySelectorAll: (sel) => (sel === '.faq_list' ? [list] : []) };
  window.OOST.faq.init(root);
  assert.equal(list.items[1].hasAttribute('open'), false);
  assert.equal(list.items[1].summary.dispatch('click').defaultPrevented, true);
});
