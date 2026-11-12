// Covers the GBP map-pack score out of 12 with unknown points, category matching against the row type, NAP normalisation of phone and postcode, closed status, competitor review counts and map-pack rank from 3 searches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryMatches, napMatch, lookupType, cleanType,
  closedStatus, competitorReviewCounts, mapPackRanks, scoreGbp, buildGbp,
} from '../../tools/outreach/gbp.js';
import { normalisePhone, normalisePostcode, extractPostcode } from '../../tools/outreach/text.js';
import { NOW, daysAgo, firstItems } from './helpers.js';

const INFO = firstItems('business-info')[0];
const REVIEWS = firstItems('reviews');
const SERP = firstItems('maps-serp');
const DOMAIN = 'trattoria-fittizia.test';
const SITE = { phone: '+31705550123', postcode: '2599ZZ' };
const COMPETITORS = [500, 300, 150];

const base = (over = {}) => ({ info: INFO, type: 'Italian restaurant', siteDomain: DOMAIN, site: SITE, competitors: COMPETITORS, reviews: REVIEWS, now: NOW, ...over });
const withInfo = (patch) => ({ ...INFO, ...patch });

test('normalisePhone turns Dutch formats into E.164', () => {
  for (const raw of ['+31 70 555 0123', '070-555 01 23', '(070) 5550123', '0031 70 5550123', '+31 (0)70 555 0123', '+31705550123']) {
    assert.equal(normalisePhone(raw), '+31705550123', raw);
  }
  assert.equal(normalisePhone('06 1234 5678'), '+31612345678');
  assert.equal(normalisePhone(null), null);
  assert.equal(normalisePhone(''), null);
});

test('normalisePostcode and extractPostcode give 1234AB', () => {
  assert.equal(normalisePostcode('2599 zz'), '2599ZZ');
  assert.equal(normalisePostcode('2599ZZ'), '2599ZZ');
  assert.equal(normalisePostcode(null), null);
  assert.equal(extractPostcode('Verzinstraat 12, 2599 ZZ Den Haag'), '2599ZZ');
  assert.equal(extractPostcode('Verzinstraat 12, Den Haag'), null);
});

test('categoryMatches accepts mapped nl and en Google categories, case blind', () => {
  assert.equal(categoryMatches('Italian restaurant', 'italian restaurant '), true);
  assert.equal(categoryMatches('Italiaans restaurant', 'Italian restaurant'), true);
  assert.equal(categoryMatches('Wijnbar', 'Wine Bar'), true);
  assert.equal(categoryMatches('Dierenarts', 'vet'), true);
  assert.equal(categoryMatches('Animal hospital', 'vet (check)'), true);
  assert.equal(categoryMatches('Restaurant', 'Wine bar'), false);
  assert.equal(categoryMatches(null, 'Wine bar'), false);
});

test('categoryMatches is unknown for a type with no mapping', () => {
  assert.equal(categoryMatches('Bakery', 'kite shop'), 'unknown');
  assert.equal(categoryMatches('Bakery', null), 'unknown');
});

test('types.json maps every seed type to a Dutch search term and lowercase categories', () => {
  const types = ['lunchroom', 'wine shop', 'bakery', 'moldovan restaurant', 'greek deli', 'vet', 'bistro', 'restaurant', 'cafe', 'italian restaurant', 'vegan toko', 'wine bar', 'coffee roaster', 'italian deli', 'barber', 'concept store', 'bookshop', 'supper club', 'mexican restaurant', 'indonesian restaurant', 'event venue', 'listening bar', 'neighbourhood cafe'];
  for (const type of types) {
    const entry = lookupType(type);
    assert.ok(entry, type);
    assert.ok(entry.nl, `${type} nl`);
    assert.ok(entry.categories.length > 0, `${type} categories`);
    assert.ok(entry.categories.every((c) => c === c.toLowerCase()), `${type} lowercase`);
  }
  assert.equal(lookupType('vet').nl, 'dierenarts');
  assert.equal(lookupType('wine shop').nl, 'wijnwinkel');
  assert.equal(lookupType('Barber (check)').nl, 'barbier');
  assert.equal(lookupType('coffee roaster').nl, 'koffiebranderij');
  assert.equal(cleanType('Coffee  roaster (check)'), 'coffee roaster');
  assert.equal(lookupType('kite shop'), null);
});

test('scoreGbp: a secondary category matching the type does not earn the primary category point', () => {
  const s = scoreGbp(base({ type: 'wine bar', info: withInfo({ category: 'Restaurant', additional_categories: ['Wine bar'] }) }));
  assert.equal(s.checks.category, false);
  assert.equal(s.checks.secondaryCategory, true);
});

test('scoreGbp: an unmapped type makes the category point unknown', () => {
  const s = scoreGbp(base({ type: 'kite shop' }));
  assert.equal(s.checks.category, 'unknown');
  assert.equal(s.unknown, 1);
});

