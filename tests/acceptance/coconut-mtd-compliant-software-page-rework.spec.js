/**
 * Acceptance tests — Coconut MTD Compliant Software service page rework
 *
 * Spec: projects/coconut/.claude/specs/mtd-compliant-software-page-rework.md
 * Target: /features/mtd-compliant-software (Features CMS template item)
 *
 * These tests are written against the SPEC and will fail until the build lands.
 *
 * Run: npx playwright test tests/acceptance/coconut-mtd-compliant-software-page-rework.spec.js
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.STAGING_URL || 'https://getcoconut.webflow.io';
const PAGE_PATH = '/features/mtd-compliant-software';
const CONTROL_PATH = '/features/scan-receipts'; // regression control — must stay unchanged
const SLUG = 'coconut-mtd-compliant-software-page-rework';

const NEW_H1 = 'MTD Compliant Software: how Coconut handles it';
const OLD_H1 = 'Making Tax Digital for Income Tax made simple';

const NEW_H2S = [
  'What does it actually mean to be MTD compliant?',
  'Who needs MTD compliant software, and when?',
  'How Coconut meets each MTD compliance requirement',
  'What to look for in MTD software',
  'Frequently asked questions',
  'Get ready for Making Tax Digital with Coconut',
];

const FEATURE_HEADINGS = [
  'HMRC-recognised for MTD for Income Tax',
  'Digital recordkeeping for MTD',
  'Multiple income streams in one account',
  'Quarterly updates made simple',
  'Digital end of year MTD tax return',
  'Access anywhere, on any device',
  'Reports to stay in control',
  'Secure and HMRC recognised',
];

const FAQ_QUESTIONS = [
  'What makes software officially MTD compliant?',
  'Does Coconut cover landlords with multiple properties?',
  'How do quarterly MTD updates work in practice?',
  'What happens if my MTD submission is rejected by HMRC?',
  'Do I still need an accountant if I use MTD software?',
  'How does Coconut handle CIS subcontractors under MTD?',
  'Does MTD mean I have to file four tax returns a year?',
  'When do I need MTD software?',
  'How does Coconut handle multiple income streams?',
  'Is Coconut HMRC-recognised, and is it secure?',
];

const META_TITLE = 'MTD Compliant Software | Making Tax Digital | Coconut';
const META_DESC =
  'Learn what MTD compliant software means, who needs it, and how Coconut helps you keep digital records and submit updates. Start your free trial today.';

// ── Helpers ───────────────────────────────────────────────────

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', {
    timeout: 20_000,
  });
  await page.waitForTimeout(1500); // Webflow IX2 settle
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Brand-mark tolerant matcher: the site may render "!Coconut" where the deck says "Coconut" (spec Q1). */
function brandTolerant(str) {
  const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/Coconut/g, '!?Coconut'));
}

// ── Hero ──────────────────────────────────────────────────────

test.describe(`${SLUG} — Hero`, () => {
  test.beforeEach(async ({ page }) => await loadPage(page));

  test('has exactly one h1 with the new copy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(brandTolerant(NEW_H1));
  });

  test('old h1 copy is gone', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText(OLD_H1);
  });

  test('eyebrow trust strip is present', async ({ page }) => {
    await expect(page.locator('body')).toContainText(
      'HMRC-recognised · Built for sole traders, landlords & CIS'
    );
  });

  test('all four trust badges render', async ({ page }) => {
    for (const badge of [
      'No card details required',
      'FCA authorised',
      'Bank level security',
      'HMRC recognised for MTD',
    ]) {
      await expect(page.locator('body')).toContainText(badge);
    }
  });

  test('hero has a secondary text link to /mtd-software', async ({ page }) => {
    const link = page
      .locator('a[href*="/mtd-software"]')
      .filter({ hasText: 'See how Coconut handles MTD for your situation' })
      .first();
    await expect(link).toBeVisible();
  });
});

// ── New long-form sections ────────────────────────────────────

test.describe(`${SLUG} — New sections`, () => {
  test.beforeEach(async ({ page }) => await loadPage(page));

  for (const heading of NEW_H2S) {
    test(`renders H2: "${heading}"`, async ({ page }) => {
      await expect(
        page.locator('h2').filter({ hasText: brandTolerant(heading) })
      ).toHaveCount(1);
    });
  }

  test('feature blocks render as h3, not h2', async ({ page }) => {
    for (const heading of FEATURE_HEADINGS) {
      await expect(
        page.locator('h3').filter({ hasText: brandTolerant(heading) }).first()
      ).toBeVisible();
    }
  });

  test('persona cards are hidden on this page', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('MTD software for:');
  });
});

// ── Tables ────────────────────────────────────────────────────

