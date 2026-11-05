// Unit tests for Carsa vdp.js: runs the real file in a vm sandbox with a stub DOM, a minimal chainable jQuery and a recorded fetch, driven by window.__CARSA_VDP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', 'vdp.js'), 'utf8');

const BASE_VDP = {
  price: '18995',
  registrationDate: 'Mar 01, 2024',
  odometer: '42000',
  vrm: 'bl73dmu',
  financeType: 'PCP',
  depositContribution: '',
  locationName: 'Leeds',
  isStorageLocation: 'false',
  makeName: 'Land Rover',
  modelName: 'Range Rover Evoque',
  status: 'For sale',
};

const QUOTE = { pcp: { payments: { regular: 250.25 }, term: 48 }, hp: { payments: { regular: 321.45 } } };

function makeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function makeEl(extra = {}) {
  const listeners = {};
  const attrs = {};
  const el = {
    listeners,
    attrs,
    value: '',
    textContent: '',
    checked: false,
    options: [],
    children: [],
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains: () => false },
    addEventListener: (t, fn) => (listeners[t] ||= []).push(fn),
    removeEventListener() {},
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k) => { delete attrs[k]; },
    closest: () => null,
    querySelectorAll: () => [],
    click() {},
    ...extra,
  };
  return el;
}

function makeEnv({ vdp = BASE_VDP, readyState = 'complete', nodes = {}, byId = {}, search = '', local = {}, dd = null, win = {} } = {}) {
  const docListeners = {};
  const winListeners = {};
  const jqDocHandlers = [];
  const timers = [];
  const logs = [];
  const fetches = [];
  const ids = { ...byId };
  const getEl = (id) => (id in ids ? ids[id] : (ids[id] = makeEl({ id })));

  const document = {
    readyState,
    referrer: '',
    body: makeEl(),
    head: makeEl({ appendChild: (el) => { document.head.children.push(el); return el; } }),
    styleSheets: [],
    createElement: (tag) => makeEl({ tagName: tag.toUpperCase() }),
    documentElement: { clientHeight: 800 },
    activeElement: null,
    addEventListener: (t, fn) => (docListeners[t] ||= []).push(fn),
    querySelector: (sel) => (nodes[sel] || [])[0] || null,
    querySelectorAll: (sel) => nodes[sel] || [],
    getElementById: getEl,
  };
  const location = {
    hostname: 'www.carsa.co.uk',
    origin: 'https://www.carsa.co.uk',
    pathname: '/vehicles/used/bl73dmu',
    search,
    hash: '',
    href: 'https://www.carsa.co.uk/vehicles/used/bl73dmu',
  };
  const window = {
    location,
    innerHeight: 800,
    scrollX: 0,
    scrollY: 0,
    scrollTo() {},
    open() {},
    addEventListener: (t, fn) => (winListeners[t] ||= []).push(fn),
    removeEventListener() {},
    ...win,
  };
  if (vdp) window.__CARSA_VDP = { ...vdp };
  if (dd) window.DD_LOGS = dd;

  function wrap(els) {
    const $w = {
      length: els.length,
      each(fn) { els.forEach((el, i) => fn.call(el, i, el)); return $w; },
      on(type, a, b) {
        if (els[0] === window && type === 'load') window.addEventListener('load', a);
        if (els[0] === document) jqDocHandlers.push({ type, selector: a, fn: b });
        return $w;
      },
      ready(fn) { fn(); return $w; },
      text(v) {
        if (v === undefined) return els[0] ? String(els[0].textContent) : '';
        els.forEach((el) => { el.textContent = String(v); });
        return $w;
      },
      html(v) { return $w.text(v); },
      val(v) {
        if (v === undefined) return els[0] ? els[0].value : undefined;
        els.forEach((el) => { el.value = v; });
        return $w;
      },
      attr(k, v) {
        if (typeof k === 'object') { Object.keys(k).forEach((key) => $w.attr(key, k[key])); return $w; }
        if (v === undefined) return els[0] && els[0].getAttribute ? els[0].getAttribute(k) ?? undefined : undefined;
        els.forEach((el) => el.setAttribute && el.setAttribute(k, v));
        return $w;
      },
      data(k, v) {
        if (v === undefined) return els[0] && els[0].__data ? els[0].__data[k] : undefined;
        els.forEach((el) => { (el.__data ||= {})[k] = v; });
        return $w;
      },
      prop(k, v) {
        if (v === undefined) return els[0] ? els[0][k] : undefined;
        els.forEach((el) => { el[k] = v; });
        return $w;
      },
      css(k) { return typeof k === 'string' && arguments.length === 1 ? '' : $w; },
      find: () => wrap([]),
      closest: () => wrap([]),
      first: () => wrap(els.slice(0, 1)),
      is: () => false,
      get: (i) => (i === undefined ? els.slice() : els[i]),
      map: (fn) => wrap(els.map((el, i) => fn.call(el, i, el)).filter((x) => x != null)),
      hide: () => $w,
      show: () => $w,
      remove: () => $w,
      append: () => $w,
      toggleClass: () => $w,
      animate: () => $w,
    };
    els.forEach((el, i) => { $w[i] = el; });
    return $w;
  }

  const jQuery = (arg) => {
    if (typeof arg === 'function') { arg(); return undefined; }
    if (arg === window || arg === document) return wrap([arg]);
    if (typeof arg === 'object') return wrap([arg]);
    if (arg.startsWith('<')) return wrap([]);
    if (/^#[\w-]+$/.test(arg)) return wrap([getEl(arg.slice(1))]);
    return wrap(nodes[arg] || []);
  };
  window.jQuery = window.$ = jQuery;

  const fetch = (url, opts = {}) => {
    fetches.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null });
    const data = url.endsWith('/quote') ? QUOTE : {};
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  };

  const context = vm.createContext({
    window,
    document,
    location,
    history: { replaceState() {} },
    jQuery,
    $: jQuery,
    gsap: { registerPlugin() {}, timeline: () => ({ to() {} }), to: () => ({ play() {} }), delayedCall() {} },
    fetch,
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(),
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout() {},
    requestAnimationFrame() {},
    getComputedStyle: () => ({ stroke: 'none', strokeWidth: '0' }),
    MutationObserver: class { observe() {} },
    IntersectionObserver: class { observe() {} },
    URL,
    URLSearchParams,
    console: { log: (...a) => logs.push(a), error: (...a) => logs.push(a), warn: (...a) => logs.push(a) },
  });
  window.localStorage = context.localStorage;
  window.sessionStorage = context.sessionStorage;
  window.fetch = fetch;
  vm.runInContext(SOURCE, context);
  const fire = (type) => (docListeners[type] || []).forEach((fn) => fn({}));
  return { context, window, document, ids, timers, logs, fetches, docListeners, winListeners, jqDocHandlers, fire };
}

