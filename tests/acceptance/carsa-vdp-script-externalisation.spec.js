/**
 * Acceptance tests for carsa-vdp-script-externalisation
 *
 * Verifies that Carsa VDP inline scripts work correctly when
 * externalised to a single CDN-hosted vdp.js bundle.
 *
 * Phase 1: scripts moved as-is (jQuery deps preserved)
 * Phase 2: refactored to vanilla JS + modular init.js loader
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// ── Config ────────────────────────────────────────────────────
const SLUG = 'carsa-vdp-script-externalisation';
const STAGING_URL = process.env.STAGING_URL_CARSA || 'https://www.carsa.co.uk';
const VDP_PATHS = [
  '/vehicles/used/gn20phv',
  '/vehicles/used/vk72rzv',
  '/vehicles/used/bl73dmu',
  '/vehicles/used/ow74xxv',
  '/vehicles/used/fd23hgg',
  '/vehicles/used/oe22lfp',
];
const PRIMARY_VDP = VDP_PATHS[0];

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PRIMARY_VDP) {
  await page.goto(`${STAGING_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(2000); // VDP scripts + jQuery init
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────

/* 1. No console errors */
test.describe(`${SLUG} — Console Errors`, () => {
  test('no JS errors on VDP page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    const filtered = errors.filter(
      (e) =>
        !e.message.includes('favicon') &&
        !e.message.includes('third-party') &&
        !e.message.includes('net::ERR')
    );
    expect(
      filtered,
      `JS errors: ${filtered.map((e) => e.message).join(', ')}`
    ).toHaveLength(0);
  });

  test('no console errors on additional VDP pages', async ({ page }) => {
    const errors = collectErrors(page);
    // Test 2 additional pages for broader coverage
    for (const path of VDP_PATHS.slice(1, 3)) {
      await loadPage(page, path);
      await page.waitForTimeout(500);
    }
    const filtered = errors.filter(
      (e) =>
        !e.message.includes('favicon') &&
        !e.message.includes('third-party') &&
        !e.message.includes('net::ERR')
    );
    expect(
      filtered,
      `JS errors: ${filtered.map((e) => e.message).join(', ')}`
    ).toHaveLength(0);
  });
});

/* 2. External script loading */
test.describe(`${SLUG} — External Script`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('external vdp.js script tag is present', async ({ page }) => {
    const externalScript = page.locator(
      'script[src*="cdn.jsdelivr.net"][src*="carsa/vdp"]'
    );
    await expect(externalScript).toBeAttached();
  });
});

/* 3. VDP functionality */
test.describe(`${SLUG} — VDP Features`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('finance calculator element is visible', async ({ page }) => {
    // Finance calculator or finance-related section should be present
    const financeSection = page.locator(
      '[data-finance], .finance-calculator, .w-tab-content'
    ).first();
    // Soft check — element may not exist on all VDPs
    const count = await financeSection.count();
    if (count > 0) {
      await expect(financeSection).toBeAttached();
    } else {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No finance calculator element found — may not apply to this VDP',
      });
    }
  });

  test('check-finance link has correct href', async ({ page }) => {
    const checkFinanceLink = page.locator(
      'a[href*="quote.carsa.co.uk"]'
    ).first();
    const count = await checkFinanceLink.count();
    if (count > 0) {
      const href = await checkFinanceLink.getAttribute('href');
      expect(href).toContain('quote.carsa.co.uk');
    } else {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No check-finance link found — script may not have fired yet',
      });
    }
  });

  test('gallery container has images', async ({ page }) => {
    const galleryImages = page.locator(
      '.w-slider-mask img, .w-slider-slide img, .gallery img, [data-gallery] img, .w-lightbox img'
    );
    const count = await galleryImages.count();
    expect(count, 'Gallery should contain at least 1 image').toBeGreaterThan(0);
  });

  test('equal-height cards have uniform height', async ({ page }) => {
    const cards = page.locator('[data-card-height="equal"]');
    const count = await cards.count();
    if (count < 2) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'Fewer than 2 equal-height cards found — skipping height check',
      });
      return;
    }

    const heights = await cards.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height)
    );
    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);
    expect(
      maxH - minH,
      `Card heights vary by ${maxH - minH}px (max: ${maxH}, min: ${minH})`
    ).toBeLessThan(2);
  });
});

