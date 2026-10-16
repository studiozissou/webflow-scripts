// Unit tests for the generic Client First section validator's config-driven colour schemes.
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
