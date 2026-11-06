// Unit tests for the generic Client First section validator: config-driven colour schemes, the v2 and v3 core structures, and the CLI flags.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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

const CSS_V3 = `
.section_hero { position: relative; padding-top: var(--_layout---section-padding--large); padding-left: var(--_layout---global-padding); }
.scheme-light { --scheme-background: #FFFFFF; }
.container-large { max-width: 80rem; margin-left: auto; margin-right: auto; }
.padding-global { padding-left: 5%; padding-right: 5%; }
.padding-section-large { padding-top: 7rem; padding-bottom: 7rem; }
.spacer-small { padding-top: 1.5rem; }
.margin-top-small { margin-top: 1.5rem; }
.padding-bottom-medium { padding-bottom: 2rem; }
.gap-medium { grid-row-gap: 2rem; grid-column-gap: 2rem; }
.hero_grid { display: grid; }
`;

const v3 = (inner) =>
  `<section class="section_hero scheme-light"><div class="container-large">${inner}</div></section>`;

describe('structure v3', () => {
  test('section_ > container-* with one-class spacing passes', () => {
    const html = v3(
      '<div class="hero_grid gap-medium"><div class="margin-top-small"><p>x</p></div><div class="padding-bottom-medium"></div></div>',
    );
    const result = validateSection(html, CSS_V3, { structure: 'v3' });
    assert.deepEqual(result.errors, []);
  });

  test('the same markup fails under the default v2 structure', () => {
    const html = v3('<div class="margin-top-small"><p>x</p></div>');
    const result = validateSection(html, CSS_V3);
    assert.ok(result.errors.some((e) => /rule 3: expected .*padding-global/.test(e)));
    assert.ok(result.errors.some((e) => /rule 7: class "margin-top-small" has a margin/.test(e)));
  });

  test('a padding-global layer is a rule 3 error under v3', () => {
    const html =
      '<section class="section_hero scheme-light"><div class="padding-global"><div class="container-large"><p>x</p></div></div></section>';
    const result = validateSection(html, CSS_V3, { structure: 'v3' });
    assert.ok(result.errors.some((e) => /rule 3: expected .*container-small\|medium\|large as first child, found <div.padding-global>/.test(e)));
    assert.ok(result.errors.some((e) => /rule 3: "padding-global" .* is a v2 class/.test(e)));
  });

  test('padding-section-* and spacer-* anywhere are v2 classes under v3', () => {
    const html = v3('<div class="padding-section-large"><div class="spacer-small"></div><p>x</p></div>');
    const result = validateSection(html, CSS_V3, { structure: 'v3' });
    assert.ok(result.errors.some((e) => /"padding-section-large" .* is a v2 class/.test(e)));
    assert.ok(result.errors.some((e) => /"spacer-small" .* is a v2 class/.test(e)));
  });

  test('section_ may carry padding under v3 but a content class may not', () => {
    const css = `${CSS_V3} .hero_title { padding-top: 1rem; }`;
    const result = validateSection(v3('<div class="hero_title"><p>x</p></div>'), css, {
      structure: 'v3',
    });
    assert.deepEqual(
      result.errors,
      ['rule 7: class "hero_title" has a padding declaration'],
    );
  });

  test('an unknown structure throws', () => {
    assert.throws(() => validateSection(v3('<p>x</p>'), CSS_V3, { structure: 'v4' }), RangeError);
  });

  test('scheme: false skips rule 2', () => {
    const html = '<section class="section_hero"><div class="container-large"><p>x</p></div></section>';
    assert.deepEqual(validateSection(html, CSS_V3, { structure: 'v3', scheme: false }).errors, []);
    assert.ok(
      validateSection(html, CSS_V3, { structure: 'v3' }).errors.some((e) => /rule 2/.test(e)),
    );
  });
});

describe('CLI structure flags', () => {
  test('--structure v3 and --no-scheme are honoured, and a bad structure exits 2', () => {
    const dir = mkdtempSync(join(tmpdir(), 'validate-section-v3-'));
    try {
      const cssPath = join(dir, 'site.css');
      const file = join(dir, 'hero.html');
      writeFileSync(cssPath, CSS_V3);
      writeFileSync(
        file,
        '<section class="section_hero"><div class="container-large"><p>x</p></div></section>',
      );
      const ok = spawnSync(
        process.execPath,
        [CLI, '--structure', 'v3', '--no-scheme', cssPath, file],
        { encoding: 'utf8' },
      );
      assert.equal(ok.status, 0, ok.stderr);
      const v2 = spawnSync(process.execPath, [CLI, '--no-scheme', cssPath, file], {
        encoding: 'utf8',
      });
      assert.equal(v2.status, 1);
      assert.match(v2.stderr, /rule 3: expected .*padding-global/);
      const bad = spawnSync(process.execPath, [CLI, '--structure', 'v4', cssPath, file], {
        encoding: 'utf8',
      });
      assert.equal(bad.status, 2);
      assert.match(bad.stderr, /unknown --structure "v4"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
