// Unit tests for the template booking widget: runs the real booking-widget.js in a vm sandbox with a stub document, fake timers and a fake widget ready message.
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'projects', '_template', 'booking-widget.js'),
  'utf8',
);
const SDK_SRC = 'https://sdk.zenchef.com/v1/sdk.min.js';
const BOOKINGS = 'https://bookings.zenchef.com';

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());

const flush = () => new Promise((resolve) => setImmediate(resolve));

function matches(el, selector) {
  return selector.split(',').some((part) => {
    const m = part.trim().match(/^\[([\w-]+)="([^"]+)"\]$/);
    return Boolean(m) && el.getAttribute(m[1]) === m[2];
  });
}

function makeElement(tag, attrs = {}, dispatchClick = () => {}) {
  const attributes = { ...attrs };
  const classes = new Set();
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    attributes,
    listeners,
    clicks: 0,
    setAttribute: (k, v) => {
      attributes[k] = String(v);
    },
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    hasAttribute: (k) => k in attributes,
    removeAttribute: (k) => {
      delete attributes[k];
    },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    addEventListener: (type, fn, options) => {
      (listeners[type] ||= []).push({ fn, options });
    },
    dispatch: (type) => (listeners[type] || []).forEach(({ fn }) => fn({ type })),
    closest: (sel) => (matches(el, sel) ? el : null),
    click: () => {
      el.clicks++;
      return dispatchClick(el);
    },
  };
  return el;
}

function run({
  config = true,
  venueId = '123456',
  iframeTitle = null,
  existingSdk = false,
  readyState = 'interactive',
  lang = 'en',
  idle = true,
  buttons = [{ 'data-booking': 'open' }, { 'data-booking': 'open' }],
  iframe = null,
  banner = null,
  lateBanner = false,
} = {}) {
  const docListeners = {};
  const winListeners = {};
  const appended = [];
  const opened = [];
  const idleQueue = [];
  const events = [];

  function dispatchClick(target) {
    const event = {
      type: 'click',
      target,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    events.push(event);
    (docListeners.click || []).forEach((fn) => fn(event));
    return event;
  }

  const triggers = buttons.map((attrs) =>
    makeElement('a', { href: '#book', ...attrs }, dispatchClick),
  );
  const configAttrs = { class: 'zc-widget-config' };
  if (venueId) configAttrs['data-restaurant'] = venueId;
  if (iframeTitle) configAttrs['data-iframe-title'] = iframeTitle;
  const configEl = config ? makeElement('div', configAttrs) : null;
  const existing = existingSdk ? makeElement('script', { id: 'zenchef-sdk' }) : null;

  const observers = [];
  const consentRoot = {
    shadowRoot: {
      querySelector: (sel) => (sel === '[fs-consent-element="banner"]' ? banner : null),
    },
  };
  let rootRendered = Boolean(banner) && !lateBanner;
  const document = {
    readyState,
    documentElement: { lang },
    head: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => makeElement(tag),
    querySelector: (sel) => {
      if (sel === '.zc-widget-config') return configEl;
      if (sel === `iframe[src^="${BOOKINGS}"]`) return iframe;
      if (sel === '[fs-consent-element="root"]') return rootRendered ? consentRoot : null;
      return null;
    },
    querySelectorAll: (sel) => triggers.filter((el) => matches(el, sel)),
    getElementById: (id) => {
      if (id === 'zenchef-sdk' && existing) return existing;
      return appended.find((el) => el.id === id) || null;
    },
    addEventListener: (type, fn) => {
      (docListeners[type] ||= []).push(fn);
    },
  };
  const window = {
    document,
    CLIENT: {},
    location: {
      assign: (url) => {
        opened.push(url);
      },
    },
    addEventListener: (type, fn) => {
      (winListeners[type] ||= []).push(fn);
    },
    removeEventListener: (type, fn) => {
      winListeners[type] = (winListeners[type] || []).filter((f) => f !== fn);
    },
  };
  if (idle) window.requestIdleCallback = (fn) => idleQueue.push(fn);
  window.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target, options) {
      observers.push({ target, options, callback: this.callback });
    }
  };
  window.window = window;

  vm.runInContext(
    SOURCE,
    vm.createContext({
      window,
      document,
      setTimeout: (...a) => setTimeout(...a),
      clearTimeout: (...a) => clearTimeout(...a),
    }),
  );

  const sdkScripts = () => appended.filter((el) => el.src === SDK_SRC);
  const postMessage = (origin, data) =>
    (winListeners.message || []).slice().forEach((fn) => fn({ origin, data }));
  const setBannerActive = (active) => {
    if (active) banner.setAttribute('fs-consent-active', '');
    else banner.removeAttribute('fs-consent-active');
    observers
      .filter((o) => o.target === banner)
      .forEach((o) =>
        o.callback([{ type: 'attributes', attributeName: 'fs-consent-active' }]),
      );
  };
  return {
    window,
    triggers,
    observers,
    setBannerActive,
    renderBanner: () => {
      rootRendered = true;
    },
    appended,
    opened,
    events,
    docListeners,
    winListeners,
    sdkScripts,
    fireLoad: () => (winListeners.load || []).forEach((fn) => fn({ type: 'load' })),
    flushIdle: () => idleQueue.splice(0).forEach((fn) => fn({ timeRemaining: () => 50 })),
    postMessage,
    widgetListening: () =>
      postMessage(BOOKINGS, { type: 'widget-listening', data: { rid: '123456' } }),
  };
}

