// Pure triage rules that turn a scanned prospect into a verdict with evidence-backed reasons.

const HARD = new Set(['unreachable', 'no-https', 'no-viewport', 'builder-eol', 'slow-lcp', 'heavy-page']);
const UNCOUNTED = new Set(['no-schema']);

const reason = (id, url, value, check) => ({ id, evidence: { url: url ?? null, value: value ?? null, check } });

const siteDown = (site) => !site?.reachable || Boolean(site?.parked);

function skipReason(p, url) {
  if (p.status === 'Do not contact') return reason('do-not-contact', url, p.status, 'status');
  if (p.chain) return reason('chain', url, true, 'chains');
  if (p.gbp?.closed) return reason('closed', url, p.gbp.closed, 'gbp-info');
  if (siteDown(p.site) && !p.gbp?.matched) return reason('no-site-no-gbp', url, p.site?.parked ? 'parked' : null, 'resolve');
  return null;
}

function newSiteReasons(site, now) {
  const url = site.finalUrl ?? site.url;
  if (siteDown(site)) return [reason('unreachable', site.url, site.parked ? 'parked' : site.statusCode ?? 'unreachable', 'fetch')];
  const facts = site.facts ?? {};
  const platform = site.platform ?? {};
  const { lab } = site;
  const out = [];
  if (facts.https === false) out.push(reason('no-https', url, url, 'https'));
  if (facts.viewport === false) out.push(reason('no-viewport', url, false, 'viewport'));
  if (platform.eol) out.push(reason('builder-eol', url, `${platform.builder} ${platform.version ?? ''}`.trim(), 'platform'));
  if (platform.badge) out.push(reason('builder-badge', url, platform.builder, 'platform'));
  if (lab?.lcpMs > 4000) out.push(reason('slow-lcp', url, lab.lcpMs, 'psi'));
  if (lab?.totalBytes > 6_000_000) out.push(reason('heavy-page', url, lab.totalBytes, 'psi'));
  if (facts.copyrightYear && now.getUTCFullYear() - facts.copyrightYear >= 2 && !facts.hasHours && !facts.menu?.present) {
    out.push(reason('stale-and-no-hours', url, facts.copyrightYear, 'copyright'));
  }
  if (facts.menu?.pdfOnly && !facts.hasBooking) out.push(reason('pdf-menu-no-booking', url, 'pdf', 'menu'));
  return out;
}

function siteManagementReasons(site) {
  if (siteDown(site)) return [];
  const url = site.finalUrl ?? site.url;
  const findings = site.findings ?? [];
  const meta = (title) => findings.find((f) => f.check === 'meta-tags' && f.title === title);
  const out = [];
  const title = meta('Missing <title> tag');
  if (title) out.push(reason('missing-title', title.url ?? url, title.title, 'meta-tags'));
  const description = meta('Missing meta description');
  if (description) out.push(reason('missing-description', description.url ?? url, description.title, 'meta-tags'));
  if (site.facts?.hasLocalBusinessSchema === false) out.push(reason('no-schema', url, site.facts.schemaTypes ?? [], 'structured-data'));
  const isNoise = (link) => /\/cdn-cgi\//.test(link) || /^https?:\/\/[^/]+\/?$/.test(link);
  const broken = findings.filter((f) => f.check === 'broken-links' && f.severity === 'critical' && !isNoise(String(f.element ?? f.title ?? '')));
  if (broken.length) out.push(reason('broken-links', broken[0].url ?? url, broken.map((f) => f.element ?? f.title), 'broken-links'));
  return out;
}

const outside = (rank, top) => Boolean(rank) && !(typeof rank.position === 'number' && rank.position <= top);

function gbpReasons(gbp, url) {
  if (!gbp?.matched) return [];
  const { score = {}, ranks = [] } = gbp;
  const out = [];
  if ((score.points ?? 0) + (score.unknown ?? 0) * 0.5 < 8) out.push(reason('gbp-low-score', url, score.display, 'gbp-score'));
  const main = ranks.find((r) => r.role === 'main');
  const area = ranks.find((r) => r.role === 'area');
  if (outside(area, 3) && outside(main, 10)) out.push(reason('not-top3', url, ranks, 'map-pack'));
  if (score.checks?.nap === false) out.push(reason('nap-mismatch', url, false, 'nap'));
  if (!gbp.websiteUrl) out.push(reason('gbp-no-website', url, null, 'gbp-info'));
  return out;
}

export function triage(prospect, { now = new Date() } = {}) {
  const url = prospect.site?.finalUrl ?? prospect.site?.url ?? prospect.url ?? null;
  const skip = skipReason(prospect, url);
  if (skip) return { verdict: 'skip', reasons: [skip] };

  const newSite = prospect.site ? newSiteReasons(prospect.site, now) : [];
  const management = [...siteManagementReasons(prospect.site), ...gbpReasons(prospect.gbp, url)];
  const hard = newSite.some((r) => HARD.has(r.id));

  if (hard || newSite.length >= 2) return { verdict: 'new-site+management', reasons: [...newSite, ...management] };
  const reasons = [...newSite, ...management];
  if (reasons.filter((r) => !UNCOUNTED.has(r.id)).length >= 2) return { verdict: 'management', reasons };
  return { verdict: 'neither', reasons };
}
