/**
 * Acceptance tests — nem-validation-round-1
 *
 * Alex's OPEN 1–6 validation items on the NEM Test quiz, one test per observable change.
 * Spec: projects/nem-life/.claude/specs/nem-validation-round-1.md
 *
 * Written before the build (TDD): these FAIL on staging until Stream A (component),
 * Stream B (Designer) and the paste + publish have shipped.
 *
 * Reaching the confirmation screen needs a submit, so that one test mocks the n8n webhook —
 * nothing is stored in the Data Table and MailerLite never hears about it.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

import {
  STAGING,
  TEST_PAGE_NL,
  QUIZ_TEST_TIMEOUT_MS,
  loadPage,
  questionHeading,
  answerQuestion,
  answerAllQuestions,
  answerByIndices,
  fillProfileScreen,
} from './helpers/nem-quiz.js';

dotenv.config({ path: '.env.test' });

const SLUG = 'nem-validation-round-1';
const VERIFY_PAGE = '/verificatie/bevestigd';
const BLOG_PAGE = '/inzichten';

const RELATIONSHIP_LABELS = [
  'Alleenstaand - zonder kinderen',
  'Alleenstaand - met kinderen',
  'Samenwonend - zonder kinderen',
  'Samenwonend - met kinderen',
  'Anders',
];
const PROFILE_INTRO = 'Een paar laatste vragen om je rapport op jou af te stemmen.';
const GDPR_NOTE =
  'Je gegevens worden alleen gebruikt om jouw rapport te personaliseren en worden nooit gedeeld met derden.';
const REPORT_DISCLAIMER =
  'Dit rapport is geen diagnose. Het is een spiegel op basis van jouw antwoorden - puur bedoeld voor inzicht en bewustwording.';
const CONSENT_ERROR = 'Bevestig je aanmelding voor NEM Matters';

const module = (page) => page.locator('[data-element="quiz-module"]');

const computed = (locator, prop) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

const px = (value) => parseFloat(String(value));

/* Same dual profile as nem-test-phase-b — all-"soms" scores flat and skips the report CTA. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];

/* Drive the quiz to the conclusion with a profile that is neither flat-low nor flat-high. */
async function reachConclusion(page) {
  await loadPage(page);
  await answerByIndices(page, DUAL_PROFILE);
  await fillProfileScreen(page, 'Vrouw');
  await expect(page.locator('[data-element="conclusion-text"]')).toBeVisible({
    timeout: 10_000,
  });
}

async function reachOptin(page) {
  await reachConclusion(page);
  await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();
  await expect(page.getByPlaceholder('Voornaam')).toBeVisible({ timeout: 10_000 });
}

test.beforeEach(() => {
  test.setTimeout(QUIZ_TEST_TIMEOUT_MS);
});

