// Shared helpers for the Carsa code-migration acceptance suites: base URL, page loading, error capture, sitemap sampling, finance API mocking and attribution storage.
const BASE = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';

const KNOWN_ERRORS = [/filtered is not defined/, /setting 'innerText'/, /reading 'length'/];

const FINANCE_HOST = 'consumer-finance.carsanet.co.uk';

const FINANCE_CONFIG = {
  representativeApr: 11.9,
  aprByTier: { Excellent: 7.9, VeryGood: 11.9, Good: 12.9, Fair: 17.9, BelowAverage: 17.9 },
  defaultTerm: 48,
  defaultAnnualMileage: 10000,
  defaultDepositAmount: 3000,
};

const FINANCE_QUOTE = {
  hp: { payments: { regular: 321.45 }, totalAmountPayable: 15432.1, totalCharges: 2000.5, flatRate: 5.5, term: 48 },
  pcp: { payments: { regular: 250.25 }, residualValue: 5000, totalAmountPayable: 14000, totalCharges: 1800, flatRate: 5.1, term: 48, excessMileage: 6 },
};

async function waitForReady(page) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
}

async function loadPage(page, path = '/', settle = 2000, options = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', ...options });
  await waitForReady(page);
  await page.waitForTimeout(settle);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

function unexpectedErrors(errors) {
  return errors.map((e) => e.message).filter((m) => !KNOWN_ERRORS.some((re) => re.test(m)));
}

function errorStacks(errors) {
  return errors
    .filter((e) => !KNOWN_ERRORS.some((re) => re.test(e.message)))
    .map((e) => (e.stack || e.message).split('\n').slice(0, 4).join(' | '))
    .join('\n');
}

let sitemapCache = null;

async function sitemapPaths(request, prefix, count = 3) {
  if (!sitemapCache) {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const xml = await res.text();
    sitemapCache = [...xml.matchAll(/<loc>https?:\/\/[^<]*?(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  }
  return sitemapCache.filter((p) => p.startsWith(prefix)).slice(0, count);
}

async function firstPath(request, prefix) {
  const [first] = await sitemapPaths(request, prefix, 1);
  return first || null;
}

async function mockFinance(page, { config = FINANCE_CONFIG, quote = FINANCE_QUOTE, quoteStatus = 200 } = {}) {
  const calls = { config: 0, quotes: [] };
  await page.route(`**/${FINANCE_HOST}/**`, async (route) => {
    const url = route.request().url();
    if (url.endsWith('/finance-config')) {
      calls.config += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) });
    }
    if (url.endsWith('/quote')) {
      calls.quotes.push(route.request().postDataJSON());
      return route.fulfill({ status: quoteStatus, contentType: 'application/json', body: JSON.stringify(quote) });
    }
    return route.continue();
  });
  return calls;
}

async function waitForQuotes(page, calls, n, timeout = 10_000) {
  const start = Date.now();
  while (calls.quotes.length < n && Date.now() - start < timeout) await page.waitForTimeout(100);
  return calls.quotes.length;
}

async function readAttribution(page) {
  return page.evaluate(() => ({
    local: JSON.parse(localStorage.getItem('attribution') || 'null'),
    session: JSON.parse(sessionStorage.getItem('attribution_session') || 'null'),
  }));
}

async function seedAttribution(context, { utms = {}, referrer = '', referrerDomain = '', expiresAt } = {}) {
  const record = { utms, referrer, referrerDomain, updatedAt: Date.now(), expiresAt: expiresAt ?? Date.now() + 30 * 864e5 };
  await context.addInitScript((r) => {
    if (self !== top || window.__carsaSeeded) return;
    window.__carsaSeeded = true;
    if (!sessionStorage.getItem('__carsaSeededOnce')) {
      sessionStorage.setItem('__carsaSeededOnce', '1');
      localStorage.setItem('attribution', JSON.stringify(r));
    }
  }, record);
}

async function seedSessionOnce(context, key, value) {
  await context.addInitScript(([k, v]) => {
    if (self !== top) return;
    if (!sessionStorage.getItem(`__seeded_${k}`)) {
      sessionStorage.setItem(`__seeded_${k}`, '1');
      sessionStorage.setItem(k, v);
    }
  }, [key, value]);
}

function idOrData(id) {
  return `#${id}, [data-number="${id}"]`;
}

function gbp(n, decimals = 0) {
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function parseGBP(text) {
  return Number(String(text).replace(/[^0-9.]/g, '')) || 0;
}

const VIEWPORT_MOBILE = { width: 375, height: 812 };

export {
  BASE,
  KNOWN_ERRORS,
  FINANCE_HOST,
  FINANCE_CONFIG,
  FINANCE_QUOTE,
  VIEWPORT_MOBILE,
  loadPage,
  waitForReady,
  collectErrors,
  unexpectedErrors,
  errorStacks,
  sitemapPaths,
  firstPath,
  mockFinance,
  waitForQuotes,
  readAttribution,
  seedAttribution,
  seedSessionOnce,
  idOrData,
  gbp,
  parseGBP,
};
