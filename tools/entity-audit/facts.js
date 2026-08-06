#!/usr/bin/env node
/**
 * facts.js — Dump a page's headings, copy and existing JSON-LD
 *
 * Grounding aid: schema must assert only what the page actually says, so this
 * prints the raw material before any markup is written.
 *
 * Usage: node tools/entity-audit/facts.js <url> [textChars]
 */

import {
  extractHeadings,
  extractVisibleText,
  extractJsonLd,
  extractTitle,
  extractMetaDescription,
  extractOutboundProfiles,
} from './lib/extract.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const url = process.argv[2];
const textChars = Number(process.argv[3] || 2500);

if (!url) {
  console.error('usage: node tools/entity-audit/facts.js <url> [textChars]');
  process.exit(1);
}

const res = await fetch(url, { headers: { 'user-agent': UA } });
const html = await res.text();

console.log(`URL:    ${url}`);
console.log(`STATUS: ${res.status}`);
console.log(`TITLE:  ${extractTitle(html)}`);
console.log(`DESC:   ${extractMetaDescription(html)}`);
console.log(`PROFILES: ${extractOutboundProfiles(html).map((p) => p.platform).join(', ') || '(none)'}`);
console.log(`EXISTING JSON-LD: ${JSON.stringify(extractJsonLd(html)).slice(0, 2500)}`);
console.log('HEADINGS:');
for (const h of extractHeadings(html).slice(0, 45)) {
  console.log(`  h${h.level}: ${h.text.slice(0, 115)}`);
}
console.log(`TEXT: ${extractVisibleText(html).slice(0, textChars)}`);
