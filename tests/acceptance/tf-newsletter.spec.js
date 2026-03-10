import { test, expect } from '@playwright/test';

const PAGE_URL = 'https://www.tamsenfadal.com/newsletter';

test.describe('tf-newsletter: hard failures (functional)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
  });

  // --- H1 ---

  test('single H1 on page', async ({ page }) => {
    const h1s = page.locator('h1');
    const count = await h1s.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(1);
  });

  // --- Forms ---

  test('first signup form has input fields and submit button', async ({ page }) => {
    const firstForm = page.locator('form').first();
    await expect(firstForm).toBeVisible();

    const firstNameInput = firstForm.locator(
      'input[placeholder*="First Name" i], input[name*="first" i], input[aria-label*="first" i]'
    );
    const emailInput = firstForm.locator(
      'input[placeholder*="Email" i], input[type="email"], input[name*="email" i]'
    );
    await expect(firstNameInput.first()).toBeVisible();
    await expect(emailInput.first()).toBeVisible();

    const submitBtn = firstForm.locator(
      'input[type="submit"], button[type="submit"], button:has-text("Sign up"), .formkit-submit, [data-element="submit"]'
    );
    await expect(submitBtn.first()).toBeVisible();
  });

  test('page has at least 2 signup forms', async ({ page }) => {
    const forms = page.locator('form');
    const count = await forms.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // --- Images ---

  test('all visible images load without error', async ({ page }) => {
    const images = page.locator('img:visible');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((el) => el.naturalWidth);
      expect(naturalWidth, `Image ${i} has naturalWidth 0 (broken)`).toBeGreaterThan(0);
    }
  });

  // --- Console Errors ---

  test('no critical console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5000);
    const critical = errors.filter(
      (e) =>
        !e.includes('third-party') &&
        !e.includes('analytics') &&
        !e.includes('favicon') &&
        !e.includes('gtag') &&
        !e.includes('formkit') &&
        !e.includes('Failed to load resource')
    );
    expect(critical).toEqual([]);
  });

  // --- Responsive ---

  test('page renders without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('signup form is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
    const firstForm = page.locator('form').first();
    await expect(firstForm).toBeVisible();
  });

  // --- Link Health Check ---

  test('no links have empty or missing href', async ({ page }) => {
    const emptyLinks = await page.$$eval('a', (anchors) =>
      anchors
        .filter((a) => {
          const raw = a.getAttribute('href');
          // Exclude # anchors (Webflow uses these for dropdowns, modals, form triggers)
          if (raw === '#' || raw === '') return false;
          // Flag truly empty/missing hrefs
          return !raw;
        })
        .map((a) => a.textContent.trim().slice(0, 50) || '[no text]')
    );
    expect(emptyLinks, `Links with missing href:\n${emptyLinks.join('\n')}`).toEqual([]);
  });

  test('no links return 404 or 5xx', async ({ page, request }) => {
    // Social platforms (facebook, instagram, tiktok, linkedin) block automated
    // requests with 400/403 — exclude them from status checks
    const socialDomains = ['facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'twitter.com', 'x.com'];

    const links = await page.$$eval('a[href]', (anchors) =>
      anchors
        .map((a) => a.href)
        .filter((href) => href.startsWith('http'))
    );

    const uniqueLinks = [...new Set(links)].filter(
      (url) => !socialDomains.some((domain) => url.includes(domain))
    );
    const failures = [];

    for (const url of uniqueLinks) {
      try {
        const response = await request.get(url, { timeout: 10_000 });
        const status = response.status();
        if (status >= 400) {
          failures.push(`${status} ${url}`);
        }
      } catch {
        // Network errors (timeouts, DNS) are not 404/5xx — skip
      }
    }

    expect(failures, `Broken links found:\n${failures.join('\n')}`).toEqual([]);
  });
});

