// Unit tests for the cf-page CSS size mapper and foundation gate, using small inline CSS in the style of the Client First V3 cloneable.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SCALE,
  classSizes,
  foundationGate,
  loadScale,
  mapClasses,
  nearestUtility,
  nearestWeight,
  resolveVars,
  scaleFromCss,
  webflowClassName,
} from '../../.claude/skills/cf-page/scripts/css-sizes.js';

const CLI = fileURLToPath(new URL('../../.claude/skills/cf-page/scripts/css-sizes.js', import.meta.url));

const V3_CSS = `
:root{--_typography---h2--h2-font-size:3rem;--_typography---h2--h2-line-height:var(--line-height--medium);--_typography---h2--h2-font-weight:var(--font-weight--bold);--font-weight--bold:700;--line-height--medium:1.2;--_typography---font-size--large:1.5rem}
.heading-style-h2{font-family:var(--font-family--heading);font-size:var(--_typography---h2--h2-font-size);line-height:var(--_typography---h2--h2-line-height);font-weight:var(--_typography---h2--h2-font-weight)}
.text-size-large{font-size:var(--_typography---font-size--large)}
.text-size-large.is-small{font-size:10px}
.text-size-large:hover{font-size:11px}
.hero .text-size-large{font-size:12px}
@media screen and (max-width:767px){body{--_typography---h2--h2-font-size:2rem;--_typography---font-size--large:1.25rem}.heading-style-h2{font-size:1.5rem}}
`;

const FOUNDATION_CSS = `
:root{--_layout---section-padding--large:8rem;--_layout---spacing--global-padding:2.5rem}
.page-wrapper{overflow:clip}.main-wrapper{position:relative}
.heading-style-h1{font-size:4rem}.heading-style-h2{font-size:3rem}.heading-style-h3{font-size:2rem}
.heading-style-h4{font-size:1.5rem}.heading-style-h5{font-size:1.25rem}.heading-style-h6{font-size:1rem}
.text-size-large{font-size:1.5rem}.text-size-medium{font-size:1.25rem}.text-size-regular{font-size:1rem}
.text-size-small{font-size:.875rem}.text-size-tiny{font-size:.75rem}
.text-weight-bold{font-weight:700}
.container-large{max-width:80rem}.container-medium{max-width:64rem}.container-small{max-width:48rem}
`;

const withTmp = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'css-sizes-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('resolveVars', () => {
  test('reads :root, html and body custom properties outside @media only', () => {
    const vars = resolveVars(V3_CSS);
    assert.equal(vars.get('--_typography---h2--h2-font-size'), '3rem');
    assert.equal(vars.get('--_typography---font-size--large'), '1.5rem');
    assert.equal(vars.get('--font-weight--bold'), '700');
  });

  test('later base declarations win, html and body count, other selectors do not', () => {
    const vars = resolveVars(
      ':root{--a:1rem}html{--b:2px}body{--a:3rem}.x{--c:4rem}/* :root{--d:1px} */',
    );
    assert.equal(vars.get('--a'), '3rem');
    assert.equal(vars.get('--b'), '2px');
    assert.equal(vars.has('--c'), false);
    assert.equal(vars.has('--d'), false);
  });
});

