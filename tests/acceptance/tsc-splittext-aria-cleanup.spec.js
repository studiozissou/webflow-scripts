// TDD acceptance test — pre-implementation.
// Expected to FAIL until init.js gains stripProhibitedSplitAria() wired into
// boot() (plus a MutationObserver for late/re-split runs).
//
// Bug: GSAP SplitText (loaded from Webflow head code, not this repo) defaults
// to aria:"auto", which writes aria-label onto every element it splits. On the
// hero <h1> that is valid (headings support a name), but on the quote
// <p>/<blockquote>/<div> reveals aria-label is prohibited (generic role) →
// axe fires aria-prohibited-attr (5× on the home page). We cannot edit the
// SplitText config, so init.js strips the prohibited aria-label after the split.
//
// These run against a LOCAL fixture (page.setContent) with the REAL init.js
// loaded via addScriptTag — deps/modules are empty, so boot() runs offline.
// No staging deploy needed to verify the logic.

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INIT_JS = path.resolve(__dirname, '../../projects/the-signalling-company/init.js');

// SplitText (aria:"auto") writes aria-label onto the element it splits. The
// live TSC page shows THREE signatures among the 5 flagged nodes (verified via
// axe aria-prohibited-attr against tsc-v2.webflow.io, 2026-07-16):
//   • lines split  → .gsap_split_line children  (blockquote[heading-scroll], div[text-scroll])
//   • words/chars  → aria-hidden children, NO .gsap_split_line  (p[text-fill-scroll])
// The animation hook is the attribute (text-fill-scroll / heading-scroll /
// text-scroll). The fixture mirrors all three signatures exactly.

// lines signature: .gsap_split_line children
const linesTarget = (tag, attr, label) =>
  `<${tag} ${attr}="" aria-label="${label}">` +
  `<div class="gsap_split_line" aria-hidden="true"><div>${label.split(' ').slice(0, 3).join(' ')}</div></div>` +
  `<div class="gsap_split_line" aria-hidden="true"><div>${label.split(' ').slice(3).join(' ')}</div></div>` +
  `</${tag}>`;

// words/chars signature: aria-hidden children, NO .gsap_split_line
const wordsTarget = (tag, attr, label) =>
  `<${tag} ${attr}="" class="heading-style-h6" aria-label="${label}">` +
  label.split(' ').map((w) => `<span aria-hidden="true">${w} </span>`).join('') +
  `</${tag}>`;

const FIXTURE = `<!doctype html><html><head></head><body>
  <!-- Prohibited: generic/blockquote roles cannot carry aria-label -->
  ${linesTarget('blockquote', 'heading-scroll', 'We help teams move faster than ever')}
  ${wordsTarget('p', 'text-fill-scroll', 'Signalling turns noise into clear direction')}
  ${linesTarget('div', 'text-scroll', 'Built for the way modern teams actually work')}

  <!-- Valid: heading supports a name — must be RETAINED even though split -->
  <h1 id="hero" heading-scroll="" aria-label="The Signalling Company">
    <div class="gsap_split_line" aria-hidden="true"><div>The Signalling</div></div>
    <div class="gsap_split_line" aria-hidden="true"><div>Company</div></div>
  </h1>

  <!-- Valid: real interactive control — must be RETAINED -->
  <button type="button" aria-label="Play video">▶</button>

  <!-- Has an explicit role that supports a name — must be RETAINED -->
  <div role="img" aria-label="Sales chart">
    <div class="gsap_split_line"><div>chart</div></div>
  </div>

  <!-- A paragraph with aria-label but NO split — not a SplitText target,
       out of scope, must be RETAINED (proves the cleanup is scoped). -->
  <p aria-label="unrelated label">Plain paragraph</p>
</body></html>`;

async function loadFixture(page) {
  await page.setContent(FIXTURE, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ path: INIT_JS });
  // boot() runs the strip synchronously; give the MutationObserver a tick too.
  await page.waitForTimeout(300);
}

const labelOf = (page, selector) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.getAttribute('aria-label') : '__missing__';
  }, selector);

test.describe('tsc-splittext-aria-cleanup', () => {
  test('strips prohibited aria-label from split blockquote', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, 'blockquote')).toBeNull();
  });

  test('strips prohibited aria-label from split <p>', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, 'body > p:first-of-type')).toBeNull();
  });

  test('strips prohibited aria-label from split <div>', async ({ page }) => {
    await loadFixture(page);
    // the first bare div (no role) is the split target
    const label = await page.evaluate(() => {
      const div = [...document.querySelectorAll('div')].find(
        (d) => !d.getAttribute('role') && d.querySelector('.gsap_split_line')
      );
      return div ? div.getAttribute('aria-label') : '__missing__';
    });
    expect(label).toBeNull();
  });

  test('retains valid aria-label on <h1> heading', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, '#hero')).toBe('The Signalling Company');
  });

  test('retains aria-label on <button>', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, 'button')).toBe('Play video');
  });

  test('retains aria-label on element with an explicit role', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, '[role="img"]')).toBe('Sales chart');
  });

  test('leaves non-split paragraphs untouched (scoped to SplitText)', async ({ page }) => {
    await loadFixture(page);
    expect(await labelOf(page, 'p[aria-label="unrelated label"]')).toBe('unrelated label');
  });

  test('strips aria-label from a LATE split (MutationObserver)', async ({ page }) => {
    await loadFixture(page);
    // Simulate SplitText running on scroll, after boot: inject a fresh target.
    await page.evaluate(() => {
      const el = document.createElement('p');
      el.id = 'late';
      el.setAttribute('aria-label', 'Revealed on scroll');
      el.innerHTML = '<div class="gsap_split_line"><div>Revealed on scroll</div></div>';
      document.body.appendChild(el);
    });
    await page.waitForTimeout(300);
    expect(await labelOf(page, '#late')).toBeNull();
  });
});
