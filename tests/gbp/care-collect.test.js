// Tests for the read-only care collector: review text, stats, post status, hours diff, insights and the full collect pass.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collect,
  collectInsights,
  hoursProposal,
  monthlyInsights,
  needsInsights,
  originalText,
  postStatus,
  reviewStats,
  unansweredReviews,
  validateHours,
} from '../../tools/gbp/care/collect.js';
import { validateCareConfig } from '../../tools/gbp/care/config.js';
import { json, makeCtx, on, routedFetch } from './helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REVIEWS = JSON.parse(
  readFileSync(join(HERE, 'fixtures/care/reviews-translated.json'), 'utf8'),
);
const DAY = 86_400_000;

describe('originalText', () => {
  it('returns the original part of a Google translation', () => {
    assert.equal(
      originalText(REVIEWS[0].comment),
      'Heerlijk brood en een vriendelijk welkom.',
    );
  });
  it('returns the original when the translation comes second', () => {
    assert.equal(
      originalText('Heerlijk brood.\n\n(Translated by Google)\nLovely bread.'),
      'Heerlijk brood.',
    );
  });
  it('trims a plain comment', () => {
    assert.equal(originalText('  Good coffee.  \n'), 'Good coffee.');
  });
  it('returns an empty string for no comment', () => {
    assert.equal(originalText(undefined), '');
    assert.equal(originalText(''), '');
  });
});

describe('unansweredReviews', () => {
  it('keeps unanswered reviews oldest first, without reviewer names', () => {
    const reviews = [
      ...REVIEWS,
      {
        ...REVIEWS[1],
        reviewId: 'rev-5',
        reviewer: { displayName: 'Sample Reviewer' },
        createTime: '2026-11-01T00:00:00Z',
      },
    ];
    const result = unansweredReviews(reviews);
    assert.deepEqual(
      result.map((review) => review.reviewId),
      ['rev-5', 'rev-2', 'rev-1', 'rev-3'],
    );
    assert.ok(!JSON.stringify(result).includes('Sample Reviewer'));
    assert.deepEqual(result[2], {
      reviewId: 'rev-1',
      starRating: 'FIVE',
      text: 'Heerlijk brood en een vriendelijk welkom.',
      starOnly: false,
      createTime: '2026-11-10T09:00:00Z',
    });
    assert.equal(result[3].starOnly, true);
    assert.equal(result[3].text, '');
  });
});

describe('reviewStats', () => {
  it('counts every review and averages the rated ones', () => {
    assert.deepEqual(reviewStats(REVIEWS), { totalReviewCount: 4, averageRating: 4.25 });
  });
  it('skips unspecified ratings and rounds to two places', () => {
    assert.deepEqual(
      reviewStats([
        { starRating: 'FIVE' },
        { starRating: 'FOUR' },
        { starRating: 'FOUR' },
        { starRating: 'STAR_RATING_UNSPECIFIED' },
      ]),
      { totalReviewCount: 4, averageRating: 4.33 },
    );
  });
  it('gives a null average with no ratings', () => {
    assert.deepEqual(reviewStats([]), { totalReviewCount: 0, averageRating: null });
  });
});

describe('postStatus', () => {
  const now = Date.parse('2026-11-17T08:00:00Z');
  const post = (n, daysAgo, state = 'LIVE') => ({
    name: `accounts/111/locations/222/localPosts/p${n}`,
    state,
    summary: `Summary ${n}`,
    createTime: new Date(now - daysAgo * DAY).toISOString(),
  });

  it('reports the latest post, days since it and the last 8 summaries', () => {
    const posts = Array.from({ length: 10 }, (_, i) => post(i, 30 - i * 3));
    const status = postStatus(posts, now);
    assert.equal(status.latest.name, posts[9].name);
    assert.equal(status.latest.summary, 'Summary 9');
    assert.equal(status.daysSinceLast, 3);
    assert.deepEqual(status.recentSummaries, [
      'Summary 9',
      'Summary 8',
      'Summary 7',
      'Summary 6',
      'Summary 5',
      'Summary 4',
      'Summary 3',
      'Summary 2',
    ]);
    assert.equal(status.rejected, false);
  });

  it('flags a rejected latest post', () => {
    assert.equal(postStatus([post(1, 10), post(2, 2, 'REJECTED')], now).rejected, true);
  });

  it('accepts a clock function or a Date', () => {
    assert.equal(postStatus([post(1, 7)], () => now).daysSinceLast, 7);
    assert.equal(postStatus([post(1, 7)], new Date(now)).daysSinceLast, 7);
  });

  it('handles no posts', () => {
    assert.deepEqual(postStatus([], now), {
      latest: null,
      daysSinceLast: null,
      recentSummaries: [],
      rejected: false,
    });
  });
});

