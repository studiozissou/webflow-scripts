#!/usr/bin/env node
/**
 * entity-audit — Compare entity signals between an old and a current site
 *
 * Fetches each mapped page pair, scores the entity signals on both, diffs them,
 * and writes a markdown report plus a JSON baseline. Re-running after edits
 * shows movement against the baseline, so this doubles as the monthly check.
 *
 * Usage:
 *   node tools/entity-audit/index.js --site tamsen-fadal
 *   node tools/entity-audit/index.js --site tamsen-fadal --out ./reports
 *   node tools/entity-audit/index.js --site tamsen-fadal --concurrency 4
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { getSite } from './config.js';
import { scorePage } from './lib/extract.js';
import { compareSite, summarise } from './lib/compare.js';
import { renderMarkdown } from './lib/report.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const TIMEOUT_MS = 25_000;

/** Parse `--key value` and `--flag` argv pairs. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

/**
 * Fetch a URL and return its HTML, or null if it is unreachable.
 * @returns {Promise<{html:string|null, status:number|null, error?:string}>}
 */
async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
    });
    const html = await res.text();
    return { html: res.ok ? html : null, status: res.status };
  } catch (err) {
    return { html: null, status: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Run async mapper over items with a bounded concurrency pool. */
async function pool(items, limit, mapper) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await mapper(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Fetch and score one side of a page pair. */
async function scoreSide(origin, path, entity) {
  if (!path) return { scored: null, url: null, status: null };
  const url = new URL(path, origin).href;
  const { html, status, error } = await fetchHtml(url);
  if (!html) {
    return { scored: null, url, status, error: error || `HTTP ${status}` };
  }
  return { scored: scorePage(html, { entity, origin }), url, status };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const siteKey = args.site || 'tamsen-fadal';
  const concurrency = Number(args.concurrency || 4);
  const site = getSite(siteKey);

  const outDir = resolve(
    args.out || `projects/${siteKey}/.claude/audits`,
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const mdPath = resolve(outDir, `entity-audit-${stamp}.md`);
  const jsonPath = resolve(outDir, `entity-audit-${stamp}.json`);

  console.log(`entity-audit: ${site.entity}`);
  console.log(`  old     ${site.old.origin}`);
  console.log(`  current ${site.current.origin}`);
  console.log(`  pages   ${site.pages.length}\n`);

  const pairs = await pool(site.pages, concurrency, async (page) => {
    const [oldSide, newSide] = await Promise.all([
      scoreSide(site.old.origin, page.old, site.entity),
      scoreSide(site.current.origin, page.current, site.entity),
    ]);

    const flag = (side, path) => {
      if (!path) return 'n/a';
      if (side.scored) return 'ok';
      return `FAIL(${side.error || side.status})`;
    };
    console.log(
      `  ${page.name.padEnd(28)} old:${flag(oldSide, page.old).padEnd(12)} new:${flag(newSide, page.current)}`,
    );

    return {
      slug: page.current || page.old,
      name: page.name,
      old: oldSide.scored,
      current: newSide.scored,
      oldUrl: oldSide.url,
      currentUrl: newSide.url,
      oldError: oldSide.error,
      currentError: newSide.error,
    };
  });

  const results = compareSite(pairs).map((r, i) => ({
    ...r,
    name: pairs[i].name,
    oldUrl: pairs[i].oldUrl,
    currentUrl: pairs[i].currentUrl,
    oldError: pairs[i].oldError,
    currentError: pairs[i].currentError,
  }));

  const summary = summarise(results);
  const markdown = renderMarkdown(results, summary, site);

  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(mdPath, markdown, 'utf8');
  await writeFile(
    jsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), site: siteKey, summary, results }, null, 2),
    'utf8',
  );

  console.log('\n─── summary ───');
  console.log(`  pages compared     ${summary.pagesCompared}`);
  console.log(`  pages regressed    ${summary.pagesRegressed}`);
  console.log(`  total regressions  ${summary.totalRegressions}`);
  console.log(`    high   ${summary.bySeverity.high || 0}`);
  console.log(`    medium ${summary.bySeverity.medium || 0}`);
  console.log(`    low    ${summary.bySeverity.low || 0}`);
  console.log(`\n  report   ${mdPath}`);
  console.log(`  baseline ${jsonPath}`);
}

main().catch((err) => {
  console.error(`entity-audit failed: ${err.message}`);
  process.exitCode = 1;
});
