// Crawls the discovered pages politely per host, turns each into a fact record, then status-checks every unique internal and (capped) external link target once.

import { sha256 } from './finding.js';
import { extractFacts } from './facts.js';
import { parseRobots, robotsFor } from './robots.js';
import { urlKey, isInternalUrl } from './url-key.js';
import { DEFAULT_CRAWL_CONFIG, DEFAULT_USER_AGENT, SCHEMA_VERSION } from '../config.js';

const GET_FALLBACK_STATUSES = new Set([405, 403, 501]);
const EXTERNAL_BREAKER = 3;
const EXTERNAL_MAX_RETRY_AFTER_MS = 5000;
const BREAKER_STATUSES = new Set([403, 429, 999]);
const FAILED_STATES = new Set(['fetch_failed', 'timeout', 'blocked']);

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function stripHash(url) {
  const at = url.indexOf('#');
  return at === -1 ? url : url.slice(0, at);
}

export function createHostPool(concurrency) {
  const hosts = new Map();
  const stateOf = (host) => {
    if (!hosts.has(host)) {
      hosts.set(host, { active: 0, concurrency, waiters: [], nextAt: 0, delayMs: 0, timer: null, requests: 0, throttled: 0 });
    }
    return hosts.get(host);
  };
  const pump = (s) => {
    while (s.waiters.length && s.active < s.concurrency) {
      const wait = s.nextAt - Date.now();
      if (wait > 0) {
        if (!s.timer) {
          s.timer = setTimeout(() => {
            s.timer = null;
            pump(s);
          }, wait);
        }
        return;
      }
      s.active += 1;
      s.requests += 1;
      s.nextAt = Date.now() + s.delayMs;
      s.waiters.shift()();
    }
  };
  return {
    async run(host, task) {
      const s = stateOf(host);
      await new Promise((resolve) => {
        s.waiters.push(resolve);
        pump(s);
      });
      try {
        return await task();
      } finally {
        s.active -= 1;
        pump(s);
      }
    },
    throttle(host) {
      const s = stateOf(host);
      s.throttled += 1;
      s.concurrency = Math.max(1, Math.floor(s.concurrency / 2));
    },
    setDelay(host, ms) {
      stateOf(host).delayMs = ms;
    },
    stats() {
      return Object.fromEntries(
        [...hosts].map(([host, s]) => [host, { requests: s.requests, throttled: s.throttled, concurrency: s.concurrency }]),
      );
    },
  };
}

function createLimiter(limit) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active += 1;
    queue.shift()();
  };
  return async (task) => {
    await new Promise((resolve) => {
      queue.push(resolve);
      next();
    });
    try {
      return await task();
    } finally {
      active -= 1;
      next();
    }
  };
}

function blockedResult(url, fetchedAt, errorCode = 'ROBOTS_DISALLOWED') {
  return {
    url,
    finalUrl: url,
    status: 0,
    redirectChain: [],
    redirectLoop: false,
    headers: {},
    body: null,
    bytes: 0,
    contentType: null,
    contentEncoding: null,
    fetchState: 'blocked',
    attempts: 0,
    errorCode,
    fetchedAt,
  };
}

function applyResult(target, result, method) {
  Object.assign(target, {
    method,
    status: result.status,
    finalUrl: result.finalUrl,
    redirectChain: result.redirectChain ?? [],
    redirectLoop: Boolean(result.redirectLoop),
    fetchState: result.fetchState,
    errorCode: result.errorCode ?? null,
    checkedAt: result.fetchedAt ?? null,
  });
}

