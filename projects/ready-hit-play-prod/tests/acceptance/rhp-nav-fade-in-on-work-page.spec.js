// @ts-check
/**
 * Acceptance tests — rhp-nav-fade-in-on-work-page
 *
 * Two behaviours:
 *   1. FIX — the nav must be present on work/case pages even after a direct land
 *      on /about. The About page's page-level custom code injects
 *      `.nav{display:none!important}` into the document head, and Barba never
 *      swaps <head>, so that rule otherwise survives the navigation and hides
 *      the nav for the rest of the session.
 *   2. FEAT — arriving at a work page from about, the nav animates in: about
 *      slides from the left, contact from the right (matching the homepage
 *      choreography in home-scroll-morph.js), and the logo fades.
 *
 * Spec: .claude/specs/rhp-nav-fade-in-on-work-page.md
 *
 * IMPORTANT: every test that exercises the bug must reach /about via a REAL page
 * load, not via Barba — the stale <style> only lands in the head on a direct hit.
 *
 * Mid-entrance assertions (criteria 4-7) are timing-sensitive against a 0.7s
 * window, so they are logged as `design-drift` annotations rather than hard
 * failures. Same convention as feat-about-to-work-via-home-transition.
 */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const SLUG = 'rhp-nav-fade-in-on-work-page';
const BASE = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

const WORK_LINK = '[data-barba-namespace="about"] a[href^="/work/"]';
const NAV = '.nav';
const LOGO = '.nav_logo-link';
const ABOUT_LINK = '.nav_about-link';
const CONTACT_LINK = '.nav_contact-link';

// ── Helpers ───────────────────────────────────────────────────

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

function soft(description) {
  test.info().annotations.push({ type: 'design-drift', description });
}

/** Direct land on /about — required for the stale <style> to be in the head. */
async function landOnAbout(page) {
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

/** Skip when the about page has no work links yet. */
async function requireWorkLink(page) {
  const count = await page.locator(WORK_LINK).count();
  test.skip(count === 0, 'no /work/ links on the about page yet');
  return page.locator(WORK_LINK).first();
}

/** Records computed nav state every frame so the entrance can be inspected. */
async function installNavRecorder(page) {
  await page.evaluate(() => {
    window.__navSamples = [];
    window.__navRecording = false;
    window.__navStart = function () {
      window.__navRecording = true;
      const t0 = performance.now();
      const read = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          opacity: parseFloat(cs.opacity),
          transform: cs.transform === 'none' ? null : cs.transform,
          display: cs.display
        };
      };
      const tick = () => {
        if (!window.__navRecording) return;
        const nav = document.querySelector('.nav');
        window.__navSamples.push({
          t: performance.now() - t0,
          navDisplay: nav ? getComputedStyle(nav).display : null,
          logo: read('.nav_logo-link'),
          about: read('.nav_about-link'),
          contact: read('.nav_contact-link')
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  });
}

/** translateX in px from a computed matrix, or 0. */
function translateX(transform) {
  if (!transform) return 0;
  const m = transform.match(/matrix\(([^)]+)\)/);
  if (m) return parseFloat(m[1].split(',')[4]) || 0;
  const m3 = transform.match(/matrix3d\(([^)]+)\)/);
  if (m3) return parseFloat(m3[1].split(',')[12]) || 0;
  return 0;
}

// ── The fix: nav present at all ───────────────────────────────

test.describe(`${SLUG} — Nav presence`, () => {
  test('nav is visible on a work page reached from a direct land on about', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const state = await page.evaluate((sel) => {
      const nav = document.querySelector(sel);
      const c = document.querySelector('[data-barba="container"]');
      return {
        display: nav ? getComputedStyle(nav).display : null,
        ns: c ? c.getAttribute('data-barba-namespace') : null,
        path: location.pathname
      };
    }, NAV);

    expect(state.ns, 'should have landed on a work/case page').toMatch(/^(work|case)$/);
    // The whole point of the fix: NOT 'none'.
    expect(state.display, 'nav must not be hidden by the stale about-page style').not.toBe('none');
    expect(state.display).toBe('flex');
  });

  test('nav logo is interactive after the transition', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const box = await page.locator(LOGO).first().boundingBox();
    expect(box, 'logo should have a layout box').not.toBeNull();
    expect(box.width, 'logo width').toBeGreaterThan(0);
    expect(box.height, 'logo height').toBeGreaterThan(0);
  });

  test('about to home still shows the nav', async ({ page }) => {
    await landOnAbout(page);
    await page.locator('a[href="/"]').first().click({ force: true });
    await page.waitForTimeout(3000);

    const display = await page.evaluate((sel) => {
      const nav = document.querySelector(sel);
      return nav ? getComputedStyle(nav).display : null;
    }, NAV);
    expect(display, 'about→home must keep working').not.toBe('none');
  });
});

