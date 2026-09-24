// Unit tests for the Oost section validator, using inline CSS and HTML fixtures only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseCssClasses,
  validateSection,
  validateAll,
  validateFiles,
} from '../../tools/oost/validate-section.js';

const CLI = fileURLToPath(
  new URL('../../tools/oost/validate-section.js', import.meta.url),
);

const CSS = `
:root { --x: 1px; }
body { margin: 0; }
h1 { margin: 0; }
.section_hero { position: relative; }
.section_nav { position: relative; }
.nav_component { display: block; }
.nav_wrapper { display: flex; padding-top: 1rem; }
.scheme-cream { --scheme-background: #F7F1E3; }
.scheme-white { --scheme-background: #FFFFFF; }
.scheme-buff { --scheme-background: #DCC184; }
.scheme-green-light { --scheme-background: #E2F4E3; }
.scheme-green { --scheme-background: #3B6741; }
.scheme-green-dark { --scheme-background: #152D18; }
.scheme-yellow { --scheme-background: #FEF6E5; }
.padding-global { padding-left: 5%; padding-right: 5%; }
.container-large { max-width: 80rem; margin-left: auto; margin-right: auto; }
.padding-section-large { padding-top: 7rem; padding-bottom: 7rem; }
.spacer-small { width: 100%; padding-top: 1.5rem; }
.button { padding: 0.75rem 1.5rem; }
.button.is-secondary { background-color: transparent; }
.button:hover { color: red; }
.menu_group { padding-top: 3rem; }
.hero_title { font-size: 2rem; }
.bad_margin { margin-top: 1rem; }
.bad_padding { padding-bottom: 1rem; }
.hero_frame::before { padding: 1rem; margin: 2px; }
.scheme-green .hero_title { color: #fff; }
.a-icon { mask-image: url("data:image/svg+xml;utf8,<svg width='1'></svg>"); color: red; }
@media (max-width: 767px) {
  .padding-section-large { padding-top: 4rem; }
  .hero_title { font-size: 1.5rem; }
}
`;

const wrap = (inner, { root = 'section_hero scheme-cream', attrs = '' } = {}) =>
  `<section class="${root}"${attrs}><div class="padding-global"><div class="container-large"><div class="padding-section-large">${inner}</div></div></div></section>`;

const expectOk = (html, css = CSS) => {
  const result = validateSection(html, css);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
};
const expectError = (html, pattern, css = CSS) => {
  const result = validateSection(html, css);
  assert.equal(result.ok, false, 'expected the section to fail');
  assert.ok(
    result.errors.some((e) => pattern.test(e)),
    `no error matched ${pattern}; got ${JSON.stringify(result.errors)}`,
  );
};

describe('parseCssClasses', () => {
  test('returns a Map of class name to declarations', () => {
    const map = parseCssClasses(CSS);
    assert.ok(map instanceof Map);
    const decls = map.get('padding-global');
    assert.ok(decls.some((d) => d.property === 'padding-left' && d.value === '5%'));
  });

  test('includes classes declared inside @media blocks', () => {
    const map = parseCssClasses(CSS);
    const decls = map.get('hero_title');
    assert.ok(decls.some((d) => d.value === '1.5rem'));
    assert.ok(decls.some((d) => d.value === '2rem'));
  });

  test('a compound selector .a.b registers both names', () => {
    const map = parseCssClasses(CSS);
    assert.ok(map.has('is-secondary'));
    assert.ok(map.get('is-secondary').some((d) => d.property === 'background-color'));
  });

  test('pseudo-classes are stripped and still attribute declarations', () => {
    const map = parseCssClasses('.link:hover { color: red; }');
    assert.ok(map.get('link').some((d) => d.property === 'color'));
  });

  test('pseudo-element rules register the class but not their declarations', () => {
    const map = parseCssClasses(CSS);
    assert.ok(map.has('hero_frame'));
    assert.equal(
      map.get('hero_frame').some((d) => d.property.startsWith('padding')),
      false,
    );
  });

  test('element selectors and :root are ignored', () => {
    const map = parseCssClasses(CSS);
    assert.equal(map.has('body'), false);
    assert.equal(map.has('root'), false);
  });

  test('descendant selectors attribute declarations to the subject only', () => {
    const map = parseCssClasses(CSS);
    assert.ok(map.has('scheme-green'));
    assert.equal(
      map.get('scheme-green').some((d) => d.property === 'color'),
      false,
    );
    assert.ok(map.get('hero_title').some((d) => d.value === '#fff'));
  });

  test('semicolons and braces inside quoted values do not split declarations', () => {
    const map = parseCssClasses(CSS);
    const decls = map.get('a-icon');
    assert.equal(decls.length, 2);
    assert.ok(decls[0].value.includes('utf8,<svg'));
  });

  test('comments are ignored', () => {
    const map = parseCssClasses('/* .ghost { margin: 0 } */ .real { color: red; }');
    assert.equal(map.has('ghost'), false);
    assert.ok(map.has('real'));
  });
});

