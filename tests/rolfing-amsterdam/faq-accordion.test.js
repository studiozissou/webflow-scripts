// Unit tests for the template FAQ accordion: runs the real faq-accordion.js in a vm sandbox with stub details elements, a stub GSAP and matchMedia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'rolfing-amsterdam', 'faq-accordion.js'),
  'utf8',
);
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

function makeGsap(calls) {
  const gsap = {
    fromTo(target, from, to) {
      const tween = {
        target,
        from,
        to,
        killed: false,
        kill() {
          this.killed = true;
          target.running = target.running.filter((t) => t !== tween);
        },
        complete() {
          Object.assign(target.gs, strip(to));
          target.running = target.running.filter((t) => t !== tween);
          if (to.onComplete) to.onComplete();
        },
      };
      Object.assign(target.gs, from);
      target.running.push(tween);
      calls.push({ el: target, from, to, tween });
      return tween;
    },
    getProperty(target, prop) {
      return prop in target.gs ? target.gs[prop] : target.defaults[prop];
    },
    set(target, vars) {
      for (const prop of String(vars.clearProps || '').split(',')) {
        if (!prop) continue;
        target.style[prop] = '';
        delete target.gs[prop === 'transform' ? 'rotation' : prop];
      }
    },
  };
  return gsap;
}

function strip(vars) {
  const out = {};
  for (const k of Object.keys(vars))
    if (!['duration', 'ease', 'onComplete'].includes(k)) out[k] = vars[k];
  return out;
}

function makeTweenable(target, defaults) {
  target.running = [];
  target.gs = {};
  target.defaults = defaults;
  return target;
}

function makeDetails({ open = true } = {}) {
  const attrs = { class: 'faq_item' };
  if (open) attrs.open = '';
  const summary = { ...makeTarget(), tagName: 'SUMMARY', offsetHeight: CLOSED - 49 };
  const wrap = makeTweenable({ className: 'faq_answer-wrap', style: {} }, { opacity: 1 });
  const icon = makeTweenable({ className: 'faq-icon', style: {} }, { rotation: 0 });
  const details = makeTweenable(
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
        if (sel.includes('faq-icon')) return icon;
        return null;
      },
    },
    {},
  );
  Object.defineProperty(details, 'offsetHeight', {
    get: () =>
      details.running.length ? details.midHeight : 'open' in attrs ? FULL : CLOSED,
  });
  details.classList = {
    add: (c) => details.classes.add(c),
    remove: (c) => details.classes.delete(c),
    contains: (c) => details.classes.has(c),
  };
  details.summary = summary;
  details.wrap = wrap;
  details.icon = icon;
  return details;
}

function makeList(count) {
  const items = Array.from({ length: count }, () => makeDetails());
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
  withGsap = true,
} = {}) {
  const calls = [];
  const built = noList ? [] : lists.map((spec) => makeList(spec.length || 3));
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
    ROLFING: { version: 'x' },
    matchMedia: (q) =>
      q.includes('prefers-reduced-motion') ? media : { matches: false },
    getComputedStyle: () => ({ ...PADDING }),
  };
  if (withGsap) window.gsap = makeGsap(calls);
  window.window = window;
  vm.runInContext(SOURCE, vm.createContext({ window, document }));
  const items = built.flatMap((l) => l.items);
  return { window, document, classes, calls, lists: built, items, media };
}

const plain = (o) => JSON.parse(JSON.stringify(o));
const callsOn = (calls, el) => calls.filter((c) => c.el === el);
const lastOn = (calls, el) => callsOn(calls, el).at(-1);

