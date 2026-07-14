import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'https://nem-life-1.webflow.io';
const STATIC_PAGES = [
  '/',
  '/nem-methode',
  '/missie-nem-life',
  '/inzichten',
  '/ervaringen',
  '/link-in-bio/christel',
  '/voorwaarden',
];

/* ------------------------------------------------------------------ */
/*  Phase 1 — SEO Metadata                                            */
/* ------------------------------------------------------------------ */

test.describe('phase-1: seo metadata', () => {
  test('Home has Dutch SEO title', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const title = await page.title();
    expect(title).toContain('NEM Life');
    expect(title).not.toContain('NEMLife.com NEW');
  });

  test('Home has meta description', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const desc = await page.$eval('meta[name="description"]', el => el.content);
    expect(desc.length).toBeGreaterThan(20);
  });

  test('Inzichten has Dutch SEO title', async ({ page }) => {
    await page.goto(`${BASE}/inzichten`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const title = await page.title();
    expect(title).toContain('Inzichten');
    expect(title).not.toContain('Blog Insights');
  });

  test('Ervaringen has Dutch SEO title', async ({ page }) => {
    await page.goto(`${BASE}/ervaringen`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const title = await page.title();
    expect(title).toContain('Ervaringen');
    expect(title).not.toContain('Testimonials');
  });

  test('Voorwaarden has brand suffix and meta desc', async ({ page }) => {
    await page.goto(`${BASE}/voorwaarden`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const title = await page.title();
    expect(title).toContain('NEM Life');
    const desc = await page.$eval('meta[name="description"]', el => el.content);
    expect(desc.length).toBeGreaterThan(20);
  });

  test('All published pages have meta descriptions', async ({ page }) => {
    for (const path of STATIC_PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const desc = await page.$eval('meta[name="description"]', el => el.content);
      expect(desc.length, `${path} missing meta description`).toBeGreaterThan(20);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 2 — Schema / JSON-LD                                        */
/* ------------------------------------------------------------------ */

test.describe('phase-2: json-ld schemas', () => {
  async function getSchemas(page) {
    return page.$$eval('script[type="application/ld+json"]', els =>
      els.map(el => JSON.parse(el.textContent))
    );
  }

  function flatTypes(schemas) {
    return schemas.flatMap(s =>
      Array.isArray(s['@graph'])
        ? s['@graph'].map(n => n['@type']).flat()
        : [s['@type']].flat()
    );
  }

  test('Homepage has Organization JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const types = flatTypes(await getSchemas(page));
    expect(types).toContain('Organization');
  });

  test('Homepage has WebSite JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const types = flatTypes(await getSchemas(page));
    expect(types).toContain('WebSite');
  });

  test('Homepage has FAQPage JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const types = flatTypes(await getSchemas(page));
    expect(types).toContain('FAQPage');
  });

  test('NEM Methode has HowTo JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/nem-methode`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const types = flatTypes(await getSchemas(page));
    expect(types).toContain('HowTo');
  });

  test('Blog article has Article JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/inzichten/de-kracht-van-ondersteuning`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const schemas = await getSchemas(page);
    const article = schemas.find(s => s['@type'] === 'Article');
    expect(article).toBeTruthy();
    expect(article.headline).toBeTruthy();
  });

  test('Testimonial has Review JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/ervaringen/dexter`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const types = flatTypes(await getSchemas(page));
    expect(types.some(t => t === 'Review' || t === 'CreativeWork')).toBe(true);
  });

  test('No JSON-LD syntax errors on any page', async ({ page }) => {
    for (const path of STATIC_PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const raw = await page.$$eval('script[type="application/ld+json"]', els =>
        els.map(el => el.textContent)
      );
      for (const json of raw) {
        expect(() => JSON.parse(json), `Invalid JSON-LD on ${path}`).not.toThrow();
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 3 — Accessibility + Headings                                */
/* ------------------------------------------------------------------ */

test.describe('phase-3: accessibility and headings', () => {
  test('Back-to-top has aria-label', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const label = await page.$eval('.back-to-top', el => el.getAttribute('aria-label'));
    expect(label).toBeTruthy();
  });

  test('Mobile menu button has aria-label', async ({ page }) => {
    await page.setViewportSize({ width: 478, height: 800 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const btn = page.locator('.w-nav-button');
    await expect(btn).toHaveAttribute('aria-label', /.+/);
  });

  test('Each static page has exactly one H1', async ({ page }) => {
    for (const path of STATIC_PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const h1Count = await page.$$eval('h1', els => els.length);
      expect(h1Count, `${path} has ${h1Count} H1s (expected 1)`).toBe(1);
    }
  });

  test('No English H1s on Dutch pages', async ({ page }) => {
    const dutchPages = ['/inzichten', '/ervaringen', '/missie-nem-life', '/voorwaarden'];
    for (const path of dutchPages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const h1Text = await page.$eval('h1', el => el.textContent.trim());
      expect(h1Text, `${path} H1 is English: "${h1Text}"`).not.toMatch(/^(From insight|In a world|We break|Terms)/i);
    }
  });

  test('No images without alt attribute', async ({ page }) => {
    for (const path of STATIC_PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const noAlt = await page.$$eval('img:not([alt])', els => els.length);
      expect(noAlt, `${path} has ${noAlt} images without alt`).toBe(0);
    }
  });

  test('axe-core: no critical or serious a11y violations on homepage', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30_000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Critical a11y violations: ${critical.map(v => v.id).join(', ')}`).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 4 — Content + CMS + Operational                             */
/* ------------------------------------------------------------------ */

test.describe('phase-4: content and cms', () => {
  test('No # placeholder links in navigation', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const hashLinks = await page.$$eval('nav a[href="#"]', els => els.length);
    expect(hashLinks, 'Navigation still has # links').toBe(0);
  });

  test('Blog article has publication date', async ({ page }) => {
    await page.goto(`${BASE}/inzichten/de-kracht-van-ondersteuning`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const hasDate = await page.$eval('body', el => {
      const text = el.textContent;
      return /\d{1,2}[\s./-]\w+[\s./-]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(text);
    });
    expect(hasDate, 'No date visible on blog article').toBe(true);
  });

  test('OG image is set on homepage', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => '');
    expect(ogImage.length, 'No OG image on homepage').toBeGreaterThan(0);
  });

  test('Favicon is not default Webflow', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const favicon = await page.$eval('link[rel="shortcut icon"], link[rel="icon"]', el => el.href).catch(() => '');
    expect(favicon).not.toContain('website-files.com/img/favicon.ico');
  });

  test('Swiper CLS prevention CSS applied', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(500);
    const swiperExists = await page.$('.swiper');
    if (swiperExists) {
      const initialized = await page.$('.swiper.swiper-initialized');
      expect(initialized, 'Swiper should initialise').toBeTruthy();
    }
  });

  test('No console errors on key pages', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const keyPages = ['/', '/nem-methode', '/inzichten', '/ervaringen'];
    for (const path of keyPages) {
      errors.length = 0;
      await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 20_000 });
      await page.waitForTimeout(2000);
      const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
      expect(critical.length, `Console errors on ${path}: ${critical.join('; ')}`).toBe(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 5 — Growth + Launch                                         */
/* ------------------------------------------------------------------ */

test.describe('phase-5: growth and launch', () => {
  test('FAQ sections use H2 headings', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const faqHeadings = await page.$$eval('[class*="faq"] h2, [class*="faq"] h3', els =>
      els.map(el => el.tagName)
    );
    if (faqHeadings.length > 0) {
      const h3s = faqHeadings.filter(t => t === 'H3');
      expect(h3s.length, 'FAQ questions should be H2, not H3').toBe(0);
    }
  });

  test('Author byline on blog articles', async ({ page }) => {
    await page.goto(`${BASE}/inzichten/de-kracht-van-ondersteuning`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const bodyText = await page.$eval('body', el => el.textContent);
    expect(bodyText).toContain('Christel');
  });

  test('Canonical points to nemlife.com (post-launch)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => '');
    if (canonical) {
      expect(canonical).toMatch(/^https:\/\/(www\.)?nemlife\.com/);
    }
  });
});
