// Builds before/after previews, gates every Google write behind a confirmed preview, reads back the result and logs each attempt.
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { redact } from './auth.js';
import {
  GbpApiError,
  assertWebAddress,
  buildLocationEdit,
  createLocalPost,
  getGoogleUpdated,
  getLocation,
  getReview,
  hasPendingEdits,
  locationName,
  patchLocation,
  resolveLocation,
  updateReviewReply,
  validateLocationEdit,
} from './client.js';

export const PREVIEW_TTL_MS = 30 * 60 * 1000;

const POST_SUMMARY_MAX = 1500;
const POST_ACTIONS = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];
const POST_STATUS = { LIVE: 'live', PROCESSING: 'pending' };
const REVIEW_FIELD = 'reviewReply';
const POST_FIELD = 'localPost';
const REFUSAL_MESSAGES = {
  unknown:
    'No preview with this ID. Previews are lost when the server restarts. Run a new preview.',
  used: 'This preview has already been applied or attempted. Run a new preview.',
  expired: 'This preview is older than 30 minutes. Run a new preview.',
  confirm_text_mismatch: 'confirmText does not match the preview exactly.',
  stale: 'An edited field has changed on Google since the preview. Run a new preview.',
  stale_check_failed:
    'Could not re-read the current state, so nothing was sent. Try again.',
};
const SEND_MESSAGES = {
  not_sent:
    'The write was not sent and was not retried. This preview is used; run a new preview.',
  rejected:
    'Google rejected the write. It was not retried. This preview is used; run a new preview.',
  unknown:
    'No response from Google. The write was not retried and the outcome may need checking with a read before any new preview.',
};
const STATUS_MESSAGES = {
  live: 'The write was sent and reads back as live.',
  pending: 'The write was sent and Google is holding it; it is not live yet.',
  mismatch: 'The write was sent but what reads back differs from the request.',
  unverified:
    'The write was sent but could not be read back. Check the result with a read.',
};

const defaultLogPath = () => join(homedir(), '.config', 'gbp', 'changes.jsonl');
const defaultDiagnostics = (text) => process.stderr.write(`${text}\n`);

function fieldValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function canonical(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 0 ||
    value === false
  ) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? undefined : value.map((item) => canonical(item) ?? null);
  }
  if (typeof value !== 'object') return value;
  const entries = Object.keys(value)
    .sort()
    .map((key) => [key, canonical(value[key])])
    .filter(([, item]) => item !== undefined);
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

function comparable(field, value) {
  if (field !== 'categories') return value;
  return {
    primary: value?.primaryCategory?.name,
    additional: (value?.additionalCategories ?? [])
      .map((category) => category.name)
      .sort(),
  };
}

export function sameFieldValue(field, a, b) {
  const left = JSON.stringify(canonical(comparable(field, a)));
  const right = JSON.stringify(canonical(comparable(field, b)));
  return left === right;
}

export function locationStatus({ fields, requested, merchant, live }) {
  const asRequested = fields.every((field) =>
    sameFieldValue(field, fieldValue(merchant, field), requested[field]),
  );
  if (!asRequested) return 'mismatch';
  if (hasPendingEdits(merchant)) return 'pending';
  const sameAsLive = fields.every((field) =>
    sameFieldValue(field, fieldValue(merchant, field), fieldValue(live, field)),
  );
  return sameAsLive ? 'live' : 'pending';
}

function withoutReviewer(value) {
  if (Array.isArray(value)) return value.map(withoutReviewer);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'reviewer')
      .map(([key, item]) => [key, withoutReviewer(item)]),
  );
}

function pickFields(source, fields) {
  return Object.fromEntries(
    fields.map((field) => [field, fieldValue(source, field) ?? null]),
  );
}

