// Unit tests for the generic Client First section validator's config-driven colour schemes, optional scheme check and v2/v3 section structures, landmark roots and repeatable --css.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  schemesFromCss,
  validateAll,
  validateFiles,
  validateSection,
} from '../../tools/webflow/validate-section.js';

const CLI = fileURLToPath(new URL('../../tools/webflow/validate-section.js', import.meta.url));

const CSS = `
.section_hero { position: relative; }
.scheme-light { --scheme-background: #FFFFFF; }
.scheme-dark { --scheme-background: #111111; }
.scheme-accent { --scheme-background: #FF5500; }
.padding-global { padding-left: 5%; padding-right: 5%; }
.container-large { max-width: 80rem; margin-left: auto; margin-right: auto; }
.padding-section-large { padding-top: 7rem; padding-bottom: 7rem; }
`;

const CONFIG = { schemes: ['light', 'dark'] };

const section = (scheme) =>
  `<section class="section_hero scheme-${scheme}"><div class="padding-global"><div class="container-large"><div class="padding-section-large"><p>x</p></div></div></div></section>`;

describe('schemes from config', () => {
  test('passes a scheme listed in the config', () => {
    const result = validateSection(section('dark'), CSS, { schemes: CONFIG.schemes });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
  });

  test('rejects a scheme the CSS defines but the config does not list', () => {
    const result = validateSection(section('accent'), CSS, { schemes: CONFIG.schemes });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => /rule 2: unknown scheme "scheme-accent".*light, dark/.test(e)),
      JSON.stringify(result.errors),
    );
  });

  test('rejects an unknown scheme', () => {
    const css = `${CSS} .scheme-ghost { color: red; }`;
    const result = validateSection(section('ghost'), css, { schemes: CONFIG.schemes });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /unknown scheme "scheme-ghost"/.test(e)));
  });

  test('a different config gives a different allow list', () => {
    const result = validateSection(section('accent'), CSS, { schemes: ['accent'] });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });
});

describe('schemes from the CSS when no config is given', () => {
  test('schemesFromCss lists every scheme- class', () => {
    assert.deepEqual(schemesFromCss(CSS).sort(), ['accent', 'dark', 'light']);
  });

  test('accepts any scheme the CSS defines and rejects one it does not', () => {
    assert.equal(validateSection(section('accent'), CSS).ok, true);
    const result = validateSection(section('ghost'), CSS);
    assert.ok(result.errors.some((e) => /unknown scheme "scheme-ghost"/.test(e)));
  });
});

