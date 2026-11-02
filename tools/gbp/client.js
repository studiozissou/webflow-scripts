// Named wrappers for each Google Business Profile API call, with fetch and the token getter injected through ctx.
import { redact } from './auth.js';

const ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const V4_API = 'https://mybusiness.googleapis.com/v4';
const PERFORMANCE_API = 'https://businessprofileperformance.googleapis.com/v1';

export const PENDING_EDITS_PATH = 'metadata.hasPendingEdits';
export const PERFORMANCE_METRICS = [
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
];

const LOCATION_LIST_MASK = 'name,title,websiteUri';
const LOCATION_READ_MASK = [
  'name',
  'title',
  'phoneNumbers',
  'categories',
  'websiteUri',
  'regularHours',
  'specialHours',
  'profile',
  PENDING_EDITS_PATH,
].join(',');

const LOCATION_EDIT_FIELDS = [
  'regularHours',
  'specialHours',
  'description',
  'websiteUri',
  'phoneNumbers',
  'categories',
];

const MAX_PAGES = 100;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;
const WORKSPACE_HINT =
  'A 403 can mean Business Profile is off for the Workspace account; check the Workspace admin settings.';

export class GbpApiError extends Error {
  constructor(message, { status = null, outcome, details = null } = {}) {
    super(message);
    this.name = 'GbpApiError';
    this.status = status;
    this.outcome = outcome;
    this.details = details;
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isRetryable = (status) => status === 429 || status >= 500;

function parseBody(text) {
  if (!text) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function buildError(method, url, response, parsed, token) {
  const { pathname } = new URL(url);
  const google = parsed.value?.error ?? {};
  const parts = [`Google API ${method} ${pathname} failed: HTTP ${response.status}`];
  if (typeof google.status === 'string') parts.push(google.status);
  if (typeof google.message === 'string') parts.push(google.message);
  if (response.status === 403) parts.push(WORKSPACE_HINT);
  const details = google.details
    ? JSON.parse(redact(JSON.stringify(google.details), [token]))
    : null;
  return new GbpApiError(redact(parts.join(' - '), [token]), {
    status: response.status,
    outcome: 'rejected',
    details,
  });
}

async function send(ctx, { method, url, body, lenient }) {
  let token;
  try {
    token = await ctx.getToken();
  } catch (err) {
    throw new GbpApiError(redact(err.message), { outcome: 'not_sent' });
  }
  let response;
  try {
    response = await ctx.fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(ctx.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const { pathname } = new URL(url);
    throw new GbpApiError(
      redact(`Google API ${method} ${pathname} got no response: ${err.message}`, [token]),
      { outcome: 'unknown' },
    );
  }
  const parsed = parseBody(await response.text());
  if (!response.ok) return { error: buildError(method, url, response, parsed, token) };
  if (!parsed.ok && !lenient) {
    const { pathname } = new URL(url);
    throw new GbpApiError(
      `Google API ${method} ${pathname} returned an unreadable response`,
      {
        status: response.status,
        outcome: 'rejected',
      },
    );
  }
  return { value: parsed.value ?? {} };
}

async function read(ctx, url) {
  const first = await send(ctx, { method: 'GET', url });
  if (!first.error) return first.value;
  if (!isRetryable(first.error.status)) throw first.error;
  await (ctx.sleep ?? defaultSleep)(RETRY_DELAY_MS);
  const second = await send(ctx, { method: 'GET', url });
  if (second.error) throw second.error;
  return second.value;
}

function withQuery(base, params = {}) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) url.searchParams.append(key, item);
  }
  return url.href;
}

async function readAllPages(ctx, base, key, params = {}) {
  const items = [];
  let pageToken;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = withQuery(base, { ...params, ...(pageToken ? { pageToken } : {}) });
    const data = await read(ctx, url);
    items.push(...(data[key] ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) return items;
  }
  throw new GbpApiError(`Google API pagination did not finish after ${MAX_PAGES} pages`, {
    outcome: 'rejected',
  });
}

export function locationName(reference) {
  const match =
    typeof reference === 'string' &&
    reference.match(/^(?:(?:accounts\/\d+\/)?locations\/)?(\d+)$/);
  if (!match)
    throw new Error('Invalid location: expected locations/<id> with a numeric ID');
  return `locations/${match[1]}`;
}

function v4Location(v4Name) {
  if (typeof v4Name !== 'string' || !/^accounts\/\d+\/locations\/\d+$/.test(v4Name)) {
    throw new Error('Invalid v4 location: expected accounts/<id>/locations/<id>');
  }
  return v4Name;
}

function resourceId(value, label) {
  if (typeof value !== 'string' || !value) throw new Error(`Invalid ${label}`);
  return encodeURIComponent(value);
}

export function hasPendingEdits(location) {
  return (
    PENDING_EDITS_PATH.split('.').reduce((value, key) => value?.[key], location) === true
  );
}

export async function listAccounts(ctx) {
  return readAllPages(ctx, `${ACCOUNTS_API}/accounts`, 'accounts');
}

export async function listAllLocations(ctx) {
  const accounts = await listAccounts(ctx);
  const results = [];
  for (const account of accounts) {
    const locations = await readAllPages(
      ctx,
      `${INFO_API}/${account.name}/locations`,
      'locations',
      { readMask: LOCATION_LIST_MASK, pageSize: 100 },
    );
    for (const location of locations) {
      results.push({
        ...location,
        account: account.name,
        v4Name: `${account.name}/${location.name}`,
      });
    }
  }
  return results;
}

export async function resolveLocation(ctx, reference) {
  const name = locationName(reference);
  const locations = await listAllLocations(ctx);
  const match = locations.find((location) => location.name === name);
  if (!match) throw new Error(`Location not found in any account: ${name}`);
  return match;
}

export async function getLocation(ctx, reference) {
  return read(
    ctx,
    withQuery(`${INFO_API}/${locationName(reference)}`, { readMask: LOCATION_READ_MASK }),
  );
}

export async function getGoogleUpdated(ctx, reference) {
  return read(
    ctx,
    withQuery(`${INFO_API}/${locationName(reference)}:getGoogleUpdated`, {
      readMask: LOCATION_READ_MASK,
    }),
  );
}

export async function getLocationView(ctx, reference) {
  const merchant = await getLocation(ctx, reference);
  const updated = await getGoogleUpdated(ctx, reference);
  return {
    merchant,
    live: updated.location ?? null,
    hasPendingEdits: hasPendingEdits(merchant),
    diffMask: updated.diffMask ?? null,
    pendingMask: updated.pendingMask ?? null,
  };
}

export async function listReviews(ctx, v4Name) {
  const reviews = await readAllPages(
    ctx,
    `${V4_API}/${v4Location(v4Name)}/reviews`,
    'reviews',
    {
      pageSize: 50,
    },
  );
  return reviews.map((review) => ({
    ...review,
    replyState: review.reviewReply ? 'replied' : 'none',
  }));
}

export async function getReview(ctx, v4Name, reviewId) {
  return read(
    ctx,
    `${V4_API}/${v4Location(v4Name)}/reviews/${resourceId(reviewId, 'reviewId')}`,
  );
}

export async function listPosts(ctx, v4Name) {
  return readAllPages(ctx, `${V4_API}/${v4Location(v4Name)}/localPosts`, 'localPosts', {
    pageSize: 100,
  });
}

function dateParams(prefix, value) {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Invalid date: expected YYYY-MM-DD');
  return {
    [`${prefix}.year`]: Number(match[1]),
    [`${prefix}.month`]: Number(match[2]),
    [`${prefix}.day`]: Number(match[3]),
  };
}

export async function getPerformance(ctx, reference, { startDate, endDate } = {}) {
  const url = withQuery(
    `${PERFORMANCE_API}/${locationName(reference)}:fetchMultiDailyMetricsTimeSeries`,
    {
      dailyMetrics: PERFORMANCE_METRICS,
      ...dateParams('dailyRange.startDate', startDate),
      ...dateParams('dailyRange.endDate', endDate),
    },
  );
  const data = await read(ctx, url);
  return data.multiDailyMetricTimeSeries ?? [];
}

function webProtocol(value) {
  try {
    return new URL(value).protocol;
  } catch {
    return null;
  }
}

export function assertWebAddress(value, label) {
  if (!['https:', 'http:'].includes(webProtocol(value))) {
    throw new Error(`${label} must be an http or https address`);
  }
  return value;
}

export function buildLocationEdit(edits, current) {
  const supplied = Object.keys(edits ?? {});
  if (supplied.length === 0) throw new Error('Location edit has no editable fields');
  const unknown = supplied.filter((key) => !LOCATION_EDIT_FIELDS.includes(key));
  if (unknown.length > 0) {
    throw new Error(`Location edit has unsupported fields: ${unknown.join(', ')}`);
  }

  const body = {};
  const fields = [];
  if ('websiteUri' in edits) {
    body.websiteUri = assertWebAddress(edits.websiteUri, 'websiteUri');
    fields.push('websiteUri');
  }
  if ('description' in edits) {
    body.profile = { description: edits.description };
    fields.push('profile.description');
  }
  if ('phoneNumbers' in edits) {
    body.phoneNumbers = { ...current.phoneNumbers, ...edits.phoneNumbers };
    fields.push('phoneNumbers');
  }
  if ('categories' in edits) {
    body.categories = { ...current.categories, ...edits.categories };
    fields.push('categories');
  }
  if ('specialHours' in edits) {
    if (!edits.regularHours && !current.regularHours) {
      throw new Error(
        'Special hours need regular hours, and this location has no regular hours',
      );
    }
    body.specialHours = edits.specialHours;
    fields.push('specialHours');
  }
  if ('regularHours' in edits || 'specialHours' in edits) {
    body.regularHours = edits.regularHours ?? current.regularHours;
    fields.push('regularHours');
  }
  return { body, fields, updateMask: fields.join(',') };
}

async function write(ctx, method, url, body) {
  const result = await send(ctx, { method, url, body, lenient: true });
  if (result.error) throw result.error;
  return result.value;
}

function maskedLocationUrl(reference, updateMask, extra = {}) {
  if (!updateMask) throw new Error('Location write needs an updateMask');
  return withQuery(`${INFO_API}/${locationName(reference)}`, { updateMask, ...extra });
}

export async function validateLocationEdit(ctx, reference, body, updateMask) {
  await write(
    ctx,
    'PATCH',
    maskedLocationUrl(reference, updateMask, { validateOnly: true }),
    body,
  );
  return { valid: true };
}

export async function patchLocation(ctx, reference, body, updateMask) {
  return write(ctx, 'PATCH', maskedLocationUrl(reference, updateMask), body);
}

export async function updateReviewReply(ctx, v4Name, reviewId, comment) {
  const url = `${V4_API}/${v4Location(v4Name)}/reviews/${resourceId(reviewId, 'reviewId')}/reply`;
  return write(ctx, 'PUT', url, { comment });
}

export async function createLocalPost(ctx, v4Name, post) {
  return write(ctx, 'POST', `${V4_API}/${v4Location(v4Name)}/localPosts`, post);
}
