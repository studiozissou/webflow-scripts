// Guards the CLAUDE CAN BUILD ranking: Doer filter, command mapping, claimed exclusion, ordering and the cap of 5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAutomatable, DEFAULT_DOER_MAP } from '../../tools/triage/lib/rank.js';

function task(over) {
  return {
    id: 'x', name: 'Write the code', status: 'To Do', priority: 'P2', due: null, doer: 'Claude',
    tags: [], blockedReason: null, hours: 1, clients: [], url: 'https://www.notion.so/x', ...over,
  };
}

test('only Doer = Claude tasks are offered', () => {
  const tasks = [
    task({ id: 'a', doer: 'Claude', name: 'Generate JSON-LD schema for Oost' }),
    task({ id: 'b', doer: 'User + Claude', name: 'Generate JSON-LD schema for Carsa' }),
    task({ id: 'c', doer: 'User', name: 'Run a site audit' }),
  ];
  assert.deepEqual(rankAutomatable(tasks).map((i) => i.pageId), ['a']);
});

test('tasks map to a command and unmapped tasks are dropped', () => {
  const tasks = [
    task({ id: 'schema', name: 'Add FAQ schema to Rolfing Amsterdam' }),
    task({ id: 'audit', name: 'Run a site audit for Carsa' }),
    task({ id: 'spec', name: 'Write a spec for the booking flow' }),
    task({ id: 'none', name: 'Phone the accountant' }),
  ];
  const out = rankAutomatable(tasks);
  assert.deepEqual(
    out.map((i) => [i.pageId, i.command]),
    [['schema', '/generate-schema'], ['audit', '/site-audit'], ['spec', '/plan']],
  );
});

test('a custom doer map replaces the default', () => {
  const tasks = [task({ id: 'a', name: 'Phone the accountant' })];
  const out = rankAutomatable(tasks, [{ pattern: 'accountant', command: '/call' }]);
  assert.equal(out[0].command, '/call');
  assert.ok(DEFAULT_DOER_MAP.length > 5);
});

test('claimed and closed tasks are excluded', () => {
  const tasks = [
    task({ id: 'a', name: 'Generate schema A' }),
    task({ id: 'b', name: 'Generate schema B' }),
    task({ id: 'c', name: 'Generate schema C', status: 'Done' }),
    task({ id: 'd', name: 'Generate schema D', status: 'Cancelled' }),
  ];
  assert.deepEqual(rankAutomatable(tasks, undefined, ['a']).map((i) => i.pageId), ['b']);
  assert.deepEqual(rankAutomatable(tasks, undefined, new Set(['b'])).map((i) => i.pageId), ['a']);
});

test('ranked by Priority, then Due, then Hours ascending', () => {
  const tasks = [
    task({ id: 'p2-late', name: 'Generate schema 1', priority: 'P2', due: '2026-11-20', hours: 1 }),
    task({ id: 'p1-big', name: 'Generate schema 2', priority: 'P1', due: null, hours: 4 }),
    task({ id: 'p1-small', name: 'Generate schema 3', priority: 'P1', due: null, hours: 1 }),
    task({ id: 'p2-early', name: 'Generate schema 4', priority: 'P2', due: '2026-11-12', hours: 3 }),
    task({ id: 'none', name: 'Generate schema 5', priority: null, due: '2026-11-11', hours: 0.5 }),
    task({ id: 'p0', name: 'Generate schema 6', priority: 'P0', due: null, hours: null }),
  ];
  assert.deepEqual(
    rankAutomatable(tasks, undefined, [], { max: 10 }).map((i) => i.pageId),
    ['p0', 'p1-small', 'p1-big', 'p2-early', 'p2-late', 'none'],
  );
});

test('caps at 5 by default and labels items B1..Bn', () => {
  const tasks = Array.from({ length: 8 }, (_, i) => task({ id: `t${i}`, name: `Generate schema ${i}`, hours: i }));
  const out = rankAutomatable(tasks);
  assert.equal(out.length, 5);
  assert.deepEqual(out.map((i) => i.label), ['B1', 'B2', 'B3', 'B4', 'B5']);
  assert.deepEqual(Object.keys(out[0]).sort(), ['command', 'due', 'hours', 'label', 'name', 'pageId', 'priority', 'url']);
  assert.equal(rankAutomatable(tasks, undefined, [], { max: 2 }).length, 2);
});
