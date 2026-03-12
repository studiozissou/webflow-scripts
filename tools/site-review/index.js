#!/usr/bin/env node

/**
 * index.js — Site Review CLI entry point
 *
 * Orchestrates page discovery, check execution, report generation,
 * and output. Produces both JSON and Markdown reports.
 *
 * Usage:
 *   node tools/site-review/index.js --url https://example.com
 *   node tools/site-review/index.js --url https://example.com --tier 2 --verbose
 *   node tools/site-review/index.js --url https://example.com --pages /about,/contact
 *   node tools/site-review/index.js --url https://example.com --skip psi,broken-links
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { discoverPages } from './lib/discovery.js';
import { runChecks } from './lib/runner.js';
import { generateJsonReport } from './lib/report/json-report.js';
import { generateMarkdownReport } from './lib/report/markdown-report.js';

function printUsage() {
  console.error('site-review — Automated Webflow site auditor\n');
  console.error('Usage:');
  console.error('  node tools/site-review/index.js --url https://example.com');
  console.error('  node tools/site-review/index.js --url https://example.com --tier 2 --verbose\n');
  console.error('Flags:');
  console.error('  --url <url>            Root URL to review (required)');
  console.error('  --tier <1|2>           Tier level (default: 1)');
  console.error('  --pages <url1,url2>    Override page discovery with comma-separated URLs');
  console.error('  --concurrency <n>      Max parallel checks (default: 5)');
  console.error('  --skip <name1,name2>   Comma-separated check names to skip');
  console.error('  --verbose              Enable verbose logging');
  console.error('  --output <dir>         Override output directory');
  console.error('  --help                 Show this help message');
}

function parseArgs(argv) {
  const args = {
    url: null,
    tier: 1,
    pages: null,
    concurrency: 5,
    skip: [],
    verbose: false,
    output: null,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--url':
        args.url = argv[++i];
        break;
      case '--tier':
        args.tier = parseInt(argv[++i], 10);
        break;
      case '--pages':
        args.pages = argv[++i].split(',').map((p) => p.trim());
        break;
      case '--concurrency':
        args.concurrency = parseInt(argv[++i], 10);
        break;
      case '--skip':
        args.skip = argv[++i].split(',').map((s) => s.trim());
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

/**
 * Extract domain from URL for directory naming.
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (isNaN(args.tier) || args.tier < 1) {
    console.error('Error: --tier must be a positive integer');
    process.exit(1);
  }

  if (isNaN(args.concurrency) || args.concurrency < 1) {
    console.error('Error: --concurrency must be a positive integer');
    process.exit(1);
  }

  if (!args.url) {
    printUsage();
    process.exit(1);
  }

  const config = loadConfig();
  const log = createLogger(args.verbose);

  // Discover pages
  log.log(`Discovering pages for ${args.url}...`);
  let pages;
  try {
    pages = await discoverPages(args.url, args.pages);
  } catch (err) {
    log.error(`Page discovery failed: ${err.message}`);
    process.exit(1);
  }
  log.log(`Found ${pages.length} pages`);

  // Run checks
  console.error(`Running site review on ${args.url} (tier ${args.tier}, ${pages.length} pages)...`);
  let results;
  try {
    results = await runChecks({
      url: args.url,
      pages,
      tier: args.tier,
      concurrency: args.concurrency,
      skip: args.skip,
      config,
      log,
    });
  } catch (err) {
    log.error(`Check execution failed: ${err.message}`);
    process.exit(1);
  }

  // Determine check count from timing keys
  const checksRun = Object.keys(results.timing.checks).length;

  // Generate reports
  const reportMeta = {
    url: args.url,
    tier: args.tier,
    pagesAudited: pages.length,
    checksRun,
  };

  const jsonReport = generateJsonReport(results, reportMeta);
  const mdReport = generateMarkdownReport(results, reportMeta);

  // Determine output directory
  const domain = extractDomain(args.url);
  const dateStr = new Date().toISOString().split('T')[0];
  const outputDir = args.output
    || join(import.meta.dirname, 'reports', `${domain}-${dateStr}`);

  await mkdir(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'report.json');
  const mdPath = join(outputDir, 'report.md');

  await writeFile(jsonPath, jsonReport, 'utf-8');
  await writeFile(mdPath, mdReport, 'utf-8');

  // Print summary to stderr
  const { summary, timing } = results;
  console.error('');
  console.error('--- Site Review Complete ---');
  console.error(`  Critical: ${summary.critical}`);
  console.error(`  Warning:  ${summary.warning}`);
  console.error(`  Info:     ${summary.info}`);
  console.error(`  Total:    ${summary.total}`);
  console.error(`  Duration: ${(timing.total / 1000).toFixed(1)}s`);
  console.error('');
  console.error(`Reports written to:`);
  console.error(`  ${jsonPath}`);
  console.error(`  ${mdPath}`);
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
