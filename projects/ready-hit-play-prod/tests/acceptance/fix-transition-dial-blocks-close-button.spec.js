// @ts-check
/**
 * Acceptance tests for fix-transition-dial-blocks-close-button
 *
 * Bug (found while verifying the case close-button deploy, 2026-08-13): on
 * mobile, after entering a case study via a Barba transition, the close button
 * cannot be tapped.
 *
 * Root cause: transition-dial.js appends a decorative `.transition-dial_canvas`
 * (aria-hidden) into `.home-transition-dial`. Its destroy() removes listeners
 * but leaves the canvas in the DOM, and `.home-transition-dial` has no
 * pointer-events rule — so the canvas stays hit-testable. On mobile that
 * wrapper sits bottom-centre, landing exactly on top of `.case_close-button`
 * at the end of a case study, and swallows the tap. Nothing is visibly
 * rendered over the button, so it just looks like the button is dead.
 *
 * The sibling container `.transition-dial` already sets `pointer-events: none`
 * for exactly this reason; `.home-transition-dial` was missing it.
 *
 * Fix: `pointer-events: none` on `.home-transition-dial` (matching
 * `.transition-dial`) plus on `.transition-dial_canvas` itself, since Flip
 * reparents that canvas between wrappers.
 *
 * These tests serve the local CSS in place of the CDN copy so the fix is
 * verified before deploy.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.test' });

const LOCAL_CSS = path.resolve(__dirname, '../../ready-hit-play.css');

// ── Helpers ───────────────────────────────────────────────────

/** Serve the local ready-hit-play.css in place of the CDN copy. */
async function useLocalCss(page) {
  await page.route('**/ready-hit-play.css*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: fs.readFileSync(LOCAL_CSS, 'utf8'),
    })
  );
}

async function dismissConsent(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[fs-consent-element="root"]').forEach((el) => el.remove());
  });
}

/** Home → case via a real Barba transition (the path that leaves the canvas behind),
 *  then scroll the case study to the close button. */
async function enterCaseAndScrollToClose(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 25_000 });
  await page.waitForTimeout(3000);
  await dismissConsent(page);

  await page.evaluate(() => window.barba.go('/work/tommy-hilfiger'));
  await page.waitForFunction(() => location.pathname.startsWith('/work/'), { timeout: 15_000 });
  await page.waitForTimeout(5000);
  await dismissConsent(page);

  await page.evaluate(() => {
    const fg = document.querySelector('.dial_layer-fg');
    const scroller = fg && fg.scrollHeight > fg.clientHeight ? fg : document.scrollingElement;
    scroller.scrollTop = scroller.scrollHeight;
  });
  await page.waitForTimeout(2500);
  await dismissConsent(page);
}

/** What element actually receives a tap at the close button's centre? */
async function hitTestCloseButton(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('.case_close-button');
    if (!btn) return { error: 'no .case_close-button' };
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      hitsButton: !!top && (top === btn || btn.contains(top)),
      topEl: top ? `${top.tagName}.${(typeof top.className === 'string' ? top.className : '').split(' ')[0]}` : null,
    };
  });
}

// ── Tests ─────────────────────────────────────────────────────

test.describe('transition dial must not block the case close button', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('close button is the tap target at the end of a case study', async ({ page }) => {
    await useLocalCss(page);
    await enterCaseAndScrollToClose(page);

    const hit = await hitTestCloseButton(page);
    expect(hit.hitsButton, `close button is covered by ${hit.topEl}`).toBe(true);
  });

  test('close button actually closes on mobile after a Barba transition', async ({ page }) => {
    await useLocalCss(page);
    await enterCaseAndScrollToClose(page);

    const btn = page.locator('.case_close-button');
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 12_000 });
    await page.waitForTimeout(5000);
    expect(new URL(page.url()).pathname, 'close button must return to home').toBe('/');
  });

  test('the decorative transition dial is non-interactive', async ({ page }) => {
    await useLocalCss(page);
    await enterCaseAndScrollToClose(page);

    const pe = await page.evaluate(() => {
      const canvas = document.querySelector('.transition-dial_canvas');
      const wrapper = document.querySelector('.home-transition-dial');
      return {
        canvas: canvas ? getComputedStyle(canvas).pointerEvents : 'absent',
        wrapper: wrapper ? getComputedStyle(wrapper).pointerEvents : 'absent',
      };
    });
    // Both are aria-hidden decoration — neither should ever take pointer input.
    if (pe.canvas !== 'absent') expect(pe.canvas).toBe('none');
    if (pe.wrapper !== 'absent') expect(pe.wrapper).toBe('none');
  });
});
