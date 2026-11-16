// Scores a Google Business Profile out of 12 for map-pack best practice, with unknown points, NAP matching and map-pack ranks from DataForSEO data.
import { readFileSync } from 'node:fs';
import { decodeEntities, extractPostcode, normaliseDomain, normalisePhone, normalisePostcode } from './text.js';

const DAY_MS = 86_400_000;
const UNKNOWN = 'unknown';
const RECENT_DAYS = 90;
const MIN_REVIEWS_FOR_RATIO = 5;

const TYPES = JSON.parse(readFileSync(new URL('./types.json', import.meta.url), 'utf8'));

const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

export const cleanType = (type) => norm(String(type ?? '').replace(/\([^)]*\)/g, ' '));

export function lookupType(type) {
  return TYPES[cleanType(type)] ?? null;
}

export function categoryMatches(category, type) {
  const entry = lookupType(type);
  if (!entry) return UNKNOWN;
  if (!category) return false;
  return entry.categories.includes(norm(category));
}

export function napMatch(site, info) {
  if (!site || !info) return null;
  const pairs = [
    [normalisePhone(site.phone), normalisePhone(info.phone ?? info.contact_info?.find((c) => c.type === 'telephone')?.value)],
    [normalisePostcode(site.postcode), normalisePostcode(info.address_info?.zip) ?? extractPostcode(info.address)],
  ].filter(([a, b]) => a && b);
  if (!pairs.length) return null;
  return pairs.every(([a, b]) => a === b);
}

export function closedStatus(info) {
  const status = info?.work_time?.work_hours?.current_status;
  if (status === 'closed_forever') return 'permanently';
  if (status === 'temporarily_closed') return 'temporarily';
  return null;
}

const byRank = (items) => [...(items ?? [])].sort((a, b) => (a.rank_group ?? Infinity) - (b.rank_group ?? Infinity));

export function competitorReviewCounts(items, domain) {
  const own = normaliseDomain(domain);
  return byRank(items)
    .filter((item) => normaliseDomain(item.domain) !== own)
    .slice(0, 3)
    .map((item) => item.rating?.votes_count ?? 0);
}

export function mapPackRanks(searches, domain) {
  const own = normaliseDomain(domain);
  return (searches ?? []).map(({ role, query, items }) => {
    const hit = byRank(items).find((item) => normaliseDomain(item.domain) === own);
    const position = hit && hit.rank_group <= 20 ? hit.rank_group : '>20';
    return role ? { role, query, position } : { query, position };
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function parseTimestamp(ts) {
  if (!ts) return NaN;
  const iso = String(ts).replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?) ?([+-]\d{2}:\d{2}|Z)?$/, (_, d, t, z) => `${d}T${t}${z ?? 'Z'}`);
  return new Date(iso).getTime();
}

function reviewChecks(reviews, now) {
  if (!Array.isArray(reviews)) return { recentReview: UNKNOWN, replyRatio: UNKNOWN };
  const dated = reviews.map((r) => ({ r, t: parseTimestamp(r.timestamp) })).filter((x) => !Number.isNaN(x.t));
  const recentReview = dated.some(({ t }) => now.getTime() - t <= RECENT_DAYS * DAY_MS);
  if (reviews.length < MIN_REVIEWS_FOR_RATIO) return { recentReview, replyRatio: UNKNOWN };
  const newest = dated.sort((a, b) => b.t - a.t).slice(0, 10);
  const replied = newest.filter(({ r }) => r.owner_answer).length;
  return { recentReview, replyRatio: newest.length > 0 && replied / newest.length >= 0.5 };
}

export function scoreGbp({ info, type, siteDomain, site, competitors, reviews, now = new Date() }) {
  if (!info) return { points: 0, max: 0, unknown: 12, display: 'unmatched', checks: {} };
  const nap = napMatch(site, info);
  const websiteDomain = normaliseDomain(info.domain ?? info.url);
  const checks = {
    claimed: info.is_claimed === true,
    category: categoryMatches(info.category, type),
    secondaryCategory: Array.isArray(info.additional_categories) && info.additional_categories.length > 0,
    rating: (info.rating?.value ?? 0) >= 4.3,
    reviewCount: competitors?.length ? (info.rating?.votes_count ?? 0) >= median(competitors) : UNKNOWN,
    ...reviewChecks(reviews, now),
    photos: (info.total_photos ?? 0) >= 20,
    hours: Boolean(info.work_time?.work_hours?.timetable),
    description: Boolean(info.description?.trim()),
    website: Boolean(websiteDomain) && websiteDomain === normaliseDomain(siteDomain),
    nap: nap === null ? UNKNOWN : nap,
  };
  const values = Object.values(checks);
  const unknown = values.filter((v) => v === UNKNOWN).length;
  const points = values.filter((v) => v === true).length;
  const max = 12 - unknown;
  const display = unknown ? `${points}/${max} (${unknown} unknown)` : `${points}/${max}`;
  return { points, max, unknown, display, checks };
}

export function buildGbp({ info, type, siteDomain, site, reviews, now = new Date(), searches = [] }) {
  if (!info) {
    return {
      matched: false, status: 'unmatched', cid: null, name: null, closed: null, websiteUrl: null,
      needsChromeCheck: true, placeTopics: null, score: scoreGbp({ info: null }), ranks: [],
    };
  }
  const competitors = searches[0] ? competitorReviewCounts(searches[0].items, siteDomain) : [];
  return {
    matched: true,
    status: 'matched',
    cid: info.cid ?? null,
    name: info.title ? decodeEntities(info.title) : null,
    closed: closedStatus(info),
    websiteUrl: info.url ?? null,
    needsChromeCheck: false,
    placeTopics: info.place_topics ?? null,
    score: scoreGbp({ info, type, siteDomain, site, competitors, reviews, now }),
    ranks: mapPackRanks(searches, siteDomain),
  };
}
