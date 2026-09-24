// Unit tests for the Oost smooth-scroll module: runs the real file in a vm sandbox with a stub Lenis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'oost', 'smooth-scroll.js'),
  'utf8',
);

function run({ reducedMotion = false, lenis = true } = {}) {
  const instances = [];
  class Lenis {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      instances.push(this);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  const window = {
    matchMedia: (q) => ({
      matches: reducedMotion && q.includes('prefers-reduced-motion'),
    }),
    OOST: { modules: [] },
  };
  if (lenis) window.Lenis = Lenis;
  window.window = window;
  vm.runInContext(SOURCE, vm.createContext({ window }));
  return { window, instances };
}

test('starts one Lenis instance with automatic frames and anchor handling', () => {
  const { instances } = run();
  assert.equal(instances.length, 1);
  assert.equal(instances[0].options.autoRaf, true);
  assert.equal(instances[0].options.anchors, true);
  assert.equal(instances[0].options.smoothWheel, true);
});

test('exposes the instance on window.OOST.lenis', () => {
  const { window, instances } = run();
  assert.equal(window.OOST.lenis, instances[0]);
});

test('does nothing when the visitor prefers reduced motion', () => {
  const { window, instances } = run({ reducedMotion: true });
  assert.equal(instances.length, 0);
  assert.equal(window.OOST.lenis, undefined);
});

test('does nothing when Lenis did not load', () => {
  const { window, instances } = run({ lenis: false });
  assert.equal(instances.length, 0);
  assert.equal(window.OOST.lenis, undefined);
});

test('running twice replaces the first instance instead of stacking a second', () => {
  const { window, instances } = run();
  vm.runInContext(SOURCE, vm.createContext({ window }));
  assert.equal(instances.length, 2);
  assert.equal(instances[0].destroyed, true);
  assert.equal(window.OOST.lenis, instances[1]);
});
