// Regex-based HTML extractors for site-review: full entity decoding, quote-aware tags, head-scoped fields, H1s outside inert blocks, accessible names and JSON-LD with parse errors.

import { sha256 } from './finding.js';
import { urlKey, isInternalUrl } from './url-key.js';

const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml';

const GREEK =
  'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho - Sigma Tau Upsilon Phi Chi Psi Omega';

const NAMED_CODES = {
  quot: 34, amp: 38, apos: 39, lt: 60, gt: 62,
  OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, fnof: 402, circ: 710, tilde: 732,
  thetasym: 977, upsih: 978, piv: 982,
  ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205, lrm: 8206, rlm: 8207,
  ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222,
  dagger: 8224, Dagger: 8225, bull: 8226, hellip: 8230, permil: 8240, prime: 8242, Prime: 8243,
  lsaquo: 8249, rsaquo: 8250, oline: 8254, frasl: 8260, euro: 8364,
  image: 8465, weierp: 8472, real: 8476, trade: 8482, alefsym: 8501,
  larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, crarr: 8629,
  lArr: 8656, uArr: 8657, rArr: 8658, dArr: 8659, hArr: 8660,
  forall: 8704, part: 8706, exist: 8707, empty: 8709, nabla: 8711, isin: 8712, notin: 8713, ni: 8715,
  prod: 8719, sum: 8721, minus: 8722, lowast: 8727, radic: 8730, prop: 8733, infin: 8734, ang: 8736,
  and: 8743, or: 8744, cap: 8745, cup: 8746, int: 8747, there4: 8756, sim: 8764, cong: 8773, asymp: 8776,
  ne: 8800, equiv: 8801, le: 8804, ge: 8805, sub: 8834, sup: 8835, nsub: 8836, sube: 8838, supe: 8839,
  oplus: 8853, otimes: 8855, perp: 8869, sdot: 8901, lceil: 8968, rceil: 8969, lfloor: 8970, rfloor: 8971,
  lang: 9001, rang: 9002, loz: 9674, spades: 9824, clubs: 9827, hearts: 9829, diams: 9830,
  nbsp: 160, hyphen: 8208, horbar: 8213, laquo: 171, raquo: 187, check: 10003, star: 9734,
};

const CASE_FOLDED = new Set(['amp', 'lt', 'gt', 'quot', 'copy', 'reg']);

const C1_REMAP = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc,
  0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

function buildEntities() {
  const map = new Map();
  LATIN1.split(' ').forEach((name, i) => map.set(name, 160 + i));
  GREEK.split(' ').forEach((name, i) => {
    if (name !== '-') map.set(name, 913 + i);
    map.set(name === '-' ? 'sigmaf' : name.toLowerCase(), 945 + i);
  });
  for (const [name, code] of Object.entries(NAMED_CODES)) map.set(name, code);
  return map;
}

const ENTITIES = buildEntities();

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's',
  'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'font',
]);

const HEAD_TAGS = new Set([
  'html', 'head', 'title', 'meta', 'link', 'script', 'style', 'base', 'noscript', 'template',
]);

const TAG_BODY = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;
const SKIPPED_SCHEMES = /^(?:mailto|tel|sms|javascript|data|about|blob):/i;

function fromCodePoint(code) {
  if (!Number.isFinite(code) || code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '�';
  return String.fromCodePoint(C1_REMAP[code] ?? code);
}

export function decodeEntities(text) {
  if (text == null) return text;
  return String(text).replace(/&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|([A-Za-z][A-Za-z0-9]*));/g, (whole, hex, dec, name) => {
    if (hex) return fromCodePoint(parseInt(hex, 16));
    if (dec) return fromCodePoint(parseInt(dec, 10));
    const code = ENTITIES.get(name) ?? (CASE_FOLDED.has(name.toLowerCase()) ? ENTITIES.get(name.toLowerCase()) : undefined);
    return code === undefined ? whole : String.fromCodePoint(code);
  });
}

export function collapseWhitespace(text) {
  return text == null ? text : String(text).replace(/\s+/g, ' ').trim();
}

export function normaliseText(text) {
  return text == null ? text : collapseWhitespace(decodeEntities(text));
}

export function hash16(text) {
  return sha256(text).slice(0, 16);
}

export function parseAttrs(tag) {
  const attrs = {};
  const body = tag.replace(/^<\/?[a-zA-Z][\w:-]*/, '').replace(/\/?>$/, '');
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const name = match[1].toLowerCase();
    if (name in attrs) continue;
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function openTagRe(name) {
  return new RegExp(`<${name}(?=[\\s/>])${TAG_BODY}>`, 'gi');
}

export function findTags(html, name) {
  const re = openTagRe(name);
  const tags = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    tags.push({ index: match.index, end: re.lastIndex, raw: match[0], attrs: parseAttrs(match[0]) });
  }
  return tags;
}