const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
const quoteCall = (env) => env.fetches.find((f) => f.url.endsWith('/quote'));

test('missing config: no listeners, no fetch, nothing logged, nothing thrown', () => {
  const env = makeEnv({ vdp: null });
  assert.deepEqual(env.docListeners, {});
  assert.deepEqual(env.winListeners, {});
  assert.equal(env.jqDocHandlers.length, 0);
  assert.equal(env.fetches.length, 0);
  assert.equal(env.logs.length, 0);
  assert.equal(env.window.CARSA_FIN, undefined);
});

test('runs end to end with a full config and fetches finance-config once', async () => {
  const env = makeEnv();
  await flush();
  assert.equal(env.fetches.filter((f) => f.url.endsWith('/finance-config')).length, 1);
  assert.ok(quoteCall(env));
  assert.equal(env.logs.length, 0);
});

test('coercion: price and odometer reach the quote payload as numbers; vrm and registration date as strings', async () => {
  const env = makeEnv();
  await flush();
  const { vehicle, requestUuid } = quoteCall(env).body;
  assert.equal(vehicle.price, 18995);
  assert.equal(vehicle.mileage, 42000);
  assert.equal(vehicle.vrm, 'bl73dmu');
  assert.equal(vehicle.registrationDate, '2024-03-01');
  assert.equal(requestUuid, '6319f553-726a-4e25-83e6-7b6fd792414a');
});

test('coercion: empty deposit contribution is 0 and the quote uses the full flat deposit', async () => {
  const env = makeEnv();
  await flush();
  assert.equal(quoteCall(env).body.criteria.cashDeposit, 2500);
  assert.equal(env.ids['finance-deposit'].value, '£2,500');
  assert.equal(env.ids['deposit-contribution'].value, '');
});

