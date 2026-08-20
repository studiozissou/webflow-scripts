// Crawls tamsenfadal.com's sitemap and drafts shortened SEO titles for every page whose <title> exceeds the SEMrush 70-character limit.

const ORIGIN = 'https://www.tamsenfadal.com';
const SITEMAP = `${ORIGIN}/sitemap.xml`;
const MAX_TITLE = 70;
const SUFFIX = ' | Tamsen Fadal';
const MAX_BARE = MAX_TITLE - SUFFIX.length;
const CONCURRENCY = 12;

const OLD_SUFFIXES = [
  ' | The Tamsen Show Podcast | Tamsen Fadal',
  ' | The Tamsen Show | Blog | Tamsen Fadal',
  ' | Menopause Education Hub | Tamsen Fadal',
  ' | Blog | Tamsen Fadal',
  ' | Shop | Tamsen Fadal',
  ' | Tamsen Fadal',
];

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m])
    .trim();

const stripSuffix = (title) => {
  for (const suffix of OLD_SUFFIXES) {
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
  }
  return title.trim();
};

const tidy = (s) => s.replace(/\s+/g, ' ').replace(/[\s,;:&\-–—]+$/, '').trim();

const truncateAtWord = (s, limit) => {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return tidy(lastSpace > limit * 0.5 ? cut.slice(0, lastSpace) : cut.slice(0, limit));
};

export const shorten = (name) => {
  const bare = tidy(name);
  if (bare.length <= MAX_BARE) return { text: bare, rule: 'unchanged' };

  const colon = bare.indexOf(':');
  if (colon > 15) {
    const head = tidy(bare.slice(0, colon));
    if (head.length <= MAX_BARE) return { text: head, rule: 'before-colon' };
  }

  const withoutGuest = tidy(bare.replace(/\s+with\s+(Dr\.?\s+)?[A-Z][^,:]*$/, ''));
  if (withoutGuest.length <= MAX_BARE && withoutGuest.length > 15) {
    return { text: withoutGuest, rule: 'drop-guest-clause' };
  }

  if (colon > 15) {
    const head = truncateAtWord(tidy(bare.slice(0, colon)), MAX_BARE);
    if (head.length > 15) return { text: head, rule: 'before-colon-truncated' };
  }

  return { text: truncateAtWord(bare, MAX_BARE), rule: 'truncated' };
};

const group = (url) => {
  const path = url.replace(ORIGIN, '');
  if (path.startsWith('/blog/')) return 'blog';
  if (path.startsWith('/podcast/')) return 'podcast';
  if (path.startsWith('/shop/')) return 'shop';
  if (path.startsWith('/menopause-education-hub/')) return 'hub';
  return 'static';
};

const fetchTitle = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (SEOAudit)' } });
  const html = await res.text();
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decode(match[1]) : '';
};

const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
};

export const run = async () => {
  const sitemap = await (await fetch(SITEMAP)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const rows = await mapLimit(urls, CONCURRENCY, async (url) => {
    const title = await fetchTitle(url);
    const bare = stripSuffix(title);
    const { text, rule } = shorten(bare);
    const proposed = `${text}${SUFFIX}`;
    return {
      url,
      group: group(url),
      currentTitle: title,
      currentLength: title.length,
      bare,
      proposedTitle: proposed,
      proposedLength: proposed.length,
      rule,
      needsChange: title.length > MAX_TITLE,
      stillOver: proposed.length > MAX_TITLE,
    };
  });

  const header =
    'url\tgroup\ttier\tcurrent_length\tproposed_length\trule\tcurrent_title\tproposed_title';
  const lines = rows
    .filter((r) => r.needsChange)
    .sort((a, b) => b.currentLength - a.currentLength)
    .map((r) =>
      [
        r.url,
        r.group,
        r.rule === 'truncated' || r.rule === 'before-colon-truncated' ? 'editorial' : 'auto',
        r.currentLength,
        r.proposedLength,
        r.rule,
        r.currentTitle,
        r.proposedTitle,
      ].join('\t')
    );

  process.stdout.write([header, ...lines].join('\n') + '\n');

  const over = rows.filter((r) => r.needsChange);
  const unresolved = over.filter((r) => r.stillOver);
  process.stderr.write(
    `pages=${rows.length} over70=${over.length} resolved=${over.length - unresolved.length} stillOver=${unresolved.length}\n`
  );
};

if (import.meta.url === `file://${process.argv[1]}`) await run();