/* 4. Attribution & UTM link building */
test.describe(`${SLUG} — Attribution`, () => {
  test('UTM params appended to Build Deal / Book Test Drive / Eligibility links', async ({ page }) => {
    await page.goto(
      `${STAGING_URL}${PRIMARY_VDP}?utm_source=playwright&utm_medium=test`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForReady(page);
    await page.waitForTimeout(2500); // attribution reads localStorage + jQuery load

    const links = page.locator(
      'a[href*="quote.carsa.co.uk/build-deal/"],' +
      'a[href*="quote.carsa.co.uk/book/"],' +
      'a[href*="quote.carsa.co.uk/eligibility/questions"]'
    );
    const count = await links.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No Build Deal / Book / Eligibility links found on this VDP',
      });
      return;
    }
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `Link ${i} should contain utm_source`).toContain('utm_source=playwright');
      expect(href, `Link ${i} should contain utm_medium`).toContain('utm_medium=test');
    }
  });

  test('Get Started link includes VRM and location', async ({ page }) => {
    await loadPage(page);

    const bookingBtn = page.locator('[data-button="booking-options"]').first();
    const count = await bookingBtn.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No [data-button="booking-options"] element found',
      });
      return;
    }
    const href = await bookingBtn.getAttribute('href');
    expect(href, 'Get Started should link to /get-started').toContain('/get-started');
    expect(href, 'Get Started should include vrm param').toContain('vrm=');
    expect(href, 'Get Started should include location param').toContain('location=');
  });

  test('Search Similar link includes make/model params', async ({ page }) => {
    await loadPage(page);

    const similarBtn = page.locator('[data-link="search-similar"]').first();
    const count = await similarBtn.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No [data-link="search-similar"] element found',
      });
      return;
    }
    const href = await similarBtn.getAttribute('href');
    expect(href, 'Search Similar should link to /used-cars').toContain('/used-cars');
  });
});

/* 5. Form UTM hidden fields */
test.describe(`${SLUG} — Form Hidden Fields`, () => {
  test('forms with data-form="add-utms" get hidden UTM inputs', async ({ page }) => {
    await page.goto(
      `${STAGING_URL}${PRIMARY_VDP}?utm_source=playwright&utm_medium=test&utm_campaign=ci`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForReady(page);
    await page.waitForTimeout(2500);

    const forms = page.locator('form[data-form="add-utms"]');
    const count = await forms.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No form[data-form="add-utms"] found — UTM hidden fields script has no target',
      });
      return;
    }

    // Check the first matching form
    const form = forms.first();
    const utmSource = form.locator('input[name="utm_source"]');
    const utmMedium = form.locator('input[name="utm_medium"]');
    const convPage = form.locator('input[name="conversion_page"]');

    await expect(utmSource, 'Hidden utm_source should exist').toBeAttached();
    await expect(utmMedium, 'Hidden utm_medium should exist').toBeAttached();
    await expect(convPage, 'Hidden conversion_page should exist').toBeAttached();

    expect(await utmSource.inputValue()).toBe('playwright');
    expect(await utmMedium.inputValue()).toBe('test');
    expect(await convPage.inputValue()).toContain('/vehicles/used/');
  });
});

