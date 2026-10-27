// Unit tests for Carsa finance-calculator.js: runs the real file in a vm sandbox with a stub DOM and a recorded fetch and checks the calculator, the mobile results scroll and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'finance-calculator.js';
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

const flush = () => new Promise((r) => setImmediate(r));

function calcEnv({ config = null, configResponse = null, readyState = 'complete', marker = MARKER, extraNodes = {} } = {}) {
  const fetches = [];
  const fetch = (url, opts) => {
    fetches.push({ url, opts });
    if (url.endsWith('/finance-config')) {
      if (configResponse) return configResponse.then((c) => ({ ok: true, json: () => Promise.resolve(c) }));
      return config ? Promise.resolve({ ok: true, json: () => Promise.resolve(config) }) : Promise.reject(new Error('offline'));
    }
    return Promise.resolve({ json: () => Promise.resolve({ hp: { payments: { regular: 321.456 }, totalAmountPayable: 15000, totalCharges: 2000, flatRate: 5.25 } }) });
  };
  const deposit = makeEl({ id: 'finance-deposit' });
  const price = makeEl({ id: 'finance-car-price', value: '£15,000' });
  const total = makeEl({ id: 'total-price' });
  const hpPrice = makeEl({ id: 'hp-price' });
  const terms = ['24', '36', '48'].map((v) => makeEl({ id: v, value: v, name: 'term', checked: v === '24' }));
  const aprs = ['excellent', 'very-good', 'fair'].map((v) => makeEl({ value: v, name: 'credit' }));
  const aprOut = makeEl();
  const nodes = {
    '#finance-deposit': [deposit],
    '#finance-car-price': [price],
    '#total-price': [total],
    '#hp-price': [hpPrice],
    '#24': [terms[0]],
    '#36': [terms[1]],
    '#48': [terms[2]],
    'input[name="term"]': terms,
    'input[name="credit"]': aprs,
    'input[type="radio"][data-name="finance-term"]': terms,
    'input[type="radio"][data-name="apr"]': aprs,
    'input[type="radio"][data-name="apr"][value="very-good"]': [aprs[1]],
    '[data-number="apr"]': [aprOut],
    ...extraNodes,
  };
  Object.defineProperty(nodes, 'input[type="radio"][data-name="finance-term"]:checked', { get: () => terms.filter((r) => r.checked) });
  Object.defineProperty(nodes, 'input[type="radio"][data-name="apr"]:checked', { get: () => aprs.filter((r) => r.checked) });
  const errors = [];
  const quietConsole = { ...console, error: (...a) => errors.push(a) };
  const crypto = { randomUUID: () => 'uuid-1' };
  const env = makeEnv({ pathname: '/car-finance-calculator', marker, readyState, nodes, config: { crypto }, globals: { fetch, crypto, clearTimeout() {}, console: quietConsole } });
  return { env, fetches, deposit, price, total, hpPrice, terms, aprs, aprOut, errors };
}

markerTests(MODULE, { pathname: '/car-finance-calculator' });

test('calculator: without the marker no fetch is made', async () => {
  const { fetches } = calcEnv({ marker: null });
  await flush();
  assert.equal(fetches.length, 0);
});

test('calculator: applies fallback defaults straight away (deposit, price, 48-month term, very-good band)', () => {
  const { deposit, price, total, terms, aprs, aprOut } = calcEnv();
  assert.equal(deposit.value, '£2,500');
  assert.equal(price.value, '£15,000');
  assert.equal(total.textContent, '£15,000');
  assert.deepEqual(terms.map((t) => t.checked), [false, false, true]);
  assert.equal(aprs[1].checked, true);
  assert.equal(aprOut.textContent, 10.9);
});

test('calculator: quotes with the live config once it arrives', async () => {
  const { fetches, hpPrice, deposit } = calcEnv({ config: { representativeApr: 9.9, aprByTier: { VeryGood: 9.9 }, defaultTerm: 36, defaultDepositAmount: 1000, defaultAnnualMileage: 10000 } });
  await flush();
  await flush();
  const quote = fetches.find((f) => f.url.endsWith('/quote'));
  assert.ok(quote);
  const body = JSON.parse(quote.opts.body);
  assert.deepEqual(body.criteria, { annualMileage: 10000, cashDeposit: 1000, outstandingFinance: 0, pxEquity: 0, term: 36, apr: 9.9 });
  assert.equal(body.vehicle.price, 15000);
  assert.equal(body.requestUuid, 'uuid-1');
  assert.equal(deposit.value, '£1,000');
  await flush();
  assert.equal(hpPrice.textContent, '£321.46');
});

