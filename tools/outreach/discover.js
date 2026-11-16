// Finds lookalike businesses with Maps searches by type x area on a 4-week rotation, drops chains, seen domains and items without a website, and keeps the top N by a "likely needs help" pre-score.
import { BudgetExceeded, ENDPOINTS, firstItems } from './dataforseo.js';
import { MAPS_DEFAULTS } from './resolve.js';
import { decodeEntities, normaliseDomain } from './text.js';
import { cleanType, lookupType } from './gbp.js';

export const ROTATION_DAYS = 28;
export const DEFAULT_LIMIT = 20;
export const CHAIN_LOCATIONS = 3;

const BUILDER_HOSTS = ['wixsite.com', 'jimdofree.com', 'jimdosite.com', 'jimdo.com', 'squarespace.com', 'wordpress.com', 'weebly.com', 'webnode.nl', 'webnode.page', 'business.site', 'webflow.io', 'strikingly.com', 'site123.me'];
const DAY_MS = 86_400_000;

export function areasForPostcodes(areas, postcodes) {
  const prefixes = new Set((postcodes ?? []).map((p) => String(p ?? '').replace(/\s/g, '').slice(0, 4)).filter((p) => /^\d{4}$/.test(p)));
  return areas.filter((a) => (a.postcodes ?? []).some((p) => prefixes.has(String(p).slice(0, 4)))).map((a) => a.name);
}

export function planQueries({ types, areas, history = {}, now = new Date(), max }) {
  const cutoff = new Date(now).getTime() - ROTATION_DAYS * DAY_MS;
  const seen = new Set();
  const pairs = [];
  for (const type of types) {
    for (const area of areas) {
      const term = lookupType(type)?.nl ?? cleanType(type);
      const query = `${term} ${area}`.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(query)) continue;
      seen.add(query);
      pairs.push({ type, area, query, last: history[query] ? Date.parse(history[query]) : -Infinity });
    }
  }
  const cap = max ?? Math.ceil(pairs.length / (ROTATION_DAYS / 7));
  return pairs
    .filter((p) => p.last <= cutoff)
    .sort((a, b) => a.last - b.last)
    .slice(0, cap)
    .map(({ type, area, query }) => ({ type, area, query }));
}

export function isChain(item, { chains = [], counts = {} } = {}) {
  const domain = normaliseDomain(item.domain ?? item.url);
  const label = domain?.split('.')[0];
  const title = decodeEntities(String(item.title ?? '')).toLowerCase();
  if ((counts[domain] ?? 0) >= CHAIN_LOCATIONS) return true;
  return chains.some((raw) => {
    const entry = String(raw).toLowerCase().trim();
    if (!entry) return false;
    if (entry.includes('.')) return domain === normaliseDomain(entry);
    return label === entry || title.includes(entry);
  });
}

export function preScore(item) {
  const domain = normaliseDomain(item.domain ?? item.url) ?? '';
  const votes = item.rating?.votes_count ?? 0;
  const thin = item.is_claimed === false || (item.total_photos ?? 0) < 20;
  const builder = BUILDER_HOSTS.some((host) => domain === host || domain.endsWith(`.${host}`));
  return (thin && votes >= 50 ? 2 : 0) + (thin ? 1 : 0) + (builder ? 2 : 0);
}

export function selectCandidates(searches, { chains = [], exclude = [], limit = DEFAULT_LIMIT } = {}) {
  const cids = {};
  for (const { items } of searches) {
    for (const item of items ?? []) {
      const domain = normaliseDomain(item.domain ?? item.url);
      if (!domain) continue;
      (cids[domain] ??= new Set()).add(String(item.cid ?? item.title));
    }
  }
  const counts = Object.fromEntries(Object.entries(cids).map(([d, set]) => [d, set.size]));
  const excluded = new Set(exclude.map((d) => normaliseDomain(d)).filter(Boolean));
  const picked = new Map();
  for (const { type, area, query, items } of searches) {
    for (const item of items ?? []) {
      const domain = normaliseDomain(item.domain ?? item.url);
      if (!domain || picked.has(domain) || excluded.has(domain) || isChain(item, { chains, counts })) continue;
      picked.set(domain, {
        url: item.url ?? `https://${item.domain}/`,
        domain,
        source: 'lookalike',
        type,
        area,
        query,
        cid: item.cid == null ? null : String(item.cid),
        name: decodeEntities(String(item.title ?? '')).trim() || null,
        preScore: preScore(item),
        votes: item.rating?.votes_count ?? 0,
      });
    }
  }
  return [...picked.values()]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.preScore - a.c.preScore || b.c.votes - a.c.votes || a.i - b.i)
    .slice(0, limit)
    .map(({ c }) => c);
}

export async function discover({ client, types, areas, history = {}, chains = [], exclude = [], limit = DEFAULT_LIMIT, now = new Date(), max, maps = MAPS_DEFAULTS }) {
  const queries = planQueries({ types, areas, history, now, max });
  const nextHistory = { ...history };
  const searches = [];
  let stopped = null;
  for (const q of queries) {
    try {
      const response = await client.post(ENDPOINTS.mapsLive, [{ keyword: q.query, ...maps }]);
      searches.push({ ...q, items: firstItems(response) });
      nextHistory[q.query] = new Date(now).toISOString();
    } catch (err) {
      if (!(err instanceof BudgetExceeded)) throw err;
      stopped = 'budget';
      break;
    }
  }
  return { candidates: selectCandidates(searches, { chains, exclude, limit }), queries, history: nextHistory, stopped };
}
