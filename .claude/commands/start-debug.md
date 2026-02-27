Read CLAUDE.md. Do not touch any files.

Paste the error or unexpected behaviour below. Diagnose the most likely root cause given this codebase's stack (vanilla JS, GSAP, Barba, Lenis, Webflow embeds). Propose a single, minimal fix and explain why it addresses the root cause.

Wait for my explicit approval before changing anything.

Once the fix is applied and the jsDelivr URL has been updated in Webflow:
- If the fix touches any module, Barba transition, scroll behaviour, or DOM structure — run `npm run test:smoke` in `projects/ready-hit-play-prod/` and confirm all smoke tests pass before marking the issue closed.
- If the fix touches copy, headings, ARIA attributes, or any new section — also run `npm run test:a11y`.
- If tests are red, do not mark the item done. Diagnose, fix, re-run.

Do not run tests while iterating locally or before the jsDelivr hash is updated — the suite runs against the live staging URL.
