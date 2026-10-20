// Runs init.js in a stub DOM to check cover-fit images get a `sizes` value wide enough for their box height.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(here, '../../projects/the-signalling-company/init.js'),
  'utf8',
);

const COVER = 'img.image_cover[srcset]';
const WEBFLOW_SIZES = '(max-width: 479px) 92vw, 462px';

function makeImg({ box, natural = [1080, 720], complete = true, chosen = 1080 }) {
  const listeners = [];
  const url = (w) => `https://cdn.example/cliff-p-${w}.avif`;
  return {
    box,
    srcset: [500, 1080, 1800, 2850].map((w) => `${url(w)} ${w}w`).join(', '),
    currentSrc: url(chosen),
    sizes: WEBFLOW_SIZES,
    complete,
    naturalWidth: complete ? natural[0] : 0,
    naturalHeight: complete ? natural[1] : 0,
    listeners,
    getBoundingClientRect() { return { width: this.box[0], height: this.box[1] }; },
    addEventListener(type, fn, opts) { listeners.push({ type, fn, opts }); },
    load() {
      this.complete = true;
      [this.naturalWidth, this.naturalHeight] = natural;
      listeners.filter((l) => l.type === 'load').forEach((l) => l.fn());
    },
  };
}

function makeEl() {
  return {
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    getAttribute: () => null,
    setAttribute() {},
    hasAttribute: () => false,
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (c) => c,
    clientWidth: 1440,
  };
}

async function run(imgs) {
  const selectors = [];
  const observers = [];
  class ResizeObserver {
    constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
    observe(el) { this.targets.push(el); queueMicrotask(() => this.cb([{ target: el }])); }
    disconnect() {}
    unobserve() {}
  }
  const resize = (img, box) => {
    img.box = box;
    observers.filter((o) => o.targets.includes(img)).forEach((o) => o.cb([{ target: img }]));
  };
  const documentElement = makeEl();
  const body = makeEl();
  const document = {
    readyState: 'complete',
    currentScript: null,
    documentElement,
    body,
    head: makeEl(),
    querySelectorAll(sel) {
      selectors.push(sel);
      return sel === COVER ? imgs : [];
    },
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => makeEl(),
    addEventListener() {},
  };
  const window = {
    location: { href: 'https://tsc-v2.webflow.io/careers' },
    innerWidth: 1440,
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {},
    ResizeObserver,
  };
  class Observer {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vm.runInNewContext(src, {
    window,
    document,
    navigator: {},
    URL,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: () => 0,
    MutationObserver: Observer,
    IntersectionObserver: Observer,
    ResizeObserver,
    console,
  });
  await new Promise((r) => setImmediate(r));
  return { selectors, resize };
}

test('queries only cover images that carry a srcset', async () => {
  const { selectors } = await run([]);
  assert.ok(selectors.includes(COVER));
});

test('careers box (588×630, 3:2 photo) is widened to its cover-fit width', async () => {
  const img = makeImg({ box: [588, 630] });
  await run([img]);
  assert.equal(img.sizes, '945px');
});

test('rounds the needed width up', async () => {
  const img = makeImg({ box: [400, 401], natural: [3, 2] });
  await run([img]);
  assert.equal(img.sizes, '602px');
});

test('leaves sizes alone when width already governs the cover fit', async () => {
  const img = makeImg({ box: [1440, 400] });
  await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
});

test('waits for an unloaded image, then fixes it on load', async () => {
  const img = makeImg({ box: [588, 630], complete: false });
  await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
  img.load();
  assert.equal(img.sizes, '945px');
});

test('fixes an image hidden at boot once it is revealed', async () => {
  const img = makeImg({ box: [0, 0] });
  const { resize } = await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
  resize(img, [588, 630]);
  assert.equal(img.sizes, '945px');
});

test('recomputes when the box grows after a resize', async () => {
  const img = makeImg({ box: [400, 401], natural: [3, 2] });
  const { resize } = await run([img]);
  assert.equal(img.sizes, '602px');
  resize(img, [588, 630]);
  assert.equal(img.sizes, '945px');
});

test('restores the Webflow sizes when width governs again after a resize', async () => {
  const img = makeImg({ box: [588, 630] });
  const { resize } = await run([img]);
  assert.equal(img.sizes, '945px');
  resize(img, [1440, 400]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
});

test('leaves sizes alone when the loaded candidate is within 10 percent of the need', async () => {
  const img = makeImg({ box: [588, 630], chosen: 1800 });
  await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
});

test('widens sizes when the loaded candidate falls short by more than 10 percent', async () => {
  const img = makeImg({ box: [588, 630], chosen: 1080 });
  await run([img]);
  assert.equal(img.sizes, '945px');
});

test('skips hidden images with an empty box', async () => {
  const img = makeImg({ box: [0, 0] });
  await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
});

test('skips a complete image with no natural size (broken)', async () => {
  const img = makeImg({ box: [588, 630] });
  img.naturalWidth = 0;
  img.naturalHeight = 0;
  await run([img]);
  assert.equal(img.sizes, WEBFLOW_SIZES);
});

test('fixes each image independently', async () => {
  const tall = makeImg({ box: [588, 630] });
  const wide = makeImg({ box: [1440, 400] });
  await run([tall, wide]);
  assert.equal(tall.sizes, '945px');
  assert.equal(wide.sizes, WEBFLOW_SIZES);
});
