// Discovers a site's pages from robots.txt and its sitemaps (one index level deep) and records the state of robots.txt, every sitemap and llms.txt.

import { fetchPage as defaultFetchPage } from './fetch-page.js';
import { parseRobots } from './robots.js';
import { urlKey } from './url-key.js';
import { DEFAULT_CRAWL_CONFIG, DEFAULT_USER_AGENT } from '../config.js';
import { legacyDiscoverPages } from './legacy.js';

function decodeXml(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (whole, ref) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[ref.toLowerCase()];
      if (named) return named;
      const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    })
    .trim();
}

function blocks(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}\\s*>`, 'g');
  return [...String(xml ?? '').replace(/<!--[\s\S]*?-->/g, '').matchAll(re)].map((match) => match[1]);
}

function childValue(block, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}\\s*>`).exec(block);
  return match ? decodeXml(match[1]) : null;
}

export function parseUrlset(xml) {
  return blocks(xml, 'url')
    .map((block) => ({ loc: childValue(block, 'loc'), lastmod: childValue(block, 'lastmod') }))
    .filter((entry) => entry.loc);
}

function extractLocs(xml) {
  return parseUrlset(xml).map((entry) => entry.loc);
}

function extractSitemapLocs(xml) {
  return blocks(xml, 'sitemap')
    .map((block) => childValue(block, 'loc'))
    .filter(Boolean);
}

export function sitemapKind(body) {
  const text = String(body ?? '').replace(/^\uFEFF/, '').trimStart();
  if (!text.startsWith('<')) return null;
  const stripped = text.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, '').trimStart();
  if (/^<(?:[\w-]+:)?urlset[\s>]/.test(stripped)) return 'urlset';
  if (/^<(?:[\w-]+:)?sitemapindex[\s>]/.test(stripped)) return 'index';
  return null;
}

function requestOpts(cfg, extra = {}) {
  return {
    userAgent: cfg.userAgent ?? DEFAULT_USER_AGENT,
    acceptLanguage: cfg.acceptLanguage ?? undefined,
    timeoutMs: cfg.timeoutMs,
    retryDelayMs: cfg.retryDelayMs,
    ...extra,
  };
}

function describeFailure(result) {
  if (result.errorCode) return `${result.fetchState}: ${result.errorCode}`;
  if (result.status !== 200) return `HTTP ${result.status}`;
  return null;
}

export async function discoverSite(rootUrl, { crawlConfig = {}, fetchPage = defaultFetchPage, log } = {}) {
  const cfg = { ...DEFAULT_CRAWL_CONFIG, ...crawlConfig };
  const root = new URL(rootUrl);
  const canonicalHost = cfg.canonicalHost ?? root.host;
  const keyOf = (url) => urlKey(url, { canonicalHost });
  const textOpts = requestOpts(cfg, { acceptAnyType: true });

  const robotsUrl = `${root.origin}/robots.txt`;
  const robotsResult = await fetchPage(robotsUrl, textOpts);
  const robotsText = robotsResult.status === 200 && robotsResult.fetchState === 'ok' ? robotsResult.body ?? '' : null;
  const robots = {
    url: robotsUrl,
    status: robotsResult.status,
    fetchState: robotsResult.fetchState,
    text: robotsText,
    sitemapUrls: robotsText == null ? [] : parseRobots(robotsText).sitemaps,
  };

  const sitemaps = [];
  const rows = [];
  const seenRows = new Set();
  const seenSitemaps = new Set();

  async function readSitemap(url, depth) {
    if (seenSitemaps.has(url)) return;
    seenSitemaps.add(url);
    const result = await fetchPage(url, textOpts);
    const body = result.status === 200 && result.fetchState === 'ok' ? result.body : null;
    const kind = body == null ? null : sitemapKind(body);
    const entry = {
      url,
      status: result.status,
      fetchState: result.fetchState,
      kind,
      valid: kind !== null,
      error: describeFailure(result) ?? (kind ? null : 'Not a sitemap: no <urlset> or <sitemapindex> root'),
      urlCount: 0,
    };
    sitemaps.push(entry);
    if (kind === 'urlset') {
      const entries = parseUrlset(body);
      entry.urlCount = entries.length;
      for (const { loc, lastmod } of entries) {
        const key = keyOf(loc);
        if (!key || seenRows.has(key)) continue;
        seenRows.add(key);
        rows.push({ url: loc, urlKey: key, lastmod: lastmod ?? null, sitemap: url });
      }
    } else if (kind === 'index') {
      const children = extractSitemapLocs(body);
      entry.urlCount = children.length;
      if (depth > 0) {
        log?.warn?.(`discovery: nested sitemap index ${url} not followed`);
        return;
      }
      for (const child of children) await readSitemap(child, depth + 1);
    }
  }

  const sitemapUrls = robots.sitemapUrls.length ? robots.sitemapUrls : [`${root.origin}/sitemap.xml`];
  for (const url of sitemapUrls) await readSitemap(url, 0);

  const llmsUrl = `${root.origin}/llms.txt`;
  const llmsResult = await fetchPage(llmsUrl, requestOpts(cfg, { readBody: false, acceptAnyType: true }));

  return {
    root: { url: rootUrl, urlKey: keyOf(rootUrl) },
    rows,
    sitemaps,
    robots,
    llms: { url: llmsUrl, status: llmsResult.status, fetchState: llmsResult.fetchState },
  };
}

function discoverPages(rootUrl, manualPages) {
  return legacyDiscoverPages(rootUrl, manualPages);
}

export { discoverPages, extractLocs, extractSitemapLocs };
