// Unit tests for Studio Zissou global.js: runs the real file in a vm sandbox with stub links, year spans, forms, a fake sessionStorage and a localStorage spy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', 'studio-zissou', 'global.js'),
  'utf8',
);
const KEY = 'sz_attribution';
const FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'referrer_domain',
  'landing_page',
  'conversion_page',
  'locale',
  'visit_start_ts',
];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function makeElement(tag, attrs = {}) {
  const attributes = { ...attrs };
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    attributes,
    children,
    textContent: '',
    setAttribute: (k, v) => {
      attributes[k] = String(v);
    },
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    append: (...els) => children.push(...els),
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    querySelector: (sel) => {
      const m = sel.match(/^input\[name="([^"]+)"\]$/);
      if (!m) return null;
      return children.find((c) => c.tagName === 'INPUT' && c.name === m[1]) ?? null;
    },
  };
  return el;
}

function makeForm(existing = []) {
  const form = makeElement('form');
  for (const props of existing) form.appendChild(Object.assign(makeElement('input'), props));
  return form;
}

function makeSessionStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

function run({
  href = 'https://studiozissou.com/',
  referrer = '',
  lang = 'en',
  links = [],
  years = [],
  forms = [],
  stored,
  blockedStorage = false,
  readyState = 'complete',
} = {}) {
  const listeners = {};
  const sessionStorage = makeSessionStorage(
    stored === undefined ? {} : { [KEY]: typeof stored === 'string' ? stored : JSON.stringify(stored) },
  );
  const localStorageAccess = { count: 0 };
  const document = {
    readyState,
    referrer,
    documentElement: { lang },
    querySelectorAll: (sel) => {
      if (sel === 'a[target="_blank"]') return links;
      if (sel === '[data-sz="year"]') return years;
      if (sel === 'form') return forms;
      return [];
    },
    createElement: (tag) => makeElement(tag),
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const sandbox = { document, location: { href }, URL, URLSearchParams };
  sandbox.window = sandbox;
  if (blockedStorage) {
    Object.defineProperty(sandbox, 'sessionStorage', {
      get() {
        throw new Error('SecurityError');
      },
    });
  } else {
    sandbox.sessionStorage = sessionStorage;
  }
  Object.defineProperty(sandbox, 'localStorage', {
    get() {
      localStorageAccess.count += 1;
      throw new Error('localStorage must not be touched');
    },
  });
  const context = vm.createContext(sandbox);
  const exec = () => vm.runInContext(SOURCE, context);
  exec();
  return { sandbox, sessionStorage, listeners, localStorageAccess, exec };
}

const fieldValues = (form) =>
  Object.fromEntries(form.children.filter((c) => c.tagName === 'INPUT').map((c) => [c.name, c.value]));
const storedRecord = (sessionStorage) => JSON.parse(sessionStorage.data[KEY]);

test('adds noopener noreferrer to target=_blank links, keeping existing rel tokens without duplicates', () => {
  const bare = makeElement('a');
  const external = makeElement('a', { rel: 'external' });
  const already = makeElement('a', { rel: 'noopener' });
  run({ links: [bare, external, already] });
  assert.equal(bare.getAttribute('rel'), 'noopener noreferrer');
  assert.deepEqual(external.getAttribute('rel').split(' ').sort(), ['external', 'noopener', 'noreferrer']);
  assert.deepEqual(already.getAttribute('rel').split(' ').sort(), ['noopener', 'noreferrer']);
});

test('writes the current year into every [data-sz="year"] element', () => {
  const years = [makeElement('span'), makeElement('span')];
  run({ years });
  for (const el of years) assert.equal(el.textContent, String(new Date().getFullYear()));
});

test('first page of the visit stores UTMs, external referrer, landing page and start time in sessionStorage', () => {
  const { sessionStorage } = run({
    href: 'https://studiozissou.com/pricing?utm_source=linkedin&utm_medium=social&utm_campaign=launch&gclid=x',
    referrer: 'https://www.linkedin.com/feed/',
  });
  const rec = storedRecord(sessionStorage);
  assert.deepEqual(rec.utms, { utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'launch' });
  assert.equal(rec.referrer, 'https://www.linkedin.com/feed/');
  assert.equal(rec.referrerDomain, 'linkedin.com');
  assert.equal(rec.landing, 'https://studiozissou.com/pricing');
  assert.match(rec.ts, ISO);
});

test('a later page in the same visit never overwrites the stored record', () => {
  const first = { utms: { utm_source: 'google' }, referrer: '', referrerDomain: '', landing: 'https://studiozissou.com/', ts: '2026-11-04T09:00:00.000Z' };
  const { sessionStorage } = run({
    href: 'https://studiozissou.com/terms?utm_source=newsletter',
    referrer: 'https://news.ycombinator.com/',
    stored: first,
  });
  assert.deepEqual(storedRecord(sessionStorage), first);
});

test('injects every hidden attribution field into every form', () => {
  const forms = [makeForm(), makeForm()];
  run({ forms });
  for (const form of forms) {
    const inputs = form.children.filter((c) => c.tagName === 'INPUT');
    assert.deepEqual(inputs.map((c) => c.name), FIELDS);
    assert.ok(inputs.every((c) => c.type === 'hidden'));
  }
});

test('field values prefer the stored visit, then the current URL, then direct', () => {
  const form = makeForm();
  run({
    href: 'https://studiozissou.com/contact?utm_source=newsletter&utm_campaign=autumn',
    forms: [form],
    stored: {
      utms: { utm_source: 'google', utm_medium: 'cpc' },
      referrer: 'https://www.google.com/',
      referrerDomain: 'google.com',
      landing: 'https://studiozissou.com/',
      ts: '2026-11-04T09:00:00.000Z',
    },
  });
  const v = fieldValues(form);
  assert.equal(v.utm_source, 'google');
  assert.equal(v.utm_medium, 'cpc');
  assert.equal(v.utm_campaign, 'autumn');
  assert.equal(v.utm_term, 'direct');
  assert.equal(v.utm_content, 'direct');
  assert.equal(v.referrer_domain, 'google.com');
  assert.equal(v.landing_page, 'https://studiozissou.com/');
  assert.equal(v.conversion_page, 'https://studiozissou.com/contact');
  assert.equal(v.visit_start_ts, '2026-11-04T09:00:00.000Z');
});

test('a direct visit with no UTMs or referrer still fills every field', () => {
  const form = makeForm();
  run({ href: 'https://studiozissou.com/', forms: [form] });
  const v = fieldValues(form);
  for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer_domain']) {
    assert.equal(v[name], 'direct', name);
  }
  assert.equal(v.landing_page, 'https://studiozissou.com/');
  assert.equal(v.conversion_page, 'https://studiozissou.com/');
  assert.equal(v.locale, 'en');
  assert.match(v.visit_start_ts, ISO);
});