const REGULAR = [
  { day: 'MONDAY', open: '09:00', close: '17:00' },
  { day: 'TUESDAY', open: '09:00', close: '17:00' },
];
const googleRegular = {
  periods: [
    {
      openDay: 'TUESDAY',
      openTime: { hours: 9, minutes: 0 },
      closeDay: 'TUESDAY',
      closeTime: { hours: 17 },
    },
    {
      openDay: 'MONDAY',
      openTime: { hours: 9 },
      closeDay: 'MONDAY',
      closeTime: { hours: 17 },
    },
  ],
};
const day = (date) => {
  const [year, month, d] = date.split('-').map(Number);
  return { year, month, day: d };
};
const closedPeriod = (date) => ({
  startDate: day(date),
  endDate: day(date),
  closed: true,
});
const openPeriod = (date, open, close) => ({
  startDate: day(date),
  endDate: day(date),
  openTime: { hours: open },
  closeTime: { hours: close },
});

describe('hoursProposal', () => {
  const today = '2026-11-17';

  it('returns null when nothing differs, ignoring order, zeros and end dates', () => {
    const merchant = {
      regularHours: googleRegular,
      specialHours: {
        specialHourPeriods: [closedPeriod('2026-12-25'), closedPeriod('2026-01-01')],
      },
    };
    const hours = {
      regular: REGULAR,
      special: [{ date: '2026-12-25', closed: true, confirm: true }],
    };
    assert.equal(hoursProposal(hours, merchant, today), null);
  });

  it('proposes regular hours when they differ', () => {
    const merchant = { regularHours: googleRegular };
    const hours = {
      regular: [REGULAR[0], { day: 'TUESDAY', open: '10:00', close: '17:00' }],
      special: [],
    };
    const proposal = hoursProposal(hours, merchant, today);
    assert.deepEqual(Object.keys(proposal.edits), ['regularHours']);
    assert.deepEqual(proposal.edits.regularHours.periods[1].openTime, { hours: 10 });
    assert.deepEqual(proposal.before, {
      regularHours: googleRegular,
      specialHours: null,
    });
    assert.ok(
      proposal.changes.some((line) => /TUESDAY/.test(line) && /10:00/.test(line)),
    );
    assert.deepEqual(proposal.ownerChecks, []);
  });

  it('proposes the full merged future special list and drops past periods', () => {
    const merchant = {
      regularHours: googleRegular,
      specialHours: {
        specialHourPeriods: [
          closedPeriod('2026-01-01'),
          openPeriod('2026-12-24', 9, 12),
          openPeriod('2026-12-31', 12, 17),
          closedPeriod('2027-04-27'),
        ],
      },
    };
    const hours = {
      regular: [],
      special: [
        { date: '2026-11-01', closed: true, confirm: true },
        { date: '2026-12-24', open: '09:00', close: '15:00', confirm: true },
        { date: '2026-12-31', closed: true, confirm: false },
      ],
    };
    const proposal = hoursProposal(hours, merchant, today);
    assert.deepEqual(Object.keys(proposal.edits), ['specialHours']);
    assert.deepEqual(proposal.edits.specialHours, {
      specialHourPeriods: [
        {
          startDate: day('2026-12-24'),
          openTime: { hours: 9 },
          closeTime: { hours: 15 },
        },
        {
          startDate: day('2026-12-31'),
          openTime: { hours: 12 },
          closeTime: { hours: 17 },
        },
      ],
    });
    assert.deepEqual(proposal.before.specialHours, merchant.specialHours);
    assert.deepEqual(proposal.before.regularHours, googleRegular);
    assert.ok(proposal.changes.some((line) => /2026-12-24/.test(line)));
    assert.ok(proposal.changes.some((line) => /2027-04-27/.test(line)));
    assert.ok(!proposal.changes.some((line) => /2026-12-31/.test(line)));
    assert.equal(proposal.ownerChecks.length, 1);
    assert.match(proposal.ownerChecks[0], /2026-12-31/);
  });

  it('returns owner checks with no edits when only unconfirmed items exist', () => {
    const merchant = { regularHours: googleRegular };
    const hours = {
      regular: REGULAR,
      special: [{ date: '2026-12-31', closed: true, confirm: false }],
    };
    const proposal = hoursProposal(hours, merchant, today);
    assert.equal(proposal.edits, null);
    assert.deepEqual(proposal.changes, []);
    assert.equal(proposal.ownerChecks.length, 1);
    assert.deepEqual(proposal.before, {
      regularHours: googleRegular,
      specialHours: null,
    });
  });

  it('adds special hours to a location that has none', () => {
    const merchant = { regularHours: googleRegular };
    const hours = {
      regular: [],
      special: [{ date: '2026-12-25', closed: true, confirm: true }],
    };
    const proposal = hoursProposal(hours, merchant, today);
    assert.deepEqual(proposal.edits.specialHours.specialHourPeriods, [
      { startDate: day('2026-12-25'), closed: true },
    ]);
  });

  it('returns null when the config manages no hours', () => {
    const merchant = {
      regularHours: googleRegular,
      specialHours: { specialHourPeriods: [closedPeriod('2026-12-25')] },
    };
    assert.equal(hoursProposal({ regular: [], special: [] }, merchant, today), null);
    assert.equal(hoursProposal(undefined, merchant, today), null);
  });

  it('accepts normalised config hours from validateCareConfig', () => {
    const config = validateCareConfig({
      location: 'locations/222',
      languages: ['en'],
      sector: 'bakery',
      hours: { regular: REGULAR, special: [{ date: '2026-12-25', closed: true }] },
    });
    const merchant = {
      regularHours: googleRegular,
      specialHours: { specialHourPeriods: [closedPeriod('2026-12-25')] },
    };
    assert.equal(hoursProposal(config.hours, merchant, today), null);
  });
});