test('coercion: a £500 contribution lowers the customer box but quotes on the full deposit', async () => {
  const env = makeEnv({ vdp: { ...BASE_VDP, depositContribution: '£500' } });
  await flush();
  assert.equal(env.ids['finance-deposit'].value, '£2,000');
  assert.equal(env.ids['deposit-contribution'].value, '£500');
  assert.equal(quoteCall(env).body.criteria.cashDeposit, 2500);
});

test('coercion: finance type HP checks the 60-month term, otherwise the config default', () => {
  const hp = makeEnv({ vdp: { ...BASE_VDP, financeType: 'HP' } });
  assert.equal(hp.ids['60'].checked, true);
  const pcp = makeEnv();
  assert.equal(pcp.ids['48'].checked, true);
  assert.equal(pcp.ids['60'], undefined);
});

test('coercion: isStorageLocation "true" adds storage=true to Get Started; "false" and "" do not', () => {
  const href = (isStorageLocation) => {
    const btn = makeEl();
    makeEnv({ vdp: { ...BASE_VDP, isStorageLocation, vrm: ' BL73DMU ', locationName: ' Leeds ' }, nodes: { '[data-button="booking-options"]': [btn] } });
    return btn.getAttribute('href');
  };
  assert.equal(href('true'), '/get-started?vrm=bl73dmu&location=Leeds&storage=true');
  assert.equal(href('false'), '/get-started?vrm=bl73dmu&location=Leeds');
  assert.equal(href(''), '/get-started?vrm=bl73dmu&location=Leeds');
});

test('coercion: CTA link uses the trimmed upper-case VRM', () => {
  const cta = makeEl();
  makeEnv({ vdp: { ...BASE_VDP, vrm: ' bl73dmu ' }, nodes: { '[data-button="cta-option"]': [cta] } });
  assert.equal(cta.getAttribute('href'), 'https://quote.carsa.co.uk/book/BL73DMU');
});

test('status: "Removed" marks the Product offer SoldOut and drops the price', () => {
  const ld = { textContent: JSON.stringify({ '@type': 'Product', name: 'Car', offers: { '@type': 'Offer', price: 18995, priceCurrency: 'GBP', availability: 'https://schema.org/InStock' } }) };
  makeEnv({ vdp: { ...BASE_VDP, status: ' Removed ' }, nodes: { 'script[type="application/ld+json"]': [ld] } });
  const offer = JSON.parse(ld.textContent).offers;
  assert.equal(offer.availability, 'https://schema.org/SoldOut');
  assert.equal(offer.price, undefined);
});

test('status: a live car keeps its offer price', () => {
  const original = JSON.stringify({ '@type': 'Product', name: 'Car', offers: { '@type': 'Offer', price: 18995, availability: 'https://schema.org/InStock' } });
  const ld = { textContent: original };
  makeEnv({ nodes: { 'script[type="application/ld+json"]': [ld] } });
  assert.equal(ld.textContent, original);
});

test('late start: readyState complete runs the former DOMContentLoaded blocks immediately', async () => {
  const btn = makeEl();
  const env = makeEnv({ readyState: 'complete', nodes: { '[data-link="search-similar"]': [btn] } });
  assert.equal(btn.getAttribute('href'), '/used-cars?cars_make_equal=Land+Rover&cars_model_equal=Range+Rover+Evoque');
  assert.equal(env.docListeners.DOMContentLoaded, undefined);
  assert.ok(env.ids['finance-deposit'].listeners.input);
  await flush();
  assert.ok(quoteCall(env));
});

test('late start: readyState loading defers both blocks until DOMContentLoaded fires', async () => {
  const btn = makeEl();
  const env = makeEnv({ readyState: 'loading', nodes: { '[data-link="search-similar"]': [btn] } });
  assert.equal(btn.getAttribute('href'), null);
  assert.equal(env.docListeners.DOMContentLoaded.length, 5);
  await flush();
  assert.equal(quoteCall(env), undefined);
  env.fire('DOMContentLoaded');
  assert.match(btn.getAttribute('href'), /^\/used-cars\?cars_make_equal=Land\+Rover/);
  await flush();
  assert.ok(quoteCall(env));
});

const QUOTE_LINKS = 'a[href*="quote.carsa.co.uk/build-deal/"],a[href*="quote.carsa.co.uk/book/"],a[href*="quote.carsa.co.uk/eligibility/questions"]';

