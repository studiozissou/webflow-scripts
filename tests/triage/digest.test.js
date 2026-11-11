// Guards digest numbering (digest.js numberParts): one running number 1..N across the main digest and its thread replies in posting order, labels rewritten in the line and in its reply hint, headers and plain lines untouched, and state items renumbered to match. Fixtures are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numberParts } from '../../tools/triage/lib/digest.js';

const main = {
  name: 'digest',
  text: ['*Daybook Wed 11 Nov*', 'Waiting on you: 3', '*NOW (2)*', '1. Reply to Anna.', '2. Fix nav.', '*BUILD (1)*', 'B1. Add alt text. Reply go B1.', '*GOAL FIT (1)*', 'Q1. "Remove scripts" has no goal. Reply link Q1, keep Q1, or drop Q1.'].join('\n'),
  items: [{ n: '1', kind: 'thread' }, { n: '2', kind: 'task' }, { n: 'B1', kind: 'build', pageId: 'p1' }, { n: 'Q1', kind: 'goal-fit', taskId: 't1' }],
};
const rollup = { name: 'rollup', text: '*Where is everything*\n*Waiting on you (1)*\nS1. carsa specs. Job waits on you.\nCloud sessions: not available in scheduled run', items: [{ n: 'S1', kind: 'session' }] };
const advisors = { name: 'advisors', text: 'V1. 3 of 3 job slots are free.\nV2. Quota use is 86% of the 5-hour limit.', items: [{ n: 'V1', kind: 'advisor' }, { n: 'V2', kind: 'advisor' }] };

test('numberParts numbers every item line 1..N across parts in order', () => {
  const r = numberParts([main, rollup, advisors]);
  assert.equal(r.count, 7);
  const [d, s, v] = r.parts;
  assert.match(d.text, /^1\. Reply to Anna\.$/m);
  assert.match(d.text, /^3\. Add alt text\. Reply go 3\.$/m);
  assert.match(d.text, /^4\. "Remove scripts" has no goal\. Reply link 4, keep 4, or drop 4\.$/m);
  assert.match(s.text, /^5\. carsa specs\. Job waits on you\.$/m);
  assert.deepEqual(v.text.split('\n'), ['6. 3 of 3 job slots are free.', '7. Quota use is 86% of the 5-hour limit.']);
});

test('headers, counts and plain lines are left alone', () => {
  const [d, s] = numberParts([main, rollup]).parts;
  assert.match(d.text, /^\*NOW \(2\)\*$/m);
  assert.match(d.text, /^Waiting on you: 3$/m);
  assert.match(s.text, /^Cloud sessions: not available in scheduled run$/m);
});

test('state items get the new numbers, keep their fields, and old labels are kept as was', () => {
  const r = numberParts([main, rollup, advisors]);
  assert.deepEqual(r.items.map((i) => [i.n, i.kind, i.was]), [
    ['1', 'thread', '1'], ['2', 'task', '2'], ['3', 'build', 'B1'], ['4', 'goal-fit', 'Q1'], ['5', 'session', 'S1'], ['6', 'advisor', 'V1'], ['7', 'advisor', 'V2'],
  ]);
  assert.equal(r.items[2].pageId, 'p1');
});

test('an item with no matching line keeps no number and is reported', () => {
  const r = numberParts([{ name: 'x', text: '1. One.', items: [{ n: '1', kind: 'task' }, { n: 'B9', kind: 'build' }] }]);
  assert.deepEqual(r.items.map((i) => i.n), ['1']);
  assert.deepEqual(r.missing, [{ part: 'x', n: 'B9' }]);
});

test('a bare number in the text of a numbered line is never rewritten', () => {
  const r = numberParts([{ name: 'a', text: 'S1. x.', items: [] }, { name: 'b', text: '3. Goal has 3 open tasks.', items: [] }]);
  assert.equal(r.parts[1].text, '2. Goal has 3 open tasks.');
});

test('a label word inside a sentence is not touched, only whole labels', () => {
  const r = numberParts([{ name: 'x', text: 'A1. Make a skill for A11 and B1x. Reply go A1.', items: [] }]);
  assert.equal(r.parts[0].text, '1. Make a skill for A11 and B1x. Reply go 1.');
});
