// Unit tests for Studio Zissou contact-steps.js: runs the real file in a vm sandbox against a stub contact form tree with fake events, focus, validity and MutationObserver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'studio-zissou', 'contact-steps.js'),
  'utf8',
);

function parseSelector(sel) {
  return sel.split(',').map((part) => {
    const s = part.trim();
    const tag = (s.match(/^[a-z]+/i) || [''])[0].toUpperCase();
    const classes = [...s.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    const attrs = [...s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map((m) => [m[1], m[2]]);
    return { tag, classes, attrs };
  });
}

function matches(el, sel) {
  return parseSelector(sel).some(
    ({ tag, classes, attrs }) =>
      (!tag || el.tagName === tag) &&
      classes.every((c) => el.classList.contains(c)) &&
      attrs.every(([k, v]) => {
        const actual = el.getAttribute(k);
        return v === undefined ? actual !== null : actual === v;
      }),
  );
}

function descendants(el) {
  return el.children.flatMap((c) => [c, ...descendants(c)]);
}

function makeWorld() {
  const state = { activeElement: null, observers: [], reports: [], scrolls: [] };

  function el(tag, attrs = {}, kids = []) {
    const attributes = {};
    const classes = new Set();
    const listeners = [];
    const node = {
      tagName: tag.toUpperCase(),
      attributes,
      children: [],
      parentElement: null,
      listeners,
      style: {},
      hidden: false,
      value: '',
      checked: false,
      textContent: '',
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : force;
          if (on) classes.add(c);
          else classes.delete(c);
          return on;
        },
      },
      get type() {
        return attributes.type || (node.tagName === 'INPUT' ? 'text' : node.tagName === 'TEXTAREA' ? 'textarea' : '');
      },
      setAttribute: (k, v) => {
        if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
        else attributes[k] = String(v);
      },
      getAttribute: (k) => {
        if (k === 'class') return [...classes].join(' ') || null;
        return k in attributes ? attributes[k] : null;
      },
      hasAttribute: (k) => k in attributes,
      removeAttribute: (k) => {
        delete attributes[k];
      },
      addEventListener: (type, fn, opts) => {
        const capture = opts === true || Boolean(opts && opts.capture);
        listeners.push({ type, fn, capture });
      },
      querySelector: (sel) => descendants(node).find((d) => matches(d, sel)) ?? null,
      querySelectorAll: (sel) => descendants(node).filter((d) => matches(d, sel)),
      focus: () => {
        state.activeElement = node;
      },
      scrollIntoView: (opts) => state.scrolls.push({ node, opts }),
      checkValidity: () => {
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) return true;
        if (node.hasAttribute('required') && !node.value) return false;
        if (node.type === 'email' && node.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(node.value)) return false;
        return true;
      },
      reportValidity: () => {
        const ok = node.checkValidity();
        if (!ok) {
          state.reports.push(node);
          node.focus();
        }
        return ok;
      },
      append: (...cs) => {
        for (const c of cs) {
          c.parentElement = node;
          node.children.push(c);
        }
      },
    };
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'id' || k === 'name') node[k] = v;
      node.setAttribute(k, v);
    }
    node.append(...kids);
    return node;
  }

  function fire(target, type, props = {}) {
    const event = {
      type,
      target,
      defaultPrevented: false,
      stopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
      stopImmediatePropagation() {
        this.stopped = true;
      },
      ...props,
    };
    const path = [];
    for (let n = target; n; n = n.parentElement) path.push(n);
    const phase = (nodes, capture) => {
      for (const n of nodes) {
        for (const l of n.listeners) {
          if (l.type !== type || l.capture !== capture) continue;
          l.fn.call(n, event);
          if (event.stopped) return false;
        }
      }
      return true;
    };
    if (phase([...path].reverse(), true)) phase(path, false);
    return event;
  }

  function setDisplay(node, display) {
    node.style.display = display;
    for (const o of state.observers) {
      if (o.targets.includes(node)) o.fn([{ type: 'attributes', attributeName: 'style', target: node }], o);
    }
  }

  return { state, el, fire, setDisplay };
}