// ── The feature: the entrance ─────────────────────────────────

test.describe(`${SLUG} — Entrance`, () => {
  test('nav animates in rather than appearing instantly', async ({ page }) => {
    await landOnAbout(page);
    await installNavRecorder(page);
    const link = await requireWorkLink(page);

    await page.evaluate(() => window.__navStart());
    await link.click();
    await page.waitForTimeout(2500);
    await page.evaluate(() => { window.__navRecording = false; });

    const samples = await page.evaluate(() => window.__navSamples);
    expect(samples.length, 'recorder should have captured frames').toBeGreaterThan(5);

    // Only frames where the nav is actually displayed can show an entrance.
    const shown = samples.filter((s) => s.navDisplay === 'flex');

    // Criterion 4 + 5 — logo passes through a partial opacity.
    const logoPartial = shown.some(
      (s) => s.logo && s.logo.opacity > 0.01 && s.logo.opacity < 0.99
    );
    if (!logoPartial) {
      soft('logo never sampled mid-fade — entrance may be instant, or the 0.7s window was missed');
    }

    // Criterion 6 — about slides in from the left (negative translateX).
    const aboutSlid = shown.some(
      (s) => s.about && s.about.display !== 'none' && translateX(s.about.transform) < -1
    );
    if (!aboutSlid) {
      soft('about-link never sampled translated from the left');
    }

    // Criterion 7 — contact slides in from the right (positive translateX).
    const contactSlid = shown.some(
      (s) => s.contact && s.contact.display !== 'none' && translateX(s.contact.transform) > 1
    );
    if (!contactSlid) {
      soft('contact-link never sampled translated from the right');
    }

    // Hard floor: something must have been animating, otherwise the feature is absent.
    expect(
      logoPartial || aboutSlid || contactSlid,
      'no nav entrance observed at all — nav appears instantly'
    ).toBeTruthy();
  });

  test('nav entrance leaves no inline styles behind', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const left = await page.evaluate(
      ({ logo, about, contact }) => {
        const read = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          return {
            inlineOpacity: el.style.opacity || '',
            inlineTransform: el.style.transform || '',
            computedOpacity: parseFloat(getComputedStyle(el).opacity),
            display: getComputedStyle(el).display
          };
        };
        return { logo: read(logo), about: read(about), contact: read(contact) };
      },
      { logo: LOGO, about: ABOUT_LINK, contact: CONTACT_LINK }
    );

    for (const [name, el] of Object.entries(left)) {
      if (!el || el.display === 'none') continue;
      expect(el.computedOpacity, `${name} should end fully opaque`).toBeCloseTo(1, 1);
      expect(el.inlineOpacity, `${name} should have no inline opacity (clearProps)`).toBe('');
      expect(el.inlineTransform, `${name} should have no inline transform (clearProps)`).toBe('');
    }
  });

  test('re-entering work replays the entrance cleanly', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    // work → about
    await page.locator(ABOUT_LINK).first().click({ force: true });
    await page.waitForTimeout(3000);

    // about → work again
    const link2 = page.locator(WORK_LINK).first();
    if ((await link2.count()) === 0) test.skip(true, 'no work link after returning to about');
    await link2.click();
    await page.waitForTimeout(3000);

    const state = await page.evaluate(
      ({ nav, logo }) => {
        const n = document.querySelector(nav);
        const l = document.querySelector(logo);
        return {
          navDisplay: n ? getComputedStyle(n).display : null,
          logoOpacity: l ? parseFloat(getComputedStyle(l).opacity) : null,
          logoInline: l ? l.style.opacity || '' : null
        };
      },
      { nav: NAV, logo: LOGO }
    );

    expect(state.navDisplay).toBe('flex');
    expect(state.logoOpacity, 'logo must not be stranded hidden on re-entry').toBeCloseTo(1, 1);
    expect(state.logoInline).toBe('');
  });
});

