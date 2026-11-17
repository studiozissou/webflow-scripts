// Unit tests for Studio Zissou nav.js: runs the real file in a vm sandbox against a stub page with settable rects, a manual animation-frame queue and fake Webflow and jQuery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, '..', '..', 'projects', 'studio-zissou', 'nav.js'), 'utf8');

function descendants(el) {
  return el.children.flatMap((c) => [c, ...descendants(c)]);
}

function matches(el, sel) {
  return sel.split(',').some((part) => {
    const s = part.trim();
    const contains = s.match(/^\[class\*="([^"]+)"\]$/);
    if (contains) return [...el.classList].some((c) => c.includes(contains[1]));
    const attr = s.match(/^\[([\w-]+)="([^"]*)"\]$/);
    if (attr) return el.getAttribute(attr[1]) === attr[2];
    throw new Error(`stub selector not supported: ${s}`);
  });
}

function makeWorld() {
  function el(tag, { cls = '', attrs = {}, top = 0, height = 0 } = {}, kids = []) {
    const classes = new Set(cls.split(/\s+/).filter(Boolean));
    const node = {
      tagName: tag.toUpperCase(),
      id: attrs.id || '',
      attrs,
      children: [],
      parentElement: null,
      rect: { top, height },
      offsetHeight: height,
      scrolls: 0,
      classList: {
        add: (c) => classes.add(c),
        remove: (...cs) => cs.forEach((c) => classes.delete(c)),
        contains: (c) => classes.has(c),
        [Symbol.iterator]: () => [...classes][Symbol.iterator](),
      },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      getBoundingClientRect: () => ({
        top: node.rect.top,
        bottom: node.rect.top + node.rect.height,
        height: node.rect.height,
      }),
      contains: (other) => other === node || descendants(node).includes(other),
      querySelector: (sel) => descendants(node).find((d) => matches(d, sel)) ?? null,
      querySelectorAll: (sel) => descendants(node).filter((d) => matches(d, sel)),
      scrollIntoView: () => {
        node.scrolls += 1;
      },
    };
    for (const k of kids) {
      k.parentElement = node;
      node.children.push(k);
    }
    return node;
  }
  return { el };
}

function buildPage(world, { withNav = true, bodyScheme = false, heroScheme = 'u-scheme-brunello-dark' } = {}) {
  const { el } = world;
  const nav = el('nav', { cls: 'section_nav u-scheme-brunello-dark', attrs: { 'data-sz': 'nav' }, top: 0, height: 80 }, [
    el('div', { cls: 'sz-nav_panel u-scheme-olive-light', top: 0, height: 5000 }),
  ]);
  const hero = el('section', { cls: `section_hero ${heroScheme}`, attrs: { id: 'hero' }, top: 80, height: 600 }, [
    el('div', { cls: 'sz-hero_panel u-scheme-olive-light', top: 100, height: 400 }),
  ]);
  const problem = el('section', { cls: 'section_problem u-scheme-brunello-light', attrs: { id: 'problem' }, top: 680, height: 500 });
  const contact = el('section', { cls: 'section_contact u-scheme-olive-light', attrs: { id: 'contact' }, top: 1180, height: 500 });
  const main = el('main', {}, [hero, problem, contact]);
  const wrapper = el('div', { cls: bodyScheme ? 'page-wrapper u-scheme-olive-light' : 'page-wrapper', top: -10000, height: 50000 }, withNav ? [nav, main] : [main]);
  const body = el('body', {}, [wrapper]);
  return { body, nav, hero, problem, contact, wrapper };
}

function run({ withNav = true, bodyScheme = false, heroScheme, readyState = 'complete', hash = '', webflow = 'array', jquery = true } = {}) {
  const world = makeWorld();
  const ui = buildPage(world, { withNav, bodyScheme, heroScheme });
  const rootStyle = { props: {}, writes: 0, setProperty(k, v) { this.props[k] = v; this.writes += 1; } };
  const docListeners = [];
  const winListeners = [];
  const frames = [];
  const offCalls = [];
  const document = {
    readyState,
    documentElement: { style: rootStyle },
    querySelector: (sel) => ui.body.querySelector(sel),
    querySelectorAll: (sel) => ui.body.querySelectorAll(sel),
    getElementById: (id) => descendants(ui.body).find((n) => n.id === id) ?? null,
    addEventListener: (type, fn) => docListeners.push({ type, fn }),
  };
  const console = { log: () => assert.fail('console.log must stay behind DEBUG') };
  const sandbox = {
    document,
    console,
    location: { hash },
    requestAnimationFrame: (fn) => frames.push(fn),
    addEventListener: (type, fn, opts) => winListeners.push({ type, fn, opts }),
  };
  sandbox.window = sandbox;
  if (webflow === 'array') sandbox.Webflow = [];
  if (webflow === 'ready') sandbox.Webflow = { push: (fn) => fn() };
  if (jquery) {
    sandbox.jQuery = (target) => ({
      off: (ns) => {
        offCalls.push({ target, ns });
      },
    });
  }
  const context = vm.createContext(sandbox);
  const exec = () => vm.runInContext(SOURCE, context);
  exec();
  const fireWin = (type) => winListeners.filter((l) => l.type === type).forEach((l) => l.fn({ type }));
  const fireDoc = (type) => docListeners.filter((l) => l.type === type).forEach((l) => l.fn({ type }));
  const flush = () => {
    const queued = frames.splice(0);
    queued.forEach((fn) => fn(0));
    return queued.length;
  };
  const scrollBy = (dy) => {
    for (const s of [ui.hero, ui.problem, ui.contact]) s.rect.top -= dy;
    fireWin('scroll');
    flush();
  };
  const schemes = () => [...ui.nav.classList].filter((c) => c.startsWith('u-scheme-'));
  return { ui, sandbox, exec, rootStyle, winListeners, docListeners, frames, offCalls, fireWin, fireDoc, flush, scrollBy, schemes };
}

