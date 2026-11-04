// Unit tests for the cf-page element-tree metrics; expected totals come from counting the sanitised fixtures by hand and with an independent script.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isCfClass,
  loadTree,
  normaliseStyleName,
  pageMetrics,
  sectionMapMarkdown,
} from '../../.claude/skills/cf-page/scripts/page-metrics.js';

const CLI = fileURLToPath(
  new URL('../../.claude/skills/cf-page/scripts/page-metrics.js', import.meta.url),
);
const TRIMMED_PATH = fileURLToPath(new URL('./fixtures/mtd-software-trimmed.json', import.meta.url));
const HIDDEN_PATH = fileURLToPath(new URL('./fixtures/hidden-and-components.json', import.meta.url));
const TRIMMED = JSON.parse(readFileSync(TRIMMED_PATH, 'utf8'));
const HIDDEN = JSON.parse(readFileSync(HIDDEN_PATH, 'utf8'));

const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

describe('loadTree', () => {
  test('unwraps the raw get_all_elements response', () => {
    const body = loadTree(TRIMMED);
    assert.equal(body.type, 'Body');
    assert.equal(body.id.element, 'e1');
  });

  test('accepts a bare Body node', () => {
    assert.equal(loadTree(HIDDEN), HIDDEN);
  });

  test('accepts a JSON string', () => {
    assert.equal(loadTree(JSON.stringify(HIDDEN)).type, 'Body');
  });

  test('throws on anything else', () => {
    assert.throws(() => loadTree({ result: [] }), /element tree/);
    assert.throws(() => loadTree({ foo: 1 }), /element tree/);
  });
});

describe('normaliseStyleName and isCfClass', () => {
  test('trims whitespace and non-breaking spaces', () => {
    assert.equal(normaliseStyleName(' Card Title '), 'Card Title');
    assert.equal(normaliseStyleName('  hide \n'), 'hide');
  });

  test('accepts Client First V3 structure, utilities and custom names', () => {
    for (const name of [
      'page-wrapper',
      'main-wrapper',
      'section_hero',
      'section_layout505',
      'container-small',
      'container-large',
      'padding-global',
      'padding-section-large',
      'padding-section-top-medium',
      'heading-style-h1',
      'heading-style-h6',
      'text-size-tiny',
      'text-weight-semibold',
      'text-style-allcaps',
      'text-align-center',
      'text-color-secondary',
      'background-color-alternate',
      'margin-0',
      'margin-bottom-xxtiny',
      'padding-horizontal-xhuge',
      'gap-medium',
      'max-width-large',
      'max-width-full-mobile-portrait',
      'hide',
      'hide-mobile-portrait',
      'grid-autofit-small',
      'display-inline-flex',
      'icon-1x1-medium',
      'button',
      'spacing-clean',
      'align-center',
      'overflow-hidden',
      'z-index-2',
      'pointer-events-none',
      'aspect-ratio-square',
      'text-rich-text',
      'how-it-works_icon',
      'layout505_tab-pane',
    ]) {
      assert.equal(isCfClass(name), true, name);
    }
  });

  test('rejects legacy, modifier and malformed names', () => {
    for (const name of [
      '25 Heading 1',
      'Max Width 1248',
      'is-mtd',
      'is-white',
      'margin-12px',
      'gap-big',
      'heading-style-h7',
      'container-full',
      'CTA Button',
      'Section_Hero',
      'hero__title',
      'z-index 1',
      '',
    ]) {
      assert.equal(isCfClass(name), false, name);
    }
  });
});

