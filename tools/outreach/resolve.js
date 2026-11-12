// Resolves a site to its Google Business Profile cid with one Maps search for "<site name> Den Haag", accepting only results on the same domain.
import { ENDPOINTS, firstItems } from './dataforseo.js';
import { extractPostcode, normaliseDomain, normalisePostcode, pageText, siteName } from './text.js';

export const CITY = 'Den Haag';

export const MAPS_DEFAULTS = Object.freeze({ location_coordinate: '52.0705,4.3007,13z', language_code: 'nl', depth: 20 });

export const buildQuery = (name, city = CITY) => `${name} ${city}`;

const postcodeOf = (value) => (value ? normalisePostcode(value) : null);

const itemPostcode = (item) => postcodeOf(item.address_info?.zip) ?? (item.address ? extractPostcode(item.address) : null);

export function pickMatch(items, seed, postcode = null) {
  const domain = normaliseDomain(seed);
  const matches = (items ?? []).filter((item) => domain && normaliseDomain(item.domain ?? item.url) === domain);
  if (!matches.length) return null;
  const wanted = postcodeOf(postcode);
  return (wanted && matches.find((item) => itemPostcode(item) === wanted)) || matches[0];
}

export async function resolve({ client, url, html, postcode = null, city = CITY, maps = MAPS_DEFAULTS }) {
  const name = siteName(html);
  if (!name) return { matched: false, status: 'unmatched', query: null };
  const query = buildQuery(name, city);
  const response = await client.post(ENDPOINTS.mapsLive, [{ keyword: query, ...maps }]);
  const item = pickMatch(firstItems(response), url, postcode ?? extractPostcode(pageText(html)));
  if (!item) return { matched: false, status: 'unmatched', query };
  return { matched: true, cid: String(item.cid), item, query };
}
