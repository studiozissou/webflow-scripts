/**
 * broken-links.js — HTTP HEAD link checker
 *
 * Parses all linkable URLs from page HTML (a href, img src, link href,
 * script src), deduplicates, and checks each with a HEAD request.
 * Uses a concurrency pool to limit parallel requests.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'broken-links',
  label: 'Broken Links',
  category: 'seo',
  tier: 1,
  parallel: false,
};

const CONCURRENCY = 10;
const TIMEOUT_MS = 10_000;

const SKIP_PROTOCOLS = /^(mailto:|tel:|javascript:|data:|blob:)/i;
const FRAGMENT_ONLY = /^#/;

/**
 * Extract all linkable URLs from HTML using regex.
 * Captures: <a href>, <img src>, <link href>, <script src>
 * @param {string} html
 * @returns {string[]} raw href/src values
 */
function extractUrls(html) {
  const urls = [];
  // <a href="...">
  const aRegex = /<a\b[^>]+href=["']([^"']+)["']/gi;
  // <img src="...">
  const imgRegex = /<img\b[^>]+src=["']([^"']+)["']/gi;
  // <link href="...">
  const linkRegex = /<link\b[^>]+href=["']([^"']+)["']/gi;
  // <script src="...">
  const scriptRegex = /<script\b[^>]+src=["']([^"']+)["']/gi;

  for (const regex of [aRegex, imgRegex, linkRegex, scriptRegex]) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
  }
  return urls;
}

/**
 * Simple concurrency pool — runs async tasks with a max concurrency limit.
 * @param {Array<() => Promise>} tasks
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function pool(tasks, limit) {
  const results = [];
  let index = 0;

  async function runNext() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch {
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

/**
 * HEAD-check a single URL and return a finding or null.
 * @param {string} resolvedUrl
 * @param {string} pageUrl
 * @returns {Promise<object|null>}
 */
async function checkUrl(resolvedUrl, pageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(resolvedUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'webflow-site-review/1.0' },
    });
    clearTimeout(timer);

    if (response.status === 404) {
      return createFinding({
        check: 'broken-links',
        severity: 'critical',
        category: 'seo',
        title: `Broken link (404): ${resolvedUrl}`,
        description: `A link on ${pageUrl} points to ${resolvedUrl} which returns 404 Not Found.`,
        url: pageUrl,
        element: resolvedUrl,
        actual: 404,
        recommendation: 'Remove or update the broken link.',
      });
    }

    if (response.status >= 400 && response.status < 500) {
      return createFinding({
        check: 'broken-links',
        severity: 'critical',
        category: 'seo',
        title: `Broken link (${response.status}): ${resolvedUrl}`,
        description: `A link on ${pageUrl} points to ${resolvedUrl} which returns ${response.status}.`,
        url: pageUrl,
        element: resolvedUrl,
        actual: response.status,
        recommendation: 'Remove or update the broken link.',
      });
    }

    if (response.status >= 500) {
      return createFinding({
        check: 'broken-links',
        severity: 'warning',
        category: 'seo',
        title: `Server error (${response.status}): ${resolvedUrl}`,
        description: `A link on ${pageUrl} points to ${resolvedUrl} which returns ${response.status}.`,
        url: pageUrl,
        element: resolvedUrl,
        actual: response.status,
        recommendation: 'Check if the target server is down or the URL is correct.',
      });
    }

    return null;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return createFinding({
        check: 'broken-links',
        severity: 'info',
        category: 'seo',
        title: `Timeout checking: ${resolvedUrl}`,
        description: `HEAD request to ${resolvedUrl} timed out after ${TIMEOUT_MS}ms.`,
        url: pageUrl,
        element: resolvedUrl,
        recommendation: 'The target may be slow or unreachable. Verify manually.',
      });
    }
    // Network errors — info severity
    return createFinding({
      check: 'broken-links',
      severity: 'info',
      category: 'seo',
      title: `Error checking: ${resolvedUrl}`,
      description: `HEAD request to ${resolvedUrl} failed: ${err.message}`,
      url: pageUrl,
      element: resolvedUrl,
      recommendation: 'Verify the link manually.',
    });
  }
}

async function check({ url, pages, config, log, fetchPage }) {
  const findings = [];

  for (const pageUrl of pages) {
    log.log(`broken-links: checking ${pageUrl}`);

    const { html } = await fetchPage(pageUrl);
    const rawUrls = extractUrls(html);

    // Resolve and deduplicate
    const seen = new Set();
    const resolvedUrls = [];

    for (const raw of rawUrls) {
      if (FRAGMENT_ONLY.test(raw)) continue;
      if (SKIP_PROTOCOLS.test(raw)) continue;

      let resolved;
      try {
        resolved = new URL(raw, pageUrl).href;
      } catch {
        continue; // malformed URL
      }

      // Only allow http/https protocols
      const protocol = new URL(resolved).protocol;
      if (protocol !== 'http:' && protocol !== 'https:') continue;

      if (!seen.has(resolved)) {
        seen.add(resolved);
        resolvedUrls.push(resolved);
      }
    }

    log.log(`broken-links: ${resolvedUrls.length} unique URLs to check on ${pageUrl}`);

    const tasks = resolvedUrls.map((resolved) => () => checkUrl(resolved, pageUrl));
    const results = await pool(tasks, CONCURRENCY);

    for (const result of results) {
      if (result) findings.push(result);
    }
  }

  return findings;
}

export { check, meta };
