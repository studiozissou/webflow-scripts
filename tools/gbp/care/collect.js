// Reads reviews, posts, hours and performance for one care client and builds the facts a weekly pack needs, with no writes.
import {
  GbpApiError,
  buildLocationEdit,
  getLocation,
  getPerformance,
  listPosts,
  listReviews,
  resolveLocation,
  validateLocationEdit,
} from '../client.js';
import {
  fromGoogleRegularHours,
  fromGoogleSpecialPeriods,
  toGoogleRegularHours,
  toGoogleSpecialPeriods,
} from './config.js';
import { DAY_MS, timeOf } from './pack.js';

const RECENT_POSTS = 8;
const INSIGHTS_FROM_DAY = 5;
const TRANSLATED_PREFIX = '(Translated by Google) ';
const ORIGINAL_SEPARATOR = '\n\n(Original)\n';
const TRANSLATION_SEPARATOR = '\n\n(Translated by Google)\n';
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const IMPRESSION_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
];

const toMs = (now) => {
  if (typeof now === 'function') return toMs(now());
  if (now instanceof Date) return now.getTime();
  return Number(now);
};
const isoDate = (now) => new Date(toMs(now)).toISOString().slice(0, 10);

export function originalText(comment) {
  if (typeof comment !== 'string') return '';
  if (comment.startsWith(TRANSLATED_PREFIX) && comment.includes(ORIGINAL_SEPARATOR)) {
    return comment
      .slice(comment.indexOf(ORIGINAL_SEPARATOR) + ORIGINAL_SEPARATOR.length)
      .trim();
  }
  if (comment.includes(TRANSLATION_SEPARATOR)) {
    return comment.slice(0, comment.indexOf(TRANSLATION_SEPARATOR)).trim();
  }
  return comment.trim();
}

export function unansweredReviews(reviews = []) {
  return reviews
    .filter((review) => !review.reviewReply)
    .map((review) => {
      const text = originalText(review.comment);
      return {
        reviewId: review.reviewId,
        starRating: review.starRating,
        text,
        starOnly: text === '',
        createTime: review.createTime,
      };
    })
    .sort((a, b) => timeOf(a.createTime) - timeOf(b.createTime));
}

export function reviewStats(reviews = []) {
  const ratings = reviews.map((review) => STARS[review.starRating]).filter(Boolean);
  const averageRating =
    ratings.length === 0
      ? null
      : Math.round(
          (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 100,
        ) / 100;
  return { totalReviewCount: reviews.length, averageRating };
}

export function postStatus(posts = [], now = Date.now) {
  const sorted = [...posts].sort((a, b) => timeOf(b.createTime) - timeOf(a.createTime));
  const newest = sorted[0];
  const latest = newest
    ? {
        name: newest.name,
        state: newest.state,
        createTime: newest.createTime,
        summary: newest.summary ?? '',
      }
    : null;
  return {
    latest,
    daysSinceLast: latest
      ? Math.floor((toMs(now) - timeOf(latest.createTime)) / DAY_MS)
      : null,
    recentSummaries: sorted
      .filter((post) => typeof post.summary === 'string' && post.summary.trim())
      .slice(0, RECENT_POSTS)
      .map((post) => post.summary),
    rejected: latest?.state === 'REJECTED',
  };
}

const describePeriod = (entry) =>
  entry.closed ? 'closed' : `${entry.open}-${entry.close}`;

const describeList = (entries) =>
  entries.length === 0 ? 'not set' : entries.map(describePeriod).join(', ');

function regularByDay(entries) {
  const byDay = new Map();
  for (const entry of entries) {
    const label = `${entry.open}-${entry.close}${entry.closeDay ? ` (${entry.closeDay})` : ''}`;
    byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), label]);
  }
  return byDay;
}

function regularChanges(liveEntries, configEntries) {
  const live = regularByDay(liveEntries);
  const wanted = regularByDay(configEntries);
  const days = [...new Set([...live.keys(), ...wanted.keys()])];
  return days
    .filter(
      (day) => (live.get(day) ?? []).join(', ') !== (wanted.get(day) ?? []).join(', '),
    )
    .map(
      (day) =>
        `Regular hours ${day}: ${(live.get(day) ?? ['closed']).join(', ')} -> ${(wanted.get(day) ?? ['closed']).join(', ')}`,
    );
}

function groupByDate(entries) {
  const byDate = new Map();
  for (const entry of entries)
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  return byDate;
}

function specialChanges(liveFuture, merged) {
  const live = groupByDate(liveFuture);
  const wanted = groupByDate(merged);
  const dates = [...new Set([...live.keys(), ...wanted.keys()])].sort();
  return dates
    .filter(
      (date) =>
        describeList(live.get(date) ?? []) !== describeList(wanted.get(date) ?? []),
    )
    .map(
      (date) =>
        `Special hours ${date}: ${describeList(live.get(date) ?? [])} -> ${describeList(wanted.get(date) ?? [])}`,
    );
}