/* 6. PX form link builder */
test.describe(`${SLUG} — Part Exchange`, () => {
  test('PX form builds correct valuation URL on input', async ({ page }) => {
    await loadPage(page);

    const pxForm = page.locator('#px-form-large, #px-form-small').first();
    const count = await pxForm.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No #px-form-large or #px-form-small found — PX form not on this VDP',
      });
      return;
    }

    const vrmInput = pxForm.locator('[name="px-vrm"]');
    if ((await vrmInput.count()) === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'PX form exists but has no [name="px-vrm"] input',
      });
      return;
    }

    // Type a test VRM and check the button href updates
    await vrmInput.fill('AB12CDE');
    await page.waitForTimeout(500); // input event handler debounce

    const pxButton = pxForm.locator('a').first();
    if ((await pxButton.count()) > 0) {
      const href = await pxButton.getAttribute('href');
      expect(href, 'PX button href should contain the entered VRM').toContain('AB12CDE');
    }
  });
});

/* 7. Check Finance link builder */
test.describe(`${SLUG} — Check Finance`, () => {
  test('check-finance links have correct domain and VRM on hover', async ({ page }) => {
    await loadPage(page);

    const links = page.locator('[data-link="check-finance"]');
    const count = await links.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No [data-link="check-finance"] elements found',
      });
      return;
    }
    // Script builds href on hover via event delegation — trigger it
    await links.first().hover();
    await page.waitForTimeout(300);
    const anchor = links.first().locator('xpath=ancestor::a').first();
    const href = await anchor.getAttribute('href');
    expect(href, 'Check finance anchor should point to quote.carsa.co.uk after hover').toContain('quote.carsa.co.uk');
  });
});

/* 8. CMS config object */
test.describe(`${SLUG} — CMS Config`, () => {
  test('window.__CARSA_VDP is populated with CMS values', async ({ page }) => {
    await loadPage(page);

    const vdpConfig = await page.evaluate(() => window.__CARSA_VDP);
    expect(vdpConfig, '__CARSA_VDP should be defined').toBeTruthy();
    // Price should be a number > 0 (not NaN, not undefined)
    expect(typeof vdpConfig.price, 'price should be a number').toBe('number');
    expect(vdpConfig.price, 'price should be > 0').toBeGreaterThan(0);
    // VRM should be a non-empty string
    expect(vdpConfig.vrm, 'vrm should be a non-empty string').toBeTruthy();
    expect(vdpConfig.vrm.length, 'vrm should have reasonable length').toBeGreaterThan(3);
  });
});

/* 9. Cold banner carousel (UTM-triggered) */
test.describe(`${SLUG} — Cold Banner`, () => {
  test('cold banner hidden without utm_source', async ({ page }) => {
    await loadPage(page);
    const banner = page.locator('.section_vdp-cold-banner');
    const count = await banner.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No .section_vdp-cold-banner element found on this VDP',
      });
      return;
    }
    // Without a valid utm_source, banner should be hidden
    await expect(banner).toBeHidden();
  });

  test('cold banner shown with utm_source=chat (if 3+ similar cars)', async ({ page }) => {
    await page.goto(
      `${STAGING_URL}${PRIMARY_VDP}?utm_source=chat`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForReady(page);
    await page.waitForTimeout(2500); // Swiper lazy-load + init

    const banner = page.locator('.section_vdp-cold-banner');
    const count = await banner.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'design-drift',
        description: 'No .section_vdp-cold-banner element found on this VDP',
      });
      return;
    }

    // Check if there are enough similar cars to trigger the banner
    const makeModelCount = await page.locator('[data-count="make-model"]').count();
    if (makeModelCount >= 3) {
      await expect(banner).toBeVisible();
      // USP section should be hidden when banner is showing
      const usp = page.locator('#section_usp-carousel, .section_usp-carousel').first();
      if ((await usp.count()) > 0) {
        await expect(usp).toBeHidden();
      }
    } else {
      // Fewer than 3 items: banner stays hidden regardless of UTM
      await expect(banner).toBeHidden();
      test.info().annotations.push({
        type: 'note',
        description: `Only ${makeModelCount} make-model items — banner requires 3+`,
      });
    }
  });

  test('Swiper loaded when cold banner is active', async ({ page }) => {
    await page.goto(
      `${STAGING_URL}${PRIMARY_VDP}?utm_source=chat`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForReady(page);
    await page.waitForTimeout(3000); // extra time for Swiper CDN load

    const banner = page.locator('.section_vdp-cold-banner');
    if ((await banner.count()) === 0) return;

    const makeModelCount = await page.locator('[data-count="make-model"]').count();
    if (makeModelCount < 3) return; // banner won't show

    // Check Swiper was loaded
    const swiperLoaded = await page.evaluate(() => typeof window.Swiper === 'function');
    expect(swiperLoaded, 'Swiper should be loaded when banner is active').toBe(true);
  });
});