describe('classSizes', () => {
  test('parses px, rem and em', () => {
    const sizes = classSizes('.a{font-size:18px}.b{font-size:1.125rem}.c{font-size:2em;font-weight:bold}.d{font-size:.875rem!important}');
    assert.equal(sizes.get('a').fontSizePx, 18);
    assert.equal(sizes.get('a').fontSizeRem, 1.125);
    assert.equal(sizes.get('b').fontSizePx, 18);
    assert.equal(sizes.get('c').fontSizePx, 32);
    assert.equal(sizes.get('c').fontWeight, 700);
    assert.equal(sizes.get('d').fontSizePx, 14);
  });

  test('resolves var() chains on base declarations and ignores @media, combos, states and descendants', () => {
    const sizes = classSizes(V3_CSS);
    assert.deepEqual(sizes.get('heading-style-h2'), {
      fontSizePx: 48,
      fontSizeRem: 3,
      fontWeight: 700,
      lineHeight: 1.2,
    });
    assert.equal(sizes.get('text-size-large').fontSizePx, 24);
  });

  test('keys pure combo selectors by joined class names', () => {
    assert.equal(classSizes(V3_CSS).get('text-size-large.is-small').fontSizePx, 10);
  });

  test('uses the var() fallback when the variable is undefined', () => {
    const sizes = classSizes('.a{font-size:var(--missing, 1.25rem);font-weight:var(--nope,normal)}.b{font-size:var(--missing)}');
    assert.equal(sizes.get('a').fontSizePx, 20);
    assert.equal(sizes.get('a').fontWeight, 400);
    assert.equal(sizes.get('b').fontSizePx, null);
  });

  test('line-height: unitless, percent and length relative to the font size', () => {
    const sizes = classSizes('.a{font-size:20px;line-height:1.5}.b{font-size:20px;line-height:150%}.c{font-size:20px;line-height:30px}.d{line-height:normal}');
    assert.equal(sizes.get('a').lineHeight, 1.5);
    assert.equal(sizes.get('b').lineHeight, 1.5);
    assert.equal(sizes.get('c').lineHeight, 1.5);
    assert.equal(sizes.get('d').lineHeight, null);
  });

  test('the last base declaration wins', () => {
    const sizes = classSizes('.h{font-weight:var(--w);font-weight:600}:root{--w:700}');
    assert.equal(sizes.get('h').fontWeight, 600);
  });
});

describe('nearestUtility', () => {
  test('exact matches have delta 0', () => {
    assert.deepEqual(nearestUtility(48), {
      class: 'heading-style-h2',
      px: 48,
      delta: 0,
      clamped: false,
    });
  });

  test('picks the nearest size and reports a signed delta', () => {
    assert.deepEqual(nearestUtility(30), {
      class: 'heading-style-h3',
      px: 32,
      delta: -2,
      clamped: false,
    });
  });

  test('a tie goes to the smaller size', () => {
    assert.equal(nearestUtility(18).class, 'text-size-regular');
    assert.equal(nearestUtility(40).class, 'heading-style-h3');
  });

  test('at equal size text-size wins unless only headings are allowed', () => {
    assert.equal(nearestUtility(24).class, 'text-size-large');
    assert.equal(nearestUtility(24, DEFAULT_SCALE, { only: 'heading' }).class, 'heading-style-h4');
    assert.equal(nearestUtility(28, DEFAULT_SCALE, { only: 'heading' }).class, 'heading-style-h4');
    assert.equal(nearestUtility(40, DEFAULT_SCALE, { only: 'text' }).class, 'text-size-large');
  });

  test('out-of-range sizes clamp to the nearest end', () => {
    assert.deepEqual(nearestUtility(80), {
      class: 'heading-style-h1',
      px: 64,
      delta: 16,
      clamped: true,
    });
    assert.deepEqual(nearestUtility(10), {
      class: 'text-size-tiny',
      px: 12,
      delta: -2,
      clamped: true,
    });
  });

  test('null size gives null', () => {
    assert.equal(nearestUtility(null), null);
  });
});