const errorBody = (status, message) => ({
  error: { code: status, status: 'INVALID_ARGUMENT', message },
});

describe('validateHours', () => {
  const merchant = { name: 'locations/222', regularHours: googleRegular };
  const proposal = {
    edits: {
      specialHours: {
        specialHourPeriods: [{ startDate: day('2026-12-25'), closed: true }],
      },
    },
  };

  it('validates with validateOnly and returns the body and mask', async () => {
    const fetchFn = routedFetch([on('PATCH', '/v1/locations/222', {})]);
    const result = await validateHours(
      makeCtx(fetchFn),
      'locations/222',
      proposal,
      merchant,
    );
    assert.equal(result.valid, true);
    assert.equal(result.updateMask, 'specialHours,regularHours');
    assert.deepEqual(result.fields, ['specialHours', 'regularHours']);
    assert.deepEqual(result.body.regularHours, googleRegular);
    assert.equal(fetchFn.calls[0].params.get('validateOnly'), 'true');
  });

  it('returns the Google error instead of throwing', async () => {
    const fetchFn = routedFetch([
      on('PATCH', '/v1/locations/222', () => json(errorBody(400, 'bad hours'), 400)),
    ]);
    const result = await validateHours(
      makeCtx(fetchFn),
      'locations/222',
      proposal,
      merchant,
    );
    assert.equal(result.valid, false);
    assert.match(result.error, /bad hours/);
  });

  it('returns an error when the edit cannot be built', async () => {
    const fetchFn = routedFetch([]);
    const result = await validateHours(makeCtx(fetchFn), 'locations/222', proposal, {
      name: 'locations/222',
    });
    assert.equal(result.valid, false);
    assert.match(result.error, /regular hours/);
    assert.equal(fetchFn.calls.length, 0);
  });

  it('returns an error when there are no edits', async () => {
    const result = await validateHours(
      makeCtx(routedFetch([])),
      'locations/222',
      { edits: null },
      merchant,
    );
    assert.equal(result.valid, false);
  });
});

