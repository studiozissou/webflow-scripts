// Unit tests for Studio Zissou task-list.js: runs the real file in a vm sandbox against a stub list with fake layout, timers, matchMedia, IntersectionObserver and ResizeObserver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'studio-zissou', 'task-list.js'),
  'utf8',
);

const GAP = 12;
const ROW = 24;
const translateY = (node) => {
  const m = /translateY\((-?[\d.]+)px\)/.exec(node.style.transform || '');
  return m ? Number(m[1]) : null;
};

function makeWorld({ count = 15, heights = [], width = 400, trail = 0 } = {}) {
  const state = { width };

  function el(tag, attrs = {}) {
    const attributes = { ...attrs };
    const classes = new Set();
    const listeners = [];
    const node = {
      tagName: tag.toUpperCase(),
      attributes,
      children: [],
      parentElement: null,
      listeners,
      style: {},
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
      setAttribute: (k, v) => {
        attributes[k] = String(v);
      },
      getAttribute: (k) => (k in attributes ? attributes[k] : null),
      hasAttribute: (k) => k in attributes,
      removeAttribute: (k) => {
        delete attributes[k];
      },
      addEventListener: (type, fn) => listeners.push({ type, fn }),
      append: (...cs) => {
        for (const c of cs) {
          c.parentElement = node;
          node.children.push(c);
        }
      },
      querySelectorAll: (sel) => (sel === '[data-sz="task-list"]' && attributes['data-sz'] === 'task-list' ? [node] : []),
      fire: (type, extra = {}) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({ type, target: node, ...extra })),
    };
    return node;
  }

  const root = el('ul', { 'data-sz': 'task-list' });
  root.classList.add('sz-dot-list');
  const items = Array.from({ length: count }, (_, i) => {
    const li = el('li');
    li.classList.add('sz-dot-list_item');
    if (i !== 1) li.classList.add('is-muted');
    li.textContent = `Task ${i}`;
    li.height = heights[i] ?? ROW;
    return li;
  });
  root.append(...items);

  const rolling = () => root.classList.contains('is-rolling');
  const itemHeight = (li) => (li.style.position === 'absolute' ? li.height * (400 / state.width) : li.height);
  const rect = (top, height) => ({ top, bottom: top + height, height, left: 0, right: state.width, width: state.width });

  for (const li of items) {
    li.getBoundingClientRect = () => {
      const h = itemHeight(li);
      if (rolling() && li.style.position === 'absolute') return rect(100 + (translateY(li) ?? 0), h);
      const i = items.indexOf(li);
      if (i >= 3) return rect(0, 0);
      const top = items.slice(0, i).reduce((sum, x) => sum + x.height + GAP, 100);
      return rect(top, h);
    };
    Object.defineProperty(li, 'offsetHeight', { get: () => itemHeight(li) });
  }
  const staticHeight = () => items.slice(0, 3).reduce((sum, x) => sum + x.height, 0) + GAP * 2 + trail;
  root.getBoundingClientRect = () => rect(100, rolling() ? parseFloat(root.style.height) || 0 : staticHeight());
  Object.defineProperty(root, 'offsetHeight', { get: () => parseFloat(root.style.height) || 0 });

  const page = el('body');
  page.append(root);
  return { state, root, items, page, el };
}