describe('scales', () => {
  test('DEFAULT_SCALE holds the V3 starter desktop values', () => {
    assert.deepEqual(DEFAULT_SCALE, {
      'heading-style-h1': 64,
      'heading-style-h2': 48,
      'heading-style-h3': 32,
      'heading-style-h4': 24,
      'heading-style-h5': 20,
      'heading-style-h6': 16,
      'text-size-large': 24,
      'text-size-medium': 20,
      'text-size-regular': 16,
      'text-size-small': 14,
      'text-size-tiny': 12,
    });
  });

  test('loadScale merges a client override over the default, in px or rem', () => {
    withTmp((dir) => {
      const path = join(dir, 'scale.json');
      writeFileSync(path, JSON.stringify({ 'heading-style-h1': 56, 'text-size-large': '1.375rem' }));
      const scale = loadScale(path);
      assert.equal(scale['heading-style-h1'], 56);
      assert.equal(scale['text-size-large'], 22);
      assert.equal(scale['heading-style-h2'], 48);
      assert.equal(nearestUtility(58, scale).class, 'heading-style-h1');
      assert.equal(nearestUtility(23, scale).class, 'text-size-large');
    });
  });

  test('scaleFromCss reads the utility sizes the site itself publishes', () => {
    const scale = scaleFromCss(V3_CSS);
    assert.equal(scale['heading-style-h2'], 48);
    assert.equal(scale['text-size-large'], 24);
    assert.equal(scale['heading-style-h1'], 64);
  });
});

describe('weights', () => {
  test('nearestWeight maps to text-weight-* with ties to the lighter class', () => {
    assert.equal(nearestWeight(700), 'text-weight-bold');
    assert.equal(nearestWeight(600), 'text-weight-semibold');
    assert.equal(nearestWeight(450), 'text-weight-normal');
    assert.equal(nearestWeight(900), 'text-weight-xbold');
    assert.equal(nearestWeight(100), 'text-weight-light');
    assert.equal(nearestWeight(null), null);
  });
});

describe('mapClasses', () => {
  test('maps every sized class to a utility and a weight utility', () => {
    const css = `${V3_CSS} ._25-heading-1{font-size:3.75rem;font-weight:800} ._25-pargraph-16{font-size:16px}`;
    const rows = mapClasses(css);
    const byClass = Object.fromEntries(rows.map((r) => [r.class, r]));
    assert.equal(byClass['_25-heading-1'].fontSizePx, 60);
    assert.equal(byClass['_25-heading-1'].utility, 'heading-style-h1');
    assert.equal(byClass['_25-heading-1'].headingUtility, 'heading-style-h1');
    assert.equal(byClass['_25-heading-1'].weightUtility, 'text-weight-xbold');
    assert.equal(byClass['_25-pargraph-16'].utility, 'text-size-regular');
    assert.equal(byClass['_25-pargraph-16'].headingUtility, 'heading-style-h6');
    assert.equal(byClass['_25-pargraph-16'].textUtility, 'text-size-regular');
    assert.equal(byClass['_25-pargraph-16'].weightUtility, null);
  });

  test('honours a client scale and a class filter', () => {
    const rows = mapClasses('.big{font-size:3.5rem}.small{font-size:1rem}', { ...DEFAULT_SCALE, 'heading-style-h1': 56 }, ['big']);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].utility, 'heading-style-h1');
    assert.equal(rows[0].delta, 0);
  });
});

describe('webflowClassName', () => {
  test('turns Designer style names into published CSS class names', () => {
    assert.equal(webflowClassName('25 Heading 1'), '_25-heading-1');
    assert.equal(webflowClassName('25 Collapse Trigger '), '_25-collapse-trigger');
    assert.equal(webflowClassName('Max Width 1248'), 'max-width-1248');
    assert.equal(webflowClassName('heading-style-h2'), 'heading-style-h2');
    assert.equal(webflowClassName('layout505_tab-link'), 'layout505_tab-link');
  });
});

