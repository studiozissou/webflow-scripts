import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(
  new URL('../../projects/coconut/snippets/match-heights.js', import.meta.url),
  'utf8'
);

function makeEl(name, natural) {
  return {
    style: { minHeight: '' },
    children: [{}],
    offsetParent: {},
    getAttribute: () => name,
    getClientRects: () => [1],
    getBoundingClientRect() {
      const min = parseFloat(this.style.minHeight) || 0;
      return { height: Math.max(natural, min) };
    },
  };
}

function setup(els) {
  const frames = [];
  const pending = [];
  let roCallback = null;
  let syncs = 0;
  const window = {
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    addEventListener() {},
  };
  const ctx = {
    window,
    document: {
      readyState: 'complete',
      querySelectorAll: () => els,
    },
    requestAnimationFrame: (fn) => frames.push(fn),
    cancelAnimationFrame() {},
    // Real ResizeObservers report every newly observed element once.
    ResizeObserver: function (cb) {
      roCallback = cb;
      this.observe = (target) => pending.push(target);
      this.disconnect = () => {
        pending.length = 0;
      };
    },
  };
  vm.runInNewContext(SRC, ctx);
  const flush = () => {
    for (let i = 0; i < 50 && (frames.length || pending.length); i++) {
      while (frames.length) {
        syncs++;
        frames.shift()();
      }
      if (pending.length && roCallback) {
        const entries = pending.splice(0).map((target) => ({
          target,
          contentRect: { width: 100, height: target.h || 20 },
        }));
        roCallback(entries);
      }
    }
  };
  const fireResize = (target, h) => {
    target.h = h;
    roCallback([{ target, contentRect: { width: 100, height: h } }]);
  };
  return { window, flush, fireResize, syncs: () => syncs };
}

test('equalises each data-mh group to its tallest member', () => {
  const els = [makeEl('header', 262), makeEl('header', 281), makeEl('key', 467), makeEl('key', 475)];
  const { flush } = setup(els);
  flush();
  assert.deepStrictEqual(els.map((e) => e.style.minHeight), ['281px', '281px', '475px', '475px']);
});

test('heights survive a resync where nothing changed', () => {
  const els = [makeEl('header', 262), makeEl('header', 281)];
  const { window, flush, fireResize } = setup(els);
  flush();
  window.matchHeights.refresh();
  flush();
  assert.deepStrictEqual(els.map((e) => e.style.minHeight), ['281px', '281px']);
});

test('settles instead of re-syncing every frame', () => {
  const els = [makeEl('header', 262), makeEl('header', 281)];
  const { flush, syncs } = setup(els);
  flush();
  assert.ok(syncs() <= 2, 'synced ' + syncs() + ' times');
});

test('resyncs when a child inside a section changes size', () => {
  const els = [makeEl('header', 262), makeEl('header', 281)];
  const { flush, fireResize, syncs } = setup(els);
  flush();
  const before = syncs();
  fireResize(els[0].children[0], 60);
  flush();
  assert.ok(syncs() > before);
});
