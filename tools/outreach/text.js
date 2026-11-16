// Pure text helpers shared across the outreach tools: entity decoding, page text, site name, language and register guesses, and domain, phone and postcode normalising.

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', middot: '·', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä',
  iacute: 'í', igrave: 'ì', iuml: 'ï', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö',
  uacute: 'ú', ugrave: 'ù', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ', Eacute: 'É',
};

export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? match;
  });
}

export function normalisePhone(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (s.startsWith('0')) s = `+31${s.slice(1)}`;
  s = s.replace(/^\+310/, '+31');
  return s.length > 1 ? s : null;
}

export function normalisePostcode(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/\s+/g, '').toUpperCase();
  return s || null;
}

export function extractPostcode(text) {
  const m = String(text ?? '').match(/\b([1-9]\d{3})\s?([A-Z]{2})\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

export function normaliseDomain(input) {
  if (!input) return null;
  const host = String(input).trim().toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.+$/, '')
    .replace(/^www\./, '');
  return host || null;
}

export function pageText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((v) => v !== undefined) ?? null;

export function siteName(html) {
  if (!html) return null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase() === 'og:site_name') {
      const name = pageText(attr(tag, 'content'));
      if (name) return name;
    }
  }
  const title = pageText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  if (!title) return null;
  return title.split(/\s+[|\-–—·]\s+|:\s/)[0].trim() || null;
}

const NL_WORDS = new Set(['de', 'het', 'een', 'en', 'van', 'niet', 'ik', 'je', 'jullie', 'wij', 'met', 'voor', 'ook', 'bij']);
const EN_WORDS = new Set(['the', 'and', 'of', 'to', 'you', 'your', 'with', 'for', 'our', 'we', 'are', 'this']);

export function guessLanguage(text) {
  let nl = 0;
  let en = 0;
  for (const word of String(text ?? '').toLowerCase().match(/\p{L}+/gu) ?? []) {
    if (NL_WORDS.has(word)) nl += 1;
    if (EN_WORDS.has(word)) en += 1;
  }
  if (nl === en || Math.max(nl, en) < 2) return null;
  return nl > en ? 'nl' : 'en';
}

export function guessRegister(text) {
  const count = (re) => (String(text ?? '').match(re) ?? []).length;
  return count(/(?<!\p{L})(?:u|uw)(?!\p{L})/giu) > count(/(?<!\p{L})(?:je|jij)(?!\p{L})/giu) ? 'u' : 'je';
}
