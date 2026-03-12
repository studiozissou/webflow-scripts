/**
 * security-headers.js — HTTP security header validation
 *
 * Checks the root URL response headers for recommended
 * security headers. Only inspects the root URL, not per-page.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'security-headers',
  label: 'Security Headers',
  category: 'security',
  tier: 1,
  parallel: true,
};

const EXPECTED_HEADERS = [
  {
    header: 'strict-transport-security',
    severity: 'warning',
    recommendation: 'Add Strict-Transport-Security header with max-age of at least 31536000 (1 year).',
  },
  {
    header: 'content-security-policy',
    severity: 'warning',
    recommendation: 'Add a Content-Security-Policy header to prevent XSS and data injection attacks.',
  },
  {
    header: 'x-content-type-options',
    severity: 'warning',
    recommendation: 'Add X-Content-Type-Options: nosniff to prevent MIME type sniffing.',
  },
  {
    header: 'x-frame-options',
    severity: 'info',
    recommendation: 'Add X-Frame-Options (DENY or SAMEORIGIN) to prevent clickjacking.',
  },
  {
    header: 'referrer-policy',
    severity: 'info',
    recommendation: 'Add a Referrer-Policy header (e.g., strict-origin-when-cross-origin).',
  },
  {
    header: 'permissions-policy',
    severity: 'info',
    recommendation: 'Add a Permissions-Policy header to control browser feature access.',
  },
];

async function check({ url, pages, config, log, fetchPage }) {
  log.log(`security-headers: checking ${url}`);

  const { headers } = await fetchPage(url);
  const findings = [];

  for (const { header, severity, recommendation } of EXPECTED_HEADERS) {
    if (headers[header] === undefined) {
      findings.push(createFinding({
        check: 'security-headers',
        severity,
        category: 'security',
        title: `Missing ${header}`,
        description: `The response is missing the ${header} header.`,
        url,
        meta: { header },
        recommendation,
      }));
    }
  }

  return findings;
}

export { check, meta };
