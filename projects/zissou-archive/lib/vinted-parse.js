// Parses Vinted catalog HTML (Next.js RSC payload) into listing items and detects Cloudflare challenges.

import { VINTED_DOMAIN } from '../config.js';

const DEBUG = process.env.DEBUG === '1';

const LABEL_KEYS = {
  nl: { Merk: 'brand', Staat: 'condition', Maat: 'size' },
  en: { Brand: 'brand', Condition: 'condition', Size: 'size' },
  fr: { Marque: 'brand', 'État': 'condition', Taille: 'size' },
  de: { Marke: 'brand', Zustand: 'condition', 'Größe': 'size' },
  it: { Brand: 'brand', Condizioni: 'condition', Taglia: 'size' },
  es: { Marca: 'brand', Estado: 'condition', Talla: 'size' },
  pt: { Marca: 'brand', Estado: 'condition', Tamanho: 'size' },
};

const ALL_KEYS = Object.assign({}, ...Object.values(LABEL_KEYS));

const NBSP = String.fromCharCode(0xa0);
const AMOUNT = String.raw`(?:€\s?\d[\d.,${NBSP}]*|\d[\d.,${NBSP}]*\s?€)`;
const TRAILING_AMOUNTS = new RegExp(String.raw`^([\s\S]*?),\s(${AMOUNT}),\s(${AMOUNT})\s*$`);
const PUSH_RE = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
const ITEMS_MARKER = '"items":{"items":';

function parseAmount(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    s = s.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma !== -1) {
    s = /,\d{1,2}$/.test(s) && s.indexOf(',') === lastComma ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (lastDot !== -1 && !(/\.\d{1,2}$/.test(s) && s.indexOf('.') === lastDot)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function peelFields(text, keys) {
  const fields = {};
  let rest = text;
  for (;;) {
    let best = -1;
    let bestKey = null;
    for (const key of Object.keys(keys)) {
      const idx = rest.lastIndexOf(`, ${key}: `);
      if (idx > best && !(keys[key] in fields)) {
        best = idx;
        bestKey = key;
      }
    }
    if (best === -1) break;
    fields[keys[bestKey]] = rest.slice(best + bestKey.length + 4).trim() || null;
    rest = rest.slice(0, best);
  }
  return { fields, rest };
}

export function parseAccessibilityLabel(label, locale = 'nl') {
  const text = typeof label === 'string' ? label : '';
  let head = text;
  let price = null;
  let total = null;
  const amounts = TRAILING_AMOUNTS.exec(text);
  if (amounts) {
    head = amounts[1];
    price = parseAmount(amounts[2]);
    total = parseAmount(amounts[3]);
  }
  let peeled = peelFields(head, LABEL_KEYS[locale] ?? LABEL_KEYS.nl);
  if (Object.keys(peeled.fields).length === 0) peeled = peelFields(head, ALL_KEYS);
  return {
    title: peeled.rest,
    brand: peeled.fields.brand ?? null,
    condition: peeled.fields.condition ?? null,
    size: peeled.fields.size ?? null,
    price,
    total,
  };
}

function decodePayload(html) {
  let out = '';
  for (const match of html.matchAll(PUSH_RE)) {
    try {
      out += JSON.parse(`"${match[1]}"`);
    } catch {
      DEBUG && console.log('[vinted-parse] undecodable push chunk');
    }
  }
  return out;
}

function sliceArray(text, start) {
  if (text[start] !== '[') return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function findItemEntries(payload) {
  let from = 0;
  for (;;) {
    const idx = payload.indexOf(ITEMS_MARKER, from);
    if (idx === -1) return null;
    const json = sliceArray(payload, idx + ITEMS_MARKER.length);
    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        DEBUG && console.log('[vinted-parse] items array did not parse');
      }
    }
    from = idx + ITEMS_MARKER.length;
  }
}

function cleanLine(value) {
  return typeof value === 'string' && value && value !== '$undefined' ? value : null;
}

function toItem(product, domain, locale) {
  const box = product.itemBox ?? {};
  const label = parseAccessibilityLabel(box.accessibilityLabel, locale);
  const [lineSize, lineCondition] = (() => {
    const second = cleanLine(box.secondLine);
    if (!second) return [null, null];
    const parts = second.split(' · ').map((p) => p.trim());
    return parts.length > 1 ? [parts[0] || null, parts.slice(1).join(' · ') || null] : [null, parts[0] || null];
  })();
  const price = parseAmount(product.price?.amount) ?? label.price;
  const totalPrice = parseAmount(product.totalItemPrice?.amount) ?? label.total ?? price;
  const relative = typeof product.url === 'string' ? product.url : `/items/${product.id}`;
  return {
    id: product.id,
    title: typeof product.title === 'string' ? product.title : label.title,
    url: /^https?:\/\//.test(relative) ? relative : `https://${domain}${relative.startsWith('/') ? '' : '/'}${relative}`,
    price,
    totalPrice,
    currency: product.price?.currencyCode ?? 'EUR',
    favourites: Number(product.favouriteCount) || 0,
    thumbnail: cleanLine(product.thumbnailUrl),
    brand: label.brand ?? cleanLine(box.firstLine),
    size: label.size ?? lineSize,
    condition: label.condition ?? lineCondition,
    isPromoted: product.isPromoted === true,
    isBusiness: product.user?.isBusiness === true,
  };
}

export function parseCatalogHtml(html, { domain = VINTED_DOMAIN, locale = 'nl' } = {}) {
  if (typeof html !== 'string' || !html) return [];
  try {
    const entries = findItemEntries(decodePayload(html));
    if (!entries) return [];
    return entries
      .filter((entry) => entry && entry.productItem && entry.productItem.id != null)
      .map((entry) => toItem(entry.productItem, domain, locale))
      .filter((item) => item.price != null);
  } catch (err) {
    DEBUG && console.log('[vinted-parse] failed', err);
    return [];
  }
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : null;
}

export function detectChallenge({ status, headers, body } = {}) {
  if (String(headerValue(headers, 'cf-mitigated') ?? '').toLowerCase() === 'challenge') return true;
  const text = typeof body === 'string' ? body : '';
  if (text.includes('_cf_chl_opt')) return true;
  if (text.includes('challenge-platform')) {
    return status !== 200 || !text.includes('self.__next_f');
  }
  return false;
}
