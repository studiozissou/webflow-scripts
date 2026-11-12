// Scans one homepage: extracts site facts, detects parked domains and the builder, reads PSI lab metrics and runs the reused site-review checks through an adapter.
import { fetchPage as realFetchPage } from '../site-review/lib/fetch-page.js';
import { loadConfig } from '../site-review/config.js';
import { check as metaTags } from '../site-review/checks/meta-tags.js';
import { check as brokenLinks } from '../site-review/checks/broken-links.js';
import { check as mixedContent } from '../site-review/checks/mixed-content.js';
import { check as psiCheck } from '../site-review/checks/psi.js';
import { detectPlatform } from './platform.js';
import { decodeEntities, extractPostcode, normalisePhone, normalisePostcode, pageText, siteName } from './text.js';

const DEBUG = process.env.DEBUG_OUTREACH === '1';
const debugLog = (...args) => DEBUG && console.log(...args);
const defaultLog = { log: debugLog, warn: debugLog, error: debugLog, info: debugLog, debug: debugLog };

const DEFAULT_CHECKS = { 'meta-tags': metaTags, 'broken-links': brokenLinks, 'mixed-content': mixedContent, psi: psiCheck };

const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const LOCAL_TYPES = new Set([
  'LocalBusiness', 'FoodEstablishment', 'Restaurant', 'CafeOrCoffeeShop', 'BarOrPub', 'Bakery', 'Winery', 'Brewery', 'Distillery',
  'IceCreamShop', 'FastFoodRestaurant', 'VeterinaryCare', 'Florist', 'HairSalon', 'BeautySalon', 'DaySpa', 'HealthAndBeautyBusiness',
  'Store', 'BookStore', 'ProfessionalService', 'Dentist', 'MedicalClinic', 'Physician',
]);

const PARKED = /(?:this )?domain (?:name )?(?:is|may be) for sale|buy this domain|domein (?:is )?te koop|domain parking|parked (?:free|domain)|sedoparking|hugedomains|afternic/i;

const attrs = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((m) => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]),
);

const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => attrs(m[0]));

function links(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decodeEntities(attrs(m[1]).href ?? ''), text: pageText(m[2]) }));
}

function jsonLdNodes(html) {
  const flatten = (d) => (Array.isArray(d) ? d.flatMap(flatten) : d && typeof d === 'object' ? [d, ...flatten(d['@graph'] ?? [])] : []);
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => {
    try {
      return flatten(JSON.parse(m[1]));
    } catch {
      return [];
    }
  });
}

const isLocalType = (t) => LOCAL_TYPES.has(t) || /(?:Store|Shop|Restaurant)$/.test(t);

function findPhone(text, pageLinks) {
  const tel = pageLinks.find((l) => /^tel:/i.test(l.href));
  const fromTel = tel && normalisePhone(tel.href.replace(/^tel:/i, ''));
  if (fromTel) return fromTel;
  for (const [raw] of text.matchAll(/(?<![\d+])(?:\+31|0031|0)[\d\s\-().]{8,16}\d/g)) {
    const phone = normalisePhone(raw);
    if (/^\+31\d{9}$/.test(phone)) return phone;
  }
  return null;
}

function findEmail(text, pageLinks) {
  const mail = pageLinks.find((l) => /^mailto:/i.test(l.href));
  if (mail) return mail.href.replace(/^mailto:/i, '').split('?')[0].trim() || null;
  const found = [...text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi)].map((m) => m[0]).find((e) => !/\.(?:png|jpe?g|gif|webp|svg)$/i.test(e));
  return found ?? null;
}

