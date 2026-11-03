// Tests for the preview and apply gate: diffs, refusals, read-back status and the change log.
import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GbpApiError } from '../../tools/gbp/client.js';
import {
  PREVIEW_TTL_MS,
  createChanges,
  locationStatus,
  sameFieldValue,
} from '../../tools/gbp/changes.js';
import { FAKE_ACCESS, json, makeCtx, on, routedFetch } from './helpers.js';

const TITLE = 'Example Bakery';
const REVIEWER_NAME = 'Sample Reviewer';
const START = Date.UTC(2026, 0, 1);
const NEW_URL = 'https://example.com/en?utm_source=google';
const OLD_URL = 'https://example.com/';

function makeWorld(overrides = {}) {
  return {
    merchant: {
      name: 'locations/222',
      title: TITLE,
      websiteUri: OLD_URL,
      phoneNumbers: {
        primaryPhone: '+31 20 000 0000',
        additionalPhones: ['+31 20 000 0001'],
      },
      profile: { description: 'Old text' },
      metadata: {},
    },
    live: null,
    review: {
      reviewId: 'r1',
      reviewer: {
        displayName: REVIEWER_NAME,
        profilePhotoUrl: 'https://example.com/p.png',
      },
      starRating: 'FIVE',
      comment: 'Lovely bread',
    },
    applyWrites: true,
    patchHandler: null,
    replyHandler: null,
    postResponse: { name: 'accounts/111/locations/222/localPosts/p1', state: 'LIVE' },
    ...overrides,
  };
}

function worldFetch(world) {
  return routedFetch([
    on('GET', ':getGoogleUpdated', () => {
      if (world.liveReadFails) return json({}, 500);
      return json({ location: world.live ?? world.merchant });
    }),
    on('GET', '/v1/accounts/111/locations', {
      locations: [{ name: 'locations/222', title: TITLE }],
    }),
    on('GET', '/v1/accounts', { accounts: [{ name: 'accounts/111' }] }),
    on('GET', '/v1/locations/222', () => {
      if (world.merchantReadFails) return json({}, 500);
      return json(world.merchant);
    }),
    on('PATCH', '/v1/locations/222', (call) => {
      if (call.params.get('validateOnly') === 'true') {
        return world.validateResponse ? world.validateResponse() : json(undefined);
      }
      if (world.patchHandler) return world.patchHandler(call);
      if (world.applyWrites) {
        const { profile, ...rest } = call.body;
        world.merchant = {
          ...world.merchant,
          ...rest,
          ...(profile ? { profile: { ...world.merchant.profile, ...profile } } : {}),
        };
      }
      return json(world.merchant);
    }),
    on('GET', '/reviews/r1', () => {
      if (world.reviewReadFails) return json({}, 500);
      return json(world.review);
    }),
    on('PUT', '/reviews/r1/reply', (call) => {
      if (world.replyHandler) return world.replyHandler(call);
      if (world.applyWrites) world.review = { ...world.review, reviewReply: call.body };
      return json(call.body);
    }),
    on('POST', '/localPosts', () => json(world.postResponse)),
  ]);
}

