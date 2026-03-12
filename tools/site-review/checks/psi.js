/**
 * psi.js — PageSpeed Insights API check (Core Web Vitals + Lighthouse)
 *
 * Calls the PSI API for each page with both mobile and desktop strategies.
 * Extracts CWV metrics (LCP, CLS, INP) and Lighthouse category scores.
 * Requires a Google PSI API key in config.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'psi',
  label: 'PageSpeed Insights',
  category: 'performance',
  tier: 1,
  parallel: false,
};

const PSI_API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const RATE_LIMIT_MS = 2000;
const PSI_TIMEOUT_MS = 30_000;

/**
 * Delay for the given ms.
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify a CWV metric value against config thresholds.
 * @param {number} value
 * @param {{ warning: number, critical: number }} thresholds
 * @returns {'critical'|'warning'|null}
 */
function classifyCwv(value, thresholds) {
  if (value > thresholds.critical) return 'critical';
  if (value > thresholds.warning) return 'warning';
  return null;
}

/**
 * Call the PSI API for a given URL and strategy.
 * @param {string} pageUrl
 * @param {string} strategy - 'mobile' or 'desktop'
 * @param {string} apiKey
 * @returns {Promise<object|null>} parsed JSON or null on error
 */
async function callPsi(pageUrl, strategy, apiKey, log) {
  const params = new URLSearchParams({
    url: pageUrl,
    strategy,
    key: apiKey,
    category: 'performance',
  });

  // Also request accessibility, best-practices, seo
  params.append('category', 'accessibility');
  params.append('category', 'best-practices');
  params.append('category', 'seo');

  const apiUrl = `${PSI_API_BASE}?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    if (!response.ok) {
      log.warn(`PSI API returned ${response.status} for ${pageUrl} (${strategy})`);
      return null;
    }
    return await response.json();
  } catch (err) {
    log.warn(`PSI API request failed for ${pageUrl} (${strategy}): ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract CWV findings from a PSI response.
 * @param {object} data - PSI API response
 * @param {string} pageUrl
 * @param {string} strategy
 * @param {object} thresholds - config.thresholds
 * @returns {object[]} findings
 */
function extractCwvFindings(data, pageUrl, strategy, thresholds) {
  const findings = [];
  const metrics = data?.loadingExperience?.metrics;
  if (!metrics) return findings;

  const cwvMap = [
    { key: 'LARGEST_CONTENTFUL_PAINT_MS', label: 'LCP', unit: 'ms', thresholds: thresholds.lcp },
    { key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE', label: 'CLS', unit: '', thresholds: thresholds.cls },
    { key: 'INTERACTION_TO_NEXT_PAINT', label: 'INP', unit: 'ms', thresholds: thresholds.inp },
  ];

  for (const { key, label, unit, thresholds: t } of cwvMap) {
    const metric = metrics[key];
    if (!metric) continue;

    // CLS percentile is multiplied by 100 in the API (e.g. 8 = 0.08)
    const value = key === 'CUMULATIVE_LAYOUT_SHIFT_SCORE'
      ? metric.percentile / 100
      : metric.percentile;

    const severity = classifyCwv(value, t);
    if (!severity) continue;

    const displayValue = unit
      ? `${value}${unit}`
      : value.toFixed(2);

    findings.push(createFinding({
      check: 'psi',
      severity,
      category: 'performance',
      title: `Poor ${label} (${strategy}): ${displayValue}`,
      description: `${label} for ${pageUrl} (${strategy}) is ${displayValue}, which exceeds the ${severity} threshold of ${severity === 'critical' ? t.critical : t.warning}${unit}.`,
      url: pageUrl,
      actual: value,
      expected: `<= ${t.warning}${unit}`,
      meta: { strategy, metric: label, apiCategory: metric.category },
      recommendation: `Improve ${label} by optimizing ${label === 'LCP' ? 'largest content element loading' : label === 'CLS' ? 'layout stability' : 'interaction responsiveness'}.`,
    }));
  }

  return findings;
}

/**
 * Extract Lighthouse score findings from a PSI response.
 * @param {object} data - PSI API response
 * @param {string} pageUrl
 * @param {string} strategy
 * @returns {object[]} findings
 */
function extractLighthouseFindings(data, pageUrl, strategy) {
  const findings = [];
  const categories = data?.lighthouseResult?.categories;
  if (!categories) return findings;

  const categoryMap = [
    { key: 'performance', label: 'Performance', findingCategory: 'performance' },
    { key: 'accessibility', label: 'Accessibility', findingCategory: 'accessibility' },
    { key: 'best-practices', label: 'Best Practices', findingCategory: 'code-quality' },
    { key: 'seo', label: 'SEO', findingCategory: 'seo' },
  ];

  for (const { key, label, findingCategory } of categoryMap) {
    const cat = categories[key];
    if (!cat || cat.score == null) continue;

    const score = Math.round(cat.score * 100);

    let severity = null;
    if (key === 'performance') {
      if (score < 30) severity = 'critical';
      else if (score < 50) severity = 'warning';
    } else {
      if (score < 50) severity = 'info';
    }

    if (!severity) continue;

    findings.push(createFinding({
      check: 'psi',
      severity,
      category: findingCategory,
      title: `Low Lighthouse ${label} score (${strategy}): ${score}`,
      description: `Lighthouse ${label} score for ${pageUrl} (${strategy}) is ${score}/100.`,
      url: pageUrl,
      actual: score,
      expected: '>= 50',
      meta: { strategy, lighthouseCategory: key, score },
      recommendation: `Improve the ${label} score by addressing Lighthouse audit recommendations.`,
    }));
  }

  return findings;
}

async function check({ url, pages, config, log, fetchPage }) {
  if (!config.googlePsiApiKey) {
    log.log('psi: skipping — no Google PSI API key configured');
    return [];
  }

  const findings = [];
  const strategies = ['mobile', 'desktop'];
  let isFirst = true;

  for (const pageUrl of pages) {
    for (const strategy of strategies) {
      if (!isFirst) {
        await delay(RATE_LIMIT_MS);
      }
      isFirst = false;

      log.log(`psi: checking ${pageUrl} (${strategy})`);
      const data = await callPsi(pageUrl, strategy, config.googlePsiApiKey, log);

      if (!data) continue;

      findings.push(...extractCwvFindings(data, pageUrl, strategy, config.thresholds));
      findings.push(...extractLighthouseFindings(data, pageUrl, strategy));
    }
  }

  return findings;
}

export { check, meta };