const series = (values) => [
  {
    dailyMetricTimeSeries: Object.entries(values).map(([dailyMetric, list]) => ({
      dailyMetric,
      timeSeries: {
        datedValues: list.map((value, i) => ({
          date: { year: 2026, month: 10, day: i + 1 },
          ...(value === null ? {} : { value: String(value) }),
        })),
      },
    })),
  },
];

describe('monthlyInsights', () => {
  it('sums each metric, adds the four impression metrics and compares months', () => {
    const thisMonth = series({
      CALL_CLICKS: [1, 2, null],
      WEBSITE_CLICKS: [5],
      BUSINESS_DIRECTION_REQUESTS: [3, 1],
      BUSINESS_IMPRESSIONS_DESKTOP_MAPS: [10],
      BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: [20],
      BUSINESS_IMPRESSIONS_MOBILE_MAPS: [30],
      BUSINESS_IMPRESSIONS_MOBILE_SEARCH: [40],
    });
    const prevMonth = series({
      CALL_CLICKS: [2],
      WEBSITE_CLICKS: [7],
      BUSINESS_IMPRESSIONS_MOBILE_MAPS: [50],
    });
    assert.deepEqual(monthlyInsights(thisMonth, prevMonth), {
      calls: 3,
      websiteClicks: 5,
      directionRequests: 4,
      impressions: 100,
      previous: { calls: 2, websiteClicks: 7, directionRequests: 0, impressions: 50 },
      change: { calls: 1, websiteClicks: -2, directionRequests: 4, impressions: 50 },
    });
  });

  it('treats empty input as zero', () => {
    const zero = { calls: 0, websiteClicks: 0, directionRequests: 0, impressions: 0 };
    assert.deepEqual(monthlyInsights([], undefined), {
      ...zero,
      previous: zero,
      change: zero,
    });
  });
});

describe('collectInsights', () => {
  it('reads last month and the month before', async () => {
    const fetchFn = routedFetch([
      on('GET', ':fetchMultiDailyMetricsTimeSeries', (call) =>
        json({
          multiDailyMetricTimeSeries: series({
            CALL_CLICKS: [call.params.get('dailyRange.startDate.month') === '10' ? 4 : 1],
          }),
        }),
      ),
    ]);
    const result = await collectInsights(makeCtx(fetchFn), 'locations/222', '2026-10');
    const ranges = fetchFn.calls.map((call) =>
      ['startDate', 'endDate'].map((key) =>
        ['year', 'month', 'day']
          .map((part) => call.params.get(`dailyRange.${key}.${part}`))
          .join('-'),
      ),
    );
    assert.deepEqual(ranges, [
      ['2026-10-1', '2026-10-31'],
      ['2026-9-1', '2026-9-30'],
    ]);
    assert.equal(result.month, '2026-10');
    assert.equal(result.calls, 4);
    assert.equal(result.change.calls, 3);
  });

  it('handles January and leap-year February', async () => {
    const fetchFn = routedFetch([
      on('GET', ':fetchMultiDailyMetricsTimeSeries', { multiDailyMetricTimeSeries: [] }),
    ]);
    await collectInsights(makeCtx(fetchFn), 'locations/222', '2028-03');
    assert.equal(fetchFn.calls[1].params.get('dailyRange.endDate.day'), '29');
    await collectInsights(makeCtx(fetchFn), 'locations/222', '2027-01');
    assert.equal(fetchFn.calls[3].params.get('dailyRange.startDate.year'), '2026');
    assert.equal(fetchFn.calls[3].params.get('dailyRange.startDate.month'), '12');
  });

  it('returns unavailable when the Performance API refuses', async () => {
    const fetchFn = routedFetch([
      on('GET', ':fetchMultiDailyMetricsTimeSeries', () =>
        json(
          {
            error: { code: 403, status: 'PERMISSION_DENIED', message: 'API not enabled' },
          },
          403,
        ),
      ),
    ]);
    const result = await collectInsights(makeCtx(fetchFn), 'locations/222', '2026-10');
    assert.match(result.unavailable, /PERMISSION_DENIED/);
  });
});

