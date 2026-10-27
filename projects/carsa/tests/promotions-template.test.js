// Unit tests for Carsa promotions-template.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the promo filter link, the __CARSA_PROMO config coercion and the page-marker gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'promotions-template.js';
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

const DEALS = '/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=';

function run(promo, extra = {}) {
  const btns = [makeEl(), makeEl()];
  const config = promo === undefined ? {} : { __CARSA_PROMO: promo };
  const env = makeEnv({ pathname: '/used-cars/promotions/black-friday', config, nodes: { '[data-button="search-offer"]': btns }, ...extra });
  return { env, btns };
}

markerTests(MODULE, { config: { __CARSA_PROMO: { pillDescription: 'Black Friday' } } });

test('promotions: search-offer buttons link to the deals filter for the pill description', () => {
  const { btns } = run({ pillDescription: 'Black Friday £500 off' });
  btns.forEach((b) => assert.equal(b.attrs.href, DEALS + encodeURIComponent('Black Friday £500 off')));
});

test('promotions: surrounding whitespace is trimmed, as the inline .trim() did', () => {
  const { btns } = run({ pillDescription: '  EV Deals \n' });
  assert.equal(btns[0].attrs.href, DEALS + 'EV%20Deals');
});

test('promotions: an empty pill description gives the bare filter link, as an empty CMS field did', () => {
  const { btns } = run({ pillDescription: '' });
  assert.equal(btns[0].attrs.href, DEALS);
});

test('promotions: a missing key behaves like an empty CMS field', () => {
  const { btns } = run({});
  assert.equal(btns[0].attrs.href, DEALS);
});

test('promotions: non-string values are coerced to strings', () => {
  const { btns } = run({ pillDescription: 500 });
  assert.equal(btns[0].attrs.href, DEALS + '500');
});

test('promotions: a missing window.__CARSA_PROMO skips the link without throwing and still records the run', () => {
  const { env, btns } = run(undefined);
  assert.equal(btns[0].attrs.href, undefined);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.equal(env.timers.length, 0);
});

test('promotions: no promo/encoded/url globals leak onto window', () => {
  const { env } = run({ pillDescription: 'X' });
  assert.equal(env.window.promo, undefined);
  assert.equal(env.window.url, undefined);
});
