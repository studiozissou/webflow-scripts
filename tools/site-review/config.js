/**
 * config.js — Site Review configuration, thresholds, and env loading
 *
 * Loads .env via dotenv at import time. Exports thresholds for
 * performance metrics, SEO checks, and severity/category constants.
 */

import dotenv from 'dotenv';
dotenv.config();

const SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

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

export { loadConfig, SEVERITIES, CATEGORIES };
