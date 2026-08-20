/**
 * TEMPORARY DIAGNOSTIC — not part of the suite. Delete once the question is settled.
 *
 * Question: is the "first click after load is swallowed" flake a component defect that
 * real users hit, or a test-side budget problem that only appears under a 5s poll?
 *
 * Method: load the page N times. Each run, click a pill after a varying delay past
 * readyState=complete, then wait up to 20s — far longer than the suite's 5s — for the
 * question to advance. Record whether it advanced at all, and how long it took.
 *
 * The discriminator:
 *   - advanced=false even at 20s  -> the click was genuinely lost. A real defect.
 *   - advanced=true but >5000ms   -> the click landed; the suite's 5s budget is too tight
 *                                    on this page. A test problem, not user-facing.
 *
 * Deliberately does NOT use the shared helpers: they encode the very waits under
 * suspicion. Everything here is explicit.
 */
import { test, expect } from '@playwright/test';

const STAGING = process.env.STAGING_URL || 'https://nem-life-1.webflow.io';
const PAGE = '/zelftesten/waarom-reageer-ik-zo';

/* Delays past readyState=complete, in ms. 0 is the aggressive case the suite hits. */
const DELAYS = [0, 0, 0, 150, 150, 400, 400, 1000, 1000, 2500];

const QUIZ_ROOT_FN = `(
  () => {
    for (const host of document.querySelectorAll('code-island')) {
      const root = host.shadowRoot;
      if (root && root.querySelector('.nem-answers')) return root;
    }
    return null;
  }
)`;

const results = [];

test.describe('PROBE — first click after load', () => {
  for (const [i, delay] of DELAYS.entries()) {
    test(`run ${i + 1}: click ${delay}ms after load`, async ({ page }) => {
      test.setTimeout(90_000);

      const t0 = Date.now();
      await page.goto(`${STAGING}${PAGE}`);
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30_000 });
      const loadMs = Date.now() - t0;

      /* The heading is the component's own readiness signal — same as the suite uses. */
      await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 20_000 });
      const headingMs = Date.now() - t0;

      if (delay) await page.waitForTimeout(delay);

      const outcome = await page.evaluate(
        async ([rootSrc, budget]) => {
          const root = new Function('return ' + rootSrc)()();
          if (!root) return { error: 'no shadow root' };

          const counter = () =>
            (root.querySelector('[aria-live="polite"]')?.textContent || '').trim();
          const pills = () => Array.from(root.querySelectorAll('.nem-answers button'));

          const before = counter();
          const pill = pills()[2];
          const reactKey = Object.keys(pill).find(
            (k) => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'),
          );
          const start = performance.now();
          pill.click();

          let selectedAt = null;
          let advancedAt = null;
          while (performance.now() - start < budget) {
            await new Promise((r) => setTimeout(r, 25));
            if (selectedAt === null && pills().some((b) => b.getAttribute('aria-selected') === 'true')) {
              selectedAt = Math.round(performance.now() - start);
            }
            if (counter() !== before) {
              advancedAt = Math.round(performance.now() - start);
              break;
            }
          }
          return {
            before,
            after: counter(),
            reactAttachedAtClick: !!reactKey,
            pillDisabledAtClick: pill.disabled,
            selectedAt,
            advancedAt,
          };
        },
        [QUIZ_ROOT_FN, 20_000],
      );

      results.push({ run: i + 1, delay, loadMs, headingMs, ...outcome });

      /* Deliberately not asserting — this run is for data, not pass/fail. */
      console.log('PROBE ' + JSON.stringify(results[results.length - 1]));
    });
  }

  test.afterAll(() => {
    const lost = results.filter((r) => r.advancedAt === null);
    const slow = results.filter((r) => r.advancedAt !== null && r.advancedAt > 5000);
    console.log(
      '\nPROBE SUMMARY ' +
        JSON.stringify(
          {
            runs: results.length,
            clicksLostEntirely: lost.length,
            landedButOver5s: slow.length,
            advanceMs: results.map((r) => r.advancedAt),
            loadMs: results.map((r) => r.loadMs),
            verdict:
              lost.length > 0
                ? 'REAL DEFECT — clicks lost even with a 20s budget'
                : slow.length > 0
                  ? 'TEST BUDGET — every click landed, some beyond the suite 5s poll'
                  : 'NOT REPRODUCED — every click landed well within 5s',
          },
          null,
          2,
        ),
    );
  });
});
