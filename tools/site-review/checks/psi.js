// Calls the PageSpeed Insights API and reports field Core Web Vitals above the configured thresholds, with the PSI JSON field as evidence.

import { sleep } from '../lib/finding.js';
import { contentPages, pageRow, siteRow, rootOf } from './_shared.js';

export const PSI_API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
export const PSI_MAX_PAGES = 10;
const PSI_TIMEOUT_MS = 30_000;
const STRATEGIES = ['mobile', 'desktop'];

export const METRICS = Object.freeze([
  { id: 'psi-lcp', key: 'LARGEST_CONTENTFUL_PAINT_MS', threshold: 'lcp', unit: 'ms', scale: 1 },
  { id: 'psi-cls', key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE', threshold: 'cls', unit: '', scale: 100 },
  { id: 'psi-inp', key: 'INTERACTION_TO_NEXT_PAINT', threshold: 'inp', unit: 'ms', scale: 1 },
]);

const DEFAULT_LIMITS = { lcp: 2500, cls: 0.1, inp: 200 };

export const meta = { name: 'psi', taxonomyIds: METRICS.map((m) => m.id), tier: 1, crossPage: false, audit: true };

async function callPsi(pageUrl, strategy, apiKey, fetchImpl, log) {
  const params = new URLSearchParams({ url: pageUrl, strategy, key: apiKey, category: 'performance' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${PSI_API_BASE}?${params}`, { signal: controller.signal });
    if (!response.ok) {
      log?.warn?.(`PSI API returned ${response.status} for ${pageUrl} (${strategy})`);
      return null;
    }
    return await response.json();
  } catch (err) {
    log?.warn?.(`PSI API request failed for ${pageUrl} (${strategy}): ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function limitOf(config, name) {
  return config?.thresholds?.[name]?.warning ?? DEFAULT_LIMITS[name];
}

export function metricRows(fact, results, config) {
  const rows = [];
  for (const metric of METRICS) {
    let worst = null;
    for (const { strategy, data } of results) {
      const field = data?.loadingExperience?.metrics?.[metric.key];
      if (typeof field?.percentile !== 'number') continue;
      const value = field.percentile / metric.scale;
      if (!worst || value > worst.value) worst = { strategy, value, field };
    }
    if (!worst || worst.value <= limitOf(config, metric.threshold)) continue;
    rows.push(pageRow(fact, metric.id, {
      value: worst.field.percentile,
      selector: `loadingExperience.metrics.${metric.key}.percentile`,
      snippet: `${worst.strategy}: ${metric.key} percentile ${worst.field.percentile} (${worst.field.category ?? 'n/a'})`,
    }));
  }
  return rows;
}

export async function check({ facts = [], site, config, log, fetchImpl = globalThis.fetch } = {}) {
  if (!config?.googlePsiApiKey) {
    return meta.taxonomyIds.map((id) => siteRow(site, facts, id, { state: 'unknown', reason: 'not_run', selector: 'psi', snippet: '' }));
  }
  const rootKey = rootOf(site, facts).urlKey;
  const pages = contentPages(facts).sort((a, b) => (a.urlKey === rootKey ? -1 : b.urlKey === rootKey ? 1 : 0)).slice(0, PSI_MAX_PAGES);
  const pause = config.psiDelayMs ?? 2000;
  const rows = [];
  let first = true;
  for (const fact of pages) {
    const results = [];
    for (const strategy of STRATEGIES) {
      if (!first && pause > 0) await sleep(pause);
      first = false;
      const data = await callPsi(fact.finalUrl ?? fact.url, strategy, config.googlePsiApiKey, fetchImpl, log);
      if (data) results.push({ strategy, data });
    }
    if (results.length === 0) {
      rows.push(...meta.taxonomyIds.map((id) => pageRow(fact, id, { state: 'unknown', reason: 'fetch_failed', selector: 'psi', snippet: '' })));
      continue;
    }
    rows.push(...metricRows(fact, results, config));
  }
  return rows;
}
