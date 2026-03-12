/**
 * mixed-content.js — Detect HTTP resources on HTTPS pages
 *
 * Scans HTML for http:// URLs in src, href (non-anchor), and action
 * attributes. Only runs when the root URL is HTTPS.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'mixed-content',
  label: 'Mixed Content',
  category: 'security',
  tier: 1,
  parallel: true,
};

/**
 * Find all mixed-content resources in HTML.
 * Skips <a> tags — linking to HTTP pages is acceptable.
 * Checks: <img src>, <script src>, <link href>, <video src>,
 *         <audio src>, <source src>, <iframe src>, <form action>
 *
 * @param {string} html
 * @returns {{ tag: string, attr: string, url: string }[]}
 */
function findMixedResources(html) {
  const results = [];

  // Match tags with src attribute (not <a>)
  const srcRegex = /<(?!a\b)(img|script|video|audio|source|iframe)\b[^>]+src=["'](http:\/\/[^"']+)["']/gi;
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    results.push({ tag: match[1].toLowerCase(), attr: 'src', url: match[2] });
  }

  // Match <link href="http://...">
  const linkRegex = /<link\b[^>]+href=["'](http:\/\/[^"']+)["']/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    results.push({ tag: 'link', attr: 'href', url: match[1] });
  }

  // Match <form action="http://...">
  const formRegex = /<form\b[^>]+action=["'](http:\/\/[^"']+)["']/gi;
  while ((match = formRegex.exec(html)) !== null) {
    results.push({ tag: 'form', attr: 'action', url: match[1] });
  }

  return results;
}

async function check({ url, pages, config, log, fetchPage }) {
  // Only relevant for HTTPS sites
  if (!url.startsWith('https://')) {
    log.log('mixed-content: skipping — site is not HTTPS');
    return [];
  }

  const findings = [];

  for (const pageUrl of pages) {
    log.log(`mixed-content: checking ${pageUrl}`);

    const { html } = await fetchPage(pageUrl);
    const mixed = findMixedResources(html);

    for (const { tag, attr, url: resourceUrl } of mixed) {
      findings.push(createFinding({
        check: 'mixed-content',
        severity: 'warning',
        category: 'security',
        title: `Mixed content: <${tag} ${attr}="${resourceUrl}">`,
        description: `The HTTPS page at ${pageUrl} loads an HTTP resource: ${resourceUrl}`,
        url: pageUrl,
        element: `<${tag} ${attr}="${resourceUrl}">`,
        actual: resourceUrl,
        expected: resourceUrl.replace('http://', 'https://'),
        recommendation: 'Change the resource URL to use HTTPS, or use a protocol-relative URL.',
      }));
    }
  }

  return findings;
}

export { check, meta };