describe('file helpers and CLI', () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), 'validate-section-'));
    const cssPath = join(dir, 'site.css');
    const configPath = join(dir, 'launch.config.json');
    writeFileSync(cssPath, CSS);
    writeFileSync(configPath, JSON.stringify(CONFIG));
    return { dir, cssPath, configPath };
  };

  test('validateFiles and validateAll pass the schemes through', () => {
    const { dir, cssPath } = setup();
    try {
      const good = join(dir, 'a-good.html');
      const bad = join(dir, 'b-bad.html');
      writeFileSync(good, section('light'));
      writeFileSync(bad, section('accent'));
      const results = validateFiles(cssPath, [good, bad], CONFIG);
      assert.deepEqual(
        results.map((r) => r.ok),
        [true, false],
      );
      assert.deepEqual(
        validateAll(cssPath, dir, CONFIG).map((r) => r.ok),
        [true, false],
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI reads schemes from --config', () => {
    const { dir, cssPath, configPath } = setup();
    try {
      const good = join(dir, 'good.html');
      const bad = join(dir, 'bad.html');
      writeFileSync(good, section('dark'));
      writeFileSync(bad, section('accent'));
      const ok = spawnSync(process.execPath, [CLI, '--config', configPath, cssPath, good], {
        encoding: 'utf8',
      });
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stdout, /OK .*good\.html/);
      const fail = spawnSync(process.execPath, [CLI, cssPath, bad, '--config', configPath], {
        encoding: 'utf8',
      });
      assert.equal(fail.status, 1);
      assert.match(fail.stderr, /bad\.html.*unknown scheme "scheme-accent"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI exits 2 on missing arguments or an unreadable config', () => {
    assert.equal(spawnSync(process.execPath, [CLI], { encoding: 'utf8' }).status, 2);
    const run = spawnSync(
      process.execPath,
      [CLI, '--config', join(tmpdir(), 'no-such-launch.config.json'), 'a.css', 'b.html'],
      { encoding: 'utf8' },
    );
    assert.equal(run.status, 2);
  });
});

const V3_CSS = `
.section_hero { position: relative; }
.container-large { max-width: 80rem; margin-left: auto; margin-right: auto; }
.heading-style-h2 { font-size: 3rem; }
.text-size-regular { font-size: 1rem; }
.padding-global { padding-left: 5%; padding-right: 5%; }
.padding-section-large { padding-top: 7rem; padding-bottom: 7rem; }
`;

const v3Section = (inner = '<h2 class="heading-style-h2">Title</h2><p class="text-size-regular">x</p>') =>
  `<section class="section_hero"><div class="container-large">${inner}</div></section>`;

const NO_SCHEME = { scheme: false };

describe('section structure', () => {
  test('v2 is the default and rejects a v3-shaped section for missing padding-global', () => {
    const result = validateSection(v3Section(), V3_CSS, NO_SCHEME);
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => /rule 3: .*\.padding-global as first child, found <div\.container-large>/.test(e)),
      JSON.stringify(result.errors),
    );
    assert.deepEqual(
      validateSection(v3Section(), V3_CSS, { ...NO_SCHEME, structure: 'v2' }).errors,
      result.errors,
    );
  });

  test('v3 passes section_<name> › container-*', () => {
    const result = validateSection(v3Section(), V3_CSS, { ...NO_SCHEME, structure: 'v3' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
  });

  test('v3 allows padding on section_ and margin on margin-* and align-center, v2 does not', () => {
    const css = `${V3_CSS}
.section_hero { padding: 5rem 2.5rem; }
.margin-bottom-small { margin-bottom: 1.5rem; }
.align-center { margin-left: auto; margin-right: auto; }
.hero_content { padding: 1rem; margin-top: 1rem; }`;
    const html = v3Section(
      '<div class="hero_content align-center"><h2 class="heading-style-h2 margin-bottom-small">Title</h2></div>',
    );
    const v3 = validateSection(html, css, { ...NO_SCHEME, structure: 'v3' });
    assert.deepEqual(
      v3.errors.filter((e) => /rule 7/.test(e)).sort(),
      ['rule 7: class "hero_content" has a margin declaration'],
    );
    const v2 = validateSection(html, css, NO_SCHEME);
    assert.ok(v2.errors.includes('rule 7: class "section_hero" has a padding declaration'));
    assert.ok(v2.errors.includes('rule 7: class "margin-bottom-small" has a margin declaration'));
    assert.ok(v2.errors.includes('rule 7: class "align-center" has a margin declaration'));
    assert.ok(v2.errors.includes('rule 7: class "hero_content" has a padding declaration'));
  });

  test('v3 allows inner padding on custom classes and zero, auto or negative margins', () => {
    const css = `${V3_CSS}
.hero_panel { padding: 2rem; }
.hero_title { margin-top: 0; margin-bottom: 0; }
.hero_center { margin: 0 auto; }
.hero_bleed { margin-left: calc(-1 * var(--gp)); margin-right: -2rem; }
@media (max-width: 767px) { .hero_bleed { margin-left: 0; } }
.hero_gap { margin-top: 2rem; }
.hero_mixed { margin: 0 1rem; }`;
    const html = v3Section(
      '<div class="hero_panel"><h2 class="hero_title heading-style-h2">T</h2><div class="hero_center"></div><div class="hero_bleed"></div><div class="hero_gap"></div><div class="hero_mixed"></div></div>',
    );
    const v3 = validateSection(html, css, { ...NO_SCHEME, structure: 'v3' });
    assert.deepEqual(
      v3.errors.filter((e) => /rule 7/.test(e)).sort(),
      [
        'rule 7: class "hero_gap" has a margin declaration',
        'rule 7: class "hero_mixed" has a margin declaration',
      ],
    );
    const v2 = validateSection(html, css, NO_SCHEME);
    assert.ok(v2.errors.includes('rule 7: class "hero_title" has a margin declaration'));
    assert.ok(v2.errors.includes('rule 7: class "hero_panel" has a padding declaration'));
  });

  test('v3 lets a heading follow its tag default; v2 still needs heading-style-', () => {
    const html = v3Section('<h2>Title</h2><h3 class="hero_title text-size-regular">Sub</h3>');
    const css = `${V3_CSS} .hero_title { color: red; }`;
    const v3 = validateSection(html, css, { ...NO_SCHEME, structure: 'v3' });
    assert.deepEqual(v3.errors, []);
    const v2 = validateSection(html, css, NO_SCHEME);
    assert.ok(v2.errors.some((e) => /^rule 9: <h2> needs a heading-style- class/.test(e)), JSON.stringify(v2.errors));
  });

  test('a class used only inside :has(), :not() or :is() counts as known', () => {
    const css = `${V3_CSS} .hero_chip:has(.hero_input:checked) { color: red; } .hero_chip:not(.is-off) { color: blue; }`;
    const html = v3Section('<label class="hero_chip"><input class="hero_input"><span class="is-off"></span></label>');
    const result = validateSection(html, css, { ...NO_SCHEME, structure: 'v3' });
    assert.ok(!result.errors.some((e) => /rule 5/.test(e)), JSON.stringify(result.errors));
  });

  test('v2 still treats a class used only inside :has() as unknown', () => {
    const css = `${V3_CSS} .hero_chip:has(.hero_input:checked) { color: red; }`;
    const html = '<section class="section_hero"><div class="padding-global"><div class="container-large"><div class="padding-section-large"><label class="hero_chip"><input class="hero_input"></label></div></div></div></section>';
    const result = validateSection(html, css, NO_SCHEME);
    assert.ok(result.errors.includes('rule 5: unknown class "hero_input" (not in the CSS)'), JSON.stringify(result.errors));
    assert.ok(!result.errors.some((e) => /"hero_chip"/.test(e)), JSON.stringify(result.errors));
  });

  test('v3 rejects a section whose first child is not a container', () => {
    const html = '<section class="section_hero"><div class="padding-global"><div class="container-large"><p class="text-size-regular">x</p></div></div></section>';
    const result = validateSection(html, V3_CSS, { ...NO_SCHEME, structure: 'v3' });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => /rule 3: expected <section\.section_hero> › \.container-small\|medium\|large as first child, found <div\.padding-global>/.test(e)),
      JSON.stringify(result.errors),
    );
  });

  test('v3 rejects padding-global anywhere in the section as rule 3', () => {
    const html = v3Section('<div class="padding-global"><p class="text-size-regular">x</p></div>');
    const result = validateSection(html, V3_CSS, { ...NO_SCHEME, structure: 'v3' });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => /rule 3: .*padding-global.*not Client First V3/.test(e)),
      JSON.stringify(result.errors),
    );
    assert.ok(!result.errors.some((e) => /rule 5/.test(e)), JSON.stringify(result.errors));
  });

  test('v3 rejects a nested padding-section-* class as rule 3', () => {
    const html = v3Section('<div class="padding-section-large"><p class="text-size-regular">x</p></div>');
    const result = validateSection(html, V3_CSS, { ...NO_SCHEME, structure: 'v3' });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => /rule 3: .*padding-section-large.*not Client First V3/.test(e)),
      JSON.stringify(result.errors),
    );
  });

  test('v3 keeps the nav and footer exemption below the container', () => {
    const html = '<section class="section_nav"><div class="container-large"><p class="text-size-regular">x</p></div></section>';
    const css = `${V3_CSS} .section_nav { position: sticky; }`;
    assert.deepEqual(validateSection(html, css, { ...NO_SCHEME, structure: 'v3' }).errors, []);
  });

  test('an unknown structure throws', () => {
    assert.throws(() => validateSection(v3Section(), V3_CSS, { structure: 'v4' }), /structure/);
  });

  test('validateFiles and validateAll pass the structure through', () => {
    const dir = mkdtempSync(join(tmpdir(), 'validate-section-v3-'));
    try {
      const cssPath = join(dir, 'site.css');
      const file = join(dir, 'hero.html');
      writeFileSync(cssPath, V3_CSS);
      writeFileSync(file, v3Section());
      const options = { ...NO_SCHEME, structure: 'v3' };
      assert.deepEqual(validateFiles(cssPath, [file], options).map((r) => r.ok), [true]);
      assert.deepEqual(validateAll(cssPath, dir, options).map((r) => r.ok), [true]);
      assert.deepEqual(validateFiles(cssPath, [file], NO_SCHEME).map((r) => r.ok), [false]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('scheme check opt-out', () => {
  test('scheme: false skips rule 2', () => {
    const html = '<section class="section_hero"><div class="padding-global"><div class="container-large"><div class="padding-section-large"><p>x</p></div></div></div></section>';
    const withScheme = validateSection(html, CSS);
    assert.ok(withScheme.errors.some((e) => /^rule 2:/.test(e)), JSON.stringify(withScheme.errors));
    const result = validateSection(html, CSS, NO_SCHEME);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
  });

  test('scheme: false also skips an unknown scheme class', () => {
    const result = validateSection(section('accent'), CSS, { schemes: ['light'], scheme: false });
    assert.deepEqual(result.errors, []);
  });
});

describe('structure and scheme CLI flags', () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), 'validate-section-flags-'));
    const cssPath = join(dir, 'site.css');
    const file = join(dir, 'hero.html');
    writeFileSync(cssPath, V3_CSS);
    writeFileSync(file, v3Section());
    return { dir, cssPath, file };
  };
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  test('--structure v3 --no-scheme passes a v3 section', () => {
    const { dir, cssPath, file } = setup();
    try {
      const ok = run(['--structure', 'v3', '--no-scheme', cssPath, file]);
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stdout, /OK .*hero\.html/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--no-scheme skips rule 2 and the default structure is v2', () => {
    const { dir, cssPath, file } = setup();
    try {
      const plain = run([cssPath, file]);
      assert.equal(plain.status, 1);
      assert.match(plain.stderr, /rule 2:/);
      assert.match(plain.stderr, /rule 3: .*padding-global/);
      const noScheme = run([cssPath, file, '--no-scheme']);
      assert.equal(noScheme.status, 1);
      assert.doesNotMatch(noScheme.stderr, /rule 2:/);
      assert.match(noScheme.stderr, /rule 3: .*padding-global/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--structure v3 without --no-scheme still runs rule 2', () => {
    const { dir, cssPath, file } = setup();
    try {
      const result = run(['--structure', 'v3', cssPath, file]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /rule 2:/);
      assert.doesNotMatch(result.stderr, /rule 3:/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('an unknown or missing --structure value exits 2 with the usage', () => {
    const { dir, cssPath, file } = setup();
    try {
      for (const args of [['--structure', 'v4', cssPath, file], [cssPath, file, '--structure']]) {
        const result = run(args);
        assert.equal(result.status, 2, JSON.stringify(args));
        assert.match(result.stderr, /usage: .*\[--structure v2\|v3\] \[--no-scheme\]/);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('landmark section roots', () => {
  const css = `${V3_CSS} .section_footer { position: relative; }`;
  const options = { ...NO_SCHEME, structure: 'v3' };

  test('footer, header and nav roots with a section_ class pass', () => {
    for (const tag of ['footer', 'header', 'nav']) {
      const html = `<${tag} class="section_footer"><div class="container-large"><p class="text-size-regular">x</p></div></${tag}>`;
      assert.deepEqual(validateSection(html, css, options).errors, [], tag);
    }
  });

  test('a footer root without a section_ class still fails rule 1', () => {
    const html = '<footer class="container-large"><p class="text-size-regular">x</p></footer>';
    const result = validateSection(html, css, options);
    assert.ok(
      result.errors.some((e) => /^rule 1: root must carry class="section_/.test(e)),
      JSON.stringify(result.errors),
    );
  });

  test('a div root with a section_ class still fails rule 1', () => {
    const html = '<div class="section_footer"><div class="container-large"></div></div>';
    const result = validateSection(html, css, options);
    assert.ok(
      result.errors.some((e) => /^rule 1: root must be <section>, <footer>, <header> or <nav>, found <div>/.test(e)),
      JSON.stringify(result.errors),
    );
  });

  test('v2 still requires a <section> root, so a footer root fails rule 1', () => {
    const html = '<footer class="section_footer"><div class="padding-global"><div class="container-large"><p class="text-size-regular">x</p></div></div></footer>';
    const result = validateSection(html, css, NO_SCHEME);
    assert.ok(result.errors.includes('rule 1: root must be <section>, found <footer>'), JSON.stringify(result.errors));
  });
});

describe('repeatable --css', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), 'validate-section-css-'));
    const base = join(dir, 'base.css');
    const extra = join(dir, 'extra.css');
    const file = join(dir, 'hero.html');
    writeFileSync(base, V3_CSS);
    writeFileSync(extra, '.hero_title { color: red; }');
    writeFileSync(file, v3Section('<p class="hero_title text-size-regular">x</p>'));
    return { dir, base, extra, file };
  };

  test('concatenates every --css stylesheet', () => {
    const { dir, base, extra, file } = setup();
    try {
      const ok = run(['--structure', 'v3', '--no-scheme', '--css', base, '--css', extra, file]);
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stdout, /OK .*hero\.html/);
      const one = run(['--structure', 'v3', '--no-scheme', '--css', base, file]);
      assert.equal(one.status, 1);
      assert.match(one.stderr, /rule 5: unknown class "hero_title"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a directory target works with --css and the positional form still works', () => {
    const { dir, base, extra } = setup();
    try {
      const sections = join(dir, 'sections');
      mkdirSync(sections);
      writeFileSync(join(sections, 'a.html'), v3Section());
      const ok = run(['--structure', 'v3', '--no-scheme', '--css', base, '--css', extra, sections]);
      assert.equal(ok.status, 0, ok.stderr);
      const positional = run(['--structure', 'v3', '--no-scheme', base, join(sections, 'a.html')]);
      assert.equal(positional.status, 0, positional.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--css without a value or without targets exits 2 with the usage', () => {
    const { dir, base } = setup();
    try {
      assert.equal(run(['--css', base]).status, 2);
      assert.equal(run(['--css']).status, 2);
      assert.match(run(['--css', base]).stderr, /usage: .*--css <path>/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('validateFiles accepts an array of stylesheet paths', () => {
    const { dir, base, extra, file } = setup();
    try {
      const options = { ...NO_SCHEME, structure: 'v3' };
      assert.deepEqual(validateFiles([base, extra], [file], options).map((r) => r.ok), [true]);
      assert.deepEqual(validateFiles(base, [file], options).map((r) => r.ok), [false]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
