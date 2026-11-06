// Page definitions for the golden fixture site; every known issue is designed here and listed in expected-findings.json.

const WORDS = [
  'body', 'movement', 'posture', 'balance', 'tissue', 'fascia', 'session', 'practice', 'structure', 'release',
  'breathing', 'alignment', 'gravity', 'support', 'awareness', 'shoulder', 'spine', 'pelvis', 'stride', 'ease',
  'client', 'therapist', 'pressure', 'gentle', 'change', 'pattern', 'habit', 'length', 'space', 'ground',
  'walking', 'sitting', 'standing', 'reaching', 'turning', 'resting', 'lifting', 'opening', 'settling', 'shifting',
  'amsterdam', 'studio', 'morning', 'evening', 'weekly', 'series', 'first', 'second', 'third', 'tenth',
];

function seeded(slug) {
  let state = [...slug].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state;
  };
}

export function filler(slug, count = 240) {
  const next = seeded(slug);
  const words = Array.from({ length: count }, () => WORDS[next() % WORDS.length]);
  const sentences = [];
  for (let i = 0; i < words.length; i += 12) sentences.push(`${words.slice(i, i + 12).join(' ')}.`);
  return `<p>${slug} ${sentences.join(' ')}</p>`;
}

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self' 'unsafe-inline'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=()',
};

export { SECURITY_HEADERS };

export function layout(page) {
  const path = page.path;
  const wfPage = page.wfPage ?? `p${path.replace(/[^a-z0-9]/gi, '-')}`;
  const head = [
    page.doctype === false ? '' : '<!DOCTYPE html>',
    `<html lang="${page.lang ?? 'en'}" data-wf-page="${wfPage}" data-wf-site="golden">`,
    '<head>',
    page.charset === false ? '' : '<meta charset="utf-8">',
    page.viewport === false ? '' : '<meta name="viewport" content="width=device-width, initial-scale=1">',
    page.titleTag ?? (page.title === null ? '' : `<title>${page.title}</title>`),
    page.description === null ? '' : `<meta name="description" content="${page.description}">`,
    page.canonicalTag ?? (page.canonical === null ? '' : `<link rel="canonical" href="{{origin}}${page.canonical ?? path}">`),
    page.headExtra ?? '',
    '</head>',
  ];
  const h1 = page.h1Tag ?? (page.h1 === null ? '' : `<h1>${page.h1}</h1>`);
  const body = [
    '<body>',
    page.home ? '' : '<nav><a href="/">Home</a></nav>',
    h1,
    page.body ?? '',
    page.words === 0 ? '' : filler(path, page.words ?? 240),
    page.bodyExtra ?? '',
    '</body>',
    '</html>',
  ];
  return [...head, ...body].filter(Boolean).join('\n');
}

const clean = (path, title, extra = {}) => ({
  path,
  title,
  description: `${title}: a description written for ${path} that is long enough and unique to this page.`,
  h1: `${title} heading`,
  ...extra,
});

