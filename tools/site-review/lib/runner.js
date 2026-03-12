/**
 * runner.js — Dynamic check loader, parallel executor, result collector
 *
 * Loads check modules from the checks/ directory (or accepts injected mocks),
 * filters by tier and skip list, runs parallel checks concurrently then
 * sequential checks in order, validates findings, and returns results.
 */

import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFinding } from './finding.js';
import { fetchPage } from './fetch-page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHECKS_DIR = join(__dirname, '..', 'checks');

/**
 * Load all check modules from the checks/ directory.
 * @returns {Promise<Array<{ meta: Object, check: Function }>>}
 */
async function loadCheckModules() {
  const files = await readdir(CHECKS_DIR);
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const modules = [];

  for (const file of jsFiles) {
    const filePath = join(CHECKS_DIR, file);
    const mod = await import(pathToFileURL(filePath).href);
    if (mod.meta && typeof mod.check === 'function') {
      modules.push(mod);
    }
  }

  return modules;
}

/**
 * Run a single check, catching errors gracefully.
 * @param {Object} checkModule
 * @param {Object} checkArgs
 * @param {Object} log
 * @returns {Promise<{ name: string, findings: Array, duration: number }>}
 */
async function executeCheck(checkModule, checkArgs, log) {
  const name = checkModule.meta.name;
  const start = performance.now();

  try {
    const findings = await checkModule.check(checkArgs);
    const duration = performance.now() - start;

    // Validate each finding
    const validated = [];
    for (const finding of findings) {
      const result = validateFinding(finding);
      if (!result.valid) {
        log.warn(`Invalid finding from ${name}: ${result.errors.join(', ')}`);
      }
      validated.push(finding);
    }

    return { name, findings: validated, duration };
  } catch (err) {
    const duration = performance.now() - start;
    log.error(`Check "${name}" threw: ${err.message}`);
    return { name, findings: [], duration };
  }
}

/**
 * Run checks with concurrency limit.
 * @param {Array} checks
 * @param {Object} checkArgs
 * @param {Object} log
 * @param {number} concurrency
 * @returns {Promise<Array<{ name: string, findings: Array, duration: number }>>}
 */
async function runParallel(checks, checkArgs, log, concurrency) {
  const results = [];
  const queue = [...checks];

  async function worker() {
    while (queue.length > 0) {
      const check = queue.shift();
      const result = await executeCheck(check, checkArgs, log);
      results.push(result);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

/**
 * Build summary from findings array.
 * @param {Array} findings
 * @returns {Object}
 */
function buildSummary(findings) {
  const summary = {
    total: findings.length,
    critical: 0,
    warning: 0,
    info: 0,
    byCategory: {},
  };

  for (const f of findings) {
    if (f.severity === 'critical') summary.critical++;
    else if (f.severity === 'warning') summary.warning++;
    else if (f.severity === 'info') summary.info++;

    summary.byCategory[f.category] = (summary.byCategory[f.category] || 0) + 1;
  }

  return summary;
}

/**
 * Run all applicable checks and return findings, summary, and timing.
 *
 * @param {Object} options
 * @param {string} options.url - Root URL
 * @param {string[]} options.pages - Page URLs
 * @param {number} options.tier - 1 or 2
 * @param {number} [options.concurrency] - Max parallel checks (default 5)
 * @param {string[]} [options.skip] - Check names to skip
 * @param {Object} options.config
 * @param {Object} options.log - Logger instance
 * @param {Array} [options.checks] - Override check modules (for testing)
 * @returns {Promise<{ findings: Finding[], summary: Object, timing: Object }>}
 */
async function runChecks(options) {
  const {
    url,
    pages,
    tier,
    concurrency = 5,
    skip = [],
    config,
    log,
  } = options;

  const totalStart = performance.now();

  // Load or use injected check modules
  const allChecks = options.checks ?? await loadCheckModules();

  // Filter by tier and skip list
  const applicable = allChecks.filter(
    (mod) => mod.meta.tier <= tier && !skip.includes(mod.meta.name),
  );

  log.log(`Running ${applicable.length} checks (tier <= ${tier})`);

  // Separate parallel vs sequential
  const parallelChecks = applicable.filter((mod) => mod.meta.parallel);
  const sequentialChecks = applicable.filter((mod) => !mod.meta.parallel);

  // Build shared check args with safe fetch wrapper
  const cache = new Map();
  const failedPages = new Set();
  const safeFetch = async (fetchUrl) => {
    try {
      return await fetchPage(fetchUrl, cache);
    } catch (err) {
      if (!failedPages.has(fetchUrl)) {
        failedPages.add(fetchUrl);
        log.warn(`Skipping unreachable page: ${fetchUrl} (${err.message})`);
      }
      return { html: '', status: 0, headers: new Headers(), redirectChain: [] };
    }
  };
  const checkArgs = { url, pages, config, log, fetchPage: safeFetch };

  // Run parallel batch
  const parallelResults = await runParallel(parallelChecks, checkArgs, log, concurrency);

  // Run sequential checks one at a time
  const sequentialResults = [];
  for (const check of sequentialChecks) {
    const result = await executeCheck(check, checkArgs, log);
    sequentialResults.push(result);
  }

  const allResults = [...parallelResults, ...sequentialResults];

  // Collect findings and timing
  const findings = allResults.flatMap((r) => r.findings);
  const checkTimings = {};
  for (const r of allResults) {
    checkTimings[r.name] = Math.round(r.duration * 100) / 100;
  }

  const totalDuration = performance.now() - totalStart;

  return {
    findings,
    summary: buildSummary(findings),
    timing: {
      total: Math.round(totalDuration * 100) / 100,
      checks: checkTimings,
    },
  };
}

export { runChecks };
