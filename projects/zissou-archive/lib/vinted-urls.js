// Builds men's-scoped Vinted catalog search URLs and plans which searches a run fetches.

import { VINTED_DOMAIN } from '../config.js';

const MENS_CATALOG = [5];

function resolveBrandIds(search, config) {
  if (Array.isArray(search.brand_ids) && search.brand_ids.length) return search.brand_ids;
  if (!Array.isArray(search.brands)) return [];
  return search.brands.map((key) => {
    const brand = config.brands?.[key];
    if (!brand || brand.id == null) throw new Error(`Search "${search.id}" names unknown brand "${key}"`);
    return brand.id;
  });
}

export function buildSearchUrl(search, config = {}) {
  const domain = config.domain ?? VINTED_DOMAIN;
  const catalogs = Array.isArray(search.catalog) && search.catalog.length
    ? search.catalog
    : Array.isArray(config.defaultCatalog) && config.defaultCatalog.length
      ? config.defaultCatalog
      : MENS_CATALOG;
  const pairs = [];
  if (search.search_text) pairs.push(['search_text', search.search_text]);
  for (const id of catalogs) pairs.push(['catalog[]', id]);
  for (const id of resolveBrandIds(search, config)) pairs.push(['brand_ids[]', id]);
  for (const id of search.size_ids ?? []) pairs.push(['size_ids[]', id]);
  for (const id of search.status_ids ?? []) pairs.push(['status_ids[]', id]);
  if (search.price_from != null) pairs.push(['price_from', search.price_from]);
  if (search.price_to != null) pairs.push(['price_to', search.price_to]);
  pairs.push(['currency', 'EUR'], ['order', 'newest_first']);
  const query = pairs.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return `https://${domain}/catalog?${query}`;
}

export function planRun(searches, cursor, maxFetches) {
  const list = Array.isArray(searches) ? searches : [];
  const max = Math.max(0, Math.floor(Number(maxFetches) || 0));
  if (list.length <= max) return { searches: [...list], nextCursor: 0 };
  const start = Number.isInteger(cursor) && cursor >= 0 ? cursor % list.length : 0;
  const picked = Array.from({ length: max }, (_, i) => list[(start + i) % list.length]);
  return { searches: picked, nextCursor: (start + max) % list.length };
}