describe('foundationGate', () => {
  test('passes on a CSS with the full V3 foundation', () => {
    assert.deepEqual(foundationGate(FOUNDATION_CSS), { ok: true, missing: [] });
  });

  test('lists main-wrapper and the section padding variables when missing', () => {
    const css = FOUNDATION_CSS.replace('.main-wrapper{position:relative}', '').replace(
      ':root{--_layout---section-padding--large:8rem;',
      ':root{',
    );
    assert.deepEqual(foundationGate(css), {
      ok: false,
      missing: ['main-wrapper', '--_layout---section-padding--*'],
    });
  });

  test('lists every missing utility and treats text-weight-* as one item', () => {
    const result = foundationGate('.heading-style-h1{font-size:4rem}');
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes('heading-style-h6'));
    assert.ok(result.missing.includes('text-size-tiny'));
    assert.ok(result.missing.includes('text-weight-*'));
    assert.ok(result.missing.includes('container-small'));
    assert.ok(!result.missing.includes('heading-style-h1'));
  });

  test('knownClasses covers unstyled classes Webflow leaves out of the published CSS', () => {
    const css = FOUNDATION_CSS.replace('.page-wrapper{overflow:clip}.main-wrapper{position:relative}', '');
    assert.deepEqual(foundationGate(css).missing, ['page-wrapper', 'main-wrapper']);
    assert.deepEqual(foundationGate(css, { knownClasses: ['page-wrapper', 'main-wrapper'] }), {
      ok: true,
      missing: [],
    });
  });
});

describe('CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  test('maps named classes, accepting Designer names', () => {
    withTmp((dir) => {
      const path = join(dir, 'site.css');
      writeFileSync(path, `${V3_CSS} ._25-heading-1{font-size:3.75rem}`);
      const result = run([path, 'heading-style-h2', '25 Heading 1']);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /heading-style-h2\s+48px \(3rem\)\s+weight 700\s+lh 1\.2\s+-> heading-style-h2 \(delta 0\)\s+text-weight-bold/);
      assert.match(result.stdout, /_25-heading-1\s+60px \(3\.75rem\).*-> heading-style-h1 \(delta -4\)/);
    });
  });

  test('--json prints rows and a missing class exits 1', () => {
    withTmp((dir) => {
      const path = join(dir, 'site.css');
      writeFileSync(path, V3_CSS);
      const ok = run([path, '--json', 'text-size-large']);
      assert.equal(ok.status, 0, ok.stderr);
      assert.equal(JSON.parse(ok.stdout)[0].utility, 'text-size-large');
      const missing = run([path, 'nope']);
      assert.equal(missing.status, 1);
      assert.match(missing.stdout, /nope\s+not in the CSS/);
    });
  });

  test('--scale uses a client scale file', () => {
    withTmp((dir) => {
      const path = join(dir, 'site.css');
      const scale = join(dir, 'scale.json');
      writeFileSync(path, '.big{font-size:3.5rem}');
      writeFileSync(scale, JSON.stringify({ 'heading-style-h1': 56 }));
      const result = run([path, '--scale', scale, 'big']);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /-> heading-style-h1 \(delta 0\)/);
    });
  });

  test('--gate exits 1 with the missing list, 0 when the foundation is there', () => {
    withTmp((dir) => {
      const bad = join(dir, 'bad.css');
      const good = join(dir, 'good.css');
      writeFileSync(bad, FOUNDATION_CSS.replace('.main-wrapper{position:relative}', ''));
      writeFileSync(good, FOUNDATION_CSS);
      const failed = run([bad, '--gate']);
      assert.equal(failed.status, 1);
      assert.match(failed.stdout, /FOUNDATION MISSING/);
      assert.match(failed.stdout, /main-wrapper/);
      const passed = run([good, '--gate']);
      assert.equal(passed.status, 0, passed.stderr);
      assert.match(passed.stdout, /OK foundation gate/);
    });
  });

  test('--gate --tree counts classes from the element tree', () => {
    withTmp((dir) => {
      const css = join(dir, 'site.css');
      writeFileSync(css, FOUNDATION_CSS.replace('.page-wrapper{overflow:clip}.main-wrapper{position:relative}', ''));
      const tree = fileURLToPath(new URL('./fixtures/hidden-and-components.json', import.meta.url));
      const result = run([css, '--gate', '--tree', tree]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    });
  });

  test('usage and exit 2 without a CSS source', () => {
    const result = run([]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage: css-sizes\.js/);
  });
});