async function clickBeforeReady(page, index = 0) {
  const event = page.triggers[index].click();
  await flush();
  return event;
}

test('does nothing without a .zc-widget-config element', () => {
  const page = run({ config: false });
  assert.equal(page.triggers[0].getAttribute('data-zc-action'), null);
  assert.deepEqual(page.docListeners, {});
  assert.deepEqual(page.winListeners, {});
});

test('does nothing when the config element has no venue id, rather than guess one', () => {
  const page = run({ venueId: null });
  assert.equal(page.triggers[0].getAttribute('data-zc-action'), null);
  assert.deepEqual(page.docListeners, {});
  assert.deepEqual(page.winListeners, {});
});

test('keeps every vendor detail in one BOOKING config object', () => {
  const code = SOURCE.split('\n').slice(1).join('\n');
  const source = code.replace(/var BOOKING = \{[\s\S]*?\n {2}\};/, '');
  assert.notEqual(source, code, 'BOOKING object not found');
  assert.doesNotMatch(source, /zenchef|zc-|data-restaurant|widget-listening|\/results/i);
});

test('does nothing when the old #zenchef-sdk snippet is still on the page', () => {
  const page = run({ existingSdk: true });
  assert.equal(page.triggers[0].getAttribute('data-zc-action'), null);
  assert.equal(page.triggers[0].getAttribute('aria-haspopup'), null);
  assert.deepEqual(page.triggers[0].listeners, {});
  assert.deepEqual(page.docListeners, {});
  assert.deepEqual(page.winListeners, {});
  assert.equal(page.appended.length, 0);
});

test('reuses a #zenchef-sdk script that appeared after this module ran instead of adding a second', () => {
  const page = run();
  const legacy = makeElement('script');
  legacy.id = 'zenchef-sdk';
  page.appended.push(legacy);
  page.triggers[0].dispatch('pointerenter');
  assert.equal(page.sdkScripts().length, 0);
  assert.equal(page.appended.length, 1);
});

test('marks every data-booking="open" button as a Zenchef trigger and a dialog opener', () => {
  const page = run({
    buttons: [{ 'data-booking': 'open' }, { 'data-zc-action': 'open' }],
  });
  for (const el of page.triggers) {
    assert.equal(el.getAttribute('data-zc-action'), 'open');
    assert.equal(el.getAttribute('aria-haspopup'), 'dialog');
  }
});

test('does not inject the SDK when the script runs', () => {
  const page = run();
  assert.equal(page.sdkScripts().length, 0);
});

