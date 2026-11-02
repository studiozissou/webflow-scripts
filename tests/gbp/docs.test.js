// Tests that the README covers the design decisions and tools, and that package.json holds the pinned SDK and test script.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { TOOLS } from '../../tools/gbp/mcp-server.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('README', () => {
  const readme = read('tools/gbp/README.md');

  it('lists every tool', () => {
    for (const { name } of TOOLS) assert.ok(readme.includes(`\`${name}\``), name);
  });

  it('explains the decisions', () => {
    for (const phrase of [
      /keychain/i,
      /confirmText/,
      /one write tool/i,
      /never retried/i,
    ]) {
      assert.match(readme, phrase);
    }
  });

  it('gives the setup steps and the unconfirmed items', () => {
    for (const phrase of [
      /auth-setup\.js/,
      /~\/bin\/mcp-gbp/,
      /GBP_REFRESH_TOKEN/,
      /user scope/i,
      /hasPendingEdits/,
      /unconfirmed/i,
    ]) {
      assert.match(readme, phrase);
    }
  });
});

describe('package.json', () => {
  const pkg = JSON.parse(read('package.json'));

  it('has the test script', () => {
    assert.equal(pkg.scripts['test:gbp'], "node --test 'tests/gbp/*.test.js'");
  });

  it('pins the SDK to an exact version, with no direct zod dependency', () => {
    assert.match(pkg.dependencies['@modelcontextprotocol/sdk'], /^\d+\.\d+\.\d+$/);
    assert.equal(pkg.dependencies.zod, undefined);
  });
});