function run({
  count,
  heights,
  trail,
  reduced = false,
  hidden = false,
  io = true,
  ro = true,
  fonts = true,
  withRoot = true,
  readyState = 'complete',
  extraRuns = 0,
  preRolling = false,
} = {}) {
  const world = makeWorld({ count, heights, trail });
  if (preRolling) world.root.classList.add('is-rolling');
  const timers = { intervals: [], timeouts: [] };
  const observers = { io: [], ro: [] };
  const docListeners = [];
  const env = { reduced, hidden };
  let fontsResolve;

  const document = {
    readyState,
    get hidden() {
      return env.hidden;
    },
    querySelectorAll: (sel) => (withRoot ? world.root.querySelectorAll(sel) : []),
    addEventListener: (type, fn) => docListeners.push({ type, fn }),
  };
  if (fonts) document.fonts = { ready: new Promise((r) => (fontsResolve = r)) };

  class IntersectionObserver {
    constructor(fn) {
      this.fn = fn;
      this.targets = [];
      observers.io.push(this);
    }
    observe(t) {
      this.targets.push(t);
    }
    disconnect() {}
    emit(isIntersecting) {
      this.fn(this.targets.map((target) => ({ target, isIntersecting })), this);
    }
  }
  class ResizeObserver {
    constructor(fn) {
      this.fn = fn;
      this.targets = [];
      observers.ro.push(this);
    }
    observe(t) {
      this.targets.push(t);
    }
    disconnect() {}
    emit() {
      this.fn(this.targets.map((target) => ({ target })), this);
    }
  }

  const console = { log: () => assert.fail('console.log must stay behind DEBUG') };
  const sandbox = {
    document,
    console,
    setInterval: (fn, ms) => timers.intervals.push({ fn, ms }) && timers.intervals.length,
    clearInterval: () => {},
    setTimeout: (fn, ms) => timers.timeouts.push({ fn, ms }) && timers.timeouts.length,
    clearTimeout: () => {},
    requestAnimationFrame: (fn) => fn(0),
    matchMedia: (q) => ({ matches: q.includes('reduce') && env.reduced, media: q }),
  };
  if (io) sandbox.IntersectionObserver = IntersectionObserver;
  if (ro) sandbox.ResizeObserver = ResizeObserver;
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (let i = 0; i <= extraRuns; i += 1) vm.runInContext(SOURCE, context);

  const flush = () => {
    const due = timers.timeouts.splice(0);
    due.forEach((t) => t.fn());
  };
  const tick = () => {
    timers.intervals.forEach((t) => t.fn());
    flush();
  };
  const box = () => parseFloat(world.root.style.height);
  const visible = () =>
    world.items
      .map((li, i) => ({ li, i, y: translateY(li) }))
      .filter(({ li, y }) => li.style.opacity !== '0' && y !== null && y >= 0 && y < box())
      .sort((a, b) => a.y - b.y)
      .map(({ i }) => i);

  return { ...world, sandbox, document, docListeners, timers, observers, env, tick, flush, visible, box, fontsResolve: () => fontsResolve() };
}

test('leaves a list of 3 alone', () => {
  const t = run({ count: 3 });
  assert.equal(t.root.classList.contains('is-rolling'), false);
  assert.equal(t.root.style.height, undefined);
  assert.equal(t.timers.intervals.length, 0);
  t.items.forEach((li) => assert.equal(li.style.transform, undefined));
});

test('does nothing when the root is missing', () => {
  const t = run({ withRoot: false });
  assert.equal(t.timers.intervals.length, 0);
});

test('waits for DOMContentLoaded while the document is loading', () => {
  const t = run({ readyState: 'loading' });
  assert.equal(t.root.classList.contains('is-rolling'), false);
  t.docListeners.filter((l) => l.type === 'DOMContentLoaded').forEach((l) => l.fn());
  assert.equal(t.root.classList.contains('is-rolling'), true);
});

test('sets is-rolling and a 3-row height with overflow hidden', () => {
  const t = run();
  assert.equal(t.root.classList.contains('is-rolling'), true);
  assert.equal(t.box(), ROW * 3 + GAP * 2);
  assert.equal(t.root.style.overflow, 'hidden');
  t.items.forEach((li) => assert.notEqual(translateY(li), null));
});

test('shows items 0 to 2 at start and hides the rest one row above', () => {
  const t = run();
  assert.deepEqual(t.visible(), [0, 1, 2]);
  assert.deepEqual(t.items.slice(0, 3).map(translateY), [0, ROW + GAP, (ROW + GAP) * 2]);
  t.items.slice(0, 3).forEach((li) => assert.ok(!li.style.opacity));
  t.items.slice(3).forEach((li) => {
    assert.equal(li.style.opacity, '0');
    assert.equal(translateY(li), -(ROW + GAP));
  });
});

test('sets a 600 ms ease transition on transform, opacity and color', () => {
  const t = run();
  for (const li of t.items) {
    for (const prop of ['transform', 'opacity', 'color']) {
      assert.match(li.style.transition, new RegExp(`${prop} 600ms ease`));
    }
  }
});

test('uses one 2500 ms interval', () => {
  const t = run();
  assert.equal(t.timers.intervals.length, 1);
  assert.equal(t.timers.intervals[0].ms, 2500);
});

test('shows items 14, 0, 1 after one step', () => {
  const t = run();
  t.timers.intervals[0].fn();
  assert.deepEqual(t.visible(), [14, 0, 1]);
  const leaving = t.items[2];
  assert.equal(leaving.style.opacity, '0');
  assert.ok(translateY(leaving) >= t.box(), 'leaving item moves below the list');
  t.flush();
  assert.equal(translateY(leaving), -(ROW + GAP));
  assert.match(leaving.style.transition, /transform 600ms/);
});

test('keeps only the middle visible item unmuted', () => {
  const t = run();
  for (let s = 0; s < 16; s += 1) {
    const [top, mid, bottom] = t.visible();
    assert.equal(t.items[top].classList.contains('is-muted'), true);
    assert.equal(t.items[mid].classList.contains('is-muted'), false);
    assert.equal(t.items[bottom].classList.contains('is-muted'), true);
    t.items.forEach((li, i) => {
      if (![top, mid, bottom].includes(i)) assert.equal(li.classList.contains('is-muted'), true);
    });
    t.tick();
  }
});