test('napMatch compares normalised phone and postcode, null when nothing to compare', () => {
  assert.equal(napMatch(SITE, INFO), true);
  assert.equal(napMatch({ phone: '+31705559999', postcode: '2599ZZ' }, INFO), false);
  assert.equal(napMatch({ phone: null, postcode: '2511AA' }, INFO), false);
  assert.equal(napMatch({ phone: null, postcode: '2599ZZ' }, INFO), true);
  assert.equal(napMatch({ phone: null, postcode: null }, INFO), null);
  assert.equal(napMatch({ phone: '070 555 0123', postcode: '2599 zz' }, withInfo({ address_info: null })), true);
});

test('closedStatus reads work_time.work_hours.current_status', () => {
  assert.equal(closedStatus(INFO), null);
  assert.equal(closedStatus(withInfo({ work_time: { work_hours: { timetable: null, current_status: 'closed_forever' } } })), 'permanently');
  assert.equal(closedStatus(withInfo({ work_time: { work_hours: { timetable: null, current_status: 'temporarily_closed' } } })), 'temporarily');
  assert.equal(closedStatus(withInfo({ work_time: null })), null);
});

test('competitorReviewCounts takes the top 3 other businesses in the main search', () => {
  assert.deepEqual(competitorReviewCounts(SERP, DOMAIN), [500, 300, 150]);
  assert.deepEqual(competitorReviewCounts(SERP, 'pasta-immaginaria.test'), [300, 150, 90]);
});

test('mapPackRanks records 1-20 by domain (www. stripped) or >20 for 3 searches', () => {
  const second = SERP.map((item) => ({ ...item, rank_group: item.domain?.includes('trattoria') ? 2 : item.rank_group + 2 }));
  const absent = SERP.filter((item) => !item.domain?.includes('trattoria'));
  const deep = [{ ...SERP[4], rank_group: 25, rank_absolute: 25 }];
  const ranks = mapPackRanks([
    { query: 'italiaans restaurant den haag', items: SERP },
    { query: 'pizza centrum', items: second },
    { query: 'pasta den haag', items: absent },
  ], DOMAIN);
  assert.deepEqual(ranks, [
    { query: 'italiaans restaurant den haag', position: 5 },
    { query: 'pizza centrum', position: 2 },
    { query: 'pasta den haag', position: '>20' },
  ]);
  assert.deepEqual(mapPackRanks([{ query: 'diep', items: deep }], DOMAIN), [{ query: 'diep', position: '>20' }]);
  assert.deepEqual(mapPackRanks([{ role: 'area', query: 'diep', items: deep }], DOMAIN), [{ role: 'area', query: 'diep', position: '>20' }]);
});

test('scoreGbp scores the fixture profile 11/12, missing only the review-count point', () => {
  const s = scoreGbp(base());
  assert.equal(s.points, 11);
  assert.equal(s.max, 12);
  assert.equal(s.unknown, 0);
  assert.equal(s.display, '11/12');
  assert.deepEqual(s.checks, {
    claimed: true, category: true, secondaryCategory: true, rating: true, reviewCount: false, recentReview: true,
    replyRatio: true, photos: true, hours: true, description: true, website: true, nap: true,
  });
});

test('scoreGbp shows timed-out review points as unknown, e.g. 7/10 (2 unknown)', () => {
  const thin = withInfo({ is_claimed: false, description: null });
  const s = scoreGbp(base({ info: thin, reviews: null }));
  assert.equal(s.checks.recentReview, 'unknown');
  assert.equal(s.checks.replyRatio, 'unknown');
  assert.equal(s.points, 7);
  assert.equal(s.max, 10);
  assert.equal(s.unknown, 2);
  assert.equal(s.display, '7/10 (2 unknown)');
});

test('scoreGbp: no competitor data and no comparable NAP are unknown, not 0', () => {
  const s = scoreGbp(base({ competitors: [], site: { phone: null, postcode: null } }));
  assert.equal(s.checks.reviewCount, 'unknown');
  assert.equal(s.checks.nap, 'unknown');
  assert.equal(s.unknown, 2);
});

test('scoreGbp category point needs the primary category to match the row type', () => {
  assert.equal(scoreGbp(base({ type: 'Wine bar' })).checks.category, false);
  assert.equal(scoreGbp(base({ info: withInfo({ additional_categories: [] }) })).checks.secondaryCategory, false);
  assert.equal(scoreGbp(base({ info: withInfo({ additional_categories: null }) })).checks.secondaryCategory, false);
});

test('scoreGbp thresholds: rating 4.3, 20 photos, review count at the competitor median', () => {
  const rating = (value) => scoreGbp(base({ info: withInfo({ rating: { ...INFO.rating, value } }) })).checks.rating;
  assert.equal(rating(4.3), true);
  assert.equal(rating(4.29), false);
  assert.equal(rating(null), false);
  const photos = (n) => scoreGbp(base({ info: withInfo({ total_photos: n }) })).checks.photos;
  assert.equal(photos(20), true);
  assert.equal(photos(19), false);
  const votes = (n) => scoreGbp(base({ info: withInfo({ rating: { ...INFO.rating, votes_count: n } }) })).checks.reviewCount;
  assert.equal(votes(300), true);
  assert.equal(votes(299), false);
});

