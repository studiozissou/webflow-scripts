// Crawls the Oost Webflow site without a browser and reports Dutch/English locale regressions; runnable as a CLI.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPages } from '../site-review/lib/discovery.js';
import { fetchPage } from '../site-review/lib/fetch-page.js';

const DEBUG = false;

export const FALLBACK_PATHS = [
  '/',
  '/afhalen',
  '/catering',
  '/privacybeleid',
  '/algemene-voorwaarden',
  '/en',
  '/en/afhalen',
  '/en/catering',
  '/en/privacybeleid',
  '/en/algemene-voorwaarden',
];

const WHATSAPP_HOST = /^(wa\.me|api\.whatsapp\.com)$/i;
const RUN_TOGETHER_MIN = 30;
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
    if (ref[0] === '#') {
      const code =
        ref[1] === 'x' || ref[1] === 'X'
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

function parseAttrs(tag) {
  const attrs = {};
  const body = tag.replace(/^<\/?[a-zA-Z][\w-]*/, '').replace(/\/?>$/, '');
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    attrs[match[1].toLowerCase()] = decodeEntities(
      match[2] ?? match[3] ?? match[4] ?? '',
    );
  }
  return attrs;
}

function stripRawText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, (m) => ' '.repeat(m.length));
}

function findTags(html, name) {
  const re = new RegExp(`<${name}\\b[^>]*>`, 'gi');
  const tags = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    tags.push({ index: match.index, end: re.lastIndex, attrs: parseAttrs(match[0]) });
  }
  return tags;
}

function hasClass(attrs, className) {
  return (attrs.class ?? '').split(/\s+/).includes(className);
}

function findElements(html, matches) {
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  const open = [];
  const elements = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const [tag, closing, rawName, selfClosing] = match;
    const name = rawName.toLowerCase();
    if (closing) {
      const at = open.findLastIndex((entry) => entry.name === name);
      if (at === -1) continue;
      for (const entry of open.splice(at)) {
        if (entry.wanted)
          elements.push({
            start: entry.start,
            innerStart: entry.innerStart,
            innerEnd: match.index,
            end: re.lastIndex,
          });
      }
    } else if (!VOID_TAGS.has(name) && !selfClosing) {
      open.push({
        name,
        start: match.index,
        innerStart: re.lastIndex,
        wanted: matches(name, parseAttrs(tag)),
      });
    }
  }
  return elements.sort((a, b) => a.start - b.start);
}

function textRuns(fragment) {
  return fragment.split(/<[^>]*>/).map((text) => decodeEntities(text).trim());
}

function normalizePath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function isEnglishPath(pathname) {
  const path = normalizePath(pathname);
  return path === '/en' || path.startsWith('/en/');
}

function finding(check, url, detail, severity = 'error') {
  return { check, url, detail, severity };
}

function anchorHrefs(html) {
  return findTags(stripRawText(html), 'a').filter((tag) => tag.attrs.href !== undefined);
}

export function rebase(url, baseUrl) {
  const source = new URL(url);
  return new URL(`${source.pathname}${source.search}`, baseUrl).href;
}

export function checkEnglishLinks(html, pageUrl) {
  const page = new URL(pageUrl);
  if (!isEnglishPath(page.pathname)) return [];
  const switchers = findElements(stripRawText(html), (_, attrs) =>
    hasClass(attrs, 'w-locales-list'),
  );
  const seen = new Set();
  const findings = [];
  for (const tag of anchorHrefs(html)) {
    const href = tag.attrs.href;
    if (switchers.some((el) => tag.index >= el.start && tag.index < el.end)) continue;
    let target;
    try {
      target = new URL(href.trim(), page);
    } catch {
      continue;
    }
    if (target.origin !== page.origin || isEnglishPath(target.pathname) || seen.has(href))
      continue;
    seen.add(href);
    findings.push(finding('english-link-leak', pageUrl, `link to Dutch page ${href}`));
  }
  return findings;
}

function isWhatsApp(target) {
  if (WHATSAPP_HOST.test(target.hostname)) return true;
  return /(^|\.)whatsapp\.com$/i.test(target.hostname) && /^\/send\b/i.test(target.pathname);
}

export function checkWhatsAppLink(html, pageUrl) {
  const seen = new Set();
  const findings = [];
  for (const { attrs } of anchorHrefs(html)) {
    let target;
    try {
      target = new URL(attrs.href.trim(), pageUrl);
    } catch {
      continue;
    }
    if (!isWhatsApp(target) || seen.has(attrs.href)) continue;
    seen.add(attrs.href);
    findings.push(finding('whatsapp-link', pageUrl, `WhatsApp link ${attrs.href}`));
  }
  return findings;
}

export function checkBareSocial(html, pageUrl) {
  const seen = new Set();
  const findings = [];
  for (const { attrs } of anchorHrefs(html)) {
    let target;
    try {
      target = new URL(attrs.href.trim());
    } catch {
      continue;
    }
    const isInstagram = /(^|\.)instagram\.com$/i.test(target.hostname);
    if (!isInstagram || target.pathname.split('/').some(Boolean) || seen.has(attrs.href))
      continue;
    seen.add(attrs.href);
    findings.push(
      finding(
        'bare-social-link',
        pageUrl,
        `Instagram link without a handle: ${attrs.href}`,
      ),
    );
  }
  return findings;
}