function buildForm(world, { nextTag = 'div' } = {}) {
  const { el } = world;
  const next = () =>
    nextTag === 'button'
      ? el('button', { type: 'button', 'data-sz': 'contact-next', 'aria-label': 'Next' })
      : el('div', { 'data-sz': 'contact-next', role: 'button', tabindex: '0', 'aria-label': 'Next' });
  const chips = ['google', 'website', 'bookings', 'care', 'unsure'].map((n) =>
    el('label', { class: 'w-checkbox sz-chip' }, [el('input', { type: 'checkbox', id: `need-${n}`, name: `need-${n}` })]),
  );
  const segments = Array.from({ length: 6 }, (_, i) =>
    el('div', { 'data-sz': 'contact-segment', class: i === 0 ? 'sz-contact_progress-segment is-active' : 'sz-contact_progress-segment' }),
  );
  const count = el('p', { 'data-sz': 'contact-count' });
  count.textContent = '1 of 6';
  const steps = [
    el('div', { 'data-sz-step': '' }, [el('input', { id: 'contact-name', required: '' }), next()]),
    el('div', { 'data-sz-step': '' }, [el('input', { id: 'contact-business' }), next()]),
    el('div', { 'data-sz-step': '' }, [el('input', { id: 'contact-email', type: 'email', required: '' }), next()]),
    el('div', { 'data-sz-step': '' }, [el('input', { id: 'contact-website', type: 'url' }), next()]),
    el('fieldset', { 'data-sz-step': '', 'data-sz-require-one': '' }, [
      ...chips,
      el('p', { 'data-sz': 'contact-need-error', 'data-sz-steps-only': '', role: 'alert' }),
      next(),
    ]),
    el('div', { 'data-sz-step': '', class: 'is-top' }, [el('textarea', { id: 'contact-message' })]),
  ];
  const back = el('button', { type: 'button', 'data-sz': 'contact-back', 'data-sz-steps-only': '' });
  const submit = el('input', { type: 'submit', value: 'Send it over' });
  const attribution = el('input', { type: 'hidden', name: 'utm_source' });
  const form = el('form', { id: 'wf-form-Contact' }, [
    ...steps,
    el('div', { class: 'sz-contact_footer' }, [back, submit]),
    attribution,
  ]);
  const doneHeading = el('h3', { 'data-sz': 'contact-done', tabindex: '-1' });
  const failInner = el('div', {}, [el('div', { 'data-sz': 'contact-fail', tabindex: '-1' })]);
  const done = el('div', { class: 'w-form-done' }, [el('div', {}, [doneHeading])]);
  const fail = el('div', { class: 'w-form-fail', role: 'region' }, [failInner]);
  const root = el('div', { 'data-sz': 'contact-steps', class: 'sz-contact_wrapper' }, [
    el('div', { 'data-sz-steps-only': '', 'aria-hidden': 'true' }, [count, el('div', {}, segments)]),
    el('div', { class: 'w-form' }, [form, done, fail]),
  ]);
  const page = el('body', {}, [root]);
  const byId = (id) => page.querySelectorAll('input, textarea').find((n) => n.id === id);
  return { page, root, form, steps, segments, count, back, submit, chips, done, fail, failInner, doneHeading, byId };
}

function run({ withRoot = true, nextTag, readyState = 'complete' } = {}) {
  const world = makeWorld();
  const ui = withRoot ? buildForm(world, { nextTag }) : { page: world.el('body') };
  const docListeners = [];
  const document = {
    readyState,
    get activeElement() {
      return world.state.activeElement;
    },
    querySelectorAll: (sel) => ui.page.querySelectorAll(sel),
    querySelector: (sel) => ui.page.querySelector(sel),
    addEventListener: (type, fn) => docListeners.push({ type, fn }),
  };
  class MutationObserver {
    constructor(fn) {
      this.fn = fn;
      this.targets = [];
      world.state.observers.push(this);
    }
    observe(target) {
      this.targets.push(target);
    }
    disconnect() {
      this.targets = [];
    }
  }
  const console = { log: () => assert.fail('console.log must stay behind DEBUG') };
  const sandbox = { document, MutationObserver, console };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const exec = () => vm.runInContext(SOURCE, context);
  exec();
  const visible = () => ui.steps.findIndex((s) => !s.hidden) + 1;
  const nextOf = (n) => ui.steps[n - 1].querySelector('[data-sz="contact-next"]');
  const click = (node) => world.fire(node, 'click');
  const toStep = (n) => {
    const fills = {
      1: () => (ui.byId('contact-name').value = 'Test'),
      3: () => (ui.byId('contact-email').value = 'test@example.com'),
      5: () => {
        ui.chips[4].children[0].checked = true;
      },
    };
    for (let s = 1; s < n; s += 1) {
      if (fills[s]) fills[s]();
      click(nextOf(s));
      assert.equal(visible(), s + 1, `reached step ${s + 1}`);
    }
  };
  const activeCount = () => ui.segments.filter((s) => s.classList.contains('is-active')).length;
  return { world, ui, document, docListeners, exec, visible, nextOf, click, toStep, activeCount };
}

