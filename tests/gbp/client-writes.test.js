// Tests for the write functions and payload builder: masks, phone merge, special-hours rule and no retries.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildLocationEdit,
  createLocalPost,
  patchLocation,
  updateReviewReply,
  validateLocationEdit,
} from '../../tools/gbp/client.js';
import { FAKE_ACCESS, json, makeCtx, on, routedFetch } from './helpers.js';

const V4 = 'accounts/111/locations/222';
const REGULAR = {
  periods: [
    {
      openDay: 'MONDAY',
      openTime: { hours: 9 },
      closeDay: 'MONDAY',
      closeTime: { hours: 17 },
    },
  ],
};
const SPECIAL = {
  specialHourPeriods: [{ startDate: { year: 2026, month: 12, day: 25 }, closed: true }],
};
const CURRENT = {
  name: 'locations/222',
  title: 'Example Bakery',
  regularHours: REGULAR,
  phoneNumbers: {
    primaryPhone: '+31 20 000 0000',
    additionalPhones: ['+31 20 000 0001'],
  },
  categories: {
    primaryCategory: { name: 'categories/gcid:bakery' },
    additionalCategories: [{ name: 'categories/gcid:cafe' }],
  },
  websiteUri: 'https://example.com/',
  profile: { description: 'Old text' },
};

describe('buildLocationEdit', () => {
  it('maps websiteUri to its mask', () => {
    const edit = buildLocationEdit({ websiteUri: 'https://example.com/en' }, CURRENT);
    assert.deepEqual(edit.body, { websiteUri: 'https://example.com/en' });
    assert.equal(edit.updateMask, 'websiteUri');
    assert.deepEqual(edit.fields, ['websiteUri']);
  });

  it('rejects a non-web website address', () => {
    assert.throws(
      () => buildLocationEdit({ websiteUri: 'javascript:alert(1)' }, CURRENT),
      /http/,
    );
    assert.throws(() => buildLocationEdit({ websiteUri: 'not a url' }, CURRENT), /http/);
  });

  it('nests description under profile with the dotted mask', () => {
    const edit = buildLocationEdit({ description: 'New text' }, CURRENT);
    assert.deepEqual(edit.body, { profile: { description: 'New text' } });
    assert.equal(edit.updateMask, 'profile.description');
  });

  it('merges a primary phone change with the current additional phones', () => {
    const edit = buildLocationEdit(
      { phoneNumbers: { primaryPhone: '+31 20 000 0002' } },
      CURRENT,
    );
    assert.deepEqual(edit.body.phoneNumbers, {
      primaryPhone: '+31 20 000 0002',
      additionalPhones: ['+31 20 000 0001'],
    });
    assert.equal(edit.updateMask, 'phoneNumbers');
  });

  it('merges an additional phone change with the current primary phone', () => {
    const edit = buildLocationEdit({ phoneNumbers: { additionalPhones: [] } }, CURRENT);
    assert.deepEqual(edit.body.phoneNumbers, {
      primaryPhone: '+31 20 000 0000',
      additionalPhones: [],
    });
  });

  it('includes current regular hours in body and mask with special hours', () => {
    const edit = buildLocationEdit({ specialHours: SPECIAL }, CURRENT);
    assert.deepEqual(edit.body, { specialHours: SPECIAL, regularHours: REGULAR });
    assert.deepEqual(edit.updateMask.split(',').sort(), ['regularHours', 'specialHours']);
    assert.deepEqual([...edit.fields].sort(), ['regularHours', 'specialHours']);
  });

  it('keeps edited regular hours when both are edited', () => {
    const newRegular = { periods: [] };
    const edit = buildLocationEdit(
      { specialHours: SPECIAL, regularHours: newRegular },
      CURRENT,
    );
    assert.deepEqual(edit.body.regularHours, newRegular);
    assert.equal(edit.fields.filter((field) => field === 'regularHours').length, 1);
  });

  it('refuses special hours when the location has no regular hours', () => {
    const { regularHours: _omit, ...withoutHours } = CURRENT;
    assert.throws(
      () => buildLocationEdit({ specialHours: SPECIAL }, withoutHours),
      /regular hours/i,
    );
  });

  it('keeps current additional categories when only the primary changes', () => {
    const edit = buildLocationEdit(
      { categories: { primaryCategory: { name: 'categories/gcid:shop' } } },
      CURRENT,
    );
    assert.deepEqual(edit.body.categories, {
      primaryCategory: { name: 'categories/gcid:shop' },
      additionalCategories: [{ name: 'categories/gcid:cafe' }],
    });
    assert.equal(edit.updateMask, 'categories');
  });

  it('combines several fields', () => {
    const edit = buildLocationEdit(
      { websiteUri: 'https://example.com/a', description: 'Hello' },
      CURRENT,
    );
    assert.deepEqual([...edit.fields].sort(), ['profile.description', 'websiteUri']);
  });

  it('refuses unknown fields and empty edits', () => {
    assert.throws(() => buildLocationEdit({ title: 'New name' }, CURRENT), /title/);
    assert.throws(() => buildLocationEdit({}, CURRENT), /no .*fields/i);
    assert.throws(() => buildLocationEdit(undefined, CURRENT), /no .*fields/i);
  });
});