export function findAlternateHref(html, lang) {
  const link = findTags(html, 'link').find(
    ({ attrs }) =>
      (attrs.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') &&
      (attrs.hreflang ?? '').toLowerCase() === lang &&
      attrs.href,
  );
  return link ? link.attrs.href : null;
}

function titleOf(html) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null;
}

export function checkUntranslatedTitle(englishHtml, dutchHtml, pageUrl) {
  const title = titleOf(englishHtml);
  return title && title === titleOf(dutchHtml)
    ? [finding('untranslated-title', pageUrl, `title matches the Dutch page: "${title}"`)]
    : [];
}

export function checkRunTogetherList(html, pageUrl) {
  const clean = stripRawText(html);
  const runs = findElements(
    clean,
    (name, attrs) => name === 'li' || hasClass(attrs, 'region_item'),
  )
    .flatMap((el) => textRuns(clean.slice(el.innerStart, el.innerEnd)))
    .filter((text) => text.length > RUN_TOGETHER_MIN && !/\s/.test(text));
  return [...new Set(runs)].map((text) =>
    finding('run-together-list', pageUrl, `list item with no spaces: "${text}"`),
  );
}

export function checkShareImage(html, pageUrl, strict) {
  const present = findTags(html, 'meta').some(
    ({ attrs }) =>
      (attrs.property ?? '').toLowerCase() === 'og:image' && (attrs.content ?? '').trim(),
  );
  return present
    ? []
    : [
        finding(
          'missing-share-image',
          pageUrl,
          'no og:image meta tag',
          strict ? 'error' : 'warning',
        ),
      ];
}

function checkPage(html, url, strict) {
  return [
    ...checkEnglishLinks(html, url),
    ...checkWhatsAppLink(html, url),
    ...checkBareSocial(html, url),
    ...checkRunTogetherList(html, url),
    ...checkShareImage(html, url, strict),
  ];
}

async function fetchOnce(fetch, url) {
  const page = await fetch(url);
  if (page.statusCode < 200 || page.statusCode >= 300)
    throw new Error(`HTTP ${page.statusCode}`);
  return page;
}

function makeLoader(fetch) {
  const pending = new Map();
  return (url) => {
    if (!pending.has(url)) {
      pending.set(
        url,
        fetchOnce(fetch, url)
          .catch((first) => {
            DEBUG && console.log(`retrying ${url}: ${first.message}`);
            return fetchOnce(fetch, url);
          })
          .then(
            (page) => ({ html: page.html }),
            (err) => ({ error: { url, detail: err.message } }),
          ),
      );
    }
    return pending.get(url);
  };
}

async function pageUrls(baseUrl, discover) {
  const discovered = await discover(baseUrl);
  const urls =
    discovered.length > 1
      ? discovered.map((url) => rebase(url, baseUrl))
      : FALLBACK_PATHS.map((path) => new URL(path, baseUrl).href);
  return [...new Set(urls)];
}

export async function run({ baseUrl, strict = false, discover, fetch }) {
  const load = makeLoader(fetch);
  let urls;
  try {
    urls = await pageUrls(baseUrl, discover);
  } catch (err) {
    return { exitCode: 2, findings: [], errors: [{ url: baseUrl, detail: err.message }] };
  }
  const findings = [];
  const errors = [];
  const reportedErrors = new Set();
  const addError = (error) => {
    if (reportedErrors.has(error.url)) return;
    reportedErrors.add(error.url);
    errors.push(error);
  };
  const results = await Promise.all(
    urls.map(async (url) => {
      const page = await load(url);
      if (page.error) return { error: page.error };
      const pageFindings = checkPage(page.html, url, strict);
      const twinHref =
        isEnglishPath(new URL(url).pathname) && findAlternateHref(page.html, 'nl');
      if (twinHref) {
        const twin = await load(rebase(twinHref, baseUrl));
        if (twin.error) return { findings: pageFindings, error: twin.error };
        pageFindings.push(...checkUntranslatedTitle(page.html, twin.html, url));
      }
      return { findings: pageFindings };
    }),
  );
  for (const result of results) {
    if (result.findings) findings.push(...result.findings);
    if (result.error) addError(result.error);
  }
  const exitCode = errors.length
    ? 2
    : findings.some((f) => f.severity === 'error')
      ? 1
      : 0;
  return { exitCode, findings, errors };
}

async function main(argv) {
  const strict = argv.includes('--strict');
  const [baseUrl] = argv.filter((arg) => arg !== '--strict');
  if (!baseUrl) {
    process.stderr.write('usage: locale-guard.js <baseUrl> [--strict]\n');
    return 2;
  }
  const { exitCode, findings, errors } = await run({
    baseUrl,
    strict,
    discover: discoverPages,
    fetch: (url) => fetchPage(url, new Map()),
  });
  for (const f of findings) {
    const line = `${f.severity.toUpperCase()} [${f.check}] ${f.url}: ${f.detail}\n`;
    if (f.severity === 'error') process.stderr.write(line);
    else process.stdout.write(line);
  }
  for (const e of errors) process.stderr.write(`FETCH FAILED ${e.url}: ${e.detail}\n`);
  const errorCount = findings.filter((f) => f.severity === 'error').length;
  process.stdout.write(
    `${errorCount} error(s), ${findings.length - errorCount} warning(s), ${errors.length} fetch failure(s)\n`,
  );
  return exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
