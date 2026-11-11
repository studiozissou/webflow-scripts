/**
 * Acceptance tests for the Client First V3 rebuild of Coconut's pricing page; they fail until the build lands.
 * Spec: projects/coconut/.claude/specs/pricing-cf-v3.md
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.STAGING_URL || 'https://getcoconut.webflow.io';
const PAGE_PATH = process.env.PRICING_CF_PATH || '/pricing-cf';
const LIVE_URL = 'https://www.getcoconut.com/pricing';
const ELEMENT_TARGET = Number(process.env.ELEMENT_TARGET || 557);
const LEGACY_LAYOUT = /^(padding-global|padding-section-.+|spacer-.+)$/;
const LEGACY_PREFIX = /^_2[56]-/;
const ALLOWED_LEGACY = (process.env.ALLOWED_LEGACY || '').split(',').filter(Boolean);
const THIRD_PARTY_NOISE = /OptinMonster|omappapi\.com|intercom|facebook|connect\.facebook\.net|trustpilot|hotjar|tiktok/i;

test.describe('coconut-pricing-cf-v3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'load', timeout: 60000 });
  });

  test('pricing-cf is noindex and outside the sitemap', async ({ page, request }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const sitemap = await (await request.get(`${BASE_URL}/sitemap.xml`)).text();
    expect(sitemap).not.toContain(PAGE_PATH);
  });

  test('page shell is page-wrapper then main-wrapper', async ({ page }) => {
    await expect(page.locator('body > .page-wrapper')).toHaveCount(1);
    await expect(page.locator('.page-wrapper > main.main-wrapper')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('every section root is section_ with a container first child', async ({ page }) => {
    const bad = await page.locator('main.main-wrapper > *').evaluateAll((nodes) =>
      nodes
        .filter((n) => !['SCRIPT', 'STYLE'].includes(n.tagName) && !n.matches('.w-embed, [class*="custom-code"]'))
        .filter((n) => {
          const first = n.firstElementChild;
          return !(n.tagName === 'SECTION' && /^section_/.test(n.classList[0] || '') && first && /^container-/.test(first.classList[0] || ''));
        })
        .map((n) => `${n.tagName}.${[...n.classList].join('.')}`),
    );
    expect(bad).toEqual([]);
  });

  test('no legacy layout classes inside main', async ({ page }) => {
    const classes = await page.locator('main.main-wrapper *').evaluateAll((nodes) => [...new Set(nodes.flatMap((n) => [...n.classList]))]);
    const legacy = classes.filter((c) => (LEGACY_LAYOUT.test(c) || LEGACY_PREFIX.test(c)) && !ALLOWED_LEGACY.includes(c));
    expect(legacy).toEqual([]);
  });

  test('every heading carries a heading-style class', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    const bare = await page.locator('main h1, main h2, main h3, main h4, main h5, main h6').evaluateAll((nodes) =>
      nodes.filter((n) => ![...n.classList].some((c) => c.startsWith('heading-style-'))).map((n) => n.textContent.trim().slice(0, 40)),
    );
    expect(bare).toEqual([]);
  });

  test('FAQ uses native details in doc order', async ({ page }) => {
    const items = page.locator('section.section_faq details.faq_item');
    await expect(items).toHaveCount(9);
    await expect(items.first().locator('summary.faq_question')).toHaveText('Is there a monthly Coconut subscription?');
    await expect(items.last().locator('summary.faq_question')).toHaveText('Can I get a refund if I cancel my Coconut subscription?');
  });

  test('FAQPage microdata matches the visible FAQ', async ({ page }) => {
    const root = page.locator('[itemtype*="schema.org/FAQPage"]');
    await expect(root).toHaveCount(1);
    const pairs = await root.locator('[itemprop="mainEntity"]').evaluateAll((qs) =>
      qs.map((q) => [q.querySelector('[itemprop="name"]')?.textContent.trim(), q.querySelector('summary')?.textContent.trim()]),
    );
    expect(pairs).toHaveLength(9);
    for (const [name, visible] of pairs) expect(name).toBe(visible);
  });

  test('no FAQPage JSON-LD on the page', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.some((b) => b.includes('"FAQPage"'))).toBe(false);
  });

  test('price table has three cards with equal rows at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const cards = page.locator('.section_price-table .price-table_card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('[data-mh]')).toHaveCount(0);
    const tops = await cards.evaluateAll((nodes) =>
      nodes.map((card) => {
        const cta = card.querySelector('a[href*="web.getcoconut.com"]');
        return Math.round(cta.getBoundingClientRect().top);
      }),
    );
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
  });

  test('See all features opens by keyboard', async ({ page }) => {
    const summary = page.locator('.section_price-table details summary').first();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.section_price-table details').first()).toHaveAttribute('open', /.*/);
  });

  test('hamburger menu opens and closes at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    const toggle = page.locator(process.env.MENU_TOGGLE || 'nav [aria-label*="menu" i], nav .w-nav-button').first();
    const menu = page.locator(process.env.MENU_PANEL || 'nav .w-nav-menu, nav [data-nav-menu]').first();
    await toggle.click();
    await page.waitForTimeout(800);
    await expect(menu).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(800);
    await expect(menu).toBeHidden();
  });

  test('trial CTAs keep UTM parameters', async ({ page }) => {
    await page.goto(`${BASE_URL}${PAGE_PATH}?utm_source=acceptance`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    const href = await page.locator('a', { hasText: 'Start your 14-day free trial' }).first().getAttribute('href');
    expect(href).toContain('utm_source=acceptance');
  });

  test('element count is within target', async ({ page }) => {
    const count = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter((n) => !['SCRIPT', 'STYLE'].includes(n.tagName)).length);
    expect(count).toBeLessThanOrEqual(ELEMENT_TARGET);
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      const source = `${message.text()} ${message.location().url}`;
      if (message.type() === 'error' && !THIRD_PARTY_NOISE.test(source)) errors.push(message.text());
    });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('live pricing page still renders its H1', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'load', timeout: 60000 });
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