describe('rule 1: single section root', () => {
  test('passes a single section.section_<name> root, with an id', () => {
    expectOk(wrap('<h1>Hi</h1>', { attrs: ' id="menukaart"' }));
  });

  test('fails with two root elements', () => {
    expectError(wrap('') + wrap(''), /exactly one root element/);
  });

  test('fails when the root is not a <section>', () => {
    const html = wrap('')
      .replace(/^<section/, '<div')
      .replace(/<\/section>$/, '</div>');
    expectError(html, /root must be <section>/);
  });

  test('fails when the root lacks a section_ class first', () => {
    expectError(wrap('', { root: 'scheme-cream' }), /section_<name>/);
  });

  test('fails on stray text at the top level', () => {
    expectError(`hello ${wrap('')}`, /text outside the root/);
  });
});

describe('rule 2: exactly one scheme class on the root', () => {
  test('passes with one known scheme', () => {
    expectOk(wrap('', { root: 'section_hero scheme-green-dark' }));
  });

  test('passes with the yellow scheme', () => {
    expectOk(wrap('', { root: 'section_hero scheme-yellow' }));
  });

  test('fails with no scheme', () => {
    expectError(wrap('', { root: 'section_hero' }), /exactly one scheme-/);
  });

  test('fails with two schemes', () => {
    expectError(
      wrap('', { root: 'section_hero scheme-cream scheme-white' }),
      /exactly one scheme-/,
    );
  });

  test('fails with an unknown scheme', () => {
    const css = `${CSS} .scheme-purple { color: red; }`;
    expectError(wrap('', { root: 'section_hero scheme-purple' }), /unknown scheme/, css);
  });
});

describe('rule 3: padding-global > container > padding-section chain', () => {
  test('passes the full chain', () => {
    expectOk(wrap('<p>ok</p>'));
  });

  test('fails when padding-global is missing', () => {
    const html =
      '<section class="section_hero scheme-cream"><div class="container-large"><div class="padding-section-large"></div></div></section>';
    expectError(html, /padding-global/);
  });

  test('fails when the container is missing', () => {
    const html =
      '<section class="section_hero scheme-cream"><div class="padding-global"><div class="padding-section-large"></div></div></section>';
    expectError(html, /container-/);
  });

  test('fails when padding-section is missing', () => {
    const html =
      '<section class="section_hero scheme-cream"><div class="padding-global"><div class="container-large"><p>x</p></div></div></section>';
    expectError(html, /padding-section-/);
  });

  test('nav and footer roots may skip the container chain after padding-global', () => {
    const html =
      '<section class="section_nav nav_component scheme-green-dark"><div class="padding-global"><div class="nav_wrapper"></div></div></section>';
    expectOk(html);
  });

  test('nav and footer roots still need padding-global first', () => {
    const html =
      '<section class="section_nav nav_component scheme-green-dark"><div class="nav_wrapper"></div></section>';
    expectError(html, /padding-global/);
  });
});

describe('rule 4: no inline styles', () => {
  test('passes without style attributes', () => {
    expectOk(wrap('<p class="hero_title">x</p>'));
  });

  test('fails on a style attribute anywhere', () => {
    expectError(wrap('<p style="color: red">x</p>'), /style=/);
  });
});

describe('rule 5: classes exist in the CSS', () => {
  test('passes known classes, is- combos and w- Webflow classes', () => {
    expectOk(
      wrap('<a class="button is-secondary w-inline-block" href="#">x</a><p>plain</p>'),
    );
  });

  test('fails on an unknown class', () => {
    expectError(wrap('<p class="hero_ghost">x</p>'), /unknown class "hero_ghost"/);
  });

  test('fails on an is- class that never appears in the CSS', () => {
    expectError(
      wrap('<a class="button is-ghost" href="#">x</a>'),
      /unknown class "is-ghost"/,
    );
  });
});

describe('rule 6: spacers are empty single-class divs', () => {
  test('passes an empty spacer div', () => {
    expectOk(wrap('<p>a</p><div class="spacer-small"></div><p>b</p>'));
  });

  test('fails a spacer with content', () => {
    expectError(wrap('<div class="spacer-small">x</div>'), /spacer-small.*empty/);
  });

  test('fails a spacer with extra classes', () => {
    expectError(wrap('<div class="spacer-small hero_title"></div>'), /one class/);
  });

  test('fails a spacer that is not a div', () => {
    expectError(wrap('<span class="spacer-small"></span>'), /<div>/);
  });
});

