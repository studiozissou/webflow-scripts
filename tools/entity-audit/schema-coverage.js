#!/usr/bin/env node
/**
 * schema-coverage.js — Site-wide JSON-LD coverage map
 *
 * "Add schema to every page" needs an inventory before it needs a plan. This
 * reads the sitemap, groups URLs into templates by path shape (a CMS template
 * governs every item under it, so one sample answers for the whole group), then
 * fetches a sample from each group and records what JSON-LD it actually emits.
 *
 * Output is a coverage matrix: template → page count → schema present → types.
 *
 * Usage:
 *   node tools/entity-audit/schema-coverage.js
 *   node tools/entity-audit/schema-coverage.js --samples 2 --out report.md
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { extractJsonLd, jsonLdTypes, extractTitle } from './lib/extract.js';

const SITEMAP = 'https://www.tamsenfadal.com/sitemap.xml';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Collapse a URL to the template that governs it.
 * /blog/some-post → /blog/*   (one CMS template drives every item)
 * /about-tamsen   → /about-tamsen (a standalone page is its own template)
 */
function templateOf(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts.length === 1) return `/${parts[0]}`;
  return `/${parts.slice(0, -1).join('/')}/*`;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    return { html: await res.text(), status: res.status };
  } catch (err) {
    return { html: null, status: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const samples = Number(args.includes('--samples') ? args[args.indexOf('--samples') + 1] : 1);
  const outPath = resolve(
    args.includes('--out')
      ? args[args.indexOf('--out') + 1]
      : 'projects/tamsen-fadal/.claude/audits/schema-coverage.md',
  );

  console.log(`schema-coverage: reading ${SITEMAP}`);
  const { html: xml } = await fetchHtml(SITEMAP);
  if (!xml) throw new Error('could not read sitemap');

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  console.log(`  ${urls.length} URLs in sitemap\n`);

  // Group by template
  const groups = new Map();
  for (const u of urls) {
    let p;
    try {
      p = new URL(u).pathname;
    } catch {
      continue;
    }
    const t = templateOf(p);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(u);
  }

  // Sample each group
  const targets = [];
  for (const [tmpl, list] of groups) {
    for (const u of list.slice(0, samples)) targets.push({ tmpl, url: u, total: list.length });
  }

  console.log(`  ${groups.size} templates, sampling ${targets.length} pages\n`);

  const results = await pool(targets, 6, async (t) => {
    const { html, status } = await fetchHtml(t.url);
    if (!html) return { ...t, status, types: [], blocks: 0, error: true };
    const blocks = extractJsonLd(html);
    return {
      ...t,
      status,
      blocks: blocks.length,
      types: jsonLdTypes(blocks),
      title: extractTitle(html),
    };
  });

  // Merge samples back per template
  const byTemplate = new Map();
  for (const r of results) {
    const cur = byTemplate.get(r.tmpl) || { tmpl: r.tmpl, total: r.total, types: new Set(), blocks: 0, samples: [] };
    r.types.forEach((x) => cur.types.add(x));
    cur.blocks = Math.max(cur.blocks, r.blocks);
    cur.samples.push(r.url);
    byTemplate.set(r.tmpl, cur);
  }

  const rows = [...byTemplate.values()].sort((a, b) => b.total - a.total);

  const covered = rows.filter((r) => r.blocks > 0);
  const bare = rows.filter((r) => r.blocks === 0);
  const pagesCovered = covered.reduce((s, r) => s + r.total, 0);
  const pagesBare = bare.reduce((s, r) => s + r.total, 0);

  console.log('  TEMPLATE                                    PAGES  BLOCKS  TYPES');
  for (const r of rows) {
    console.log(
      `  ${r.tmpl.padEnd(42).slice(0, 42)}  ${String(r.total).padStart(5)}  ${String(r.blocks).padStart(6)}  ${[...r.types].join(', ') || '— none —'}`,
    );
  }

  const L = [];
  L.push('# Schema coverage map — tamsenfadal.com');
  L.push('');
  L.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}  `);
  L.push(`**Source:** ${SITEMAP} (${urls.length} URLs)  `);
  L.push(`**Templates:** ${rows.length} — sampling ${samples} page(s) each`);
  L.push('');
  L.push('A CMS template governs every item beneath it, so one sample answers for the whole group.');
  L.push('');
  L.push('| Metric | Value |');
  L.push('| --- | --- |');
  L.push(`| Templates with schema | ${covered.length} / ${rows.length} |`);
  L.push(`| Templates with NO schema | **${bare.length}** |`);
  L.push(`| Sitemap pages covered | ${pagesCovered} |`);
  L.push(`| Sitemap pages with NO schema | **${pagesBare}** |`);
  L.push('');
  L.push('## Templates with NO structured data');
  L.push('');
  L.push('| Template | Pages | Sample |');
  L.push('| --- | ---: | --- |');
  for (const r of bare) L.push(`| \`${r.tmpl}\` | ${r.total} | ${r.samples[0]} |`);
  L.push('');
  L.push('## Templates that already emit schema');
  L.push('');
  L.push('| Template | Pages | Types | Sample |');
  L.push('| --- | ---: | --- | --- |');
  for (const r of covered) {
    L.push(`| \`${r.tmpl}\` | ${r.total} | ${[...r.types].join(', ')} | ${r.samples[0]} |`);
  }
  L.push('');

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, L.join('\n'), 'utf8');

  console.log(`\n─── summary ───`);
  console.log(`  templates            ${rows.length}`);
  console.log(`  with schema          ${covered.length}`);
  console.log(`  WITHOUT schema       ${bare.length}`);
  console.log(`  sitemap pages bare   ${pagesBare} of ${urls.length}`);
  console.log(`\n  wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`schema-coverage failed: ${err.message}`);
  process.exitCode = 1;
});
