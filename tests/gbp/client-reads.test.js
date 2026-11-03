// Tests for the read functions: hosts, masks, pagination, account resolution, retries and error safety.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  GbpApiError,
  PENDING_EDITS_PATH,
  PERFORMANCE_METRICS,
  getLocation,
  getGoogleUpdated,
  getLocationView,
  getPerformance,
  getReview,
  hasPendingEdits,
  listAccounts,
  listAllLocations,
  listPosts,
  listReviews,
  locationName,
  resolveLocation,
} from '../../tools/gbp/client.js';
import { FAKE_ACCESS, json, makeCtx, on, routedFetch } from './helpers.js';

const ACCOUNTS_HOST = 'mybusinessaccountmanagement.googleapis.com';
const INFO_HOST = 'mybusinessbusinessinformation.googleapis.com';
const V4_HOST = 'mybusiness.googleapis.com';
const PERF_HOST = 'businessprofileperformance.googleapis.com';

const twoAccounts = routedFetch([
  on('GET', '/v1/accounts/111/locations', {
    locations: [{ name: 'locations/222', title: 'Example Bakery' }],
  }),
  on('GET', '/v1/accounts/333/locations', {
    locations: [{ name: 'locations/444', title: 'Example Florist' }],
  }),
  on('GET', '/v1/accounts', {
    accounts: [{ name: 'accounts/111' }, { name: 'accounts/333' }],
  }),
]);

describe('listAccounts', () => {
  it('uses the account management host and sends the bearer token', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', { accounts: [{ name: 'accounts/111' }] }),
    ]);
    const accounts = await listAccounts(makeCtx(fetchFn));
    assert.deepEqual(accounts, [{ name: 'accounts/111' }]);
    assert.equal(fetchFn.calls[0].host, ACCOUNTS_HOST);
    assert.equal(fetchFn.calls[0].headers.Authorization, `Bearer ${FAKE_ACCESS}`);
  });

  it('follows nextPageToken', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', (call) =>
        call.params.get('pageToken') === 'p2'
          ? json({ accounts: [{ name: 'accounts/333' }] })
          : json({ accounts: [{ name: 'accounts/111' }], nextPageToken: 'p2' }),
      ),
    ]);
    const accounts = await listAccounts(makeCtx(fetchFn));
    assert.deepEqual(
      accounts.map((a) => a.name),
      ['accounts/111', 'accounts/333'],
    );
    assert.equal(fetchFn.calls.length, 2);
  });

  it('stops a pagination loop that never ends', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', { accounts: [], nextPageToken: 'same' }),
    ]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)), /pagination/i);
  });

  it('returns an empty list when Google omits the key', async () => {
    const fetchFn = routedFetch([on('GET', '/v1/accounts', {})]);
    assert.deepEqual(await listAccounts(makeCtx(fetchFn)), []);
  });
});

describe('listAllLocations', () => {
  it('lists across accounts, with owner and v4 path, using readMask', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts/111/locations', (call) =>
        call.params.get('pageToken') === 'n'
          ? json({ locations: [{ name: 'locations/555', title: 'Example Cafe' }] })
          : json({
              locations: [{ name: 'locations/222', title: 'Example Bakery' }],
              nextPageToken: 'n',
            }),
      ),
      on('GET', '/v1/accounts', { accounts: [{ name: 'accounts/111' }] }),
    ]);
    const locations = await listAllLocations(makeCtx(fetchFn));
    assert.deepEqual(
      locations.map((l) => [l.name, l.account, l.v4Name, l.title]),
      [
        ['locations/222', 'accounts/111', 'accounts/111/locations/222', 'Example Bakery'],
        ['locations/555', 'accounts/111', 'accounts/111/locations/555', 'Example Cafe'],
      ],
    );
    const call = fetchFn.calls.find((c) => c.path.includes('/locations'));
    assert.equal(call.host, INFO_HOST);
    assert.match(call.params.get('readMask'), /title/);
    assert.match(call.params.get('readMask'), /websiteUri/);
  });
});