test.describe(`${SLUG} — Tables`, () => {
  test.beforeEach(async ({ page }) => await loadPage(page));

  test('exactly two quarterly-table components render', async ({ page }) => {
    await expect(page.locator('table.quarterly-table')).toHaveCount(2);
  });

  test('deadline table has four rows with correct values', async ({ page }) => {
    const table = page.locator('table.quarterly-table').first();
    await expect(table.locator('tbody tr')).toHaveCount(4);
    for (const [period, deadline] of [
      ['6 April to 5 July', '7 August'],
      ['6 July to 5 October', '7 November'],
      ['6 October to 5 January', '7 February'],
      ['6 January to 5 April', '7 May'],
    ]) {
      const row = table.locator('tbody tr').filter({ hasText: period });
      await expect(row).toContainText(deadline);
    }
  });

  test('threshold table has three rows with correct values', async ({ page }) => {
    const table = page.locator('table.quarterly-table').nth(1);
    await expect(table.locator('tbody tr')).toHaveCount(3);
    for (const [date, income] of [
      ['From 6 April 2026', '£50,000'],
      ['From 6 April 2027', '£30,000'],
      ['From 6 April 2028', '£20,000'],
    ]) {
      const row = table.locator('tbody tr').filter({ hasText: date });
      await expect(row).toContainText(income);
    }
  });

  test('tables do not cause horizontal page overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(600);
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1
    );
    expect(overflows).toBe(false);
  });
});

// ── FAQ ───────────────────────────────────────────────────────

test.describe(`${SLUG} — FAQ`, () => {
  test.beforeEach(async ({ page }) => await loadPage(page));

  test('has ten FAQ items', async ({ page }) => {
    await expect(page.locator('.\\_25-collapse-item')).toHaveCount(10);
  });

  test('all ten new questions are present', async ({ page }) => {
    for (const q of FAQ_QUESTIONS) {
      await expect(page.locator('body')).toContainText(brandTolerant(q));
    }
  });

  test('FAQ questions render as h3', async ({ page }) => {
    for (const q of FAQ_QUESTIONS) {
      await expect(
        page.locator('h3').filter({ hasText: brandTolerant(q) }).first()
      ).toBeVisible();
    }
  });

  test('dropped FAQ content is gone', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('How experienced is');
    await expect(page.locator('body')).not.toContainText(
      'Does Coconut connect directly to my bank account'
    );
  });

  test('each FAQ item expands on click (IX2 survives the h3 swap)', async ({
    page,
  }) => {
    const triggers = page.locator('.\\_25-collapse-trigger');
    const count = await triggers.count();
    expect(count).toBe(10);
    for (let i = 0; i < count; i++) {
      const item = page.locator('.\\_25-collapse-item').nth(i);
      await triggers.nth(i).click();
      await page.waitForTimeout(400);
      await expect(item.locator('.\\_25-collapse-text-content')).toBeVisible();
    }
  });
});

// ── Links ─────────────────────────────────────────────────────

test.describe(`${SLUG} — Links`, () => {
  test.beforeEach(async ({ page }) => await loadPage(page));

  test('links to the landlords page', async ({ page }) => {
    await expect(
      page.locator('a[href*="/mtd-software/landlords"]').first()
    ).toBeVisible();
  });

  test('has at least three accountant links', async ({ page }) => {
    const count = await page
      .locator('a[href*="/features/work-with-your-accountant"]')
      .count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('has at least three /mtd-software CTAs', async ({ page }) => {
    const count = await page
      .locator('a')
      .filter({ hasText: 'See how Coconut handles MTD for your situation' })
      .count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('HMRC software list link opens in a new tab', async ({ page }) => {
    const link = page
      .locator('a[href*="find-making-tax-digital-income-tax-software"]')
      .filter({ hasText: 'Check Coconut on the official HMRC software list' })
      .first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('closing section has trial CTA and subtext', async ({ page }) => {
    await expect(page.locator('body')).toContainText(
      'Start your 14-day free trial today'
    );
    await expect(page.locator('body')).toContainText(
      'No card details required.'
    );
  });
});

// ── Meta ──────────────────────────────────────────────────────

test.describe(`${SLUG} — Meta`, () => {
  test('meta title matches spec with no duplicated suffix', async ({ page }) => {
    await loadPage(page);
    const title = await page.title();
    expect(title).toBe(META_TITLE);
    expect(title.match(/\| Coconut/g)?.length).toBe(1);
  });

  test('meta description matches spec', async ({ page }) => {
    await loadPage(page);
    const desc = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(desc).toBe(META_DESC);
  });
});

// ── Console health ────────────────────────────────────────────

test.describe(`${SLUG} — Console`, () => {
  test('no page errors on load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    expect(errors).toEqual([]);
  });

  test('no page errors after opening every FAQ', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    const triggers = page.locator('.\\_25-collapse-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i++) {
      await triggers.nth(i).click();
      await page.waitForTimeout(250);
    }
    expect(errors).toEqual([]);
  });
});

// ── Regression: the other feature pages must be untouched ─────

test.describe(`${SLUG} — Regression (control page)`, () => {
  test('scan-receipts still shows the persona cards', async ({ page }) => {
    await loadPage(page, CONTROL_PATH);
    await expect(page.locator('body')).toContainText('MTD software for:');
  });

  test('scan-receipts renders no empty long-form section', async ({ page }) => {
    await loadPage(page, CONTROL_PATH);
    await expect(page.locator('table.quarterly-table')).toHaveCount(0);
    for (const heading of NEW_H2S) {
      await expect(page.locator('body')).not.toContainText(heading);
    }
  });

  test('scan-receipts has a single h1 and no console errors', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await loadPage(page, CONTROL_PATH);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});