test('injects the SDK once, 2 s after load and when the browser is idle', () => {
  const page = run();
  page.fireLoad();
  mock.timers.tick(1999);
  page.flushIdle();
  assert.equal(page.sdkScripts().length, 0);
  mock.timers.tick(1);
  assert.equal(page.sdkScripts().length, 0);
  page.flushIdle();
  assert.equal(page.sdkScripts().length, 1);
  const [script] = page.sdkScripts();
  assert.equal(script.id, 'zenchef-sdk');
  assert.equal(script.async, true);
});

test('schedules the idle preload straight away when the page has already loaded', () => {
  const page = run({ readyState: 'complete' });
  mock.timers.tick(2000);
  page.flushIdle();
  assert.equal(page.sdkScripts().length, 1);
});

test('falls back to a timeout when requestIdleCallback is missing', () => {
  const page = run({ idle: false });
  page.fireLoad();
  mock.timers.tick(2000);
  mock.timers.tick(0);
  assert.equal(page.sdkScripts().length, 1);
});

test('injects the SDK on pointerenter of a trigger, and a second trigger does not inject again', () => {
  const page = run();
  page.triggers[0].dispatch('pointerenter');
  assert.equal(page.sdkScripts().length, 1);
  page.triggers[1].dispatch('pointerenter');
  page.triggers[1].dispatch('focusin');
  page.triggers[1].dispatch('touchstart');
  assert.equal(page.sdkScripts().length, 1);
});

test('injects the SDK on focusin and on a passive touchstart', () => {
  const focus = run();
  focus.triggers[0].dispatch('focusin');
  assert.equal(focus.sdkScripts().length, 1);

  const touch = run();
  const [listener] = touch.triggers[0].listeners.touchstart;
  assert.equal(listener.options.passive, true);
  touch.triggers[0].dispatch('touchstart');
  assert.equal(touch.sdkScripts().length, 1);
});

test('an early click shows a loading state and re-clicks only after the widget-listening message', async () => {
  const page = run();
  const button = page.triggers[0];
  const event = await clickBeforeReady(page);

  assert.equal(event.defaultPrevented, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.classList.contains('is-loading'), true);
  assert.equal(page.sdkScripts().length, 1);

  page.sdkScripts()[0].onload?.();
  await flush();
  assert.equal(button.clicks, 1);

  page.postMessage('https://evil.example', { type: 'widget-listening' });
  page.postMessage(BOOKINGS, { type: 'height', height: 80 });
  await flush();
  assert.equal(button.clicks, 1);

  page.widgetListening();
  await flush();
  assert.equal(button.clicks, 2);
  assert.equal(page.events[1].defaultPrevented, true);
  assert.equal(button.getAttribute('aria-busy'), null);
  assert.equal(button.classList.contains('is-loading'), false);

  mock.timers.tick(8000);
  assert.equal(page.opened.length, 0);
});

test('a second early click on another button replaces the pending one, so only one re-click happens', async () => {
  const page = run();
  await clickBeforeReady(page, 0);
  await clickBeforeReady(page, 1);
  assert.equal(page.triggers[0].getAttribute('aria-busy'), null);
  assert.equal(page.triggers[1].getAttribute('aria-busy'), 'true');

  page.widgetListening();
  await flush();
  assert.equal(page.triggers[0].clicks, 1);
  assert.equal(page.triggers[1].clicks, 2);
});

test('a click after the widget is ready prevents the #book jump and leaves the opening to the SDK', async () => {
  const page = run();
  page.triggers[0].dispatch('pointerenter');
  page.widgetListening();
  await flush();

  const event = page.triggers[0].click();
  await flush();
  assert.equal(event.defaultPrevented, true);
  assert.equal(page.triggers[0].clicks, 1);
  assert.equal(page.triggers[0].getAttribute('aria-busy'), null);
  assert.equal(page.sdkScripts().length, 1);
});

