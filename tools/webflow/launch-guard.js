// Crawls a Webflow site's sitemap without a browser and reports launch blockers and warnings for every locale, driven by projects/<client>/launch.config.json; runnable as a CLI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPages } from '../site-review/lib/discovery.js';
import { fetchPage } from '../site-review/lib/fetch-page.js';

const DEBUG = false;

const PROJECTS_DIR = fileURLToPath(new URL('../../projects/', import.meta.url));
const WHATSAPP_HOST = /^(wa\.me|api\.whatsapp\.com)$/i;
const RUN_TOGETHER_MIN = 30;
const TITLE_RANGE = [50, 62];
const DESCRIPTION_RANGE = [120, 155];
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const GTAG_CONFIG = /gtag\(\s*['"]config['"]/;
const ABOVE_FOLD_CLASS = /^(nav|navbar|hero|header)([_-]|$)|^section[_-](nav|hero|header)|^w-nav$/;
const PLACEHOLDERS = [
  { label: 'TODO-', re: /TODO-/ },
  { label: '[...]', re: /\[\s*(?:\.{2,}|…)\s*\]/ },
  { label: 'Example text', re: /example text/i },
  { label: 'example.com', re: /\bexample\.com\b/i },
  { label: '0000000', re: /0{7}/ },
];
const SOCIAL_LABELS = {
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'tiktok.com': 'TikTok',
  'linkedin.com': 'LinkedIn',
  'x.com': 'X',
  'twitter.com': 'X',
  'youtube.com': 'YouTube',
  'pinterest.com': 'Pinterest',
};
export const DEFAULT_SOCIAL_HOSTS = Object.keys(SOCIAL_LABELS);
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
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

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

function scriptTags(html) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const source = html.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
  const scripts = [];
  let match;
  while ((match = re.exec(source)) !== null) {
    scripts.push({ attrs: parseAttrs(`<script${match[1]}>`), body: match[2] });
  }
  return scripts;
}

function classesOf(attrs) {
  return (attrs.class ?? '').split(/\s+/).filter(Boolean);
}

function hasClass(attrs, className) {
  return classesOf(attrs).includes(className);
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
            name: entry.name,
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

function visibleRuns(html) {
  return textRuns(stripRawText(html))
    .map((text) => text.replace(/\s+/g, ' '))
    .filter(Boolean);
}

function normalizePath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function snippet(text) {
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function finding(check, url, detail, severity = 'error') {
  return { check, url, detail, severity };
}

function anchorHrefs(html) {
  return findTags(stripRawText(html), 'a').filter((tag) => tag.attrs.href !== undefined);
}

function bareDomain(domain) {
  return String(domain).trim().toLowerCase().replace(/^www\./, '');
}

function normalizeLocales(locales = []) {
  return locales.map((entry, index) => {
    const locale = typeof entry === 'string' ? { code: entry } : entry;
    const path = locale.path ?? (index === 0 ? '/' : `/${locale.code}`);
    return {
      code: locale.code,
      name: locale.name ?? locale.code,
      path: path === '/' ? '/' : normalizePath(path.startsWith('/') ? path : `/${path}`),
    };
  });
}

export function normalizeConfig(raw = {}) {
  const domains = raw.emailDomains ?? (raw.domain ? [raw.domain] : []);
  return {
    domain: raw.domain ? bareDomain(raw.domain) : null,
    emailDomains: domains.map(bareDomain),
    locales: normalizeLocales(raw.locales),
    placeholders: raw.placeholders ?? [],
    allowLocalAttr: raw.allowLocalAttr ?? 'data-allow-local',
    fallbackPaths: raw.fallbackPaths ?? null,
    listItemClasses: raw.listItemClasses ?? [],
    socialHosts: raw.socialHosts ?? DEFAULT_SOCIAL_HOSTS,
    blockWhatsApp: raw.blockWhatsApp === true,
  };
}

export function localeOf(pathname, locales) {
  const list = normalizeLocales(locales);
  if (!list.length) return null;
  const path = normalizePath(pathname);
  const secondary = list
    .slice(1)
    .find((locale) => path === locale.path || path.startsWith(`${locale.path}/`));
  return secondary ?? list[0];
}

export function rebase(url, baseUrl) {
  const source = new URL(url);
  return new URL(`${source.pathname}${source.search}`, baseUrl).href;
}

export function checkLocaleLinks(html, pageUrl, locales) {
  const list = normalizeLocales(locales);
  const page = new URL(pageUrl);
  const pageLocale = localeOf(page.pathname, list);
  if (list.length < 2 || pageLocale.code === list[0].code) return [];
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
    if (target.origin !== page.origin || seen.has(href)) continue;
    const targetLocale = localeOf(target.pathname, list);
    if (targetLocale.code === pageLocale.code) continue;
    seen.add(href);
    findings.push(
      finding('locale-link-leak', pageUrl, `link to ${targetLocale.name} page ${href}`),
    );
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

export function checkBareSocial(html, pageUrl, hosts = DEFAULT_SOCIAL_HOSTS) {
  const seen = new Set();
  const findings = [];
  for (const { attrs } of anchorHrefs(html)) {
    let target;
    try {
      target = new URL(attrs.href.trim());
    } catch {
      continue;
    }
    const host = hosts.find((name) =>
      new RegExp(`(^|\\.)${escapeRegExp(name)}$`, 'i').test(target.hostname),
    );
    if (!host || target.pathname.split('/').some(Boolean) || seen.has(attrs.href)) continue;
    seen.add(attrs.href);
    const label = SOCIAL_LABELS[host.toLowerCase()] ?? host;
    findings.push(
      finding('bare-social-link', pageUrl, `${label} link without a handle: ${attrs.href}`),
    );
  }
  return findings;
}

export function findAlternateHref(html, lang) {
  const link = findTags(html, 'link').find(
    ({ attrs }) =>
      (attrs.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') &&
      (attrs.hreflang ?? '').toLowerCase() === String(lang).toLowerCase() &&
      attrs.href,
  );
  return link ? link.attrs.href : null;
}

function titleOf(html) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null;
}

function descriptionOf(html) {
  const meta = findTags(html, 'meta').find(
    ({ attrs }) => (attrs.name ?? '').toLowerCase() === 'description',
  );
  return meta ? (meta.attrs.content ?? '').replace(/\s+/g, ' ').trim() : null;
}

export function checkUntranslatedTitle(html, twinHtml, pageUrl, twinName = 'primary') {
  const title = titleOf(html);
  return title && title === titleOf(twinHtml)
    ? [
        finding(
          'untranslated-title',
          pageUrl,
          `title matches the ${twinName} page: "${title}"`,
        ),
      ]
    : [];
}

export function checkRunTogetherList(html, pageUrl, classes = []) {
  const clean = stripRawText(html);
  const runs = findElements(
    clean,
    (name, attrs) => name === 'li' || classes.some((c) => hasClass(attrs, c)),
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

export function checkPlaceholders(html, pageUrl, extra = []) {
  const patterns = [
    ...PLACEHOLDERS,
    ...extra
      .filter(Boolean)
      .map((text) => ({ label: text, re: new RegExp(escapeRegExp(text), 'i') })),
  ];
  const seen = new Set();
  const findings = [];
  const scan = (value, where) => {
    for (const { label, re } of patterns) {
      const key = `${label}|${where}|${value}`;
      if (!re.test(value) || seen.has(key)) continue;
      seen.add(key);
      findings.push(
        finding('placeholder', pageUrl, `placeholder "${label}" in ${where}: "${snippet(value)}"`),
      );
    }
  };
  for (const text of visibleRuns(html)) scan(text, 'text');
  for (const { attrs } of anchorHrefs(html)) scan(attrs.href.trim(), 'link');
  return findings;
}

export function checkEmailDomain(html, pageUrl, domains) {
  const allowed = (Array.isArray(domains) ? domains : domains ? [domains] : []).map(
    bareDomain,
  );
  if (!allowed.length) return [];
  const addresses = [];
  for (const { attrs } of anchorHrefs(html)) {
    const href = attrs.href.trim();
    if (!/^mailto:/i.test(href)) continue;
    let target = href.slice('mailto:'.length).split('?')[0];
    try {
      target = decodeURIComponent(target);
    } catch {
      DEBUG && console.log(`undecodable mailto ${href}`);
    }
    addresses.push(...target.split(',').map((part) => part.trim()).filter(Boolean));
  }
  for (const text of visibleRuns(html)) addresses.push(...(text.match(EMAIL) ?? []));
  const seen = new Set();
  const findings = [];
  for (const address of addresses) {
    const email = address.toLowerCase();
    const domain = email.split('@')[1] ?? '';
    if (seen.has(email) || allowed.includes(domain)) continue;
    seen.add(email);
    findings.push(
      finding('email-domain', pageUrl, `email ${address} is not on ${allowed.join(' or ')}`),
    );
  }
  return findings;
}

export function checkLabels(html, pageUrl) {
  const clean = stripRawText(html);
  const ids = new Set();
  for (const match of clean.matchAll(/<[a-zA-Z][\w-]*\b[^>]*>/g)) {
    const { id } = parseAttrs(match[0]);
    if (id) ids.add(id);
  }
  const seen = new Set();
  const findings = [];
  for (const { attrs } of findTags(clean, 'label')) {
    if (!('for' in attrs)) continue;
    const target = attrs.for.trim();
    const detail = target
      ? ids.has(target)
        ? null
        : `label for="${target}" matches no id on the page`
      : 'label with an empty for attribute';
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    findings.push(finding('label-for', pageUrl, detail));
  }
  return findings;
}

export function checkAllowLocal(html, pageUrl, attr = 'data-allow-local') {
  const name = attr.toLowerCase();
  return scriptTags(html)
    .filter(({ attrs }) => name in attrs)
    .map(({ attrs }) =>
      finding(
        'allow-local',
        pageUrl,
        `${attr} on <script src="${attrs.src ?? ''}">: the local dev switch is live`,
      ),
    );
}

export function checkJsonLdHost(html, pageUrl) {
  if (/(^|\.)webflow\.io$/i.test(new URL(pageUrl).hostname)) return [];
  const findings = [];
  for (const { attrs, body } of scriptTags(html)) {
    if ((attrs.type ?? '').trim().toLowerCase() !== 'application/ld+json') continue;
    if (!/webflow\.io/i.test(body)) continue;
    const url = /https?:\/\/[^"'\s<>]*webflow\.io[^"'\s<>]*/i.exec(body);
    findings.push(
      finding(
        'jsonld-staging-url',
        pageUrl,
        `JSON-LD points at the staging host: ${url ? url[0] : 'webflow.io'}`,
      ),
    );
  }
  return findings;
}

export function checkUngatedAnalytics(html, pageUrl) {
  const ungated = scriptTags(html).some(
    ({ attrs, body }) =>
      (attrs.type ?? '').trim().toLowerCase() !== 'fs-consent' && GTAG_CONFIG.test(body),
  );
  return ungated
    ? [
        finding(
          'ungated-analytics',
          pageUrl,
          "gtag('config' runs outside an fs-consent script (Webflow GA integration or ungated GA)",
        ),
      ]
    : [];
}

export function checkMetaLengths(html, pageUrl) {
  const findings = [];
  const measure = (check, label, value, [min, max]) => {
    const length = value ? [...value].length : 0;
    if (length >= min && length <= max) return;
    findings.push(
      finding(
        check,
        pageUrl,
        value
          ? `${label} is ${length} characters (aim for ${min}–${max}): "${snippet(value)}"`
          : `no ${label}`,
        'warning',
      ),
    );
  };
  measure('title-length', 'title', titleOf(html), TITLE_RANGE);
  measure('description-length', 'meta description', descriptionOf(html), DESCRIPTION_RANGE);
  return findings;
}

export function checkLazyAboveFold(html, pageUrl) {
  const clean = stripRawText(html);
  const regions = findElements(
    clean,
    (name, attrs) =>
      name === 'nav' ||
      name === 'header' ||
      classesOf(attrs).some((c) => ABOVE_FOLD_CLASS.test(c)),
  );
  const firstSection = findElements(clean, (name) => name === 'section')[0];
  if (firstSection) regions.push(firstSection);
  const findings = [];
  const seen = new Set();
  for (const { index, attrs } of findTags(clean, 'img')) {
    if ((attrs.loading ?? '').toLowerCase() !== 'lazy') continue;
    if (attrs.width && attrs.height) continue;
    if (!regions.some((el) => index >= el.start && index < el.end)) continue;
    const src = attrs.src ?? '';
    if (seen.has(src)) continue;
    seen.add(src);
    findings.push(
      finding(
        'lazy-above-fold',
        pageUrl,
        `lazy image without width/height in the nav or hero: ${src}`,
        'warning',
      ),
    );
  }
  return findings;
}

export function auditPage(html, url, rawConfig = {}, strict = false) {
  const config = normalizeConfig(rawConfig);
  return [
    ...checkLocaleLinks(html, url, config.locales),
    ...(config.blockWhatsApp ? checkWhatsAppLink(html, url) : []),
    ...checkBareSocial(html, url, config.socialHosts),
    ...checkRunTogetherList(html, url, config.listItemClasses),
    ...checkShareImage(html, url, strict),
    ...checkPlaceholders(html, url, config.placeholders),
    ...checkEmailDomain(html, url, config.emailDomains),
    ...checkLabels(html, url),
    ...checkAllowLocal(html, url, config.allowLocalAttr),
    ...checkJsonLdHost(html, url),
    ...checkUngatedAnalytics(html, url),
    ...checkMetaLengths(html, url),
    ...checkLazyAboveFold(html, url),
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

async function pageUrls(baseUrl, discover, config) {
  const discovered = await discover(baseUrl);
  const fallback = config.fallbackPaths ?? ['/', ...config.locales.slice(1).map((l) => l.path)];
  const urls =
    discovered.length > 1
      ? discovered.map((url) => rebase(url, baseUrl))
      : fallback.map((path) => new URL(path, baseUrl).href);
  return [...new Set(urls)];
}

async function auditUrl({ url, load, checks, config, strict, baseUrl }) {
  const page = await load(url);
  if (page.error) return { error: page.error };
  const [primary] = config.locales;
  const findings = checks(page.html, url, { config, strict });
  const pageLocale = localeOf(new URL(url).pathname, config.locales);
  const twinHref =
    pageLocale && pageLocale.code !== primary.code && findAlternateHref(page.html, primary.code);
  if (twinHref) {
    const twin = await load(rebase(new URL(twinHref, url).href, baseUrl));
    if (twin.error) return { findings, error: twin.error };
    findings.push(...checkUntranslatedTitle(page.html, twin.html, url, primary.name));
  }
  return { findings };
}

function exitCodeFor(findings, errors) {
  if (errors.length) return 2;
  return findings.some((f) => f.severity === 'error') ? 1 : 0;
}

export async function run({
  baseUrl,
  config: rawConfig = {},
  strict = false,
  discover = discoverPages,
  fetch = (url) => fetchPage(url, new Map()),
  checks = (html, url, { config, strict: isStrict }) => auditPage(html, url, config, isStrict),
  locale = null,
}) {
  const config = normalizeConfig(rawConfig);
  if (locale && !config.locales.some((l) => l.code === locale)) {
    return {
      exitCode: 2,
      findings: [],
      errors: [{ url: baseUrl, detail: `unknown locale "${locale}" (not in the config)` }],
    };
  }
  let urls;
  try {
    urls = await pageUrls(baseUrl, discover, config);
  } catch (err) {
    return { exitCode: 2, findings: [], errors: [{ url: baseUrl, detail: err.message }] };
  }
  if (locale) {
    urls = urls.filter((url) => localeOf(new URL(url).pathname, config.locales)?.code === locale);
  }
  const load = makeLoader(fetch);
  const results = await Promise.all(
    urls.map((url) => auditUrl({ url, load, checks, config, strict, baseUrl })),
  );
  const findings = results.flatMap((result) => result.findings ?? []);
  const errors = [];
  for (const { error } of results) {
    if (error && !errors.some((seen) => seen.url === error.url)) errors.push(error);
  }
  return { exitCode: exitCodeFor(findings, errors), findings, errors };
}

export function printReport({ findings, errors }, out = process) {
  for (const f of findings) {
    const line = `${f.severity.toUpperCase()} [${f.check}] ${f.url}: ${f.detail}\n`;
    if (f.severity === 'error') out.stderr.write(line);
    else out.stdout.write(line);
  }
  for (const e of errors) out.stderr.write(`FETCH FAILED ${e.url}: ${e.detail}\n`);
  const errorCount = findings.filter((f) => f.severity === 'error').length;
  out.stdout.write(
    `${errorCount} error(s), ${findings.length - errorCount} warning(s), ${errors.length} fetch failure(s)\n`,
  );
}

export function configPathFor(client) {
  return resolve(PROJECTS_DIR, client, 'launch.config.json');
}

export function loadConfig(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function parseArgs(argv) {
  const args = { url: null, client: null, config: null, locale: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--strict') args.strict = true;
    else if (arg === '--client') args.client = argv[++i] ?? null;
    else if (arg === '--config') args.config = argv[++i] ?? null;
    else if (arg === '--locale') args.locale = argv[++i] ?? null;
    else if (!args.url) args.url = arg;
  }
  return args;
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (!args.url || (!args.client && !args.config)) {
    process.stderr.write(
      'usage: launch-guard.js <baseUrl> (--client <name> | --config <path>) [--locale <code>] [--strict]\n',
    );
    return 2;
  }
  const path = args.config ? resolve(args.config) : configPathFor(args.client);
  let config;
  try {
    config = loadConfig(path);
  } catch (err) {
    process.stderr.write(`CONFIG FAILED ${path}: ${err.message}\n`);
    return 2;
  }
  const result = await run({
    baseUrl: args.url,
    config,
    strict: args.strict,
    locale: args.locale,
  });
  printReport(result);
  return result.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