test('init does not move focus', () => {
  const { document } = run();
  assert.equal(document.activeElement, null);
});

test('does nothing without a [data-sz="contact-steps"] root', () => {
  const { world, docListeners } = run({ withRoot: false });
  assert.equal(world.state.observers.length, 0);
  assert.equal(docListeners.length, 0);
});

test('hides steps 2-6, sets noValidate and marks the root on init', () => {
  const { ui, visible, activeCount } = run();
  assert.deepEqual(ui.steps.map((s) => s.hidden), [false, true, true, true, true, true]);
  assert.equal(visible(), 1);
  assert.equal(ui.form.noValidate, true);
  assert.ok(ui.root.hasAttribute('data-sz-steps-ready'));
  assert.ok(ui.root.classList.contains('is-steps'));
  assert.equal(ui.count.textContent, '1 of 6');
  assert.equal(activeCount(), 1);
  assert.equal(ui.back.hidden, true);
  assert.equal(ui.submit.hidden, true);
  assert.equal(ui.root.querySelector('[data-sz="contact-need-error"]').hidden, true);
});

test('selects steps by [data-sz-step], so the appended attribution field is not a step', () => {
  const { ui, toStep } = run();
  toStep(6);
  assert.equal(ui.count.textContent, '6 of 6');
  assert.equal(ui.submit.hidden, false);
});

test('waits for DOMContentLoaded while the document is loading', () => {
  const { ui, docListeners } = run({ readyState: 'loading' });
  assert.equal(ui.root.classList.contains('is-steps'), false);
  const ready = docListeners.find((l) => l.type === 'DOMContentLoaded');
  assert.ok(ready);
  ready.fn();
  assert.ok(ui.root.classList.contains('is-steps'));
});

test('does not bind twice on a second run', () => {
  const { ui, exec, world } = run();
  const formListeners = ui.form.listeners.length;
  const nextListeners = ui.steps[0].querySelector('[data-sz="contact-next"]').listeners.length;
  const observers = world.state.observers.length;
  exec();
  assert.equal(ui.form.listeners.length, formListeners);
  assert.equal(ui.steps[0].querySelector('[data-sz="contact-next"]').listeners.length, nextListeners);
  assert.equal(world.state.observers.length, observers);
});

test('next blocks on an invalid control and calls reportValidity', () => {
  const { ui, world, visible, click, nextOf, document } = run();
  click(nextOf(1));
  assert.equal(visible(), 1);
  assert.deepEqual(world.state.reports, [ui.byId('contact-name')]);
  assert.equal(document.activeElement, ui.byId('contact-name'));
});

test('next blocks an invalid email and advances on a valid one, moving focus and progress', () => {
  const { ui, world, visible, click, nextOf, toStep, document, activeCount } = run();
  toStep(3);
  assert.equal(document.activeElement, ui.byId('contact-email'));
  ui.byId('contact-email').value = 'abc';
  click(nextOf(3));
  assert.equal(visible(), 3);
  assert.equal(world.state.reports.at(-1), ui.byId('contact-email'));
  ui.byId('contact-email').value = 'a@b.co';
  click(nextOf(3));
  assert.equal(visible(), 4);
  assert.equal(document.activeElement, ui.byId('contact-website'));
  assert.equal(ui.count.textContent, '4 of 6');
  assert.equal(activeCount(), 4);
  assert.equal(ui.back.hidden, false);
});

test('next on a require-one step with nothing checked shows the error and focuses the first chip', () => {
  const { ui, world, visible, click, nextOf, toStep, document } = run();
  toStep(5);
  const error = ui.root.querySelector('[data-sz="contact-need-error"]');
  ui.chips[4].children[0].checked = false;
  click(nextOf(5));
  assert.equal(visible(), 5);
  assert.equal(error.hidden, false);
  assert.equal(document.activeElement, ui.chips[0].children[0]);
  ui.chips[1].children[0].checked = true;
  world.fire(ui.chips[1].children[0], 'change');
  assert.equal(error.hidden, true);
  click(nextOf(5));
  assert.equal(visible(), 6);
  assert.equal(document.activeElement, ui.byId('contact-message'));
});