test('calculator: a failed config fetch is reported and falls back to the defaults', async () => {
  const { fetches, errors } = calcEnv();
  await flush();
  await flush();
  assert.equal(errors[0][0], 'finance-config fetch failed');
  const body = JSON.parse(fetches.find((f) => f.url.endsWith('/quote')).opts.body);
  assert.equal(body.criteria.term, 48);
  assert.equal(body.criteria.apr, 10.9);
});

test('calculator and mobile CTA wait for DOMContentLoaded while the document is still loading', () => {
  const { env, deposit, fetches } = calcEnv({ readyState: 'loading' });
  assert.equal(deposit.value, '');
  assert.equal(fetches.length, 0);
  assert.equal(env.docListeners.DOMContentLoaded.length, 2);
  env.fire('doc', 'DOMContentLoaded');
  assert.equal(deposit.value, '£2,500');
});

test('mobile CTA: clicking view-results scrolls to the results', () => {
  const calls = [];
  const btn = makeEl();
  const results = makeEl({ scrollIntoView: (o) => calls.push(o) });
  calcEnv({ extraNodes: { '[data-analytics-event="finance-calculator-cta-view-results-mobile"]': [btn], '#finance-calculator-results': [results] } });
  let prevented = false;
  btn.listeners.click[0]({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(JSON.stringify(calls), JSON.stringify([{ behavior: 'smooth' }]));
});

const LIVE = { representativeApr: 9.9, aprByTier: { VeryGood: 9.9 }, defaultTerm: 36, defaultDepositAmount: 1000 };
const settle = async () => { for (let i = 0; i < 4; i++) await flush(); };
const fireEl = (el, type) => (el.listeners[type] || []).forEach((fn) => fn.call(el, { type }));
const quotes = (fetches) => fetches.filter((f) => f.url.endsWith('/quote')).map((f) => JSON.parse(f.opts.body).criteria);
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test('calculator: a deposit the user typed before the config arrived is kept; the config term still applies', async () => {
  const cfg = deferred();
  const { deposit, terms, fetches } = calcEnv({ configResponse: cfg.promise });
  deposit.value = '£500';
  fireEl(deposit, 'input');
  cfg.resolve(LIVE);
  await settle();
  assert.equal(deposit.value, '£500');
  assert.deepEqual(terms.map((t) => t.checked), [false, true, false]);
  const q = quotes(fetches);
  assert.equal(q.length, 1);
  assert.equal(q[0].cashDeposit, 500);
  assert.equal(q[0].term, 36);
  assert.equal(q[0].apr, 9.9);
});

test('calculator: a term the user picked before the config arrived is kept; the config deposit still applies', async () => {
  const cfg = deferred();
  const { deposit, terms, fetches } = calcEnv({ configResponse: cfg.promise });
  terms[0].checked = true;
  fireEl(terms[0], 'change');
  cfg.resolve(LIVE);
  await settle();
  assert.equal(deposit.value, '£1,000');
  assert.deepEqual(terms.map((t) => t.checked), [true, false, false]);
  assert.equal(quotes(fetches).pop().term, 24);
});

test('calculator: when the 3 s timer wins, a late config is merged and applied once under the same rule', async () => {
  const cfg = deferred();
  const { env, deposit, terms, fetches } = calcEnv({ configResponse: cfg.promise });
  env.timers[0]();
  await settle();
  assert.equal(quotes(fetches).length, 1);
  assert.equal(quotes(fetches)[0].term, 48);
  deposit.value = '£500';
  fireEl(deposit, 'change');
  cfg.resolve(LIVE);
  await settle();
  assert.equal(deposit.value, '£500');
  assert.deepEqual(terms.map((t) => t.checked), [false, true, false]);
  const q = quotes(fetches);
  assert.equal(q.length, 2);
  assert.deepEqual([q[1].cashDeposit, q[1].term, q[1].apr], [500, 36, 9.9]);
  await settle();
  assert.equal(quotes(fetches).length, 2);
});

test('calculator: a config that wins the race is not applied a second time when the timer fires', async () => {
  const { env, fetches } = calcEnv({ config: LIVE });
  await settle();
  assert.equal(quotes(fetches).length, 1);
  env.timers[0]();
  await settle();
  assert.equal(quotes(fetches).length, 1);
});
