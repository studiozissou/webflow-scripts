/**
 * Acceptance tests for the Coconut MTD for Freelancers page; they fail until the build lands.
 * Spec: projects/coconut/.claude/specs/mtd-freelancers-page.md
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.STAGING_URL || 'https://getcoconut.webflow.io';
const PAGE_PATH = process.env.FREELANCERS_PATH || '/mtd-software/freelancers';
const CONTROL_PATH = '/mtd-software/landlords';

const H1 = 'Making Tax Digital for Freelancers';
const META_TITLE = 'Making Tax Digital for Freelancers | Coconut';
const META_DESC =
  'Make MTD for Income Tax easier with Coconut. Track freelance income, organise expenses and send updates to HMRC. Start your free 14-day trial.';

const H2S = [
  'Making Tax Digital for freelancers: the essentials',
  'Why freelancers choose Coconut for Making Tax Digital',
  'Who needs to use MTD software for freelancing?',
  'How does MTD work if you have multiple clients or irregular income?',
  'How Coconut works',
  'Keep your freelance income and expenses organised in one place',
  'Quarterly MTD updates made simpler',
  'What happens at the end of the tax year?',
  'Can freelancers get Coconut free?',
  'Choosing the best MTD software for freelancers',
  'Simple pricing for freelancers',
  'HMRC-recognised software for MTD for Income Tax',
  'FAQs',
  'Get ready for Making Tax Digital with Coconut',
];

const BENEFITS = [
  'Track payments from different clients',
  'Keep on top of changing income',
  'Sort expenses as you go',
  'Send invoices and store receipts',
  'Know what you might owe in tax',
  'Submit MTD updates to HMRC',
  'Get support from people who understand tax',
];

const FAQS = [
  'Do all freelancers have to use Making Tax Digital?',
  'What if my freelance income changes every month?',
  'Do freelancers need an accountant for MTD?',
  'Can I use Coconut if I freelance and have a part-time job?',
  'What MTD software is best for creative freelancers?',
  'Can I use spreadsheets for MTD?',
];

const LANDLORD_RESIDUE = [
  'Making Tax Digital for Landlords',
  'Why landlords choose Coconut',
  'Track rental income',
  'Manage multiple properties',
  'Keep your property income organised',
  'Can landlords get Coconut free?',
  'Best MTD software for landlords',
  'Simple pricing for landlords',
  'jointly owned property',
  'video guide',
];

const LINKS = [
  ["HMRC's qualifying income guidance", 'work-out-your-qualifying-income-for-making-tax-digital-for-income-tax'],
  ['accounting software for sole traders and self-employed', '/sole-trader-and-self-employed-accounting-software'],
  ['Explore Coconut\'s free MTD offers', '/free-making-tax-digital-software'],
  ['bridging software', '/mtd-software/bridging-software'],
  ['See all features', '/features'],
  ['Choose your plan and get started', 'web.getcoconut.com/signup'],
];

const GOV_LINK_FRAGMENTS = [
  'work-out-your-qualifying-income-for-making-tax-digital-for-income-tax',
  'find-software-that-works-with-making-tax-digital-for-income-tax',
];

const headings = (page, level) =>
  page.locator(level).evaluateAll((nodes) => nodes.map((n) => n.textContent.replace(/\s+/g, ' ').trim()));

test.describe('coconut-mtd-freelancers-page', () => {
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
    const found = (await headings(page, 'h2')).filter((text) => H2S.includes(text));
    expect(found).toEqual(H2S);
  });

  test('shows all benefit card and FAQ headings', async ({ page }) => {
    const h3s = await headings(page, 'h3');
    for (const text of [...BENEFITS, ...FAQS]) expect(h3s).toContain(text);
  });

  test('no Landlords copy remains', async ({ page }) => {
    const body = await page.locator('body').innerText();
    for (const text of LANDLORD_RESIDUE) expect(body).not.toContain(text);
    await expect(page.locator('img[alt*="landlord" i]')).toHaveCount(0);
  });

  test('rollout and deadline tables show approved values', async ({ page }) => {
    const body = await page.locator('body').innerText();
    for (const text of ['Over £50,000', 'Over £30,000', 'Over £20,000', '6 April – 5 July', '7 August', '7 November', '7 February', '7 May']) {
      expect(body).toContain(text);
    }
  });

  test('links match the approved targets', async ({ page }) => {
    for (const [anchor, fragment] of LINKS) {
      const hrefs = await page.locator('a', { hasText: anchor }).evaluateAll((nodes) => nodes.map((n) => n.href));
      expect(hrefs.some((href) => href.includes(fragment)), anchor).toBe(true);
    }
  });

  test('GOV.UK links open in a new tab', async ({ page }) => {
    for (const fragment of GOV_LINK_FRAGMENTS) {
      await expect(page.locator(`a[href*="${fragment}"]`).first()).toHaveAttribute('target', '_blank');
    }
  });

  test('JSON-LD has a breadcrumb and six FAQ answers', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const items = blocks
      .map((block) => JSON.parse(block))
      .flatMap((data) => data['@graph'] || (Array.isArray(data) ? data : [data]));
    const faq = items.find((item) => item['@type'] === 'FAQPage');
    const crumb = items.find((item) => item['@type'] === 'BreadcrumbList');
    expect(faq.mainEntity).toHaveLength(FAQS.length);
    expect(crumb.itemListElement.at(-1).item).toContain(PAGE_PATH);
  });

  test('first FAQ opens on click', async ({ page }) => {
    const question = page.locator('h3', { hasText: FAQS[0] });
    await question.scrollIntoViewIfNeeded();
    await question.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('No. MTD for Income Tax applies when you work as a sole trader').first()).toBeVisible();
  });

  test('no page-level horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('Landlords page still shows its own H1', async ({ page }) => {
    await page.goto(`${BASE_URL}${CONTROL_PATH}`, { waitUntil: 'load', timeout: 60000 });
    await expect(page.locator('h1')).toHaveText('Making Tax Digital for Landlords');
  });
});