test('does nothing on a page without .faq_list', () => {
  const { classes, window } = run({ noList: true });
  assert.equal(classes.has('faq-ready'), false);
  assert.equal(typeof window.ROLFING.faq.init, 'function');
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

test('exposes init and destroy on window.ROLFING.faq without dropping other ROLFING keys', () => {
  const { window } = run();
  assert.equal(typeof window.ROLFING.faq.init, 'function');
  assert.equal(typeof window.ROLFING.faq.destroy, 'function');
  assert.equal(window.ROLFING.version, 'x');
});

const OPEN = { duration: 0.45, ease: 'power3.out' };
const CLOSE = { duration: 0.35, ease: 'power2.inOut' };

test('a click opens with a GSAP height tween, fades the answer in and turns the icon to 45deg', () => {
  const { items, calls } = run();
  const d = items[1];
  const event = d.summary.dispatch('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(d.hasAttribute('open'), true);
  const height = lastOn(calls, d);
  assert.deepEqual(plain(height.from), { height: CLOSED });
  assert.equal(height.to.height, FULL);
  assert.equal(height.to.duration, OPEN.duration);
  assert.equal(height.to.ease, OPEN.ease);
  const fade = lastOn(calls, d.wrap);
  assert.deepEqual(plain(fade.from), { opacity: 0 });
  assert.equal(fade.to.opacity, 1);
  assert.equal(fade.to.duration, OPEN.duration);
  const turn = lastOn(calls, d.icon);
  assert.deepEqual(plain(turn.from), { rotation: 0 });
  assert.equal(turn.to.rotation, 45);
  assert.equal(d.style.overflow, 'hidden');
});

test('finishing the open tween clears the inline styles and leaves it open', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  lastOn(calls, d).tween.complete();
  assert.equal(d.hasAttribute('open'), true);
  assert.equal(d.style.overflow, '');
  assert.equal(d.style.height, '');
  assert.equal(d.wrap.style.opacity, '');
  assert.equal(d.icon.style.transform, '');
  assert.equal(d.running.length + d.wrap.running.length + d.icon.running.length, 0);
});

test('a click on an open item tweens closed and removes open only on complete', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  const height = lastOn(calls, d);
  assert.deepEqual(plain(height.from), { height: FULL });
  assert.equal(height.to.height, CLOSED);
  assert.equal(height.to.duration, CLOSE.duration);
  assert.equal(height.to.ease, CLOSE.ease);
  assert.deepEqual(plain(lastOn(calls, d.wrap).from), { opacity: 1 });
  assert.equal(lastOn(calls, d.wrap).to.opacity, 0);
  assert.deepEqual(plain(lastOn(calls, d.icon).from), { rotation: 45 });
  assert.equal(lastOn(calls, d.icon).to.rotation, 0);
  assert.equal(d.hasAttribute('open'), true);
  height.tween.complete();
  assert.equal(d.hasAttribute('open'), false);
  assert.equal(d.style.overflow, '');
  assert.equal(d.running.length + d.wrap.running.length + d.icon.running.length, 0);
});

test('a closing item is marked is-closing from the click until it completes', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  assert.equal(d.classList.contains('is-closing'), true);
  lastOn(calls, d).tween.complete();
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

test('a click mid-open kills the tweens and reverses from the current height, opacity and rotation', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  const first = lastOn(calls, d).tween;
  d.wrap.gs.opacity = 0.4;
  d.icon.gs.rotation = 18;
  d.summary.dispatch('click');
  assert.equal(first.killed, true);
  const back = lastOn(calls, d);
  assert.deepEqual(plain(back.from), { height: 130 });
  assert.equal(back.to.height, CLOSED);
  assert.equal(back.to.duration, CLOSE.duration);
  assert.deepEqual(plain(lastOn(calls, d.wrap).from), { opacity: 0.4 });
  assert.deepEqual(plain(lastOn(calls, d.icon).from), { rotation: 18 });
  back.tween.complete();
  assert.equal(d.hasAttribute('open'), false);
  assert.equal(d.running.length + d.wrap.running.length + d.icon.running.length, 0);
  assert.equal(d.style.overflow, '');
});

test('a click mid-close reverses back open and the item stays open', () => {
  const { items, calls } = run();
  const d = items[0];
  d.summary.dispatch('click');
  const closing = lastOn(calls, d).tween;
  d.summary.dispatch('click');
  assert.equal(closing.killed, true);
  const reopen = lastOn(calls, d);
  assert.deepEqual(plain(reopen.from), { height: 130 });
  assert.equal(reopen.to.height, FULL);
  assert.equal(reopen.to.duration, OPEN.duration);
  reopen.tween.complete();
  assert.equal(d.hasAttribute('open'), true);
});

test('the toggle event from our own open does not stop the tween', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  d.dispatch('toggle');
  assert.equal(lastOn(calls, d).tween.killed, false);
});

test('a native toggle (find-in-page) is not animated and the next click follows the new state', () => {
  const { items, calls } = run();
  const d = items[1];
  d.setAttribute('open', '');
  d.dispatch('toggle');
  assert.equal(callsOn(calls, d).length, 0);
  d.summary.dispatch('click');
  assert.equal(lastOn(calls, d).to.duration, CLOSE.duration);
});

test('a native close during a tween kills it and clears the inline styles', () => {
  const { items, calls } = run();
  const d = items[1];
  d.summary.dispatch('click');
  d.removeAttribute('open');
  d.dispatch('toggle');
  assert.equal(lastOn(calls, d).tween.killed, true);
  assert.equal(lastOn(calls, d.wrap).tween.killed, true);
  assert.equal(d.style.overflow, '');
  assert.equal(d.hasAttribute('open'), false);
});

test('without GSAP on the page clicks are left to the browser', () => {
  const { items, classes } = run({ withGsap: false });
  const event = items[1].summary.dispatch('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(items[1].hasAttribute('open'), false);
  assert.equal(classes.has('faq-ready'), true);
});

test('GSAP arriving after init is picked up at click time', () => {
  const { items, window, calls } = run({ withGsap: false });
  window.gsap = makeGsap(calls);
  assert.equal(items[1].summary.dispatch('click').defaultPrevented, true);
  assert.equal(callsOn(calls, items[1]).length, 1);
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
  window.ROLFING.faq.init();
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

test('destroy removes listeners, kills tweens and unbinds, and init binds again', () => {
  const { items, calls, window } = run();
  items[1].summary.dispatch('click');
  const tween = lastOn(calls, items[1]).tween;
  window.ROLFING.faq.destroy();
  assert.equal(tween.killed, true);
  assert.equal(items[1].style.overflow, '');
  assert.ok(items.every((d) => !d.hasAttribute('data-faq-bound')));
  const event = items[2].summary.dispatch('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(items[2].listeners.toggle?.length ?? 0, 0);
  window.ROLFING.faq.init();
  assert.equal(items[2].summary.dispatch('click').defaultPrevented, true);
});

test('init(root) only looks inside the given root', () => {
  const { window } = run({ noList: true });
  const list = makeList(2);
  const root = { querySelectorAll: (sel) => (sel === '.faq_list' ? [list] : []) };
  window.ROLFING.faq.init(root);
  assert.equal(list.items[1].hasAttribute('open'), false);
  assert.equal(list.items[1].summary.dispatch('click').defaultPrevented, true);
});
