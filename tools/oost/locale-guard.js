// Runs the original Oost locale checks through the generic launch guard with Oost's launch config; runnable as a CLI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPages } from '../site-review/lib/discovery.js';
import { fetchPage } from '../site-review/lib/fetch-page.js';
import {
  checkBareSocial as genericBareSocial,
  checkLocaleLinks,
  checkRunTogetherList as genericRunTogetherList,
  checkShareImage,
  checkUntranslatedTitle as genericUntranslatedTitle,
  checkWhatsAppLink,
  findAlternateHref,
  printReport,
  rebase,
  run as genericRun,
} from '../webflow/launch-guard.js';

export const CONFIG = JSON.parse(
  readFileSync(new URL('../../projects/oost/launch.config.json', import.meta.url), 'utf8'),
);

export const FALLBACK_PATHS = CONFIG.fallbackPaths;

export { checkShareImage, checkWhatsAppLink, findAlternateHref, rebase };

export function checkEnglishLinks(html, pageUrl) {
  return checkLocaleLinks(html, pageUrl, CONFIG.locales).map((f) => ({
    ...f,
    check: 'english-link-leak',
  }));
}

export function checkBareSocial(html, pageUrl) {
  return genericBareSocial(html, pageUrl, ['instagram.com']);
}

export function checkUntranslatedTitle(englishHtml, dutchHtml, pageUrl) {
  return genericUntranslatedTitle(englishHtml, dutchHtml, pageUrl, 'Dutch');
}

export function checkRunTogetherList(html, pageUrl) {
  return genericRunTogetherList(html, pageUrl, CONFIG.listItemClasses);
}

function checkPage(html, url, { strict }) {
  return [
    ...checkEnglishLinks(html, url),
    ...checkWhatsAppLink(html, url),
    ...checkBareSocial(html, url),
    ...checkRunTogetherList(html, url),
    ...checkShareImage(html, url, strict),
  ];
}

export function run({ baseUrl, strict = false, discover, fetch }) {
  return genericRun({ baseUrl, config: CONFIG, strict, discover, fetch, checks: checkPage });
}

async function main(argv) {
  const strict = argv.includes('--strict');
  const [baseUrl] = argv.filter((arg) => arg !== '--strict');
  if (!baseUrl) {
    process.stderr.write('usage: locale-guard.js <baseUrl> [--strict]\n');
    return 2;
  }
  const result = await run({
    baseUrl,
    strict,
    discover: discoverPages,
    fetch: (url) => fetchPage(url, new Map()),
  });
  printReport(result);
  return result.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