function blank(text) {
  return ' '.repeat(text.length);
}

export function maskInert(html, tags = ['script', 'style', 'template', 'noscript']) {
  const names = tags.join('|');
  const re = names
    ? new RegExp(`<!--[\\s\\S]*?(?:-->|$)|<(${names})(?=[\\s/>])${TAG_BODY}>[\\s\\S]*?(?:<\\/\\1\\s*>|$)`, 'gi')
    : /<!--[\s\S]*?(?:-->|$)/g;
  return html.replace(re, blank);
}

export function maskComments(html) {
  return maskInert(html, []);
}

export function headRange(masked) {
  const open = /<head(?=[\s/>])[^>]*>/i.exec(masked);
  const start = open ? open.index + open[0].length : 0;
  const re = /<(\/?)([a-zA-Z][\w:-]*)/g;
  re.lastIndex = start;
  let match;
  while ((match = re.exec(masked)) !== null) {
    const name = match[2].toLowerCase();
    if (match[1] && name === 'head') return { start, end: match.index };
    if (!match[1] && (name === 'body' || !HEAD_TAGS.has(name))) return { start, end: match.index };
  }
  return { start, end: masked.length };
}

function bodyStart(masked, head) {
  const re = /<body(?=[\s/>])[^>]*>/gi;
  re.lastIndex = head.end;
  const match = re.exec(masked);
  return match ? match.index + match[0].length : head.end;
}