describe('rule 7: no margins, padding only on layout classes', () => {
  test('passes padding on padding-, spacer-, button and _group classes', () => {
    expectOk(wrap('<div class="menu_group"><a class="button" href="#">x</a></div>'));
  });

  test('fails a content class with a margin', () => {
    expectError(wrap('<p class="bad_margin">x</p>'), /bad_margin.*margin/);
  });

  test('fails a content class with padding', () => {
    expectError(wrap('<p class="bad_padding">x</p>'), /bad_padding.*padding/);
  });

  test('container margins are allowed', () => {
    const map = parseCssClasses(CSS);
    assert.ok(map.get('container-large').some((d) => d.property === 'margin-left'));
    expectOk(wrap(''));
  });
});

describe('rule 8: CMS markers', () => {
  test('passes balanced cms markers around sample content', () => {
    expectOk(
      wrap(
        '<!-- cms:gerechten --><div class="menu_group"><p>x</p></div><!-- /cms:gerechten -->',
      ),
    );
  });

  test('passes nested markers', () => {
    expectOk(
      wrap(
        '<!-- cms:menugroepen --><div class="menu_group"><!-- cms:gerechten --><p>x</p><!-- /cms:gerechten --></div><!-- /cms:menugroepen -->',
      ),
    );
  });

  test('fails an unclosed marker', () => {
    expectError(
      wrap('<!-- cms:gerechten --><p>x</p>'),
      /unclosed cms marker "gerechten"/,
    );
  });

  test('fails a close without an open', () => {
    expectError(wrap('<p>x</p><!-- /cms:gerechten -->'), /cms marker/);
  });

  test('fails mismatched nesting', () => {
    expectError(
      wrap('<!-- cms:a --><!-- cms:b --><p>x</p><!-- /cms:a --><!-- /cms:b -->'),
      /cms marker/,
    );
  });
});

describe('HTML parsing', () => {
  test('void elements and self-closing tags need no close', () => {
    expectOk(wrap('<img src="a.png" alt=""><br/><input type="text">'));
  });

  test('reports an unclosed element', () => {
    expectError(wrap('<div class="menu_group"><p>x</p>'), /unclosed|mismatched/);
  });

  test('reports a mismatched close tag', () => {
    expectError(wrap('<p>x</span></p>'), /mismatched|unexpected/);
  });

  test('attribute values with > and quotes parse', () => {
    expectOk(wrap('<a href="/x?a=1&amp;b=2" data-note=\'a > b\' class="button">x</a>'));
  });
});

describe('file helpers and CLI', () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), 'oost-validate-'));
    const cssPath = join(dir, 'site.css');
    writeFileSync(cssPath, CSS);
    return { dir, cssPath };
  };

  test('validateFiles and validateAll report per file', () => {
    const { dir, cssPath } = setup();
    try {
      const good = join(dir, 'a-good.html');
      const bad = join(dir, 'b-bad.html');
      writeFileSync(good, wrap('<p>x</p>'));
      writeFileSync(bad, wrap('<p style="x">x</p>'));
      const results = validateFiles(cssPath, [good, bad]);
      assert.deepEqual(
        results.map((r) => [r.ok, r.file.endsWith('a-good.html')]),
        [
          [true, true],
          [false, false],
        ],
      );
      const all = validateAll(cssPath, dir);
      assert.equal(all.length, 2);
      assert.equal(all.filter((r) => r.ok).length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI exits 0 with one OK line per file', () => {
    const { dir, cssPath } = setup();
    try {
      const good = join(dir, 'good.html');
      writeFileSync(good, wrap('<p>x</p>'));
      const run = spawnSync(process.execPath, [CLI, cssPath, good], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, /OK .*good\.html/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI exits 1 and prints each error', () => {
    const { dir, cssPath } = setup();
    try {
      const bad = join(dir, 'bad.html');
      writeFileSync(bad, wrap('<p style="x" class="hero_ghost">x</p>'));
      const run = spawnSync(process.execPath, [CLI, cssPath, bad], { encoding: 'utf8' });
      assert.equal(run.status, 1);
      assert.match(run.stderr, /bad\.html.*style=/);
      assert.match(run.stderr, /bad\.html.*hero_ghost/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI exits 2 on missing arguments', () => {
    const run = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(run.status, 2);
  });
});