test('ignores clicks that are not on a trigger', () => {
  const page = run();
  const other = makeElement('a', { href: '#menu' });
  const event = {
    target: other,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  page.docListeners.click.forEach((fn) => fn(event));
  assert.equal(event.defaultPrevented, false);
  assert.equal(page.sdkScripts().length, 0);
});

test('navigates to the bookings page when the SDK fails to load after a click', async () => {
  const page = run();
  const button = page.triggers[0];
  await clickBeforeReady(page);
  page.sdkScripts()[0].onerror(new Error('blocked'));
  await flush();

  assert.equal(page.opened.length, 1);
  const url = page.opened[0];
  assert.match(url, /^https:\/\/bookings\.zenchef\.com\/results\?/);
  assert.match(url, /rid=123456/);
  assert.match(url, /lang=en/);
  assert.equal(button.getAttribute('aria-busy'), null);
  assert.equal(button.classList.contains('is-loading'), false);
});

test('opens the bookings page when the widget is not ready 8 s after a click, and does not re-click later', async () => {
  const page = run({ lang: 'en-GB' });
  const button = page.triggers[0];
  await clickBeforeReady(page);

  mock.timers.tick(7999);
  assert.equal(page.opened.length, 0);
  mock.timers.tick(1);
  await flush();
  assert.equal(page.opened.length, 1);
  assert.match(page.opened[0], /lang=en/);
  assert.equal(button.getAttribute('aria-busy'), null);

  page.widgetListening();
  await flush();
  assert.equal(button.clicks, 1);
  assert.equal(page.opened.length, 1);
});

test('the idle preload never opens the bookings page, even when the SDK fails', async () => {
  const page = run();
  page.fireLoad();
  mock.timers.tick(2000);
  page.flushIdle();
  page.sdkScripts()[0].onerror(new Error('blocked'));
  mock.timers.tick(10000);
  await flush();
  assert.equal(page.opened.length, 0);
});

test('exposes a load function on window.CLIENT.booking for debugging', () => {
  const page = run();
  assert.equal(typeof page.window.CLIENT.booking.load, 'function');
  page.window.CLIENT.booking.load();
  page.window.CLIENT.booking.load();
  assert.equal(page.sdkScripts().length, 1);
});

test('titles the booking iframe from the localised data-iframe-title once the widget is ready', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const page = run({ iframe, iframeTitle: 'Book a table at TODO-business-name' });
  page.triggers[0].dispatch('pointerenter');
  page.widgetListening();
  await flush();
  assert.equal(iframe.getAttribute('title'), 'Book a table at TODO-business-name');
});

test('falls back to a generic iframe title when data-iframe-title is missing', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const page = run({ iframe });
  page.triggers[0].dispatch('pointerenter');
  page.widgetListening();
  await flush();
  assert.equal(iframe.getAttribute('title'), 'Book a table');
});

test('does nothing and does not throw when the booking iframe is missing', async () => {
  const page = run();
  page.triggers[0].dispatch('pointerenter');
  assert.doesNotThrow(() => page.widgetListening());
  await flush();
  assert.equal(page.sdkScripts().length, 1);
});

test('does not name the iframe before widget-listening, nor for a message from another origin', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const page = run({ iframe });
  page.triggers[0].dispatch('pointerenter');
  assert.equal(iframe.getAttribute('title'), null);
  page.postMessage('https://evil.example', { type: 'widget-listening' });
  page.postMessage(BOOKINGS, { type: 'height', height: 80 });
  await flush();
  assert.equal(iframe.getAttribute('title'), null);
});

test('naming the iframe never loads the SDK on its own', () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const page = run({ iframe });
  page.widgetListening();
  assert.equal(page.sdkScripts().length, 0);
  assert.equal(iframe.getAttribute('title'), null);
});

const UNDER_CONSENT = 'client-booking-under-consent';

function consentPage(bannerOpen = true) {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const banner = makeElement('div', bannerOpen ? { 'fs-consent-active': '' } : {});
  const page = run({ iframe, banner });
  return { page, iframe, banner };
}

