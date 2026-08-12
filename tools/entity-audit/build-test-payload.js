#!/usr/bin/env node
/**
 * build-test-payload.js — Assemble a testable HTML document from schema files
 *
 * The Rich Results Test "Code" tab validates a full HTML document without the
 * markup ever going live. This stitches the site-wide graph together with one
 * page's block, exactly as the published page would render it, so validation
 * reflects the real deployed shape.
 *
 * Usage:
 *   node tools/entity-audit/build-test-payload.js <page-schema-file> [--title "..."]
 */

import { readFile } from 'node:fs/promises';

const SITEWIDE = 'projects/tamsen-fadal/schema/sitewide-graph.html';
const BLOCK_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Pull just the JSON-LD script blocks out of an authored file, dropping comments. */
async function blocksFrom(path, { blockIndex = null } = {}) {
  const raw = await readFile(path, 'utf8');
  const out = [];
  let m;
  while ((m = BLOCK_RE.exec(raw)) !== null) out.push(m[1].trim());
  if (blockIndex !== null) return out[blockIndex] ? [out[blockIndex]] : [];
  return out;
}

async function main() {
  const pageFile = process.argv[2];
  if (!pageFile) {
    console.error('usage: node tools/entity-audit/build-test-payload.js <page-schema-file> [--block N]');
    process.exit(1);
  }
  const blockArg = process.argv.includes('--block')
    ? Number(process.argv[process.argv.indexOf('--block') + 1])
    : null;

  const site = await blocksFrom(SITEWIDE);
  const page = pageFile === SITEWIDE ? [] : await blocksFrom(pageFile, { blockIndex: blockArg });

  const scripts = [...site, ...page]
    .map((b) => `<script type="application/ld+json">\n${b}\n</script>`)
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Schema validation payload</title>
${scripts}
</head>
<body><h1>Schema validation payload</h1></body>
</html>`;

  process.stdout.write(html);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