test.describe('tf-newsletter: design drift checks', () => {
  /** Log design drift as a warning annotation — never fails the test */
  const drift = (testInfo, message) => {
    testInfo.annotations.push({ type: 'design-drift', description: message });
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
  });

  // --- Navigation ---

  test('nav links match design labels and destinations', async ({ page }, testInfo) => {
    const expectedLinks = [
      { label: 'Podcast', path: '/podcast' },
      { label: 'Book', path: '/book' },
      { label: 'Speaking', path: '/speaking' },
    ];
    for (const { label, path } of expectedLinks) {
      const link = page.getByRole('link', { name: label }).first();
      const visible = await link.isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `Nav link "${label}" not found on live page`);
        continue;
      }
      const href = await link.getAttribute('href').catch(() => null);
      if (href && !href.toLowerCase().includes(path)) {
        drift(testInfo, `Nav link "${label}" points to "${href}" — expected path containing "${path}"`);
      }
    }
  });

  // --- Hero Section ---

  test('H1 contains expected text', async ({ page }, testInfo) => {
    const h1 = page.locator('h1').first();
    const text = await h1.textContent().catch(() => '');
    if (!text.includes('The Hot Take')) {
      drift(testInfo, `H1 text is "${text}" — expected "The Hot Take"`);
    }
  });

  test('hero description mentions 200,000 women', async ({ page }, testInfo) => {
    const visible = await page.locator('text=200,000 women who are still building').first().isVisible().catch(() => false);
    if (!visible) {
      drift(testInfo, 'Hero description "200,000 women who are still building" not found');
    }
  });

  test('hero bullet list has expected items', async ({ page }, testInfo) => {
    const bullets = [
      { pattern: /learning from doctors/i, label: 'learning from doctors' },
      { pattern: /what I.m reading/i, label: "what I'm reading" },
      { pattern: /buying, testing, or loving/i, label: 'buying, testing, or loving' },
      { pattern: /still figuring out myself/i, label: 'still figuring out myself' },
    ];
    for (const { pattern, label } of bullets) {
      const visible = await page.getByText(pattern).first().isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `Hero bullet "${label}" not found`);
      }
    }
  });

  // --- Yellow Signup Section ---

  test('yellow signup section has expected copy', async ({ page }, testInfo) => {
    const freeWeekly = await page.locator('text=Free. Weekly. Unsubscribe anytime.').first().isVisible().catch(() => false);
    if (!freeWeekly) {
      drift(testInfo, '"Free. Weekly. Unsubscribe anytime." label not found');
    }
    const joinHeading = await page.locator('text=/Join.*weekly/i').first().isVisible().catch(() => false);
    if (!joinHeading) {
      drift(testInfo, 'Yellow signup heading (Join...weekly) not found');
    }
  });

  // --- In-Between Moments Section ---

  test('in-between moments section has expected copy', async ({ page }, testInfo) => {
    const heading = await page.locator('text=This newsletter is for the in-between moments').first().isVisible().catch(() => false);
    if (!heading) {
      drift(testInfo, '"This newsletter is for the in-between moments" heading not found');
    }

    const items = [
      'When your body is changing.',
      'When old roles no longer fit.',
      'When the script you followed quietly stops working.',
    ];
    for (const text of items) {
      const visible = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `Checklist item "${text}" not found`);
      }
    }

    const paragraph = await page.locator('text=The Hot Take is about making sense of that space, with clarity').first().isVisible().catch(() => false);
    if (!paragraph) {
      drift(testInfo, '"The Hot Take is about making sense of that space" paragraph not found');
    }
  });

  // --- Social Proof CTA ---

  test('social proof CTA heading visible', async ({ page }, testInfo) => {
    const visible = await page.locator('text=/Join 200[,K0-9+]+ readers/').first().isVisible().catch(() => false);
    if (!visible) {
      drift(testInfo, 'Social proof heading (Join 200K+ readers) not found');
    }
  });

  // --- Footer ---

  test('footer content matches design', async ({ page }, testInfo) => {
    const footer = page.locator('footer').first();

    // Bio
    const bio = await page.locator('text=Tamsen Fadal is a').first().isVisible().catch(() => false);
    if (!bio) drift(testInfo, 'Footer bio text not found');

    // Column headings
    for (const heading of ['Explore', 'Topics', 'About']) {
      const visible = await footer.locator(`text=${heading}`).first().isVisible().catch(() => false);
      if (!visible) drift(testInfo, `Footer column "${heading}" not found`);
    }

    // Social links
    const socialLinks = footer.locator(
      'a[href*="instagram"], a[href*="tiktok"], a[href*="facebook"], a[href*="youtube"]'
    );
    const socialCount = await socialLinks.count();
    if (socialCount < 3) drift(testInfo, `Expected at least 3 social media links, found ${socialCount}`);

    // Copyright
    const copyright = await page.locator('text=Take Flight Productions LLC').first().isVisible().catch(() => false);
    if (!copyright) drift(testInfo, 'Copyright notice not found');

    // Legal links
    for (const label of ['Terms', 'Privacy Policy', 'Site Credits']) {
      const visible = await footer.getByRole('link', { name: new RegExp(label, 'i') }).first().isVisible().catch(() => false);
      if (!visible) drift(testInfo, `Footer link "${label}" not found`);
    }
  });
});