async function widgetReady(page) {
  page.triggers[0].dispatch('pointerenter');
  page.widgetListening();
  await flush();
}

test('puts the booking iframe under the cookie banner while the banner is open', async () => {
  const { page, iframe } = consentPage(true);
  await widgetReady(page);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), true);
});

test('injects the mobile-only z-index rule once, just below the banner', async () => {
  const { page } = consentPage(true);
  await widgetReady(page);
  page.setBannerActive(false);
  page.setBannerActive(true);
  const styles = page.appended.filter((el) => el.id === 'client-booking-css');
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /@media \(max-width: 767px\)/);
  assert.match(
    styles[0].textContent,
    /iframe\.client-booking-under-consent\s*\{\s*z-index: 99998 !important/,
  );
});

test('lifts the booking iframe back up when the cookie banner closes', async () => {
  const { page, iframe } = consentPage(true);
  await widgetReady(page);
  page.setBannerActive(false);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), false);
});

test('leaves the booking iframe on top when the banner is already closed', async () => {
  const { page, iframe } = consentPage(false);
  await widgetReady(page);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), false);
});

test('puts the iframe under the banner again when cookie settings reopen it', async () => {
  const { page, iframe } = consentPage(false);
  await widgetReady(page);
  page.setBannerActive(true);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), true);
});

test('watches only the fs-consent-active attribute on the banner', async () => {
  const { page, banner } = consentPage(true);
  await widgetReady(page);
  assert.equal(page.observers.length, 1);
  assert.equal(page.observers[0].target, banner);
  assert.equal(
    JSON.stringify(page.observers[0].options),
    JSON.stringify({ attributes: true, attributeFilter: ['fs-consent-active'] }),
  );
});

test('a booking click brings the booking widget above the open banner', async () => {
  const { page, iframe } = consentPage(true);
  await widgetReady(page);
  page.triggers[0].click();
  assert.equal(iframe.classList.contains(UNDER_CONSENT), false);
});

test('does not touch the iframe or throw when the consent manager is missing', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const page = run({ iframe });
  await widgetReady(page);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), false);
  assert.equal(page.observers.length, 0);
});

test('retries the consent banner lookup briefly and layers the iframe once it renders', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const banner = makeElement('div', { 'fs-consent-active': '' });
  const page = run({ iframe, banner, lateBanner: true });
  await widgetReady(page);
  assert.equal(page.observers.length, 0);
  page.renderBanner();
  mock.timers.tick(500);
  assert.equal(page.observers.length, 1);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), true);
  for (let i = 0; i < 40; i++) mock.timers.tick(250);
  assert.equal(page.observers.length, 1);
});

test('stops retrying for the consent banner after a bounded time', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const banner = makeElement('div', { 'fs-consent-active': '' });
  const page = run({ iframe, banner, lateBanner: true });
  await widgetReady(page);
  for (let i = 0; i < 40; i++) mock.timers.tick(250);
  page.renderBanner();
  for (let i = 0; i < 40; i++) mock.timers.tick(250);
  assert.equal(page.observers.length, 0);
});

test('a trigger click re-runs the consent lookup when the banner rendered late', async () => {
  const iframe = makeElement('iframe', { src: `${BOOKINGS}/?rid=123456` });
  const banner = makeElement('div', { 'fs-consent-active': '' });
  const page = run({ iframe, banner, lateBanner: true });
  await widgetReady(page);
  for (let i = 0; i < 40; i++) mock.timers.tick(250);
  page.renderBanner();
  page.triggers[0].click();
  assert.equal(page.observers.length, 1);
  page.setBannerActive(false);
  page.setBannerActive(true);
  assert.equal(iframe.classList.contains(UNDER_CONSENT), true);
});

test('repeated clicks never attach a second banner observer', async () => {
  const { page } = consentPage(true);
  await widgetReady(page);
  page.triggers[0].click();
  page.triggers[1].click();
  assert.equal(page.observers.length, 1);
});