test('adds the scheme of the section under the probe line on init', () => {
  const t = run({ heroScheme: 'u-scheme-olive-light' });
  assert.deepEqual(t.schemes(), ['u-scheme-olive-light']);
});

test('swaps the scheme on scroll and keeps one u-scheme token', () => {
  const t = run();
  t.scrollBy(600);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-light']);
  t.scrollBy(500);
  assert.deepEqual(t.schemes(), ['u-scheme-olive-light']);
  t.scrollBy(-1100);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-dark']);
  assert.ok(t.ui.nav.classList.contains('section_nav'));
});

test('probe line sits 4px below the nav bottom edge', () => {
  const t = run();
  t.scrollBy(680 - 84 - 1);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-dark']);
  t.scrollBy(1);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-light']);
});

test('puts back the Designer scheme when no section matches', () => {
  const t = run();
  t.scrollBy(600);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-light']);
  t.scrollBy(5000);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-dark']);
});

test('ignores the nav, its children, nested scheme elements and ancestors of the nav', () => {
  const t = run({ bodyScheme: true });
  t.ui.hero.children[0].rect.top = 0;
  t.ui.hero.children[0].rect.height = 400;
  t.ui.hero.classList.remove('u-scheme-brunello-dark');
  t.ui.hero.classList.add('u-scheme-brunello-light');
  t.fireWin('scroll');
  t.flush();
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-light']);
  t.scrollBy(10000);
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-dark']);
});

test('sets --sz-nav-h from offsetHeight only when it changes', () => {
  const t = run();
  assert.equal(t.rootStyle.props['--sz-nav-h'], '80px');
  assert.equal(t.rootStyle.writes, 1);
  t.fireWin('resize');
  t.flush();
  assert.equal(t.rootStyle.writes, 1);
  t.ui.nav.offsetHeight = 64;
  t.ui.nav.rect.height = 64;
  t.fireWin('resize');
  t.flush();
  assert.equal(t.rootStyle.props['--sz-nav-h'], '64px');
  assert.equal(t.rootStyle.writes, 2);
});

test('makes one update per animation frame and listens passively', () => {
  const t = run();
  const scroll = t.winListeners.find((l) => l.type === 'scroll');
  assert.ok(scroll && scroll.opts && scroll.opts.passive, 'passive scroll listener');
  assert.ok(t.winListeners.some((l) => l.type === 'resize'));
  assert.ok(t.winListeners.some((l) => l.type === 'load'));
  t.fireWin('scroll');
  t.fireWin('scroll');
  t.fireWin('resize');
  assert.equal(t.frames.length, 1);
  assert.equal(t.flush(), 1);
  t.fireWin('scroll');
  assert.equal(t.frames.length, 1);
});

test('updates on load', () => {
  const t = run();
  for (const s of [t.ui.hero, t.ui.problem, t.ui.contact]) s.rect.top -= 600;
  t.fireWin('load');
  t.flush();
  assert.deepEqual(t.schemes(), ['u-scheme-brunello-light']);
});

test('removes click.wf-scroll through Webflow.push and again on load', () => {
  const t = run({ readyState: 'interactive' });
  assert.equal(t.sandbox.Webflow.length, 1);
  assert.equal(t.offCalls.length, 0);
  t.sandbox.Webflow[0]();
  assert.equal(t.offCalls.length, 1);
  assert.equal(t.offCalls[0].target, t.sandbox.document);
  assert.equal(t.offCalls[0].ns, 'click.wf-scroll');
  t.fireWin('load');
  assert.equal(t.offCalls.length, 2);
  assert.equal(t.offCalls[1].ns, 'click.wf-scroll');
});

test('removes click.wf-scroll at once when the page has already loaded', () => {
  const t = run({ webflow: 'ready' });
  assert.ok(t.offCalls.length >= 1);
  assert.ok(t.offCalls.every((c) => c.ns === 'click.wf-scroll'));
});

test('does not throw without Webflow or jQuery', () => {
  assert.doesNotThrow(() => {
    const t = run({ webflow: 'none', jquery: false });
    t.fireWin('load');
    t.flush();
  });
  assert.doesNotThrow(() => {
    const t = run({ webflow: 'array', jquery: false });
    t.sandbox.Webflow.forEach((fn) => fn());
    t.fireWin('load');
  });
});

test('scrolls to the hash target once after the first height write', () => {
  const t = run({ hash: '#contact' });
  assert.equal(t.ui.contact.scrolls, 1);
  t.fireWin('load');
  t.fireWin('resize');
  t.flush();
  assert.equal(t.ui.contact.scrolls, 1);
});

test('ignores a hash with no target or a malformed hash', () => {
  assert.doesNotThrow(() => run({ hash: '#missing' }));
  assert.doesNotThrow(() => run({ hash: '#%E0%A4%A' }));
  assert.doesNotThrow(() => run({ hash: '#' }));
});

test('waits for DOMContentLoaded while the document is loading', () => {
  const t = run({ readyState: 'loading' });
  assert.equal(t.rootStyle.writes, 0);
  t.fireDoc('DOMContentLoaded');
  assert.equal(t.rootStyle.props['--sz-nav-h'], '80px');
});

test('does nothing when the nav root is missing', () => {
  const t = run({ withNav: false });
  assert.equal(t.rootStyle.writes, 0);
  assert.equal(t.winListeners.length, 0);
});

test('runs once', () => {
  const t = run();
  const listeners = t.winListeners.length;
  t.exec();
  assert.equal(t.winListeners.length, listeners);
  assert.equal(t.sandbox.SZ.navReady, true);
});
