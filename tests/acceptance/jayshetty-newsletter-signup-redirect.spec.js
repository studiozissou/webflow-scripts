// TDD acceptance tests — pre-implementation.
// These assert future behaviour that is NOT yet built: the site currently has no
// redirect script, so every test past the selector checks is expected to FAIL
// until the footer snippet is pasted into Webflow and published.
//
// Spec: projects/jayshetty/.claude/specs/jayshetty-newsletter-signup-redirect.md
// (see §10 Verify Loop, §11 Acceptance Tests index)
//
// Feature: a successful submit on any of the three global newsletter forms
// (footer / popup / banner) redirects to the beehiiv welcome survey with the
// submitted email appended as ?email=. The /tour form, site search, blog filters,
// Suggest-a-Topic and Book-Jay must NOT redirect.
//
// SAFETY: these tests never create a real subscriber. Webflow's form POST is
// blocked at the network layer, and the success state is revealed by hand to
// drive the MutationObserver. Nothing reaches Webflow, Zapier or beehiiv.

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://jayshetty.webflow.io';
const BASE = STAGING_URL.replace(/\/$/, '');
const TOUR = BASE + '/tour';

const SURVEY = 'https://news.jayshetty.me/forms/c63ba936-3683-48e2-add5-f8890e18bd5e';

// Scoped selector under test (spec §3.3).
const SELECTOR = '.footer2_form:not(.is-tour)';

// The three in-scope form elements (spec §3.1), verified live 2026-09-01.
const FOOTER_FORM = 'a3a0a744-f40d-7d2f-cfa5-a84b30ab0b3a';
const POPUP_FORM = '8f6d348a-6e5d-b370-55d1-13144ac79335';
const BANNER_FORM = 'a6cfadf6-e3d0-c133-8f05-93cf0c750fd1';
const TOUR_FORM = 'db207ae1-7143-d165-7e06-64005cee9b3d';

// Redirect is scheduled 1200ms after success; wait comfortably past it.
const REDIRECT_SETTLE = 2500;

// Keep the run off the client's live systems.
//
// The Webflow form POST is aborted outright — nothing should ever reach Webflow,
// Zapier or beehiiv from a test run. The survey navigation is *stubbed* rather
// than aborted: an aborted main-frame navigation leaves page.url() on the old
// URL, which would make the redirect assertions unfalsifiable. Fulfilling it
// lets the navigation commit so the URL (and its ?email= param) can be asserted,
// while no request actually leaves the machine.
async function blockWrites(page) {
  await page.route('**/*', (route) => {
    const req = route.request();
    const url = req.url();
    const isWebflowFormPost =
      req.method() === 'POST' &&
      /webflow\.com\/api\/v1\/form|\/form-submission/i.test(url);
    if (isWebflowFormPost) return route.abort();
    if (url.startsWith('https://news.jayshetty.me/')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>stubbed survey</body></html>',
      });
    }
    return route.continue();
  });
}

// Reveal a form's success (or failure) panel the way Webflow does, then wait.
async function revealPanel(page, elementId, panelClass) {
  await page.evaluate(
    ([id, cls]) => {
      const form = document.querySelector(`[data-wf-element-id="${id}"]`);
      const panel = form.closest('.w-form').querySelector(cls);
      panel.style.display = 'block';
    },
    [elementId, panelClass],
  );
}

test.describe('jayshetty-newsletter-signup-redirect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Webflow boot + footer scripts
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('matches exactly the three global signup forms', async ({ page }) => {
    const ids = await page.evaluate(
      (sel) =>
        Array.from(document.querySelectorAll(sel)).map((f) =>
          f.getAttribute('data-wf-element-id'),
        ),
      SELECTOR,
    );
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(expect.arrayContaining([FOOTER_FORM, POPUP_FORM, BANNER_FORM]));
  });

  test('excludes search, filter and contact forms', async ({ page }) => {
    const overlap = await page.evaluate((sel) => {
      const out = [
        '.search-form',
        '.filter-form',
        '.contact11_form',
        '.contact-modal2_form',
      ];
      return Array.from(document.querySelectorAll(sel)).filter((f) =>
        out.some((c) => f.matches(c)),
      ).length;
    }, SELECTOR);
    expect(overlap).toBe(0);
  });

  test('excludes the tour form on /tour', async ({ page }) => {
    await page.goto(TOUR, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const { matched, tourPresent } = await page.evaluate(
      ([sel, tourId]) => ({
        matched: Array.from(document.querySelectorAll(sel)).map((f) =>
          f.getAttribute('data-wf-element-id'),
        ),
        tourPresent: !!document.querySelector(`[data-wf-element-id="${tourId}"]`),
      }),
      [SELECTOR, TOUR_FORM],
    );

    expect(tourPresent, 'tour form should exist on /tour').toBe(true);
    expect(matched).not.toContain(TOUR_FORM);
    expect(matched).toHaveLength(3);
  });

  test('does not redirect while no form has been submitted', async ({ page }) => {
    await page.waitForTimeout(REDIRECT_SETTLE);
    expect(page.url()).toContain(new URL(BASE).host);
  });

  for (const [label, elementId] of [
    ['footer', FOOTER_FORM],
    ['popup', POPUP_FORM],
    ['banner', BANNER_FORM],
  ]) {
    test(`${label} form redirects to the survey with the email appended`, async ({
      page,
    }) => {
      await blockWrites(page);
      const email = `qa+${label}@example.com`;

      // Fill, then fire submit so the capture-phase listener records the address.
      await page.evaluate(
        ([id, value]) => {
          const form = document.querySelector(`[data-wf-element-id="${id}"]`);
          form.querySelector('input[name="Email"], input[type="email"]').value = value;
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        },
        [elementId, email],
      );

      await revealPanel(page, elementId, '.w-form-done');
      await page.waitForTimeout(REDIRECT_SETTLE);

      const expected = SURVEY + '?email=' + encodeURIComponent(email);
      expect(decodeURIComponent(page.url())).toBe(decodeURIComponent(expected));
    });
  }

  test('does not redirect on the failure state', async ({ page }) => {
    await blockWrites(page);

    await page.evaluate(
      ([id]) => {
        const form = document.querySelector(`[data-wf-element-id="${id}"]`);
        form.querySelector('input[name="Email"], input[type="email"]').value =
          'qa@example.com';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      },
      [FOOTER_FORM],
    );

    await revealPanel(page, FOOTER_FORM, '.w-form-fail');
    await page.waitForTimeout(REDIRECT_SETTLE);

    expect(page.url()).not.toContain('news.jayshetty.me');
  });

  test('survey prefills the email from the query param', async ({ page }) => {
    const email = 'qa+prefill@example.com';
    await page.goto(SURVEY + '?email=' + encodeURIComponent(email), {
      waitUntil: 'domcontentloaded',
    });

    const value = await page
      .locator('input[type="hidden"][name="email"]')
      .first()
      .getAttribute('value');

    expect(value).toBe(email);
  });
});
