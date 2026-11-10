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
const TITLE_RANGE = [50, 60];
const DESCRIPTION_RANGE = [150, 160];
const STAGING_HOST = /(^|\.)webflow\.io$/i;
const CLASSIC_SCRIPT_TYPE = /^$|^(text|application)\/(java|ecma)script$/i;
const WEBFLOW_ASSET_HOST = /(^|\.)(website-files|webflow)\.com$|^d3e54v103j8qbb\.cloudfront\.net$/i;
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot'];
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

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
}

function stripRawText(html) {
  return stripComments(html).replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, (m) =>
    ' '.repeat(m.length),
  );
}

function tagAttrs(html) {
  return [...html.matchAll(/<[a-zA-Z][\w-]*\b[^>]*>/g)].map((match) => parseAttrs(match[0]));
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
  const source = stripComments(html);
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
    stagingUrl: raw.stagingUrl?.trim() || null,
    redirects: raw.redirects ?? [],
    apexDefault: raw.apexDefault === true,
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
  const ids = new Set(tagAttrs(clean).map(({ id }) => id).filter(Boolean));
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
  if (STAGING_HOST.test(new URL(pageUrl).hostname)) return [];
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

function isConsentGated(attrs) {
  const type = (attrs.type ?? '').trim().toLowerCase();
  if (type === 'fs-consent') return true;
  if (type !== 'fs-cc') return false;
  const categories = (attrs['fs-cc-categories'] ?? '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  return categories.some((category) => category !== 'essential');
}

export function checkUngatedAnalytics(html, pageUrl) {
  const ungated = scriptTags(html).some(
    ({ attrs, body }) => !isConsentGated(attrs) && GTAG_CONFIG.test(body),
  );
  return ungated
    ? [
        finding(
          'ungated-analytics',
          pageUrl,
          "gtag('config' runs outside a consent-gated script (fs-consent or fs-cc); Webflow GA integration or ungated GA",
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

function primarySubtag(code) {
  return String(code).trim().toLowerCase().split(/[-_]/)[0];
}

export function checkHtmlLang(html, pageUrl, locales = []) {
  const lang = (findTags(stripRawText(html), 'html')[0]?.attrs.lang ?? '').trim();
  if (!lang) return [finding('html-lang', pageUrl, 'no lang attribute on <html>')];
  const locale = localeOf(new URL(pageUrl).pathname, locales);
  return locale && primarySubtag(lang) !== primarySubtag(locale.code)
    ? [finding('html-lang', pageUrl, `<html lang="${lang}"> on a ${locale.code} page`)]
    : [];
}

function linksWithRel(html, token) {
  return findTags(stripRawText(html), 'link').filter(
    ({ attrs }) =>
      (attrs.rel ?? '').toLowerCase().split(/\s+/).includes(token) && (attrs.href ?? '').trim(),
  );
}

export function checkIcons(html, pageUrl) {
  return [
    ['icon', 'no favicon link (rel="icon")'],
    ['apple-touch-icon', 'no webclip link (rel="apple-touch-icon")'],
  ]
    .filter(([token]) => !linksWithRel(html, token).length)
    .map(([, detail]) => finding('icons', pageUrl, detail, 'warning'));
}

function isEmptyLinkException(className) {
  return (
    className === 'w-lightbox' ||
    className === 'w-dropdown-toggle' ||
    className.startsWith('w-pagination')
  );
}

function isScriptWired(attrs) {
  return (
    Object.keys(attrs).some((name) => /^(data|fs)-/.test(name)) ||
    (attrs.type ?? '').trim().toLowerCase() === 'button' ||
    (attrs.role ?? '').trim().toLowerCase() === 'button'
  );
}

export function checkEmptyLink(html, pageUrl) {
  const details = anchorHrefs(html)
    .filter(
      ({ attrs }) =>
        ['', '#'].includes(attrs.href.trim()) &&
        !classesOf(attrs).some(isEmptyLinkException) &&
        !isScriptWired(attrs),
    )
    .map(({ attrs }) => `link with href="${attrs.href.trim()}", class "${attrs.class ?? ''}"`);
  return [...new Set(details)].map((detail) => finding('empty-link', pageUrl, detail, 'warning'));
}

export function checkDuplicateIds(html, pageUrl) {
  const ids = tagAttrs(stripRawText(html)).map(({ id }) => id).filter(Boolean);
  const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
  return [...new Set(repeated)].map((id) =>
    finding('duplicate-ids', pageUrl, `id "${id}" is used more than once`, 'warning'),
  );
}

export function checkH1Count(html, pageUrl) {
  const count = findTags(stripRawText(html), 'h1').length;
  return count === 1
    ? []
    : [finding('h1-count', pageUrl, `${count} h1 elements (expected exactly 1)`, 'warning')];
}

export function checkCanonical(html, pageUrl, domain = null) {
  const [link] = linksWithRel(html, 'canonical');
  if (!link) return [finding('canonical', pageUrl, 'no canonical link', 'warning')];
  const href = link.attrs.href.trim();
  const page = new URL(pageUrl);
  let target;
  try {
    target = new URL(href, page);
  } catch {
    return [finding('canonical', pageUrl, `canonical is not a valid URL: ${href}`, 'warning')];
  }
  if (target.hostname === page.hostname) return [];
  if (
    domain &&
    STAGING_HOST.test(page.hostname) &&
    bareDomain(target.hostname) === bareDomain(domain)
  )
    return [];
  return [finding('canonical', pageUrl, `canonical points at another host: ${href}`, 'warning')];
}

export function checkBlockingScript(html, pageUrl) {
  const [head] = findElements(stripRawText(html), (name) => name === 'head');
  if (!head) return [];
  const sources = scriptTags(html.slice(head.innerStart, head.innerEnd))
    .filter(
      ({ attrs }) =>
        (attrs.src ?? '').trim() &&
        !('async' in attrs) &&
        !('defer' in attrs) &&
        CLASSIC_SCRIPT_TYPE.test((attrs.type ?? '').trim()),
    )
    .map(({ attrs }) => attrs.src.trim());
  return [...new Set(sources)].map((src) =>
    finding('blocking-script', pageUrl, `head script without async or defer: ${src}`, 'warning'),
  );
}

function hasAccessibleName(attrs, content) {
  const filled = (value) => Boolean(value?.trim());
  return (
    filled(attrs['aria-label']) ||
    filled(attrs['aria-labelledby']) ||
    filled(attrs.title) ||
    textRuns(content).some(Boolean) ||
    tagAttrs(content).some((inner) => filled(inner['aria-label'])) ||
    findTags(content, 'img').some((img) => filled(img.attrs.alt))
  );
}

export function checkLinkName(html, pageUrl) {
  const clean = stripRawText(html);
  const contents = new Map(
    findElements(clean, (name) => name === 'a').map((el) => [
      el.start,
      clean.slice(el.innerStart, el.innerEnd),
    ]),
  );
  const seen = new Set();
  const findings = [];
  for (const { index, attrs } of anchorHrefs(html)) {
    const href = attrs.href.trim();
    const content = contents.get(index);
    if (content === undefined || seen.has(href) || hasAccessibleName(attrs, content)) continue;
    seen.add(href);
    findings.push(finding('link-name', pageUrl, `link with no accessible name: ${href}`, 'warning'));
  }
  return findings;
}

function webflowStylesheets(html, pageUrl) {
  const sheets = [];
  for (const { attrs } of linksWithRel(html, 'stylesheet')) {
    try {
      const url = new URL(attrs.href.trim(), pageUrl);
      if (WEBFLOW_ASSET_HOST.test(url.hostname))
        sheets.push({ href: url.href, file: url.pathname.split('/').pop().toLowerCase() });
    } catch {
      DEBUG && console.log(`invalid stylesheet URL ${attrs.href}`);
    }
  }
  return sheets;
}

export function checkMinify(html, pageUrl) {
  return webflowStylesheets(html, pageUrl)
    .filter(({ file }) => !file.endsWith('.min.css'))
    .map(({ href }) => finding('minify', pageUrl, `stylesheet is not minified: ${href}`, 'warning'));
}

export function checkFontFormat(html, pageUrl) {
  const families = [];
  for (const [, css] of stripComments(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const blocks = css.replace(/\/\*[\s\S]*?\*\//g, ' ').match(/@font-face\s*\{[^}]*\}/gi) ?? [];
    for (const block of blocks) {
      if (!/url\(/i.test(block) || /woff2/i.test(block)) continue;
      const family = /font-family\s*:\s*['"]?([^;'"}]+)/i.exec(block);
      families.push(family ? family[1].trim() : 'unnamed');
    }
  }
  return [...new Set(families)].map((family) =>
    finding('font-format', pageUrl, `@font-face "${family}" has no woff2 source`, 'warning'),
  );
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
    ...checkHtmlLang(html, url, config.locales),
    ...checkIcons(html, url),
    ...checkEmptyLink(html, url),
    ...checkDuplicateIds(html, url),
    ...checkH1Count(html, url),
    ...checkCanonical(html, url, config.domain),
    ...checkBlockingScript(html, url),
    ...checkLinkName(html, url),
    ...checkMinify(html, url),
    ...checkFontFormat(html, url),
  ];
}

function robotsRules(text, agent) {
  const groups = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i.exec(line.split('#')[0]);
    if (!match) continue;
    const field = match[1].toLowerCase();
    if (field === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(match[2].toLowerCase());
    } else if (current && (field === 'allow' || field === 'disallow')) {
      current.rules.push({ field, value: match[2] });
    }
  }
  const forAgent = (name) => groups.filter((group) => group.agents.includes(name));
  const own = forAgent(agent.toLowerCase());
  return (own.length ? own : forAgent('*')).flatMap((group) => group.rules);
}

function isRobotsBlocked(text, agent) {
  const rules = robotsRules(text, agent).filter((rule) => rule.value === '/');
  return (
    rules.some((rule) => rule.field === 'disallow') &&
    !rules.some((rule) => rule.field === 'allow')
  );
}

function fileProblem(page) {
  return page.error ?? (page.statusCode === 200 ? null : `HTTP ${page.statusCode}`);
}

function fileFindings(check, page) {
  const problem = fileProblem(page);
  return problem
    ? [finding(check, page.url, `${new URL(page.url).pathname} not available: ${problem}`, 'warning')]
    : [];
}

async function auditHttps(base, get) {
  const page = await get(`http://${base.host}/`);
  if (page.error) return [finding('https-redirect', page.url, `http fetch failed: ${page.error}`)];
  return new URL(page.finalUrl).protocol === 'https:'
    ? []
    : [finding('https-redirect', page.url, `http ends on ${page.finalUrl}, not https`)];
}

async function auditDefaultDomain(base, config, get) {
  const domain = config.domain ?? bareDomain(base.hostname);
  const pages = await Promise.all([get(`https://${domain}/`), get(`https://www.${domain}/`)]);
  const failed = pages.find((page) => page.error);
  if (failed)
    return [finding('default-domain', failed.url, `fetch failed, so hosts can't converge: ${failed.error}`)];
  const [apexHost, wwwHost] = pages.map((page) => new URL(page.finalUrl).hostname);
  if (apexHost !== wwwHost)
    return [
      finding('default-domain', base.href, `${domain} ends on ${apexHost} but www.${domain} ends on ${wwwHost}`),
    ];
  return apexHost === domain && !config.apexDefault
    ? [
        finding(
          'default-domain',
          base.href,
          `both hosts end on the apex ${domain}; use www, or set apexDefault in the config`,
          'warning',
        ),
      ]
    : [];
}

async function auditFrameHeaders(base, get) {
  const page = await get(base.href);
  if (page.error)
    return [finding('frame-headers', page.url, `fetch failed: ${page.error}`, 'warning')];
  const headers = page.headers;
  return headers['x-frame-options'] || /frame-ancestors/i.test(headers['content-security-policy'] ?? '')
    ? []
    : [finding('frame-headers', page.url, 'no x-frame-options or frame-ancestors header', 'warning')];
}

function auditRobots(robots, text) {
  const missing = fileFindings('robots', robots);
  if (missing.length) return missing;
  return isRobotsBlocked(text, '*')
    ? [finding('robots', robots.url, 'robots.txt disallows / for all crawlers')]
    : [];
}

function auditRobotsAi(robots, text) {
  return AI_BOTS.filter((bot) => isRobotsBlocked(text, bot)).map((bot) =>
    finding('robots-ai', robots.url, `robots.txt blocks ${bot} from /`, 'warning'),
  );
}

async function auditSitemap(robots, text, get) {
  const findings = fileFindings('sitemap', await get('/sitemap.xml'));
  if (!/^\s*sitemap:\s*\S*\/sitemap\.xml\s*$/im.test(text))
    findings.push(finding('sitemap', robots.url, 'robots.txt has no Sitemap: line naming /sitemap.xml', 'warning'));
  return findings;
}

async function auditStagingIndex(config, get) {
  if (!config.stagingUrl) return [];
  const page = await get('/robots.txt', config.stagingUrl);
  const problem = page.error ?? (page.statusCode >= 500 ? `HTTP ${page.statusCode}` : null);
  if (problem)
    return [finding('staging-index', page.url, `staging robots.txt not read: ${problem}`, 'warning')];
  return isRobotsBlocked(page.statusCode === 200 ? page.html : '', '*')
    ? []
    : [finding('staging-index', page.url, 'staging robots.txt allows crawling; turn off subdomain indexing')];
}

function redirectEnd(url) {
  return `${url.origin}${normalizePath(url.pathname)}${url.search}`;
}

async function auditRedirect(base, get, { from, to }) {
  const page = await get(from);
  try {
    if (page.error) throw new Error(page.error);
    return redirectEnd(new URL(page.finalUrl)) === redirectEnd(new URL(to, base))
      ? []
      : [finding('redirects', page.url, `${from} ends on ${page.finalUrl}, not ${to}`)];
  } catch (err) {
    return [finding('redirects', page.url, `${from} to ${to} not verified: ${err.message}`)];
  }
}

function safeGetter(fetch, base) {
  return async (path, from = base) => {
    let url = String(path);
    try {
      url = new URL(path, from).href;
      return { html: '', headers: {}, finalUrl: url, ...(await fetch(url)), url };
    } catch (err) {
      return { url, error: err.message };
    }
  };
}

export async function auditSite({
  baseUrl,
  config: rawConfig = {},
  fetch = (url) => fetchPage(url, new Map()),
}) {
  try {
    const config = normalizeConfig(rawConfig);
    const base = new URL(baseUrl);
    const get = safeGetter(fetch, base);
    const robots = await get('/robots.txt');
    const text = fileProblem(robots) ? '' : robots.html;
    const customDomainChecks = STAGING_HOST.test(base.hostname)
      ? []
      : [
          auditHttps(base, get),
          auditDefaultDomain(base, config, get),
          auditRobots(robots, text),
          auditRobotsAi(robots, text),
        ];
    const groups = await Promise.all([
      ...customDomainChecks,
      auditFrameHeaders(base, get),
      auditSitemap(robots, text, get),
      get('/llms.txt').then((page) => fileFindings('llms', page)),
      auditStagingIndex(config, get),
      ...config.redirects.map((entry) => auditRedirect(base, get, entry)),
    ]);
    return groups.flat();
  } catch (err) {
    return [finding('site-audit', String(baseUrl), `site checks did not finish: ${err.message}`, 'warning')];
  }
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
  siteAudit = null,
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
  if (siteAudit) findings.push(...(await siteAudit({ baseUrl, config, fetch })));
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
    siteAudit: auditSite,
  });
  printReport(result);
  return result.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
