// Checks the Team Zissou launch config is readable by launch-guard and llms.txt names the live domain with no leftover template placeholders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeConfig } from '../../tools/webflow/launch-guard.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'projects', 'studio-zissou');

test('launch.config.json targets teamzissou.io, lists en and nl, the 6 fallback paths and no apexDefault', () => {
  const config = normalizeConfig(JSON.parse(readFileSync(join(DIR, 'launch.config.json'), 'utf8')));
  assert.equal(config.domain, 'teamzissou.io');
  assert.deepEqual(config.locales.map((l) => l.code), ['en', 'nl']);
  assert.equal(config.stagingUrl, 'https://teamzissou.webflow.io');
  assert.equal(config.apexDefault, false);
  assert.deepEqual(config.fallbackPaths, ['/', '/privacy', '/terms', '/nl', '/nl/privacy', '/nl/terms']);
  for (const marker of ['[copy]', '[photo', '[badge']) assert.ok(config.placeholders.includes(marker), marker);
});

test('llms.txt is filled in for Team Zissou and links only to teamzissou.io', () => {
  const text = readFileSync(join(DIR, 'llms.txt'), 'utf8');
  assert.match(text, /^# Team Zissou\n/);
  assert.doesNotMatch(text, /TODO|example\.com|lorem|studiozissou\.com/i);
  const links = [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => new URL(m[1]).hostname);
  assert.ok(links.length >= 3);
  for (const host of links) assert.equal(host, 'teamzissou.io');
});

test('llms.txt names both languages and has no cookieless analytics', () => {
  const text = readFileSync(join(DIR, 'llms.txt'), 'utf8');
  assert.match(text, /English/);
  assert.match(text, /Dutch/);
  assert.doesNotMatch(text, /cookieless analytics/i);
});
