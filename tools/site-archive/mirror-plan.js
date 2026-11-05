// Mirror plan for mirror.sh: the wget --domains list for a site and the sitemap URLs to mirror after the start page; run as `node mirror-plan.js domains|urls <url>`.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { discoverPages } from '../site-review/lib/discovery.js';

export const CDN_HOSTS = [
  'cdn.prod.website-files.com',
  'uploads-ssl.webflow.com',
  'assets.website-files.com',
  'daks2k3a4ib2z.cloudfront.net',
  'd3e54v103j8qbb.cloudfront.net',
];

export function mirrorDomains(url) {
  const host = new URL(url).hostname;
  const twin = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  return [host, twin, ...CDN_HOSTS];
}

const normalise = (u) => u.replace(/\/+$/, '');

export async function sitemapUrls(url) {
  const start = new URL(url);
  const found = await discoverPages(start.origin);
  const skip = new Set([normalise(start.href), normalise(start.origin)]);
  const out = [];
  for (const u of found) {
    if (!/^https?:\/\//i.test(u) || skip.has(normalise(u)) || out.includes(u)) continue;
    out.push(u);
  }
  return out;
}

async function main([command, url]) {
  if (!url || !['domains', 'urls'].includes(command)) {
    process.stderr.write('usage: node mirror-plan.js domains|urls <url>\n');
    process.exit(64);
  }
  const list = command === 'domains' ? mirrorDomains(url) : await sitemapUrls(url);
  process.stdout.write(command === 'domains' ? `${list.join(',')}\n` : list.map((u) => `${u}\n`).join(''));
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
