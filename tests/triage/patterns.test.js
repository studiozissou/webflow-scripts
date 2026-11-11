// Guards P6 automation spotting (patterns.js): 3 items sharing a word pair in 30 days make one proposal, 2 make none, old items and stopwords do not count, at most 3 A items, and proposal lines pass ste-lint. Fixtures are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spot, tokens, MAX_PROPOSALS, THRESHOLD } from '../../tools/triage/lib/patterns.js';
import { lint } from '../../tools/triage/lib/ste-lint.js';

const NOW = '2026-11-16T07:00:00Z';
const done = (name, at, extra = {}) => ({ name, status: 'Done', doneAt: at, ...extra });

test('tokens drops stopwords, numbers, short words and punctuation', () => {
  assert.deepEqual(tokens('Send the invoice to Carsa for Oct 2026!'), ['send', 'invoice', 'carsa']);
});

test('3 similar Done tasks in 30 days produce one proposal; 2 produce none', () => {
  const three = [done('Send invoice to Carsa', '2026-11-01'), done('Send invoice to RHP', '2026-11-05'), done('Send invoice Oost', '2026-11-10')];
  const r = spot({ tasks: three }, { now: NOW });
  assert.equal(r.length, 1);
  assert.equal(r[0].n, 'A1');
  assert.equal(r[0].kind, 'automation');
  assert.equal(r[0].count, 3);
  assert.match(r[0].key, /invoice/);
  assert.match(r[0].pageId, /^auto-[a-z0-9-]+$/);
  assert.equal(r[0].slug, r[0].pageId);
  assert.deepEqual(spot({ tasks: three.slice(0, 2) }, { now: NOW }), []);
  assert.equal(THRESHOLD, 3);
});

test('one shared word alone is not a pattern', () => {
  const sessions = ['Client deck review', 'Fix client nav', 'Client invoice chase'].map((title, i) => ({ title, lastActivity: `2026-11-0${i + 2}T10:00:00Z` }));
  assert.deepEqual(spot({ sessions }, { now: NOW }), []);
});

test('open tasks and items older than 30 days do not count', () => {
  const tasks = [done('Send invoice A', '2026-10-01'), done('Send invoice B', '2026-11-05'), { name: 'Send invoice C', status: 'In progress', doneAt: '2026-11-10' }, done('Send invoice D', '2026-11-12')];
  assert.deepEqual(spot({ tasks }, { now: NOW }), []);
});

test('session titles and learnings count, and a tag shared by 3 tasks is a pattern', () => {
  const sessions = [
    { title: 'Audit alt text on Carsa', lastActivity: '2026-11-02T10:00:00Z' },
    { title: 'Audit alt text on RHP', lastActivity: '2026-11-06T10:00:00Z' },
    { title: 'Audit alt text on Oost', lastActivity: '2026-11-09T10:00:00Z' },
  ];
  const fromSessions = spot({ sessions }, { now: NOW });
  assert.equal(fromSessions.length, 1);
  assert.match(fromSessions[0].proposal, /skill/);
  const tasks = [done('Reply to Anna', '2026-11-02', { tags: ['Admin'] }), done('Book dentist', '2026-11-04', { tags: ['Admin'] }), done('Pay rent', '2026-11-08', { tags: ['Admin'] })];
  const fromTags = spot({ tasks }, { now: NOW });
  assert.equal(fromTags.length, 1);
  assert.match(fromTags[0].key, /admin/i);
});

test('at most 3 proposals when asked, largest first, one group per set of items; 1 by default', () => {
  const tasks = [];
  for (const word of ['invoice', 'newsletter', 'backup', 'timesheet']) {
    for (let i = 0; i < 3 + (word === 'backup' ? 2 : 0); i++) tasks.push(done(`Monthly ${word} report ${'abcde'[i]}x`, `2026-11-0${i + 1}`));
  }
  assert.equal(MAX_PROPOSALS, 1);
  assert.deepEqual(spot({ tasks }, { now: NOW }).map((p) => p.key), ['backup report']);
  const r = spot({ tasks }, { now: NOW, max: 3 });
  assert.equal(r.length, 3);
  assert.match(r[0].key, /backup/);
  assert.deepEqual(r.map((p) => p.n), ['A1', 'A2', 'A3']);
});

test('proposal lines pass ste-lint', () => {
  const tasks = [done('Send invoice to Carsa', '2026-11-01'), done('Send invoice to RHP', '2026-11-05'), done('Send invoice Oost', '2026-11-10')];
  const [p] = spot({ tasks }, { now: NOW });
  const { ok, warnings } = lint(p.line);
  assert.ok(ok, JSON.stringify(warnings));
  assert.match(p.line, /^A1\. /);
  assert.doesNotMatch(p.line, /Reply/);
});
