// @ts-check
/**
 * Acceptance tests for fix-case-close-button-dial-hijack
 *
 * Bug (reported by Ryan, 2026-08-10 call): on /work/<slug> pages the close
 * button intermittently "doesn't register" — clicking it does nothing.
 *
 * Root cause: work-dial.js binds a bubbling click listener on .dial_layer-fg
 * that calls preventDefault() + stopPropagation() and then navigates to the
 * dial's currently-active case. .dial_layer-fg persists across Barba
 * transitions and, on case pages, becomes the case study's scroll container —
 * it contains the whole case study, including .case_close-button. The listener
 * is only neutralised by workDial.suspend(). Whenever the dial is alive and
 * NOT suspended while a case page is showing, every click inside the case
 * study is hijacked: the anchor's default is cancelled and barba.go() is asked
 * to navigate to the case you are already on, which is a silent no-op.
 *
 * Fix: the dialFg click handler bails when .dial_layer-fg is in case-study
 * mode, and never swallows a click that originated on a real (non-"#") link.
 * This makes the handler correct by construction rather than relying on
 * suspend() winning every transition race.
 *
 * These tests load work-dial.js from the local working copy (intercepting the
 * jsDelivr request) so the fix is verified before deploy.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.test' });

const CASE_PATH = '/work/tommy-hilfiger';
const LOCAL_WORK_DIAL = path.resolve(__dirname, '../../work-dial.js');

// ── Helpers ───────────────────────────────────────────────────

/** Serve the local work-dial.js in place of the CDN copy. */
async function useLocalWorkDial(page) {
  await page.route('**/work-dial.js*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: fs.readFileSync(LOCAL_WORK_DIAL, 'utf8'),
    })
  );
}

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 25_000 });
}

/** Remove the Consent Pro banner — third-party chrome that overlays the close
 *  button on small viewports and swallows taps. Unrelated to what we're testing. */
async function dismissConsent(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[fs-consent-element="root"]').forEach((el) => el.remove());
  });
}

async function loadPage(page, p = '/') {
  await page.goto(p);
  await waitForRHP(page);
  await page.waitForTimeout(2500);
  await dismissConsent(page);
}

/** Reach a case page through a real Barba transition, then force the dial into
 *  the un-suspended state that causes the bug.
 *
 *  This MUST start from home: a directly-loaded /work/ page never initialises the
 *  dial at all (orchestrator's "direct-land" path), so workDial.resume() would
 *  no-op on its `if (!alive)` guard and no listeners would ever be bound —
 *  making any assertion here vacuous.
 */
async function enterCaseUnsuspended(page) {
  await loadPage(page, '/');
  await page.evaluate(() => window.barba.go('/work/tommy-hilfiger'));
  await page.waitForURL(/\/work\//, { timeout: 15_000 });
  await page.waitForTimeout(3500);
  await dismissConsent(page);

  // The dial must genuinely be alive-and-suspended first, otherwise resume()
  // no-ops and the test proves nothing.
  expect(
    await page.evaluate(() => window.RHP.workDial.isSuspended()),
    'dial should be suspended on a case page reached via Barba'
  ).toBe(true);

  await page.evaluate(() => window.RHP.workDial.resume());
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.RHP.workDial.isSuspended())).toBe(false);
}

/** Enter a case study the way the dial does (click on .dial_layer-fg). */
async function enterCaseViaDial(page) {
  await page.evaluate(() =>
    document.querySelector('.dial_layer-fg')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    )
  );
  await page.waitForURL(/\/work\//, { timeout: 15_000 });
  await page.waitForTimeout(3000);
}

/** Scroll the case study's inner container to the close button and click it.
 *  Uses a locator click rather than raw mouse coordinates so it stays correct
 *  across viewports (the config's Desktop Chrome is 1280x720, the mobile block
 *  is 390x844) — a hand-computed point can land outside the viewport. */
async function clickCloseButton(page) {
  await page.evaluate(() => {
    const fg = document.querySelector('.dial_layer-fg');
    if (fg) fg.scrollTop = fg.scrollHeight;
  });
  await page.waitForTimeout(2000);
  await dismissConsent(page);
  const btn = page.locator('.case_close-button');
  await expect(btn, '.case_close-button should exist at the bottom of the case study').toHaveCount(1);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(4000);
}

// ── Tests ─────────────────────────────────────────────────────

