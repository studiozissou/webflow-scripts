/**
 * redirect-chains.js — Detect long redirect chains for crawled pages
 *
 * Inspects the redirectChain already captured by fetchPage for each page
 * in the pages array. Applies config thresholds: > warning hops = warning,
 * > critical hops = critical.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'redirect-chains',
  label: 'Redirect Chains',
  category: 'seo',
  tier: 1,
  parallel: true,
};

async function check({ url, pages, config, log, fetchPage }) {
  const findings = [];
  const { redirectChain: thresholds } = config.thresholds;

  for (const pageUrl of pages) {
    log.log(`redirect-chains: checking ${pageUrl}`);

    const result = await fetchPage(pageUrl);
    const hops = result.redirectChain.length;

    if (hops <= thresholds.warning) continue;

    const severity = hops > thresholds.critical ? 'critical' : 'warning';
    const chain = [...result.redirectChain, pageUrl].join(' -> ');

    findings.push(createFinding({
      check: 'redirect-chains',
      severity,
      category: 'seo',
      title: `Redirect chain (${hops} hops): ${pageUrl}`,
      description: `The page at ${pageUrl} goes through ${hops} redirects before reaching the final URL.`,
      url: pageUrl,
      actual: hops,
      expected: `<= ${thresholds.warning} hops`,
      meta: { chain },
      recommendation: 'Reduce the number of redirects. Update links to point directly to the final URL.',
    }));
  }

  return findings;
}

export { check, meta };