test('returns to the start after 15 steps', () => {
  const t = run();
  for (let s = 0; s < 15; s += 1) t.tick();
  assert.deepEqual(t.visible(), [0, 1, 2]);
});

test('slot height follows the item, and the box keeps the tallest 3-item window at every step', () => {
  const heights = [24, 48, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 72];
  const t = run({ heights });
  const fixed = 72 + 24 + 48 + GAP * 2;
  assert.equal(t.box(), fixed);
  assert.deepEqual(t.items.slice(0, 3).map(translateY), [0, 24 + GAP, 24 + 48 + GAP * 2]);
  t.items.slice(3).forEach((li) => assert.equal(translateY(li), -(72 + GAP)));
  for (let s = 0; s < 15; s += 1) {
    const leaving = t.visible()[2];
    t.timers.intervals[0].fn();
    assert.equal(t.box(), fixed, `step ${s + 1}`);
    assert.ok(translateY(t.items[leaving]) >= t.box(), `leaving item ${leaving} moves below the box`);
    t.flush();
  }
  assert.deepEqual(t.visible(), [0, 1, 2]);
});

test('keeps the space after the third item, so the box matches the static list', () => {
  const t = run({ trail: 4 });
  assert.equal(t.box(), ROW * 3 + GAP * 2 + 4);
  t.tick();
  assert.equal(t.box(), ROW * 3 + GAP * 2 + 4);
});

test('re-measures when the list width changes', () => {
  const t = run();
  t.state.width = 200;
  t.observers.ro[0].emit();
  assert.equal(t.box(), ROW * 2 * 3 + GAP * 2);
  const before = t.box();
  t.observers.ro[0].emit();
  assert.equal(t.box(), before);
});

test('re-measures after fonts load', async () => {
  const t = run();
  t.items.forEach((li) => (li.height = 30));
  t.fontsResolve();
  await new Promise((r) => setImmediate(r));
  assert.equal(t.box(), 30 * 3 + GAP * 2);
});

test('runs without ResizeObserver, IntersectionObserver or document.fonts', () => {
  const t = run({ ro: false, io: false, fonts: false });
  assert.equal(t.root.classList.contains('is-rolling'), true);
  t.tick();
  assert.deepEqual(t.visible(), [14, 0, 1]);
});

test('does not step with reduced motion', () => {
  const t = run({ reduced: true });
  t.tick();
  assert.deepEqual(t.visible(), [0, 1, 2]);
  t.env.reduced = false;
  t.tick();
  assert.deepEqual(t.visible(), [14, 0, 1]);
});

test('does not step when the tab is hidden', () => {
  const t = run({ hidden: true });
  t.tick();
  assert.deepEqual(t.visible(), [0, 1, 2]);
});

test('does not step while a mouse pointer is over the list', () => {
  const t = run();
  t.root.fire('pointerenter', { pointerType: 'mouse' });
  t.tick();
  assert.deepEqual(t.visible(), [0, 1, 2]);
  t.root.fire('pointerleave', { pointerType: 'mouse' });
  t.tick();
  assert.deepEqual(t.visible(), [14, 0, 1]);
});

test('a touch tap does not pause the list', () => {
  const t = run();
  t.root.fire('pointerenter', { pointerType: 'touch' });
  t.root.fire('mouseenter');
  t.tick();
  assert.deepEqual(t.visible(), [14, 0, 1]);
});

test('does not step while the list is off screen', () => {
  const t = run();
  const io = t.observers.io[0];
  assert.ok(io.targets.includes(t.root));
  io.emit(false);
  t.tick();
  assert.deepEqual(t.visible(), [0, 1, 2]);
  io.emit(true);
  t.tick();
  assert.deepEqual(t.visible(), [14, 0, 1]);
});

test('keeps DOM order and adds no ARIA', () => {
  const t = run();
  const order = [...t.root.children];
  for (let s = 0; s < 7; s += 1) t.tick();
  assert.equal(t.root.children.length, 15);
  t.root.children.forEach((li, i) => assert.equal(li, order[i]));
  for (const node of [t.root, ...t.items]) {
    assert.equal(node.hasAttribute('aria-live'), false);
    assert.equal(node.hasAttribute('aria-hidden'), false);
  }
});

test('runs once', () => {
  const t = run({ extraRuns: 1 });
  assert.equal(t.timers.intervals.length, 1);
  assert.equal(t.sandbox.SZ.taskListReady, true);
});

test('skips a list that is already rolling', () => {
  const t = run({ preRolling: true });
  assert.equal(t.timers.intervals.length, 0);
});
