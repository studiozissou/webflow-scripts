// Unit tests for Carsa fuel-template.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the PX links, the "Search all" links, the __CARSA_FUEL config coercion and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'fuel-template.js';
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

function searchRun(fuel, extra = {}) {
  const btns = [makeEl(), makeEl()];
  const config = fuel === undefined ? {} : { __CARSA_FUEL: fuel };
  const env = makeEnv({ pathname: '/used-cars/fuel/petrol', config, nodes: { '[data-button="search-similar"]': btns }, ...extra });
  return { env, btns };
}

markerTests(MODULE, { config: { __CARSA_FUEL: { name: 'Petrol' } } });

test('fuel: search-similar buttons link to /used-cars filtered by fuel type', () => {
  const { btns } = searchRun({ name: 'Plug-in Hybrid' });
  btns.forEach((b) => assert.equal(b.attrs.href, '/used-cars?cars_fuel-type_equal=Plug-in%20Hybrid'));
});

test('fuel: surrounding whitespace is trimmed, as the inline .trim() did', () => {
  const { btns } = searchRun({ name: '  Diesel \n' });
  assert.equal(btns[0].attrs.href, '/used-cars?cars_fuel-type_equal=Diesel');
});

test('fuel: an empty name gives plain /used-cars, as an empty CMS field did', () => {
  const { btns } = searchRun({ name: '' });
  assert.equal(btns[0].attrs.href, '/used-cars');
});

test('fuel: a missing key behaves like an empty CMS field', () => {
  const { btns } = searchRun({});
  assert.equal(btns[0].attrs.href, '/used-cars');
});

test('fuel: "Search all" waits for DOMContentLoaded while the document is still loading', () => {
  const { env, btns } = searchRun({ name: 'Electric' }, { readyState: 'loading' });
  assert.equal(btns[0].attrs.href, undefined);
  env.fire('doc', 'DOMContentLoaded');
  assert.equal(btns[0].attrs.href, '/used-cars?cars_fuel-type_equal=Electric');
});

test('fuel: a missing window.__CARSA_FUEL skips "Search all" without throwing but keeps the PX builder', () => {
  const btn = makeEl();
  const formLarge = makeEl({ querySelectorAll: (s) => (s === '[name="px-vrm"]' ? [makeEl({ value: 'AB12CDE' })] : []) });
  const env = makeEnv({
    config: {},
    nodes: { '[data-button="search-similar"]': [btn], '#px-form-large': [formLarge], '#px-button-large': [makeEl()] },
  });
  assert.equal(btn.attrs.href, undefined);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.ok(env.timers.length === 0);
});

test('fuel PX: input on the large form builds the quote link ignoring session UTMs, with the external referrer', () => {
  const vrm = makeEl({ value: 'AB12 CDE' });
  const form = makeEl({ querySelectorAll: (s) => (s === '[name="px-vrm"]' ? [vrm] : []) });
  const button = makeEl();
  const env = makeEnv({
    config: { __CARSA_FUEL: { name: 'Petrol' } },
    referrer: 'https://www.google.com/search',
    session: { attribution_session: JSON.stringify({ utms: { utm_source: 'meta' } }) },
    nodes: { '#px-form-large': [form], '#px-button-large': [button], '#px-form-large [name="px-vrm"]': [vrm] },
  });
  vrm.listeners.input[0].call(vrm, {});
  const href = new URL(button.attrs.href);
  assert.equal(href.origin + href.pathname, 'https://quote.carsa.co.uk/value-my-car/enter-vrm');
  assert.equal(href.searchParams.get('px_vrm'), 'AB12 CDE');
  assert.equal(href.searchParams.get('utm_source'), null);
  assert.equal(href.searchParams.get('referrer'), 'google.com');
  assert.equal(button.attrs.target, '_blank');
  assert.equal(env.window.__CARSA_RAN.length, 1);
});

function pxParams({ local = {}, session = {}, search = '', referrer = '' } = {}) {
  const vrm = makeEl({ value: 'AB12CDE' });
  const form = makeEl({ querySelectorAll: (s) => (s === '[name="px-vrm"]' ? [vrm] : []) });
  const button = makeEl();
  makeEnv({
    config: { __CARSA_FUEL: { name: 'Petrol' } },
    search,
    referrer,
    local,
    session,
    nodes: { '#px-form-large': [form], '#px-button-large': [button], '#px-form-large [name="px-vrm"]': [vrm] },
  });
  vrm.listeners.input[0].call(vrm, {});
  const u = new URL(button.attrs.href);
  return Object.fromEntries([...u.searchParams].filter(([k]) => k !== 'px_vrm'));
}

const STORED = JSON.stringify({ utms: { utm_source: 'first', utm_medium: 'cpc' }, referrerDomain: 'bing.com' });

test('fuel PX attribution 1: stored first-touch UTMs and referrer', () => {
  assert.deepEqual(pxParams({ local: { attribution: STORED } }), { utm_source: 'first', utm_medium: 'cpc', referrer: 'bing.com' });
});

test('fuel PX attribution 2: no stored UTMs, UTMs in the URL', () => {
  assert.deepEqual(pxParams({ search: '?utm_source=url&utm_campaign=spring' }), { utm_source: 'url', utm_campaign: 'spring' });
});

test('fuel PX attribution 3: nothing stored, external referrer', () => {
  assert.deepEqual(pxParams({ referrer: 'https://www.google.com/search' }), { referrer: 'google.com' });
});

test('fuel PX attribution 4: session UTMs that differ from the stored first touch give the first touch', () => {
  const session = { attribution_session: JSON.stringify({ utms: { utm_source: 'second' }, referrerDomain: 'meta.com' }) };
  assert.deepEqual(pxParams({ local: { attribution: STORED }, session }), { utm_source: 'first', utm_medium: 'cpc', referrer: 'bing.com' });
});

test('fuel: "Search all" encodes the fuel name', () => {
  const { btns } = searchRun({ name: 'Petrol & Electric' });
  assert.equal(btns[0].attrs.href, '/used-cars?cars_fuel-type_equal=Petrol%20%26%20Electric');
});