test.describe(SLUG, () => {
  test('screen 1: reassurance line is upright and at body size, still smaller than the question', async ({
    page,
  }) => {
    await loadPage(page);
    const line = module(page).getByText('Kies wat het meest op jou lijkt', {
      exact: false,
    });
    await expect(line).toBeVisible();
    expect(await computed(line, 'font-style')).toBe('normal');
    const lineSize = px(await computed(line, 'font-size'));
    const questionSize = px(await computed(questionHeading(page), 'font-size'));
    expect(lineSize).toBeGreaterThanOrEqual(15);
    expect(lineSize).toBeLessThan(questionSize);
  });

  test('screen 2: back arrow carries a "Terug" tooltip', async ({ page }) => {
    await loadPage(page);
    await answerQuestion(page, 'soms');
    const back = page.locator('[data-element="back-button"]');
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute('title', 'Terug');
    await expect(back).toHaveAttribute('aria-label', 'Terug');
  });

  test('screen 3: card is as wide as the question card', async ({ page }) => {
    await loadPage(page);
    const before = (await module(page).boundingBox()).width;
    await answerAllQuestions(page, 'soms');
    await expect(page.locator('[data-field="gender"]')).toBeVisible({ timeout: 10_000 });
    const after = (await module(page).boundingBox()).width;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
  });

  test('screen 3: intro line and GDPR note are present', async ({ page }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    await expect(module(page).getByText(PROFILE_INTRO)).toBeVisible({ timeout: 10_000 });
    await expect(module(page).getByText(GDPR_NOTE)).toBeVisible();
  });

  test('screen 3: relationship dropdown offers the five household options and nothing else', async ({
    page,
  }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    const select = page.locator('[data-field="relationship-status"]');
    await expect(select).toBeVisible({ timeout: 10_000 });
    const labels = await select
      .locator('option')
      .evaluateAll((opts) =>
        opts.map((o) => o.textContent.trim()).filter((_, i) => i > 0),
      );
    expect(labels).toEqual(RELATIONSHIP_LABELS);
  });

  test('screen 3: selected dropdown value renders in the same font as the module', async ({
    page,
  }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    const select = page.locator('[data-field="gender"]');
    await expect(select).toBeVisible({ timeout: 10_000 });
    await select.selectOption({ label: 'Man' });
    const selectFont = await computed(select, 'font-family');
    const moduleFont = await computed(module(page), 'font-family');
    expect(selectFont).toBe(moduleFont);
    expect(selectFont.toLowerCase()).toContain('lato');
  });

  test('screen 4: "Jouw uitkomst" is a heading in the same style as "Nog even over jou"', async ({
    page,
  }) => {
    await loadPage(page);
    await answerAllQuestions(page, 'soms');
    const profileTitle = page.getByRole('heading', { name: 'Nog even over jou' });
    await expect(profileTitle).toBeVisible({ timeout: 10_000 });
    const ref = {
      size: await computed(profileTitle, 'font-size'),
      family: await computed(profileTitle, 'font-family'),
      weight: await computed(profileTitle, 'font-weight'),
    };
    await fillProfileScreen(page, 'Vrouw');
    const title = page.getByRole('heading', { name: 'Jouw uitkomst' });
    await expect(title).toBeVisible({ timeout: 10_000 });
    expect(await computed(title, 'font-size')).toBe(ref.size);
    expect(await computed(title, 'font-family')).toBe(ref.family);
    expect(await computed(title, 'font-weight')).toBe(ref.weight);
    expect(await computed(title, 'text-transform')).toBe('none');
  });

  test('screen 4: bridge line uses the same font family and weight as the conclusion text', async ({
    page,
  }) => {
    await reachConclusion(page);
    const paragraph = page.locator('[data-element="conclusion-text"] p').first();
    const bridge = module(page).getByText('Wil je begrijpen waar dit vandaan komt', {
      exact: false,
    });
    await expect(bridge).toBeVisible();
    expect(await computed(bridge, 'font-family')).toBe(
      await computed(paragraph, 'font-family'),
    );
    expect(await computed(bridge, 'font-weight')).toBe(
      await computed(paragraph, 'font-weight'),
    );
  });

  test('screen 5: intro is body size, GDPR note present, "Geen spam" gone, report disclaimer shown', async ({
    page,
  }) => {
    await reachOptin(page);
    const intro = module(page).getByText('Vul hieronder je gegevens in', {
      exact: false,
    });
    expect(px(await computed(intro, 'font-size'))).toBeGreaterThanOrEqual(16);
    await expect(module(page).getByText(GDPR_NOTE)).toBeVisible();
    await expect(module(page).getByText(REPORT_DISCLAIMER)).toBeVisible();
    await expect(module(page).getByText('Geen spam', { exact: false })).toHaveCount(0);
  });

  test('screen 5: clicking the greyed button without consent shows the error and sends nothing', async ({
    page,
  }) => {
    const submissions = [];
    await page.route('**/webhook/nem-submit', async (route) => {
      const body = route.request().postDataJSON?.() ?? {};
      if (body.event !== 'completion') submissions.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"status":"ok"}',
      });
    });
    await reachOptin(page);
    await page.getByPlaceholder('Voornaam').fill('Test');
    await page.getByPlaceholder('E-mailadres').fill('will+nem-consent@teamzissou.io');
    const button = page.getByRole('button', { name: 'Ontvang mijn rapport' });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await button.click({ force: true });
    await expect(module(page).getByText(CONSENT_ERROR)).toBeVisible();
    expect(submissions).toHaveLength(0);
    await page.getByRole('checkbox').check();
    await expect(module(page).getByText(CONSENT_ERROR)).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  test('screen 6: title is a heading, correction link is muted, report disclaimer shown', async ({
    page,
  }) => {
    await page.route('**/webhook/nem-submit', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"status":"ok"}',
      }),
    );
    await reachOptin(page);
    await page.getByPlaceholder('Voornaam').fill('Test');
    await page.getByPlaceholder('E-mailadres').fill('will+nem-mock@teamzissou.io');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Ontvang mijn rapport' }).click();

    const title = page.getByRole('heading', { name: 'Nog één stap' });
    await expect(title).toBeVisible({ timeout: 10_000 });
    expect(await computed(title, 'text-transform')).toBe('none');

    const link = page.getByRole('button', { name: 'Vul het opnieuw in.' });
    const fallback = module(page).getByText('Verkeerd e-mailadres opgegeven?', {
      exact: false,
    });
    expect(await computed(link, 'font-weight')).toBe('400');
    expect(await computed(link, 'color')).toBe(await computed(fallback, 'color'));
    expect(await computed(link, 'text-decoration-line')).toContain('underline');

    await expect(module(page).getByText(REPORT_DISCLAIMER)).toBeVisible();
  });

  test('quiz page has no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    await loadPage(page);
    await answerQuestion(page, 'soms');
    expect(errors).toEqual([]);
  });

  test('quiz page background matches the blog list page', async ({ page }) => {
    await page.goto(`${STAGING}${BLOG_PAGE}`);
    const blogBg = await computed(
      page.locator('.section-bg_white').first(),
      'background-color',
    );
    await loadPage(page);
    const quizBg = await computed(
      page.locator('.section_test').first(),
      'background-color',
    );
    expect(quizBg).toBe(blogBg);
  });

  test('/verificatie/bevestigd: copy sits in a card and the hero is repositioned', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`${STAGING}${VERIFY_PAGE}`);
    const card = page.locator('[data-element="verify-card"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 1 })).toHaveText(
      'Je e-mailadres is bevestigd',
    );
    await expect(card.locator('p').first()).toBeVisible();
    expect(px(await computed(card, 'border-radius'))).toBeGreaterThan(0);
    expect(px(await computed(card, 'max-width'))).toBeLessThanOrEqual(900);
    const hero = page.locator('img.is--blog-hero').first();
    expect(await computed(hero, 'object-position')).not.toBe('50% 50%');
    expect(errors).toEqual([]);
  });
});

void TEST_PAGE_NL;