export function textContent(fragment) {
  const spaced = fragment.replace(/<\/?([a-zA-Z][\w:-]*)(?:[^>"']|"[^"]*"|'[^']*')*>/g, (_, name) =>
    INLINE_TAGS.has(name.toLowerCase()) ? '' : ' ',
  );
  return collapseWhitespace(decodeEntities(spaced.replace(/<[^>]*>/g, ' ')));
}

function closingIndex(html, name, from) {
  const re = new RegExp(`<(/?)${name}(?=[\\s/>])`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = re.exec(html)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return match.index;
  }
  return -1;
}

function relTokens(attrs) {
  return (attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
}

function resolve(href, base) {
  try {
    const url = new URL(href, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function metaContent(tags, name) {
  return tags.filter(({ attrs }) => (attrs.name ?? '').toLowerCase() === name).map(({ attrs }) => attrs.content ?? '');
}

export function extractDoctype(html) {
  const match = /^(?:\uFEFF)?\s*(?:<!--[\s\S]*?-->\s*)*<!doctype\s+([^\s>]+)/i.exec(html);
  return match ? match[1].toLowerCase() : null;
}

export function extractHtmlAttrs(masked) {
  const tag = findTags(masked, 'html')[0];
  const attrs = tag?.attrs ?? {};
  return {
    wfPage: attrs['data-wf-page'] || null,
    wfSite: attrs['data-wf-site'] || null,
    lang: attrs.lang ?? null,
  };
}

export function extractHead(html, { baseUrl, canonicalHost, contentType } = {}) {
  const masked = maskInert(html);
  const range = headRange(masked);
  const head = masked.slice(range.start, range.end);
  const titleRe = /<title(?=[\s/>])[^>]*>([\s\S]*?)(?:<\/title\s*>|$)/gi;
  const titles = [...head.matchAll(titleRe)].map((match) => normaliseText(match[1]));
  const metas = findTags(head, 'meta');
  const links = findTags(head, 'link');
  const baseHref = findTags(head, 'base').find(({ attrs }) => attrs.href)?.attrs.href;
  const base = (baseHref && resolve(baseHref, baseUrl)) || baseUrl;
  const descriptions = metaContent(metas, 'description');
  const robots = metaContent(metas, 'robots').map((value) => collapseWhitespace(value).toLowerCase()).filter(Boolean);
  const viewport = metaContent(metas, 'viewport')[0];
  const charsetTag = metas.find(({ attrs }) => attrs.charset)?.attrs.charset;
  const httpEquivType = metas.find(({ attrs }) => (attrs['http-equiv'] ?? '').toLowerCase() === 'content-type');
  const equivCharset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(httpEquivType?.attrs.content ?? '')?.[1];
  const headerCharset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType ?? '')?.[1];
  const refresh = findTags(masked, 'meta').find(({ attrs }) => (attrs['http-equiv'] ?? '').toLowerCase() === 'refresh');
  const keyOf = (url) => (url ? urlKey(url, { canonicalHost }) : null);

  const canonicals = links
    .filter(({ attrs }) => relTokens(attrs).includes('canonical') && attrs.href !== undefined)
    .map(({ attrs }) => {
      const href = attrs.href.trim();
      const url = resolve(href, base);
      return { href, url, key: keyOf(url) };
    });
  const hreflang = links
    .filter(({ attrs }) => relTokens(attrs).includes('alternate') && attrs.hreflang && attrs.href !== undefined)
    .map(({ attrs }) => {
      const href = attrs.href.trim();
      const url = resolve(href, base);
      return { lang: attrs.hreflang.trim().toLowerCase(), href, url, key: keyOf(url) };
    });

  return {
    base,
    head: range,
    title: titles.length ? titles[0] : null,
    titleCount: titles.length,
    metaDescription: descriptions.length ? normaliseText(descriptions[0]) : null,
    metaDescriptionCount: descriptions.length,
    metaRefresh: refresh ? collapseWhitespace(refresh.attrs.content ?? '') : null,
    robotsMeta: robots.length ? robots.join(', ') : null,
    canonicals,
    hreflang,
    viewport: viewport === undefined ? null : collapseWhitespace(viewport),
    charset: (charsetTag || equivCharset || headerCharset || null)?.toLowerCase() ?? null,
  };
}

export function extractH1s(html) {
  const masked = maskInert(html);
  const re = openTagRe('h1');
  const out = [];
  while (re.exec(masked) !== null) {
    const close = closingIndex(masked, 'h1', re.lastIndex);
    out.push(textContent(masked.slice(re.lastIndex, close === -1 ? masked.length : close)));
  }
  return out;
}

export function countHeadings(html) {
  const masked = maskInert(html);
  const counts = {};
  for (const level of [2, 3, 4, 5, 6]) counts[`h${level}`] = (masked.match(openTagRe(`h${level}`)) ?? []).length;
  return counts;
}

export function visibleText(html) {
  const masked = maskInert(html, ['script', 'style', 'template', 'noscript', 'title', 'svg']);
  const range = headRange(masked);
  return textContent(masked.slice(bodyStart(masked, range)));
}

function idIndex(masked) {
  let index = null;
  return (id) => {
    if (!index) {
      index = new Map();
      const re = new RegExp(`<([a-zA-Z][\\w:-]*)(?=[\\s/>])${TAG_BODY}>`, 'g');
      let match;
      while ((match = re.exec(masked)) !== null) {
        if (!/\sid\s*=/i.test(match[0])) continue;
        const id = parseAttrs(match[0]).id;
        if (!id || index.has(id)) continue;
        const close = closingIndex(masked, match[1], re.lastIndex);
        index.set(id, textContent(masked.slice(re.lastIndex, close === -1 ? re.lastIndex : close)));
      }
    }
    return index.get(id) ?? '';
  };
}

export function accessibleName(inner, attrs, lookupId = () => '') {
  const label = collapseWhitespace(attrs['aria-label'] ?? '');
  if (label) return label;
  const labelledBy = (attrs['aria-labelledby'] ?? '').split(/\s+/).filter(Boolean);
  const byId = collapseWhitespace(labelledBy.map((id) => lookupId(id)).join(' '));
  if (byId) return byId;
  const text = textContent(inner);
  if (text) return text;
  const alts = collapseWhitespace(findTags(inner, 'img').map(({ attrs: img }) => img.alt ?? '').join(' '));
  if (alts) return alts;
  return collapseWhitespace(attrs.title ?? '');
}

export function extractLinks(html, { baseUrl, canonicalHost, includeHosts = [] } = {}) {
  const masked = maskInert(html, ['script', 'style', 'template']);
  const lookupId = idIndex(masked);
  const re = openTagRe('a');
  const links = [];
  let match;
  while ((match = re.exec(masked)) !== null) {
    const attrs = parseAttrs(match[0]);
    if (attrs.href === undefined) continue;
    const raw = attrs.href.trim();
    if (!raw || raw.startsWith('#') || SKIPPED_SCHEMES.test(raw)) continue;
    const href = resolve(raw, baseUrl);
    if (!href) continue;
    const rest = masked.slice(re.lastIndex);
    const stop = rest.search(/<\/a\s*>|<a(?=[\s/>])/i);
    const inner = stop === -1 ? rest.slice(0, 2000) : rest.slice(0, stop);
    links.push({
      href,
      hrefKey: urlKey(href, { canonicalHost }),
      accessibleName: accessibleName(inner, attrs, lookupId),
      rel: (attrs.rel ?? '').trim().toLowerCase(),
      internal: isInternalUrl(href, { canonicalHost, includeHosts }),
      snippet: `${collapseWhitespace(match[0])}${textContent(inner)}`.slice(0, 200),
    });
  }
  return links;
}

function srcsetUrls(value) {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter((url) => url && !/^data:/i.test(url));
}

export function extractImagesAndResources(html, { baseUrl, canonicalHost } = {}) {
  const masked = maskInert(html);
  const images = [];
  const resources = [];
  const add = (raw, kind) => {
    const url = raw ? resolve(raw.trim(), baseUrl) : null;
    if (url) resources.push({ url, kind });
  };
  for (const { attrs } of findTags(masked, 'img')) {
    const raw = (attrs.src ?? '').trim();
    const src = raw ? resolve(raw, baseUrl) ?? raw : null;
    images.push({
      src,
      srcKey: src ? urlKey(src, { canonicalHost }) : null,
      alt: attrs.alt ?? null,
      width: attrs.width ?? null,
      height: attrs.height ?? null,
    });
    add(raw, 'img');
    if (attrs.srcset) srcsetUrls(attrs.srcset).forEach((url) => add(url, 'srcset'));
  }
  const scriptSrcs = maskInert(html, ['style', 'template', 'noscript']);
  for (const { attrs } of findTags(scriptSrcs, 'script')) if (attrs.src) add(attrs.src, 'script');
  for (const { attrs } of findTags(masked, 'link')) {
    const rel = relTokens(attrs);
    if (!attrs.href) continue;
    if (rel.includes('stylesheet')) add(attrs.href, 'stylesheet');
    else if (rel.some((token) => ['icon', 'apple-touch-icon', 'preload', 'prefetch', 'modulepreload', 'manifest', 'mask-icon'].includes(token)))
      add(attrs.href, 'link');
  }
  for (const { attrs } of findTags(masked, 'iframe')) if (attrs.src) add(attrs.src, 'iframe');
  for (const name of ['video', 'audio', 'source', 'track', 'embed']) {
    for (const { attrs } of findTags(masked, name)) {
      if (attrs.src) add(attrs.src, 'media');
      if (attrs.srcset) srcsetUrls(attrs.srcset).forEach((url) => add(url, 'srcset'));
      if (name === 'video' && attrs.poster) add(attrs.poster, 'media');
    }
  }
  for (const { attrs } of findTags(masked, 'object')) if (attrs.data) add(attrs.data, 'media');
  return { images, resources };
}

function collectTypes(node, types) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectTypes(item, types));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const type = node['@type'];
  for (const value of Array.isArray(type) ? type : [type]) {
    if (typeof value === 'string' && value && !types.includes(value)) types.push(value);
  }
  if (node['@graph']) collectTypes(node['@graph'], types);
}

export function extractScripts(html) {
  const masked = maskComments(html);
  const re = new RegExp(`<script(?=[\\s/>])${TAG_BODY}>([\\s\\S]*?)(?:<\\/script\\s*>|$)`, 'gi');
  const jsonLd = { types: [], hashes: [], parseErrors: [] };
  const scripts = { count: 0, inlineBytes: 0, externalCount: 0 };
  let match;
  while ((match = re.exec(masked)) !== null) {
    const open = /^<script(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(match[0])[0];
    const attrs = parseAttrs(open);
    const body = match[1];
    scripts.count += 1;
    if (attrs.src) scripts.externalCount += 1;
    else scripts.inlineBytes += Buffer.byteLength(body);
    if ((attrs.type ?? '').trim().toLowerCase() !== 'application/ld+json') continue;
    const text = body.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1').trim();
    jsonLd.hashes.push(hash16(text));
    try {
      collectTypes(JSON.parse(text), jsonLd.types);
    } catch (err) {
      jsonLd.parseErrors.push({ message: err.message, snippet: collapseWhitespace(text).slice(0, 200) });
    }
  }
  return { jsonLd, scripts };
}

export function parseHtml(html, { baseUrl, canonicalHost, includeHosts = [], contentType = null } = {}) {
  const masked = maskInert(html);
  const head = extractHead(html, { baseUrl, canonicalHost, contentType });
  const base = head.base;
  const text = visibleText(html);
  const { images, resources } = extractImagesAndResources(html, { baseUrl: base, canonicalHost });
  const { jsonLd, scripts } = extractScripts(html);
  const bytes = Buffer.byteLength(html);
  return {
    doctype: extractDoctype(html),
    ...extractHtmlAttrs(masked),
    title: head.title,
    titleCount: head.titleCount,
    metaDescription: head.metaDescription,
    metaDescriptionCount: head.metaDescriptionCount,
    metaRefresh: head.metaRefresh,
    robotsMeta: head.robotsMeta,
    canonicals: head.canonicals,
    hreflang: head.hreflang,
    h1: extractH1s(html),
    headings: countHeadings(html),
    text,
    textHash: text ? hash16(text) : null,
    wordCount: text ? text.split(' ').filter((word) => /[\p{L}\p{N}]/u.test(word)).length : 0,
    textToHtmlRatio: bytes ? Math.round((Buffer.byteLength(text) / bytes) * 1000) / 1000 : 0,
    links: extractLinks(html, { baseUrl: base, canonicalHost, includeHosts }),
    resources,
    images,
    jsonLd,
    scripts,
    viewport: head.viewport,
    charset: head.charset,
  };
}