// ── Scoping: must not fire elsewhere ──────────────────────────

test.describe(`${SLUG} — Scoping`, () => {
  test('home to work does not replay the nav entrance', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForRHP(page);
    await page.waitForTimeout(4000); // let the home intro finish

    await installNavRecorder(page);
    const caseLink = page.locator('a[href^="/work/"]').first();
    if ((await caseLink.count()) === 0) test.skip(true, 'no work link on home');

    await page.evaluate(() => window.__navStart());
    await caseLink.click({ force: true });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { window.__navRecording = false; });

    const samples = await page.evaluate(() => window.__navSamples);
    const dipped = samples.filter(
      (s) => s.navDisplay === 'flex' && s.logo && s.logo.opacity < 0.9
    );
    // The nav is already on screen coming from home — it must not re-animate.
    expect(dipped.length, 'nav should not fade on home→work').toBe(0);
  });
});

// ── Responsive + reduced motion ───────────────────────────────

test.describe(`${SLUG} — Reduced motion & mobile`, () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion shows the nav immediately', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(1000);

    const state = await page.evaluate(
      ({ nav, logo }) => {
        const n = document.querySelector(nav);
        const l = document.querySelector(logo);
        return {
          navDisplay: n ? getComputedStyle(n).display : null,
          logoOpacity: l ? parseFloat(getComputedStyle(l).opacity) : null,
          logoInline: l ? l.style.opacity || '' : null
        };
      },
      { nav: NAV, logo: LOGO }
    );

    expect(state.navDisplay).toBe('flex');
    expect(state.logoOpacity, 'reduced motion should land at full opacity fast').toBeCloseTo(1, 1);
    expect(state.logoInline, 'no inline opacity stranded under reduced motion').toBe('');
  });
});

test.describe(`${SLUG} — Mobile`, () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('mobile leaves hidden nav links untouched', async ({ page }) => {
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);

    const state = await page.evaluate(
      ({ logo, about, contact }) => {
        const read = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          return {
            display: getComputedStyle(el).display,
            inlineOpacity: el.style.opacity || '',
            inlineTransform: el.style.transform || '',
            computedOpacity: parseFloat(getComputedStyle(el).opacity)
          };
        };
        return { logo: read(logo), about: read(about), contact: read(contact) };
      },
      { logo: LOGO, about: ABOUT_LINK, contact: CONTACT_LINK }
    );

    // Logo still fades in and settles.
    expect(state.logo.computedOpacity).toBeCloseTo(1, 1);
    expect(state.logo.inlineOpacity).toBe('');

    // ≤991px hides these on work pages — they must not be left with inline state.
    for (const name of ['about', 'contact']) {
      const el = state[name];
      if (el && el.display === 'none') {
        expect(el.inlineOpacity, `${name} (hidden on mobile) should carry no inline opacity`).toBe('');
        expect(el.inlineTransform, `${name} (hidden on mobile) should carry no inline transform`).toBe('');
      }
    }
  });
});

// ── Errors ────────────────────────────────────────────────────

test.describe(`${SLUG} — Errors`, () => {
  test('about to work produces no console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await landOnAbout(page);
    const link = await requireWorkLink(page);
    await link.click();
    await page.waitForTimeout(3000);
    expect(errors.map((e) => e.message)).toEqual([]);
  });
});
