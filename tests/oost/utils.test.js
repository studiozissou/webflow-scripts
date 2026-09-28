// Unit tests for the Oost utils module: runs the real file in a vm sandbox with a stub document of links, a year span and forms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'oost', 'utils.js'),
  'utf8',
);

function makeElement(tag, props = {}) {
  const attributes = {};
  const children = [];
  return {
    tagName: tag.toUpperCase(),
    dataset: {},
    attributes,
    children,
    textContent: '',
    setAttribute: (k, v) => {
      attributes[k] = String(v);
    },
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    append: (...els) => children.push(...els),
    ...props,
  };
}

function run({
  href = 'https://oosteten.webflow.io/catering',
  links = [],
  year = true,
  forms = [],
  readyState = 'complete',
} = {}) {
  const listeners = {};
  const yearEl = year ? makeElement('span') : null;
  const document = {
    readyState,
    getElementById: (id) => (id === 'year' ? yearEl : null),
    querySelectorAll: (sel) => {
      if (sel === 'a[target="_blank"]') return links;
      if (sel === 'form') return forms;
      return [];
    },
    createElement: (tag) => makeElement(tag),
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const window = { location: { href }, document, OOST: {} };
  window.window = window;
  vm.runInContext(SOURCE, vm.createContext({ window, document, URL }));
  return { window, document, yearEl, listeners };
}

function hidden(form) {
  return Object.fromEntries(
    form.children.filter((c) => c.type === 'hidden').map((c) => [c.name, c.value]),
  );
}

test('adds rel="noreferrer noopener" to every link that opens a new tab', () => {
  const links = [makeElement('a'), makeElement('a')];
  run({ links });
  for (const a of links) assert.equal(a.getAttribute('rel'), 'noreferrer noopener');
});

test('writes the current year into #year', () => {
  const { yearEl } = run();
  assert.equal(yearEl.textContent, String(new Date().getFullYear()));
});

test('a page without #year does not throw', () => {
  assert.doesNotThrow(() => run({ year: false }));
});

test('each form gets a hidden Conversion Page field with the utm_ parameters stripped', () => {
  const form = makeElement('form');
  run({
    href: 'https://oosteten.webflow.io/catering?utm_source=ig&ref=flyer&utm_medium=story#offerte',
    forms: [form],
  });
  assert.equal(
    hidden(form)['Conversion Page'],
    'https://oosteten.webflow.io/catering?ref=flyer',
  );
});

test('each utm_ parameter becomes its own hidden field', () => {
  const form = makeElement('form');
  run({
    href: 'https://oosteten.webflow.io/catering?utm_source=ig&utm_campaign=opening',
    forms: [form],
  });
  const fields = hidden(form);
  assert.equal(fields.utm_source, 'ig');
  assert.equal(fields.utm_campaign, 'opening');
  assert.equal(Object.keys(fields).length, 3);
});

test('a form is only filled once even if the module runs twice', () => {
  const form = makeElement('form');
  const { window, document } = run({
    href: 'https://oosteten.webflow.io/?utm_source=ig',
    forms: [form],
  });
  vm.runInContext(SOURCE, vm.createContext({ window, document, URL }));
  assert.equal(form.children.length, 2);
});

test('waits for DOMContentLoaded while the document is still loading', () => {
  const links = [makeElement('a')];
  const { listeners } = run({ links, readyState: 'loading' });
  assert.equal(links[0].getAttribute('rel'), null);
  listeners.DOMContentLoaded();
  assert.equal(links[0].getAttribute('rel'), 'noreferrer noopener');
});