describe('changes', () => {
  let dir;
  let logPath;
  let clock;
  let world;
  let fetchFn;
  let changes;
  let idCounter;

  const writesSent = () =>
    fetchFn.calls.filter(
      (call) => call.method !== 'GET' && call.params.get('validateOnly') !== 'true',
    );
  const readLog = async () =>
    (await readFile(logPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
  const previewWebsite = () =>
    changes.previewLocationEdit({
      location: 'locations/222',
      edits: { websiteUri: NEW_URL },
    });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'gbp-changes-'));
    logPath = join(dir, 'gbp', 'changes.jsonl');
    clock = { time: START };
    world = makeWorld();
    fetchFn = worldFetch(world);
    idCounter = 0;
    changes = createChanges({
      ctx: makeCtx(fetchFn),
      logPath,
      now: () => clock.time,
      newId: () => `preview-${(idCounter += 1)}`,
    });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('sameFieldValue', () => {
    it('ignores key order at any depth', () => {
      assert.equal(
        sameFieldValue(
          'regularHours',
          { a: { x: 1, y: 2 }, b: 1 },
          { b: 1, a: { y: 2, x: 1 } },
        ),
        true,
      );
    });
    it('treats values Google omits as equal to their defaults', () => {
      assert.equal(sameFieldValue('f', { hours: 9, minutes: 0 }, { hours: 9 }), true);
      assert.equal(sameFieldValue('f', { closed: false }, {}), true);
      assert.equal(sameFieldValue('f', { additionalPhones: [] }, {}), true);
      assert.equal(sameFieldValue('f', undefined, ''), true);
    });
    it('sees real differences', () => {
      assert.equal(sameFieldValue('f', { hours: 9 }, { hours: 10 }), false);
      assert.equal(sameFieldValue('f', { hours: 9 }, { hours: 9, minutes: 30 }), false);
      assert.equal(sameFieldValue('f', [1, 2], [2, 1]), false);
      assert.equal(sameFieldValue('f', 'a', 'b'), false);
    });
    it('compares categories by name only', () => {
      const requested = { primaryCategory: { name: 'categories/gcid:bakery' } };
      const returned = {
        primaryCategory: { name: 'categories/gcid:bakery', displayName: 'Bakery' },
      };
      assert.equal(sameFieldValue('categories', requested, returned), true);
      assert.equal(
        sameFieldValue('categories', requested, {
          primaryCategory: { name: 'categories/gcid:cafe' },
        }),
        false,
      );
    });
  });

  describe('locationStatus', () => {
    const fields = ['websiteUri'];
    const requested = { websiteUri: 'new' };
    it('is mismatch when merchant differs from the request, even if pending', () => {
      assert.equal(
        locationStatus({
          fields,
          requested,
          merchant: { websiteUri: 'other', metadata: { hasPendingEdits: true } },
          live: { websiteUri: 'other' },
        }),
        'mismatch',
      );
    });
    it('is pending when the flag is set', () => {
      assert.equal(
        locationStatus({
          fields,
          requested,
          merchant: { websiteUri: 'new', metadata: { hasPendingEdits: true } },
          live: { websiteUri: 'new' },
        }),
        'pending',
      );
    });
    it('is pending when merchant differs from live on the edited fields', () => {
      assert.equal(
        locationStatus({
          fields,
          requested,
          merchant: { websiteUri: 'new' },
          live: { websiteUri: 'old' },
        }),
        'pending',
      );
    });
    it('ignores differences on fields that were not edited', () => {
      assert.equal(
        locationStatus({
          fields,
          requested,
          merchant: { websiteUri: 'new', title: 'A' },
          live: { websiteUri: 'new', title: 'B' },
        }),
        'live',
      );
    });
  });

  describe('previewLocationEdit', () => {
    it('returns the diff, previewId and confirmText', async () => {
      const preview = await previewWebsite();
      assert.equal(preview.previewId, 'preview-1');
      assert.equal(preview.confirmText, `${TITLE}: websiteUri`);
      assert.deepEqual(preview.fields, ['websiteUri']);
      assert.deepEqual(preview.diff, { websiteUri: { before: OLD_URL, after: NEW_URL } });
      assert.equal(preview.expiresAt, new Date(START + PREVIEW_TTL_MS).toISOString());
    });

    it('sends no write except validateOnly', async () => {
      await previewWebsite();
      assert.equal(writesSent().length, 0);
      const validate = fetchFn.calls.filter((call) => call.method !== 'GET');
      assert.equal(validate.length, 1);
      assert.equal(validate[0].params.get('validateOnly'), 'true');
      assert.equal(validate[0].params.get('updateMask'), 'websiteUri');
    });

    it('lists several fields in the confirmText', async () => {
      const preview = await changes.previewLocationEdit({
        location: 'locations/222',
        edits: { websiteUri: NEW_URL, description: 'New text' },
      });
      assert.equal(preview.confirmText, `${TITLE}: websiteUri, profile.description`);
      assert.deepEqual(preview.diff['profile.description'], {
        before: 'Old text',
        after: 'New text',
      });
    });

    it('surfaces a validateOnly failure with no previewId, no confirmText, nothing stored', async () => {
      world.validateResponse = () =>
        json({ error: { status: 'INVALID_ARGUMENT', message: 'Bad website.' } }, 400);
      const preview = await previewWebsite();
      assert.equal(preview.valid, false);
      assert.equal(preview.status, 400);
      assert.match(preview.error, /Bad website\./);
      assert.equal('previewId' in preview, false);
      assert.equal('confirmText' in preview, false);
      assert.equal(idCounter, 0);
    });

    it('rejects a non-API error instead of offering a preview', async () => {
      await assert.rejects(
        changes.previewLocationEdit({ location: 'locations/222', edits: { title: 'x' } }),
        /title/,
      );
      assert.equal(idCounter, 0);
    });

    it('does not let a caller change the stored preview through the returned diff', async () => {
      const preview = await previewWebsite();
      preview.diff.websiteUri.after = 'https://attacker.example/';
      await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(writesSent()[0].body.websiteUri, NEW_URL);
    });
  });

  describe('apply refusals', () => {
    const assertRefused = async (result, reason) => {
      assert.equal(result.status, 'refused');
      assert.equal(result.reason, reason);
      assert.equal(result.sent, false);
      assert.equal(writesSent().length, 0);
      const log = await readLog();
      const last = log[log.length - 1];
      assert.equal(last.status, 'refused');
      assert.equal(last.reason, reason);
      assert.equal(last.sent, false);
    };

    it('refuses an unknown preview and logs without before or after', async () => {
      await assertRefused(
        await changes.apply({ previewId: 'nope', confirmText: 'x' }),
        'unknown',
      );
      const [line] = await readLog();
      assert.equal(line.previewId, 'nope');
      assert.equal('before' in line, false);
      assert.equal('after' in line, false);
    });

    it('refuses a wrong confirmText, and the preview still works afterwards', async () => {
      const preview = await previewWebsite();
      await assertRefused(
        await changes.apply({ previewId: preview.previewId, confirmText: 'wrong' }),
        'confirm_text_mismatch',
      );
      const applied = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(applied.status, 'live');
    });

    it('refuses a preview older than 30 minutes, not one exactly at the limit', async () => {
      const preview = await previewWebsite();
      clock.time = START + PREVIEW_TTL_MS + 1;
      await assertRefused(
        await changes.apply({
          previewId: preview.previewId,
          confirmText: preview.confirmText,
        }),
        'expired',
      );
      clock.time = START + PREVIEW_TTL_MS;
      const applied = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(applied.status, 'live');
      assert.equal(PREVIEW_TTL_MS, 30 * 60 * 1000);
    });

    it('refuses when an edited field has changed since the preview', async () => {
      const preview = await previewWebsite();
      world.merchant = { ...world.merchant, websiteUri: 'https://example.com/changed' };
      await assertRefused(
        await changes.apply({
          previewId: preview.previewId,
          confirmText: preview.confirmText,
        }),
        'stale',
      );
    });

    it('is not stale when only an unedited field changed or key order differs', async () => {
      const preview = await changes.previewLocationEdit({
        location: 'locations/222',
        edits: { phoneNumbers: { primaryPhone: '+31 20 000 0002' } },
      });
      world.merchant = {
        ...world.merchant,
        websiteUri: 'https://example.com/changed',
        phoneNumbers: {
          additionalPhones: ['+31 20 000 0001'],
          primaryPhone: '+31 20 000 0000',
        },
      };
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.sent, true);
    });

    it('refuses when the stale check read fails, and sends nothing', async () => {
      const preview = await previewWebsite();
      world.merchantReadFails = true;
      await assertRefused(
        await changes.apply({
          previewId: preview.previewId,
          confirmText: preview.confirmText,
        }),
        'stale_check_failed',
      );
    });

    it('refuses a used preview and no refusal line says it was sent', async () => {
      const preview = await previewWebsite();
      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      assert.equal((await changes.apply(args)).status, 'live');
      const second = await changes.apply(args);
      assert.equal(second.status, 'refused');
      assert.equal(second.reason, 'used');
      assert.equal(writesSent().length, 1);
      const log = await readLog();
      assert.equal(log.length, 2);
      assert.equal(log[1].sent, false);
    });

    it('checks in order: used before expired before confirmText', async () => {
      const preview = await previewWebsite();
      clock.time = START + PREVIEW_TTL_MS + 1;
      const expired = await changes.apply({
        previewId: preview.previewId,
        confirmText: 'wrong',
      });
      assert.equal(expired.reason, 'expired');
      clock.time = START;
      await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      clock.time = START + PREVIEW_TTL_MS + 1;
      const used = await changes.apply({
        previewId: preview.previewId,
        confirmText: 'wrong',
      });
      assert.equal(used.reason, 'used');
    });
  });

  describe('apply send', () => {
    it('sends exactly the previewed body and mask', async () => {
      const preview = await previewWebsite();
      await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      const [write] = writesSent();
      assert.deepEqual(write.body, { websiteUri: NEW_URL });
      assert.equal(write.params.get('updateMask'), 'websiteUri');
    });

    it('marks the preview used before sending', async () => {
      const preview = await previewWebsite();
      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      let nested;
      world.patchHandler = async () => {
        nested = await changes.apply(args);
        return json({});
      };
      await changes.apply(args);
      assert.equal(nested.reason, 'used');
      assert.equal(writesSent().length, 1);
    });

    it('sends once when two applies race', async () => {
      const preview = await previewWebsite();
      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      const results = await Promise.all([changes.apply(args), changes.apply(args)]);
      assert.equal(writesSent().length, 1);
      assert.equal(results.filter((result) => result.status === 'refused').length, 1);
    });

    it('does not retry a 429, keeps the preview used and logs a rejected error', async () => {
      const preview = await previewWebsite();
      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      world.patchHandler = () => json({ error: { message: 'Too many edits.' } }, 429);
      const result = await changes.apply(args);
      assert.equal(result.status, 'error');
      assert.equal(result.outcome, 'rejected');
      assert.equal(result.httpStatus, 429);
      assert.equal(result.sent, true);
      assert.match(result.message, /not retried/i);
      assert.equal(writesSent().length, 1);
      assert.equal((await changes.apply(args)).reason, 'used');
      const [line] = await readLog();
      assert.equal(line.status, 'error');
      assert.equal(line.outcome, 'rejected');
    });

    it('reports an unknown outcome on a thrown send and stays used', async () => {
      const preview = await previewWebsite();
      const args = { previewId: preview.previewId, confirmText: preview.confirmText };
      world.patchHandler = () => {
        throw new Error('network timeout');
      };
      const result = await changes.apply(args);
      assert.equal(result.status, 'error');
      assert.equal(result.outcome, 'unknown');
      assert.equal(result.sent, true);
      assert.match(result.message, /not retried/i);
      assert.match(result.message, /may need checking/i);
      assert.equal(writesSent().length, 1);
      assert.equal((await changes.apply(args)).reason, 'used');
      const [line] = await readLog();
      assert.equal(line.status, 'error');
      assert.equal(line.outcome, 'unknown');
    });

    it('reports not_sent when the token fails on the send only', async () => {
      let tokenCalls = 0;
      const local = createChanges({
        ctx: {
          ...makeCtx(fetchFn),
          getToken: async () => {
            tokenCalls += 1;
            if (tokenCalls === 4)
              throw new GbpApiError('no token', { outcome: 'not_sent' });
            return FAKE_ACCESS;
          },
        },
        logPath,
        now: () => clock.time,
      });
      const preview = await local.previewLocationEdit({
        location: 'locations/222',
        edits: { websiteUri: NEW_URL },
      });
      const result = await local.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'error');
      assert.equal(result.outcome, 'not_sent');
      assert.equal(result.sent, false);
      assert.equal(writesSent().length, 0);
      const second = await local.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(second.reason, 'used');
    });
  });

  describe('location read-back', () => {
    const applyWebsite = async () => {
      const preview = await previewWebsite();
      return changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
    };

    it('reports live', async () => {
      const result = await applyWebsite();
      assert.equal(result.status, 'live');
      assert.equal((await readLog())[0].status, 'live');
    });

    it('reports pending from the flag', async () => {
      world.patchHandler = () => {
        world.merchant = {
          ...world.merchant,
          websiteUri: NEW_URL,
          metadata: { hasPendingEdits: true },
        };
        return json({});
      };
      assert.equal((await applyWebsite()).status, 'pending');
    });

    it('reports pending when merchant and live differ', async () => {
      world.live = { websiteUri: OLD_URL };
      assert.equal((await applyWebsite()).status, 'pending');
    });

    it('reports mismatch with what came back', async () => {
      world.applyWrites = false;
      const result = await applyWebsite();
      assert.equal(result.status, 'mismatch');
      assert.deepEqual(result.readBack, { websiteUri: OLD_URL });
      assert.deepEqual((await readLog())[0].readBack, { websiteUri: OLD_URL });
    });

    it('reports unverified when the read-back fails, never success', async () => {
      const preview = await previewWebsite();
      world.patchHandler = () => {
        world.merchantReadFails = true;
        return json({});
      };
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'unverified');
      assert.equal(result.sent, true);
      const [line] = await readLog();
      assert.equal(line.status, 'unverified');
      assert.equal(line.sent, true);
    });

    it('reports unverified when only the live read fails', async () => {
      const preview = await previewWebsite();
      world.liveReadFails = true;
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'unverified');
    });
  });

  describe('review replies', () => {
    const previewReply = () =>
      changes.previewReviewReply({
        location: 'locations/222',
        reviewId: 'r1',
        comment: 'Thank you',
      });

    it('resolves the owner and previews reply text only, with no reviewer', async () => {
      const preview = await previewReply();
      assert.equal(preview.confirmText, `${TITLE}: reviewReply`);
      assert.deepEqual(preview.diff, {
        reviewReply: { before: null, after: 'Thank you' },
      });
      assert.ok(!JSON.stringify(preview).includes(REVIEWER_NAME));
      assert.equal(preview.review.starRating, 'FIVE');
      assert.equal(writesSent().length, 0);
      assert.ok(fetchFn.calls.every((call) => call.method === 'GET'));
    });

    it('applies, reads back and logs no reviewer', async () => {
      const preview = await previewReply();
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'live');
      assert.equal(
        writesSent()[0].path,
        '/v4/accounts/111/locations/222/reviews/r1/reply',
      );
      const raw = await readFile(logPath, 'utf8');
      assert.ok(!raw.includes(REVIEWER_NAME));
      assert.ok(!raw.includes('reviewer'));
      assert.ok(!raw.includes('profilePhotoUrl'));
      assert.ok(!raw.includes('Lovely bread'));
      const [line] = await readLog();
      assert.equal(line.before.reviewReply, null);
      assert.equal(line.after.reviewReply, 'Thank you');
    });

    it('holds the before text for a changed reply', async () => {
      world.review.reviewReply = { comment: 'Old reply' };
      const preview = await previewReply();
      assert.deepEqual(preview.diff.reviewReply, {
        before: 'Old reply',
        after: 'Thank you',
      });
    });

    it('reports mismatch when the comment does not read back', async () => {
      world.applyWrites = false;
      const preview = await previewReply();
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'mismatch');
    });

    it('refuses as stale when another reply arrived', async () => {
      const preview = await previewReply();
      world.review.reviewReply = { comment: 'Someone else replied' };
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.reason, 'stale');
      assert.equal(writesSent().length, 0);
    });

    it('reports unverified when the read-back fails', async () => {
      const preview = await previewReply();
      world.replyHandler = () => {
        world.reviewReadFails = true;
        return json({ comment: 'Thank you' });
      };
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'unverified');
    });

    it('refuses an empty comment', async () => {
      await assert.rejects(
        changes.previewReviewReply({
          location: 'locations/222',
          reviewId: 'r1',
          comment: ' ',
        }),
        /comment/i,
      );
    });
  });

  describe('posts', () => {
    const postArgs = {
      location: 'locations/222',
      summary: 'Fresh loaves today',
      languageCode: 'en',
    };
    const applyPost = async (extra = {}) => {
      const preview = await changes.previewPost({ ...postArgs, ...extra });
      return changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
    };

    it('previews a standard post with GET requests only', async () => {
      const preview = await changes.previewPost(postArgs);
      assert.equal(preview.confirmText, `${TITLE}: localPost`);
      assert.deepEqual(preview.diff.localPost, {
        before: null,
        after: {
          languageCode: 'en',
          summary: 'Fresh loaves today',
          topicType: 'STANDARD',
        },
      });
      assert.ok(fetchFn.calls.every((call) => call.method === 'GET'));
    });

    it('adds the optional button and image', async () => {
      await applyPost({
        button: { actionType: 'LEARN_MORE', url: 'https://example.com/more' },
        imageUrl: 'https://example.com/image.jpg',
      });
      const [write] = writesSent();
      assert.deepEqual(write.body.callToAction, {
        actionType: 'LEARN_MORE',
        url: 'https://example.com/more',
      });
      assert.deepEqual(write.body.media, [
        { mediaFormat: 'PHOTO', sourceUrl: 'https://example.com/image.jpg' },
      ]);
    });

    it('rejects a bad post before storing anything', async () => {
      await assert.rejects(changes.previewPost({ ...postArgs, summary: '' }), /summary/i);
      await assert.rejects(
        changes.previewPost({ ...postArgs, summary: 'x'.repeat(1501) }),
        /summary/i,
      );
      await assert.rejects(
        changes.previewPost({ ...postArgs, languageCode: '' }),
        /language/i,
      );
      await assert.rejects(
        changes.previewPost({ ...postArgs, imageUrl: 'ftp://x' }),
        /http/i,
      );
      await assert.rejects(
        changes.previewPost({
          ...postArgs,
          button: { actionType: 'NOPE', url: 'https://e.com' },
        }),
        /actionType/,
      );
      assert.equal(idCounter, 0);
    });

    for (const [state, status] of [
      ['LIVE', 'live'],
      ['PROCESSING', 'pending'],
      ['REJECTED', 'mismatch'],
      ['SOMETHING_NEW', 'mismatch'],
      [undefined, 'mismatch'],
    ]) {
      it(`maps post state ${state} to ${status}`, async () => {
        world.postResponse = { name: 'p1', state };
        assert.equal((await applyPost()).status, status);
      });
    }
  });

  describe('log file', () => {
    it('records the required fields on a successful apply', async () => {
      const preview = await previewWebsite();
      await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      const [line] = await readLog();
      assert.equal(line.time, new Date(START).toISOString());
      assert.equal(line.location, 'locations/222');
      assert.deepEqual(line.fields, ['websiteUri']);
      assert.deepEqual(line.before, { websiteUri: OLD_URL });
      assert.deepEqual(line.after, { websiteUri: NEW_URL });
      assert.equal(line.status, 'live');
      assert.equal(line.previewId, preview.previewId);
      assert.equal(line.sent, true);
    });

    it('creates the directory 700 and the file 600', async () => {
      await changes.apply({ previewId: 'nope', confirmText: 'x' });
      assert.equal((await stat(join(dir, 'gbp'))).mode & 0o777, 0o700);
      assert.equal((await stat(logPath)).mode & 0o777, 0o600);
    });

    it('tightens an existing wide directory and file', async () => {
      await mkdir(join(dir, 'gbp'), { recursive: true });
      await writeFile(logPath, '');
      await chmod(join(dir, 'gbp'), 0o755);
      await chmod(logPath, 0o644);
      await changes.apply({ previewId: 'nope', confirmText: 'x' });
      assert.equal((await stat(join(dir, 'gbp'))).mode & 0o777, 0o700);
      assert.equal((await stat(logPath)).mode & 0o777, 0o600);
    });

    it('appends one JSON line per attempt', async () => {
      await changes.apply({ previewId: 'a', confirmText: 'x' });
      await changes.apply({ previewId: 'b', confirmText: 'x' });
      assert.equal((await readLog()).length, 2);
    });

    it('never holds a token, in the log or the result', async () => {
      const preview = await previewWebsite();
      world.patchHandler = () =>
        json({ error: { message: `Bad Authorization: Bearer ${FAKE_ACCESS}` } }, 401);
      const result = await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.ok(!JSON.stringify(result).includes(FAKE_ACCESS));
      assert.ok(!(await readFile(logPath, 'utf8')).includes(FAKE_ACCESS));
    });

    it('strips a reviewer object from any logged value', async () => {
      const preview = await changes.previewPost({
        location: 'locations/222',
        summary: 'x',
        languageCode: 'en',
      });
      world.postResponse = { state: 'LIVE' };
      await changes.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      await changes.logEntry({
        location: 'locations/222',
        previewId: 'manual',
        fields: [],
        before: { nested: { reviewer: { displayName: REVIEWER_NAME } } },
        after: [{ reviewer: { displayName: REVIEWER_NAME } }],
        status: 'refused',
        sent: false,
      });
      assert.ok(!(await readFile(logPath, 'utf8')).includes(REVIEWER_NAME));
    });

    it('still reports the send result when the log cannot be written', async () => {
      await writeFile(join(dir, 'blocker'), '');
      const local = createChanges({
        ctx: makeCtx(fetchFn),
        logPath: join(dir, 'blocker', 'changes.jsonl'),
        now: () => clock.time,
        diagnostics: () => {},
      });
      const preview = await local.previewLocationEdit({
        location: 'locations/222',
        edits: { websiteUri: NEW_URL },
      });
      const result = await local.apply({
        previewId: preview.previewId,
        confirmText: preview.confirmText,
      });
      assert.equal(result.status, 'live');
      assert.match(result.logError, /log/i);
    });
  });
});