function sampleExternals(externals, cap, templateOf) {
  if (externals.length <= cap) return { selected: externals, rest: [] };
  const byTemplate = new Map();
  for (const target of externals) {
    const template = templateOf.get(target.urlKey) ?? 'none';
    if (!byTemplate.has(template)) byTemplate.set(template, []);
    byTemplate.get(template).push(target);
  }
  const lists = [...byTemplate.keys()]
    .sort()
    .map((template) => byTemplate.get(template).map((t) => ({ t, h: sha256(t.urlKey) })).sort((a, b) => (a.h < b.h ? -1 : 1)).map(({ t }) => t));
  const selected = [];
  for (let i = 0; selected.length < cap; i += 1) {
    let added = false;
    for (const list of lists) {
      if (i < list.length && selected.length < cap) {
        selected.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  const chosen = new Set(selected);
  return { selected, rest: externals.filter((target) => !chosen.has(target)) };
}

export async function crawlSite({ site, crawlConfig = {}, fetchPage, log, onFact, now = Date.now }) {
  const cfg = { ...DEFAULT_CRAWL_CONFIG, ...crawlConfig };
  const rootUrl = site.root.url;
  const rootHost = hostOf(rootUrl);
  const canonicalHost = cfg.canonicalHost ?? rootHost;
  const includeHosts = cfg.includeHosts ?? [];
  const factConfig = { ...cfg, canonicalHost };
  const userAgent = cfg.userAgent ?? DEFAULT_USER_AGENT;
  const rules = robotsFor(parseRobots(site.robots?.text ?? ''), userAgent);
  const pool = createHostPool(Math.max(1, cfg.concurrency ?? 4));
  const clock = () => Number(now());
  const isoNow = () => new Date(clock()).toISOString();
  const keyOf = (url) => urlKey(url, { canonicalHost });
  const onSite = (url) => isInternalUrl(url, { canonicalHost });

  if (rules.crawlDelay) {
    for (const host of new Set([rootHost, canonicalHost])) pool.setDelay(host, rules.crawlDelay * 1000);
  }

  const requestOpts = {
    userAgent,
    acceptLanguage: cfg.acceptLanguage ?? undefined,
    timeoutMs: cfg.timeoutMs,
    maxBytes: cfg.maxBytes,
    retries: cfg.retries,
    retryDelayMs: cfg.retryDelayMs,
    minRetryDelayMs: rules.crawlDelay ? rules.crawlDelay * 1000 : 0,
    onThrottle: (host) => {
      pool.throttle(host);
      log?.warn?.(`crawl: 429 from ${host}, concurrency now ${pool.stats()[host]?.concurrency}`);
    },
  };
  const externalOpts = { ...requestOpts, minRetryDelayMs: 0, maxRetryAfterMs: EXTERNAL_MAX_RETRY_AFTER_MS };

  const excluded = (url) => {
    const paths = cfg.excludePaths ?? [];
    if (!paths.length) return false;
    try {
      const { pathname } = new URL(url);
      return paths.some((prefix) => pathname.startsWith(prefix));
    } catch {
      return false;
    }
  };
  const allowed = (url) => {
    if (!onSite(url)) return true;
    try {
      const { pathname, search } = new URL(url);
      return rules.isAllowed(`${pathname}${search}`);
    } catch {
      return true;
    }
  };

  const sitemapKeys = new Set(site.rows.map((row) => row.urlKey ?? keyOf(row.url)));
  const pages = [];
  const seen = new Set();
  const addPage = (row) => {
    const key = row.urlKey ?? keyOf(row.url);
    if (!key || seen.has(key) || excluded(row.url)) return;
    seen.add(key);
    pages.push({ ...row, urlKey: key });
  };
  const rootRow = site.rows.find((row) => row.urlKey === site.root.urlKey);
  addPage(rootRow ? { ...rootRow, inSitemap: true } : { url: rootUrl, urlKey: site.root.urlKey, lastmod: null, sitemap: null, inSitemap: false });
  for (const row of site.rows) addPage({ ...row, inSitemap: true });

  const strings = new Map();
  const intern = (value) => {
    if (value == null) return value;
    const known = strings.get(value);
    if (known !== undefined) return known;
    strings.set(value, value);
    return value;
  };

  const facts = [];
  const order = new Map();
  const factsByKey = new Map();
  const durations = [];
  let aborted = null;
  let abortChecked = false;

  const emit = async (built, index) => {
    const record = JSON.parse(JSON.stringify(built));
    for (const link of record.links) {
      link.href = intern(link.href);
      link.hrefKey = intern(link.hrefKey);
      link.snippet = intern(link.snippet);
      link.accessibleName = intern(link.accessibleName);
      link.rel = intern(link.rel);
    }
    order.set(record, index);
    facts.push(record);
    factsByKey.set(record.urlKey, record);
    await onFact?.(record);
  };

  const checkSlow = () => {
    const sample = cfg.slowAbortSample;
    if (abortChecked || !sample || durations.length < sample) return;
    abortChecked = true;
    const avg = durations.slice(0, sample).reduce((sum, ms) => sum + ms, 0) / sample;
    if (avg > cfg.slowAbortMs) {
      aborted = 'slow';
      log?.warn?.(`crawl: first ${sample} fetches averaged ${Math.round(avg)} ms, over ${cfg.slowAbortMs} ms; stopping`);
    }
  };

  const crawlPage = async (row, index) => {
    if (aborted) return;
    if (!allowed(row.url)) {
      await emit(extractFacts({ fetchResult: blockedResult(row.url, isoNow()), row, crawlConfig: factConfig, schemaVersion: SCHEMA_VERSION }), index);
      return;
    }
    const result = await pool.run(hostOf(row.url), async () => {
      if (aborted) return null;
      const started = clock();
      const fetched = await fetchPage(row.url, { ...requestOpts, method: 'GET' });
      durations.push(clock() - started);
      return fetched;
    });
    if (!result) return;
    checkSlow();
    await emit(extractFacts({ fetchResult: result, row, crawlConfig: factConfig, schemaVersion: SCHEMA_VERSION }), index);
  };

  await Promise.all(pages.map((row, index) => crawlPage(row, index)));
  facts.sort((a, b) => order.get(a) - order.get(b));

  const templates = {};
  for (const record of facts) {
    if (record.fetchState !== 'ok') continue;
    const template = record.wfPage ?? 'none';
    templates[template] = (templates[template] ?? 0) + 1;
  }

  const stats = {
    fetched: durations.length,
    failed: facts.filter((record) => FAILED_STATES.has(record.fetchState) && record.errorCode !== 'ROBOTS_DISALLOWED').length,
    avgMs: durations.length ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length) : 0,
    aborted,
    hosts: {},
    templates,
    externalChecked: 0,
    externalCapped: 0,
  };
  const linkTargets = new Map();
  if (aborted) {
    stats.hosts = pool.stats();
    return { facts, linkTargets, stats };
  }

  const templateOf = new Map();
  const note = (key, url, kind, record) => {
    if (!key || !url) return;
    let target = linkTargets.get(key);
    if (!target) {
      target = {
        urlKey: key,
        url: stripHash(url),
        internal: isInternalUrl(url, { canonicalHost, includeHosts }),
        inSitemap: sitemapKeys.has(key),
        isFact: factsByKey.has(key),
        kinds: [],
        method: null,
        status: 0,
        finalUrl: null,
        redirectChain: [],
        redirectLoop: false,
        fetchState: null,
        errorCode: null,
        capExceeded: false,
        checkedAt: null,
      };
      linkTargets.set(key, target);
      templateOf.set(key, record.wfPage ?? 'none');
    }
    if (!target.kinds.includes(kind)) target.kinds.push(kind);
  };
  for (const record of facts) {
    if (record.fetchState !== 'ok') continue;
    for (const link of record.links) note(link.hrefKey, link.href, 'link', record);
    for (const image of record.images) note(image.srcKey, image.src, 'image', record);
    for (const canonical of record.canonicals) note(canonical.key, canonical.url, 'canonical', record);
    for (const alternate of record.hreflang) note(alternate.key, alternate.url, 'hreflang', record);
  }

  const blockedStreak = new Map();
  const checkTarget = (target) =>
    pool.run(hostOf(target.url), async () => {
      const host = hostOf(target.url);
      const opts = target.internal ? requestOpts : externalOpts;
      if (!target.internal && (blockedStreak.get(host) ?? 0) >= EXTERNAL_BREAKER) {
        applyResult(target, { ...blockedResult(target.url, null, null), errorCode: 'HOST_BREAKER' }, null);
        target.finalUrl = target.url;
        return;
      }
      let method = 'HEAD';
      let result = await fetchPage(target.url, { ...opts, method: 'HEAD', readBody: false });
      if (GET_FALLBACK_STATUSES.has(result.status)) {
        method = 'GET';
        result = await fetchPage(target.url, { ...opts, method: 'GET', readBody: false });
      }
      if (!target.internal) {
        const blocked = result.fetchState === 'blocked' || BREAKER_STATUSES.has(result.status);
        blockedStreak.set(host, blocked ? (blockedStreak.get(host) ?? 0) + 1 : 0);
      }
      applyResult(target, result, method);
    });

  const internalChecks = [];
  for (const target of linkTargets.values()) {
    if (!target.internal) continue;
    const record = factsByKey.get(target.urlKey);
    if (record) {
      applyResult(target, record, null);
      target.checkedAt = record.fetchedAt;
    } else if (excluded(target.url) || !allowed(target.url)) {
      applyResult(target, blockedResult(target.url, null), null);
      target.finalUrl = target.url;
    } else {
      internalChecks.push(checkTarget(target));
    }
  }
  await Promise.all(internalChecks);

  const externals = [...linkTargets.values()].filter((target) => !target.internal);
  const { selected, rest } = sampleExternals(externals, Math.max(0, cfg.externalCap ?? Infinity), templateOf);
  for (const target of rest) {
    applyResult(target, blockedResult(target.url, null, null), null);
    target.finalUrl = target.url;
    target.capExceeded = true;
  }
  const limit = createLimiter(Math.max(1, cfg.concurrency ?? 4) * 4);
  await Promise.all(selected.map((target) => limit(() => checkTarget(target))));
  stats.externalChecked = selected.length;
  stats.externalCapped = rest.length;
  stats.hosts = pool.stats();
  log?.log?.(`crawl: ${facts.length} pages, ${linkTargets.size} link targets, ${selected.length} external checked, ${rest.length} capped`);
  return { facts, linkTargets, stats };
}
