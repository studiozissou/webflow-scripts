/**
 * Acceptance tests for the November 2026 Coconut pricing page copy; they fail until the build lands.
 * Spec: projects/coconut/.claude/specs/pricing-copy-nov-2026.md
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.STAGING_URL || 'https://getcoconut.webflow.io';
const PAGE_PATH = process.env.PRICING_PATH || '/pricing';
const CONTROL_PATH = '/mtd-software/landlords';

const H1 = 'Coconut Pricing and Plans';
const META_TITLE = 'Coconut Pricing & Plans | From £49.99 a Year | Coconut';
const META_DESC =
  'Compare Coconut pricing for MTD bridging, bookkeeping, MTD filing and Self Assessment. See what each plan costs and start your free 14-day trial.';

const H2S = [
  'Compare Coconut pricing and plans',
  'How much does Coconut cost?',
  'Can you get Coconut for free?',
  'Why choose Coconut?',
  'How to get started with Coconut',
  'FAQs about Coconut pricing',
  'Find the right Coconut plan for you',
];

const H3S = [
  'Try Coconut free for 14 days',
  'Get up to two years free with Revolut Pro',
  'Get two years free with Zempler Bank',
  'Your business finances in one place',
  'Know what to put aside for tax',
  'Bank transactions, without the manual entry',
  'Professional invoices on the go',
];

const FAQS = [
  'Is there a monthly Coconut subscription?',
  'How much does MTD software cost with Coconut?',
  'Can I try Coconut for free?',
  'What happens when my Coconut free trial ends?',
  'Can I change or cancel my Coconut subscription?',
  'Do Coconut prices include VAT?',
  'Do landlords pay extra to use Coconut?',
  'How do the Revolut and Zempler free offers work?',
  'Can I get a refund if I cancel my Coconut subscription?',
];

const OLD_COPY = [
  'Stay on top of Tax without the hassle.',
  'Want Coconut for free for 2 years?',
  'Common questions',
  'Are there different Coconut plans for MTD users',
  'Business finance all in on place',
  'Get started today',
  '!Coconut',
];

const PRICES = ['£49.99', '£99.99', '£12.99', '£129.99', 'Supports self-employment and UK property income'];

const APP = 'https://web.getcoconut.com/';
const CANCEL = 'help.getcoconut.com/en/articles/6550863-cancel-my-subscription';

const LINKS = [
  ['Start your 14-day free trial', (href) => href === APP],
  ['Start your free trial', (href) => href === APP],
  ['Sign up to Coconut', (href) => href === APP],
  ['Get started with Coconut', (href) => href === APP],
  ['Try free, no card needed', (href) => href.includes('web.getcoconut.com/bridging/signup')],
  ['Read the Revolut Pro offer terms', (href) => href.includes('/legal/partnership-with-revolut-pro')],
  ['Revolut Pro terms', (href) => href.includes('/legal/partnership-with-revolut-pro')],
  ['Learn more about getting Coconut free with Zempler', (href) => href.includes('/free-making-tax-digital-software')],
  ['Zempler terms', (href) => href.includes('/legal/partnership-with-zempler-bank')],
  ["Coconut's cancellation guidance", (href) => href.includes(CANCEL)],
  ['cancellation process', (href) => href.includes(CANCEL)],
  ['read more about Coconut for landlords', (href) => href.includes('/mtd-software/landlords')],
  ['full terms and conditions', (href) => href.includes('/legal/terms')],
];

const SECTION_COPY = [
  'Yes. You can try Coconut free for 14 days, with no card details required.',
  "You can't submit MTD updates or a Self Assessment tax return to HMRC during the trial.",
  'If you\'re new to both Coconut and Revolut, you could get 24 months of Coconut free',
  'New Zempler customers may qualify for 24 months of Coconut free',
  'Getting started is straightforward:',
  'Try Coconut free for 14 days - no card details required.',
];

const RETIRED_PLANS = ['Essentials', '+MTD', '+Self Assessment', 'Full'];

const FAQ_TITLE = process.env.FAQ_TITLE || '._25-collapse-title';
const FAQ_ANSWER = process.env.FAQ_ANSWER || '._25-collapse-text-content';
const THIRD_PARTY_NOISE = /OptinMonster|omappapi\.com|intercom|facebook|connect\.facebook\.net|trustpilot/i;

const texts = (page, selector) =>
  page.locator(selector).evaluateAll((nodes) => nodes.map((n) => n.textContent.replace(/\s+/g, ' ').trim()));

const jsonLd = async (page) => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((block) => JSON.parse(block)).flatMap((data) => data['@graph'] || (Array.isArray(data) ? data : [data]));
};

const squash = (text) => text.replace(/\s+/g, ' ').trim();

const faqPages = async (page) => {
  const fromJson = (await jsonLd(page))
    .filter((item) => item['@type'] === 'FAQPage')
    .map((faq) => faq.mainEntity.map((q) => ({ name: squash(q.name), text: squash(q.acceptedAnswer.text) })));
  const fromMicrodata = await page.locator('[itemtype*="schema.org/FAQPage"]').evaluateAll((roots) =>
    roots.map((root) =>
      [...root.querySelectorAll('[itemprop="mainEntity"]')].map((q) => ({
        name: q.querySelector('[itemprop="name"]')?.textContent.replace(/\s+/g, ' ').trim(),
        text: q.querySelector('[itemprop="acceptedAnswer"] [itemprop="text"]')?.textContent.replace(/\s+/g, ' ').trim(),
      })),
    ),
  );
  return [...fromJson, ...fromMicrodata];
};

test.describe('coconut-pricing-copy-nov-2026', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'load', timeout: 60000 });
  });

  test('has one H1 with the approved text', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(H1);
  });

  test('meta title and description match the doc', async ({ page }) => {
    await expect(page).toHaveTitle(META_TITLE);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', META_DESC);
  });

  test('shows every approved H2 in order', async ({ page }) => {
    const found = (await texts(page, 'h2')).filter((text) => H2S.includes(text));
    expect(found).toEqual(H2S);
  });

  test('shows the approved H3s', async ({ page }) => {
    const h3s = await texts(page, 'h3');
    for (const text of H3S) expect(h3s).toContain(text);
  });

  test('FAQ shows the nine approved questions in order', async ({ page }) => {
    expect(await texts(page, FAQ_TITLE)).toEqual(FAQS);
  });

  test('pricing table keeps the approved prices', async ({ page }) => {
    const body = await page.locator('body').innerText();
    for (const text of PRICES) expect(body).toContain(text);
  });

  test('no old copy remains', async ({ page }) => {
    const body = await page.locator('body').innerText();
    for (const text of OLD_COPY) expect(body).not.toContain(text);
  });

  test('links match the approved targets', async ({ page }) => {
    for (const [anchor, matches] of LINKS) {
      const hrefs = await page.locator('a', { hasText: anchor }).evaluateAll((nodes) => nodes.map((n) => n.href));
      expect(hrefs.some(matches), `${anchor}: ${hrefs.join(', ')}`).toBe(true);
    }
  });

  test('free-offer and get-started copy is present', async ({ page }) => {
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    for (const text of SECTION_COPY) expect(body).toContain(text);
  });

  test('FAQPage schema matches the visible FAQ', async ({ page }) => {
    const faqs = await faqPages(page);
    expect(faqs).toHaveLength(1);
    expect(faqs[0].map((q) => q.name)).toEqual(await texts(page, FAQ_TITLE));
    expect(faqs[0].map((q) => q.name)).toEqual(FAQS);
  });

  test('FAQPage answers match the visible answers', async ({ page }) => {
    const [faq] = await faqPages(page);
    const visible = await texts(page, FAQ_ANSWER);
    expect(faq.map((q) => q.text)).toEqual(visible.map(squash));
  });

  test('social descriptions match the meta description', async ({ page }) => {
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', META_DESC);
    await expect(page.locator('meta[name="twitter:description"], meta[property="twitter:description"]').first()).toHaveAttribute('content', META_DESC);
  });

  test('WebPage schema lists only the three visible plans', async ({ page }) => {
    const raw = JSON.stringify((await jsonLd(page)).filter((item) => item['@type'] !== 'FAQPage' && item['@type'] !== 'Organization'));
    for (const name of RETIRED_PLANS) expect(raw).not.toContain(`"${name}`);
    for (const price of ['49.99', '99.99', '12.99', '129.99']) expect(raw).toContain(price);
    expect(raw).toMatch(/"lowPrice":"?49\.99"?/);
    expect(raw).toMatch(/"highPrice":"?129\.99"?/);
  });

  test('first FAQ opens on click', async ({ page }) => {
    const question = page.locator(FAQ_TITLE, { hasText: FAQS[0] });
    await question.scrollIntoViewIfNeeded();
    await question.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('MTD Filing plan is listed at £12.99 per month').first()).toBeVisible();
  });

  test('no page-level horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
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

  test('Landlords page still shows its own H1', async ({ page }) => {
    await page.goto(`${BASE_URL}${CONTROL_PATH}`, { waitUntil: 'load', timeout: 60000 });
    await expect(page.locator('h1')).toHaveText('Making Tax Digital for Landlords');
  });
});
