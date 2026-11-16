// Fetches one URL with manual redirects, per-hop status, retry with backoff, Retry-After, size limits and an optional no-keep-alive transport, and never throws.

import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { DEFAULT_USER_AGENT } from '../config.js';
import { sleep } from './finding.js';
import { legacyFetchPage } from './legacy.js';

const DEBUG = false;
const MAX_REDIRECTS = 10;
const MAX_RETRY_AFTER_MS = 30_000;
const ACCEPT = 'text/html,application/xhtml+xml,*/*;q=0.8';
const ACCEPT_ENCODING = 'gzip, deflate, br';
const HTML_TYPES = /^(?:text\/html|application\/xhtml\+xml)$/;

const DEFAULTS = {
  method: 'GET',
  userAgent: DEFAULT_USER_AGENT,
  acceptLanguage: null,
  timeoutMs: 15_000,
  retries: 1,
  retryDelayMs: 500,
  maxBytes: 5_000_000,
  keepAlive: true,
  acceptAnyType: false,
};

class TransportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function errorCodeOf(err) {
  if (err instanceof TransportError) return err.code;
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return 'ETIMEDOUT';
  const cause = err?.cause;
  const code = cause?.code ?? err?.code ?? cause?.cause?.code;
  if (code === 'UND_ERR_SOCKET' || code === 'UND_ERR_CLOSED') return 'ECONNRESET';
  if (code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT') return 'ETIMEDOUT';
  return code ?? 'FETCH_FAILED';
}

function buildHeaders(opts) {
  const headers = {
    'User-Agent': opts.userAgent || DEFAULT_USER_AGENT,
    Accept: ACCEPT,
    'Accept-Encoding': ACCEPT_ENCODING,
  };
  if (opts.acceptLanguage) headers['Accept-Language'] = opts.acceptLanguage;
  return headers;
}

async function readLimited(chunks, maxBytes) {
  const parts = [];
  let bytes = 0;
  let truncated = false;
  for await (const chunk of chunks) {
    const buf = Buffer.from(chunk);
    bytes += buf.length;
    parts.push(buf);
    if (bytes > maxBytes) {
      truncated = true;
      break;
    }
  }
  const all = Buffer.concat(parts);
  return { buffer: truncated ? all.subarray(0, maxBytes) : all, bytes, truncated };
}

async function viaFetch(url, { method, headers, timeoutMs, maxBytes, wantBody }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method, headers, redirect: 'manual', signal: controller.signal });
    const plain = {};
    response.headers.forEach((value, key) => {
      plain[key] = value;
    });
    const isRedirect = response.status >= 300 && response.status < 400 && plain.location;
    if (!response.body || method === 'HEAD' || isRedirect || !wantBody(plain)) {
      await response.body?.cancel().catch(() => {});
      return { status: response.status, headers: plain, body: null };
    }
    const reader = response.body.getReader();
    const iterable = {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      },
    };
    const body = await readLimited(iterable, maxBytes);
    if (body.truncated) await reader.cancel().catch(() => {});
    return { status: response.status, headers: plain, body };
  } finally {
    clearTimeout(timer);
  }
}

function decoderFor(encoding) {
  const name = (encoding ?? '').trim().toLowerCase();
  if (name === 'gzip' || name === 'x-gzip') return zlib.createGunzip();
  if (name === 'deflate') return zlib.createInflate();
  if (name === 'br') return zlib.createBrotliDecompress();
  return null;
}

function viaNode(url, { method, headers, timeoutMs, maxBytes, wantBody }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const req = lib.request(target, { method, headers: { ...headers, Connection: 'close' }, agent: false }, (res) => {
      const plain = {};
      for (const [key, value] of Object.entries(res.headers)) plain[key] = Array.isArray(value) ? value.join(', ') : value;
      const isRedirect = res.statusCode >= 300 && res.statusCode < 400 && plain.location;
      if (method === 'HEAD' || isRedirect || !wantBody(plain)) {
        res.resume();
        done(resolve, { status: res.statusCode, headers: plain, body: null });
        req.destroy();
        return;
      }
      const decoder = decoderFor(plain['content-encoding']);
      const stream = decoder ? res.pipe(decoder) : res;
      res.on('error', (err) => done(reject, err));
      decoder?.on('error', (err) => done(reject, err));
      readLimited(stream, maxBytes).then(
        (body) => {
          done(resolve, { status: res.statusCode, headers: plain, body });
          req.destroy();
        },
        (err) => done(reject, err),
      );
    });
    const timer = setTimeout(() => {
      done(reject, new TransportError('ETIMEDOUT', `Timed out after ${timeoutMs} ms`));
      req.destroy();
    }, timeoutMs);
    req.on('error', (err) => done(reject, err));
    req.end();
  });
}

function retryAfterMs(value, cap = MAX_RETRY_AFTER_MS) {
  if (value == null || value === '') return null;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), cap) : null;
}

