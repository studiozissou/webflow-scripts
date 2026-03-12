/**
 * discovery.js — Sitemap-based page discovery with manual override
 *
 * Parses sitemap.xml (and sitemap index files) for page URLs.
 * Falls back to just the root URL if sitemap is unavailable.
 * Handles <sitemapindex> by recursing into child sitemaps.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Fetch with a timeout via AbortController.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
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

/**
 * Extract <loc> URLs from a sitemap XML string.
 * Only matches <loc> tags that are direct children of <url> elements
 * (skips <image:loc>, <video:loc>, etc.).
 * @param {string} xml
 * @returns {string[]}
 */
function extractLocs(xml) {
  const urls = [];
  const locRegex = /<url>\s*<loc>\s*(.*?)\s*<\/loc>/gs;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'));
  }
  return urls;
}

/**
 * Extract child sitemap URLs from a <sitemapindex> XML string.
 * @param {string} xml
 * @returns {string[]}
 */
function extractSitemapLocs(xml) {
  const urls = [];
  const locRegex = /<sitemap>\s*<loc>\s*(.*?)\s*<\/loc>/gs;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'));
  }
  return urls;
}

/**
 * Discover pages to review.
 *
 * @param {string} rootUrl - Site root (e.g. https://example.com)
 * @param {string[]} [manualPages] - Override from --pages flag
 * @returns {Promise<string[]>} - Array of full page URLs
 */
async function discoverPages(rootUrl, manualPages) {
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

    // Handle sitemap index files (common on production Webflow sites)
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
          // Skip unreachable child sitemaps
        }
      }
      return allUrls.length > 0 ? allUrls : [rootUrl];
    }

    // Standard sitemap
    const urls = extractLocs(xml);
    return urls.length > 0 ? urls : [rootUrl];
  } catch {
    return [rootUrl];
  }
}

export { discoverPages, extractLocs, extractSitemapLocs };