export function extractFacts(html, { url } = {}) {
  const page = html ?? '';
  const text = pageText(page);
  const pageLinks = links(page);
  const nodes = jsonLdNodes(page);

  const lang = tags(page, 'html')[0]?.lang;
  const titleMatch = page.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? pageText(titleMatch[1]) || null : null;

  const years = [...text.matchAll(/(?:©|\(c\)|copyright)\s*(?:\d{4}\s*[-–—]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const schemaTypes = [...new Set(nodes.flatMap((n) => [].concat(n['@type'] ?? [])).filter((t) => typeof t === 'string'))];
  const ldPostcode = nodes.map((n) => n.address?.postalCode).find(Boolean);

  const menuLinks = pageLinks.filter((l) => /menu|(?:lunch|diner|wijn|drank|spijs)kaart|carte/i.test(`${l.href} ${l.text}`));
  const menuPresent = menuLinks.length > 0;

  return {
    https: /^https:/i.test(url ?? ''),
    viewport: tags(page, 'meta').some((a) => a.name?.toLowerCase() === 'viewport'),
    language: lang ? lang.split('-')[0].toLowerCase() : null,
    title,
    siteName: siteName(page),
    email: findEmail(text, pageLinks),
    phone: findPhone(text, pageLinks),
    postcode: extractPostcode(text) ?? normalisePostcode(ldPostcode),
    copyrightYear: years.length ? Math.max(...years) : null,
    hasHours: /openingstijden|openingsuren|opening ?hours|opening times|\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}/i.test(text)
      || nodes.some((n) => n.openingHours || n.openingHoursSpecification),
    menu: { present: menuPresent, pdfOnly: menuPresent && menuLinks.every((l) => /\.pdf(?:$|[?#])/i.test(l.href)) },
    hasBooking: pageLinks.some((l) => /formitable|opentable|thefork|resengo|zenchef|quandoo|tablebooker|treatwell|salonized|calendly|reserv|booking|\bbook\b|boeken|afspraak/i.test(`${l.href} ${l.text}`)),
    schemaTypes,
    hasLocalBusinessSchema: schemaTypes.some(isLocalType),
  };
}

export function isParked(html) {
  return PARKED.test(pageText(html));
}

export function labMetrics(psiJson) {
  if (!psiJson) return null;
  const audits = psiJson.lighthouseResult?.audits ?? {};
  return {
    lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
    totalBytes: audits['total-byte-weight']?.numericValue ?? null,
  };
}

async function fetchPsi(url, config) {
  const params = new URLSearchParams({ url, strategy: 'mobile', key: config.googlePsiApiKey, category: 'performance' });
  const res = await fetch(`${PSI_API}?${params}`, { signal: AbortSignal.timeout(60_000) });
  return res.ok ? res.json() : null;
}

export async function scanSite(url, {
  fetchPage, checks = {}, config = loadConfig(), log = defaultLog, psi = fetchPsi, cache = new Map(),
} = {}) {
  const get = fetchPage ?? ((u) => realFetchPage(u, cache));
  const base = { url, finalUrl: null, reachable: false, parked: false, statusCode: null, facts: null, platform: null, findings: [], errors: [], lab: null };

  let page;
  try {
    page = await get(url, cache);
  } catch (err) {
    return { ...base, errors: [{ check: 'fetch', message: err.message }] };
  }

  const finalUrl = page.finalUrl ?? url;
  const statusCode = page.statusCode ?? null;
  if (statusCode >= 400) return { ...base, finalUrl, statusCode };

  const facts = extractFacts(page.html, { url: finalUrl });
  const platform = detectPlatform({ html: page.html, headers: page.headers, url: finalUrl });
  const result = { ...base, finalUrl, statusCode, reachable: true, facts, platform };
  if (isParked(page.html)) return { ...result, parked: true };

  const pageFetch = (u) => (u === finalUrl || u === url ? Promise.resolve(page) : get(u, cache));
  const args = { url: finalUrl, pages: [finalUrl], config, log, fetchPage: pageFetch };
  const all = { ...DEFAULT_CHECKS, ...checks };
  const names = ['meta-tags', 'broken-links', 'mixed-content', ...(config.googlePsiApiKey ? ['psi'] : [])];

  for (const name of names) {
    try {
      result.findings.push(...(await all[name](args)));
    } catch (err) {
      result.errors.push({ check: name, message: err.message });
    }
  }

  if (config.googlePsiApiKey) {
    try {
      result.lab = labMetrics(await psi(finalUrl, config));
    } catch (err) {
      result.errors.push({ check: 'psi-lab', message: err.message });
    }
  }

  return result;
}
