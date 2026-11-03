// Scans the tool and test folders for secret shapes, real IDs, client names and code-rule breaks, and checks the allowlist.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SCAN_DIRS = ['tools/gbp', 'tests/gbp'];
const TOOL_DIR = join(ROOT, 'tools/gbp');

const FORBIDDEN = [
  ['access token shape', new RegExp(['ya', '29', '\\.'].join(''))],
  ['refresh token shape', new RegExp(['1', '//', '0'].join(''))],
  ['client secret shape', new RegExp(['GOC', 'SPX', '-'].join(''))],
  [
    'OAuth client ID',
    new RegExp(`\\d{6,}-[a-z0-9]+\\.apps\\.${'google'}usercontent\\.com`),
  ],
  ['numeric ID', /\d{10,}/],
  ['client name', new RegExp(['rol', 'fing'].join(''), 'i')],
  ['client name', new RegExp(`\\b${['oo', 'st'].join('')}\\b`, 'i')],
];

const scanText = (text) =>
  FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([n]) => n);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const scannedFiles = () => SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const toolSources = () => walk(TOOL_DIR).filter((path) => path.endsWith('.js'));

describe('scanner', () => {
  const samples = [
    ['ya', '29', '.abc'],
    ['1', '//', '0abc'],
    ['GOC', 'SPX', '-abc'],
    ['123456789', '-abcdef.apps.', 'google', 'usercontent.com'],
    ['1234567', '890'],
    ['Rol', 'fing Example'],
    ['the ', 'Oo', 'st location'],
  ];
  for (const parts of samples) {
    it(`catches a planted sample starting ${parts[1]}`, () => {
      assert.ok(scanText(parts.join('')).length > 0);
    });
  }
  it('leaves synthetic fixtures and ordinary words alone', () => {
    assert.deepEqual(scanText('accounts/111 locations/222 Example Bakery boost'), []);
  });
});

describe('repo scan', () => {
  it('finds files to scan in both folders', () => {
    const files = scannedFiles().map((path) => relative(ROOT, path));
    assert.ok(files.some((file) => file.startsWith('tools/gbp/')));
    assert.ok(files.some((file) => file.startsWith('tests/gbp/')));
  });

  it('finds no secrets, real IDs or client names', () => {
    const hits = scannedFiles().flatMap((path) =>
      scanText(readFileSync(path, 'utf8')).map(
        (name) => `${relative(ROOT, path)}: ${name}`,
      ),
    );
    assert.deepEqual(hits, []);
  });
});

describe('allowlist', () => {
  const settingsFiles = ['.claude/settings.json', '.claude/settings.local.json']
    .map((file) => join(ROOT, file))
    .filter(existsSync);

  const isBlocked = (entry) =>
    /gbp_apply/.test(entry) || /^mcp__gbp(__\*)?$/.test(entry) || /^mcp__\*/.test(entry);

  it('recognises the entries it must block', () => {
    for (const entry of [
      'mcp__gbp',
      'mcp__gbp__*',
      'mcp__gbp__gbp_apply',
      'mcp__*',
      'gbp_apply',
    ]) {
      assert.equal(isBlocked(entry), true, entry);
    }
    assert.equal(isBlocked('mcp__gbp__gbp_list_accounts'), false);
    assert.equal(isBlocked('mcp__webflow'), false);
  });

  it('no repo settings file allowlists the write tool or a server wildcard', () => {
    for (const file of settingsFiles) {
      const allow = JSON.parse(readFileSync(file, 'utf8')).permissions?.allow ?? [];
      assert.deepEqual(allow.filter(isBlocked), [], relative(ROOT, file));
    }
  });
});

describe('code rules', () => {
  it('only changes.js imports the write functions', () => {
    const writeNames = /\b(patchLocation|updateReviewReply|createLocalPost)\b/;
    for (const path of toolSources()) {
      const name = relative(TOOL_DIR, path);
      if (name === 'changes.js' || name === 'client.js') continue;
      assert.ok(
        !writeNames.test(readFileSync(path, 'utf8')),
        `${name} references a write function`,
      );
    }
    assert.ok(writeNames.test(readFileSync(join(TOOL_DIR, 'changes.js'), 'utf8')));
  });

  it('nothing imports the whole client module', () => {
    for (const path of toolSources()) {
      assert.ok(
        !/import\s+\*\s+as/.test(readFileSync(path, 'utf8')),
        relative(ROOT, path),
      );
    }
  });

  it('tool code has no default export and no console.log', () => {
    for (const path of toolSources()) {
      const text = readFileSync(path, 'utf8');
      assert.ok(
        !/export\s+default/.test(text),
        `${relative(ROOT, path)} has a default export`,
      );
      assert.ok(!/console\.log/.test(text), `${relative(ROOT, path)} has console.log`);
    }
  });

  it('tool code has one header comment and no other comments', () => {
    for (const path of toolSources()) {
      const lines = readFileSync(path, 'utf8').split('\n');
      assert.match(
        lines[0],
        /^\/\/ .+\.$/,
        `${relative(ROOT, path)} needs a one-sentence header`,
      );
      const others = lines
        .slice(1)
        .filter((line) => /^\s*(\/\/|\/\*|\*)|\s\/\/\s/.test(line));
      assert.deepEqual(others, [], relative(ROOT, path));
    }
  });

  it('nothing in tool code calls the stdout writer directly', () => {
    for (const path of toolSources()) {
      assert.ok(
        !/process\.stdout/.test(readFileSync(path, 'utf8')),
        relative(ROOT, path),
      );
    }
  });
});
