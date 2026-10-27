// Unit tests for Carsa animations.js: runs the real file in a vm sandbox with a stub DOM, a minimal jQuery and a recording gsap, checking the marker gate and each block's path gate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'animations.js'), 'utf8');
const SHAPES = 'path,line,polyline,polygon,circle,ellipse,rect';

function makeEl(props = {}) {
  const attrs = { ...(props.attrs || {}) };
  const e = {
    style: {},
    q: {},
    attrs,
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    querySelectorAll: (s) => e.q[s] || [],
    ...props,
  };
  e.attrs = attrs;
  return e;
}

function makeWrapper(kind) {
  const path = makeEl({ getTotalLength: () => 100 });
  const svg = makeEl({ getBoundingClientRect: () => ({ top: 100, bottom: 200 }) });
  svg.q[SHAPES] = [path];
  const wrapper = makeEl({ attrs: { 'data-svg': kind } });
  wrapper.q.svg = [svg];
  return { wrapper, svg, path };
}

function wrap(els) {
  const list = els.filter(Boolean);
  return {
    length: list.length,
    get: () => list,
    data(k, v) {
      const el = list[0];
      el.__jq = el.__jq || {};
      if (v === undefined) return el.__jq[k];
      el.__jq[k] = v;
      return this;
    },
  };
}

function makeEnv({ path = '/', marker = true, nodes = {}, gsapPresent = true } = {}) {
  const calls = { set: [], timeline: 0, delayed: 0, scrollTriggers: 0 };
  const gsap = {
    registerPlugin() {},
    timeline: () => {
      calls.timeline++;
      return { to() { return this; } };
    },
    to: () => ({ play() {} }),
    set: (els, vars) => calls.set.push({ els, vars }),
    delayedCall: () => calls.delayed++,
  };
  const document = {
    readyState: 'complete',
    documentElement: { clientHeight: 800 },
    addEventListener() {},
    querySelector: (s) => (nodes[s] || [])[0] || null,
    querySelectorAll: (s) => nodes[s] || [],
  };
  const location = { pathname: path, search: '', hostname: 'www.carsa.co.uk' };
  const window = {
    location,
    innerHeight: 800,
    addEventListener() {},
    removeEventListener() {},
    setTimeout: () => {},
  };
  if (marker) window.__CARSA_PAGE = { release: 'v1.2.0' };
  const jQuery = (arg) => {
    if (typeof arg === 'function') return arg();
    if (typeof arg === 'string') return wrap(nodes[arg] || []);
    return wrap([arg]);
  };
  window.jQuery = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    getComputedStyle: () => ({ stroke: '#000', strokeWidth: '2' }),
    ScrollTrigger: { create: () => calls.scrollTriggers++ },
    console,
  });
  if (gsapPresent) context.gsap = gsap;
  vm.runInContext(SOURCE, context);
  return { window, calls };
}

function run(path, extra = {}) {
  const line = makeWrapper('draw-line');
  const shape = makeWrapper('draw-shape');
  const nodes = {
    '[data-svg="draw-line"]': [line.wrapper],
    '[data-svg="draw-shape"]': [shape.wrapper],
    ...(extra.nodes || {}),
  };
  const env = makeEnv({ path, nodes, marker: extra.marker !== false });
  return { ...env, lineRan: line.path.style.strokeDasharray === '100 100', shapeRan: env.calls.set.length > 0 };
}

test('marker gate: without __CARSA_PAGE nothing runs and __CARSA_RAN stays undefined', () => {
  const r = run('/about/carsa', { marker: false });
  assert.equal(r.window.__CARSA_RAN, undefined);
  assert.equal(r.lineRan, false);
  assert.equal(r.shapeRan, false);
});

test('marker gate: with the marker the module records itself once', () => {
  const r = run('/contact');
  assert.deepEqual([...r.window.__CARSA_RAN], ['animations.js']);
});

test('draw-line: primes dashes and plays a wrapper already in view', () => {
  const r = run('/contact');
  assert.equal(r.lineRan, true);
  assert.equal(r.calls.delayed, 1);
});

