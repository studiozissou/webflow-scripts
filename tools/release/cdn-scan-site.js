// Scans a live site (sitemap plus the inventory pages for its origin) for old cdn.jsdelivr.net/gh/studiozissou URLs and fails on any hit or non-200 page; usage: node tools/release/cdn-scan-site.js <origin>.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FETCH_TIMEOUT_MS, fetchProblem, pool, runCli } from './cdn-common.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY_PATH = join(REPO_ROOT, '.claude', 'specs', 'private-monorepo-migration-inventory.md');
const DEFAULT_LIMIT = 4;
const REPO_URL_RE = /(?:https?:)?\/\/cdn\.jsdelivr\.net\/gh\/studiozissou\/[^\s"'<>()\\]+/g;
const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
const SECTION_RE = /^##\s+Inventory pages for `cdn:scan`\s*$/m;
const LINE_RE = /^-\s+`([^`]+)`:\s*(.+)$/;
const CODE_RE = /`([^`]+)`/g;

const trimOrigin = (origin) => String(origin).replace(/\/+$/, '');

export function repoUrls(html) {
  return [...new Set(String(html).match(REPO_URL_RE) ?? [])];
}

export function inventoryPages(markdown, origin) {
  const start = markdown.search(SECTION_RE);
  if (start === -1) return [];
  const lines = markdown.slice(start).split('\n').slice(1);
  const want = trimOrigin(origin);
  for (const line of lines) {
    if (line.startsWith('#')) break;
    const m = line.match(LINE_RE);
    if (m && trimOrigin(m[1]) === want) return [...m[2].matchAll(CODE_RE)].map((c) => c[1]);
  }
  return [];
}

async function get(fetch, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const text = await res.text();
    return res.status === 200 ? { text } : { problem: `status ${res.status}` };
  } catch (err) {
    return { problem: fetchProblem(err) };
  }
}

export async function scanSite({ origin, pages = [], fetch = globalThis.fetch, limit = DEFAULT_LIMIT }) {
  const base = trimOrigin(origin);
  const failures = [];
  const urls = new Set();
  const sitemapUrl = `${base}/sitemap.xml`;
  const sitemap = await get(fetch, sitemapUrl);
  if (sitemap.problem) failures.push({ page: sitemapUrl, problem: sitemap.problem });
  else for (const [, loc] of sitemap.text.matchAll(LOC_RE)) urls.add(loc);
  for (const p of pages) urls.add(new URL(p, `${base}/`).href);

  const list = [...urls];
  const hits = [];
  await pool(list, limit, async (page) => {
    const res = await get(fetch, page);
    if (res.problem) failures.push({ page, problem: res.problem });
    else for (const url of repoUrls(res.text)) hits.push({ page, url });
  });
  hits.sort((a, b) => a.page.localeCompare(b.page) || a.url.localeCompare(b.url));
  return {
    hits,
    failures,
    line: `Scanned ${list.length} pages on ${base}: ${hits.length} old URLs, ${failures.length} failures`,
    exitCode: hits.length || failures.length ? 1 : 0
  };
}

async function main(args) {
  const [origin] = args;
  if (!origin || !/^https:\/\/[^/]+\/?$/.test(origin)) throw new Error('Usage: npm run cdn:scan -- https://<live domain>');
  const pages = inventoryPages(readFileSync(INVENTORY_PATH, 'utf8'), origin);
  if (!pages.length) process.stderr.write(`No inventory pages for ${trimOrigin(origin)}; scanning the sitemap only\n`);
  const result = await scanSite({ origin, pages });
  for (const h of result.hits) process.stderr.write(`OLD ${h.page} -> ${h.url}\n`);
  for (const f of result.failures) process.stderr.write(`FAIL ${f.page}: ${f.problem}\n`);
  process.stdout.write(`${result.line}\n`);
  process.exitCode = result.exitCode;
}

runCli(import.meta.url, main);