test.describe('case close button — dial click hijack', () => {
  test('close button works when the dial is left un-suspended on a case page', async ({ page }) => {
    await useLocalWorkDial(page);
    // Enter via the dial so the dial is genuinely initialised (a directly-loaded
    // /work/ page never inits it, which would make resume() — and this test —
    // vacuous), then reproduce the failure state: dial alive and NOT suspended
    // while the case page is showing. This is the state the orchestrator's
    // suspend/resume guards are meant to prevent and that transition races can
    // leave behind. Before the fix it makes the close button silently dead.
    await loadPage(page, '/');
    await enterCaseViaDial(page);

    expect(
      await page.evaluate(() => window.RHP.workDial.isSuspended()),
      'dial should be suspended on a case page'
    ).toBe(true);

    await page.evaluate(() => window.RHP.workDial.resume());
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.RHP.workDial.isSuspended())).toBe(false);

    await clickCloseButton(page);
    expect(new URL(page.url()).pathname, 'close button must return to home').toBe('/');
  });

  test('close button works on the normal path (dial suspended)', async ({ page }) => {
    await useLocalWorkDial(page);
    await loadPage(page, '/');
    await enterCaseViaDial(page);
    await clickCloseButton(page);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('close button works on a directly-loaded case page', async ({ page }) => {
    await useLocalWorkDial(page);
    await loadPage(page, CASE_PATH);
    await clickCloseButton(page);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('dial still navigates from home into a case study', async ({ page }) => {
    await useLocalWorkDial(page);
    await loadPage(page, '/');
    await enterCaseViaDial(page);
    expect(page.url()).toContain('/work/');
  });

  // Mobile: the same un-suspended state is worse than a dead close button.
  // onPointerDown is bound to .dial_component (which contains the case study) and
  // sets dragActive on any touch; preventTouchScroll then preventDefault()s every
  // touchmove, so the case study cannot be scrolled — the close button becomes
  // unreachable rather than merely unresponsive.
  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('touchmove is not preventDefault-ed when the dial is left un-suspended', async ({ page }) => {
      await useLocalWorkDial(page);
      await enterCaseUnsuspended(page);

      // Drive the real gesture path: a pointerdown on .dial_component sets the
      // dial's dragActive flag, after which preventTouchScroll() cancels every
      // touchmove. Asserting defaultPrevented is what actually distinguishes the
      // fixed build from the broken one — a programmatic scrollTop assignment
      // would pass either way, since preventDefault only blocks native scrolling.
      const prevented = await page.evaluate(() => {
        const comp = document.querySelector('.dial_component');
        comp.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, clientX: 195, clientY: 400, pointerType: 'touch',
        }));
        const touch = new Touch({ identifier: 1, target: comp, clientX: 195, clientY: 300 });
        const ev = new TouchEvent('touchmove', {
          bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch],
        });
        window.dispatchEvent(ev);
        return ev.defaultPrevented;
      });
      expect(prevented, 'dial must not cancel touchmove over a case study').toBe(false);
    });

    test('close button works when the dial is left un-suspended', async ({ page }) => {
      await useLocalWorkDial(page);
      await enterCaseUnsuspended(page);

      await clickCloseButton(page);
      expect(new URL(page.url()).pathname).toBe('/');
    });
  });

  // Regression guard for the fix itself: the case-study bail-out keys off the
  // .is-case-study class, which the orchestrator removes on the case→home
  // transition. If that class ever lingered on home, the dial would go dead.
  test('dial still navigates after returning home from a case study', async ({ page }) => {
    await useLocalWorkDial(page);
    await loadPage(page, '/');

    for (let cycle = 0; cycle < 2; cycle++) {
      await enterCaseViaDial(page);
      expect(page.url(), `cycle ${cycle}: dial should enter a case`).toContain('/work/');

      await clickCloseButton(page);
      expect(new URL(page.url()).pathname, `cycle ${cycle}: close should return home`).toBe('/');

      // .is-case-study must be cleared once we are back on home, otherwise the
      // dial's click handler would bail for the rest of the session.
      expect(
        await page.evaluate(() =>
          document.querySelector('.dial_layer-fg')?.classList.contains('is-case-study')
        ),
        `cycle ${cycle}: .is-case-study must be cleared on home`
      ).toBe(false);
    }
  });
});
