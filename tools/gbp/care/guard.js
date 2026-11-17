// Wraps fetch so the weekly care runner can only read: GETs, the token POST and validateOnly checks pass, anything else throws.
const TOKEN_HOST = 'oauth2.googleapis.com';
const TOKEN_PATH = '/token';

function parse(url) {
  try {
    return new URL(String(url));
  } catch {
    return null;
  }
}

export function isAllowedRequest(url, method = 'GET') {
  const parsed = parse(url);
  if (!parsed) return false;
  const verb = String(method).toUpperCase();
  if (verb === 'GET') return true;
  if (verb === 'POST' && parsed.host === TOKEN_HOST && parsed.pathname === TOKEN_PATH) {
    return true;
  }
  return parsed.searchParams.get('validateOnly') === 'true';
}

export function readOnlyFetch(fetchFn, { record } = {}) {
  return async function guardedFetch(url, init = {}) {
    const method = String(init.method ?? 'GET').toUpperCase();
    if (!isAllowedRequest(url, method)) {
      const parsed = parse(url);
      const target = parsed ? `${parsed.host}${parsed.pathname}` : String(url);
      record?.({ method, url: String(url) });
      throw new Error(`read-only guard: ${method} ${target} refused`);
    }
    return fetchFn(url, init);
  };
}
