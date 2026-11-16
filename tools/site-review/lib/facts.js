// Turns one fetch result and its sitemap row into the fact record that every check reads, then lets the HTML go.

import { parseHtml, hash16 } from './html.js';
import { urlKey } from './url-key.js';
import { SCHEMA_VERSION } from '../config.js';

const PARSED_EMPTY = {
  textHash: null,
  doctype: null,
  wfPage: null,
  wfSite: null,
  lang: null,
  title: null,
  titleCount: null,
  metaDescription: null,
  metaDescriptionCount: null,
  metaRefresh: null,
  robotsMeta: null,
  canonicals: [],
  hreflang: [],
  h1: [],
  headings: null,
  wordCount: null,
  textToHtmlRatio: null,
  links: [],
  resources: [],
  images: [],
  jsonLd: null,
  scripts: null,
  viewport: null,
  charset: null,
};

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function headerFacts(headers = {}) {
  const get = (name) => headers[name] ?? null;
  const length = Number(get('content-length'));
  return {
    contentType: get('content-type')?.toLowerCase() ?? null,
    contentEncoding: get('content-encoding')?.toLowerCase() ?? null,
    xRobotsTag: get('x-robots-tag'),
    contentLength: get('content-length') == null || !Number.isFinite(length) ? null : length,
    security: {
      strictTransportSecurity: get('strict-transport-security'),
      contentSecurityPolicy: get('content-security-policy'),
      xContentTypeOptions: get('x-content-type-options'),
      xFrameOptions: get('x-frame-options'),
      referrerPolicy: get('referrer-policy'),
      permissionsPolicy: get('permissions-policy'),
    },
  };
}

function mergeRobots(meta, header) {
  const parts = [meta, header ? header.replace(/\s+/g, ' ').trim().toLowerCase() : null].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function extractFacts({ fetchResult, row = {}, crawlConfig = {}, schemaVersion = SCHEMA_VERSION }) {
  const url = row.url ?? fetchResult.url;
  const canonicalHost = crawlConfig.canonicalHost ?? hostOf(crawlConfig.url ?? url);
  const includeHosts = crawlConfig.includeHosts ?? [];
  const finalUrl = fetchResult.finalUrl ?? url;
  const headers = headerFacts(fetchResult.headers);
  const body = typeof fetchResult.body === 'string' ? fetchResult.body : null;

  const record = {
    schemaVersion,
    url,
    urlKey: row.urlKey ?? urlKey(url, { canonicalHost }),
    finalUrl,
    status: fetchResult.status ?? 0,
    redirectChain: fetchResult.redirectChain ?? [],
    redirectLoop: Boolean(fetchResult.redirectLoop),
    headers,
    bytes: fetchResult.bytes ?? 0,
    fetchedAt: fetchResult.fetchedAt ?? null,
    fetchState: fetchResult.fetchState ?? 'fetch_failed',
    errorCode: fetchResult.errorCode ?? null,
    htmlHash: body != null ? hash16(body) : null,
    ...PARSED_EMPTY,
    inSitemap: row.inSitemap ?? Boolean(row.sitemap),
    lastmod: row.lastmod ?? null,
    sitemap: row.sitemap ?? null,
  };

  if (record.fetchState === 'non_html') record.robotsMeta = mergeRobots(null, headers.xRobotsTag);
  if (record.fetchState !== 'ok' || body == null) return record;

  const parsed = parseHtml(body, { baseUrl: finalUrl, canonicalHost, includeHosts, contentType: headers.contentType });
  const { text: _text, ...fields } = parsed;
  Object.assign(record, fields, { robotsMeta: mergeRobots(parsed.robotsMeta, headers.xRobotsTag) });
  return record;
}
