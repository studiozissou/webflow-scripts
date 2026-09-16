/**
 * Unit tests for the Carsa VDP AutoTrader price total script.
 * Runs the real at-price-total.js inside a vm sandbox with a minimal DOM stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'at-price-total.js'), 'utf8');

function el(attrs, text) {
  return { attrs, textContent: text };
}

function makeDocument(elements, readyState = 'complete') {
  const listeners = {};
  const match = (sel) => {
    const m = sel.match(/\[data-price="([^"]+)"\]/g) || [];
    const wanted = m.map((s) => s.replace(/\[data-price="|"\]/g, ''));
    return elements.filter((e) => wanted.includes(e.attrs['data-price']));
  };
  return {
    readyState,
    listeners,
    addEventListener(type, fn) { listeners[type] = fn; },
    querySelector(sel) {
      if (sel === '.autotrader_price-info') return this;
      return match(sel)[0] || null;
    },
    querySelectorAll(sel) { return match(sel); },
  };
}

function run(elements, readyState) {
  const document = makeDocument(elements, readyState);
  const window = {};
  vm.runInNewContext(SOURCE, { document, window, Number, Math, String, isFinite });
  return { document, window };
}

test('sums saving and carsa price into at-value as comma-formatted £', () => {
  const saving = el({ 'data-price': 'at-saving' }, '314');
  const price = el({ 'data-price': 'carsa-price' }, '£14,358');
  const target = el({ 'data-price': 'at-value' }, '');
  run([saving, price, target]);
  assert.equal(target.textContent, '£14,672');
});

test('rewrites at-saving as a comma-grouped £ figure', () => {
  const saving = el({ 'data-price': 'at-saving' }, '1250');
  run([saving, el({ 'data-price': 'carsa-price' }, '£9,995'), el({ 'data-price': 'at-value' }, '')]);
  assert.equal(saving.textContent, '£1,250');
});

test('strips a literal £ from the text node right before at-saving', () => {
  const before = { nodeType: 3, textContent: '£' };
  const saving = el({ 'data-price': 'at-saving' }, '314');
  saving.previousSibling = before;
  run([saving, el({ 'data-price': 'carsa-price' }, '£14,358'), el({ 'data-price': 'at-value' }, '')]);
  assert.equal(saving.textContent, '£314');
  assert.equal(before.textContent, '');
});

test('keeps preceding text that does not end in £', () => {
  const before = { nodeType: 3, textContent: 'Save ' };
  const saving = el({ 'data-price': 'at-saving' }, '314');
  saving.previousSibling = before;
  run([saving, el({ 'data-price': 'carsa-price' }, '£14,358'), el({ 'data-price': 'at-value' }, '')]);
  assert.equal(before.textContent, 'Save ');
});

test('also fills a target named at-price', () => {
  const target = el({ 'data-price': 'at-price' }, '');
  run([
    el({ 'data-price': 'at-saving' }, '1,250'),
    el({ 'data-price': 'carsa-price' }, '£9,995'),
    target,
  ]);
  assert.equal(target.textContent, '£11,245');
});

test('leaves target untouched when saving is empty', () => {
  const target = el({ 'data-price': 'at-value' }, '');
  run([
    el({ 'data-price': 'at-saving' }, ''),
    el({ 'data-price': 'carsa-price' }, '£14,358'),
    target,
  ]);
  assert.equal(target.textContent, '');
});

test('leaves target untouched when a source element is missing', () => {
  const target = el({ 'data-price': 'at-value' }, '');
  run([el({ 'data-price': 'carsa-price' }, '£14,358'), target]);
  assert.equal(target.textContent, '');
});

test('rounds pence away and formats thousands', () => {
  const target = el({ 'data-price': 'at-value' }, '');
  run([
    el({ 'data-price': 'at-saving' }, '£505.60'),
    el({ 'data-price': 'carsa-price' }, '£999,999.30'),
    target,
  ]);
  assert.equal(target.textContent, '£1,000,505');
});

test('defers to DOMContentLoaded when the document is still loading', () => {
  const target = el({ 'data-price': 'at-value' }, '');
  const { document } = run(
    [el({ 'data-price': 'at-saving' }, '100'), el({ 'data-price': 'carsa-price' }, '£200'), target],
    'loading'
  );
  assert.equal(target.textContent, '');
  document.listeners.DOMContentLoaded();
  assert.equal(target.textContent, '£300');
});