test('back from step 1 is a no-op', () => {
  const { ui, visible, click } = run();
  click(ui.back);
  assert.equal(visible(), 1);
  assert.equal(ui.back.hidden, true);
});

test('back keeps values and focuses the previous step', () => {
  const { ui, visible, click, toStep, document } = run();
  toStep(4);
  ui.byId('contact-website').value = 'https://example.com';
  click(ui.back);
  click(ui.back);
  assert.equal(visible(), 2);
  assert.equal(document.activeElement, ui.byId('contact-business'));
  assert.equal(ui.byId('contact-name').value, 'Test');
  assert.equal(ui.byId('contact-website').value, 'https://example.com');
});

test('Enter on an input advances, Enter in a textarea does not', () => {
  const { ui, world, visible } = run();
  ui.byId('contact-name').value = 'Test';
  const enter = world.fire(ui.byId('contact-name'), 'keydown', { key: 'Enter' });
  assert.equal(enter.defaultPrevented, true);
  assert.equal(visible(), 2);
  const r = run();
  r.toStep(6);
  const textEnter = r.world.fire(r.ui.byId('contact-message'), 'keydown', { key: 'Enter' });
  assert.equal(textEnter.defaultPrevented, false);
  assert.equal(r.visible(), 6);
});

test('a div next control advances on Enter and Space, with the default prevented', () => {
  const { ui, world, visible, nextOf } = run({ nextTag: 'div' });
  ui.byId('contact-name').value = 'Test';
  const enter = world.fire(nextOf(1), 'keydown', { key: 'Enter' });
  assert.equal(enter.defaultPrevented, true);
  assert.equal(visible(), 2);
  const space = world.fire(nextOf(2), 'keydown', { key: ' ' });
  assert.equal(space.defaultPrevented, true);
  assert.equal(visible(), 3);
});

test('a button next control advances on click and leaves keys to the browser', () => {
  const { ui, world, visible, nextOf, click } = run({ nextTag: 'button' });
  ui.byId('contact-name').value = 'Test';
  const key = world.fire(nextOf(1), 'keydown', { key: ' ' });
  assert.equal(key.defaultPrevented, false);
  assert.equal(visible(), 1);
  click(nextOf(1));
  assert.equal(visible(), 2);
});

test('capture submit with an invalid hidden step jumps to it and stops propagation', () => {
  const { ui, world, visible, toStep } = run();
  let webflowCalls = 0;
  ui.page.addEventListener('submit', () => (webflowCalls += 1));
  toStep(6);
  ui.byId('contact-email').value = '';
  const event = world.fire(ui.form, 'submit');
  assert.equal(event.defaultPrevented, true);
  assert.equal(webflowCalls, 0);
  assert.equal(visible(), 3);
  assert.equal(world.state.reports.at(-1), ui.byId('contact-email'));
  ui.byId('contact-email').value = 'test@example.com';
  const ok = world.fire(ui.form, 'submit');
  assert.equal(ok.defaultPrevented, false);
  assert.equal(webflowCalls, 1);
});

test('done visible: all segments active, 6 of 6, back hidden, focus on the done heading', () => {
  const { ui, world, toStep, document, activeCount } = run();
  toStep(6);
  world.setDisplay(ui.form, 'none');
  world.setDisplay(ui.done, 'block');
  assert.equal(activeCount(), 6);
  assert.equal(ui.count.textContent, '6 of 6');
  assert.equal(ui.back.hidden, true);
  assert.equal(document.activeElement, ui.doneHeading);
});

test('fail visible: inner alert role, scrolled to centre, focus on the fail heading; back clears it', () => {
  const { ui, world, toStep, document, click } = run();
  toStep(6);
  world.setDisplay(ui.fail, 'block');
  const heading = ui.root.querySelector('[data-sz="contact-fail"]');
  assert.equal(ui.failInner.getAttribute('role'), 'alert');
  assert.equal(ui.fail.getAttribute('role'), 'region');
  assert.equal(world.state.scrolls.at(-1).opts.block, 'center');
  assert.equal(document.activeElement, heading);
  click(ui.back);
  assert.equal(ui.fail.style.display, 'none');
});
