/**
 * Unit tests for Carsa global.js (the former site footer scripts).
 * Runs the real file in a vm sandbox with a selector-keyed stub DOM and a minimal jQuery.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'global.js'), 'utf8');
const DAY = 864e5;
const ELIGIBILITY = 'a[href*="quote.carsa.co.uk/eligibility/questions"]';

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function link(href, attrs = {}) {
  const el = { href, textContent: attrs.text || '', attrs: { ...attrs }, rel: '' };
  el.setAttribute = (k, v) => { el.attrs[k] = v; if (k === 'rel') el.rel = v; };
  el.getAttribute = (k) => el.attrs[k] ?? null;
  return el;
}

function makeEnv({ readyState = 'complete', nodes = {}, byId = {}, search = '', referrer = '', local = {}, session = {} } = {}) {
  const docListeners = {};
  const winListeners = {};
  const timers = [];
  const document = {
    readyState,
    referrer,
    body: {},
    documentElement: { style: { setProperty() {} } },
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    querySelector: (sel) => (nodes[sel] || [])[0] || null,
    querySelectorAll: (sel) => nodes[sel] || [],
    getElementById: (id) => byId[id] || null,
  };
  const location = { hostname: 'www.carsa.co.uk', origin: 'https://www.carsa.co.uk', search, href: 'https://www.carsa.co.uk/' + search };
  const window = {
    location,
    innerWidth: 1280,
    innerHeight: 800,
    scrollY: 0,
    scrollTo() {},
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    setTimeout: (fn) => timers.push(fn),
  };
  const jQuery = (arg) => {
    if (typeof arg === 'function') return arg();
    if (arg === window) return { on: (t, fn) => window.addEventListener(t, fn) };
    if (typeof arg === 'object') return { el: arg };
    const els = (arg.startsWith('#') ? [byId[arg.slice(1)]].filter(Boolean) : nodes[arg]) || [];
    return {
      el: els[0],
      each: (fn) => els.forEach((el, i) => fn.call(el, i, el)),
      prepend: (other) => els.forEach((el) => el.children.unshift(other.el || other)),
    };
  };
  window.jQuery = window.$ = jQuery;
  const context = vm.createContext({
    window,
    document,
    location,
    jQuery,
    $: jQuery,
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(session),
    MutationObserver: class { observe() {} },
    URL,
    URLSearchParams,
    console,
  });
  window.localStorage = context.localStorage;
  window.sessionStorage = context.sessionStorage;
  vm.runInContext(SOURCE, context);
  const fire = (target, type) => ((target === 'doc' ? docListeners : winListeners)[type] || []).forEach((fn) => fn({}));
  return { context, window, document, timers, fire, docListeners, winListeners };
}

test('copyright year: fills #year with the current year', () => {
  const year = { innerText: '' };
  makeEnv({ byId: { year } });
  assert.equal(String(year.innerText), String(new Date().getFullYear()));
});

test('copyright year: pages without #year (get-started, payments) do not throw', () => {
  const { timers } = makeEnv();
  assert.equal(timers.length, 0);
});

test('noopener: applied even though DOMContentLoaded has already fired (live bug A)', () => {
  const external = link('https://wa.me/441234', { target: '_blank' });
  const own = link('https://www.carsa.co.uk/used-cars', { target: '_blank' });
  makeEnv({ readyState: 'interactive', nodes: { 'a[target="_blank"]': [external, own] } });
  assert.equal(external.getAttribute('rel'), 'noreferrer noopener');
  assert.equal(own.getAttribute('rel'), null);
});

test('promo links: built when DOMContentLoaded has already fired', () => {
  const promo = link('#', { 'data-link': 'promo', text: ' Black Friday ' });
  makeEnv({ readyState: 'interactive', nodes: { 'a[data-link="promo"]': [promo] } });
  assert.equal(promo.href, '/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=Black+Friday');
});

test('promo links: wait for DOMContentLoaded while the document is still loading', () => {
  const promo = link('#', { 'data-link': 'promo', text: 'EV' });
  const env = makeEnv({ readyState: 'loading', nodes: { 'a[data-link="promo"]': [promo] } });
  assert.equal(promo.href, '#');
  env.fire('doc', 'DOMContentLoaded');
  assert.match(promo.href, /cars_promotion_equal=EV$/);
});

test('store list: #find-store-link is moved to the front of #store-list', () => {
  const find = { id: 'find-store-link' };
  const list = { children: [{ id: 'a' }, find] };
  makeEnv({ byId: { 'store-list': list, 'find-store-link': find } });
  assert.equal(list.children[0], find);
});

test('attribution: first visit writes session and 30-day local records with every utm_*', () => {
  const env = makeEnv({ search: '?utm_source=acc&utm_medium=test&utm_x=1' });
  const local = JSON.parse(env.context.localStorage.data.attribution);
  const session = JSON.parse(env.context.sessionStorage.data.attribution_session);
  const utms = { utm_source: 'acc', utm_medium: 'test', utm_x: '1' };
  assert.deepEqual({ ...local.utms }, utms);
  assert.deepEqual({ ...session.utms }, utms);
  assert.ok(Math.abs(local.expiresAt - local.updatedAt - 30 * DAY) < 1000);
});

test('attribution: an existing first-touch record with utms is preserved; session is overwritten', () => {
  const existing = { utms: { utm_source: 'first' }, referrer: '', referrerDomain: '', updatedAt: Date.now(), expiresAt: Date.now() + DAY };
  const env = makeEnv({ search: '?utm_source=second', local: { attribution: JSON.stringify(existing) } });
  assert.equal(JSON.parse(env.context.localStorage.data.attribution).utms.utm_source, 'first');
  assert.equal(JSON.parse(env.context.sessionStorage.data.attribution_session).utms.utm_source, 'second');
});

test('attribution: external referrer stored as URL plus bare domain; same-site referrer ignored', () => {
  const ext = makeEnv({ referrer: 'https://www.google.com/search?q=carsa' });
  const rec = JSON.parse(ext.context.localStorage.data.attribution);
  assert.equal(rec.referrerDomain, 'google.com');
  const own = makeEnv({ referrer: 'https://www.carsa.co.uk/faq' });
  assert.equal(JSON.parse(own.context.localStorage.data.attribution).referrerDomain, '');
});

test('eligibility links: decorated when the load event has already fired, existing keys kept', () => {
  const a = link('https://quote.carsa.co.uk/eligibility/questions?utm_source=keep');
  const stored = { utms: { utm_source: 'ads', utm_medium: 'cpc' }, referrerDomain: 'google.com', expiresAt: Date.now() + DAY, updatedAt: Date.now() };
  makeEnv({ readyState: 'complete', nodes: { [ELIGIBILITY]: [a] }, local: { attribution: JSON.stringify(stored) } });
  const u = new URL(a.href);
  assert.equal(u.searchParams.get('utm_source'), 'keep');
  assert.equal(u.searchParams.get('utm_medium'), 'cpc');
  assert.equal(u.searchParams.get('referrer'), 'google.com');
});

test('eligibility links: wait for window load while the page is still loading', () => {
  const a = link('https://quote.carsa.co.uk/eligibility/questions');
  const env = makeEnv({ readyState: 'interactive', search: '?utm_source=late', nodes: { [ELIGIBILITY]: [a] } });
  assert.doesNotMatch(a.href, /utm_source/);
  env.fire('win', 'load');
  assert.match(a.href, /utm_source=late/);
});

test('isolation: one failing block does not stop the rest, and its error resurfaces asynchronously', () => {
  const year = { innerText: '' };
  const promo = link('#', { 'data-link': 'promo', text: 'EV' });
  const env = makeEnv({ byId: { year }, nodes: { 'a[data-link="promo"]': [promo], 'a[target="_blank"]': [null] } });
  assert.match(promo.href, /EV$/);
  assert.equal(String(year.innerText), String(new Date().getFullYear()));
  assert.ok(env.timers.length >= 1);
  assert.throws(() => env.timers.forEach((fn) => fn()));
});

test('chat: the widget is imported from the n8n bundle once the DOM is ready', () => {
  assert.match(SOURCE, /import\(['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@n8n\/chat\/dist\/chat\.bundle\.es\.js['"]\)/);
  assert.match(SOURCE, /webhookUrl: 'https:\/\/carsa\.app\.n8n\.cloud\/webhook\/88d110ef-b4ab-4c22-9306-1e492c9f7687\/chat'/);
});
