// Swaps a Google refresh token for a cached access token and redacts secrets from every error path.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const EXPIRY_MARGIN_MS = 60_000;
const REDACTED = '[redacted]';
const KNOWN_OAUTH_ERRORS = new Set([
  'invalid_grant',
  'invalid_client',
  'invalid_request',
  'invalid_scope',
  'unauthorized_client',
  'unsupported_grant_type',
  'access_denied',
]);
const SECRET_SHAPES = [
  /ya29\.[\w.-]*/g,
  /1\/\/0[\w-]*/g,
  /GOCSPX[-][\w-]*/g,
  /\d+-[a-z0-9]+\.apps\.googleusercontent\.com/g,
];
const BEARER = /Bearer\s+[\w.~+/=-]+/gi;
const SECRET_PARAMS =
  /\b(access_token|refresh_token|client_secret|id_token)("?\s*[:=]\s*"?)[^"&\s,}\\]+/g;

export function redact(text, secrets = []) {
  let out = String(text);
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join(REDACTED);
  }
  for (const shape of SECRET_SHAPES) out = out.replace(shape, REDACTED);
  return out
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(SECRET_PARAMS, (_, key, separator) => `${key}${separator}${REDACTED}`);
}

export function isMainModule(importMetaUrl) {
  if (!process.argv[1]) return false;
  return fileURLToPath(importMetaUrl) === realpathSync(process.argv[1]);
}

export function safeOAuthCode(body) {
  return KNOWN_OAUTH_ERRORS.has(body?.error) ? body.error : 'unrecognised error';
}

export async function readJsonSafely(response) {
  try {
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}

export function createTokenProvider({
  clientId,
  clientSecret,
  refreshToken,
  fetch: fetchFn = globalThis.fetch,
  now = Date.now,
}) {
  const secrets = [clientSecret, refreshToken];
  let cached = null;
  let inFlight = null;

  async function refresh() {
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    let response;
    try {
      response = await fetchFn(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
    } catch (err) {
      throw new Error(`Google token refresh failed: ${redact(err.message, secrets)}`);
    }
    const body = await readJsonSafely(response);
    if (!response.ok) {
      throw new Error(
        `Google token refresh failed: HTTP ${response.status} ${safeOAuthCode(body)}`,
      );
    }
    if (typeof body?.access_token !== 'string' || !body.access_token) {
      throw new Error('Google token refresh failed: no access token in the response');
    }
    const lifetimeMs = Number.isFinite(body.expires_in) ? body.expires_in * 1000 : 0;
    cached = {
      token: body.access_token,
      refreshAt: now() + lifetimeMs - EXPIRY_MARGIN_MS,
    };
    return cached.token;
  }

  return function getAccessToken() {
    if (cached && now() < cached.refreshAt) return Promise.resolve(cached.token);
    inFlight ??= refresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}
