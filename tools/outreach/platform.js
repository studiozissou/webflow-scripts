// Fingerprints the site builder from HTML, response headers and URL: builder, WordPress version, end of life, "made with" badge and builder subdomain.

const BUILDERS = [
  {
    name: 'wix',
    generator: /wix\.com/i,
    html: /static\.wixstatic\.com|static\.parastorage\.com|wix-thunderbolt/i,
    header: (h) => Object.keys(h).some((k) => k.startsWith('x-wix-')),
    badge: /id=["']WIX_ADS["']|(?:gemaakt|made|created|built) (?:met|with) wix/i,
    hosts: /\.(?:wixsite\.com|editorx\.io)$/,
  },
  {
    name: 'squarespace',
    generator: /squarespace/i,
    html: /this is squarespace|squarespace-cdn\.com|static1\.squarespace\.com/i,
    header: (h) => /squarespace/i.test(h.server ?? ''),
    badge: /(?:made|built|powered|gemaakt) (?:with|by|met|door) squarespace/i,
    hosts: /\.squarespace\.com$/,
  },
  {
    name: 'webflow',
    generator: /^webflow/i,
    html: /data-wf-site=|website-files\.com/i,
    header: (h) => 'x-wf-region' in h,
    badge: /w-webflow-badge|made in webflow/i,
    hosts: /\.webflow\.io$/,
  },
  {
    name: 'jimdo',
    generator: /jimdo/i,
    html: /jimstatic\.com|jimcdn\.com/i,
    header: () => false,
    badge: /(?:gemaakt|made|created|erstellt) (?:met|with|mit) jimdo/i,
    hosts: /\.(?:jimdofree\.com|jimdosite\.com|jimdo\.com)$/,
  },
  {
    name: 'wordpress',
    generator: /^wordpress/i,
    html: /\/wp-content\/|\/wp-includes\//i,
    header: (h) => /wp-json/i.test(h.link ?? ''),
    badge: /proudly powered by wordpress/i,
    hosts: /\.wordpress\.com$/,
  },
];

function generatorOf(html) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/name\s*=\s*["']generator["']/i.test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (content) return content[1].trim();
  }
  return null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function detectPlatform({ html = '', headers = {}, url = '' } = {}) {
  const h = Object.fromEntries(Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const generator = generatorOf(html ?? '');
  const host = hostOf(url);
  const signals = [];
  let found = null;

  for (const b of BUILDERS) {
    const hits = [];
    if (generator && b.generator.test(generator)) hits.push(`generator: ${generator}`);
    if (b.html.test(html ?? '')) hits.push(`html: ${b.name} assets`);
    if (b.header(h)) hits.push(`header: ${b.name}`);
    if (b.hosts.test(host)) hits.push(`subdomain: ${host}`);
    if (hits.length) {
      found = b;
      signals.push(...hits);
      break;
    }
  }

  if (!found) return { builder: 'unknown', version: null, badge: false, eol: false, builderSubdomain: false, signals };

  const versionMatch = found.name === 'wordpress' && generator?.match(/wordpress\s+(\d+(?:\.\d+)*)/i);
  const version = versionMatch ? versionMatch[1] : null;
  const eol = version !== null && Number(version.split('.')[0]) < 6;
  const badge = found.badge.test(html ?? '');
  if (badge) signals.push(`badge: ${found.name}`);

  return { builder: found.name, version, badge, eol, builderSubdomain: found.hosts.test(host), signals };
}