test('internal referrers never count as a referrer', () => {
  const internal = [
    'https://studiozissou.com/pricing',
    'https://www.studiozissou.com/',
    'https://studiozissou.io/',
    'https://www.studiozissou.io/about',
    'https://teamzissou.io/',
    'https://www.teamzissou.io/#contact',
    'https://teamzissou.webflow.io/',
    'https://wdmorley.webflow.io/',
    'https://staging.example.test/x',
  ];
  for (const referrer of internal) {
    const form = makeForm();
    const { sessionStorage } = run({ href: 'https://staging.example.test/contact', referrer, forms: [form] });
    assert.equal(storedRecord(sessionStorage).referrerDomain, '', referrer);
    assert.equal(storedRecord(sessionStorage).referrer, '', referrer);
    assert.equal(fieldValues(form).referrer_domain, 'direct', referrer);
  }
});

test('conversion and landing pages drop the query string and hash', () => {
  const form = makeForm();
  const { sessionStorage } = run({ href: 'https://studiozissou.com/contact?email=a@b.c&utm_source=x#form', forms: [form] });
  assert.equal(fieldValues(form).conversion_page, 'https://studiozissou.com/contact');
  assert.equal(storedRecord(sessionStorage).landing, 'https://studiozissou.com/contact');
});

test('locale comes from <html lang>', () => {
  const form = makeForm();
  run({ lang: 'nl', forms: [form] });
  assert.equal(fieldValues(form).locale, 'nl');
});

test('fills a hidden input that already exists in the form instead of adding a second one', () => {
  const form = makeForm([{ type: 'hidden', name: 'utm_source', value: '' }]);
  run({ href: 'https://studiozissou.com/?utm_source=bing', forms: [form] });
  const matches = form.children.filter((c) => c.name === 'utm_source');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].value, 'bing');
  assert.equal(form.children.length, FIELDS.length);
});

test('running the file twice on the same page adds no duplicate fields', () => {
  const form = makeForm();
  const { exec } = run({ forms: [form] });
  exec();
  assert.equal(form.children.length, FIELDS.length);
});

test('never touches localStorage', () => {
  const scenarios = [
    { href: 'https://studiozissou.com/?utm_source=a', referrer: 'https://google.com/', forms: [makeForm()] },
    { stored: { utms: {}, referrer: '', referrerDomain: '', landing: 'https://studiozissou.com/', ts: '2026-11-04T09:00:00.000Z' }, forms: [makeForm()] },
    { blockedStorage: true, forms: [makeForm()] },
  ];
  for (const s of scenarios) assert.equal(run(s).localStorageAccess.count, 0);
});

test('blocked sessionStorage falls back to the current URL without throwing', () => {
  const form = makeForm();
  run({ blockedStorage: true, href: 'https://studiozissou.com/?utm_source=x', forms: [form] });
  const v = fieldValues(form);
  assert.equal(v.utm_source, 'x');
  assert.equal(v.landing_page, 'https://studiozissou.com/');
});

test('a corrupt stored record is replaced by a fresh one', () => {
  const { sessionStorage } = run({ stored: '{not json', href: 'https://studiozissou.com/?utm_source=x' });
  assert.equal(storedRecord(sessionStorage).utms.utm_source, 'x');
});

test('waits for DOMContentLoaded while the document is still loading', () => {
  const form = makeForm();
  const { listeners } = run({ readyState: 'loading', forms: [form] });
  assert.equal(form.children.length, 0);
  listeners.DOMContentLoaded();
  assert.equal(form.children.length, FIELDS.length);
});