describe('locationName', () => {
  it('normalises the accepted forms', () => {
    assert.equal(locationName('222'), 'locations/222');
    assert.equal(locationName('locations/222'), 'locations/222');
    assert.equal(locationName('accounts/111/locations/222'), 'locations/222');
  });

  it('rejects anything that could change the request path', () => {
    for (const bad of [
      '../222',
      'locations/222/../../x',
      'locations/abc',
      '',
      undefined,
      222,
    ]) {
      assert.throws(() => locationName(bad), /location/i);
    }
  });
});

describe('resolveLocation', () => {
  it('finds the owning account from the location list', async () => {
    const resolved = await resolveLocation(makeCtx(twoAccounts), 'locations/444');
    assert.equal(resolved.v4Name, 'accounts/333/locations/444');
    assert.equal(resolved.name, 'locations/444');
    assert.equal(resolved.title, 'Example Florist');
  });

  it('throws when no account owns the location', async () => {
    await assert.rejects(
      resolveLocation(makeCtx(twoAccounts), 'locations/999'),
      /not found/i,
    );
  });
});

describe('location reads', () => {
  const pendingLoc = { name: 'locations/222', metadata: { hasPendingEdits: true } };

  it('keeps the pending field path in one constant and reads it', () => {
    assert.equal(PENDING_EDITS_PATH, 'metadata.hasPendingEdits');
    assert.equal(hasPendingEdits(pendingLoc), true);
    assert.equal(hasPendingEdits({}), false);
  });

  it('getLocation sends readMask including every editable field and the pending path', async () => {
    const fetchFn = routedFetch([on('GET', '/v1/locations/222', pendingLoc)]);
    await getLocation(makeCtx(fetchFn), 'locations/222');
    const mask = fetchFn.calls[0].params.get('readMask').split(',');
    assert.equal(fetchFn.calls[0].host, INFO_HOST);
    for (const field of [
      'title',
      'regularHours',
      'specialHours',
      'websiteUri',
      'phoneNumbers',
      'profile',
      'categories',
      PENDING_EDITS_PATH,
    ]) {
      assert.ok(mask.includes(field), `readMask is missing ${field}`);
    }
  });

  it('getGoogleUpdated uses the custom verb and also sends readMask', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/locations/222:getGoogleUpdated', { location: { websiteUri: 'x' } }),
    ]);
    const result = await getGoogleUpdated(makeCtx(fetchFn), 'locations/222');
    assert.deepEqual(result.location, { websiteUri: 'x' });
    assert.ok(fetchFn.calls[0].params.get('readMask'));
  });

  it('getLocationView returns merchant, live and the pending flag', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/locations/222:getGoogleUpdated', {
        location: { websiteUri: 'live' },
        diffMask: 'websiteUri',
      }),
      on('GET', '/v1/locations/222', {
        websiteUri: 'merchant',
        metadata: { hasPendingEdits: true },
      }),
    ]);
    const view = await getLocationView(makeCtx(fetchFn), '222');
    assert.equal(view.merchant.websiteUri, 'merchant');
    assert.equal(view.live.websiteUri, 'live');
    assert.equal(view.hasPendingEdits, true);
    assert.equal(view.diffMask, 'websiteUri');
  });
});

