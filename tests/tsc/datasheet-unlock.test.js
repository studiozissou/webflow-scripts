// Runs datasheet-unlock.js in a stub DOM to check links stay locked until a datasheet form succeeds, then open their PDFs directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(here, '../../projects/the-signalling-company/datasheet-unlock.js'),
  'utf8',
);

const KEY = 'tsc-datasheets-unlocked';
const TRIGGER = '[data-link="datasheet-modal"]';
const DONE = '[data-modal="datasheet-wrapper"] .w-form-done';
const FAIL = '[data-modal="datasheet-wrapper"] .w-form-fail';

function makeLink(href) {
  const link = {
    attrs: { 'data-link': 'datasheet-modal', href },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    hasAttribute(k) { return k in this.attrs; },
    closest(sel) { return sel === TRIGGER ? this : null; },
  };
  link.child = { closest: (sel) => link.closest(sel) };
  return link;
}

function makeBlock() {
  return { style: { display: 'none' }, observers: [] };
}

function run({ hrefs = ['a.pdf', 'b.pdf', 'c.pdf'], stored = null, storageThrows = false } = {}) {
  const links = hrefs.map(makeLink);
  const done = hrefs.map(makeBlock);
  const fail = hrefs.map(makeBlock);
  const listeners = [];
  const store = stored ? { [KEY]: stored } : {};
  const localStorage = {
    getItem(k) { if (storageThrows) throw new Error('blocked'); return k in store ? store[k] : null; },
    setItem(k, v) { if (storageThrows) throw new Error('blocked'); store[k] = String(v); },
  };
  class MutationObserver {
    constructor(cb) { this.cb = cb; }
    observe(target) { target.observers.push(this.cb); }
  }
  const document = {
    readyState: 'interactive',
    querySelectorAll(sel) {
      if (sel === TRIGGER) return links;
      if (sel === DONE) return done;
      if (sel === FAIL) return fail;
      return [];
    },
    addEventListener() {},
  };
  const window = {
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
  };
  vm.runInNewContext(src, { window, document, localStorage, MutationObserver });

  function click(link) {
    const e = {
      target: link.child,
      prevented: false,
      stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
    };
    listeners.filter((l) => l.type === 'click').forEach((l) => l.fn(e));
    return e;
  }
  function reveal(block) {
    block.style.display = 'block';
    block.observers.forEach((cb) => cb([]));
  }
  return { links, done, fail, listeners, store, click, reveal };
}

test('moves each PDF href into data-pdf and sets href to # on load', () => {
  const { links } = run();
  assert.equal(links[0].getAttribute('href'), '#');
  assert.equal(links[0].getAttribute('data-pdf'), 'a.pdf');
  assert.equal(links[0].hasAttribute('data-unlocked'), false);
});

test('registers one capture-phase click listener on window', () => {
  const { listeners } = run();
  const clicks = listeners.filter((l) => l.type === 'click');
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].capture, true);
});

test('locked click is prevented but still propagates so the popup opens', () => {
  const { links, click } = run();
  const e = click(links[1]);
  assert.equal(e.prevented, true);
  assert.equal(e.stopped, false);
});

test('unlocks immediately when the stored flag is set', () => {
  const { links } = run({ stored: '1' });
  links.forEach((link, i) => {
    assert.equal(link.getAttribute('href'), ['a.pdf', 'b.pdf', 'c.pdf'][i]);
    assert.equal(link.getAttribute('target'), '_blank');
    assert.equal(link.getAttribute('rel'), 'noopener');
    assert.equal(link.hasAttribute('data-unlocked'), true);
  });
});

test('unlocked click stops propagation and keeps the native link default', () => {
  const { links, click } = run({ stored: '1' });
  const e = click(links[0]);
  assert.equal(e.stopped, true);
  assert.equal(e.prevented, false);
});

test('a successful submission unlocks every link and stores the flag', () => {
  const { links, done, store, reveal, click } = run();
  reveal(done[0]);
  assert.equal(store[KEY], '1');
  assert.equal(links[2].getAttribute('href'), 'c.pdf');
  assert.equal(click(links[2]).stopped, true);
});

test('a failed submission does not unlock', () => {
  const { links, fail, store, reveal } = run();
  reveal(fail[0]);
  assert.equal(store[KEY], undefined);
  assert.equal(links[0].getAttribute('href'), '#');
});

test('success block mutation that stays hidden does not unlock', () => {
  const { links, done } = run();
  done[0].observers.forEach((cb) => cb([]));
  assert.equal(links[0].getAttribute('href'), '#');
});

test('a link with no PDF stays locked after unlocking', () => {
  const { links, click } = run({ hrefs: ['a.pdf', '#'], stored: '1' });
  assert.equal(links[1].getAttribute('href'), '#');
  assert.equal(links[1].hasAttribute('data-unlocked'), false);
  assert.equal(click(links[1]).prevented, true);
});

test('blocked storage still unlocks for the current page load', () => {
  const { links, done, reveal } = run({ storageThrows: true });
  assert.equal(links[0].getAttribute('href'), '#');
  reveal(done[0]);
  assert.equal(links[0].getAttribute('href'), 'a.pdf');
});

test('unlocking twice is harmless', () => {
  const { links, done, reveal } = run({ stored: '1' });
  reveal(done[1]);
  assert.equal(links[0].getAttribute('href'), 'a.pdf');
  assert.equal(links[0].getAttribute('data-pdf'), 'a.pdf');
});

test('clicks outside a datasheet link are ignored', () => {
  const { listeners } = run();
  const e = {
    target: { closest: () => null },
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  };
  listeners.forEach((l) => l.fn(e));
  assert.equal(e.prevented, false);
  assert.equal(e.stopped, false);
});
