// Folds every spelling of one page (case, trailing slash, fragment, tracking parameters, index files, www or apex host) into a single comparison key.

const TRACKING_PARAMS = new Set(['gclid', 'fbclid', 'mc_cid', 'mc_eid']);
const INDEX_SUFFIX = /\/index(?:\.html?)?$/;

function bareHost(host) {
  return host.replace(/^www\./, '');
}

function mapHost(host, canonicalHost) {
  if (!canonicalHost) return host;
  const canonical = canonicalHost.toLowerCase();
  return bareHost(host) === bareHost(canonical) ? canonical : host;
}

function normalisePath(pathname) {
  let path = pathname.toLowerCase().replace(/\/{2,}/g, '/');
  path = path.replace(INDEX_SUFFIX, '') || '/';
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function normaliseQuery(searchParams) {
  const kept = [...searchParams].filter(
    ([name]) => !name.toLowerCase().startsWith('utm_') && !TRACKING_PARAMS.has(name.toLowerCase()),
  );
  if (kept.length === 0) return '';
  kept.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return `?${new URLSearchParams(kept).toString()}`;
}

function parse(input, base) {
  try {
    const url = base ? new URL(input, base) : new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function urlKey(input, { base, canonicalHost } = {}) {
  if (typeof input !== 'string' || input.trim() === '') return null;
  const url = parse(input.trim(), base);
  if (!url) return null;
  const host = mapHost(url.host.toLowerCase(), canonicalHost);
  return `${url.protocol}//${host}${normalisePath(url.pathname)}${normaliseQuery(url.searchParams)}`;
}

export function hostOfKey(key) {
  return parse(key)?.host ?? null;
}

export function isInternalUrl(input, { base, canonicalHost, includeHosts = [] } = {}) {
  const url = parse(String(input ?? ''), base);
  if (!url) return false;
  const host = url.host.toLowerCase();
  const site = canonicalHost ?? (base ? parse(base)?.host : null);
  if (site && bareHost(host) === bareHost(site.toLowerCase())) return true;
  return includeHosts.some((included) => included.toLowerCase() === host);
}
