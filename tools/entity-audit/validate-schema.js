#!/usr/bin/env node
/**
 * validate-schema.js — Local sanity check on authored JSON-LD files
 *
 * Catches the errors that waste a Rich Results Test round trip: malformed JSON,
 * unresolved @id references, Webflow binding tokens left in a non-template file,
 * and required-property gaps Google will warn about.
 *
 * Usage: node tools/entity-audit/validate-schema.js projects/tamsen-fadal/schema/*.html
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** Required properties Google enforces for rich results, by @type. */
const REQUIRED = {
  Book: ['name', 'author'],
  Event: ['name', 'startDate', 'location'],
  Article: ['headline'],
  PodcastEpisode: ['name'],
  PodcastSeries: ['name'],
  BreadcrumbList: ['itemListElement'],
  Person: ['name'],
  Organization: ['name'],
  WebSite: ['url'],
};

const BLOCK_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Properties whose nested nodes legitimately inherit context from the parent and
 * so are not held to the parent type's required-property rules. A workExample
 * Book, for instance, is an edition of the parent Book — it needs no own author.
 */
const INHERITING_PROPS = new Set(['workExample', 'hasPart', 'isPartOf', 'partOfSeries', 'episode']);

/**
 * Walk to every typed node exactly once. `seen` guards against a node being
 * counted twice when it is reachable via both @graph and Object.values.
 */
function collectNodes(node, out = [], seen = new Set(), inherited = false) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectNodes(n, out, seen, inherited));
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (seen.has(node)) return out;
  seen.add(node);

  if (node['@type'] && !inherited) out.push(node);

  for (const [key, v] of Object.entries(node)) {
    if (v && typeof v === 'object') {
      collectNodes(v, out, seen, inherited || INHERITING_PROPS.has(key));
    }
  }
  return out;
}

/** Every @id defined, and every @id referenced, across a set of parsed blocks. */
function idIndex(blocks) {
  const defined = new Set();
  const referenced = new Map();

  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    const keys = Object.keys(node);
    // A bare {"@id": "..."} with no @type is a reference, not a definition.
    if (node['@id'] && (node['@type'] || keys.length > 1)) defined.add(node['@id']);
    if (node['@id'] && !node['@type'] && keys.length === 1) {
      referenced.set(node['@id'], (referenced.get(node['@id']) || 0) + 1);
    }
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') walk(v, `${path}.${k}`);
    }
  };
  blocks.forEach((b, i) => walk(b, `block${i}`));
  return { defined, referenced };
}

async function validateFile(path) {
  const raw = await readFile(path, 'utf8');
  const isTemplate = /cms-templates/.test(path);
  const results = { path, blocks: 0, errors: [], warnings: [], types: new Set() };

  let m;
  let idx = 0;
  const parsed = [];
  while ((m = BLOCK_RE.exec(raw)) !== null) {
    idx += 1;
    results.blocks += 1;
    let body = m[1].trim();

    // Templates carry Webflow binding tokens that are not valid JSON until bound.
    if (isTemplate) {
      body = body.replace(/\+\{\{[^}]*\}\}/g, 'BOUND_FIELD');
    }

    try {
      const json = JSON.parse(body);
      parsed.push(json);
      for (const node of collectNodes(json)) {
        const t = node['@type'];
        const types = Array.isArray(t) ? t : [t];
        types.forEach((x) => results.types.add(x));
        for (const type of types) {
          for (const req of REQUIRED[type] || []) {
            if (node[req] === undefined) {
              results.warnings.push(`block ${idx}: ${type} missing required "${req}"`);
            }
          }
        }
      }
    } catch (err) {
      results.errors.push(`block ${idx}: invalid JSON — ${err.message}`);
      continue;
    }

    if (!isTemplate && /\+\{\{/.test(m[1])) {
      results.errors.push(`block ${idx}: contains an unbound Webflow token (+{{...}})`);
    }
  }

  results.parsed = parsed;
  return results;
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: node tools/entity-audit/validate-schema.js <files...>');
    process.exit(1);
  }

  const all = [];
  let errors = 0;
  let warnings = 0;

  for (const f of files) {
    const r = await validateFile(f);
    all.push(r);
    errors += r.errors.length;
    warnings += r.warnings.length;

    const status = r.errors.length ? 'FAIL' : r.warnings.length ? 'WARN' : 'PASS';
    console.log(`\n${status}  ${basename(f)}  (${r.blocks} block${r.blocks === 1 ? '' : 's'})`);
    console.log(`      types: ${[...r.types].sort().join(', ') || '(none)'}`);
    r.errors.forEach((e) => console.log(`      ERROR  ${e}`));
    r.warnings.forEach((w) => console.log(`      warn   ${w}`));
  }

  // Cross-file @id resolution — references must resolve against the site graph.
  const everyBlock = all.flatMap((r) => r.parsed || []);
  const { defined, referenced } = idIndex(everyBlock);
  const unresolved = [...referenced.keys()].filter((id) => !defined.has(id));

  console.log('\n─── cross-file @id check ───');
  console.log(`  defined:    ${defined.size}`);
  console.log(`  referenced: ${referenced.size}`);
  if (unresolved.length) {
    console.log('  UNRESOLVED references (must be defined by the sitewide graph):');
    unresolved.forEach((id) => console.log(`    ✗ ${id}`));
  } else {
    console.log('  all references resolve ✓');
  }

  console.log(`\n─── summary ───\n  errors ${errors}  warnings ${warnings}`);
  if (errors) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`validate-schema failed: ${err.message}`);
  process.exitCode = 1;
});
