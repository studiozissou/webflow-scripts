// @ts-check
/**
 * Verify loop — RHP About Scroll Accordions (worktree)
 *
 * Intercepts CDN init.js with the worktree version so the new module loads.
 * Run: npx playwright test tests/verify-scroll-accordions.spec.js
 */
const { test, expect } = require('@playwright/test');

const WT_PORT = 8082;
const WT_BASE = `https://localhost:${WT_PORT}/projects/ready-hit-play-prod`;
const STAGING = 'https://rhpcircle.webflow.io';

// Intercept CDN requests and serve from worktree server
async function setupRouteIntercept(page) {
  // Intercept the init.js loaded from CDN and redirect to worktree
  await page.route(/cdn\.jsdelivr\.net.*ready-hit-play-prod/, async (route) => {
    const url = route.request().url();
    // Extract the filename from the CDN URL
    const match = url.match(/ready-hit-play-prod\/(.+?)(\?|$)/);
    if (match) {
      const file = match[1];
      const wtUrl = `${WT_BASE}/${file}`;
      try {
        const response = await page.request.fetch(wtUrl, { ignoreHTTPSErrors: true });
        const body = await response.body();
        const contentType = file.endsWith('.css') ? 'text/css' : 'application/javascript';
        await route.fulfill({ body, contentType });
      } catch {
        await route.continue();
      }
    } else {
      await route.continue();
    }
  });
}

async function waitForRHP(page) {
  await page.waitForFunction(
    () => window.RHP?.scriptsOk === true,
    { timeout: 25_000 }
  );
}

async function loadAbout(page) {
  await setupRouteIntercept(page);
  await page.goto(`${STAGING}/about`, { waitUntil: 'domcontentloaded' });
  await waitForRHP(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── 1. Module loaded ─────────────────────────────────────────
test('module loads and registers on RHP', async ({ page }) => {
  await loadAbout(page);
  const version = await page.evaluate(() => window.RHP?.aboutScrollAccordions?.version);
  expect(version).toBe('2026.4.21.1');
});

// ── 2. Accordions start collapsed ───────────────────────────
test('accordion-content elements start collapsed', async ({ page }) => {
  await loadAbout(page);
  const results = await page.evaluate(() => {
    const contents = document.querySelectorAll('.section_about-hero .accordion-content');
    return Array.from(contents).map(el => ({
      height: el.offsetHeight,
      opacity: Number(getComputedStyle(el).opacity)
    }));
  });
  expect(results.length).toBeGreaterThanOrEqual(2);
  for (const r of results) {
    expect(r.height).toBeLessThanOrEqual(1);
    expect(r.opacity).toBeLessThanOrEqual(0.01);
  }
});

// ── 3. Accordion opens on scroll ────────────────────────────
test('accordion opens when title scrolls to trigger zone', async ({ page }) => {
  await loadAbout(page);
  // Scroll first accordion title into trigger zone
  await page.evaluate(() => {
    const title = document.querySelector('.section_about-hero .accordion-title');
    if (title) {
      const rect = title.getBoundingClientRect();
      window.scrollBy(0, rect.top - window.innerHeight * 0.4);
    }
  });
  await page.waitForTimeout(1500);

  const styles = await page.evaluate(() => {
    const content = document.querySelector('.section_about-hero .accordion-content');
    return content ? { height: content.offsetHeight, opacity: Number(getComputedStyle(content).opacity) } : null;
  });
  expect(styles).not.toBeNull();
  expect(styles.height).toBeGreaterThan(10);
  expect(styles.opacity).toBeGreaterThan(0.5);
});

// ── 4. Accordion reverses on scroll-back ────────────────────
test('accordion reverses when scrolling back up', async ({ page }) => {
  await loadAbout(page);
  // Open it
  await page.evaluate(() => {
    const title = document.querySelector('.section_about-hero .accordion-title');
    if (title) {
      const rect = title.getBoundingClientRect();
      window.scrollBy(0, rect.top - window.innerHeight * 0.4);
    }
  });
  await page.waitForTimeout(1500);

  // Verify open
  const openHeight = await page.evaluate(() =>
    document.querySelector('.section_about-hero .accordion-content')?.offsetHeight ?? 0
  );
  expect(openHeight).toBeGreaterThan(10);

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);

  const closed = await page.evaluate(() => {
    const el = document.querySelector('.section_about-hero .accordion-content');
    return el ? { height: el.offsetHeight, opacity: Number(getComputedStyle(el).opacity) } : null;
  });
  expect(closed.height).toBeLessThanOrEqual(1);
  expect(closed.opacity).toBeLessThanOrEqual(0.1);
});

// ── 5. Multiple open simultaneously ─────────────────────────
test('multiple accordions can be open simultaneously', async ({ page }) => {
  await loadAbout(page);
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.section_about-hero .accordion-block');
    if (blocks.length >= 2) {
      const last = blocks[blocks.length - 1].querySelector('.accordion-title');
      if (last) {
        const rect = last.getBoundingClientRect();
        window.scrollBy(0, rect.top - window.innerHeight * 0.4);
      }
    }
  });
  await page.waitForTimeout(2000);

  const openCount = await page.evaluate(() => {
    const contents = document.querySelectorAll('.section_about-hero .accordion-content');
    return Array.from(contents).filter(el => el.offsetHeight > 10).length;
  });
  expect(openCount).toBeGreaterThanOrEqual(2);
});

// ── 6. No console errors ────────────────────────────────────
test('no JS errors on about page', async ({ page }) => {
  const errors = collectErrors(page);
  await loadAbout(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2000);
  const real = errors.filter(e => !e.message?.includes('favicon'));
  expect(real, `JS errors: ${real.map(e => e.message).join(', ')}`).toHaveLength(0);
});

// ── 7. Barba re-entry ───────────────────────────────────────
test('accordions work on second visit via Barba', async ({ page }) => {
  const errors = collectErrors(page);
  await loadAbout(page);

  // Navigate to home via Barba
  await page.locator('.nav_logo-link, a[href="/"]').first().click();
  await page.waitForTimeout(2500);

  // Navigate back to about
  await page.locator('a[href="/about"]').first().click();
  await page.waitForTimeout(2500);
  await waitForRHP(page);
  await page.waitForTimeout(1000);

  // Verify collapsed
  const height = await page.evaluate(() =>
    document.querySelector('.section_about-hero .accordion-content')?.offsetHeight ?? 999
  );
  expect(height).toBeLessThanOrEqual(1);

  // Scroll to trigger
  await page.evaluate(() => {
    const title = document.querySelector('.section_about-hero .accordion-title');
    if (title) {
      const rect = title.getBoundingClientRect();
      window.scrollBy(0, rect.top - window.innerHeight * 0.4);
    }
  });
  await page.waitForTimeout(1500);

  const openHeight = await page.evaluate(() =>
    document.querySelector('.section_about-hero .accordion-content')?.offsetHeight ?? 0
  );
  expect(openHeight).toBeGreaterThan(10);
  expect(errors.filter(e => !e.message?.includes('favicon'))).toHaveLength(0);
});