describe('reviews and posts', () => {
  const v4 = 'accounts/111/locations/222';

  it('lists reviews on the v4 host across pages and adds a reply state', async () => {
    const fetchFn = routedFetch([
      on('GET', `/v4/${v4}/reviews`, (call) =>
        call.params.get('pageToken')
          ? json({ reviews: [{ reviewId: 'r2', reviewReply: { comment: 'Thanks' } }] })
          : json({ reviews: [{ reviewId: 'r1' }], nextPageToken: 'x' }),
      ),
    ]);
    const reviews = await listReviews(makeCtx(fetchFn), v4);
    assert.equal(fetchFn.calls[0].host, V4_HOST);
    assert.deepEqual(
      reviews.map((r) => [r.reviewId, r.replyState]),
      [
        ['r1', 'none'],
        ['r2', 'replied'],
      ],
    );
  });

  it('gets one review, encoding the ID', async () => {
    const fetchFn = routedFetch([on('GET', '/reviews/', { reviewId: 'a/b' })]);
    await getReview(makeCtx(fetchFn), v4, 'a/b');
    assert.ok(fetchFn.calls[0].url.endsWith('/reviews/a%2Fb'));
  });

  it('lists posts across pages', async () => {
    const fetchFn = routedFetch([
      on('GET', `/v4/${v4}/localPosts`, (call) =>
        call.params.get('pageToken')
          ? json({ localPosts: [{ name: 'p2' }] })
          : json({ localPosts: [{ name: 'p1' }], nextPageToken: 'x' }),
      ),
    ]);
    const posts = await listPosts(makeCtx(fetchFn), v4);
    assert.deepEqual(
      posts.map((p) => p.name),
      ['p1', 'p2'],
    );
  });

  it('refuses a v4 path that is not an account location', async () => {
    const fetchFn = routedFetch([]);
    await assert.rejects(listReviews(makeCtx(fetchFn), 'locations/222'), /accounts/);
    await assert.rejects(
      listPosts(makeCtx(fetchFn), 'accounts/111/locations/../x'),
      /accounts/,
    );
    assert.equal(fetchFn.calls.length, 0);
  });
});

describe('getPerformance', () => {
  it('requests all seven metrics and the date range', async () => {
    const fetchFn = routedFetch([
      on('GET', ':fetchMultiDailyMetricsTimeSeries', {
        multiDailyMetricTimeSeries: [{ x: 1 }],
      }),
    ]);
    const result = await getPerformance(makeCtx(fetchFn), 'locations/222', {
      startDate: '2026-01-02',
      endDate: '2026-02-03',
    });
    const { host, path, params } = fetchFn.calls[0];
    assert.equal(host, PERF_HOST);
    assert.equal(path, '/v1/locations/222:fetchMultiDailyMetricsTimeSeries');
    assert.deepEqual(
      params.getAll('dailyMetrics').sort(),
      [...PERFORMANCE_METRICS].sort(),
    );
    assert.deepEqual([...PERFORMANCE_METRICS].sort(), [
      'BUSINESS_DIRECTION_REQUESTS',
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
    ]);
    assert.equal(params.get('dailyRange.startDate.year'), '2026');
    assert.equal(params.get('dailyRange.startDate.month'), '1');
    assert.equal(params.get('dailyRange.startDate.day'), '2');
    assert.equal(params.get('dailyRange.endDate.month'), '2');
    assert.equal(params.get('dailyRange.endDate.day'), '3');
    assert.deepEqual(result, [{ x: 1 }]);
  });

  it('rejects a malformed date without calling Google', async () => {
    const fetchFn = routedFetch([]);
    await assert.rejects(
      getPerformance(makeCtx(fetchFn), 'locations/222', {
        startDate: 'soon',
        endDate: '2026-02-03',
      }),
      /date/i,
    );
    assert.equal(fetchFn.calls.length, 0);
  });
});

describe('read retries', () => {
  for (const status of [429, 500, 503]) {
    it(`retries once on ${status}, then succeeds`, async () => {
      let sleeps = 0;
      const fetchFn = routedFetch([
        on('GET', '/v1/accounts', (_, calls) =>
          calls.length === 1
            ? json({}, status)
            : json({ accounts: [{ name: 'accounts/111' }] }),
        ),
      ]);
      const ctx = { ...makeCtx(fetchFn), sleep: async () => void (sleeps += 1) };
      assert.equal((await listAccounts(ctx)).length, 1);
      assert.equal(fetchFn.calls.length, 2);
      assert.equal(sleeps, 1);
    });
  }

  it('gives up after the single retry', async () => {
    const fetchFn = routedFetch([on('GET', '/v1/accounts', () => json({}, 503))]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)), (err) => err.status === 503);
    assert.equal(fetchFn.calls.length, 2);
  });

  it('does not retry a 400', async () => {
    const fetchFn = routedFetch([on('GET', '/v1/accounts', () => json({}, 400))]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)));
    assert.equal(fetchFn.calls.length, 1);
  });
});

