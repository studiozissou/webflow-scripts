import { test, expect } from '@playwright/test';

const ORIGIN = 'https://www.tamsenfadal.com';

const ADVOCACY_PAGES = ['/advocacy', '/advocacy?430d54ad_page=1', '/advocacy?430d54ad_page=2', '/advocacy?430d54ad_page=3'];
const PRESS_PAGES = ['/press', ...Array.from({ length: 12 }, (_, i) => `/press?e90b90e6_page=${i + 1}`)];
const DIRECTORY_PAGES = Array.from({ length: 14 }, (_, i) => `/menopause-support-provider-directory?62cd2995_page=${i + 1}`);

const NEW_BILL_HREFS = [
  'https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4790',
  'https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4791',
  'https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4814',
  'https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-HB-4815',
  'https://www.nysenate.gov/legislation/bills/2025/S3908',
  'https://malegislature.gov/Bills/194/H2499',
];

const DEAD_PRESS = ['moderngenxwoman.com', 'preferredhealthmagazine.com', 'sherrishowtv.com', 'bellamag.co', 'id1591991012'];
const DEAD_PROVIDERS = ['journeyofawoman.co.uk', 'theconfidenceclinic.co', 'cgcchicago.com', 'ytvhealthcoaching.com', 'ysl.nl/afdelingen'];

const REPOINTS = [
  {
    path: '/blog/where-to-watch',
    dead: ['https://www.pbs.org/show/the-m-factor-shredding-the-silence-on-menopause/', 'https://worldchannel.org/schedule/'],
    live: ['https://themfactorfilm.com/', 'https://worldchannel.org/'],
  },
  {
    path: '/blog/menopause-myths-holding-you-back',
    dead: ['http://www.menopause.org/docs/default-source/2015/mn-hot-flashes.pdf'],
    live: ['https://menopause.org/patient-education/menopause-topics/hot-flashes'],
  },
  {
    path: '/blog/how-to-spot-a-narcissist-tamsen-fadal-rebecca-zung',
    dead: ['https://www.naplesfamilylawfirm.com/attorneys/rebecca-zung/'],
    live: ['https://rebeccazung.com/meet-rebecca'],
  },
  {
    path: '/blog/how-to-deal-with-menopausal-thinning-hair',
    dead: ['https://www.ulta.com/brand/better-not-younger'],
    live: ['https://better-notyounger.com/'],
  },
  {
    path: '/blog/how-to-deal-with-hot-flashes',
    dead: ['https://zoe.com/learn/7-nutrition-tips-to-manage-hot-flashes'],
    live: ['https://zoe.com/learn/foods-that-ease-hot-flashes'],
  },
  {
    path: '/podcast/the-1-alcohol-expert-one-drink-a-day-is-ruining-your-health',
    dead: ['https://www.functionalsobriety.com/book'],
    live: ['https://www.brookescheller.com/book'],
  },
];

const UNLINKS = [
  { path: '/blog/how-to-deal-with-menopausal-tingling-extremities', text: 'Tingling extremities' },
  { path: '/blog/how-to-deal-with-menopausal-brittle-nails', text: 'Brittle nails during menopause' },
];

const FALSE_POSITIVES = [
  { path: '/blog/how-to-deal-with-menopausal-sleep-problems', href: 'nia.nih.gov/health/menopause/sleep-problems-and-menopause-what-can-i-do' },
  { path: '/book-how-to-menopause', href: 'amazon.com.au/How-Menopause' },
  { path: '/advocacy', href: 'legis.iowa.gov/legislation/BillBook?ga=91&ba=SF85' },
  { path: '/blog/how-to-deal-with-menopausal-depression', href: 'nuffieldhealth.com/article/sleep-tips-when-youre-in-menopause' },
];

const fetchHtml = async (request, path) => {
  const res = await request.get(`${ORIGIN}${path}`, { timeout: 30_000 });
  expect(res.status(), `${path} should load`).toBe(200);
  return res.text();
};

const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

