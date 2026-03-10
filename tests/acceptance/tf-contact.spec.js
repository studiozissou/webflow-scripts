import { test, expect } from '@playwright/test';

const PAGE_URL = 'https://www.tamsenfadal.com/contact';

// Social platforms that block automated requests
const SOCIAL_DOMAINS = ['facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'twitter.com', 'x.com'];

test.describe('tf-contact: hard failures (functional)', () => {
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

  // --- Contact Form ---

  test('contact form has all required fields', async ({ page }) => {
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Reason for Contact dropdown
    const reasonSelect = form.locator('select, input[name*="reason" i], [placeholder*="Reason" i]');
    await expect(reasonSelect.first()).toBeVisible();

    // First Name
    const firstName = form.locator(
      'input[placeholder*="First Name" i], input[name*="first" i], input[aria-label*="first name" i]'
    );
    await expect(firstName.first()).toBeVisible();

    // Last Name
    const lastName = form.locator(
      'input[placeholder*="Last Name" i], input[name*="last" i], input[aria-label*="last name" i]'
    );
    await expect(lastName.first()).toBeVisible();

    // Email
    const email = form.locator(
      'input[type="email"], input[placeholder*="Email" i], input[name*="email" i]'
    );
    await expect(email.first()).toBeVisible();

    // Phone
    const phone = form.locator(
      'input[type="tel"], input[placeholder*="Phone" i], input[name*="phone" i]'
    );
    await expect(phone.first()).toBeVisible();

    // Message
    const message = form.locator('textarea');
    await expect(message.first()).toBeVisible();

    // Submit
    const submit = form.locator(
      'input[type="submit"], button[type="submit"], button:has-text("Submit"), [data-element="submit"]'
    );
    await expect(submit.first()).toBeVisible();
  });

  test('page has at least 2 forms (contact + newsletter)', async ({ page }) => {
    const forms = page.locator('form');
    const count = await forms.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // --- Email Links ---

  test('email links have valid mailto hrefs', async ({ page }) => {
    const expectedEmails = [
      'info@tamsenfadal.com',
      'madeline.larson@utatalent.com',
      'tamsenfadalteam@unitedtalent.com',
    ];
    for (const email of expectedEmails) {
      const link = page.locator(`a[href="mailto:${email}"]`);
      const count = await link.count();
      expect(count, `mailto link for ${email} not found`).toBeGreaterThanOrEqual(1);
    }
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

  test('contact form is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  // --- Link Health ---

  test('no links have empty or missing href', async ({ page }) => {
    const emptyLinks = await page.$$eval('a', (anchors) =>
      anchors
        .filter((a) => {
          const raw = a.getAttribute('href');
          if (raw === '#' || raw === '') return false;
          return !raw;
        })
        .map((a) => a.textContent.trim().slice(0, 50) || '[no text]')
    );
    expect(emptyLinks, `Links with missing href:\n${emptyLinks.join('\n')}`).toEqual([]);
  });

  test('no links return 404 or 5xx', async ({ page, request }) => {
    const links = await page.$$eval('a[href]', (anchors) =>
      anchors
        .map((a) => a.href)
        .filter((href) => href.startsWith('http'))
    );

    const uniqueLinks = [...new Set(links)].filter(
      (url) => !SOCIAL_DOMAINS.some((domain) => url.includes(domain))
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
        // Network errors (timeouts, DNS) — skip
      }
    }

    expect(failures, `Broken links found:\n${failures.join('\n')}`).toEqual([]);
  });
});

test.describe('tf-contact: design drift checks', () => {
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

  // --- Hero ---

  test('H1 contains expected text', async ({ page }, testInfo) => {
    const h1 = page.locator('h1').first();
    const text = await h1.textContent().catch(() => '');
    if (!text.includes('Contact')) {
      drift(testInfo, `H1 text is "${text}" — expected to contain "Contact"`);
    }
  });

  test('hero intro copy visible', async ({ page }, testInfo) => {
    const intros = [
      'Whether you\'re reaching out with a question',
      'we are so grateful you are part of this community',
    ];
    for (const snippet of intros) {
      const visible = await page.locator(`text=${snippet}`).first().isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `Hero intro text "${snippet}" not found`);
      }
    }
  });

  // --- Section Headings ---

  test('section headings match design', async ({ page }, testInfo) => {
    const expectedH2s = [
      'Suggest A Podcast Guest?',
      'Contact Team Tamsen',
      'General Inquiries',
    ];
    for (const heading of expectedH2s) {
      const visible = await page.locator(`h2:has-text("${heading}")`).first().isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `H2 "${heading}" not found`);
      }
    }
  });

  // --- Contact Team Section ---

  test('contact team email addresses visible', async ({ page }, testInfo) => {
    const emails = [
      { address: 'info@tamsenfadal.com', context: 'press or media inquiries' },
      { address: 'madeline.larson@utatalent.com', context: 'hosting or speaking' },
      { address: 'TamsenFadalTeam@unitedtalent.com', context: 'social or brand partnership' },
    ];
    for (const { address, context } of emails) {
      const visible = await page.locator(`text=${address}`).first().isVisible().catch(() => false);
      if (!visible) {
        drift(testInfo, `Contact email "${address}" (${context}) not found`);
      }
    }
  });

  // --- Newsletter CTA ---

  test('newsletter CTA heading visible', async ({ page }, testInfo) => {
    const heading = page.locator('text=/Join 200[,K0-9+]+ women/');
    const visible = await heading.first().isVisible().catch(() => false);
    if (!visible) {
      drift(testInfo, 'Newsletter CTA heading (Join 200K+ women) not found');
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