test('scoreGbp hours, description and website points', () => {
  assert.equal(scoreGbp(base({ info: withInfo({ work_time: { work_hours: { timetable: null, current_status: null } } }) })).checks.hours, false);
  assert.equal(scoreGbp(base({ info: withInfo({ description: '' }) })).checks.description, false);
  assert.equal(scoreGbp(base({ info: withInfo({ url: null, domain: null }) })).checks.website, false);
  assert.equal(scoreGbp(base({ info: withInfo({ url: 'https://ander-domein.test/', domain: 'ander-domein.test' }) })).checks.website, false);
});

test('scoreGbp recent review means one in the last 90 days', () => {
  const at = (ts) => REVIEWS.map((r) => ({ ...r, timestamp: ts }));
  assert.equal(scoreGbp(base({ reviews: at('2026-09-01 10:00:00 +00:00') })).checks.recentReview, true);
  assert.equal(scoreGbp(base({ reviews: at('2026-08-01 10:00:00 +00:00') })).checks.recentReview, false);
  assert.equal(scoreGbp(base({ reviews: [] })).checks.recentReview, false);
});

test('scoreGbp reply ratio is unknown with fewer than 5 reviews fetched', () => {
  const four = REVIEWS.slice(0, 4);
  assert.equal(scoreGbp(base({ reviews: four })).checks.replyRatio, 'unknown');
  assert.equal(scoreGbp(base({ reviews: [] })).checks.replyRatio, 'unknown');
  assert.notEqual(scoreGbp(base({ reviews: REVIEWS.slice(0, 5) })).checks.replyRatio, 'unknown');
});

test('scoreGbp reply ratio uses the 10 newest reviews, and needs 50%+', () => {
  const review = (days, answered) => ({ type: 'google_reviews_search', review_text: 'x', rating: { value: 5 }, timestamp: daysAgo(days).replace('T', ' ').replace(/\.\d+Z$/, ' +00:00'), owner_answer: answered ? 'Dank!' : null });
  const twelve = [
    ...Array.from({ length: 4 }, (_, i) => review(i + 1, true)),
    ...Array.from({ length: 6 }, (_, i) => review(i + 10, false)),
    review(200, true), review(210, true),
  ].reverse();
  assert.equal(scoreGbp(base({ reviews: twelve })).checks.replyRatio, false);
  const five = Array.from({ length: 10 }, (_, i) => review(i + 1, i % 2 === 0));
  assert.equal(scoreGbp(base({ reviews: five })).checks.replyRatio, true);
});

test('scoreGbp with no matched profile is unmatched and fully unknown', () => {
  const s = scoreGbp(base({ info: null }));
  assert.equal(s.points, 0);
  assert.equal(s.max, 0);
  assert.equal(s.unknown, 12);
  assert.equal(s.display, 'unmatched');
});

test('buildGbp assembles the matched profile for triage', () => {
  const g = buildGbp({ info: INFO, type: 'Italian restaurant', siteDomain: DOMAIN, site: SITE, reviews: REVIEWS, now: NOW, searches: [{ query: 'italiaans restaurant den haag', items: SERP }] });
  assert.equal(g.matched, true);
  assert.equal(g.cid, '1234567890123456789');
  assert.equal(g.name, 'Trattoria Fittizia');
  assert.equal(g.closed, null);
  assert.equal(g.websiteUrl, 'https://www.trattoria-fittizia.test/');
  assert.equal(g.needsChromeCheck, false);
  assert.equal(g.score.display, '11/12', 'competitors come from the first (main) search');
  assert.deepEqual(g.ranks, [{ query: 'italiaans restaurant den haag', position: 5 }]);
});

test('buildGbp decodes HTML entities in the profile title', () => {
  const g = buildGbp({ info: withInfo({ title: 'Gelateria Inventata&#x27;s' }), type: 'Italian restaurant', siteDomain: DOMAIN, site: SITE, reviews: REVIEWS, now: NOW, searches: [] });
  assert.equal(g.name, "Gelateria Inventata's");
});

test('buildGbp with no profile is unmatched, flagged for a Chrome check, with no ranks', () => {
  const g = buildGbp({ info: null, type: 'Italian restaurant', siteDomain: DOMAIN, site: SITE, reviews: null, now: NOW, searches: [] });
  assert.equal(g.matched, false);
  assert.equal(g.status, 'unmatched');
  assert.equal(g.needsChromeCheck, true);
  assert.equal(g.cid, null);
  assert.equal(g.score.display, 'unmatched');
  assert.deepEqual(g.ranks, []);
});
