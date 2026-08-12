/**
 * extract.js — Pull entity signals out of raw HTML
 *
 * Zero dependencies: Webflow serves fully rendered HTML, so regex parsing is
 * sufficient and avoids pulling a DOM library into the monorepo. Every export
 * is pure — HTML in, plain data out — so the whole layer is unit testable
 * without touching the network.
 */

/** Platforms that count as authoritative entity profiles (sameAs candidates). */
const PROFILE_PLATFORMS = [
  { platform: 'wikipedia', pattern: /(^|\.)wikipedia\.org$/i },
  { platform: 'wikidata', pattern: /(^|\.)wikidata\.org$/i },
  { platform: 'instagram', pattern: /(^|\.)instagram\.com$/i },
  { platform: 'youtube', pattern: /(^|\.)youtube\.com$/i },
  { platform: 'linkedin', pattern: /(^|\.)linkedin\.com$/i },
  { platform: 'imdb', pattern: /(^|\.)imdb\.com$/i },
  { platform: 'amazon', pattern: /(^|\.)amazon\.[a-z.]+$/i },
  { platform: 'facebook', pattern: /(^|\.)facebook\.com$/i },
  { platform: 'twitter', pattern: /(^|\.)(twitter|x)\.com$/i },
  { platform: 'tiktok', pattern: /(^|\.)tiktok\.com$/i },
  { platform: 'spotify', pattern: /(^|\.)spotify\.com$/i },
  { platform: 'applePodcasts', pattern: /(^|\.)apple\.com$/i },
  { platform: 'substack', pattern: /(^|\.)substack\.com$/i },
  { platform: 'goodreads', pattern: /(^|\.)goodreads\.com$/i },
  { platform: 'muckrack', pattern: /(^|\.)muckrack\.com$/i },
];

/** Minimal HTML entity decoding — enough for title/meta/heading text. */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/** Strip tags from a fragment and normalise whitespace. */
function stripTags(fragment) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} html
 * @returns {string|null} the <title> text, or null when absent
 */
function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]) : null;
}

/**
 * Read a meta tag's content by name or property, order independent.
 * @param {string} html
 * @param {string} name
 * @returns {string|null}
 */
function extractMetaContent(html, name) {
  const escaped = escapeRegex(name);
  const tagRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    if (!new RegExp(`(?:name|property)\\s*=\\s*["']${escaped}["']`, 'i').test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([\s\S]*?)["']/i);
    return content ? decodeEntities(content[1]).trim() : '';
  }
  return null;
}

/** @returns {string|null} */
function extractMetaDescription(html) {
  return extractMetaContent(html, 'description');
}

/**
 * All headings with their level, in document order.
 * @param {string} html
 * @returns {Array<{level:number, text:string}>}
 */
function extractHeadings(html) {
  const out = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[2]);
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out;
}

/** @returns {string[]} H1 text in document order */
function extractH1s(html) {
  return extractHeadings(html)
    .filter((h) => h.level === 1)
    .map((h) => h.text);
}

/**
 * Parse every application/ld+json block. Malformed blocks are skipped.
 * @param {string} html
 * @returns {object[]}
 */
function extractJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // Malformed JSON-LD is itself a finding, but parsing must never throw.
    }
  }
  return out;
}

/**
 * Flatten JSON-LD (including @graph) to the set of @type values present.
 * @param {object[]} blocks
 * @returns {string[]}
 */
function jsonLdTypes(blocks) {
  const types = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    if (typeof t === 'string') types.add(t);
    if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
    if (node['@graph']) walk(node['@graph']);
  };
  blocks.forEach(walk);
  return [...types].sort();
}

/** @returns {string} visible text inside <footer>, or '' */
function extractFooterText(html) {
  const m = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  return m ? stripTags(m[1]) : '';
}

/**
 * Visible page text with script/style/noscript content removed.
 * @param {string} html
 * @returns {string}
 */
function extractVisibleText(html) {
  const cleaned = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return stripTags(cleaned);
}

/**
 * Internal links with their anchor text.
 * @param {string} html
 * @param {string} origin - e.g. https://www.tamsenfadal.com
 * @returns {Array<{href:string, text:string}>}
 */