describe('validateLocationEdit', () => {
  it('sends a PATCH with validateOnly and treats an empty body as valid', async () => {
    const fetchFn = routedFetch([
      on('PATCH', '/v1/locations/222', () => json(undefined)),
    ]);
    const result = await validateLocationEdit(
      makeCtx(fetchFn),
      'locations/222',
      { websiteUri: 'https://example.com/en' },
      'websiteUri',
    );
    assert.deepEqual(result, { valid: true });
    const { params, body, headers } = fetchFn.calls[0];
    assert.equal(params.get('validateOnly'), 'true');
    assert.equal(params.get('updateMask'), 'websiteUri');
    assert.deepEqual(body, { websiteUri: 'https://example.com/en' });
    assert.equal(headers.Authorization, `Bearer ${FAKE_ACCESS}`);
  });

  for (const status of [400, 429, 503]) {
    it(`does not retry a ${status}`, async () => {
      const fetchFn = routedFetch([
        on('PATCH', '/v1/locations/222', () => json({}, status)),
      ]);
      await assert.rejects(
        validateLocationEdit(makeCtx(fetchFn), 'locations/222', {}, 'websiteUri'),
        (err) => err.status === status,
      );
      assert.equal(fetchFn.calls.length, 1);
    });
  }
});

describe('write functions', () => {
  const writes = [
    [
      'patchLocation',
      (ctx) => patchLocation(ctx, 'locations/222', { websiteUri: 'x' }, 'websiteUri'),
      'PATCH',
      '/v1/locations/222',
    ],
    [
      'updateReviewReply',
      (ctx) => updateReviewReply(ctx, V4, 'r1', 'Thanks'),
      'PUT',
      `/v4/${V4}/reviews/r1/reply`,
    ],
    [
      'createLocalPost',
      (ctx) => createLocalPost(ctx, V4, { summary: 'Hi' }),
      'POST',
      `/v4/${V4}/localPosts`,
    ],
  ];

  for (const [name, call, method, path] of writes) {
    it(`${name} sends one ${method} to ${path}`, async () => {
      const fetchFn = routedFetch([on(method, path, { ok: 1 })]);
      assert.deepEqual(await call(makeCtx(fetchFn)), { ok: 1 });
      assert.equal(fetchFn.calls.length, 1);
      assert.equal(fetchFn.calls[0].path, path);
    });

    for (const status of [429, 500, 503]) {
      it(`${name} does not retry a ${status}`, async () => {
        const fetchFn = routedFetch([on(method, path, () => json({}, status))]);
        await assert.rejects(call(makeCtx(fetchFn)), (err) => {
          assert.equal(err.status, status);
          assert.equal(err.outcome, 'rejected');
          return true;
        });
        assert.equal(fetchFn.calls.length, 1);
      });
    }

    it(`${name} does not retry a network failure and reports an unknown outcome`, async () => {
      let attempts = 0;
      const ctx = makeCtx(async () => {
        attempts += 1;
        throw new Error('timeout');
      });
      await assert.rejects(call(ctx), (err) => err.outcome === 'unknown');
      assert.equal(attempts, 1);
    });
  }

  it('patchLocation does not set validateOnly and carries the mask', async () => {
    const fetchFn = routedFetch([on('PATCH', '/v1/locations/222', {})]);
    await patchLocation(makeCtx(fetchFn), 'locations/222', {}, 'websiteUri');
    assert.equal(fetchFn.calls[0].params.has('validateOnly'), false);
    assert.equal(fetchFn.calls[0].params.get('updateMask'), 'websiteUri');
  });

  it('patchLocation refuses an empty mask', async () => {
    const fetchFn = routedFetch([]);
    await assert.rejects(
      patchLocation(makeCtx(fetchFn), 'locations/222', {}, ''),
      /updateMask/,
    );
    assert.equal(fetchFn.calls.length, 0);
  });

  it('updateReviewReply sends the comment and encodes the ID', async () => {
    const fetchFn = routedFetch([on('PUT', '/reply', { comment: 'Thanks' })]);
    await updateReviewReply(makeCtx(fetchFn), V4, 'a/b', 'Thanks');
    assert.deepEqual(fetchFn.calls[0].body, { comment: 'Thanks' });
    assert.ok(fetchFn.calls[0].url.includes('/reviews/a%2Fb/reply'));
  });

  it('a write with an unreadable success body does not throw', async () => {
    const fetchFn = routedFetch([
      on('POST', '/localPosts', () => new Response('<html>')),
    ]);
    assert.deepEqual(await createLocalPost(makeCtx(fetchFn), V4, {}), {});
  });

  it('an error never includes the token', async () => {
    const fetchFn = routedFetch([
      on('PATCH', '/v1/locations/222', () =>
        json({ error: { message: `leak ${FAKE_ACCESS}` } }, 400),
      ),
    ]);
    await assert.rejects(
      patchLocation(makeCtx(fetchFn), 'locations/222', {}, 'websiteUri'),
      (err) => !err.message.includes(FAKE_ACCESS) && /leak/.test(err.message),
    );
  });
});
