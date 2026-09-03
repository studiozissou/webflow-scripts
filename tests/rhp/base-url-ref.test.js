// Guards the regex in init.js getBaseUrl() so sibling modules resolve from a tag as well as a commit hash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, '../../projects/ready-hit-play-prod/init.js'), 'utf8');

const literal = src.match(/var match = scriptSrc\.match\((\/.+?\/[a-z]*)\);/);
assert.ok(literal, 'could not find the ref-matching regex in init.js');
const refRegex = new Function(`return ${literal[1]};`)();

const base = 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts';
const cases = [
  [`${base}@6d7de7b/projects/ready-hit-play-prod/init.js?v=2026.8.18.3`, '6d7de7b'],
  [`${base}@rhp-live-v1/projects/ready-hit-play-prod/init.js?v=2026.8.18.3`, 'rhp-live-v1'],
  [`${base}@rhp-live-v2/projects/ready-hit-play-prod/init.js`, 'rhp-live-v2'],
  [`${base}@main/projects/ready-hit-play-prod/init.js`, 'main'],
];

for (const [url, expected] of cases) {
  test(`resolves ref "${expected}" from init script src`, () => {
    const m = url.match(refRegex);
    assert.ok(m, `no match for ${url}`);
    assert.equal(m[1], expected);
  });
}

test('does not treat a query-string @ as a ref', () => {
  const m = 'https://localhost:8080/projects/ready-hit-play-prod/init.js?x=@notaref'.match(refRegex);
  assert.equal(m, null);
});
