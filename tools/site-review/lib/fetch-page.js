/**
 * fetch-page.js — Fetch HTML + headers + status + redirect chain
 *
 * Uses native fetch with manual redirect following to capture
 * the full redirect chain. Results are cached per URL per run.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 10;

/**
 * Fetch a page, recording its redirect chain. Cached per URL per run.
 *
 * @param {string} url
 * @param {Map} cache - shared per-run cache
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs] - override timeout (default 15s)
 * @returns {Promise<{ html: string, headers: Object, statusCode: number, redirectChain: string[] }>}
 */
async function fetchPage(url, cache, opts = {}) {
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

    // Handle redirects (3xx with location header)
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      redirectChain.push(currentUrl);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    // Final response — read body and build result
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
    };

    cache.set(url, result);
    return result;
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECTS}) for ${url}`);
}

export { fetchPage };
