// Unit tests for Carsa get-started.js: runs the real file in a vm sandbox with a stub DOM, a minimal jQuery and a GSAP stub and checks the five get-started blocks and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'get-started.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');
const makeEnv = (opts) => baseEnv(SOURCE, opts);

function sourceChecks(name) {
  const lines = SOURCE.trimEnd().split('\n');
  test(`${name} source: one header comment on line 1 and no other comments`, () => {
    assert.match(lines[0], /^\/\/ \S/);
    lines.slice(1).forEach((l, i) => {
      assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
      assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
      assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
    });
  });
  test(`${name} source: no {{wf tokens`, () => {
    assert.ok(!SOURCE.includes('{{wf'));
  });
  test(`${name} source: console.log only behind DEBUG &&`, () => {
    const all = SOURCE.match(/console\.log/g) || [];
    const gated = SOURCE.match(/DEBUG && console\.log/g) || [];
    assert.equal(all.length, gated.length);
    if (all.length) assert.match(SOURCE, /var DEBUG = false;/);
  });
  test(`${name} source: no DOMContentLoaded or load listeners of its own`, () => {
    assert.doesNotMatch(SOURCE, /DOMContentLoaded/);
    assert.doesNotMatch(SOURCE, /addEventListener\(['"]load['"]/);
    assert.doesNotMatch(SOURCE, /\$\(window\)\.on\(['"]load/);
  });
  test(`${name} source: classic script with the __CARSA guard, then the marker gate`, () => {
    assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
    assert.doesNotMatch(SOURCE, /^(const|let)\s/m);
    assert.equal(lines[1], '(function ($) {');
    assert.equal(lines[2].trim(), 'var H = window.__CARSA;');
    assert.equal(lines[3].trim(), 'if (!H) {');
    assert.equal(lines[4].trim(), `if (window.DD_LOGS) window.DD_LOGS.logger.warn('${name}: window.__CARSA missing');`);
    assert.equal(lines[5].trim(), 'return;');
    assert.equal(lines[6].trim(), '}');
    assert.equal(lines[7].trim(), 'if (!window.__CARSA_PAGE) return;');
    assert.equal(lines[8].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${name}');`);
    assert.equal(lines[lines.length - 1], '})(window.jQuery);');
  });
  test(`${name} source: no local copies of the shared helpers`, () => {
    assert.doesNotMatch(SOURCE, /function\s+(block|onReady|onLoad|onPage|cms|getAttributionParams|addParams)\b/);
  });
}

function markerTests(name, opts = {}) {
  test(`${name}: without the marker nothing runs and __CARSA_RAN stays undefined`, () => {
    const env = makeEnv({ ...opts, marker: null });
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.location.replacedWith, undefined);
    assert.equal(env.document.title, opts.title || '');
  });
  test(`${name}: with the marker it pushes its name once`, () => {
    const env = makeEnv(opts);
    assert.deepEqual([...env.window.__CARSA_RAN], [name]);
  });
  test(`${name}: without window.__CARSA it warns once and stands down before the marker gate`, () => {
    const warns = [];
    const DD_LOGS = { logger: { warn: (m) => warns.push(m) } };
    const env = makeEnv({ ...opts, helpers: false, config: { ...(opts.config || {}), DD_LOGS } });
    assert.deepEqual(warns, [`${name}: window.__CARSA missing`]);
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.timers.length, 0);
    assert.doesNotThrow(() => makeEnv({ ...opts, helpers: false }));
  });
}

sourceChecks(MODULE);

markerTests(MODULE, { pathname: '/get-started', search: '?vrm=ab12cde' });

function radio(id, { checked = false, name = 'booking', field = null } = {}) {
  return makeEl({ id, name, checked, closest: (s) => (s === '.radio3_field' ? field : null) });
}

test('get-started URL data: adds the hidden vrm input, fills location/vrm text and hides the free test drive for storage', () => {
  const form = makeEl();
  const loc = makeEl();
  const vrmText = makeEl();
  const ftd = makeEl();
  makeEnv({
    pathname: '/get-started',
    search: '?vrm=AB12CDE&location=Leeds&storage=true',
    nodes: { form: [form], '[data-text="location"]': [loc], '[data-text="vrm"]': [vrmText], '#free-test-drive': [ftd] },
  });
  assert.equal(form.children.length, 1);
  assert.equal(form.children[0].tagName, 'INPUT');
  assert.equal(form.children[0].type, 'hidden');
  assert.equal(form.children[0].name, 'vrm');
  assert.equal(form.children[0].value, 'AB12CDE');
  assert.equal(loc.textContent, 'Leeds');
  assert.equal(vrmText.textContent, 'AB12CDE');
  assert.equal(ftd.style.display, 'none');
});

test('get-started booking link: a pre-checked radio sets #book-button with UTMs and referrer, the note and #back-button', () => {
  const reserve = radio('reserve-collect', { checked: true });
  const free = radio('test-drive-free');
  const book = makeEl();
  book.classList.add('is-disabled');
  const note = makeEl();
  const back = makeEl();
  makeEnv({
    pathname: '/get-started',
    search: '?vrm=AB12CDE',
    local: { attribution: JSON.stringify({ utms: { utm_source: 'google' }, referrerDomain: 'bing.com' }) },
    nodes: {
      'input[type="radio"]': [reserve, free],
      'input[type="radio"]:checked': [reserve],
      '#book-button': [book],
      '#reservation-note': [note],
      '#back-button': [back],
    },
  });
  const href = new URL(book.attrs.href);
  assert.equal(href.origin + href.pathname, 'https://quote.carsa.co.uk/build-deal/AB12CDE');
  assert.equal(href.searchParams.get('utm_source'), 'google');
  assert.equal(href.searchParams.get('referrer'), 'bing.com');
  assert.equal(book.attrs.target, '_blank');
  assert.equal(book.attrs['data-analytics-event'], 'reserve-collect-submit');
  assert.equal(book.textContent, 'Reserve & collect');
  assert.equal(book.classList.contains('is-disabled'), false);
  assert.equal(note.style.opacity, 1);
  assert.equal(back.attrs.href, 'https://www.carsa.co.uk/vehicles/used/AB12CDE');
  assert.equal(back.attrs.target, '_self');
  free.listeners.change[0].call(free, {});
  assert.equal(book.textContent, 'Book free test drive');
  assert.equal(note.style.opacity, 0);
  assert.equal(note.style.pointerEvents, 'none');
});

test('get-started squiggle: a radio change shows the checked squiggle and hides the others in its group', () => {
  const sqA = makeEl();
  const sqB = makeEl();
  const fieldA = makeEl({ querySelectorAll: (s) => (s === '.booking-options-squiggle' ? [sqA] : []) });
  const fieldB = makeEl({ querySelectorAll: (s) => (s === '.booking-options-squiggle' ? [sqB] : []) });
  const a = radio('a', { checked: true, field: fieldA });
  const b = radio('b', { field: fieldB });
  const env = makeEnv({ pathname: '/get-started', nodes: { 'input[name="booking"]': [a, b] } });
  env.delegate('change', 'input[type="radio"]', a);
  assert.equal(sqA.style.opacity, 0.75);
  assert.equal(sqB.style.opacity, 0);
});

test('get-started draw-line: defines svg.__svgDrawPlay and a checked radio plays its field\'s SVG', () => {
  let played = 0;
  const path = makeEl({ getTotalLength: () => 120 });
  const svg = makeEl({ querySelectorAll: () => [path] });
  const wrapper = makeEl({ querySelectorAll: (s) => (s === 'svg' ? [svg] : []) });
  const field = makeEl({ querySelectorAll: (s) => (s === '[data-svg="draw-line"] svg' ? [svg] : []) });
  const r = radio('reserve-collect', { checked: true, field });
  const gsap = {
    registerPlugin() {},
    timeline: () => ({ to() { return this; } }),
    to: () => ({ pause() { return this; }, play() { played++; return this; } }),
  };
  const env = makeEnv({
    pathname: '/get-started',
    nodes: { '[data-svg="draw-line"]': [wrapper] },
    globals: { gsap, getComputedStyle: () => ({ stroke: '#000', strokeWidth: '2' }) },
  });
  assert.equal(typeof svg.__svgDrawPlay, 'function');
  assert.equal(path.style.strokeDasharray, '120 120');
  env.delegate('change', 'input[type="radio"]', r);
  assert.equal(played, 1);
});

test('get-started draw-line: without gsap only the squiggle handler is delegated', () => {
  const env = makeEnv({ pathname: '/get-started' });
  assert.equal(env.delegated.length, 1);
});

test('get-started meta title: ?vrm= upper-cases into the title and meta titles', () => {
  const meta = makeEl();
  const env = makeEnv({ pathname: '/get-started', search: '?vrm=ab12cde', nodes: { 'meta[name="title"], meta[property="og:title"]': [meta] } });
  assert.equal(env.document.title, 'Get Started With AB12CDE | Carsa');
  assert.equal(meta.attrs.content, 'Get Started With AB12CDE | Carsa');
});

function bookingRun(search) {
  const reserve = radio('reserve-collect', { checked: true });
  const free = radio('test-drive-free');
  const book = makeEl();
  book.classList.add('is-disabled');
  const back = makeEl();
  makeEnv({
    pathname: '/get-started',
    search,
    nodes: {
      'input[type="radio"]': [reserve, free],
      'input[type="radio"]:checked': [reserve],
      '#book-button': [book],
      '#reservation-note': [makeEl()],
      '#back-button': [back],
    },
  });
  return { book, back, free };
}

test('get-started booking link: spaces are stripped from the VRM in the book and back links', () => {
  const { book, back, free } = bookingRun('?vrm=AB12%20CDE');
  assert.equal(new URL(book.attrs.href).pathname, '/build-deal/AB12CDE');
  assert.equal(back.attrs.href, 'https://www.carsa.co.uk/vehicles/used/AB12CDE');
  free.listeners.change[0].call(free, {});
  assert.equal(new URL(book.attrs.href).pathname, '/book/AB12CDE');
});

test('get-started booking link: a VRM with path characters changes no link', () => {
  ['../x', 'AB12CDE?x=1', 'ABCDEFGHI'].forEach((v) => {
    const { book, back, free } = bookingRun('?vrm=' + encodeURIComponent(v));
    free.listeners.change[0].call(free, {});
    assert.equal(book.attrs.href, undefined, v);
    assert.equal(back.attrs.href, undefined, v);
    assert.equal(book.classList.contains('is-disabled'), true, v);
  });
});

test('get-started booking link: URL UTMs are used when nothing is stored, and session UTMs are ignored', () => {
  const reserve = radio('reserve-collect', { checked: true });
  const book = makeEl();
  makeEnv({
    pathname: '/get-started',
    search: '?vrm=AB12CDE&utm_source=url',
    session: { attribution_session: JSON.stringify({ utms: { utm_source: 'session' } }) },
    nodes: { 'input[type="radio"]': [reserve], 'input[type="radio"]:checked': [reserve], '#book-button': [book], '#reservation-note': [makeEl()] },
  });
  assert.equal(new URL(book.attrs.href).searchParams.get('utm_source'), 'url');
});