describe('needsInsights', () => {
  it('waits until the 5th', () => {
    assert.equal(needsInsights('2026-11-04', []), false);
    assert.equal(needsInsights('2026-11-05', []), true);
  });
  it('skips a month already reported', () => {
    assert.equal(needsInsights('2026-11-20', ['2026-10']), false);
    assert.equal(needsInsights('2026-11-20', ['2026-09']), true);
  });
  it('wraps to December in January', () => {
    assert.equal(needsInsights('2027-01-06', ['2026-11']), true);
    assert.equal(needsInsights('2027-01-06', ['2026-12']), false);
  });
});

describe('collect', () => {
  const merchant = {
    name: 'locations/222',
    title: 'Example Bakery',
    regularHours: googleRegular,
  };
  const posts = [
    {
      name: 'accounts/111/locations/222/localPosts/p1',
      state: 'LIVE',
      summary: 'Fresh loaves',
      createTime: '2026-11-03T08:00:00Z',
    },
  ];
  const routes = () => [
    on('GET', '/v1/accounts/111/locations', {
      locations: [{ name: 'locations/222', title: 'Example Bakery' }],
    }),
    on('GET', '/v1/accounts', { accounts: [{ name: 'accounts/111' }] }),
    on('GET', '/reviews', { reviews: REVIEWS }),
    on('GET', '/localPosts', { localPosts: posts }),
    on('GET', ':fetchMultiDailyMetricsTimeSeries', { multiDailyMetricTimeSeries: [] }),
    on('GET', '/v1/locations/222', merchant),
  ];
  const config = validateCareConfig({
    location: 'locations/222',
    languages: ['nl', 'en'],
    sector: 'bakery',
    hours: { regular: REGULAR, special: [{ date: '2026-12-25', closed: true }] },
  });
  const now = Date.parse('2026-11-17T08:00:00Z');

  it('reads everything and makes no write calls', async () => {
    const fetchFn = routedFetch(routes());
    const result = await collect({
      ctx: makeCtx(fetchFn),
      config,
      now,
      wantInsights: true,
    });
    assert.deepEqual(
      fetchFn.calls.filter((call) => call.method !== 'GET'),
      [],
    );
    assert.deepEqual(result.location, {
      name: 'locations/222',
      title: 'Example Bakery',
      v4Name: 'accounts/111/locations/222',
    });
    assert.deepEqual(result.merchant, merchant);
    assert.equal(result.reviews.unanswered.length, 3);
    assert.equal(result.reviews.totalReviewCount, 4);
    assert.equal(result.reviews.averageRating, 4.25);
    assert.equal(result.posts.daysSinceLast, 14);
    assert.deepEqual(Object.keys(result.hours.edits), ['specialHours']);
    assert.equal(result.insights.month, '2026-10');
  });

  it('skips insights unless asked', async () => {
    const fetchFn = routedFetch(routes());
    const result = await collect({
      ctx: makeCtx(fetchFn),
      config,
      now,
      wantInsights: false,
    });
    assert.equal(result.insights, null);
    assert.ok(
      !fetchFn.calls.some((call) =>
        call.path.includes(':fetchMultiDailyMetricsTimeSeries'),
      ),
    );
  });
});
