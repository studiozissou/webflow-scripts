/**
 * Acceptance tests — nem-report-json-and-error-visibility
 *
 * Covers the two client-side halves of the spec:
 *   - every completed test fires an anonymous beacon once the questions are answered
 *   - the report intro line is selected client-side, on key alone (not gender)
 *
 * The JSON contract and the parse-failure alerting live in n8n and are covered by
 * tests/nem/nem-report-parse.test.js instead — Playwright cannot see inside a workflow.
 *
 * ⚠️ These fail until the feature is built. That is intended: written from the spec first.
 *
 * Spec: projects/nem-life/.claude/specs/nem-report-json-and-error-visibility.md
 * Tier 1 (Playwright, staging).
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const SLUG = 'nem-report-json-and-error-visibility';
const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const TEST_PAGE_NL = '/zelftesten/waarom-reageer-ik-zo';

const TOTAL_QUESTIONS = 20;
const SUBMIT_WEBHOOK = /\/webhook\/nem-submit/;

// ── Helpers ───────────────────────────────────────────────────

async function loadPage(page, path = TEST_PAGE_NL, query = '') {
  await page.goto(`${STAGING}${path}${query}`);
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
  await page.waitForTimeout(2000);
}

async function answerQuestion(page, label) {
  await page.getByRole('button', { name: label }).click();
  await page.waitForTimeout(600);
}

/** Every uniform answer is a flat outcome under v2: all "soms" → flat-high. */
async function answerUniformly(page, label) {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) await answerQuestion(page, label);
}

/** An uneven profile that reaches the report path: false-hope leading, false-power following. */
const DUAL_PROFILE = [4, 1, 2, 4, 4, 4, 0, 0, 4, 0, 4, 4, 0, 3, 0, 2, 0, 0, 0, 0];
const LABELS_NL = ['nooit', 'zelden', 'soms', 'regelmatig', 'heel vaak'];

async function answerReportProfile(page) {
  for (let i = 0; i < TOTAL_QUESTIONS; i++) await answerQuestion(page, LABELS_NL[DUAL_PROFILE[i]]);
}

async function fillProfileScreen(page, genderLabel = 'Vrouw') {
  await page.waitForTimeout(500);
  await page.locator('[data-field="gender"]').selectOption({ label: genderLabel });
  await page.locator('[data-field="age-category"]').selectOption({ index: 1 });
  await page.locator('[data-field="relationship-status"]').selectOption({ index: 1 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /ga verder|continue/i }).click();
  await page.waitForTimeout(600);
}

/** Capture the submit webhook payload without letting it reach the backend. */
async function captureSubmit(page) {
  const captured = [];
  await page.route(SUBMIT_WEBHOOK, async (route) => {
    try {
      captured.push(JSON.parse(route.request().postData() || '{}'));
    } catch {
      captured.push({ __unparseable: route.request().postData() });
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
  });
  return captured;
}

// ── A: Every completion logs anonymously ──────────────────────

test.describe(`${SLUG} — A: Anonymous completion logging`, () => {
  test('the beacon fires on question 20, before the profile screen', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await page.waitForTimeout(2000);

    /* Deliberately no fillProfileScreen: the whole point is that it fires before anyone
       can drop out, so waiting for the profile screen would hide a regression. */
    expect(captured.length).toBe(1);
    expect(captured[0].event).toBe('completion');
  });

  test('the completion payload carries the scores, outcome and key', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await page.waitForTimeout(2000);

    const payload = captured[0];
    expect(payload.outcome).toBe('flat-high');
    expect(payload.conclusionKey).toBe('flat-high');
    expect(payload.totalScore).toBe(40);
    for (const mechanism of ['selfRejection', 'emotionalNumbing', 'falsePower', 'fear', 'falseHope']) {
      expect(payload.scores[mechanism]).toBe(8);
    }
  });

  test('the completion payload carries nothing personal', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await page.waitForTimeout(2000);

    const payload = captured[0];
    expect(payload.firstName).toBeFalsy();
    expect(payload.email).toBeFalsy();
    expect(payload.nemMattersConsent).toBeFalsy();
  });

  test('no conclusionId yet — gender is not known at question 20', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await page.waitForTimeout(2000);

    expect(captured[0].conclusionId).toBeFalsy();
    expect(captured[0].gender).toBeFalsy();
  });

  test('a non-flat outcome logs too — this is not a flat-only beacon', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerReportProfile(page);
    await page.waitForTimeout(2000);

    expect(captured[0].event).toBe('completion');
    expect(captured[0].outcome).toBe('dual');
    expect(captured[0].conclusionKey).toBe('false-hope_false-power');
  });

  test('flat-low logs with its own outcome', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'nooit');
    await page.waitForTimeout(2000);

    expect(captured[0].outcome).toBe('flat-low');
  });

  test('opting in writes a second row against the same token', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerReportProfile(page);
    await fillProfileScreen(page);
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/voornaam/i).fill('Testpersoon');
    await page.getByPlaceholder(/e-?mail/i).fill('test@example.com');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /ontvang mijn rapport/i }).click();
    await page.waitForTimeout(2000);

    expect(captured.length).toBe(2);
    const [completion, submission] = captured;
    expect(completion.event).toBe('completion');
    expect(submission.event).toBe('submission');
    expect(submission.token).toBe(completion.token);
    expect(submission.email).toBe('test@example.com');
  });

  test('a flat outcome produces the completion row and no second row', async ({ page }) => {
    const captured = await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page);
    await page.waitForTimeout(2000);

    expect(captured.length).toBe(1);
    await expect(page.locator('[data-element="conclusion-contact-link"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/voornaam|e-?mail/i)).toHaveCount(0);
  });
});

// ── B: Intro lines ────────────────────────────────────────────

test.describe(`${SLUG} — B: Intro line selection`, () => {
  test('a dual outcome resolves an intro line', async ({ page }) => {
    await loadPage(page, TEST_PAGE_NL, '?nemdebug=1');
    await answerReportProfile(page);
    await fillProfileScreen(page);

    const intro = page.locator('[data-element="report-intro-line"]');
    await expect(intro).toBeVisible({ timeout: 10_000 });
    expect((await intro.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('the intro line ignores gender — same key, same line', async ({ page, context }) => {
    await loadPage(page, TEST_PAGE_NL);
    await answerReportProfile(page);
    await fillProfileScreen(page, 'Vrouw');
    const vrouw = (await page.locator('[data-element="report-intro-line"]').innerText()).trim();

    const second = await context.newPage();
    await loadPage(second, TEST_PAGE_NL);
    await answerReportProfile(second);
    await fillProfileScreen(second, 'Man');
    const man = (await second.locator('[data-element="report-intro-line"]').innerText()).trim();

    expect(vrouw).toBe(man);
  });

  test('flat outcomes have no intro line — they get no report', async ({ page }) => {
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page);

    await expect(page.locator('[data-element="report-intro-line"]')).toHaveCount(0);
  });
});

// ── C: General ────────────────────────────────────────────────

test.describe(`${SLUG} — C: General`, () => {
  test('no console errors through a full run', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await captureSubmit(page);
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page);
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('the beacon does not block the contact link from rendering', async ({ page }) => {
    /* The submit is fire-and-forget: a slow or failing backend must not leave the user
       staring at a conclusion with no way onward. */
    await page.route(SUBMIT_WEBHOOK, async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.abort();
    });
    await loadPage(page);
    await answerUniformly(page, 'soms');
    await fillProfileScreen(page);

    await expect(page.locator('[data-element="conclusion-contact-link"]')).toBeVisible({ timeout: 5_000 });
  });
});