describe('pageMetrics on the trimmed mtd-software fixture', () => {
  const metrics = pageMetrics(TRIMMED);

  test('page totals', () => {
    assert.equal(metrics.elements, 34);
    assert.equal(metrics.maxDepth, 8);
    assert.equal(metrics.distinctClasses, 27);
    assert.equal(metrics.classes.length, 27);
    assert.equal(metrics.mainWrapperFound, true);
  });

  test('Client First classes and ratio', () => {
    assert.deepEqual(metrics.cfClasses, [
      'align-center',
      'heading-style-h3',
      'main-wrapper',
      'max-width-large',
      'page-wrapper',
      'text-align-center',
      'text-size-medium',
    ]);
    assert.equal(metrics.cfRatio, 7 / 27);
  });

  test('every component instance with its path', () => {
    assert.deepEqual(metrics.components, [
      { name: 'Top Nav Bar', path: 'Body > page-wrapper' },
      { name: 'Breadcrumbs Section', path: 'Body > page-wrapper > main-wrapper' },
      {
        name: '26 Price Table',
        path: 'Body > page-wrapper > main-wrapper > 25 Plans Section 2 > Max Width 1248',
      },
      { name: 'Footer', path: 'Body > page-wrapper' },
    ]);
  });

  test('sections are the main-wrapper children in page order', () => {
    const rows = metrics.sections.map((s) => [
      s.index,
      s.name,
      s.type,
      s.tag,
      s.elements,
      s.depth,
      s.isComponent,
      s.hidden,
      s.action,
    ]);
    assert.deepEqual(rows, [
      [1, 'Breadcrumbs Section', 'ComponentInstance', null, 1, 0, true, false, 'keep'],
      [2, '25 Testimonial Section', 'Section', 'section', 13, 5, false, false, 'rebuild'],
      [3, '25 Plans Section 2', 'Section', 'section', 15, 5, false, false, 'rebuild'],
    ]);
    assert.deepEqual(metrics.sections[1].classes, ['25 Testimonial Section']);
    assert.deepEqual(metrics.sections[0].classes, []);
    assert.deepEqual(metrics.sections[0].components, ['Breadcrumbs Section']);
    assert.deepEqual(metrics.sections[2].components, ['26 Price Table']);
    assert.deepEqual(metrics.sections[1].components, []);
  });
});

describe('pageMetrics on the hidden-and-components fixture', () => {
  const metrics = pageMetrics(HIDDEN);

  test('a trailing non-breaking space is a separate style, listed as untrimmed', () => {
    assert.equal(metrics.elements, 13);
    assert.equal(metrics.maxDepth, 6);
    assert.equal(metrics.distinctClasses, 11);
    assert.ok(metrics.classes.includes('Card Title'));
    assert.ok(metrics.classes.includes('Card Title '));
    assert.deepEqual(metrics.untrimmedClasses, ['Card Title ']);
    assert.equal(metrics.cfClasses.length, 7);
    assert.equal(metrics.cfRatio, 7 / 11);
  });

  test('a padded Client First name still classifies and still hides', () => {
    const tree = structuredClone(HIDDEN);
    tree.children[0].children[0].children[3].styleNames = ['section_plain', 'hide '];
    const metrics2 = pageMetrics(tree);
    assert.ok(metrics2.cfClasses.includes('hide '));
    assert.equal(metrics2.sections[3].action, 'drop');
    assert.equal(metrics2.sections[3].name, 'section_plain hide');
  });

  test('default actions: hide and visibility:false drop, components keep, the rest rebuild', () => {
    const rows = metrics.sections.map((s) => [s.name, s.elements, s.depth, s.hidden, s.isComponent, s.action]);
    assert.deepEqual(rows, [
      ['Promo Section hide', 2, 1, true, false, 'drop'],
      ['Legacy Section', 1, 0, true, false, 'drop'],
      ['Logo Strip', 1, 0, false, true, 'keep'],
      ['section_plain', 6, 3, false, false, 'rebuild'],
    ]);
  });

  test('a hide-* breakpoint class hides at one width only, so it is not hidden', () => {
    const tree = structuredClone(HIDDEN);
    const plain = tree.children[0].children[0].children[3];
    plain.styleNames = ['section_plain', 'hide-tablet'];
    const section = pageMetrics(tree).sections[3];
    assert.equal(section.hidden, false);
    assert.equal(section.action, 'rebuild');
  });
});