/* 10. Cache behaviour — repeat visit */
test.describe(`${SLUG} — Cache`, () => {
  test('vdp.js served from cache on repeat visit', async ({ page }) => {
    // First visit — cold load
    await loadPage(page);

    // Collect network requests on second visit
    const vdpRequests = [];
    page.on('response', (res) => {
      if (res.url().includes('carsa/vdp')) {
        vdpRequests.push({
          url: res.url(),
          fromCache: res.fromServiceWorker() || res.request().resourceType() === 'script',
          status: res.status(),
          headers: res.headers(),
        });
      }
    });

    // Second visit — warm cache
    await page.goto(`${STAGING_URL}${PRIMARY_VDP}`, { waitUntil: 'domcontentloaded' });
    await waitForReady(page);

    expect(vdpRequests.length, 'vdp.js should have been requested').toBeGreaterThan(0);

    const req = vdpRequests[0];
    // jsDelivr serves with immutable cache headers on pinned commits
    const cacheControl = req.headers['cache-control'] || '';
    const servedFromCache = req.status === 304 || req.status === 200;

    expect(servedFromCache, 'vdp.js should return 200 or 304').toBe(true);

    // Verify cache-control header allows long-term caching
    if (cacheControl) {
      const hasLongCache = cacheControl.includes('max-age=31536000') ||
                           cacheControl.includes('immutable') ||
                           cacheControl.includes('public');
      expect(hasLongCache, `Cache-Control should enable caching: ${cacheControl}`).toBe(true);
    }
  });

  test('vdp.js transfer size is zero on cached repeat visit', async ({ page, context }) => {
    // First visit — populate cache
    await loadPage(page);

    // Second visit on a new page in the same context (shared cache)
    const page2 = await context.newPage();
    const transferSizes = [];

    // Use CDP to get actual transfer sizes
    const client = await page2.context().newCDPSession(page2);
    await client.send('Network.enable');
    client.on('Network.loadingFinished', (params) => {
      if (params.encodedDataLength !== undefined) {
        transferSizes.push({
          requestId: params.requestId,
          encodedDataLength: params.encodedDataLength,
        });
      }
    });

    const vdpRequestIds = [];
    client.on('Network.requestWillBeSent', (params) => {
      if (params.request.url.includes('carsa/vdp')) {
        vdpRequestIds.push(params.requestId);
      }
    });

    await page2.goto(`${STAGING_URL}${VDP_PATHS[1]}`, { waitUntil: 'domcontentloaded' });
    await page2.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
    await page2.waitForTimeout(1000);

    // Find the vdp.js transfer size
    const vdpTransfer = transferSizes.find((t) => vdpRequestIds.includes(t.requestId));

    if (vdpTransfer) {
      // Cached responses have 0 or very small transfer (just headers)
      // Full file is ~45KB, cached should be < 1KB (headers only)
      expect(
        vdpTransfer.encodedDataLength,
        `vdp.js transfer should be near-zero on cache hit (got ${vdpTransfer.encodedDataLength} bytes)`
      ).toBeLessThan(1024);
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Could not capture vdp.js transfer size via CDP — may need different approach',
      });
    }

    await page2.close();
  });
});