export const PAGES = [
  clean('/', 'Golden fixture site for the site-review crawler', {
    home: true,
    headExtra:
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Golden"}</script>',
  }),
  clean('/about', 'About the golden fixture practice in Amsterdam'),
  clean('/services', 'Services offered by the golden fixture practice'),
  clean('/contact', 'Contact the golden fixture practice by email'),
  clean('/team', 'The team behind the golden fixture practice'),
  clean('/pricing', 'Pricing for sessions at the golden fixture practice'),
  clean('/flaky-503', 'A page that fails once with 503 and then loads'),
  clean('/flaky-429', 'A page that is rate limited once and then loads'),

  clean('/apostrophe', 'Description with an apostrophe in the content', {
    description: "Janco's practice in Amsterdam: the description must be read in full, past the apostrophe.",
  }),
  clean('/svg-title', 'unused', {
    title: null,
    body: '<svg width="10" height="10"><title>Decorative icon title that is not the page title</title><rect width="10" height="10"/></svg>',
  }),
  clean('/empty-h1', 'An empty H1 still counts as one heading', {
    h1Tag: '<h1></h1>',
    body:
      '<script>var tpl = "<h1>Not a heading</h1>";</script><template><h1>Template heading</h1></template><!-- <h1>Commented heading</h1> --><noscript><h1>Noscript heading</h1></noscript>',
  }),
  clean('/entity-title', 'Rolfing &#8211; structural integration in Amsterdam', {
    description: 'Rolfing &amp; movement &#8211; a description with named and numeric entities that decode cleanly.',
  }),
  clean('/jsonld-error', 'Structured data block that does not parse', {
    headExtra: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization",}</script>',
  }),
  clean('/script-title', 'unused', {
    title: 'Hi',
    headExtra:
      '<script>document.title = "A title rewritten by script after the page loads";</script>',
  }),
  clean('/script-canonical', 'Canonical removed by script after the page loads', {
    bodyExtra: '<script>document.querySelector(\'link[rel="canonical"]\').remove();</script>',
  }),
  ...['one', 'two', 'three'].map((slug) =>
    clean(`/blog/${slug}`, `Blog post ${slug} from the golden fixture template`, {
      wfPage: 'tpl-blog',
      bodyExtra: '<script>document.querySelector("h1").remove();</script>',
    }),
  ),
  clean('/duplicate-a', 'Shared title used by two different pages', {
    description: 'Shared description used by two different pages of the golden fixture site.',
  }),
  clean('/duplicate-b', 'Shared title used by two different pages', {
    description: 'Shared description used by two different pages of the golden fixture site.',
  }),
  clean('/copy-a', 'First page carrying the copied body text', { words: 0, h1: 'Copied body text', body: '{{copy}}' }),
  clean('/copy-b', 'Second page carrying the copied body text', { words: 0, h1: 'Copied body text', body: '{{copy}}' }),
  clean('/long-title', 'This page title is far too long for search results and keeps on going well past the limit'),
  clean('/short-title', 'Short'),
  clean('/no-description', 'A page without any meta description at all', { description: null }),
  clean('/no-h1', 'A page without any H1 heading on it', { h1: null }),
  clean('/multi-h1', 'A page with two H1 headings on it', {
    h1Tag: '<h1>First heading</h1><h1>Second heading</h1>',
  }),
  clean('/h1-title', 'The H1 repeats this exact page title', { h1: 'The H1 repeats this exact page title' }),
  clean('/thin', 'A thin page with very few words on it', { words: 40 }),
  clean('/heavy', 'A page whose HTML is mostly inline script', {
    bodyExtra: `<script>var payload = "${'x'.repeat(40_000)}";</script>`,
  }),
  clean('/noindex', 'A noindexed page that is still in the sitemap', {
    headExtra: '<meta name="robots" content="noindex, follow">',
  }),
  clean('/orphan', 'A sitemap page that nothing links to'),
  clean('/canonical-missing', 'A page without a canonical link element', { canonical: null }),
  clean('/canonical-relative', 'A page whose canonical is a relative path', {
    canonicalTag: '<link rel="canonical" href="/canonical-relative">',
  }),
  clean('/canonical-multiple', 'A page with two different canonical links', {
    canonicalTag:
      '<link rel="canonical" href="{{origin}}/canonical-multiple"><link rel="canonical" href="{{origin}}/about">',
  }),
  clean('/canonical-redirect', 'A page whose canonical target redirects', { canonical: '/redirect-a' }),
  clean('/en', 'English version of the golden fixture home page', {
    lang: 'en',
    headExtra:
      '<link rel="alternate" hreflang="en" href="{{origin}}/en"><link rel="alternate" hreflang="nl" href="{{origin}}/nl"><link rel="alternate" hreflang="de" href="{{origin}}/de">',
  }),
  clean('/nl', 'Nederlandse versie van de golden fixture homepagina', {
    lang: 'nl',
    headExtra: '<link rel="alternate" hreflang="nl" href="{{origin}}/nl">',
  }),
  clean('/links', 'A page holding every kind of link under test', {
    body: [
      '{{brokenLink}}',
      '<a href="/gone-then-back">A link that is broken only once</a>',
      '<a href="/always-503">A link to a server error</a>',
      '<a href="/redirect-a">A link through a redirect chain</a>',
      '<a href="/moved">A link through a permanent redirect</a>',
      '<a href="/flaky-503">A link to the flaky page</a>',
      '<a href="/about" rel="nofollow">A nofollow internal link</a>',
      '<a href="/services"><span class="icon"></span></a>',
      '<a href="{{external}}/ok">An external link that works</a>',
      '<a href="{{external}}/gone">An external link that is gone</a>',
      '<a href="{{external}}/forbidden">An external link that forbids crawlers</a>',
      '<a href="{{external}}/rate">An external link that is rate limited</a>',
      '<a href="http://golden-missing.invalid/">An external link to a host that does not exist</a>',
      '<img src="/images/photo.png" width="10" height="10">',
      '<img src="{{external}}/img-404.png" alt="A broken external image" width="10" height="10">',
      '<img src="/images/photo.png" alt="" width="10" height="10">',
    ].join('\n'),
  }),
  clean('/uncompressed', 'A page served without any compression', { gzip: false }),
  clean('/bare-document', 'A page without doctype, viewport or charset', {
    doctype: false,
    viewport: false,
    charset: false,
    contentType: 'text/html',
  }),
  clean('/large', 'A page whose HTML is larger than two megabytes', {
    bodyExtra: `<!-- ${'padding '.repeat(270_000)} -->`,
  }),
  clean('/many-links', 'A page with more than three thousand links', {
    bodyExtra: Array.from({ length: 3001 }, () => '<a href="/about">about</a>').join(''),
  }),
];

export const COPY_TEXT = filler('/copy-shared', 240);

export const EXTRA_SITEMAP_PATHS = [
  '/About/',
  '/retired',
  '/old-page',
  '/document.pdf',
  '/reset',
  '/private',
];

export const NOT_LINKED_FROM_HOME = new Set(['/orphan', '/']);

export const ROBOTS_TXT = (origin) => `User-agent: *\nDisallow: /private\n\nSitemap: ${origin}/sitemap.xml\n`;

export const BOT_WALL_HTML =
  '<!DOCTYPE html><html><head><title>Checking your browser</title></head><body><p>Please enable JavaScript and cookies to continue.</p></body></html>';

export const NOT_FOUND_HTML =
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Page not found</title></head><body><h1>404</h1><p>This page does not exist.</p></body></html>';
