// Decides whether a crawl is trustworthy: aborts on zero pages or a bot wall, banners low sitemap coverage, and flags suspicious count jumps.

const BOT_WALL_MIN_PAGES = 10;
const BOT_WALL_SHARE = 0.9;
const COVERAGE_MIN = 0.95;
const SUSPECT_MIN = 20;
const SUSPECT_FACTOR = 5;

export function coverageOf(facts, site) {
  const fetchedKeys = new Set(
    (facts ?? []).filter((fact) => fact.fetchState === 'ok' || fact.fetchState === 'non_html').map((fact) => fact.urlKey),
  );
  const sitemapKeys = [...new Set((site?.rows ?? []).map((row) => row.urlKey))];
  const fetched = sitemapKeys.filter((key) => fetchedKeys.has(key)).length;
  return { sitemapUrls: sitemapKeys.length, fetched, ratio: sitemapKeys.length ? fetched / sitemapKeys.length : null };
}

export function detectBotWall(facts) {
  const pages = (facts ?? []).filter((fact) => fact.fetchState === 'ok' && fact.status === 200);
  if (pages.length < BOT_WALL_MIN_PAGES) return null;
  const counts = new Map();
  for (const fact of pages) if (fact.htmlHash) counts.set(fact.htmlHash, (counts.get(fact.htmlHash) ?? 0) + 1);
  const [hash, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const share = count / pages.length;
  if (share < BOT_WALL_SHARE) return null;
  return {
    code: 'bot_wall',
    message: `${count} of ${pages.length} 200-status pages (${Math.round(share * 100)}%) share htmlHash ${hash}: this looks like a bot wall or interstitial, not the site. Check the user agent and try again.`,
    hash,
    share,
  };
}

export function finalFailCounts(findings) {
  const counts = {};
  for (const finding of findings ?? []) {
    if (finding.state !== 'fail' || finding.transient || finding.excludedFromParity) continue;
    counts[finding.taxonomyId] = (counts[finding.taxonomyId] ?? 0) + 1;
  }
  return counts;
}

export function runSanity({ facts, findings, site, previousSnapshot }) {
  const banners = [];
  const coverage = coverageOf(facts, site);
  let abort = null;

  if (!(facts ?? []).some((fact) => fact.fetchState === 'ok')) {
    abort = { code: 'no_pages', message: 'No page was fetched successfully, so there is nothing to report. Check the URL, the network and robots.txt.' };
  } else {
    const wall = detectBotWall(facts);
    if (wall) abort = { code: wall.code, message: wall.message };
  }

  if (coverage.ratio !== null && coverage.ratio < COVERAGE_MIN) {
    banners.push({
      code: 'low_coverage',
      message: `Only ${coverage.fetched} of ${coverage.sitemapUrls} sitemap URLs (${(coverage.ratio * 100).toFixed(1)}%) were fetched, under the 95% needed for complete counts.`,
    });
  }

  const suspect = [];
  if (previousSnapshot?.counts) {
    for (const [taxonomyId, count] of Object.entries(finalFailCounts(findings)).sort(([a], [b]) => a.localeCompare(b))) {
      const previous = previousSnapshot.counts[taxonomyId] ?? 0;
      if (count > SUSPECT_MIN && count > SUSPECT_FACTOR * previous) suspect.push({ taxonomyId, count, previous });
    }
  }

  return { abort, banners, suspect, coverage };
}
