// TDD acceptance tests — pre-implementation.
// These assert future behaviour that is NOT yet built (see spec below).
// Expected to FAIL until BOTH: (a) init.js gains bindLeadershipModals() wired
// into boot(), AND (b) the two Webflow IX2 interactions (card-open a-146 /
// overlay-close a-147) are deleted in the Designer and the site is published.
//
// Spec: projects/the-signalling-company/.claude/specs/tsc-leadership-modal.md
// (see §10 Verify Loop, §11 Acceptance Tests index)
//
// Feature: clicking a .card_team opens its nested .modal2_component (500ms
// outQuad slide + 500ms ease overlay fade); clicking .modal2_background-overlay
// or pressing ESC closes it. Adds role=dialog, focus trap, scroll-lock,
// focus-return, and prefers-reduced-motion support.

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';
const LEADERSHIP = STAGING_URL.replace(/\/$/, '') + '/leadership';

// Animation is 500ms; wait comfortably past it before asserting end-state.
const ANIM_SETTLE = 750;

// DOM hooks (verified live 2026-07-14, per spec §3):
//   Trigger (open):  .card_team            (whole card, 8 on page)
//   Modal:           .modal2_component      (nested inside each card)
//   Panel:           .modal2_content-wrapper
//   Close trigger:   .modal2_background-overlay

test.describe('tsc-leadership-modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LEADERSHIP, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Webflow + init.js boot
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('all modals hidden on load', async ({ page }) => {
    const anyVisible = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.modal2_component'))
        .some((m) => getComputedStyle(m).display !== 'none')
    );
    expect(anyVisible).toBe(false);
  });

  test('clicking a card opens its modal', async ({ page }) => {
    await page.locator('.card_team').first().click();
    await page.waitForTimeout(ANIM_SETTLE);

    const state = await page.evaluate(() => {
      const modal = document.querySelector('.card_team .modal2_component');
      const wrap = modal.querySelector('.modal2_content-wrapper');
      const overlay = modal.querySelector('.modal2_background-overlay');
      // translateX(0) → matrix(1,0,0,1,0,0) or 'none'; read the x translate
      const tx = new DOMMatrixReadOnly(getComputedStyle(wrap).transform).m41;
      return {
        display: getComputedStyle(modal).display,
        ariaHidden: modal.getAttribute('aria-hidden'),
        overlayOpacity: parseFloat(getComputedStyle(overlay).opacity),
        wrapTx: tx,
      };
    });

    expect(state.display).not.toBe('none');
    expect(state.ariaHidden).toBe('false');
    expect(state.overlayOpacity).toBeGreaterThan(0.9);
    expect(Math.abs(state.wrapTx)).toBeLessThan(5); // ≈ translateX(0)
  });

  test('clicking the overlay closes the modal and does not re-open', async ({ page }) => {
    await page.locator('.card_team').first().click();
    await page.waitForTimeout(ANIM_SETTLE);
    await page.locator('.modal2_component .modal2_background-overlay').first().click();
    await page.waitForTimeout(ANIM_SETTLE);

    const state = await page.evaluate(() => {
      const modal = document.querySelector('.card_team .modal2_component');
      return {
        display: getComputedStyle(modal).display,
        ariaHidden: modal.getAttribute('aria-hidden'),
      };
    });
    expect(state.display).toBe('none');
    expect(state.ariaHidden).toBe('true');
  });

  test('ESC closes the modal', async ({ page }) => {
    await page.locator('.card_team').first().click();
    await page.waitForTimeout(ANIM_SETTLE);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(ANIM_SETTLE);

    const display = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.card_team .modal2_component')).display
    );
    expect(display).toBe('none');
  });

  test('body scroll is locked while open and restored on close', async ({ page }) => {
    await page.locator('.card_team').first().click();
    await page.waitForTimeout(ANIM_SETTLE);
    const lockedWhileOpen = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow === 'hidden'
    );
    expect(lockedWhileOpen).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(ANIM_SETTLE);
    const restored = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow !== 'hidden'
    );
    expect(restored).toBe(true);
  });

  test('opening the modal does not shift the page (scrollbar width reserved)', async ({ page }) => {
    // Locking scroll hides the vertical scrollbar; without compensation the
    // content area widens and the page jumps ~15px. lockScroll() reserves the
    // scrollbar width as padding-right so documentElement.clientWidth — the
    // content box width — is unchanged. (On overlay-scrollbar runners the
    // scrollbar width is 0, so this holds trivially and still guards no-jump.)
    const widthClosed = await page.evaluate(() => document.documentElement.clientWidth);
    await page.locator('.card_team').first().click();
    await page.waitForTimeout(ANIM_SETTLE);
    const widthOpen = await page.evaluate(() => document.documentElement.clientWidth);
    expect(widthOpen).toBe(widthClosed);
  });

  test('focus moves into the dialog on open and returns to the card on close', async ({ page }) => {
    const card = page.locator('.card_team').first();
    await card.click();
    await page.waitForTimeout(ANIM_SETTLE);
    const focusInDialog = await page.evaluate(() => {
      const wrap = document.querySelector('.card_team .modal2_content-wrapper');
      return wrap.contains(document.activeElement) || document.activeElement === wrap;
    });
    expect(focusInDialog).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(ANIM_SETTLE);
    const focusBackOnCard = await page.evaluate(() => {
      const c = document.querySelector('.card_team');
      return c === document.activeElement || c.contains(document.activeElement);
    });
    expect(focusBackOnCard).toBe(true);
  });

  test('content-wrapper exposes dialog ARIA roles', async ({ page }) => {
    const aria = await page.evaluate(() => {
      const wrap = document.querySelector('.card_team .modal2_content-wrapper');
      return {
        role: wrap.getAttribute('role'),
        modal: wrap.getAttribute('aria-modal'),
        labelledby: wrap.getAttribute('aria-labelledby'),
      };
    });
    expect(aria.role).toBe('dialog');
    expect(aria.modal).toBe('true');
    expect(aria.labelledby).toBeTruthy();
  });

  test('prefers-reduced-motion: modal still opens and closes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.locator('.card_team').first().click();
    await page.waitForTimeout(200); // near-instant under reduced motion
    const opened = await page.evaluate(
      () => getComputedStyle(document.querySelector('.card_team .modal2_component')).display !== 'none'
    );
    expect(opened).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const closed = await page.evaluate(
      () => getComputedStyle(document.querySelector('.card_team .modal2_component')).display === 'none'
    );
    expect(closed).toBe(true);
  });
});