test.describe('tamsen-broken-external-links-sep-2026: advocacy', () => {
  for (const path of ADVOCACY_PAGES) {
    test(`carries no legislature.mi.gov doc.aspx links — ${path}`, async ({ request }) => {
      const html = await fetchHtml(request, path);
      expect(hrefs(html).filter((h) => h.includes('legislature.mi.gov/doc.aspx'))).toEqual([]);
      expect(hrefs(html).filter((h) => h.includes('Bills/194/HD4250'))).toEqual([]);
      expect(hrefs(html).filter((h) => h.includes('bills/2023/S3908'))).toEqual([]);
    });
  }

  test('links to the current Michigan, New York and Massachusetts bill pages', async ({ request }) => {
    const all = (await Promise.all(ADVOCACY_PAGES.map((p) => fetchHtml(request, p)))).join('');
    const found = hrefs(all);
    for (const href of NEW_BILL_HREFS) {
      expect(found.some((h) => h.replace(/&amp;/g, '&') === href), `missing ${href}`).toBe(true);
    }
  });
});

test.describe('tamsen-broken-external-links-sep-2026: press', () => {
  test('press pages carry no dead press domains', async ({ request }) => {
    const all = (await Promise.all(PRESS_PAGES.map((p) => fetchHtml(request, p)))).join('');
    const offenders = hrefs(all).filter((h) => !h.includes('web.archive.org') && DEAD_PRESS.some((d) => h.includes(d)));
    expect(offenders).toEqual([]);
  });
});

test.describe('tamsen-broken-external-links-sep-2026: provider directory', () => {
  test('provider directory pages carry no dead provider domains', async ({ request }) => {
    const all = (await Promise.all(DIRECTORY_PAGES.map((p) => fetchHtml(request, p)))).join('');
    const offenders = hrefs(all).filter((h) => !h.startsWith('mailto:') && DEAD_PROVIDERS.some((d) => h.toLowerCase().includes(d)));
    expect(offenders).toEqual([]);
  });

  test('Dr. Schmitz - van Splunder links to the ysl.nl root', async ({ request }) => {
    const all = (await Promise.all(DIRECTORY_PAGES.map((p) => fetchHtml(request, p)))).join('');
    expect(hrefs(all).some((h) => /^https:\/\/www\.ysl\.nl\/?$/.test(h))).toBe(true);
  });
});

test.describe('tamsen-broken-external-links-sep-2026: repointed content links', () => {
  for (const { path, dead, live } of REPOINTS) {
    test(`carries the new href and not the dead one — ${path}`, async ({ request }) => {
      const html = await fetchHtml(request, path);
      const found = hrefs(html).map((h) => h.replace(/&amp;/g, '&'));
      for (const d of dead) expect(found.some((h) => h.startsWith(d)), `dead href still present: ${d}`).toBe(false);
      for (const l of live) expect(found.some((h) => h.startsWith(l)), `new href missing: ${l}`).toBe(true);
    });
  }
});

test.describe('tamsen-broken-external-links-sep-2026: unlinked sentences', () => {
  for (const { path, text } of UNLINKS) {
    test(`keeps the text but drops the healthnews href — ${path}`, async ({ request }) => {
      const html = await fetchHtml(request, path);
      expect(html).toContain(text);
      expect(hrefs(html).filter((h) => h.includes('healthnews.com'))).toEqual([]);
    });
  }
});

test.describe('tamsen-broken-external-links-sep-2026: untouched false positives', () => {
  for (const { path, href } of FALSE_POSITIVES) {
    test(`still linked — ${href.split('/')[0]} on ${path}`, async ({ request }) => {
      const html = await fetchHtml(request, path);
      expect(hrefs(html).some((h) => h.replace(/&amp;/g, '&').includes(href)), `expected ${href} on ${path}`).toBe(true);
    });
  }
});

test.describe('tamsen-broken-external-links-sep-2026: no regressions', () => {
  for (const path of ['/advocacy', '/press', '/menopause-support-provider-directory', '/blog/where-to-watch']) {
    test(`no console errors — ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);

      expect(errors).toEqual([]);
    });
  }

  test('brittle-nails post keeps its unrelated hellobonafide link', async ({ request }) => {
    const html = await fetchHtml(request, '/blog/how-to-deal-with-menopausal-brittle-nails');
    expect(hrefs(html).some((h) => h.includes('hellobonafide.com'))).toBe(true);
  });
});
