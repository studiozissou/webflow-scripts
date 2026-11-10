// The pre-2.0 fetchPage(url, cacheMap) and discoverPages(root) behaviour, kept unchanged for launch-guard, locale-guard and site-archive.

import { extractLocs, extractSitemapLocs } from './discovery.js';

const DEFAULT_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'webflow-site-review/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function legacyDiscoverPages(rootUrl, manualPages) {
  const root = rootUrl.replace(/\/+$/, '');

  if (manualPages && manualPages.length > 0) {
    return manualPages.map((page) => {
      if (/^https?:\/\//i.test(page)) return page;
      const path = page.startsWith('/') ? page : `/${page}`;
      return `${root}${path}`;
    });
  }

  try {
    const sitemapUrl = `${root}/sitemap.xml`;
    const response = await fetchWithTimeout(sitemapUrl);

    if (!response.ok) return [rootUrl];

    const xml = await response.text();
    if (xml.includes('<sitemapindex')) {
      const childSitemapUrls = extractSitemapLocs(xml);
      const allUrls = [];
      for (const childUrl of childSitemapUrls) {
        try {
          const childResponse = await fetchWithTimeout(childUrl);
          if (childResponse.ok) {
            const childXml = await childResponse.text();
            allUrls.push(...extractLocs(childXml));
          }
        } catch {
        }
      }
      return allUrls.length > 0 ? allUrls : [rootUrl];
    }
    const urls = extractLocs(xml);
    return urls.length > 0 ? urls : [rootUrl];
  } catch {
    return [rootUrl];
  }
}

const MAX_REDIRECTS = 10;

async function legacyFetchPage(url, cache, opts = {}) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const redirectChain = [];
  let currentUrl = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'webflow-site-review/1.0',
        },
      });
    } catch (err) {
      clearTimeout(timer);
      throw new Error(`Fetch failed for ${currentUrl}: ${err.message}`, { cause: err });
    }
    clearTimeout(timer);
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      redirectChain.push(currentUrl);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    const html = await response.text();
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const result = {
      html,
      headers,
      statusCode: response.status,
      redirectChain,
      finalUrl: currentUrl,
    };

    cache.set(url, result);
    return result;
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECTS}) for ${url}`);
}

export { legacyFetchPage, legacyDiscoverPages };