function buildPost({ summary, languageCode, button, imageUrl }) {
  if (
    typeof summary !== 'string' ||
    !summary.trim() ||
    summary.length > POST_SUMMARY_MAX
  ) {
    throw new Error(`Post summary must be 1 to ${POST_SUMMARY_MAX} characters`);
  }
  if (typeof languageCode !== 'string' || !languageCode) {
    throw new Error('Post needs a languageCode');
  }
  const post = { languageCode, summary, topicType: 'STANDARD' };
  if (button) {
    if (!POST_ACTIONS.includes(button.actionType)) {
      throw new Error(`Post button actionType must be one of ${POST_ACTIONS.join(', ')}`);
    }
    post.callToAction = { actionType: button.actionType };
    if (button.actionType !== 'CALL') {
      post.callToAction.url = assertWebAddress(button.url, 'Post button url');
    }
  }
  if (imageUrl !== undefined) {
    post.media = [
      { mediaFormat: 'PHOTO', sourceUrl: assertWebAddress(imageUrl, 'Post imageUrl') },
    ];
  }
  return post;
}

export function createChanges({
  ctx,
  logPath = defaultLogPath(),
  now = Date.now,
  newId = randomUUID,
  secrets = [],
  diagnostics = defaultDiagnostics,
}) {
  const previews = new Map();

  const handlers = {
    location: {
      async isStale(preview) {
        const current = await getLocation(ctx, preview.location);
        return !preview.fields.every((field) =>
          sameFieldValue(field, fieldValue(current, field), preview.before[field]),
        );
      },
      send: (preview) =>
        patchLocation(
          ctx,
          preview.location,
          preview.request.body,
          preview.request.updateMask,
        ),
      async readBack(preview) {
        const merchant = await getLocation(ctx, preview.location);
        const updated = await getGoogleUpdated(ctx, preview.location);
        const status = locationStatus({
          fields: preview.fields,
          requested: preview.after,
          merchant,
          live: updated.location ?? {},
        });
        return status === 'mismatch'
          ? { status, readBack: pickFields(merchant, preview.fields) }
          : { status };
      },
    },
    review: {
      async isStale(preview) {
        const review = await getReview(
          ctx,
          preview.request.v4Name,
          preview.request.reviewId,
        );
        return (review.reviewReply?.comment ?? null) !== preview.before[REVIEW_FIELD];
      },
      send: ({ request }) =>
        updateReviewReply(ctx, request.v4Name, request.reviewId, request.comment),
      async readBack({ request }) {
        const review = await getReview(ctx, request.v4Name, request.reviewId);
        const comment = review.reviewReply?.comment ?? null;
        return comment === request.comment
          ? { status: 'live' }
          : { status: 'mismatch', readBack: { [REVIEW_FIELD]: comment } };
      },
    },
    post: {
      isStale: async () => false,
      send: ({ request }) => createLocalPost(ctx, request.v4Name, request.post),
      async readBack(_, response) {
        const status = POST_STATUS[response?.state] ?? 'mismatch';
        return {
          status,
          ...(status === 'mismatch'
            ? { readBack: { state: response?.state ?? null } }
            : {}),
          ...(response?.name ? { postName: response.name } : {}),
        };
      },
    },
  };

  async function logEntry(entry) {
    const record = withoutReviewer({ time: new Date(now()).toISOString(), ...entry });
    const directory = dirname(logPath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const file = await open(logPath, 'a', 0o600);
    try {
      await file.chmod(0o600);
      await file.appendFile(`${redact(JSON.stringify(record), secrets)}\n`);
    } finally {
      await file.close();
    }
  }

  async function finish(entry, message) {
    const result = { ...structuredClone(entry), message };
    try {
      await logEntry(entry);
    } catch (err) {
      result.logError = `Change log could not be written: ${redact(err.message, secrets)}`;
      diagnostics(result.logError);
    }
    return result;
  }

  function entryFor(preview, previewId, details) {
    if (!preview) return { location: null, fields: [], previewId, ...details };
    return {
      location: preview.location,
      fields: preview.fields,
      before: preview.before,
      after: preview.after,
      previewId,
      ...details,
    };
  }

  function refuse(preview, previewId, reason) {
    const entry = entryFor(preview, previewId, {
      status: 'refused',
      reason,
      sent: false,
    });
    return finish(entry, REFUSAL_MESSAGES[reason]);
  }

  function store({ kind, location, title, fields, before, after, request }) {
    const previewId = newId();
    const createdAt = now();
    const confirmText = `${title}: ${fields.join(', ')}`;
    previews.set(previewId, {
      kind,
      location,
      fields,
      before,
      after,
      request,
      confirmText,
      createdAt,
      used: false,
    });
    const diff = Object.fromEntries(
      fields.map((field) => [field, { before: before[field], after: after[field] }]),
    );
    return structuredClone({
      previewId,
      confirmText,
      fields,
      diff,
      expiresAt: new Date(createdAt + PREVIEW_TTL_MS).toISOString(),
    });
  }

  async function previewLocationEdit({ location, edits }) {
    const name = locationName(location);
    const current = await getLocation(ctx, name);
    const { body, fields, updateMask } = buildLocationEdit(edits, current);
    try {
      await validateLocationEdit(ctx, name, body, updateMask);
    } catch (err) {
      if (!(err instanceof GbpApiError)) throw err;
      return {
        valid: false,
        status: err.status,
        fields,
        error: redact(err.message, secrets),
        details: err.details,
      };
    }
    return {
      valid: true,
      hasPendingEdits: hasPendingEdits(current),
      ...store({
        kind: 'location',
        location: name,
        title: current.title ?? name,
        fields,
        before: pickFields(current, fields),
        after: pickFields(body, fields),
        request: structuredClone({ body, updateMask }),
      }),
    };
  }

  async function previewReviewReply({ location, reviewId, comment }) {
    if (typeof comment !== 'string' || !comment.trim()) {
      throw new Error('Review reply comment must not be empty');
    }
    const resolved = await resolveLocation(ctx, location);
    const review = await getReview(ctx, resolved.v4Name, reviewId);
    const preview = store({
      kind: 'review',
      location: resolved.name,
      title: resolved.title ?? resolved.name,
      fields: [REVIEW_FIELD],
      before: { [REVIEW_FIELD]: review.reviewReply?.comment ?? null },
      after: { [REVIEW_FIELD]: comment },
      request: { v4Name: resolved.v4Name, reviewId, comment },
    });
    return {
      ...preview,
      review: { reviewId, starRating: review.starRating, comment: review.comment },
    };
  }

  async function previewPost({ location, ...input }) {
    const post = buildPost(input);
    const resolved = await resolveLocation(ctx, location);
    return store({
      kind: 'post',
      location: resolved.name,
      title: resolved.title ?? resolved.name,
      fields: [POST_FIELD],
      before: { [POST_FIELD]: null },
      after: { [POST_FIELD]: post },
      request: { v4Name: resolved.v4Name, post: structuredClone(post) },
    });
  }

  async function apply({ previewId, confirmText } = {}) {
    const preview = previews.get(previewId);
    if (!preview) return refuse(null, previewId, 'unknown');
    if (preview.used) return refuse(preview, previewId, 'used');
    if (now() - preview.createdAt > PREVIEW_TTL_MS)
      return refuse(preview, previewId, 'expired');
    if (confirmText !== preview.confirmText) {
      return refuse(preview, previewId, 'confirm_text_mismatch');
    }

    const handler = handlers[preview.kind];
    let stale;
    try {
      stale = await handler.isStale(preview);
    } catch {
      return refuse(preview, previewId, 'stale_check_failed');
    }
    if (preview.used) return refuse(preview, previewId, 'used');
    if (stale) return refuse(preview, previewId, 'stale');

    preview.used = true;

    let response;
    try {
      response = await handler.send(preview);
    } catch (err) {
      const outcome = err.outcome ?? 'unknown';
      return finish(
        entryFor(preview, previewId, {
          status: 'error',
          sent: outcome !== 'not_sent',
          outcome,
          httpStatus: err.status ?? null,
          error: redact(err.message, secrets),
        }),
        SEND_MESSAGES[outcome] ?? SEND_MESSAGES.unknown,
      );
    }

    let verdict;
    try {
      verdict = await handler.readBack(preview, response);
    } catch (err) {
      verdict = { status: 'unverified', error: redact(err.message, secrets) };
    }
    return finish(
      entryFor(preview, previewId, { sent: true, ...verdict }),
      STATUS_MESSAGES[verdict.status],
    );
  }

  return { previewLocationEdit, previewReviewReply, previewPost, apply, logEntry };
}