const stripConfirm = ({ confirm: _confirm, ...entry }) => entry;
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function hoursProposal(configHours, merchant = {}, today) {
  const regular = configHours?.regular ?? [];
  const special = configHours?.special ?? [];
  const edits = {};
  const changes = [];
  const ownerChecks = [];

  if (regular.length > 0) {
    const liveEntries = fromGoogleRegularHours(merchant.regularHours);
    const wanted = toGoogleRegularHours(regular);
    if (!sameJson(toGoogleRegularHours(liveEntries), wanted)) {
      edits.regularHours = wanted;
      changes.push(...regularChanges(liveEntries, fromGoogleRegularHours(wanted)));
    }
  }

  if (special.length > 0) {
    const liveFuture = fromGoogleSpecialPeriods(
      merchant.specialHours?.specialHourPeriods,
    ).filter((entry) => entry.date >= today);
    const future = special.filter((entry) => entry.date >= today);
    const unconfirmed = future.filter((entry) => entry.confirm === false);
    const unconfirmedDates = new Set(unconfirmed.map((entry) => entry.date));
    for (const entry of unconfirmed) {
      const current = liveFuture.filter((live) => live.date === entry.date);
      ownerChecks.push(
        `Owner check ${entry.date}: config says ${describePeriod(entry)}, Google shows ${describeList(current)}; confirm with the owner, then set confirm to true`,
      );
    }
    const merged = fromGoogleSpecialPeriods(
      toGoogleSpecialPeriods([
        ...future.filter((entry) => entry.confirm !== false).map(stripConfirm),
        ...liveFuture.filter((entry) => unconfirmedDates.has(entry.date)),
      ]),
    );
    if (!sameJson(merged, liveFuture)) {
      edits.specialHours = { specialHourPeriods: toGoogleSpecialPeriods(merged) };
      changes.push(...specialChanges(liveFuture, merged));
    }
  }

  const hasEdits = Object.keys(edits).length > 0;
  if (!hasEdits && ownerChecks.length === 0) return null;
  return {
    edits: hasEdits ? edits : null,
    before: {
      regularHours: merchant.regularHours ?? null,
      specialHours: merchant.specialHours ?? null,
    },
    changes,
    ownerChecks,
  };
}

export async function validateHours(ctx, location, proposal, merchant) {
  if (!proposal?.edits) return { valid: false, error: 'No hours edits to validate' };
  let edit;
  try {
    edit = buildLocationEdit(proposal.edits, merchant ?? {});
  } catch (err) {
    return { valid: false, error: err.message };
  }
  try {
    await validateLocationEdit(ctx, location, edit.body, edit.updateMask);
  } catch (err) {
    if (err instanceof GbpApiError) return { valid: false, error: err.message };
    throw err;
  }
  return {
    valid: true,
    body: edit.body,
    updateMask: edit.updateMask,
    fields: edit.fields,
  };
}

function metricTotals(series) {
  const totals = {};
  for (const group of series ?? []) {
    for (const item of group.dailyMetricTimeSeries ?? []) {
      const sum = (item.timeSeries?.datedValues ?? []).reduce(
        (total, entry) => total + (Number(entry.value) || 0),
        0,
      );
      totals[item.dailyMetric] = (totals[item.dailyMetric] ?? 0) + sum;
    }
  }
  return {
    calls: totals.CALL_CLICKS ?? 0,
    websiteClicks: totals.WEBSITE_CLICKS ?? 0,
    directionRequests: totals.BUSINESS_DIRECTION_REQUESTS ?? 0,
    impressions: IMPRESSION_METRICS.reduce(
      (sum, metric) => sum + (totals[metric] ?? 0),
      0,
    ),
  };
}

export function monthlyInsights(seriesThisMonth, seriesPrevMonth) {
  const current = metricTotals(seriesThisMonth);
  const previous = metricTotals(seriesPrevMonth);
  const change = Object.fromEntries(
    Object.keys(current).map((key) => [key, current[key] - previous[key]]),
  );
  return { ...current, previous, change };
}

function shiftMonth(month, by) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

function monthRange(month) {
  const [year, number] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export async function collectInsights(ctx, location, monthStart) {
  if (typeof monthStart !== 'string' || !/^\d{4}-\d{2}$/.test(monthStart)) {
    throw new Error('Insights month must be YYYY-MM');
  }
  try {
    const thisMonth = await getPerformance(ctx, location, monthRange(monthStart));
    const prevMonth = await getPerformance(
      ctx,
      location,
      monthRange(shiftMonth(monthStart, -1)),
    );
    return { month: monthStart, ...monthlyInsights(thisMonth, prevMonth) };
  } catch (err) {
    if (err instanceof GbpApiError)
      return { month: monthStart, unavailable: err.message };
    throw err;
  }
}

export function needsInsights(today, priorInsightMonths = []) {
  const day = Number(today.slice(8, 10));
  if (day < INSIGHTS_FROM_DAY) return false;
  return !priorInsightMonths.includes(shiftMonth(today.slice(0, 7), -1));
}

export async function collect({ ctx, config, now = Date.now, wantInsights = false }) {
  const resolved = await resolveLocation(ctx, config.location);
  const location = {
    name: resolved.name,
    title: resolved.title,
    v4Name: resolved.v4Name,
  };
  const merchant = await getLocation(ctx, location.name);
  const reviews = await listReviews(ctx, location.v4Name);
  const posts = await listPosts(ctx, location.v4Name);
  const today = isoDate(now);
  return {
    location,
    merchant,
    reviews: { unanswered: unansweredReviews(reviews), ...reviewStats(reviews) },
    posts: postStatus(posts, now),
    hours: hoursProposal(config.hours, merchant, today),
    insights: wantInsights
      ? await collectInsights(ctx, location.name, shiftMonth(today.slice(0, 7), -1))
      : null,
  };
}