function extractInternalAnchors(html, origin) {
  const host = safeHost(origin);
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefMatch = m[1].match(/href\s*=\s*["']([^"']*)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1].trim();
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;

    let isInternal;
    let normalised = href;
    if (/^https?:\/\//i.test(href)) {
      const linkHost = safeHost(href);
      isInternal = Boolean(linkHost) && linkHost === host;
      if (isInternal) {
        try {
          const u = new URL(href);
          normalised = `${u.pathname}${u.search}`;
        } catch {
          normalised = href;
        }
      }
    } else if (/^\/\//.test(href)) {
      isInternal = false;
    } else {
      isInternal = true;
    }
    if (!isInternal) continue;

    const text = stripTags(m[2]);
    out.push({ href: normalised, text });
  }
  return out;
}

/**
 * Outbound links to known entity profile platforms, deduped by platform.
 * @param {string} html
 * @returns {Array<{platform:string, href:string}>}
 */
function extractOutboundProfiles(html) {
  const seen = new Map();
  const re = /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const host = safeHost(href);
    if (!host) continue;
    const hit = PROFILE_PLATFORMS.find((p) => p.pattern.test(host));
    if (hit && !seen.has(hit.platform)) seen.set(hit.platform, { platform: hit.platform, href });
  }
  return [...seen.values()];
}

function safeHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Count full-name mentions. Deliberately requires the full name — the first
 * name alone ("Hi! I'm Tamsen") is exactly the weak signal we are measuring.
 * @param {string} text
 * @param {string} entity
 * @returns {number}
 */
function countEntityMentions(text, entity) {
  if (!text) return 0;
  const re = new RegExp(escapeRegex(entity), 'gi');
  return (text.match(re) || []).length;
}

/**
 * Find factual entity statements — the "Tamsen Fadal is a ..." construction
 * that search engines lean on for entity understanding.
 * @param {string} text
 * @param {string} entity
 * @returns {string[]} matched sentences
 */
function findFactualStatements(text, entity) {
  if (!text) return [];
  const name = escapeRegex(entity);
  const copula = '(?:is|was|has been|serves as|works as|remains)';
  const re = new RegExp(`[^.!?]*\\b${name}\\b\\s+${copula}\\b[^.!?]*[.!?]`, 'gi');
  return (text.match(re) || []).map((s) => s.trim()).filter(Boolean);
}

/**
 * Score a page's entity signals.
 *
 * @param {string} html
 * @param {object} opts
 * @param {string} opts.entity - full entity name, e.g. "Tamsen Fadal"
 * @param {string} opts.origin - site origin for internal-link detection
 * @returns {object} scored page
 */
function scorePage(html, { entity, origin }) {
  const title = extractTitle(html);
  const description = extractMetaDescription(html);
  const h1s = extractH1s(html);
  const headings = extractHeadings(html);
  const footerText = extractFooterText(html);
  const bodyText = extractVisibleText(html);
  const ldBlocks = extractJsonLd(html);
  const internalAnchors = extractInternalAnchors(html, origin);
  const outboundProfiles = extractOutboundProfiles(html);

  const hasEntity = (s) => Boolean(s) && s.toLowerCase().includes(entity.toLowerCase());

  const factualStatements = findFactualStatements(bodyText, entity);
  const entityMentions = countEntityMentions(bodyText, entity);
  const brandedInternalAnchors = internalAnchors.filter((a) => hasEntity(a.text));

  const titleHasEntity = hasEntity(title);
  const h1HasEntity = h1s.some(hasEntity);
  const descriptionHasEntity = hasEntity(description);
  const footerHasEntity = hasEntity(footerText);
  const types = jsonLdTypes(ldBlocks);

  // Weighted so the signals Google leans on hardest dominate the score.
  const signalScore =
    (titleHasEntity ? 3 : 0) +
    (h1HasEntity ? 3 : 0) +
    (descriptionHasEntity ? 2 : 0) +
    (footerHasEntity ? 1 : 0) +
    Math.min(factualStatements.length, 3) * 2 +
    Math.min(entityMentions, 10) * 0.2 +
    (types.includes('Person') ? 3 : 0) +
    Math.min(brandedInternalAnchors.length, 5) * 0.4 +
    Math.min(outboundProfiles.length, 8) * 0.25;

  return {
    title,
    description,
    h1s,
    headings,
    titleHasEntity,
    h1HasEntity,
    descriptionHasEntity,
    footerHasEntity,
    footerText,
    entityMentions,
    factualStatements,
    jsonLdTypes: types,
    internalAnchorCount: internalAnchors.length,
    brandedInternalAnchors,
    outboundProfiles,
    signalScore: Number(signalScore.toFixed(2)),
  };
}

export {
  extractTitle,
  extractMetaContent,
  extractMetaDescription,
  extractHeadings,
  extractH1s,
  extractJsonLd,
  jsonLdTypes,
  extractFooterText,
  extractVisibleText,
  extractInternalAnchors,
  extractOutboundProfiles,
  countEntityMentions,
  findFactualStatements,
  scorePage,
  PROFILE_PLATFORMS,
};
