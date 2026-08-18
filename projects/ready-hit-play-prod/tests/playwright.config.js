const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

module.exports = defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // `fullyParallel: false` only serialises tests WITHIN a file — Playwright still
  // runs separate files concurrently, defaulting to ~half the CPU cores. On a full
  // registry run that put ~13 workers against one Webflow staging site and produced
  // mass 30s timeouts (2026-08-18: 113 of 115 distinct failures were timeouts, not
  // assertion failures). Cap the workers so the stated intent actually holds.
  // Override for a one-off: PW_WORKERS=4 npm run test:registry
  fullyParallel: false, // avoid hammering Webflow staging
  workers: Number(process.env.PW_WORKERS) || 2,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.STAGING_URL || 'https://rhpcircle.webflow.io',
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
