// Unit tests for the Studio Zissou growth log writer, using in-memory markdown only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOG_TEMPLATE,
  parseLog,
  appendWeek,
  appendChange,
  dueReviews,
  closeRow,
  pendingReview,
  isClosed,
} from '../../tools/studio-zissou/growth-log.js';

function acceptanceParse(text) {
  const rows = text
    .split('\n')
    .filter((line) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const changes = rows.filter((cells) => cells.length >= 8 && cells[1].startsWith('/'));
  const weeks = rows.filter((cells) => /^\d{4}-W\d{2}$/.test(cells[1] || ''));
  return { changes, weeks };
}

const WEEK = {
  date: '2026-10-19',
  week: '2026-W43',
  mode: 'live',
  autopilot: 'on',
  sessions: 120,
  leads: 3,
  clicks: 40,
  impressions: 2100,
  changes: 2,
  note: 'LinkedIn post Tue',
};

const CHANGE = {
  date: '2026-10-19',
  page: '/pricing',
  tier: 'auto',
  type: 'meta-title',
  before: 'Website prices and care plans, no surprises | Studio Zissou',
  after: 'Website care plan prices, from €95 a month | Studio Zissou',
  commit: 'abc1234',
  metric: 'ctr',
  threshold: '-20%',
  review: '2026-11-16',
};

describe('LOG_TEMPLATE', () => {
  test('has the title and both tables', () => {
    assert.match(LOG_TEMPLATE, /^# Studio Zissou growth log/);
    assert.match(LOG_TEMPLATE, /## Weeks\n\n\| date \| week \| mode \| autopilot \| sessions \| leads \| clicks \| impressions \| changes \| note \|/);
    assert.match(LOG_TEMPLATE, /## Changes\n\n\| date \| page \| tier \| type \| before \| after \| commit \| metric \| threshold \| review \| status \| id \|/);
  });

  test('parses to empty tables', () => {
    assert.deepEqual(parseLog(LOG_TEMPLATE), { weeks: [], changes: [] });
    assert.deepEqual(acceptanceParse(LOG_TEMPLATE), { weeks: [], changes: [] });
  });
});

describe('appendWeek and appendChange', () => {
  test('round-trip a week and a change', () => {
    const text = appendChange(appendWeek(LOG_TEMPLATE, WEEK), CHANGE);
    const { weeks, changes } = parseLog(text);
    assert.equal(weeks.length, 1);
    assert.deepEqual(weeks[0], Object.fromEntries(Object.entries(WEEK).map(([k, v]) => [k, String(v)])));
    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0], { ...CHANGE, status: 'open', id: '2026-10-19-1' });
  });

  test('insert into the right table and keep the other intact', () => {
    let text = appendChange(LOG_TEMPLATE, CHANGE);
    text = appendWeek(text, WEEK);
    text = appendChange(text, { ...CHANGE, page: '/contact' });
    text = appendWeek(text, { ...WEEK, date: '2026-10-26', week: '2026-W44' });
    const weeksBlock = text.slice(text.indexOf('## Weeks'), text.indexOf('## Changes'));
    const changesBlock = text.slice(text.indexOf('## Changes'));
    assert.equal((weeksBlock.match(/^\| 2026-/gm) || []).length, 2);
    assert.equal((changesBlock.match(/^\| 2026-/gm) || []).length, 2);
    const { weeks, changes } = parseLog(text);
    assert.deepEqual(weeks.map((w) => w.week), ['2026-W43', '2026-W44']);
    assert.deepEqual(changes.map((c) => c.id), ['2026-10-19-1', '2026-10-19-2']);
    assert.deepEqual(changes.map((c) => c.page), ['/pricing', '/contact']);
  });

  test('review-tier change defaults to pending, explicit id and status kept', () => {
    const text = appendChange(LOG_TEMPLATE, { ...CHANGE, tier: 'review', type: 'h1' });
    assert.equal(parseLog(text).changes[0].status, 'pending');
    const custom = appendChange(LOG_TEMPLATE, { ...CHANGE, id: 'x9', status: 'downgraded: live disabled' });
    assert.equal(parseLog(custom).changes[0].id, 'x9');
    assert.equal(parseLog(custom).changes[0].status, 'downgraded: live disabled');
  });

  test('refuse a duplicate id, a bad tier, a page without a slash', () => {
    const text = appendChange(LOG_TEMPLATE, { ...CHANGE, id: 'a' });
    assert.throws(() => appendChange(text, { ...CHANGE, id: 'a' }), /duplicate id/);
    assert.throws(() => appendChange(LOG_TEMPLATE, { ...CHANGE, tier: 'report' }), /tier/);
    assert.throws(() => appendChange(LOG_TEMPLATE, { ...CHANGE, page: 'pricing' }), /page/);
  });

  test('autopilot off renders autopilot.off and blocks change rows that date', () => {
    const text = appendWeek(LOG_TEMPLATE, { ...WEEK, autopilot: false, changes: 0 });
    assert.equal(parseLog(text).weeks[0].autopilot, 'autopilot.off');
    assert.throws(() => appendChange(text, CHANGE), /autopilot\.off/);
    assert.equal(parseLog(appendWeek(LOG_TEMPLATE, { ...WEEK, autopilot: true })).weeks[0].autopilot, 'on');
  });

  test('missing table heading throws', () => {
    assert.throws(() => appendWeek('# Studio Zissou growth log\n', WEEK), /## Weeks/);
  });
});

describe('acceptance-test compatibility', () => {
  test('the acceptance parser sees week and change rows', () => {
    let text = appendWeek(LOG_TEMPLATE, WEEK);
    text = appendChange(text, CHANGE);
    text = appendWeek(text, { ...WEEK, date: '2026-10-26', week: '2026-W44', autopilot: false });
    const { weeks, changes } = acceptanceParse(text);
    assert.equal(weeks.length, 2);
    assert.equal(changes.length, 1);
    assert.equal(changes[0][0], '2026-10-19');
    assert.equal(changes[0][1], '/pricing');
    assert.ok(['auto', 'review'].includes(changes[0][2]));
    const offDates = weeks.filter((w) => w.join(' ').includes('autopilot.off')).map((w) => w[0]);
    assert.deepEqual(offDates, ['2026-10-26']);
    assert.equal(changes.filter((c) => offDates.includes(c[0])).length, 0);
  });
});

describe('escaping', () => {
  test('pipes and newlines in cells survive a round-trip', () => {
    const before = 'A | B \\| C';
    const after = 'Line one\nLine two | Studio Zissou';
    const text = appendChange(LOG_TEMPLATE, { ...CHANGE, before, after });
    const row = text.split('\n').find((l) => l.startsWith('| 2026-10-19'));
    assert.ok(!row.includes('\n'));
    assert.ok(row.includes('A \\| B'));
    const parsed = parseLog(text).changes[0];
    assert.equal(parsed.before, before);
    assert.equal(parsed.after, after);
    assert.equal(parsed.commit, 'abc1234');
    const acc = acceptanceParse(text).changes[0];
    assert.equal(acc[1], '/pricing');
    assert.equal(acc[2], 'auto');
  });
});

describe('dueReviews', () => {
  const text = [
    { ...CHANGE, id: 'early', review: '2026-11-15' },
    { ...CHANGE, id: 'today', review: '2026-11-16' },
    { ...CHANGE, id: 'later', review: '2026-11-17' },
    { ...CHANGE, id: 'kept', review: '2026-11-01', status: 'kept' },
    { ...CHANGE, id: 'pending', tier: 'review', review: '2026-11-01' },
  ].reduce(appendChange, LOG_TEMPLATE);

  test('returns open rows with review date on or before today', () => {
    assert.deepEqual(dueReviews(text, '2026-11-16').map((c) => c.id), ['early', 'today']);
  });

  test('accepts a Date', () => {
    assert.deepEqual(dueReviews(text, new Date('2026-11-17T09:00:00Z')).map((c) => c.id), ['early', 'today', 'later']);
  });

  test('skips closed and pending rows', () => {
    assert.ok(!dueReviews(text, '2027-01-01').some((c) => ['kept', 'pending'].includes(c.id)));
  });
});

describe('closeRow and pendingReview', () => {
  const text = [
    { ...CHANGE, id: 'a' },
    { ...CHANGE, id: 'b', tier: 'review', type: 'h1' },
    { ...CHANGE, id: 'c', tier: 'review', type: 'story-rotation' },
  ].reduce(appendChange, appendWeek(LOG_TEMPLATE, WEEK));

  test('pendingReview lists review-tier pending rows', () => {
    assert.deepEqual(pendingReview(text).map((c) => c.id), ['b', 'c']);
  });

  test('closeRow sets the status of one row only', () => {
    const closed = closeRow(text, 'b', 'approved');
    const { weeks, changes } = parseLog(closed);
    assert.deepEqual(changes.map((c) => c.status), ['open', 'approved', 'pending']);
    assert.deepEqual(weeks, parseLog(text).weeks);
    assert.deepEqual(pendingReview(closed).map((c) => c.id), ['c']);
    assert.deepEqual(changes[1], { ...parseLog(text).changes[1], status: 'approved' });
  });

  test('closeRow accepts a status with a colon and a reverted status', () => {
    const t = closeRow(closeRow(text, 'c', 'downgraded: live disabled'), 'a', 'reverted');
    const s = parseLog(t).changes.map((c) => c.status);
    assert.deepEqual(s, ['reverted', 'pending', 'downgraded: live disabled']);
    assert.ok(isClosed('kept') && isClosed('reverted') && isClosed('approved'));
    assert.ok(!isClosed('open') && !isClosed('pending'));
  });

  test('closeRow throws on an unknown id or empty status', () => {
    assert.throws(() => closeRow(text, 'zzz', 'kept'), /zzz/);
    assert.throws(() => closeRow(text, 'a', ''), /status/);
  });
});
