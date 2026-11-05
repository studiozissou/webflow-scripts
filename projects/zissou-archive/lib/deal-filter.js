// Decides whether a parsed Vinted item is a deal worth flagging for a given search.

export function normaliseBrand(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘´`ʼ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function brandMatches(itemBrand, alias) {
  const brand = normaliseBrand(itemBrand);
  const target = normaliseBrand(alias);
  if (!brand || !target) return false;
  return brand === target || brand.startsWith(`${target} `);
}

function displayName(key, brand) {
  if (brand?.name) return brand.name;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatEuro(value) {
  return Number.isInteger(value) ? `€${value}` : `€${Number(value).toFixed(2)}`;
}

function matchBrand(item, search, config) {
  const brands = config.brands ?? {};
  const keys = search.kind === 'brand-band' && Array.isArray(search.brands) ? search.brands : Object.keys(brands);
  for (const key of keys) {
    const brand = brands[key];
    if (!brand || typeof brand.cap !== 'number') continue;
    const aliases = Array.isArray(brand.aliases) && brand.aliases.length ? brand.aliases : [key];
    if (!aliases.some((alias) => brandMatches(item.brand, alias))) continue;
    if (item.price > brand.cap) return null;
    return { reason: `${displayName(key, brand)} ≤ ${formatEuro(brand.cap)} cap`, cap: brand.cap, brandKey: key };
  }
  return null;
}

function matchCap(item, search) {
  const cap = Number(search.price_to);
  if (!Number.isFinite(cap) || item.price > cap) return null;
  const label = search.search_text ? `"${search.search_text}"` : search.id;
  const lang = search.lang ? ` (${search.lang})` : '';
  return { reason: `${label}${lang} under ${formatEuro(cap)}`, cap };
}

export function matchTarget(item, search, config = {}) {
  if (!item || item.isPromoted || item.isBusiness) return null;
  if (typeof item.price !== 'number' || !Number.isFinite(item.price)) return null;
  if (search?.flagRule === 'brand') return matchBrand(item, search, config);
  if (search?.flagRule === 'cap') return matchCap(item, search);
  return null;
}