async function followRedirects(url, opts) {
  const transport = opts.keepAlive === false ? viaNode : viaFetch;
  const headers = buildHeaders(opts);
  const wantBody = (plain) => {
    if (!opts.readBody) return false;
    if (opts.acceptAnyType) return true;
    const type = mediaType(plain['content-type']);
    return !type || HTML_TYPES.test(type);
  };
  const redirectChain = [];
  const visited = new Set([url]);
  let current = url;
  let method = opts.method;
  for (let hop = 0; ; hop += 1) {
    let response;
    try {
      response = await transport(current, { method, headers, timeoutMs: opts.timeoutMs, maxBytes: opts.maxBytes, wantBody });
    } catch (err) {
      DEBUG && console.log(`fetch-page: ${current} failed`, err);
      return { error: errorCodeOf(err), finalUrl: current, redirectChain };
    }
    if (response.status === 429) opts.onThrottle?.(new URL(current).host);
    const location = response.headers.location;
    if (response.status >= 300 && response.status < 400 && location) {
      let next;
      try {
        next = new URL(location, current).href;
      } catch {
        return { response, finalUrl: current, redirectChain, redirectLoop: false };
      }
      redirectChain.push({ url: current, status: response.status });
      if (response.status === 303 && method !== 'HEAD') method = 'GET';
      if (visited.has(next) || hop + 1 > MAX_REDIRECTS) {
        return { response, finalUrl: next, redirectChain, redirectLoop: true };
      }
      visited.add(next);
      current = next;
      continue;
    }
    return { response, finalUrl: current, redirectChain, redirectLoop: false };
  }
}

function mediaType(contentType) {
  return contentType ? contentType.split(';')[0].trim().toLowerCase() : null;
}

function shouldRetry(outcome) {
  if (outcome.error) return true;
  if (outcome.redirectLoop) return false;
  const status = outcome.response.status;
  return status === 429 || status >= 500;
}

function buildResult(url, outcome, attempts, fetchedAt) {
  const base = {
    url,
    finalUrl: outcome.finalUrl,
    status: 0,
    redirectChain: outcome.redirectChain,
    redirectLoop: Boolean(outcome.redirectLoop),
    headers: {},
    body: null,
    bytes: 0,
    contentType: null,
    contentEncoding: null,
    fetchState: 'fetch_failed',
    attempts,
    errorCode: null,
    fetchedAt,
  };
  if (outcome.error) {
    base.errorCode = outcome.error;
    base.fetchState = outcome.error === 'ETIMEDOUT' ? 'timeout' : 'fetch_failed';
    return base;
  }
  const { response } = outcome;
  const headers = response.headers;
  const contentType = headers['content-type']?.toLowerCase() ?? null;
  const type = mediaType(contentType);
  const result = {
    ...base,
    status: response.status,
    headers,
    contentType,
    contentEncoding: headers['content-encoding']?.toLowerCase() ?? null,
    fetchState: 'ok',
  };
  if (response.body) {
    result.body = response.body.buffer.toString('utf8');
    result.bytes = response.body.bytes;
    if (response.body.truncated) result.fetchState = 'truncated';
  } else {
    const length = Number(headers['content-length']);
    result.bytes = Number.isFinite(length) ? length : 0;
  }
  if (response.status === 429) result.fetchState = 'blocked';
  else if (!result.redirectLoop && !outcome.acceptAnyType && type && !HTML_TYPES.test(type)) {
    result.body = null;
    if (response.status < 400) result.fetchState = 'non_html';
  }
  return result;
}

function normaliseArgs(cacheOrOpts, extra) {
  if (cacheOrOpts instanceof Map) return { ...(extra ?? {}), cache: cacheOrOpts };
  return { ...(cacheOrOpts ?? {}), ...(extra ?? {}) };
}

function cacheKey(url, opts) {
  const parts = [opts.method !== 'GET' ? opts.method : '', opts.readBody ? '' : 'nobody', opts.acceptAnyType ? 'any' : ''];
  const suffix = parts.filter(Boolean).join(' ');
  return suffix ? `${suffix} ${url}` : url;
}

async function fetchPage(url, cacheOrOpts, extra) {
  if (cacheOrOpts instanceof Map) return legacyFetchPage(url, cacheOrOpts, extra);
  const given = normaliseArgs(cacheOrOpts, extra);
  const defined = Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined));
  const opts = { ...DEFAULTS, ...defined };
  opts.method = String(opts.method).toUpperCase();
  opts.readBody = opts.method === 'HEAD' ? false : (given.readBody ?? true);
  const key = cacheKey(url, opts);
  if (opts.cache?.has(key)) return opts.cache.get(key);

  let result;
  try {
    const maxAttempts = Math.max(0, opts.retries) + 1;
    let outcome;
    let attempts = 0;
    let fetchedAt;
    while (attempts < maxAttempts) {
      attempts += 1;
      fetchedAt = new Date().toISOString();
      outcome = await followRedirects(url, opts);
      if (attempts >= maxAttempts || !shouldRetry(outcome)) break;
      const hinted = outcome.response ? retryAfterMs(outcome.response.headers['retry-after'], opts.maxRetryAfterMs ?? MAX_RETRY_AFTER_MS) : null;
      await sleep(Math.max(hinted ?? opts.retryDelayMs * 2 ** (attempts - 1), opts.minRetryDelayMs ?? 0));
    }
    outcome.acceptAnyType = opts.acceptAnyType;
    result = buildResult(url, outcome, attempts, fetchedAt);
  } catch (err) {
    DEBUG && console.log(`fetch-page: unexpected failure for ${url}`, err);
    result = buildResult(url, { error: errorCodeOf(err), finalUrl: url, redirectChain: [] }, 1, new Date().toISOString());
  }
  result.html = result.body ?? '';
  result.statusCode = result.status;
  opts.cache?.set(key, result);
  return result;
}

export { fetchPage };
