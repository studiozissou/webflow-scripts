# Playwright timing reference for Webflow projects

These are typical wait times needed when testing Webflow staging sites.
Staging sites are slower than production due to Webflow's preview overhead.

| What you're waiting for | waitForTimeout value |
|---|---|
| Page load (networkidle) | Built into goto, no extra wait needed |
| Custom JS initialisation | 1500-2000ms |
| GSAP animation to complete | 1000-2000ms (depends on duration) |
| ScrollTrigger to fire after scroll | 500-1000ms |
| Finsweet CMS Filter to process | 800-1200ms |
| Finsweet CMS Load to render | 1000-1500ms |
| Barba page transition | 1500-2500ms |
| Lenis smooth scroll to settle | 500-1000ms |
| Webflow interactions (IX2) | 500-1500ms |

When a test fails on timing:
1. First try increasing the wait by 50%
2. If still failing, use page.waitForSelector or page.waitForFunction
   instead of a fixed timeout — these are more reliable
3. Example: await page.waitForFunction(() =>
     document.querySelector('.hero-title').style.opacity === '1',
     { timeout: 5000 }
   );
