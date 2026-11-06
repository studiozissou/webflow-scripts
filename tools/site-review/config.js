/**
 * config.js — Site Review configuration, thresholds, and env loading
 *
 * Loads .env via dotenv at import time. Exports thresholds for
 * performance metrics, SEO checks, and severity/category constants.
 */

import dotenv from 'dotenv';
dotenv.config();

const SEVERITIES = Object.freeze(['error', 'warning', 'notice']);

const LEGACY_SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

const LEGACY_SEVERITY_MAP = Object.freeze({
  critical: 'error',
  warning: 'warning',
  info: 'notice',
});

const STATES = Object.freeze(['pass', 'fail', 'unknown']);

const UNKNOWN_REASONS = Object.freeze([
  'fetch_failed',
  'timeout',
  'blocked',
  'non_html',
  'truncated',
  'not_run',
  'cap_exceeded',
]);

const SCORE_WEIGHTS = Object.freeze({ error: 1, warning: 0.5, notice: 0 });

const SCHEMA_VERSION = 1;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 site-review/2.0 (+https://github.com/studiozissou/webflow-scripts)';

const RENDERED_FIELDS = Object.freeze([
  'title',
  'metaDescription',
  'canonicals',
  'robotsMeta',
  'h1',
  'hreflang',
  'jsonLd',
]);

const AUDIT_THRESHOLDS = Object.freeze({
  titleMin: 30,
  titleMax: 70,
  wordCountMin: 200,
  textToHtmlMin: 0.1,
  htmlBytesMax: 2_000_000,
  linksMax: 3000,
  redirectChainMin: 2,
  externalBlockedStatuses: Object.freeze([403, 429, 999]),
});

const DEFAULT_CRAWL_CONFIG = Object.freeze({
  url: null,
  canonicalHost: null,
  locales: Object.freeze([]),
  acceptLanguage: 'en-GB,en;q=0.9',
  includeHosts: Object.freeze([]),
  excludePaths: Object.freeze([]),
  concurrency: 4,
  timeoutMs: 15_000,
  maxBytes: 5_000_000,
  renderSample: 20,
  renderMax: 500,
  renderDrift: 5,
  renderFlagged: 20,
  externalCap: 2000,
  slowAbortMs: 8000,
  slowAbortSample: 50,
  reverifyDelayMs: 2000,
  semrushProjectId: null,
  templatesLabel: Object.freeze({}),
});

const CATEGORIES = Object.freeze([
  'performance',
  'seo',
  'accessibility',
  'security',
  'code-quality',
]);

/**
 * Returns the full config object with all thresholds and env-sourced keys.
 */
function loadConfig() {
  return {
    googlePsiApiKey: process.env.GOOGLE_PSI_API_KEY || '',

    audit: { thresholds: AUDIT_THRESHOLDS },

    crawl: { ...DEFAULT_CRAWL_CONFIG },

    thresholds: {
      lcp: {
        warning: 2500,   // > 2.5s
        critical: 4000,  // > 4s
      },
      cls: {
        warning: 0.1,
        critical: 0.25,
      },
      inp: {
        warning: 200,    // > 200ms
        critical: 500,   // > 500ms
      },
      titleLength: {
        warning: { min: 30, max: 60 },  // outside this range
        critical: null,                   // missing entirely
      },
      descriptionLength: {
        warning: { min: 70, max: 160 },  // outside this range
        critical: null,                    // missing entirely
      },
      redirectChain: {
        warning: 1,   // > 1 hop
        critical: 3,  // > 3 hops
      },
      brokenLink: {
        critical: true, // any 4xx/5xx
      },
    },

    severityMap: Object.freeze({
      critical: 3,
      warning: 2,
      info: 1,
    }),
  };
}

export {
  loadConfig,
  SEVERITIES,
  LEGACY_SEVERITIES,
  LEGACY_SEVERITY_MAP,
  STATES,
  UNKNOWN_REASONS,
  SCORE_WEIGHTS,
  SCHEMA_VERSION,
  DEFAULT_USER_AGENT,
  RENDERED_FIELDS,
  AUDIT_THRESHOLDS,
  DEFAULT_CRAWL_CONFIG,
  CATEGORIES,
};