test('draw-shapes: hides shapes before the pop-up on a D2 page', () => {
  const r = run('/about/carsa');
  assert.equal(r.shapeRan, true);
  assert.deepEqual({ ...r.calls.set[0].vars }, { y: 24, scale: 0, opacity: 0, transformOrigin: '50% 50%', transformBox: 'fill-box' });
});

test('gates: D1-only page does not gain draw-shapes', () => {
  const r = run('/contact');
  assert.equal(r.lineRan, true);
  assert.equal(r.shapeRan, false);
});

test('gates: home, D1+D2 pages and fuel/promotions templates run both', () => {
  for (const p of ['/', '/about/carsa', '/car-finance', '/reserve', '/sell-car/value-car', '/used-cars/fuel/petrol', '/used-cars/promotions/ev']) {
    const r = run(p);
    assert.equal(r.lineRan, true, p);
    assert.equal(r.shapeRan, true, p);
  }
});

test('gates: blog index draws lines, blog posts draw shapes only', () => {
  assert.deepEqual([run('/blog').lineRan, run('/blog').shapeRan], [true, false]);
  assert.deepEqual([run('/blog/some-post').lineRan, run('/blog/some-post').shapeRan], [false, true]);
});

test('gates: CMS templates match one extra segment only', () => {
  assert.equal(run('/stores/leeds').lineRan, true);
  assert.equal(run('/stores').lineRan, false);
  assert.equal(run('/stores/leeds/extra').lineRan, false);
  assert.equal(run('/terms/privacy').lineRan, true);
  assert.equal(run('/sell-car/store/leeds').lineRan, true);
  assert.equal(run('/mot-and-car-servicing/servicing-locations/leeds').lineRan, true);
});

test('gates: a trailing slash still matches', () => {
  assert.equal(run('/contact/').lineRan, true);
});

test('gates: the 404 page (any path with #404-message) draws shapes only', () => {
  const r = run('/vehicles/used/zz99zzz', { nodes: { '#404-message': [{}] } });
  assert.equal(r.shapeRan, true);
  assert.equal(r.lineRan, false);
});

test('gates: a marked page outside both lists gets nothing', () => {
  const r = run('/used-cars');
  assert.deepEqual([...r.window.__CARSA_RAN], ['animations.js']);
  assert.equal(r.lineRan, false);
  assert.equal(r.shapeRan, false);
  assert.equal(r.calls.timeline, 0);
});

test('without gsap both blocks return quietly', () => {
  const env = makeEnv({ path: '/about/carsa', gsapPresent: false });
  assert.deepEqual([...env.window.__CARSA_RAN], ['animations.js']);
});

test('source: draw-line comes before draw-shapes', () => {
  assert.ok(SOURCE.indexOf('[data-svg="draw-line"]') < SOURCE.indexOf('[data-svg="draw-shape"]'));
});

test('source: marker gate is the first statement in the wrapper', () => {
  assert.match(SOURCE, /^\(function \(\$\) \{\n {2}if \(!window\.__CARSA_PAGE\) return;\n {2}\(window\.__CARSA_RAN = window\.__CARSA_RAN \|\| \[\]\)\.push\('animations\.js'\);/m);
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  (SOURCE.match(/.{0,9}console\.log/g) || []).forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: DOMContentLoaded and load are bound only inside onReady / onLoad', () => {
  assert.equal((SOURCE.match(/DOMContentLoaded/g) || []).length, 1);
  assert.equal((SOURCE.match(/addEventListener\('load'/g) || []).length, 1);
  assert.ok(!/\.on\(['"]load/.test(SOURCE));
});

test('source: exactly one comment, on line 1', () => {
  const lines = SOURCE.split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  assert.ok(!SOURCE.includes('/*'));
  lines.slice(1).forEach((line, i) => {
    assert.ok(!/^\s*\/\//.test(line), `comment line at ${i + 2}`);
    assert.ok(!/(^|[^:])\/\/\s/.test(line), `trailing comment at ${i + 2}`);
  });
});