describe('fallback without main-wrapper', () => {
  test("uses the children of Body's first Block", () => {
    const tree = {
      type: 'Body',
      children: [
        { type: 'HtmlEmbed' },
        {
          type: 'Block',
          styleNames: ['Wrapper'],
          children: [
            { type: 'Section', styleNames: ['Hero'], children: [{ type: 'Heading' }] },
            { type: 'Section', styleNames: ['Footer CTA'] },
          ],
        },
      ],
    };
    const metrics = pageMetrics(tree);
    assert.equal(metrics.mainWrapperFound, false);
    assert.deepEqual(
      metrics.sections.map((s) => [s.index, s.name, s.elements]),
      [
        [1, 'Hero', 2],
        [2, 'Footer CTA', 1],
      ],
    );
  });

  test('no classes gives a ratio of 0 and no sections when there is no Block', () => {
    const metrics = pageMetrics({ type: 'Body', children: [{ type: 'HtmlEmbed' }] });
    assert.equal(metrics.elements, 2);
    assert.equal(metrics.maxDepth, 1);
    assert.equal(metrics.distinctClasses, 0);
    assert.equal(metrics.cfRatio, 0);
    assert.deepEqual(metrics.sections, []);
  });
});

describe('sectionMapMarkdown', () => {
  const md = sectionMapMarkdown(pageMetrics(TRIMMED));
  const lines = md.split('\n');

  test('one table row per section under a fixed header', () => {
    assert.ok(
      lines.includes(
        '| # | Section classes | Type / tag | Elements | Depth | Components | Hidden | Action |',
      ),
      md,
    );
    const rows = lines.filter((l) => /^\| \d+ \|/.test(l));
    assert.equal(rows.length, 3);
    assert.equal(
      rows[0],
      '| 1 | Breadcrumbs Section (component) | ComponentInstance | 1 | 0 | Breadcrumbs Section | no | keep |',
    );
    assert.equal(
      rows[2],
      '| 3 | 25 Plans Section 2 | Section / section | 15 | 5 | 26 Price Table | no | rebuild |',
    );
  });

  test('totals and action lines carry the same numbers as pageMetrics', () => {
    assert.ok(
      lines.includes(
        'Totals: 34 elements, max depth 8, 27 distinct classes, 7 Client First (25.9%), 3 sections',
      ),
      md,
    );
    assert.ok(
      lines.includes('Actions: keep 1 (1 elements), rebuild 2 (28 elements), drop 0 (0 elements)'),
      md,
    );
  });

  test('flags the fallback and escapes pipes', () => {
    const md2 = sectionMapMarkdown(
      pageMetrics({ type: 'Body', children: [{ type: 'Block', children: [{ type: 'Section', styleNames: ['a|b'] }] }] }),
    );
    assert.match(md2, /main-wrapper not found/);
    assert.match(md2, /\| 1 \| a\\\|b \|/);
  });
});

describe('CLI', () => {
  test('prints the section map for a tree file', () => {
    const result = run([TRIMMED_PATH]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Totals: 34 elements, max depth 8, 27 distinct classes/);
    assert.match(result.stdout, /\| 2 \| 25 Testimonial Section \|/);
  });

  test('--json prints the metrics object', () => {
    const result = run([HIDDEN_PATH, '--json']);
    assert.equal(result.status, 0, result.stderr);
    const metrics = JSON.parse(result.stdout);
    assert.equal(metrics.elements, 13);
    assert.equal(metrics.sections.length, 4);
  });

  test('usage and exit 2 without a file', () => {
    const result = run([]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage: page-metrics\.js <tree\.json> \[--json\]/);
  });

  test('exit 2 on an unreadable tree', () => {
    const result = run([fileURLToPath(new URL('./missing.json', import.meta.url))]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /could not read/);
  });
});