test('window load: while the document is still loading, the UTM-link and APR blocks wait for load', () => {
  const link = makeEl({ href: 'https://quote.carsa.co.uk/book/BL73DMU' });
  const env = makeEnv({ readyState: 'loading', search: '?utm_source=early', nodes: { [QUOTE_LINKS]: [link] } });
  assert.equal(env.winListeners.load.length, 2);
  assert.equal(link.href, 'https://quote.carsa.co.uk/book/BL73DMU');
  env.winListeners.load.forEach((fn) => fn({}));
  assert.equal(link.href, 'https://quote.carsa.co.uk/book/BL73DMU?utm_source=early');
});

test('window load: with the document already complete, the UTM-link block runs at once and binds no load listener', () => {
  const link = makeEl({ href: 'https://quote.carsa.co.uk/book/BL73DMU' });
  const env = makeEnv({ readyState: 'complete', search: '?utm_source=late', nodes: { [QUOTE_LINKS]: [link] } });
  assert.equal(link.href, 'https://quote.carsa.co.uk/book/BL73DMU?utm_source=late');
  assert.equal(env.winListeners.load, undefined);
});

test('missing config: warns through Datadog browser logs when they are present', () => {
  const warned = [];
  const env = makeEnv({ vdp: null, dd: { logger: { warn: (...a) => warned.push(a), error() {} } } });
  assert.equal(warned.length, 1);
  assert.match(warned[0][0], /__CARSA_VDP/);
  assert.equal(env.fetches.length, 0);
});

test('missing key: a config without status still runs the blocks after the schema block', () => {
  const { status, ...partial } = BASE_VDP;
  const cta = makeEl();
  const ld = { textContent: JSON.stringify({ '@type': 'Product', offers: { '@type': 'Offer', price: 1, availability: 'https://schema.org/InStock' } }) };
  const env = makeEnv({ vdp: partial, nodes: { '[data-button="cta-option"]': [cta], 'script[type="application/ld+json"]': [ld] } });
  assert.equal(JSON.parse(ld.textContent).offers.availability, 'https://schema.org/InStock');
  assert.equal(cta.getAttribute('href'), 'https://quote.carsa.co.uk/book/BL73DMU');
  assert.equal(env.logs.length, 0);
});