describe('read errors', () => {
  it('adds the Workspace hint to a 403', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', () =>
        json({ error: { status: 'PERMISSION_DENIED', message: 'Denied.' } }, 403),
      ),
    ]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)), (err) => {
      assert.ok(err instanceof GbpApiError);
      assert.equal(err.status, 403);
      assert.match(err.message, /Denied\./);
      assert.match(err.message, /Workspace/);
      assert.match(err.message, /Business Profile/);
      return true;
    });
  });

  it('never includes the token or Authorization header', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', () =>
        json({ error: { message: `Bad Authorization: Bearer ${FAKE_ACCESS}` } }, 401),
      ),
    ]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)), (err) => {
      const text = `${err.message} ${err.stack} ${JSON.stringify(err)}`;
      assert.ok(!text.includes(FAKE_ACCESS));
      return true;
    });
  });

  it('redacts an opaque token value by its actual value, including details', async () => {
    const ctx = {
      ...makeCtx(
        routedFetch([
          on('GET', '/v1/accounts', () =>
            json(
              {
                error: { message: 'saw opaque-value', details: [{ v: 'opaque-value' }] },
              },
              400,
            ),
          ),
        ]),
      ),
      getToken: async () => 'opaque-value',
    };
    await assert.rejects(listAccounts(ctx), (err) => {
      assert.ok(!err.message.includes('opaque-value'));
      assert.ok(!JSON.stringify(err.details).includes('opaque-value'));
      return true;
    });
  });

  it('does not put a non-JSON error body in the message', async () => {
    const fetchFn = routedFetch([
      on(
        'GET',
        '/v1/accounts',
        () => new Response('<html>raw gateway page</html>', { status: 400 }),
      ),
    ]);
    await assert.rejects(
      listAccounts(makeCtx(fetchFn)),
      (err) => !err.message.includes('raw gateway page'),
    );
  });

  it('redacts a thrown network error', async () => {
    const ctx = makeCtx(async () => {
      throw new Error(`socket hang up Bearer ${FAKE_ACCESS}`);
    });
    await assert.rejects(listAccounts(ctx), (err) => {
      assert.ok(err instanceof GbpApiError);
      assert.ok(!err.message.includes(FAKE_ACCESS));
      assert.match(err.message, /socket hang up/);
      assert.equal(err.outcome, 'unknown');
      return true;
    });
  });

  it('treats a token failure as not sent', async () => {
    const fetchFn = routedFetch([]);
    const ctx = {
      ...makeCtx(fetchFn),
      getToken: async () => {
        throw new Error('Google token refresh failed: HTTP 400 invalid_grant');
      },
    };
    await assert.rejects(listAccounts(ctx), (err) => {
      assert.equal(err.outcome, 'not_sent');
      assert.match(err.message, /invalid_grant/);
      return true;
    });
    assert.equal(fetchFn.calls.length, 0);
  });

  it('fails on an unparseable 200 rather than returning an empty list', async () => {
    const fetchFn = routedFetch([
      on('GET', '/v1/accounts', () => new Response('<html>')),
    ]);
    await assert.rejects(listAccounts(makeCtx(fetchFn)), /unreadable|parse/i);
  });

  it('passes an abort signal so a hung request times out', async () => {
    let signal;
    const ctx = makeCtx(async (_, init) => {
      signal = init.signal;
      return json({});
    });
    await listAccounts(ctx);
    assert.ok(signal instanceof AbortSignal);
  });
});