test('source: window load is bound only inside onLoad', () => {
  assert.equal(SOURCE.match(/\.on\(['"]load['"]/g).length, 1);
});

test('source: DOMContentLoaded appears only inside onReady', () => {
  assert.equal(SOURCE.match(/DOMContentLoaded/g).length, 1);
  assert.match(SOURCE, /function onReady\(fn\) \{[^}]*DOMContentLoaded/);
});

test('source: the check-finance handler (block 12) is not included', () => {
  assert.ok(!SOURCE.includes('check-finance-car-card-click'));
  assert.ok(!SOURCE.includes('[data-link="check-finance"]'));
  assert.ok(!SOURCE.includes('eligibility/questions\';'));
});

test('source: no Webflow bindings left', () => {
  assert.ok(!SOURCE.includes('{{wf'));
});

test('source: console.log only behind DEBUG &&', () => {
  const logs = SOURCE.match(/.{0,9}console\.log/g) || [];
  assert.ok(logs.length >= 1);
  logs.forEach((l) => assert.match(l, /DEBUG && console\.log$/));
});

test('source: exactly one comment, on line 1', () => {
  const lines = SOURCE.split('\n');
  assert.match(lines[0], /^\/\/ \S/);
  assert.ok(!SOURCE.includes('/*'));
  lines.slice(1).forEach((line, i) => {
    assert.ok(!/^\s*\/\//.test(line), `comment line at ${i + 2}`);
    assert.ok(!/(^|[^:])\/\/\s/.test(line), `trailing comment at ${i + 2}`);
  });
});

test('source: eighteen block IIFEs inside the outer wrapper', () => {
  assert.equal(SOURCE.match(/^ {2}\(function \(\) \{$/gm).length, 18);
  assert.equal(SOURCE.match(/^ {2}\}\)\(\);$/gm).length, 18);
});

test('source: the draw-line block gives each svg the __svgDrawPlay hook the radio CTA calls', () => {
  assert.match(SOURCE, /svg\.__svgDrawPlay = \(\) => driver\.pause\(0\)\.play\(\);/);
});

test('source: radio squiggles are primed hidden and never auto-play on load', () => {
  const block = SOURCE.slice(SOURCE.indexOf("$('[data-svg=\"draw-line\"]')"), SOURCE.indexOf('pastOnLoad'));
  assert.match(block, /const manual = !!wrapper\.closest\('\.details_radio-field'\);/);
  assert.match(block, /if \(manual\) return;/);
});

test('source: the draw-line block gives each svg a __svgDrawReset hook that hides the line again', () => {
  assert.match(SOURCE, /svg\.__svgDrawReset = \(\) => driver\.pause\(0\);/);
});

test('source: selecting a radio draws its squiggle and hides the others', () => {
  const handler = SOURCE.slice(SOURCE.indexOf("$('input[type=\"radio\"][name=\"Book\"]').on('change'"));
  assert.match(handler, /isSelected \? playSquiggle\(\$label\) : resetSquiggle\(\$label\);/);
});

test('source: a deselected squiggle wrapper fades out over 200ms, then the line resets only if still faded', () => {
  const reset = SOURCE.slice(SOURCE.indexOf('function resetSquiggle'), SOURCE.indexOf("$('input[type=\"radio\"][name=\"Book\"]').on('change'"));
  assert.match(reset, /\$\(wrap\)\.css\(\{ transition: 'opacity 200ms ease', opacity: 0 \}\);/);
  assert.match(reset, /setTimeout\(\(\) => \{ if \(wrap\.style\.opacity === '0'\) svg\.__svgDrawReset\(\); \}, 200\);/);
  assert.doesNotMatch(reset, /\$\(svg\)\.css/);
});

test('source: a selected squiggle wrapper is made visible at once before the line draws', () => {
  const play = SOURCE.slice(SOURCE.indexOf('function playSquiggle'), SOURCE.indexOf('function resetSquiggle'));
  assert.match(play, /\$\(wrap\)\.css\(\{ transition: 'none', opacity: 1 \}\);\s*svg\.__svgDrawPlay\(\);/);
  assert.doesNotMatch(play, /\$\(svg\)\.css/);
});

test('source: on load the default option draws its squiggle and the others are hidden at once', () => {
  const init = SOURCE.slice(SOURCE.indexOf("$('#reserve-test-drive').prop('checked', true);"), SOURCE.indexOf("document.getElementById('cta-postcode')"));
  assert.match(init, /this\.checked \? playSquiggle\(\$label\) : \$label\.find\('\[data-svg="draw-line"\]'\)\.css\(\{ transition: 'none', opacity: 0 \}\);/);
});

test('source: financeTerm is read from window.__CARSA_VDP (CARSA-8249)', () => {
  assert.match(SOURCE, /var KEYS = \[[^\]]*'status', 'financeTerm'\]/);
});

test('source: a PCP car opens on its stored finance-term radio, else cfg.defaultTerm (CARSA-8249)', () => {
  assert.match(SOURCE, /var storedTerm = document\.getElementById\(String\(parseInt\(VDP\.financeTerm, 10\)\)\);/);
  assert.match(SOURCE, /storedTerm && storedTerm\.type === 'radio' && storedTerm\.getAttribute\('data-name'\) === 'finance-term'\)\s*\?\s*storedTerm\s*:\s*document\.getElementById\(String\(cfg\.defaultTerm\)\)/);
});

const WA = 'https://wa.me/442046322989?text=';
const SECOND = " We can move the vehicle to any of our 10 stores nationwide. Pay a refundable £39 reservation fee, then choose your store and test-drive time. After you've test-driven, we'll refund your fee or deduct it from the purchase if you buy.";

function booking(href) {
  const el = makeEl();
  if (href != null) el.setAttribute('href', href);
  return { '[data-button="booking-options"]': [el] };
}

test('footer WhatsApp: VRM from the booking-options vrm param, upper-cased', () => {
  const env = makeEnv({ nodes: booking('https://quote.carsa.co.uk/book?vrm=ab12cde&x=1') });
  assert.equal(env.ids['footer_open-whatsapp'].href, WA + encodeURIComponent('Hi, please tell me more about AB12CDE'));
});

test('footer WhatsApp: without a booking-options link it falls back to __CARSA_VDP.vrm', () => {
  const env = makeEnv();
  assert.equal(env.ids['footer_open-whatsapp'].href, WA + encodeURIComponent('Hi, please tell me more about BL73DMU'));
});

test('footer WhatsApp: a booking-options link with no query keeps __CARSA_VDP.vrm', () => {
  const env = makeEnv({ nodes: booking('/book') });
  assert.match(env.ids['footer_open-whatsapp'].href, /BL73DMU$/);
});

test('footer WhatsApp: a query without vrm keeps __CARSA_VDP.vrm', () => {
  const env = makeEnv({ nodes: booking('/book?step=1') });
  assert.equal(env.ids['footer_open-whatsapp'].href, WA + encodeURIComponent('Hi, please tell me more about BL73DMU'));
});

test('footer WhatsApp: missing icon does not throw', () => {
  const env = makeEnv({ byId: { 'footer_open-whatsapp': null } });
  assert.equal(env.logs.length, 0);
});

test('car-info: names the trimmed store', () => {
  const env = makeEnv({ vdp: { ...BASE_VDP, locationName: '  Leeds ' } });
  assert.equal(env.ids['car-info'].textContent, "This car's currently in our Leeds store." + SECOND);
});

test('car-info: Storage gets the storage-facility sentence', () => {
  const env = makeEnv({ vdp: { ...BASE_VDP, locationName: 'Storage' } });
  assert.equal(env.ids['car-info'].textContent, 'This car is fully inspected and in our storage facility.' + SECOND);
});

test('car-info: an empty or blank location gets the generic first sentence, never "our  store"', () => {
  for (const locationName of ['', '   ', undefined]) {
    const env = makeEnv({ vdp: { ...BASE_VDP, locationName } });
    assert.equal(env.ids['car-info'].textContent, 'This car is fully inspected and ready to view.' + SECOND);
  }
});

test('car-info: missing element does not throw', () => {
  const env = makeEnv({ byId: { 'car-info': null } });
  assert.equal(env.logs.length, 0);
});

const SWIPER_OPTS = {
  slidesPerView: 'auto',
  centeredSlides: true,
  grabCursor: true,
  slideToClickedSlide: true,
  loop: true,
  loopAdditionalSlides: 0,
  speed: 250,
  autoplay: { enabled: false, delay: 1100, pauseOnMouseEnter: true },
  wrapperClass: 'vdp-cold-banner_list',
  slideClass: 'vdp-cold-banner_item',
  observer: true,
  observeParents: true,
  touchRatio: 1,
  freeMode: { enabled: false, sticky: true },
  lazy: { enabled: true },
  navigation: { nextEl: '#cold-banner-right', prevEl: '#cold-banner-left' },
  breakpoints: { 992: { centeredSlides: false, speed: 350, autoplay: { enabled: true, delay: 1100 } } },
};

function bannerSetup({ items = 3, banner = true } = {}) {
  const parent = { inserted: [], insertBefore(a, b) { parent.inserted.push([a, b]); } };
  const next = makeEl();
  const usp = makeEl({ parentNode: parent, nextSibling: next });
  const el = banner ? makeEl() : null;
  const nodes = {
    '.section_vdp-cold-banner': el ? [el] : [],
    'section.section_usp-carousel': [usp],
    '[data-count="make-model"]': Array.from({ length: items }, () => makeEl()),
  };
  const swipers = [];
  class Swiper { constructor(sel, opts) { swipers.push({ sel, opts: JSON.parse(JSON.stringify(opts)) }); } }
  return { banner: el, usp, next, parent, nodes, swipers, Swiper };
}

const linkOf = (env) => env.document.head.children.find((c) => c.tagName === 'LINK');
const scriptOf = (env) => env.document.head.children.find((c) => c.tagName === 'SCRIPT');

test('cold banner: fewer than 3 make-model items hides the banner and stops', () => {
  const s = bannerSetup({ items: 2 });
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', win: { Swiper: s.Swiper } });
  assert.equal(s.banner.style.display, 'none');
  assert.equal(s.usp.style.display, undefined);
  assert.equal(env.document.head.children.length, 0);
});

test('cold banner: no utm_source keeps the banner hidden and the USP strip visible', () => {
  const s = bannerSetup();
  const env = makeEnv({ nodes: s.nodes });
  assert.equal(s.banner.style.display, 'none');
  assert.equal(s.usp.style.display, undefined);
  assert.equal(s.parent.inserted.length, 0);
  assert.equal(env.document.head.children.length, 0);
});

test('cold banner: an unlisted utm_source keeps the banner hidden', () => {
  const s = bannerSetup();
  makeEnv({ nodes: s.nodes, search: '?utm_source=facebook', win: { Swiper: s.Swiper } });
  assert.equal(s.banner.style.display, 'none');
  assert.equal(s.usp.style.display, undefined);
  assert.equal(s.swipers.length, 0);
});

for (const source of ['autotrader.co.uk', 'AutoTrader.co.uk', 'google_vehicle_ads', 'chat', 'google', 'ebaymotorsgroup', 'theaa.com', 'carwow.co.uk', 'CarGurus.co.uk']) {
  test(`cold banner: utm_source=${source} hides the USP, moves the banner after it and shows it as flex`, () => {
    const s = bannerSetup();
    makeEnv({ nodes: s.nodes, search: '?utm_source=' + source, win: { Swiper: s.Swiper } });
    assert.equal(s.usp.style.display, 'none');
    assert.equal(s.banner.style.display, 'flex');
    assert.equal(s.parent.inserted.length, 1);
    assert.equal(s.parent.inserted[0][0], s.banner);
    assert.equal(s.parent.inserted[0][1], s.next);
  });
}

test('cold banner: loads Swiper 12 CSS, skips the JS when window.Swiper exists, and inits once with the original options', async () => {
  const s = bannerSetup();
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', win: { Swiper: s.Swiper } });
  const link = linkOf(env);
  assert.equal(link.href, 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css');
  assert.equal(link.rel, 'stylesheet');
  assert.equal(scriptOf(env), undefined);
  link.onload();
  await flush();
  assert.equal(s.swipers.length, 1);
  assert.equal(s.swipers[0].sel, '#cold-banner-carousel');
  assert.deepEqual(s.swipers[0].opts, JSON.parse(JSON.stringify(SWIPER_OPTS)));
});

test('cold banner: loads the Swiper 12 JS from jsDelivr when Swiper is absent', () => {
  const s = bannerSetup();
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=chat' });
  const script = scriptOf(env);
  assert.equal(script.src, 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js');
  assert.equal(script.async, true);
});

test('cold banner: runs once per page even if vdp.js runs twice', async () => {
  const s = bannerSetup();
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', win: { Swiper: s.Swiper } });
  vm.runInContext(SOURCE, env.context);
  env.document.head.children.filter((c) => c.tagName === 'LINK').forEach((l) => l.onload());
  await flush();
  assert.equal(s.swipers.length, 1);
  assert.equal(s.parent.inserted.length, 1);
});

test('cold banner: a Swiper load failure goes to DD_LOGS, never console.error', async () => {
  const s = bannerSetup();
  const errors = [];
  const dd = { logger: { warn() {}, error: (...a) => errors.push(a) } };
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', dd });
  scriptOf(env).onerror(new Error('blocked'));
  await flush();
  assert.equal(errors.length, 1);
  assert.equal(env.logs.length, 0);
  assert.equal(s.swipers.length, 0);
});

test('cold banner: a Swiper CSS load failure goes to DD_LOGS too', async () => {
  const s = bannerSetup();
  const errors = [];
  const dd = { logger: { warn() {}, error: (...a) => errors.push(a) } };
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', dd, win: { Swiper: s.Swiper } });
  linkOf(env).onerror(new Error('blocked'));
  await flush();
  assert.equal(errors.length, 1);
  assert.equal(env.logs.length, 0);
  assert.equal(s.swipers.length, 0);
});

test('cold banner: a Swiper load failure without DD_LOGS is silent and does not throw', async () => {
  const s = bannerSetup();
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk' });
  scriptOf(env).onerror(new Error('blocked'));
  await flush();
  assert.equal(env.logs.length, 0);
});

test('cold banner: a matching source with no banner on the page does not throw', () => {
  const s = bannerSetup({ banner: false });
  const env = makeEnv({ nodes: s.nodes, search: '?utm_source=autotrader.co.uk', win: { Swiper: s.Swiper } });
  assert.equal(env.document.head.children.length, 0);
  assert.equal(s.swipers.length, 0);
});

test('cold banner: the USP is found as section.section_usp-carousel, not the embed div', () => {
  assert.match(SOURCE, /document\.querySelector\('section\.section_usp-carousel'\)/);
  const banner = SOURCE.slice(SOURCE.indexOf('__CARSA_COLD_BANNER'), SOURCE.indexOf('cold banner Swiper failed'));
  assert.ok(banner.length > 0);
  assert.ok(!banner.includes('console.error'));
});
